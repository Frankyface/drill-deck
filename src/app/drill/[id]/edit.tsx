import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { DrillForm } from '../../../components/DrillForm';
import {
  useDrill,
  useSetDrillArchived,
  useUpdateDrill,
  type DrillInput,
} from '../../../features/drills';
import { useAuth } from '../../../providers/AuthProvider';
import { Button, LoadingState, Muted, Screen, SectionLabel } from '../../../ui/core';

export default function EditDrillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { data: drill, isLoading } = useDrill(id);
  const updateDrill = useUpdateDrill();
  const setArchived = useSetDrillArchived();
  const [submitError, setSubmitError] = useState<string | undefined>();

  if (isLoading || !drill) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const initial: DrillInput = {
    name: drill.name,
    description: drill.description,
    setupInstructions: drill.setup_instructions,
    coachingPoints: drill.coaching_points,
    categoryId: drill.category_id,
    minPlayers: drill.min_players,
    maxPlayers: drill.max_players,
    spaceNeeded: drill.space_needed,
    intensity: drill.intensity,
    level: drill.level,
    durationMinutes: drill.duration_minutes,
    skillFocusIds: drill.skill_focus_ids,
    equipmentIds: drill.equipment_ids,
  };

  const isArchived = drill.archived_at !== null;

  return (
    <Screen testID="edit-drill-screen">
      <DrillForm
        initial={initial}
        submitLabel="Save changes"
        isSubmitting={updateDrill.isPending}
        submitError={submitError}
        onSubmit={(input) => {
          if (!session) return;
          setSubmitError(undefined);
          updateDrill.mutate(
            { drillId: drill.id, input, userId: session.user.id },
            {
              onSuccess: () => router.back(),
              onError: (e) => setSubmitError(String(e)),
            },
          );
        }}
      />

      <SectionLabel>Danger zone</SectionLabel>
      <Muted>
        Archiving hides a drill from the library but keeps it (and its history) forever. Nothing is
        ever hard-deleted.
      </Muted>
      <Button
        label={isArchived ? 'Restore from archive' : 'Archive drill'}
        variant={isArchived ? 'secondary' : 'danger'}
        loading={setArchived.isPending}
        onPress={() =>
          setArchived.mutate(
            { drillId: drill.id, archived: !isArchived },
            { onSuccess: () => router.back() },
          )
        }
        testID="archive-drill"
      />
    </Screen>
  );
}
