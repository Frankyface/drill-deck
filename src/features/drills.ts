import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database.types';

export type DrillRow = Tables<'drills'>;

export type DrillListItem = DrillRow & {
  category_name: string;
  skill_focus_ids: string[];
  equipment_ids: string[];
  avg_rating: number | null;
  review_count: number;
};

export type DrillInput = {
  name: string;
  description: string;
  setupInstructions: string;
  coachingPoints: string;
  categoryId: string;
  minPlayers: number;
  maxPlayers: number;
  spaceNeeded: string;
  intensity: string;
  level: string;
  durationMinutes: number;
  skillFocusIds: string[];
  equipmentIds: string[];
};

export function validateDrillInput(input: DrillInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = 'Give the drill a name';
  if (!input.categoryId) errors.categoryId = 'Pick a category';
  if (input.minPlayers < 1) errors.players = 'Minimum players must be at least 1';
  if (input.maxPlayers < input.minPlayers) errors.players = 'Max players must be ≥ min';
  if (input.durationMinutes < 1) errors.duration = 'Duration must be at least 1 minute';
  return errors;
}

type DrillQueryRow = DrillRow & {
  drill_categories: { name: string } | null;
  drill_skill_focuses: { skill_focus_id: string }[];
  drill_equipment: { equipment_id: string }[];
};

async function fetchDrills(): Promise<DrillListItem[]> {
  const [drillsRes, statsRes] = await Promise.all([
    supabase
      .from('drills')
      .select(
        '*, drill_categories(name), drill_skill_focuses(skill_focus_id), drill_equipment(equipment_id)',
      )
      .order('created_at', { ascending: false }),
    supabase.from('drill_rating_stats').select('*'),
  ]);
  if (drillsRes.error) throw new Error(`Failed to load drills: ${drillsRes.error.message}`);
  if (statsRes.error) throw new Error(`Failed to load ratings: ${statsRes.error.message}`);

  const stats = new Map(
    (statsRes.data ?? []).map((s) => [s.drill_id, s] as const),
  );

  return (drillsRes.data as DrillQueryRow[]).map((row) => {
    const { drill_categories, drill_skill_focuses, drill_equipment, ...drill } = row;
    const stat = drill.id ? stats.get(drill.id) : undefined;
    return {
      ...drill,
      category_name: drill_categories?.name ?? 'Uncategorised',
      skill_focus_ids: drill_skill_focuses.map((r) => r.skill_focus_id),
      equipment_ids: drill_equipment.map((r) => r.equipment_id),
      avg_rating: stat?.avg_rating ?? null,
      review_count: stat?.review_count ?? 0,
    };
  });
}

export function useDrills() {
  return useQuery({ queryKey: ['drills'], queryFn: fetchDrills });
}

export function useDrill(drillId: string | undefined) {
  const { data: drills, ...rest } = useDrills();
  return { data: drills?.find((d) => d.id === drillId), ...rest };
}

async function replaceDrillTags(drillId: string, input: DrillInput): Promise<void> {
  const [delSkills, delEquip] = await Promise.all([
    supabase.from('drill_skill_focuses').delete().eq('drill_id', drillId),
    supabase.from('drill_equipment').delete().eq('drill_id', drillId),
  ]);
  if (delSkills.error) throw new Error(delSkills.error.message);
  if (delEquip.error) throw new Error(delEquip.error.message);

  if (input.skillFocusIds.length > 0) {
    const { error } = await supabase
      .from('drill_skill_focuses')
      .insert(input.skillFocusIds.map((id) => ({ drill_id: drillId, skill_focus_id: id })));
    if (error) throw new Error(error.message);
  }
  if (input.equipmentIds.length > 0) {
    const { error } = await supabase
      .from('drill_equipment')
      .insert(input.equipmentIds.map((id) => ({ drill_id: drillId, equipment_id: id })));
    if (error) throw new Error(error.message);
  }
}

function drillColumns(input: DrillInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    setup_instructions: input.setupInstructions.trim(),
    coaching_points: input.coachingPoints.trim(),
    category_id: input.categoryId,
    min_players: input.minPlayers,
    max_players: input.maxPlayers,
    space_needed: input.spaceNeeded,
    intensity: input.intensity,
    level: input.level,
    duration_minutes: input.durationMinutes,
  };
}

export function useCreateDrill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      clubId,
      userId,
    }: {
      input: DrillInput;
      clubId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from('drills')
        .insert({ ...drillColumns(input), club_id: clubId, created_by: userId })
        .select('id')
        .single();
      if (error) throw new Error(`Could not save drill: ${error.message}`);
      await replaceDrillTags(data.id, input);
      return data.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drills'] }),
  });
}

export function useUpdateDrill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      drillId,
      input,
      userId,
    }: {
      drillId: string;
      input: DrillInput;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('drills')
        .update({ ...drillColumns(input), updated_by: userId })
        .eq('id', drillId);
      if (error) throw new Error(`Could not update drill: ${error.message}`);
      await replaceDrillTags(drillId, input);
      return drillId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drills'] }),
  });
}

export function useSetDrillArchived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ drillId, archived }: { drillId: string; archived: boolean }) => {
      const { error } = await supabase
        .from('drills')
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq('id', drillId);
      if (error) throw new Error(`Could not update drill: ${error.message}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drills'] }),
  });
}
