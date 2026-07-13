import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database.types';

export type SessionRow = Tables<'sessions'>;
export type SessionItemRow = Tables<'session_items'>;

export const SESSION_PHASES = ['warm-up', 'skills', 'game', 'conditioning', 'cool-down'] as const;
export type SessionPhase = (typeof SESSION_PHASES)[number];

export type SessionListItem = SessionRow & {
  team_name: string;
  drill_count: number;
  total_minutes: number;
};

export type SessionItemWithDrill = SessionItemRow & {
  drills: {
    id: string;
    name: string;
    category_id: string;
    intensity: string;
    min_players: number;
    max_players: number;
    coaching_points: string;
    description: string;
  } | null;
};

export type SessionDetail = SessionRow & {
  teams: { name: string } | null;
  session_items: SessionItemWithDrill[];
};

/** Pure: total planned minutes of a session. */
export function sessionTotalMinutes(items: Pick<SessionItemRow, 'duration_minutes'>[]): number {
  return items.reduce((sum, item) => sum + item.duration_minutes, 0);
}

/** Pure: ordered items annotated with a flag for rendering phase headers. */
export function withPhaseHeaders<T extends Pick<SessionItemRow, 'phase' | 'sort_order'>>(
  items: T[],
): (T & { showPhaseHeader: boolean })[] {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
  return sorted.map((item, idx) => ({
    ...item,
    showPhaseHeader:
      item.phase !== null && (idx === 0 || sorted[idx - 1].phase !== item.phase),
  }));
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async (): Promise<SessionListItem[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, teams(name), session_items(duration_minutes)')
        .order('session_date', { ascending: false });
      if (error) throw new Error(`Failed to load sessions: ${error.message}`);
      return data.map((row) => {
        const { teams, session_items, ...session } = row as SessionRow & {
          teams: { name: string } | null;
          session_items: { duration_minutes: number }[];
        };
        return {
          ...session,
          team_name: teams?.name ?? 'Unknown team',
          drill_count: session_items.length,
          total_minutes: sessionTotalMinutes(session_items),
        };
      });
    },
  });
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<SessionDetail> => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          '*, teams(name), session_items(*, drills(id, name, category_id, intensity, min_players, max_players, coaching_points, description))',
        )
        .eq('id', sessionId!)
        .single();
      if (error) throw new Error(`Failed to load session: ${error.message}`);
      return data as unknown as SessionDetail;
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teamId,
      clubId,
      userId,
      title,
      sessionDate,
    }: {
      teamId: string;
      clubId: string;
      userId: string;
      title: string;
      sessionDate: string;
    }) => {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          team_id: teamId,
          club_id: clubId,
          created_by: userId,
          title: title.trim() || 'Training session',
          session_date: sessionDate,
        })
        .select('id')
        .single();
      if (error) throw new Error(`Could not create session: ${error.message}`);
      return data.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw new Error(`Could not delete session: ${error.message}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useAddSessionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      drillId,
      sortOrder,
      durationMinutes,
      phase,
    }: {
      sessionId: string;
      drillId: string;
      sortOrder: number;
      durationMinutes: number;
      phase: SessionPhase | null;
    }) => {
      const { error } = await supabase.from('session_items').insert({
        session_id: sessionId,
        drill_id: drillId,
        sort_order: sortOrder,
        duration_minutes: durationMinutes,
        phase,
      });
      if (error) throw new Error(`Could not add drill to session: ${error.message}`);
    },
    onSuccess: (_data, vars) =>
      queryClient.invalidateQueries({ queryKey: ['sessions', vars.sessionId] }),
  });
}

export function useUpdateSessionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      sessionId: _sessionId,
      patch,
    }: {
      itemId: string;
      sessionId: string;
      patch: Partial<Pick<SessionItemRow, 'duration_minutes' | 'phase' | 'sort_order'>>;
    }) => {
      const { error } = await supabase.from('session_items').update(patch).eq('id', itemId);
      if (error) throw new Error(`Could not update session item: ${error.message}`);
    },
    onSuccess: (_data, vars) =>
      queryClient.invalidateQueries({ queryKey: ['sessions', vars.sessionId] }),
  });
}

export function useRemoveSessionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, sessionId: _sessionId }: { itemId: string; sessionId: string }) => {
      const { error } = await supabase.from('session_items').delete().eq('id', itemId);
      if (error) throw new Error(`Could not remove drill: ${error.message}`);
    },
    onSuccess: (_data, vars) =>
      queryClient.invalidateQueries({ queryKey: ['sessions', vars.sessionId] }),
  });
}

/** Persist a new order after in-app move up/down. */
export function useReorderSessionItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId: _sessionId,
      orderedItemIds,
    }: {
      sessionId: string;
      orderedItemIds: string[];
    }) => {
      for (let i = 0; i < orderedItemIds.length; i += 1) {
        const { error } = await supabase
          .from('session_items')
          .update({ sort_order: i })
          .eq('id', orderedItemIds[i]);
        if (error) throw new Error(`Could not reorder: ${error.message}`);
      }
    },
    onSuccess: (_data, vars) =>
      queryClient.invalidateQueries({ queryKey: ['sessions', vars.sessionId] }),
  });
}
