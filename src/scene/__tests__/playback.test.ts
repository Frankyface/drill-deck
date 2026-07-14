import {
  ballPositionAt,
  buildDrillTimeline,
  buildElementTimeline,
  MIN_CARRY_MS,
  pathLength,
  positionOnRun,
  runDurationMs,
  sampleTimeline,
  simplifyPath,
  smoothPath,
  STATIC_RELEASE_DELAY_MS,
  TAIL_MS,
} from '../playback';
import { createEmptyScene, RUN_SPEEDS, type Run, type SceneV4 } from '../schema';

const player = (id: string, x: number, y: number) =>
  ({ id, type: 'player', team: 'attack', position: { x, y } }) as const;

const ball = (id: string, heldBy: string | null, x = 35, y = 54) =>
  ({ id, type: 'ball', position: { x, y }, heldBy }) as const;

function sceneWith(overrides: Partial<SceneV4>): SceneV4 {
  return { ...createEmptyScene(), ...overrides };
}

describe('run math', () => {
  const run: Run = {
    elementId: 'p1',
    points: [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 40 },
    ],
    speed: 'run',
  };

  test('pathLength sums segments', () => {
    expect(pathLength(run.points)).toBe(70);
  });

  test('runDurationMs = length / speed (unchanged by the ramp profile)', () => {
    expect(runDurationMs(run)).toBeCloseTo((70 / RUN_SPEEDS.run) * 1000, 3);
  });

  test('positionOnRun follows a smoothstep profile and clamps both ends', () => {
    expect(positionOnRun(run, 0)).toEqual({ x: 0, y: 0 });
    // half the DURATION → smoothstep(0.5) = 0.5 of the distance = 35m in →
    // 30m along the first leg, then 5m up the second: (30, 5)
    const half = runDurationMs(run) / 2;
    expect(positionOnRun(run, half).x).toBeCloseTo(30, 5);
    expect(positionOnRun(run, half).y).toBeCloseTo(5, 5);
    // way past the end: clamps at the arrowhead
    expect(positionOnRun(run, 999_999)).toEqual({ x: 30, y: 40 });
  });

  test('velocity is ~0 at the start (position at 1ms barely moves)', () => {
    const near = positionOnRun(run, 1);
    expect(Math.hypot(near.x, near.y)).toBeLessThan(0.01);
  });

  test('honours a non-zero start time', () => {
    // before the runner sets off they hold the mark
    expect(positionOnRun(run, 500, 1000)).toEqual({ x: 0, y: 0 });
    // the window is [startMs, startMs+duration]
    const mid = 1000 + runDurationMs(run) / 2;
    expect(positionOnRun(run, mid, 1000).x).toBeCloseTo(30, 5);
  });

  test('sprint covers the same path faster than walk', () => {
    expect(runDurationMs({ ...run, speed: 'sprint' })).toBeLessThan(
      runDurationMs({ ...run, speed: 'walk' }),
    );
  });
});

describe('pass chain + interception solver', () => {
  test('a pass to a RUNNING receiver leads them (arrives where they will be)', () => {
    const scene = sceneWith({
      elements: [player('passer', 20, 80), player('receiver', 30, 80), ball('b1', 'passer')],
      runs: [
        {
          elementId: 'receiver',
          points: [
            { x: 30, y: 80 },
            { x: 30, y: 40 }, // sprinting straight upfield
          ],
          speed: 'sprint',
        },
      ],
      passes: [
        { id: 'pass1', ballId: 'b1', fromId: 'passer', toId: 'receiver', releaseFrac: 0.5, type: 'spin' },
      ],
    });
    const timeline = buildDrillTimeline(scene);
    expect(timeline.flights).toHaveLength(1);
    const flight = timeline.flights[0];
    // static passer: releases after the standing delay
    expect(flight.releaseMs).toBe(STATIC_RELEASE_DELAY_MS);
    // the receiver has RUN somewhere up the pitch — the ball must arrive
    // ahead of their start point, not at it
    expect(flight.arrivePos.y).toBeLessThan(80);
    // and exactly where the receiver actually is at arrival time
    const receiverRun = scene.runs[0];
    const receiverAtArrival = positionOnRun(receiverRun, flight.arriveMs);
    expect(flight.arrivePos.x).toBeCloseTo(receiverAtArrival.x, 3);
    expect(flight.arrivePos.y).toBeCloseTo(receiverAtArrival.y, 3);
  });

  test('running passer releases at releaseFrac of their own run', () => {
    const scene = sceneWith({
      elements: [player('p1', 10, 90), player('p2', 20, 90), ball('b1', 'p1')],
      runs: [
        {
          elementId: 'p1',
          points: [
            { x: 10, y: 90 },
            { x: 10, y: 50 },
          ],
          speed: 'run',
        },
      ],
      passes: [{ id: 'x', ballId: 'b1', fromId: 'p1', toId: 'p2', releaseFrac: 0.5, type: 'pop' }],
    });
    const timeline = buildDrillTimeline(scene);
    const runDur = runDurationMs(scene.runs[0]);
    expect(timeline.flights[0].releaseMs).toBeCloseTo(runDur * 0.5, 3);
    // smoothstep(0.5) = 0.5 of a 40m leg → released from halfway down the run
    expect(timeline.flights[0].releasePos.y).toBeCloseTo(70, 1);
  });

  test('chained passes stay time-ordered (catch before next release)', () => {
    const scene = sceneWith({
      elements: [player('a', 10, 80), player('b', 20, 80), player('c', 30, 80), ball('b1', 'a')],
      passes: [
        { id: 'p1', ballId: 'b1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'spin' },
        { id: 'p2', ballId: 'b1', fromId: 'b', toId: 'c', releaseFrac: 0.5, type: 'spin' },
      ],
    });
    const timeline = buildDrillTimeline(scene);
    expect(timeline.flights).toHaveLength(2);
    const [first, second] = timeline.flights;
    expect(second.releaseMs).toBeGreaterThanOrEqual(first.arriveMs + MIN_CARRY_MS);
    expect(timeline.totalMs).toBe(second.arriveMs + TAIL_MS);
  });

  test('lofted passes get an arc, flat passes do not', () => {
    const scene = sceneWith({
      elements: [player('a', 10, 80), player('b', 50, 80), ball('b1', 'a')],
      passes: [{ id: 'p1', ballId: 'b1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'lofted' }],
    });
    const timeline = buildDrillTimeline(scene);
    expect(timeline.flights[0].arcHeightM).toBeGreaterThan(0);

    const flat = sceneWith({
      elements: [player('a', 10, 80), player('b', 50, 80), ball('b1', 'a')],
      passes: [{ id: 'p1', ballId: 'b1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'spin' }],
    });
    expect(buildDrillTimeline(flat).flights[0].arcHeightM).toBe(0);
  });
});

describe('ballPositionAt', () => {
  const scene = sceneWith({
    elements: [player('a', 10, 80), player('b', 50, 80), ball('b1', 'a')],
    passes: [{ id: 'p1', ballId: 'b1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'spin' }],
  });
  const timeline = buildDrillTimeline(scene);

  test('ball sits with the carrier before release', () => {
    const sample = ballPositionAt(scene, timeline, 'b1', 0);
    expect(sample.visible).toBe(true);
    expect(sample.x).toBe(10);
    expect(sample.y).toBe(80);
  });

  test('ball is between passer and receiver mid-flight', () => {
    const flight = timeline.flights[0];
    const mid = (flight.releaseMs + flight.arriveMs) / 2;
    const sample = ballPositionAt(scene, timeline, 'b1', mid);
    expect(sample.x).toBeGreaterThan(10);
    expect(sample.x).toBeLessThan(50);
  });

  test('ball attaches to the receiver after arrival', () => {
    const flight = timeline.flights[0];
    const sample = ballPositionAt(scene, timeline, 'b1', flight.arriveMs + 100);
    expect(sample.x).toBe(50);
    expect(sample.y).toBe(80);
  });

  test('a ground ball nobody reaches stays visible where it was placed', () => {
    const still = sceneWith({ elements: [player('a', 10, 80), ball('b1', null, 35, 54)] });
    const t = buildDrillTimeline(still);
    const sample = ballPositionAt(still, t, 'b1', 0);
    expect(sample.visible).toBe(true);
    expect(sample.x).toBe(35);
    expect(sample.y).toBe(54);
    // an unknown ball id is not rendered
    expect(ballPositionAt(still, t, 'ghost', 0).visible).toBe(false);
  });
});

describe('element timelines for rendering', () => {
  test('runner timeline interpolates and holds at the arrowhead', () => {
    const scene = sceneWith({
      elements: [player('p1', 0, 0)],
      runs: [
        {
          elementId: 'p1',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          speed: 'run',
        },
      ],
    });
    const { totalMs } = buildDrillTimeline(scene);
    const timeline = buildElementTimeline(scene, 'p1', totalMs);
    expect(sampleTimeline(timeline, 0)).toEqual({ x: 0, y: 0 });
    expect(sampleTimeline(timeline, 1)).toEqual({ x: 10, y: 0 });
    // element with no run holds still
    const still = buildElementTimeline(scene, 'ghost', totalMs);
    expect(sampleTimeline(still, 0.5)).toEqual({ x: 0, y: 0 });
  });

  test('a delayed run holds on the mark until its start time', () => {
    const scene = sceneWith({
      elements: [player('p1', 0, 0)],
      runs: [
        {
          elementId: 'p1',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          speed: 'run',
          trigger: { kind: 'delay', ms: 1000 },
        },
      ],
    });
    const { totalMs, runStartMs } = buildDrillTimeline(scene);
    const timeline = buildElementTimeline(scene, 'p1', totalMs, runStartMs.p1);
    // at t just before the 1s cue the runner is still on the mark
    expect(sampleTimeline(timeline, (900 / totalMs))).toEqual({ x: 0, y: 0 });
    expect(sampleTimeline(timeline, 1)).toEqual({ x: 10, y: 0 });
  });
});

describe('path capture helpers', () => {
  test('smoothPath rounds corners but keeps endpoints', () => {
    const jaggy = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const smooth = smoothPath(jaggy, 1);
    expect(smooth[0]).toEqual(jaggy[0]);
    expect(smooth[smooth.length - 1]).toEqual(jaggy[jaggy.length - 1]);
    expect(smooth.length).toBeGreaterThan(jaggy.length);
  });

  test('simplifyPath collapses collinear points and caps huge inputs', () => {
    const line = Array.from({ length: 1000 }, (_, i) => ({ x: i * 0.1, y: 0 }));
    const simplified = simplifyPath(line, 0.5);
    expect(simplified.length).toBe(2);
    expect(simplified[0]).toEqual({ x: 0, y: 0 });
  });
});

describe('multi-ball pickup safety (audit regression)', () => {
  test('a runner whose line passes two ground balls scoops only the first', () => {
    const scene: SceneV4 = {
      ...createEmptyScene(),
      elements: [player('r', 0, 0), ball('b1', null, 0, 10), ball('b2', null, 0, 20)],
      runs: [
        {
          elementId: 'r',
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 30 },
          ],
          speed: 'run',
        },
      ],
      passes: [],
    };
    const timeline = buildDrillTimeline(scene);
    // b1 scooped; b2 stays on the ground (runner already carries b1 at that instant)
    expect(timeline.pickups.map((p) => p.ballId)).toEqual(['b1']);
  });
});
