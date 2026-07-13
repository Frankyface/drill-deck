import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database.types';

export type DrillRow = Tables<'drills'>;
export type DrillVisibility = 'private' | 'team' | 'public';

export type DrillListItem = DrillRow & {
  category_name: string;
  skill_focus_ids: string[];
  equipment_ids: string[];
  shared_team_ids: string[];
  avg_rating: number | null;
  review_count: number;
  team_count: number;
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
  visibility: DrillVisibility;
  /** Teams this drill is shared to (only meaningful when visibility='team'). */
  sharedTeamIds: string[];
};

export function validateDrillInput(input: DrillInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = 'Give the drill a name';
  if (!input.categoryId) errors.categoryId = 'Pick a category';
  if (input.minPlayers < 1) errors.players = 'Minimum players must be at least 1';
  if (input.maxPlayers < input.minPlayers) errors.players = 'Max players must be ≥ min';
  if (input.durationMinutes < 1) errors.duration = 'Duration must be at least 1 minute';
  if (input.visibility === 'team' && input.sharedTeamIds.length === 0) {
    errors.visibility = 'Pick at least one team to share with (or choose Private)';
  }
  return errors;
}

type DrillQueryRow = DrillRow & {
  drill_categories: { name: string } | null;
  drill_skill_focuses: { skill_focus_id: string }[];
  drill_equipment: { equipment_id: string }[];
  drill_teams: { team_id: string }[];
};

async function fetchDrills(): Promise<DrillListItem[]> {
  const [drillsRes, statsRes] = await Promise.all([
    supabase
      .from('drills')
      .select(
        '*, drill_categories(name), drill_skill_focuses(skill_focus_id), drill_equipment(equipment_id), drill_teams(team_id)',
      )
      .order('created_at', { ascending: false }),
    // Anonymized cross-team aggregate — server-side, since RLS-filtered rows
    // would silently average only the caller's own team's reviews.
    supabase.rpc('get_drill_rating_stats'),
  ]);
  if (drillsRes.error) throw new Error(`Failed to load drills: ${drillsRes.error.message}`);
  if (statsRes.error) throw new Error(`Failed to load ratings: ${statsRes.error.message}`);

  const stats = new Map((statsRes.data ?? []).map((s) => [s.drill_id, s] as const));

  return (drillsRes.data as DrillQueryRow[]).map((row) => {
    const { drill_categories, drill_skill_focuses, drill_equipment, drill_teams, ...drill } = row;
    const stat = stats.get(drill.id);
    return {
      ...drill,
      category_name: drill_categories?.name ?? 'Uncategorised',
      skill_focus_ids: drill_skill_focuses.map((r) => r.skill_focus_id),
      equipment_ids: drill_equipment.map((r) => r.equipment_id),
      shared_team_ids: drill_teams.map((r) => r.team_id),
      avg_rating: stat?.avg_rating ?? null,
      review_count: stat?.review_count ?? 0,
      team_count: stat?.team_count ?? 0,
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

async function saveTagsAndSharing(drillId: string, input: DrillInput): Promise<void> {
  const tags = await supabase.rpc('set_drill_tags', {
    d: drillId,
    skill_ids: input.skillFocusIds,
    equipment_ids: input.equipmentIds,
  });
  if (tags.error) throw new Error(`Could not save tags: ${tags.error.message}`);

  const sharing = await supabase.rpc('set_drill_sharing', {
    d: drillId,
    vis: input.visibility,
    team_ids: input.visibility === 'team' ? input.sharedTeamIds : [],
  });
  if (sharing.error) throw new Error(`Could not save sharing: ${sharing.error.message}`);
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
    mutationFn: async ({ input, userId }: { input: DrillInput; userId: string }) => {
      const { data, error } = await supabase
        .from('drills')
        .insert({ ...drillColumns(input), created_by: userId })
        .select('id')
        .single();
      if (error) throw new Error(`Could not save drill: ${error.message}`);
      await saveTagsAndSharing(data.id, input);
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
      await saveTagsAndSharing(drillId, input);
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

/**
 * "Copy to my drills": fork a visible drill (private copy owned by the caller,
 * including tags and the diagram). Members remix without touching originals.
 */
export function useForkDrill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ drill, userId }: { drill: DrillListItem; userId: string }) => {
      const { data, error } = await supabase
        .from('drills')
        .insert({
          name: `${drill.name} (copy)`,
          description: drill.description,
          setup_instructions: drill.setup_instructions,
          coaching_points: drill.coaching_points,
          category_id: drill.category_id,
          min_players: drill.min_players,
          max_players: drill.max_players,
          space_needed: drill.space_needed,
          intensity: drill.intensity,
          level: drill.level,
          duration_minutes: drill.duration_minutes,
          created_by: userId,
          visibility: 'private',
        })
        .select('id')
        .single();
      if (error) throw new Error(`Could not copy drill: ${error.message}`);

      const tags = await supabase.rpc('set_drill_tags', {
        d: data.id,
        skill_ids: drill.skill_focus_ids,
        equipment_ids: drill.equipment_ids,
      });
      if (tags.error) throw new Error(`Copied, but tags failed: ${tags.error.message}`);

      // copy the first diagram if one is visible to the caller
      const { data: diagram } = await supabase
        .from('diagrams')
        .select('scene')
        .eq('drill_id', drill.id)
        .order('sort_order')
        .limit(1)
        .maybeSingle();
      if (diagram) {
        await supabase
          .from('diagrams')
          .insert({ drill_id: data.id, scene: diagram.scene, updated_by: userId });
      }
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drills'] });
      queryClient.invalidateQueries({ queryKey: ['diagrams'] });
    },
  });
}
