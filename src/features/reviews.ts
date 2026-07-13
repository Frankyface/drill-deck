import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database.types';

export type ReviewRow = Tables<'reviews'>;

/** Review with team/date context — captured scoped, displayed club-wide. */
export type DrillReview = ReviewRow & {
  profiles: { display_name: string } | null;
  session_items: {
    drill_id: string;
    sessions: {
      session_date: string;
      teams: { name: string } | null;
    } | null;
  } | null;
};

export function useReviewsForDrill(drillId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', 'drill', drillId],
    enabled: !!drillId,
    queryFn: async (): Promise<DrillReview[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          '*, profiles(display_name), session_items!inner(drill_id, sessions(session_date, teams(name)))',
        )
        .eq('session_items.drill_id', drillId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(`Failed to load reviews: ${error.message}`);
      return data as unknown as DrillReview[];
    },
  });
}

/** The signed-in coach's reviews for a session (for the review flow). */
export function useMySessionReviews(sessionId: string | undefined, coachId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', 'session', sessionId, coachId],
    enabled: !!sessionId && !!coachId,
    queryFn: async (): Promise<ReviewRow[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, session_items!inner(session_id)')
        .eq('session_items.session_id', sessionId!)
        .eq('coach_id', coachId!);
      if (error) throw new Error(`Failed to load your reviews: ${error.message}`);
      return data as unknown as ReviewRow[];
    },
  });
}

export function useUpsertReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionItemId,
      coachId,
      rating,
      note,
    }: {
      sessionItemId: string;
      coachId: string;
      rating: number;
      note: string;
    }) => {
      const { error } = await supabase.from('reviews').upsert(
        {
          session_item_id: sessionItemId,
          coach_id: coachId,
          rating,
          note: note.trim(),
        },
        { onConflict: 'session_item_id,coach_id' },
      );
      if (error) throw new Error(`Could not save review: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['drills'] }); // rating stats changed
    },
  });
}
