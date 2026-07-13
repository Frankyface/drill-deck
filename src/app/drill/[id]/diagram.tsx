import { useLocalSearchParams, useRouter } from 'expo-router';

import { DiagramEditor } from '../../../components/DiagramEditor';
import { useDiagram, useSaveDiagram } from '../../../features/diagrams';
import { useAuth } from '../../../providers/AuthProvider';
import { createEmptyScene } from '../../../scene/schema';
import { LoadingState, Screen } from '../../../ui/core';

export default function DiagramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const diagram = useDiagram(id);
  const saveDiagram = useSaveDiagram();

  // Wait for the revalidated fetch too — the editor snapshots its starting
  // scene on mount, so it must never start from a stale hydrated cache.
  if (diagram.isLoading || diagram.isFetching) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen testID="diagram-screen">
      <DiagramEditor
        initialScene={diagram.data?.scene ?? createEmptyScene()}
        isSaving={saveDiagram.isPending}
        onSave={(scene) => {
          if (!id || !session) return;
          saveDiagram.mutate(
            {
              drillId: id,
              diagramId: diagram.data?.id ?? null,
              scene,
              userId: session.user.id,
            },
            { onSuccess: () => router.back() },
          );
        }}
      />
    </Screen>
  );
}
