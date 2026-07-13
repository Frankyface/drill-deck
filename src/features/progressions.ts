import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database.types';

export type ProgressionGroup = Tables<'progression_groups'> & {
  progression_items: {
    position: number;
    drill_id: string;
    drills: { id: string; name: string; archived_at: string | null } | null;
  }[];
};

export function useProgressionGroups() {
  return useQuery({
    queryKey: ['progressions'],
    queryFn: async (): Promise<ProgressionGroup[]> => {
      const { data, error } = await supabase
        .from('progression_groups')
        .select('*, progression_items(position, drill_id, drills(id, name, archived_at))')
        .order('created_at', { ascending: false });
      if (error) throw new Error(`Failed to load progressions: ${error.message}`);
      return (data as unknown as ProgressionGroup[]).map((group) => ({
        ...group,
        progression_items: [...group.progression_items].sort((a, b) => a.position - b.position),
      }));
    },
  });
}

/** Groups that contain the given drill, with the drill's position in each. */
export function useProgressionsForDrill(drillId: string | undefined) {
  const { data: groups, ...rest } = useProgressionGroups();
  const forDrill = drillId
    ? (groups ?? []).filter((g) => g.progression_items.some((i) => i.drill_id === drillId))
    : [];
  return { data: forDrill, allGroups: groups ?? [], ...rest };
}

export function useCreateProgressionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      userId,
      drillIds,
      teamId = null,
    }: {
      name: string;
      userId: string;
      drillIds: string[];
      /** null = private to the creator; set = visible to that team. */
      teamId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('progression_groups')
        .insert({ name: name.trim(), created_by: userId, team_id: teamId })
        .select('id')
        .single();
      if (error) throw new Error(`Could not create progression: ${error.message}`);
      if (drillIds.length > 0) {
        const { error: itemsError } = await supabase
          .from('progression_items')
          .insert(drillIds.map((drillId, idx) => ({ group_id: data.id, drill_id: drillId, position: idx })));
        if (itemsError) throw new Error(`Could not add drills: ${itemsError.message}`);
      }
      return data.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progressions'] }),
  });
}

export function useAddDrillToProgression() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      drillId,
      position,
    }: {
      groupId: string;
      drillId: string;
      position: number;
    }) => {
      const { error } = await supabase
        .from('progression_items')
        .insert({ group_id: groupId, drill_id: drillId, position });
      if (error) throw new Error(`Could not add drill to progression: ${error.message}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progressions'] }),
  });
}

export function useRemoveDrillFromProgression() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, drillId }: { groupId: string; drillId: string }) => {
      const { error } = await supabase
        .from('progression_items')
        .delete()
        .eq('group_id', groupId)
        .eq('drill_id', drillId);
      if (error) throw new Error(`Could not remove drill: ${error.message}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progressions'] }),
  });
}
