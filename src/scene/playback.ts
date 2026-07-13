// Playback math — pure functions, worklet-safe (no imports from react-native).
import type { SceneV2, Vec2 } from './schema';

export type ElementTimeline = {
  /** Global breakpoints in [0,1] across the whole drill. */
  times: number[];
  xs: number[];
  ys: number[];
};

export function totalDurationMs(scene: SceneV2): number {
  return scene.phases.reduce((sum, p) => sum + p.durationMs, 0);
}

/**
 * Flatten a single element's per-phase keyframes into one global timeline.
 * Elements without a track in a phase hold their position for that phase
 * (explicit hold breakpoints prevent cross-phase drift).
 */
export function buildTrackTimeline(scene: SceneV2, elementId: string): ElementTimeline {
  const element = scene.elements.find((el) => el.id === elementId);
  const start: Vec2 = element ? element.position : { x: 0, y: 0 };
  const total = totalDurationMs(scene);

  const times: number[] = [0];
  const xs: number[] = [start.x];
  const ys: number[] = [start.y];

  if (total === 0) return { times, xs, ys };

  let elapsed = 0;
  let current: Vec2 = start;

  for (const phase of scene.phases) {
    const t0 = elapsed / total;
    const t1 = (elapsed + phase.durationMs) / total;
    const track = phase.tracks.find((tr) => tr.elementId === elementId);

    if (track && track.keyframes.length >= 2) {
      const sorted = [...track.keyframes].sort((a, b) => a.t - b.t);
      for (const kf of sorted) {
        const globalT = t0 + kf.t * (t1 - t0);
        // keep breakpoints strictly increasing
        if (globalT > times[times.length - 1]) {
          times.push(globalT);
          xs.push(kf.position.x);
          ys.push(kf.position.y);
        } else {
          xs[xs.length - 1] = kf.position.x;
          ys[ys.length - 1] = kf.position.y;
        }
      }
      current = sorted[sorted.length - 1].position;
    } else {
      // hold: pin position at both phase boundaries
      if (t1 > times[times.length - 1]) {
        times.push(t1);
        xs.push(current.x);
        ys.push(current.y);
      }
    }
    elapsed += phase.durationMs;
  }

  return { times, xs, ys };
}

/** Linear interpolation over a timeline at global progress t ∈ [0,1]. */
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

/**
 * Ramer–Douglas–Peucker path simplification: recorded finger paths arrive as
 * dozens of samples; store only the shape-defining points.
 */
export function simplifyPath(points: Vec2[], epsilonM: number = 0.8): Vec2[] {
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

/** Convert a recorded drag (samples with wall-clock ms) into track keyframes. */
export function samplesToKeyframes(
  samples: { position: Vec2; atMs: number }[],
  epsilonM: number = 0.8,
): { t: number; position: Vec2 }[] {
  if (samples.length < 2) return [];
  const t0 = samples[0].atMs;
  const t1 = samples[samples.length - 1].atMs;
  const span = Math.max(1, t1 - t0);

  const simplified = simplifyPath(
    samples.map((s) => s.position),
    epsilonM,
  );

  // Re-attach timing by nearest original sample for each simplified point.
  return simplified.map((pos, idx) => {
    if (idx === 0) return { t: 0, position: pos };
    if (idx === simplified.length - 1) return { t: 1, position: pos };
    const nearest = samples.reduce((best, s) =>
      Math.hypot(s.position.x - pos.x, s.position.y - pos.y) <
      Math.hypot(best.position.x - pos.x, best.position.y - pos.y)
        ? s
        : best,
    );
    return { t: (nearest.atMs - t0) / span, position: pos };
  });
}
