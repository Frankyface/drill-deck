import {
  createEmptyScene,
  migrateScene,
  parseScene,
  type SceneV1,
} from '../schema';

describe('scene schema', () => {
  test('parses and migrates a v1 scene to v2 with empty phases', () => {
    const v1: SceneV1 = {
      version: 1,
      pitch: 'half',
      elements: [
        { id: 'p1', type: 'player', team: 'attack', label: '10', position: { x: 35, y: 50 } },
        { id: 'c1', type: 'cone', position: { x: 10, y: 10 } },
      ],
    };
    const migrated = parseScene(v1);
    expect(migrated.version).toBe(2);
    expect(migrated.phases).toEqual([]);
    expect(migrated.elements).toHaveLength(2);
  });

  test('migrateScene leaves a v2 scene untouched', () => {
    const scene = createEmptyScene('full');
    expect(migrateScene(scene)).toBe(scene);
  });

  test('rejects garbage that is not a scene', () => {
    expect(() => parseScene({ version: 99, elements: [] })).toThrow();
    expect(() => parseScene(null)).toThrow();
    expect(() => parseScene({ version: 2, pitch: 'volcano', elements: [], phases: [] })).toThrow();
  });

  test('rejects an arrow with fewer than 2 points', () => {
    expect(() =>
      parseScene({
        version: 2,
        pitch: 'half',
        elements: [
          { id: 'a1', type: 'arrow', style: 'run', position: { x: 0, y: 0 }, points: [{ x: 0, y: 0 }] },
        ],
        phases: [],
      }),
    ).toThrow();
  });

  test('round-trips through JSON (what Supabase JSONB storage does)', () => {
    const scene = createEmptyScene('quarter');
    const roundTripped = parseScene(JSON.parse(JSON.stringify(scene)));
    expect(roundTripped).toEqual(scene);
  });
});
