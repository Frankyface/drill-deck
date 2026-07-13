import { countActiveFilters, EMPTY_FILTERS, filterDrills, sortDrills } from '../drillFilters';
import type { DrillListItem } from '../drills';

function makeDrill(overrides: Partial<DrillListItem>): DrillListItem {
  return {
    id: 'd1',
    name: 'Test drill',
    description: '',
    setup_instructions: '',
    coaching_points: '',
    category_id: 'cat-passing',
    category_name: 'Passing',
    min_players: 4,
    max_players: 12,
    space_needed: 'any',
    intensity: 'moderate',
    level: 'all',
    duration_minutes: 10,
    created_by: 'coach-1',
    created_at: '2026-07-01T00:00:00Z',
    updated_by: null,
    updated_at: '2026-07-01T00:00:00Z',
    archived_at: null,
    skill_focus_ids: [],
    equipment_ids: [],
    shared_team_ids: [],
    visibility: 'private',
    avg_rating: null,
    review_count: 0,
    team_count: 0,
    ...overrides,
  };
}

const breakdown12 = makeDrill({
  id: 'a',
  name: 'Ruck city',
  description: 'breakdown work in tight channels',
  category_id: 'cat-breakdown',
  min_players: 8,
  max_players: 16,
  equipment_ids: ['cones'],
  skill_focus_ids: ['ruck-speed', 'jackal'],
  intensity: 'high',
});

const passing6 = makeDrill({
  id: 'b',
  name: 'Hands hands hands',
  description: 'flat catch-pass lines',
  category_id: 'cat-passing',
  min_players: 4,
  max_players: 8,
  equipment_ids: ['balls', 'cones'],
  skill_focus_ids: ['catch-pass'],
  created_at: '2026-07-05T00:00:00Z',
  avg_rating: 4.5,
  review_count: 3,
});

const archived = makeDrill({
  id: 'c',
  name: 'Old drill',
  archived_at: '2026-06-01T00:00:00Z',
});

const all = [breakdown12, passing6, archived];

describe('filterDrills', () => {
  test('hides archived drills by default, shows only archived when toggled', () => {
    expect(filterDrills(all, EMPTY_FILTERS).map((d) => d.id)).toEqual(['a', 'b']);
    expect(
      filterDrills(all, { ...EMPTY_FILTERS, showArchived: true }).map((d) => d.id),
    ).toEqual(['c']);
  });

  test('text search matches name AND description, case-insensitive', () => {
    expect(filterDrills(all, { ...EMPTY_FILTERS, search: 'RUCK' })).toHaveLength(1);
    expect(filterDrills(all, { ...EMPTY_FILTERS, search: 'catch-pass lines' })).toHaveLength(1);
    expect(filterDrills(all, { ...EMPTY_FILTERS, search: 'zorbing' })).toHaveLength(0);
  });

  test('category filter', () => {
    const result = filterDrills(all, { ...EMPTY_FILTERS, categoryId: 'cat-breakdown' });
    expect(result.map((d) => d.id)).toEqual(['a']);
  });

  test('player count must fall inside the drill range', () => {
    expect(filterDrills(all, { ...EMPTY_FILTERS, playerCount: 12 }).map((d) => d.id)).toEqual(['a']);
    expect(filterDrills(all, { ...EMPTY_FILTERS, playerCount: 6 }).map((d) => d.id)).toEqual(['b']);
    expect(filterDrills(all, { ...EMPTY_FILTERS, playerCount: 40 })).toHaveLength(0);
  });

  test('equipment filter is “I only have these”: drill equipment ⊆ selection', () => {
    // Only cones available: the breakdown drill (cones only) qualifies,
    // the passing drill (balls + cones) does not.
    expect(
      filterDrills(all, { ...EMPTY_FILTERS, equipmentIds: ['cones'] }).map((d) => d.id),
    ).toEqual(['a']);
    expect(
      filterDrills(all, { ...EMPTY_FILTERS, equipmentIds: ['cones', 'balls'] }).map((d) => d.id),
    ).toEqual(['a', 'b']);
  });

  test('skill focus filter requires ALL selected skills', () => {
    expect(
      filterDrills(all, { ...EMPTY_FILTERS, skillFocusIds: ['ruck-speed'] }).map((d) => d.id),
    ).toEqual(['a']);
    expect(
      filterDrills(all, { ...EMPTY_FILTERS, skillFocusIds: ['ruck-speed', 'catch-pass'] }),
    ).toHaveLength(0);
  });

  test('combined filters AND together (the “Tuesday night” lookup)', () => {
    const result = filterDrills(all, {
      ...EMPTY_FILTERS,
      search: 'ruck',
      playerCount: 12,
      equipmentIds: ['cones'],
      intensity: 'high',
    });
    expect(result.map((d) => d.id)).toEqual(['a']);
  });

  test('level filter: drills marked "all" always pass', () => {
    const result = filterDrills(all, { ...EMPTY_FILTERS, level: 'seniors' });
    expect(result.map((d) => d.id)).toEqual(['a', 'b']); // both are level 'all'
  });

  test('selecting level "all" as the filter restricts nothing (audit M1)', () => {
    const withMinis = [...all, makeDrill({ id: 'm', name: 'Minis fun', level: 'minis' })];
    const result = filterDrills(withMinis, { ...EMPTY_FILTERS, level: 'all' });
    expect(result.map((d) => d.id)).toEqual(['a', 'b', 'm']);
  });

  test('minRating filter excludes unrated drills', () => {
    expect(filterDrills(all, { ...EMPTY_FILTERS, minRating: 4 }).map((d) => d.id)).toEqual(['b']);
  });

  test('scope filters: mine / team shared / public', () => {
    const me = 'coach-1';
    const mixed = [
      makeDrill({ id: 'own', created_by: me, visibility: 'private' }),
      makeDrill({ id: 'shared', created_by: 'coach-2', visibility: 'team', shared_team_ids: ['t1'] }),
      makeDrill({ id: 'pub', created_by: 'coach-3', visibility: 'public' }),
      makeDrill({ id: 'own-pub', created_by: me, visibility: 'public' }),
    ];
    expect(filterDrills(mixed, { ...EMPTY_FILTERS, scope: 'mine' }, me).map((d) => d.id)).toEqual([
      'own',
      'own-pub',
    ]);
    expect(filterDrills(mixed, { ...EMPTY_FILTERS, scope: 'teams' }, me).map((d) => d.id)).toEqual([
      'shared',
    ]);
    expect(filterDrills(mixed, { ...EMPTY_FILTERS, scope: 'public' }, me).map((d) => d.id)).toEqual([
      'pub',
    ]);
    expect(filterDrills(mixed, { ...EMPTY_FILTERS, scope: 'all' }, me)).toHaveLength(4);
  });
});

describe('sortDrills', () => {
  const active = [breakdown12, passing6];
  test('newest first by default', () => {
    expect(sortDrills(active, 'newest').map((d) => d.id)).toEqual(['b', 'a']);
  });
  test('alphabetical', () => {
    expect(sortDrills(active, 'name').map((d) => d.id)).toEqual(['b', 'a']);
  });
  test('top rated first, unrated last', () => {
    expect(sortDrills(active, 'rating').map((d) => d.id)).toEqual(['b', 'a']);
  });
});

describe('countActiveFilters', () => {
  test('zero for empty, counts each dimension once', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(
      countActiveFilters({
        ...EMPTY_FILTERS,
        categoryId: 'x',
        skillFocusIds: ['a', 'b'],
        playerCount: 10,
      }),
    ).toBe(3);
  });
});
