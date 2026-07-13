import { useRouter } from 'expo-router';
import { useState } from 'react';

import { DrillForm, EMPTY_DRILL_INPUT } from '../../components/DrillForm';
import { useCreateDrill } from '../../features/drills';
import { useAuth } from '../../providers/AuthProvider';
import { Screen } from '../../ui/core';

export default function NewDrillScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const createDrill = useCreateDrill();
  const [submitError, setSubmitError] = useState<string | undefined>();

  return (
    <Screen testID="new-drill-screen">
      <DrillForm
        initial={EMPTY_DRILL_INPUT}
        submitLabel="Save drill"
        isSubmitting={createDrill.isPending}
        submitError={submitError}
        onSubmit={(input) => {
          if (!profile || !session) return;
          setSubmitError(undefined);
          createDrill.mutate(
            { input, clubId: profile.club_id, userId: session.user.id },
            {
              onSuccess: (drillId) => router.replace(`/drill/${drillId}`),
              onError: (e) => setSubmitError(String(e)),
            },
          );
        }}
      />
    </Screen>
  );
}
