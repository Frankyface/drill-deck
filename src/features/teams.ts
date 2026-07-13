import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database.types';

export type Team = Tables<'teams'>;
export type TeamRole = 'admin' | 'coach';

export type MyTeam = Team & { my_role: TeamRole };

/** Teams the signed-in coach belongs to (RLS only returns memberships). */
export function useMyTeams(profileId: string | undefined) {
  return useQuery({
    queryKey: ['teams', 'mine', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<MyTeam[]> => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, team_coaches!inner(profile_id, role)')
        .eq('team_coaches.profile_id', profileId!)
        .order('name');
      if (error) throw new Error(`Failed to load your teams: ${error.message}`);
      return (data as (Team & { team_coaches: { role: string }[] })[]).map((row) => {
        const { team_coaches, ...team } = row;
        return { ...team, my_role: (team_coaches[0]?.role ?? 'coach') as TeamRole };
      });
    },
  });
}

export type TeamMember = {
  profile_id: string;
  role: string;
  profiles: { display_name: string } | null;
};

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['teams', teamId, 'members'],
    enabled: !!teamId,
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('team_coaches')
        .select('profile_id, role, profiles(display_name)')
        .eq('team_id', teamId!);
      if (error) throw new Error(`Failed to load members: ${error.message}`);
      return data as unknown as TeamMember[];
    },
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<string> => {
      const { data, error } = await supabase.rpc('create_team', { team_name: name });
      if (error) throw new Error(`Could not create team: ${error.message}`);
      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useJoinTeamByCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { data, error } = await supabase.rpc('join_team_by_code', { code });
      if (error) {
        throw new Error(
          error.message.includes('INVALID_TEAM_CODE')
            ? 'No team found with that code — double-check it.'
            : error.message,
        );
      }
      return data as string; // team name
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useLeaveTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, profileId }: { teamId: string; profileId: string }) => {
      const { error } = await supabase
        .from('team_coaches')
        .delete()
        .eq('team_id', teamId)
        .eq('profile_id', profileId);
      if (error) throw new Error(`Could not leave team: ${error.message}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useRegenerateTeamCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('regenerate_team_code', { t: teamId });
      if (error) throw new Error(`Could not regenerate code: ${error.message}`);
      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useUpdateDisplayName() {
  return useMutation({
    mutationFn: async ({ profileId, displayName }: { profileId: string; displayName: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', profileId);
      if (error) throw new Error(`Could not update your name: ${error.message}`);
    },
  });
}
