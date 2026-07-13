import { useQuery } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database.types';

export type Lookup = Pick<Tables<'drill_categories'>, 'id' | 'name' | 'sort_order'>;

async function fetchLookup(
  table: 'drill_categories' | 'skill_focuses' | 'equipment_types',
): Promise<Lookup[]> {
  const { data, error } = await supabase
    .from(table)
    .select('id, name, sort_order')
    .order('sort_order');
  if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
  return data;
}

export function useCategories() {
  return useQuery({ queryKey: ['lookups', 'categories'], queryFn: () => fetchLookup('drill_categories') });
}

export function useSkillFocuses() {
  return useQuery({ queryKey: ['lookups', 'skills'], queryFn: () => fetchLookup('skill_focuses') });
}

export function useEquipmentTypes() {
  return useQuery({ queryKey: ['lookups', 'equipment'], queryFn: () => fetchLookup('equipment_types') });
}
