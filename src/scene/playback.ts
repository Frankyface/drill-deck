// Playback math for v3 scenes — pure functions, worklet-safe.
//
// Model (per the Real Rugby study, professionalized):
// - every run starts at t=0 and traverses its polyline at constant real speed
// - the ball follows the carrier; each pass releases at `releaseFrac` of the
//   passer's run and is thrown to WHERE THE RECEIVER WILL BE when it arrives
//   (fixed-point interception solver), never to where they were
// - lofted passes get a rendered arc; catches ease in over the final stretch
import {
  PASS_SPEEDS,
  RUN_SPEEDS,
  type Pass,
  type Run,
  type SceneV3,
  type Vec2,
} from './schema';

export const STATIC_RELEASE_DELAY_MS = 450; // hold time before a standing pass
export const MIN_CARRY_MS = 200; // can't release before you've gathered it
export const TAIL_MS = 600; // playback breathing room after the last event
export const CATCH_EASE_FRAC = 0.18; // final stretch of flight eases in

export function pathLength(points: Vec2[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return length;
}

export function runDurationMs(run: Run): number {
  return (pathLength(run.points) / RUN_SPEEDS[run.speed]) * 1000;
}

/** Position along a run at time t (ms since drill start). Clamps both ends. */
export function positionOnRun(run: Run, tMs: number): Vec2 {
  'worklet';
  const speed = RUN_SPEEDS[run.speed];
  let remaining = Math.max(0, (tMs / 1000) * speed);
  for (let i = 1; i < run.points.length; i += 1) {
    const a = run.points[i - 1];
    const b = run.points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= seg) {
      const f = seg === 0 ? 0 : remaining / seg;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    remaining -= seg;
  }
  return run.points[run.points.length - 1];
}

export type FlightSegment = {
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

export type DrillTimeline = {
  totalMs: number;
  flights: FlightSegment[];
  /** Who holds the ball from each flight's arrival until the next release. */
  carrierSequence: { fromMs: number; carrierId: string }[];
};

function elementPositionAt(scene: SceneV3, elementId: string, tMs: number): Vec2 {
  const run = scene.runs.find((r) => r.elementId === elementId);
  if (run) return positionOnRun(run, tMs);
  const el = scene.elements.find((e) => e.id === elementId);
  return el ? el.position : { x: 0, y: 0 };
}

/**
 * Fixed-point interception solver (ported from Real Rugby's calcPassGeometry):
 * find arrival time T such that the flight distance covered by then equals the
 * distance to the receiver's position AT time T. Converges because pass speed
 * exceeds every run speed.
 */
function solveArrival(
  scene: SceneV3,
  releasePos: Vec2,
  releaseMs: number,
  toId: string,
  passSpeed: number,
): { arriveMs: number; arrivePos: Vec2 } {
  let arriveMs = releaseMs;
  for (let i = 0; i < 20; i += 1) {
    const target = elementPositionAt(scene, toId, arriveMs);
    const dist = Math.hypot(target.x - releasePos.x, target.y - releasePos.y);
    const next = releaseMs + (dist / passSpeed) * 1000;
    if (Math.abs(next - arriveMs) < 1) {
      arriveMs = next;
      break;
    }
    arriveMs = next;
  }
  return { arriveMs, arrivePos: elementPositionAt(scene, toId, arriveMs) };
}

/** Build the full drill timeline: run ends, pass chain, total duration. */
export function buildDrillTimeline(scene: SceneV3): DrillTimeline {
  const flights: FlightSegment[] = [];
  const carrierSequence: { fromMs: number; carrierId: string }[] = [];

  let lastArriveMs = 0;
  if (scene.carrierId) {
    carrierSequence.push({ fromMs: 0, carrierId: scene.carrierId });
  }

  for (const pass of scene.passes) {
    const fromRun = scene.runs.find((r) => r.elementId === pass.fromId);
    const naturalRelease = fromRun
      ? pass.releaseFrac * runDurationMs(fromRun)
      : lastArriveMs + STATIC_RELEASE_DELAY_MS;
    const releaseMs = Math.max(naturalRelease, lastArriveMs + MIN_CARRY_MS);
    const releasePos = elementPositionAt(scene, pass.fromId, releaseMs);

    const passSpeed = PASS_SPEEDS[pass.type];
    const { arriveMs, arrivePos } = solveArrival(scene, releasePos, releaseMs, pass.toId, passSpeed);

    const flightDist = Math.hypot(arrivePos.x - releasePos.x, arrivePos.y - releasePos.y);
    flights.push({
      fromId: pass.fromId,
      toId: pass.toId,
      releaseMs,
      arriveMs,
      releasePos,
      arrivePos,
      type: pass.type,
      arcHeightM: pass.type === 'lofted' ? Math.min(flightDist / 4, 8) : 0,
    });
    carrierSequence.push({ fromMs: arriveMs, carrierId: pass.toId });
    lastArriveMs = arriveMs;
  }

  const runEnd = scene.runs.reduce((max, run) => Math.max(max, runDurationMs(run)), 0);
  const totalMs = Math.max(runEnd, lastArriveMs) + (scene.runs.length || flights.length ? TAIL_MS : 0);

  return { totalMs, flights, carrierSequence };
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

/** Where the ball is at time t: carried, in flight (with arc), or absent. */
export function ballPositionAt(
  scene: SceneV3,
  timeline: DrillTimeline,
  tMs: number,
): BallSample {
  'worklet';
  if (!scene.carrierId) return { x: 0, y: 0, arcOffsetM: 0, visible: false };

  for (const flight of timeline.flights) {
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
  let carrierId = scene.carrierId;
  for (const entry of timeline.carrierSequence) {
    if (tMs >= entry.fromMs) carrierId = entry.carrierId;
  }
  const run = scene.runs.find((r) => r.elementId === carrierId);
  const pos = run
    ? positionOnRun(run, tMs)
    : (scene.elements.find((e) => e.id === carrierId)?.position ?? { x: 0, y: 0 });
  return { x: pos.x, y: pos.y, arcOffsetM: 0, visible: true };
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
// Reanimated worklets want cheap lookups: pre-sample positions into
// breakpoint arrays once (JS thread), interpolate on the UI thread.

export type ElementTimeline = { times: number[]; xs: number[]; ys: number[] };

export function buildElementTimeline(scene: SceneV3, elementId: string, totalMs: number): ElementTimeline {
  const run = scene.runs.find((r) => r.elementId === elementId);
  const el = scene.elements.find((e) => e.id === elementId);
  const start = el?.position ?? { x: 0, y: 0 };
  if (!run || totalMs === 0) {
    return { times: [0], xs: [start.x], ys: [start.y] };
  }
  const times: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const duration = runDurationMs(run);
  const speed = RUN_SPEEDS[run.speed];
  let elapsed = 0;
  for (let i = 0; i < run.points.length; i += 1) {
    if (i > 0) {
      const a = run.points[i - 1];
      const b = run.points[i];
      elapsed += (Math.hypot(b.x - a.x, b.y - a.y) / speed) * 1000;
    }
    times.push(Math.min(1, elapsed / totalMs));
    xs.push(run.points[i].x);
    ys.push(run.points[i].y);
  }
  if (duration < totalMs) {
    // hold at the arrow head until the drill ends
    times.push(1);
    xs.push(run.points[run.points.length - 1].x);
    ys.push(run.points[run.points.length - 1].y);
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
