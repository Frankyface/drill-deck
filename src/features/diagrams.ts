import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import { parseScene, type SceneV4 } from '../scene/schema';

export type DiagramRecord = {
  id: string;
  drill_id: string;
  scene: SceneV4;
};

/** One diagram per drill in v1 (schema supports more via sort_order later). */
export function useDiagram(drillId: string | undefined) {
  return useQuery({
    queryKey: ['diagrams', drillId],
    enabled: !!drillId,
    queryFn: async (): Promise<DiagramRecord | null> => {
      const { data, error } = await supabase
        .from('diagrams')
        .select('id, drill_id, scene')
        .eq('drill_id', drillId!)
        .order('sort_order')
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`Failed to load diagram: ${error.message}`);
      if (!data) return null;
      // Validate + migrate at the boundary — never trust stored JSON blindly.
      // A corrupt scene degrades to "no diagram" instead of an error state.
      try {
        return { id: data.id, drill_id: data.drill_id, scene: parseScene(data.scene) };
      } catch {
        return null;
      }
    },
  });
}

export function useSaveDiagram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      drillId,
      diagramId,
      scene,
      userId,
    }: {
      drillId: string;
      diagramId: string | null;
      scene: SceneV4;
      userId: string;
    }) => {
      if (diagramId) {
        const { error } = await supabase
          .from('diagrams')
          .update({ scene, updated_by: userId })
          .eq('id', diagramId);
        if (error) throw new Error(`Could not save diagram: ${error.message}`);
        return diagramId;
      }
      const { data, error } = await supabase
        .from('diagrams')
        .insert({ drill_id: drillId, scene, updated_by: userId })
        .select('id')
        .single();
      if (error) throw new Error(`Could not save diagram: ${error.message}`);
      return data.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diagrams'] }),
  });
}

/** All scenes keyed by drill id — powers library card thumbnails in one query. */
export function useAllDiagramScenes() {
  return useQuery({
    queryKey: ['diagrams', 'all'],
    queryFn: async (): Promise<Record<string, SceneV4>> => {
      const { data, error } = await supabase
        .from('diagrams')
        .select('drill_id, scene')
        .order('sort_order');
      if (error) throw new Error(`Failed to load diagrams: ${error.message}`);
      const byDrill: Record<string, SceneV4> = {};
      for (const row of data) {
        if (byDrill[row.drill_id]) continue; // first diagram per drill wins
        try {
          byDrill[row.drill_id] = parseScene(row.scene);
        } catch {
          // a corrupt scene must never take the library down with it
        }
      }
      return byDrill;
    },
  });
}
