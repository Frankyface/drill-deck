import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database.types';

export type Team = Tables<'teams'>;

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase.from('teams').select('*').order('sort_order');
      if (error) throw new Error(`Failed to load teams: ${error.message}`);
      return data;
    },
  });
}

export function useMyTeamIds(profileId: string | undefined) {
  return useQuery({
    queryKey: ['team-coaches', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('team_coaches')
        .select('team_id')
        .eq('profile_id', profileId!);
      if (error) throw new Error(`Failed to load team membership: ${error.message}`);
      return data.map((r) => r.team_id);
    },
  });
}

export function useClubMembers() {
  return useQuery({
    queryKey: ['club-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, role, created_at')
        .order('display_name');
      if (error) throw new Error(`Failed to load members: ${error.message}`);
      return data;
    },
  });
}

export function useSetTeamMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teamId,
      profileId,
      join,
    }: {
      teamId: string;
      profileId: string;
      join: boolean;
    }) => {
      if (join) {
        const { error } = await supabase
          .from('team_coaches')
          .insert({ team_id: teamId, profile_id: profileId });
        if (error) throw new Error(`Could not join team: ${error.message}`);
      } else {
        const { error } = await supabase
          .from('team_coaches')
          .delete()
          .eq('team_id', teamId)
          .eq('profile_id', profileId);
        if (error) throw new Error(`Could not leave team: ${error.message}`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-coaches'] }),
  });
}

export function useAddTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, clubId, sortOrder }: { name: string; clubId: string; sortOrder: number }) => {
      const { error } = await supabase
        .from('teams')
        .insert({ name: name.trim(), club_id: clubId, sort_order: sortOrder });
      if (error) throw new Error(`Could not add team: ${error.message}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}
