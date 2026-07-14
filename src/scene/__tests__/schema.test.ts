import {
  createEmptyScene,
  migrateScene,
  parseScene,
  type BallElement,
  type SceneV1,
} from '../schema';

describe('scene schema', () => {
  test('parses and migrates a v1 scene to v4 with no animation', () => {
    const v1: SceneV1 = {
      version: 1,
      pitch: 'half',
      elements: [
        { id: 'p1', type: 'player', team: 'attack', label: '10', position: { x: 35, y: 50 } },
        { id: 'c1', type: 'cone', position: { x: 10, y: 10 } },
      ],
    };
    const migrated = parseScene(v1);
    expect(migrated.version).toBe(4);
    expect(migrated.runs).toEqual([]);
    expect(migrated.passes).toEqual([]);
    expect(migrated.elements).toHaveLength(2);
    // carrierId is gone in v4 — possession lives on the ball element now
    expect('carrierId' in migrated).toBe(false);
  });

  test('migrates a v2 keyframe scene to v4 runs with a speed preset', () => {
    const v2 = {
      version: 2,
      pitch: 'half',
      elements: [{ id: 'p1', type: 'player', team: 'attack', position: { x: 10, y: 10 } }],
      phases: [
        {
          id: 'ph1',
          durationMs: 2000,
          tracks: [
            {
              elementId: 'p1',
              keyframes: [
                { t: 0, position: { x: 10, y: 10 } },
                { t: 1, position: { x: 10, y: 21 } }, // 11m in 2s ≈ run pace
              ],
            },
          ],
        },
      ],
    };
    const migrated = parseScene(v2);
    expect(migrated.version).toBe(4);
    expect(migrated.runs).toHaveLength(1);
    expect(migrated.runs[0].speed).toBe('run');
    expect(migrated.passes).toEqual([]);
  });

  test('migrateScene leaves a v4 scene untouched', () => {
    const scene = createEmptyScene('full');
    expect(migrateScene(scene)).toBe(scene);
  });

  test('rejects garbage that is not a scene', () => {
    expect(() => parseScene({ version: 99, elements: [] })).toThrow();
    expect(() => parseScene(null)).toThrow();
    expect(() =>
      parseScene({
        version: 4,
        pitch: 'volcano',
        elements: [],
        runs: [],
        passes: [],
      }),
    ).toThrow();
    expect(() =>
      parseScene({
        version: 4,
        pitch: 'half',
        elements: [],
        runs: [],
        passes: [
          { id: 'x', ballId: 'b1', fromId: 'a', toId: 'b', releaseFrac: 2, type: 'spin' },
        ],
      }),
    ).toThrow();
  });

  test('rejects a delay trigger outside the 500..10000ms band', () => {
    const base = {
      version: 4 as const,
      pitch: 'half' as const,
      elements: [{ id: 'p1', type: 'player' as const, team: 'attack' as const, position: { x: 1, y: 1 } }],
      passes: [],
    };
    expect(() =>
      parseScene({
        ...base,
        runs: [
          {
            elementId: 'p1',
            points: [{ x: 1, y: 1 }, { x: 5, y: 5 }],
            speed: 'run',
            trigger: { kind: 'delay', ms: 100 },
          },
        ],
      }),
    ).toThrow();
    // a valid delay parses fine
    const ok = parseScene({
      ...base,
      runs: [
        {
          elementId: 'p1',
          points: [{ x: 1, y: 1 }, { x: 5, y: 5 }],
          speed: 'run',
          trigger: { kind: 'delay', ms: 1000 },
        },
      ],
    });
    expect(ok.runs[0].trigger).toEqual({ kind: 'delay', ms: 1000 });
  });

  test('rejects an arrow with fewer than 2 points', () => {
    expect(() =>
      parseScene({
        version: 4,
        pitch: 'half',
        elements: [
          { id: 'a1', type: 'arrow', style: 'run', position: { x: 0, y: 0 }, points: [{ x: 0, y: 0 }] },
        ],
        runs: [],
        passes: [],
      }),
    ).toThrow();
  });

  test('round-trips through JSON (what Supabase JSONB storage does)', () => {
    const scene = createEmptyScene('quarter');
    const roundTripped = parseScene(JSON.parse(JSON.stringify(scene)));
    expect(roundTripped).toEqual(scene);
  });
});

describe('v3 → v4 migration', () => {
  const v3Base = {
    version: 3 as const,
    pitch: 'half' as const,
  };

  test('a carrier with an existing ball element becomes that ball’s heldBy', () => {
    const v3 = {
      ...v3Base,
      elements: [
        { id: 'p1', type: 'player', team: 'attack', position: { x: 10, y: 80 } },
        { id: 'p2', type: 'player', team: 'attack', position: { x: 20, y: 80 } },
        { id: 'ball1', type: 'ball', position: { x: 99, y: 99 } },
      ],
      runs: [{ elementId: 'p1', points: [{ x: 10, y: 80 }, { x: 10, y: 60 }], speed: 'run' }],
      passes: [{ id: 'pass1', fromId: 'p1', toId: 'p2', releaseFrac: 0.5, type: 'spin' }],
      carrierId: 'p1',
    };
    const migrated = parseScene(v3);
    const ball = migrated.elements.find((e): e is BallElement => e.type === 'ball');
    expect(ball?.id).toBe('ball1');
    expect(ball?.heldBy).toBe('p1');
    // runs gain the default start trigger
    expect(migrated.runs[0].trigger).toEqual({ kind: 'start' });
    // every pass is tagged with the ball's id
    expect(migrated.passes).toHaveLength(1);
    expect(migrated.passes[0].ballId).toBe('ball1');
    expect(migrated.elements.filter((e) => e.type === 'ball')).toHaveLength(1);
  });

  test('a carrier with NO ball element gets a synthetic ball-migrated at their position', () => {
    const v3 = {
      ...v3Base,
      elements: [
        { id: 'p1', type: 'player', team: 'attack', position: { x: 15, y: 42 } },
        { id: 'p2', type: 'player', team: 'attack', position: { x: 25, y: 42 } },
      ],
      runs: [],
      passes: [{ id: 'pass1', fromId: 'p1', toId: 'p2', releaseFrac: 0.5, type: 'pop' }],
      carrierId: 'p1',
    };
    const migrated = parseScene(v3);
    const ball = migrated.elements.find((e): e is BallElement => e.type === 'ball');
    expect(ball?.id).toBe('ball-migrated');
    expect(ball?.heldBy).toBe('p1');
    expect(ball?.position).toEqual({ x: 15, y: 42 }); // carrier's position
    expect(migrated.passes[0].ballId).toBe('ball-migrated');
  });

  test('v3 passes with no carrier are invalid and dropped', () => {
    const v3 = {
      ...v3Base,
      elements: [
        { id: 'p1', type: 'player', team: 'attack', position: { x: 10, y: 80 } },
        { id: 'p2', type: 'player', team: 'attack', position: { x: 20, y: 80 } },
      ],
      runs: [],
      passes: [{ id: 'pass1', fromId: 'p1', toId: 'p2', releaseFrac: 0.5, type: 'spin' }],
      carrierId: null,
    };
    const migrated = parseScene(v3);
    expect(migrated.passes).toEqual([]);
    expect(migrated.elements.filter((e) => e.type === 'ball')).toHaveLength(0);
  });
});
