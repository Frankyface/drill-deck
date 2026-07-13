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
import { createEmptyScene, RUN_SPEEDS, type Run, type SceneV3 } from '../schema';

const player = (id: string, x: number, y: number) =>
  ({ id, type: 'player', team: 'attack', position: { x, y } }) as const;

function sceneWith(overrides: Partial<SceneV3>): SceneV3 {
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

  test('runDurationMs = length / speed', () => {
    expect(runDurationMs(run)).toBeCloseTo((70 / RUN_SPEEDS.run) * 1000, 3);
  });

  test('positionOnRun walks at constant speed and clamps', () => {
    expect(positionOnRun(run, 0)).toEqual({ x: 0, y: 0 });
    // after 30m of travel: exactly at the corner
    const cornerTime = (30 / RUN_SPEEDS.run) * 1000;
    expect(positionOnRun(run, cornerTime).x).toBeCloseTo(30, 5);
    expect(positionOnRun(run, cornerTime).y).toBeCloseTo(0, 5);
    // way past the end: clamps at the arrowhead
    expect(positionOnRun(run, 999_999)).toEqual({ x: 30, y: 40 });
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
      elements: [player('passer', 20, 80), player('receiver', 30, 80)],
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
      carrierId: 'passer',
      passes: [{ id: 'pass1', fromId: 'passer', toId: 'receiver', releaseFrac: 0.5, type: 'spin' }],
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
      elements: [player('p1', 10, 90), player('p2', 20, 90)],
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
      carrierId: 'p1',
      passes: [{ id: 'x', fromId: 'p1', toId: 'p2', releaseFrac: 0.5, type: 'pop' }],
    });
    const timeline = buildDrillTimeline(scene);
    const runDur = runDurationMs(scene.runs[0]);
    expect(timeline.flights[0].releaseMs).toBeCloseTo(runDur * 0.5, 3);
    // released from halfway down the run
    expect(timeline.flights[0].releasePos.y).toBeCloseTo(70, 1);
  });

  test('chained passes stay time-ordered (catch before next release)', () => {
    const scene = sceneWith({
      elements: [player('a', 10, 80), player('b', 20, 80), player('c', 30, 80)],
      carrierId: 'a',
      passes: [
        { id: 'p1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'spin' },
        { id: 'p2', fromId: 'b', toId: 'c', releaseFrac: 0.5, type: 'spin' },
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
      elements: [player('a', 10, 80), player('b', 50, 80)],
      carrierId: 'a',
      passes: [{ id: 'p1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'lofted' }],
    });
    const timeline = buildDrillTimeline(scene);
    expect(timeline.flights[0].arcHeightM).toBeGreaterThan(0);

    const flat = sceneWith({
      elements: [player('a', 10, 80), player('b', 50, 80)],
      carrierId: 'a',
      passes: [{ id: 'p1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'spin' }],
    });
    expect(buildDrillTimeline(flat).flights[0].arcHeightM).toBe(0);
  });
});

describe('ballPositionAt', () => {
  const scene = sceneWith({
    elements: [player('a', 10, 80), player('b', 50, 80)],
    carrierId: 'a',
    passes: [{ id: 'p1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'spin' }],
  });
  const timeline = buildDrillTimeline(scene);

  test('ball sits with the carrier before release', () => {
    const sample = ballPositionAt(scene, timeline, 0);
    expect(sample.visible).toBe(true);
    expect(sample.x).toBe(10);
    expect(sample.y).toBe(80);
  });

  test('ball is between passer and receiver mid-flight', () => {
    const flight = timeline.flights[0];
    const mid = (flight.releaseMs + flight.arriveMs) / 2;
    const sample = ballPositionAt(scene, timeline, mid);
    expect(sample.x).toBeGreaterThan(10);
    expect(sample.x).toBeLessThan(50);
  });

  test('ball attaches to the receiver after arrival', () => {
    const flight = timeline.flights[0];
    const sample = ballPositionAt(scene, timeline, flight.arriveMs + 100);
    expect(sample.x).toBe(50);
    expect(sample.y).toBe(80);
  });

  test('no carrier → ball not rendered by playback', () => {
    const still = sceneWith({ elements: [player('a', 10, 80)] });
    const sample = ballPositionAt(still, buildDrillTimeline(still), 0);
    expect(sample.visible).toBe(false);
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
