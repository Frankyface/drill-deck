// Pure drill filtering — client-side over the cached club library.
// At club scale (hundreds of drills, not millions) this is instant, works
// offline from the query cache, and is trivially unit-testable.
import type { DrillListItem } from './drills';

export type DrillFilters = {
  search: string;
  categoryId: string | null;
  skillFocusIds: string[];
  /** "I only have these": drill's equipment must be a subset of the selection. */
  equipmentIds: string[];
  /** "N players showed up tonight": N must fall inside the drill's min–max. */
  playerCount: number | null;
  intensity: string | null;
  level: string | null;
  minRating: number | null;
  showArchived: boolean;
};

export const EMPTY_FILTERS: DrillFilters = {
  search: '',
  categoryId: null,
  skillFocusIds: [],
  equipmentIds: [],
  playerCount: null,
  intensity: null,
  level: null,
  minRating: null,
  showArchived: false,
};

export function countActiveFilters(f: DrillFilters): number {
  let count = 0;
  if (f.categoryId) count += 1;
  if (f.skillFocusIds.length > 0) count += 1;
  if (f.equipmentIds.length > 0) count += 1;
  if (f.playerCount !== null) count += 1;
  if (f.intensity) count += 1;
  if (f.level) count += 1;
  if (f.minRating !== null) count += 1;
  if (f.showArchived) count += 1;
  return count;
}

export function filterDrills(drills: DrillListItem[], f: DrillFilters): DrillListItem[] {
  const needle = f.search.trim().toLowerCase();
  return drills.filter((drill) => {
    if (!f.showArchived && drill.archived_at !== null) return false;
    if (f.showArchived && drill.archived_at === null) return false;

    if (needle) {
      const haystack = `${drill.name} ${drill.description}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    if (f.categoryId && drill.category_id !== f.categoryId) return false;

    if (f.skillFocusIds.length > 0) {
      const hasAll = f.skillFocusIds.every((id) => drill.skill_focus_ids.includes(id));
      if (!hasAll) return false;
    }

    if (f.equipmentIds.length > 0) {
      const onlyUsesSelected = drill.equipment_ids.every((id) => f.equipmentIds.includes(id));
      if (!onlyUsesSelected) return false;
    }

    if (f.playerCount !== null) {
      if (f.playerCount < drill.min_players || f.playerCount > drill.max_players) return false;
    }

    if (f.intensity && drill.intensity !== f.intensity) return false;
    if (f.level && drill.level !== f.level && drill.level !== 'all') return false;

    if (f.minRating !== null) {
      if (drill.avg_rating === null || drill.avg_rating < f.minRating) return false;
    }

    return true;
  });
}

export type DrillSort = 'newest' | 'name' | 'rating';

export function sortDrills(drills: DrillListItem[], sort: DrillSort): DrillListItem[] {
  const copy = [...drills];
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'rating':
      return copy.sort((a, b) => (b.avg_rating ?? -1) - (a.avg_rating ?? -1));
    case 'newest':
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}
