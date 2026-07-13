import {
  createEmptyScene,
  migrateScene,
  parseScene,
  type SceneV1,
} from '../schema';

describe('scene schema', () => {
  test('parses and migrates a v1 scene to v3 with no animation', () => {
    const v1: SceneV1 = {
      version: 1,
      pitch: 'half',
      elements: [
        { id: 'p1', type: 'player', team: 'attack', label: '10', position: { x: 35, y: 50 } },
        { id: 'c1', type: 'cone', position: { x: 10, y: 10 } },
      ],
    };
    const migrated = parseScene(v1);
    expect(migrated.version).toBe(3);
    expect(migrated.runs).toEqual([]);
    expect(migrated.passes).toEqual([]);
    expect(migrated.carrierId).toBeNull();
    expect(migrated.elements).toHaveLength(2);
  });

  test('migrates a v2 keyframe scene to v3 runs with a speed preset', () => {
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
    expect(migrated.version).toBe(3);
    expect(migrated.runs).toHaveLength(1);
    expect(migrated.runs[0].speed).toBe('run');
    expect(migrated.passes).toEqual([]);
  });

  test('migrateScene leaves a v3 scene untouched', () => {
    const scene = createEmptyScene('full');
    expect(migrateScene(scene)).toBe(scene);
  });

  test('rejects garbage that is not a scene', () => {
    expect(() => parseScene({ version: 99, elements: [] })).toThrow();
    expect(() => parseScene(null)).toThrow();
    expect(() =>
      parseScene({
        version: 3,
        pitch: 'volcano',
        elements: [],
        runs: [],
        passes: [],
        carrierId: null,
      }),
    ).toThrow();
    expect(() =>
      parseScene({
        version: 3,
        pitch: 'half',
        elements: [],
        runs: [],
        passes: [{ id: 'x', fromId: 'a', toId: 'b', releaseFrac: 2, type: 'spin' }],
        carrierId: null,
      }),
    ).toThrow();
  });

  test('rejects an arrow with fewer than 2 points', () => {
    expect(() =>
      parseScene({
        version: 3,
        pitch: 'half',
        elements: [
          { id: 'a1', type: 'arrow', style: 'run', position: { x: 0, y: 0 }, points: [{ x: 0, y: 0 }] },
        ],
        runs: [],
        passes: [],
        carrierId: null,
      }),
    ).toThrow();
  });

  test('round-trips through JSON (what Supabase JSONB storage does)', () => {
    const scene = createEmptyScene('quarter');
    const roundTripped = parseScene(JSON.parse(JSON.stringify(scene)));
    expect(roundTripped).toEqual(scene);
  });
});
