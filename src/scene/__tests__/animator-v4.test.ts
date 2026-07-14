// New-behaviour coverage for animator v4: smoothstep ramps, distance inversion,
// ball pickups, all five departure triggers, cycle fallback, multi-ball
// independence, and removeElement cleanup. (Migrations live in schema.test.ts.)
import { addElement, removeElement } from '../logic';
import {
  ballPositionAt,
  buildDrillTimeline,
  pathLength,
  positionOnRun,
  runDurationMs,
  timeToReachDistance,
} from '../playback';
import { createEmptyScene, RUN_SPEEDS, type Run, type SceneV4 } from '../schema';

const player = (id: string, x: number, y: number) =>
  ({ id, type: 'player', team: 'attack', position: { x, y } }) as const;

const ball = (id: string, heldBy: string | null, x = 35, y = 54) =>
  ({ id, type: 'ball', position: { x, y }, heldBy }) as const;

function sceneWith(overrides: Partial<SceneV4>): SceneV4 {
  return { ...createEmptyScene(), ...overrides };
}

const straightRun = (id: string, from: { x: number; y: number }, to: { x: number; y: number }): Run => ({
  elementId: id,
  points: [from, to],
  speed: 'run',
});

describe('smoothstep run kinematics', () => {
  const run = straightRun('r', { x: 0, y: 0 }, { x: 100, y: 0 });

  test('total duration is unchanged by the ramp (length / speed)', () => {
    expect(runDurationMs(run)).toBeCloseTo((pathLength(run.points) / RUN_SPEEDS.run) * 1000, 6);
  });

  test('velocity is ~0 at both ends', () => {
    const dur = runDurationMs(run);
    const startStep = Math.hypot(positionOnRun(run, 1).x, positionOnRun(run, 1).y);
    const endA = positionOnRun(run, dur - 1);
    const endStep = Math.hypot(100 - endA.x, endA.y);
    expect(startStep).toBeLessThan(0.01);
    expect(endStep).toBeLessThan(0.01);
  });

  test('mid-run speed is ~1.5x the cruise average', () => {
    const dur = runDurationMs(run);
    const avgPerMs = 100 / dur;
    const a = positionOnRun(run, dur * 0.5 - 0.5);
    const b = positionOnRun(run, dur * 0.5 + 0.5);
    const midPerMs = Math.hypot(b.x - a.x, b.y - a.y); // over 1ms
    expect(midPerMs / avgPerMs).toBeCloseTo(1.5, 1);
  });
});

describe('timeToReachDistance inversion', () => {
  const run = straightRun('r', { x: 0, y: 0 }, { x: 40, y: 0 });

  test('inverts the smoothstep: reaching distance d lands the runner at d', () => {
    for (const d of [5, 10, 20, 33]) {
      const t = timeToReachDistance(run, d);
      expect(positionOnRun(run, t).x).toBeCloseTo(d, 2);
    }
  });

  test('clamps at the endpoints', () => {
    expect(timeToReachDistance(run, 0)).toBe(0);
    expect(timeToReachDistance(run, -5)).toBe(0);
    expect(timeToReachDistance(run, 40)).toBeCloseTo(runDurationMs(run), 5);
    expect(timeToReachDistance(run, 999)).toBeCloseTo(runDurationMs(run), 5);
  });
});

describe('ball pickups', () => {
  test('the earliest runner to cross the ball wins it', () => {
    const scene = sceneWith({
      elements: [player('A', 10, 45), player('B', 10, 20), ball('b1', null, 10, 50)],
      runs: [
        straightRun('A', { x: 10, y: 45 }, { x: 10, y: 55 }), // crosses at ~3m in
        straightRun('B', { x: 10, y: 20 }, { x: 10, y: 80 }), // crosses at ~28m in
      ],
    });
    const timeline = buildDrillTimeline(scene);
    expect(timeline.pickups).toHaveLength(1);
    expect(timeline.pickups[0].ballId).toBe('b1');
    expect(timeline.pickups[0].playerId).toBe('A');
  });

  test('a delayed runner picks the ball up later than an un-delayed one', () => {
    const immediate = sceneWith({
      elements: [player('A', 10, 45), ball('b1', null, 10, 50)],
      runs: [straightRun('A', { x: 10, y: 45 }, { x: 10, y: 55 })],
    });
    const delayed = sceneWith({
      elements: [player('A', 10, 45), ball('b1', null, 10, 50)],
      runs: [{ ...straightRun('A', { x: 10, y: 45 }, { x: 10, y: 55 }), trigger: { kind: 'delay', ms: 2000 } }],
    });
    const tImmediate = buildDrillTimeline(immediate).pickups[0].tMs;
    const tDelayed = buildDrillTimeline(delayed).pickups[0].tMs;
    expect(tDelayed).toBeGreaterThan(tImmediate + 1900);
    expect(tDelayed - tImmediate).toBeCloseTo(2000, 0);
  });

  test('a runner whose cue never fires never picks the ball up', () => {
    const scene = sceneWith({
      elements: [player('A', 10, 45), ball('b1', null, 10, 50)],
      // onCatch, but nobody ever passes to A → A never sets off
      runs: [{ ...straightRun('A', { x: 10, y: 45 }, { x: 10, y: 55 }), trigger: { kind: 'onCatch' } }],
    });
    const timeline = buildDrillTimeline(scene);
    expect(timeline.pickups).toHaveLength(0);
    // ball stays on the ground the whole drill
    expect(ballPositionAt(scene, timeline, 'b1', 0)).toMatchObject({ x: 10, y: 50, visible: true });
    expect(ballPositionAt(scene, timeline, 'b1', timeline.totalMs)).toMatchObject({ x: 10, y: 50 });
    expect(timeline.warnings.some((w) => w.includes('couldn’t') || w.includes("couldn't"))).toBe(true);
  });

  test('a picked-up ground ball rides its runner after the pickup moment', () => {
    const scene = sceneWith({
      elements: [player('A', 10, 45), ball('b1', null, 10, 50)],
      runs: [straightRun('A', { x: 10, y: 45 }, { x: 10, y: 65 })],
    });
    const timeline = buildDrillTimeline(scene);
    const pickup = timeline.pickups[0];
    // just before pickup: on the ground; well after: has moved past the ball
    expect(ballPositionAt(scene, timeline, 'b1', pickup.tMs - 50).y).toBeCloseTo(50, 0);
    expect(ballPositionAt(scene, timeline, 'b1', pickup.tMs + 400).y).toBeGreaterThan(50);
  });
});

describe('departure triggers', () => {
  test('delay offsets the start by exactly its ms', () => {
    const scene = sceneWith({
      elements: [player('p', 0, 0)],
      runs: [{ ...straightRun('p', { x: 0, y: 0 }, { x: 10, y: 0 }), trigger: { kind: 'delay', ms: 3000 } }],
    });
    const timeline = buildDrillTimeline(scene);
    expect(timeline.runStartMs.p).toBe(3000);
  });

  test('onCatch: the receiver stands until the ball arrives, then moves', () => {
    const scene = sceneWith({
      elements: [player('a', 10, 80), player('b', 30, 80), ball('b1', 'a')],
      runs: [{ ...straightRun('b', { x: 30, y: 80 }, { x: 30, y: 40 }), trigger: { kind: 'onCatch' } }],
      passes: [{ id: 'p1', ballId: 'b1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'spin' }],
    });
    const timeline = buildDrillTimeline(scene);
    const flight = timeline.flights[0];
    expect(timeline.runStartMs.b).toBeCloseTo(flight.arriveMs, 3);
    const bRun = scene.runs[0];
    // standing on the mark at the catch, moving upfield shortly after
    expect(positionOnRun(bRun, flight.arriveMs, timeline.runStartMs.b).y).toBeCloseTo(80, 3);
    expect(positionOnRun(bRun, flight.arriveMs + 1000, timeline.runStartMs.b).y).toBeLessThan(80);
  });

  test('afterPass: the passer leaves the moment the ball is released', () => {
    const scene = sceneWith({
      elements: [player('a', 10, 80), player('b', 40, 80), ball('b1', 'a')],
      runs: [{ ...straightRun('a', { x: 10, y: 80 }, { x: 10, y: 50 }), trigger: { kind: 'afterPass' } }],
      passes: [{ id: 'p1', ballId: 'b1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'spin' }],
    });
    const timeline = buildDrillTimeline(scene);
    const flight = timeline.flights[0];
    expect(timeline.runStartMs.a).toBeCloseTo(flight.releaseMs, 3);
    // and the passer holds still until that release
    const aRun = scene.runs[0];
    expect(positionOnRun(aRun, flight.releaseMs, timeline.runStartMs.a).y).toBeCloseTo(80, 3);
    expect(positionOnRun(aRun, flight.releaseMs + 800, timeline.runStartMs.a).y).toBeLessThan(80);
  });

  test('withPlayer: the follower syncs to the leader’s start', () => {
    const scene = sceneWith({
      elements: [player('lead', 0, 0), player('follow', 5, 0)],
      runs: [
        { ...straightRun('lead', { x: 0, y: 0 }, { x: 0, y: 20 }), trigger: { kind: 'delay', ms: 1500 } },
        { ...straightRun('follow', { x: 5, y: 0 }, { x: 5, y: 20 }), trigger: { kind: 'withPlayer', playerId: 'lead' } },
      ],
    });
    const timeline = buildDrillTimeline(scene);
    expect(timeline.runStartMs.lead).toBe(1500);
    expect(timeline.runStartMs.follow).toBe(1500);
  });

  test('a withPlayer cycle degrades to kickoff with a warning (no infinite loop)', () => {
    const scene = sceneWith({
      elements: [player('a', 0, 0), player('b', 5, 0)],
      runs: [
        { ...straightRun('a', { x: 0, y: 0 }, { x: 0, y: 20 }), trigger: { kind: 'withPlayer', playerId: 'b' } },
        { ...straightRun('b', { x: 5, y: 0 }, { x: 5, y: 20 }), trigger: { kind: 'withPlayer', playerId: 'a' } },
      ],
    });
    const timeline = buildDrillTimeline(scene);
    expect(timeline.runStartMs.a).toBe(0);
    expect(timeline.runStartMs.b).toBe(0);
    expect(timeline.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('multi-ball independence', () => {
  test('two balls resolve independent chains with per-ball flights', () => {
    const scene = sceneWith({
      elements: [
        player('a', 10, 20),
        player('b', 30, 20),
        player('c', 10, 80),
        player('d', 30, 80),
        ball('b1', 'a'),
        ball('b2', 'c'),
      ],
      passes: [
        { id: 'pa', ballId: 'b1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'spin' },
        { id: 'pc', ballId: 'b2', fromId: 'c', toId: 'd', releaseFrac: 0.5, type: 'pop' },
      ],
    });
    const timeline = buildDrillTimeline(scene);
    expect(timeline.flights).toHaveLength(2);
    expect(timeline.ballTimelines.b1.flights).toHaveLength(1);
    expect(timeline.ballTimelines.b2.flights).toHaveLength(1);
    expect(timeline.ballTimelines.b1.flights[0].toId).toBe('b');
    expect(timeline.ballTimelines.b2.flights[0].toId).toBe('d');
    // sampled independently: at t=0 each ball sits with its own holder
    expect(ballPositionAt(scene, timeline, 'b1', 0)).toMatchObject({ x: 10, y: 20 });
    expect(ballPositionAt(scene, timeline, 'b2', 0)).toMatchObject({ x: 10, y: 80 });
  });
});

describe('removeElement cleanup', () => {
  test('removing the holder drops the ball to the ground (heldBy → null)', () => {
    const scene = sceneWith({
      elements: [player('p1', 10, 80), ball('b1', 'p1', 10, 80)],
    });
    const next = removeElement(scene, 'p1');
    const b = next.elements.find((e) => e.type === 'ball');
    expect(b?.heldBy).toBeNull();
    expect(next.elements.some((e) => e.id === 'p1')).toBe(false);
  });

  test('removing a ball drops only its own passes', () => {
    const scene = sceneWith({
      elements: [
        player('a', 10, 20),
        player('b', 30, 20),
        player('c', 10, 80),
        player('d', 30, 80),
        ball('b1', 'a'),
        ball('b2', 'c'),
      ],
      passes: [
        { id: 'pa', ballId: 'b1', fromId: 'a', toId: 'b', releaseFrac: 0.5, type: 'spin' },
        { id: 'pc', ballId: 'b2', fromId: 'c', toId: 'd', releaseFrac: 0.5, type: 'pop' },
      ],
    });
    const next = removeElement(scene, 'b1');
    expect(next.passes.map((p) => p.id)).toEqual(['pc']);
    expect(next.elements.some((e) => e.id === 'b1')).toBe(false);
  });

  test('removing a player downgrades withPlayer triggers pointing at them', () => {
    const scene = sceneWith({
      elements: [player('lead', 0, 0), player('follow', 5, 0)],
      runs: [
        straightRun('lead', { x: 0, y: 0 }, { x: 0, y: 20 }),
        { ...straightRun('follow', { x: 5, y: 0 }, { x: 5, y: 20 }), trigger: { kind: 'withPlayer', playerId: 'lead' } },
      ],
    });
    const next = removeElement(scene, 'lead');
    const followRun = next.runs.find((r) => r.elementId === 'follow');
    expect(followRun?.trigger).toEqual({ kind: 'start' });
  });

  test('addElement + removeElement stay immutable', () => {
    const scene = addElement(createEmptyScene(), player('p1', 1, 1));
    const next = removeElement(scene, 'p1');
    expect(scene.elements).toHaveLength(1); // original untouched
    expect(next.elements).toHaveLength(0);
  });
});
