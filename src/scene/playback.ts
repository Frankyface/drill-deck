// Playback math for v4 scenes — pure functions, worklet-safe.
//
// Model (per the Real Rugby study, professionalized):
// - every run traverses its polyline with a SMOOTHSTEP speed profile (velocity
//   0 at both ends, ~1.5x cruise mid-run); total duration is unchanged
// - each run sets off on its trigger (whistle / delay / on-catch / after-pass /
//   with a teammate); start times resolve by bounded fixed-point iteration
// - balls are explicit: a ground ball is scooped up when a runner's line
//   crosses within PICKUP_RADIUS_M of it; passes belong to a specific ball
// - each pass releases at `releaseFrac` of the passer's run and is thrown to
//   WHERE THE RECEIVER WILL BE when it arrives (interception solver)
// - lofted passes get a rendered arc; catches ease in over the final stretch
import {
  PASS_SPEEDS,
  RUN_SPEEDS,
  type Pass,
  type Run,
  type SceneV4,
  type Trigger,
  type Vec2,
} from './schema';

export const STATIC_RELEASE_DELAY_MS = 450; // hold time before a standing pass
export const MIN_CARRY_MS = 200; // can't release before you've gathered it
export const TAIL_MS = 600; // playback breathing room after the last event
export const CATCH_EASE_FRAC = 0.18; // final stretch of flight eases in
export const PICKUP_RADIUS_M = 2.0; // a run line this close scoops a ground ball
export const MAX_RESOLVE_ROUNDS = 8; // fixed-point iterations before giving up
export const RUN_SAMPLE_COUNT = 24; // eased-run samples per render timeline

export function pathLength(points: Vec2[]): number {
  'worklet';
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return length;
}

export function runDurationMs(run: Run): number {
  'worklet';
  return (pathLength(run.points) / RUN_SPEEDS[run.speed]) * 1000;
}

/**
 * Position along a run at absolute time `tMs`, given the run set off at
 * `startMs`. Distance follows a smoothstep profile so the runner accelerates
 * from and decelerates to a stop. Clamps to the endpoints outside the window.
 */
export function positionOnRun(run: Run, tMs: number, startMs: number = 0): Vec2 {
  'worklet';
  const points = run.points;
  if (tMs <= startMs) return points[0];
  const duration = runDurationMs(run);
  const last = points[points.length - 1];
  if (duration <= 0) return last;
  const u = Math.min(1, Math.max(0, (tMs - startMs) / duration));
  if (u >= 1) return last;
  const total = pathLength(points);
  let remaining = total * (u * u * (3 - 2 * u)); // smoothstep distance
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= seg) {
      const f = seg === 0 ? 0 : remaining / seg;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    remaining -= seg;
  }
  return last;
}

/**
 * Invert the smoothstep: the run-relative time (ms) at which `distanceM` along
 * the path has been covered. Bisection, monotonic — JS-only (used to time
 * pickups and releases). ≤40 iters, stops once the bracket is under ε=1ms.
 */
export function timeToReachDistance(run: Run, distanceM: number): number {
  const total = pathLength(run.points);
  const duration = runDurationMs(run);
  if (total <= 0 || duration <= 0 || distanceM <= 0) return 0;
  if (distanceM >= total) return duration;
  const targetFrac = distanceM / total; // == 3u^2 - 2u^3
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40 && (hi - lo) * duration > 1; i += 1) {
    const mid = (lo + hi) / 2;
    const frac = mid * mid * (3 - 2 * mid);
    if (frac < targetFrac) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * duration;
}

export type FlightSegment = {
  ballId: string;
  fromId: string;
  toId: string;
  releaseMs: number;
  arriveMs: number;
  releasePos: Vec2;
  arrivePos: Vec2;
  type: Pass['type'];
  /** Rendered arc height in meters (0 for flat passes). */
  arcHeightM: number;
};

export type Pickup = { ballId: string; playerId: string; tMs: number };

/** Everything needed to sample one ball independently over the drill. */
export type BallTimeline = {
  ballId: string;
  /** Holder at kickoff (`heldBy` from-start), or null if it starts on the ground. */
  initialHolder: string | null;
  /** Resolved ground pickup, if any. */
  pickup: Pickup | null;
  /** This ball's flights, in release order. */
  flights: FlightSegment[];
  /** Who carries the ball from each `fromMs` onward (pickups + catches). */
  carrierSequence: { fromMs: number; carrierId: string }[];
};

export type DrillTimeline = {
  totalMs: number;
  flights: FlightSegment[];
  pickups: Pickup[];
  /** Resolved departure time per run element (nulls fell back to 0). */
  runStartMs: Record<string, number>;
  ballTimelines: Record<string, BallTimeline>;
  /** Human-readable notes when a cue or pass chain could not resolve. */
  warnings: string[];
};

function findRun(scene: SceneV4, elementId: string): Run | undefined {
  return scene.runs.find((r) => r.elementId === elementId);
}

function labelFor(scene: SceneV4, id: string): string {
  const el = scene.elements.find((e) => e.id === id);
  if (el && el.type === 'player' && el.label) return `Player ${el.label}`;
  return id;
}

/** Position of an element at absolute `tMs`, honouring its resolved run start. */
function elementPositionAt(
  scene: SceneV4,
  elementId: string,
  tMs: number,
  startMs: Record<string, number | null>,
): Vec2 {
  const run = findRun(scene, elementId);
  if (run) {
    const s = startMs[elementId];
    // Unresolved receiver = static at the run's start point.
    if (s == null) return run.points[0];
    return positionOnRun(run, tMs, s);
  }
  const el = scene.elements.find((e) => e.id === elementId);
  return el ? el.position : { x: 0, y: 0 };
}

/**
 * Interception solver (ported from Real Rugby's calcPassGeometry): find arrival
 * time T where the flight distance covered equals the distance to the receiver
 * AT time T. Converges because pass speed exceeds every run speed.
 */
function solveArrival(
  scene: SceneV4,
  releasePos: Vec2,
  releaseMs: number,
  toId: string,
  passSpeed: number,
  startMs: Record<string, number | null>,
): { arriveMs: number; arrivePos: Vec2 } {
  let arriveMs = releaseMs;
  for (let i = 0; i < 20; i += 1) {
    const target = elementPositionAt(scene, toId, arriveMs, startMs);
    const dist = Math.hypot(target.x - releasePos.x, target.y - releasePos.y);
    const next = releaseMs + (dist / passSpeed) * 1000;
    if (Math.abs(next - arriveMs) < 1) {
      arriveMs = next;
      break;
    }
    arriveMs = next;
  }
  return { arriveMs, arrivePos: elementPositionAt(scene, toId, arriveMs, startMs) };
}

/**
 * Arc-length to the first point on a run's path within `radius` of `target`,
 * or null if the path never comes that close. Solves each segment against the
 * circle so a line that only grazes between vertices still counts.
 */
function distanceToFirstWithinRadius(run: Run, target: Vec2, radius: number): number | null {
  const points = run.points;
  let cumulative = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy);
    const fx = a.x - target.x;
    const fy = a.y - target.y;
    const A = dx * dx + dy * dy;
    const B = 2 * (fx * dx + fy * dy);
    const C = fx * fx + fy * fy - radius * radius;
    if (C <= 0) return cumulative; // segment starts already inside the circle
    if (A > 0) {
      const disc = B * B - 4 * A * C;
      if (disc >= 0) {
        const tEntry = (-B - Math.sqrt(disc)) / (2 * A); // earliest crossing
        if (tEntry >= 0 && tEntry <= 1) return cumulative + tEntry * segLen;
      }
    }
    cumulative += segLen;
  }
  return null;
}

/** Carrier of a ball at time `t` per its carrier sequence (ignores in-flight gaps). */
function carrierAt(bt: BallTimeline, t: number): string | null {
  let carrier: string | null = null;
  let from = Number.NEGATIVE_INFINITY;
  for (const entry of bt.carrierSequence) {
    if (t >= entry.fromMs && entry.fromMs >= from) {
      carrier = entry.carrierId;
      from = entry.fromMs;
    }
  }
  return carrier;
}

function isHoldingOtherBallAt(
  runner: string,
  t: number,
  excludeBallId: string,
  ballStates: Record<string, BallTimeline>,
): boolean {
  for (const ballId in ballStates) {
    if (ballId === excludeBallId) continue;
    if (carrierAt(ballStates[ballId], t) === runner) return true;
  }
  return false;
}

/**
 * Build each ball's flights + carrier sequence from the current start times and
 * resolved pickups. Pass warnings are only collected on the final pass (so the
 * fixed-point loop does not emit duplicates).
 */
function buildBallStates(
  scene: SceneV4,
  startMs: Record<string, number | null>,
  pickups: Record<string, Pickup>,
  warnings?: string[],
): Record<string, BallTimeline> {
  const result: Record<string, BallTimeline> = {};

  for (const el of scene.elements) {
    if (el.type !== 'ball') continue;
    const ballId = el.id;
    const heldFromStart = el.heldBy ?? null;
    const pickup = pickups[ballId] ?? null;

    let holder: string | null;
    let holderSince: number;
    if (heldFromStart != null) {
      holder = heldFromStart;
      holderSince = 0;
    } else if (pickup) {
      holder = pickup.playerId;
      holderSince = pickup.tMs;
    } else {
      holder = null;
      holderSince = 0;
    }

    const carrierSequence: { fromMs: number; carrierId: string }[] = [];
    const flights: FlightSegment[] = [];
    if (holder != null) carrierSequence.push({ fromMs: holderSince, carrierId: holder });

    const ballPasses = scene.passes.filter((p) => p.ballId === ballId);
    let lastEventMs = holderSince;

    if (holder == null && ballPasses.length > 0) {
      warnings?.push(
        `⚠ The ${labelFor(scene, ballId)} pass chain never gets the ball — nobody picks it up`,
      );
    } else {
      for (const pass of ballPasses) {
        if (holder == null) break;
        if (pass.fromId !== holder) {
          warnings?.push(
            `⚠ ${labelFor(scene, pass.fromId)} can't pass — they aren't holding that ball`,
          );
          continue;
        }
        const holderRun = findRun(scene, holder);
        const holderStart = startMs[holder];
        const holderTrigger: Trigger = holderRun?.trigger ?? { kind: 'start' };
        // An `afterPass` runner leaves BECAUSE of this pass, so its release is
        // gated by receiving the ball (static delay), never by a run it hasn't
        // set off — otherwise the cue would deadlock on itself. Every other run
        // whose cue is still unresolved defers to a later round.
        const afterPassHolder = holderRun != null && holderTrigger.kind === 'afterPass';
        if (holderRun && holderStart == null && !afterPassHolder) break;

        let naturalRelease: number;
        if (holderRun && holderStart != null && !afterPassHolder) {
          naturalRelease = holderStart + pass.releaseFrac * runDurationMs(holderRun);
        } else {
          naturalRelease = lastEventMs + STATIC_RELEASE_DELAY_MS;
        }
        const releaseMs = Math.max(naturalRelease, lastEventMs + MIN_CARRY_MS);
        const releasePos = elementPositionAt(scene, holder, releaseMs, startMs);
        const passSpeed = PASS_SPEEDS[pass.type];
        const { arriveMs, arrivePos } = solveArrival(
          scene,
          releasePos,
          releaseMs,
          pass.toId,
          passSpeed,
          startMs,
        );
        const flightDist = Math.hypot(arrivePos.x - releasePos.x, arrivePos.y - releasePos.y);
        flights.push({
          ballId,
          fromId: holder,
          toId: pass.toId,
          releaseMs,
          arriveMs,
          releasePos,
          arrivePos,
          type: pass.type,
          arcHeightM: pass.type === 'lofted' ? Math.min(flightDist / 4, 8) : 0,
        });
        holder = pass.toId;
        carrierSequence.push({ fromMs: arriveMs, carrierId: holder });
        lastEventMs = arriveMs;
      }
    }

    result[ballId] = {
      ballId,
      initialHolder: heldFromStart,
      pickup,
      flights,
      carrierSequence,
    };
  }

  return result;
}

function resolveTrigger(
  trigger: Trigger,
  playerId: string,
  ballStates: Record<string, BallTimeline>,
  startMs: Record<string, number | null>,
): number | null {
  switch (trigger.kind) {
    case 'onCatch': {
      let earliest: number | null = null;
      for (const ballId in ballStates) {
        for (const flight of ballStates[ballId].flights) {
          if (flight.toId === playerId) {
            earliest = earliest == null ? flight.arriveMs : Math.min(earliest, flight.arriveMs);
          }
        }
      }
      return earliest;
    }
    case 'afterPass': {
      let earliest: number | null = null;
      for (const ballId in ballStates) {
        for (const flight of ballStates[ballId].flights) {
          if (flight.fromId === playerId) {
            earliest = earliest == null ? flight.releaseMs : Math.min(earliest, flight.releaseMs);
          }
        }
      }
      return earliest;
    }
    case 'withPlayer': {
      const other = startMs[trigger.playerId];
      return other ?? null;
    }
    default:
      return null; // start / delay are seeded before the loop
  }
}

/** Build the full drill timeline: start-time resolution, pickups, pass chains. */
export function buildDrillTimeline(scene: SceneV4): DrillTimeline {
  const warnings: string[] = [];

  // Seed start times: whistle at 0, delay at ms, everything else unresolved.
  const startMs: Record<string, number | null> = {};
  for (const run of scene.runs) {
    const trigger: Trigger = run.trigger ?? { kind: 'start' };
    if (trigger.kind === 'start') startMs[run.elementId] = 0;
    else if (trigger.kind === 'delay') startMs[run.elementId] = trigger.ms;
    else startMs[run.elementId] = null;
  }

  const pickups: Record<string, Pickup> = {};
  const groundBalls = scene.elements.filter((e) => e.type === 'ball' && (e.heldBy ?? null) === null);

  for (let round = 0; round < MAX_RESOLVE_ROUNDS; round += 1) {
    let changed = false;

    // 1. PICKUPS — earliest runner whose line crosses the ball wins. Possession
    // is rebuilt after EACH assignment (seeded from held-from-start balls) so a
    // runner that just scooped one ball is seen holding it and can't also scoop
    // a second at the same instant — a runner only frees up once they pass it on.
    let pickupStates = buildBallStates(scene, startMs, pickups);
    for (const ball of groundBalls) {
      if (pickups[ball.id]) continue;
      let best: Pickup | null = null;
      for (const run of scene.runs) {
        const runnerStart = startMs[run.elementId];
        if (runnerStart == null) continue;
        const dist = distanceToFirstWithinRadius(run, ball.position, PICKUP_RADIUS_M);
        if (dist == null) continue;
        const tMs = runnerStart + timeToReachDistance(run, dist);
        if (isHoldingOtherBallAt(run.elementId, tMs, ball.id, pickupStates)) continue;
        if (best == null || tMs < best.tMs) {
          best = { ballId: ball.id, playerId: run.elementId, tMs };
        }
      }
      if (best) {
        pickups[ball.id] = best;
        changed = true;
        pickupStates = buildBallStates(scene, startMs, pickups);
      }
    }

    // 2. PASS CHAINS — recompute possession with the latest pickups.
    const ballStates = buildBallStates(scene, startMs, pickups);

    // 3. TRIGGERS — resolve onCatch / afterPass / withPlayer cues.
    for (const run of scene.runs) {
      if (startMs[run.elementId] != null) continue;
      const trigger: Trigger = run.trigger ?? { kind: 'start' };
      const resolved = resolveTrigger(trigger, run.elementId, ballStates, startMs);
      if (resolved != null) {
        startMs[run.elementId] = resolved;
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Cues that never resolved (including cycles) fall back to kickoff.
  for (const run of scene.runs) {
    if (startMs[run.elementId] == null) {
      startMs[run.elementId] = 0;
      warnings.push(`⚠ ${labelFor(scene, run.elementId)} couldn't resolve its cue — starting at kickoff`);
    }
  }

  // Final, authoritative build (collects pass-chain warnings once).
  const ballTimelines = buildBallStates(scene, startMs, pickups, warnings);

  const flights: FlightSegment[] = [];
  for (const ballId in ballTimelines) flights.push(...ballTimelines[ballId].flights);
  flights.sort((a, b) => a.releaseMs - b.releaseMs);

  const runStartMs: Record<string, number> = {};
  let runEnd = 0;
  for (const run of scene.runs) {
    const start = startMs[run.elementId] ?? 0;
    runStartMs[run.elementId] = start;
    runEnd = Math.max(runEnd, start + runDurationMs(run));
  }

  const pickupList = Object.values(pickups);
  const lastArrive = flights.reduce((m, f) => Math.max(m, f.arriveMs), 0);
  const lastPickup = pickupList.reduce((m, p) => Math.max(m, p.tMs), 0);
  const base = Math.max(runEnd, lastArrive, lastPickup);
  const hasContent = scene.runs.length > 0 || flights.length > 0;
  const totalMs = base + (hasContent ? TAIL_MS : 0);

  return { totalMs, flights, pickups: pickupList, runStartMs, ballTimelines, warnings };
}

/** Ease-in catch: linear flight that decelerates over the final stretch. */
function flightProgress(u: number): number {
  'worklet';
  if (u <= 1 - CATCH_EASE_FRAC) return u;
  const k = (u - (1 - CATCH_EASE_FRAC)) / CATCH_EASE_FRAC; // 0..1 in ease zone
  const eased = 1 - (1 - k) * (1 - k); // quadratic ease-out
  return 1 - CATCH_EASE_FRAC + eased * CATCH_EASE_FRAC;
}

export type BallSample = { x: number; y: number; arcOffsetM: number; visible: boolean };

/** Where one ball is at time t: on the ground, carried, or in flight (with arc). */
export function ballPositionAt(
  scene: SceneV4,
  timeline: DrillTimeline,
  ballId: string,
  tMs: number,
): BallSample {
  'worklet';
  const bt = timeline.ballTimelines[ballId];
  if (!bt) return { x: 0, y: 0, arcOffsetM: 0, visible: false };

  for (const flight of bt.flights) {
    if (tMs >= flight.releaseMs && tMs < flight.arriveMs) {
      const span = flight.arriveMs - flight.releaseMs;
      const u = span === 0 ? 1 : (tMs - flight.releaseMs) / span;
      const p = flightProgress(u);
      return {
        x: flight.releasePos.x + (flight.arrivePos.x - flight.releasePos.x) * p,
        y: flight.releasePos.y + (flight.arrivePos.y - flight.releasePos.y) * p,
        arcOffsetM: flight.arcHeightM * 4 * u * (1 - u),
        visible: true,
      };
    }
  }

  // carried: latest carrier whose window has started
  let carrierId: string | null = null;
  let carrierFrom = Number.NEGATIVE_INFINITY;
  for (const entry of bt.carrierSequence) {
    if (tMs >= entry.fromMs && entry.fromMs >= carrierFrom) {
      carrierId = entry.carrierId;
      carrierFrom = entry.fromMs;
    }
  }
  if (carrierId != null) {
    const run = scene.runs.find((r) => r.elementId === carrierId);
    const pos = run
      ? positionOnRun(run, tMs, timeline.runStartMs[carrierId] ?? 0)
      : (scene.elements.find((e) => e.id === carrierId)?.position ?? { x: 0, y: 0 });
    return { x: pos.x, y: pos.y, arcOffsetM: 0, visible: true };
  }

  // not yet picked up — sitting on the ground where it was placed
  const el = scene.elements.find((e) => e.id === ballId);
  if (el) return { x: el.position.x, y: el.position.y, arcOffsetM: 0, visible: true };
  return { x: 0, y: 0, arcOffsetM: 0, visible: false };
}

// ---- Path capture helpers (editor) ----

/** Chaikin corner-cutting: turns a jaggy finger polyline into a coached arc. */
export function smoothPath(points: Vec2[], iterations: number = 1): Vec2[] {
  let current = points;
  for (let iter = 0; iter < iterations; iter += 1) {
    if (current.length < 3) return current;
    const next: Vec2[] = [current[0]];
    for (let i = 0; i < current.length - 1; i += 1) {
      const a = current[i];
      const b = current[i + 1];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}

/** Long recordings are pre-decimated so RDP recursion depth stays bounded. */
const MAX_RECORDING_SAMPLES = 400;

/** Ramer–Douglas–Peucker simplification for drawn paths. */
export function simplifyPath(points: Vec2[], epsilonM: number = 0.8): Vec2[] {
  if (points.length > MAX_RECORDING_SAMPLES) {
    const stride = Math.ceil(points.length / MAX_RECORDING_SAMPLES);
    const last = points[points.length - 1];
    points = points.filter((_, i) => i % stride === 0);
    if (points[points.length - 1] !== last) points = [...points, last];
  }
  if (points.length <= 2) return points;

  const first = points[0];
  const last = points[points.length - 1];
  let maxDist = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i += 1) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist <= epsilonM) return [first, last];

  const left = simplifyPath(points.slice(0, maxIndex + 1), epsilonM);
  const right = simplifyPath(points.slice(maxIndex), epsilonM);
  return [...left.slice(0, -1), ...right];
}

function perpendicularDistance(point: Vec2, lineStart: Vec2, lineEnd: Vec2): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
  const clamped = Math.min(1, Math.max(0, t));
  const projX = lineStart.x + clamped * dx;
  const projY = lineStart.y + clamped * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

// ---- Sampled timelines for the render layer ----
// Reanimated worklets want cheap lookups: pre-sample positions into breakpoint
// arrays once (JS thread), interpolate on the UI thread. The eased run profile
// is baked into the samples so the linear interp stays fast and worklet-safe.

export type ElementTimeline = { times: number[]; xs: number[]; ys: number[] };

export function buildElementTimeline(
  scene: SceneV4,
  elementId: string,
  totalMs: number,
  startMs: number = 0,
): ElementTimeline {
  const run = findRun(scene, elementId);
  const el = scene.elements.find((e) => e.id === elementId);
  const start = el?.position ?? { x: 0, y: 0 };
  if (!run || totalMs === 0) {
    return { times: [0], xs: [start.x], ys: [start.y] };
  }

  const times: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const duration = runDurationMs(run);
  const head = run.points[0];
  const tail = run.points[run.points.length - 1];

  // Hold on the mark until the trigger fires.
  if (startMs > 0) {
    times.push(0);
    xs.push(head.x);
    ys.push(head.y);
    times.push(Math.min(1, startMs / totalMs));
    xs.push(head.x);
    ys.push(head.y);
  }

  // Sample the eased run into breakpoints.
  for (let i = 0; i <= RUN_SAMPLE_COUNT; i += 1) {
    const u = i / RUN_SAMPLE_COUNT;
    const tAbs = startMs + u * duration;
    const pos = positionOnRun(run, tAbs, startMs);
    times.push(Math.min(1, tAbs / totalMs));
    xs.push(pos.x);
    ys.push(pos.y);
  }

  // Hold at the arrowhead until the drill ends.
  if (startMs + duration < totalMs) {
    times.push(1);
    xs.push(tail.x);
    ys.push(tail.y);
  }

  return { times, xs, ys };
}

export function sampleTimeline(timeline: ElementTimeline, t: number): Vec2 {
  'worklet';
  const { times, xs, ys } = timeline;
  const n = times.length;
  if (n === 0) return { x: 0, y: 0 };
  if (t <= times[0]) return { x: xs[0], y: ys[0] };
  if (t >= times[n - 1]) return { x: xs[n - 1], y: ys[n - 1] };

  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid;
  }
  const span = times[hi] - times[lo];
  const f = span === 0 ? 0 : (t - times[lo]) / span;
  return {
    x: xs[lo] + (xs[hi] - xs[lo]) * f,
    y: ys[lo] + (ys[hi] - ys[lo]) * f,
  };
}
