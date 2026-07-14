import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useCreateSession } from '../../features/sessions';
import { useMyTeams } from '../../features/teams';
import { useAuth } from '../../providers/AuthProvider';
import {
  Button,
  Chip,
  ChipRow,
  ErrorText,
  Muted,
  Screen,
  SectionLabel,
  TextField,
} from '../../ui/core';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Who a new session is for: the coach alone, or one of their teams. */
type SessionOwner = { kind: 'personal' } | { kind: 'team'; teamId: string };

export default function NewSessionScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const myTeams = useMyTeams(profile?.id);
  const createSession = useCreateSession();

  const [owner, setOwner] = useState<SessionOwner | null>(null);
  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen testID="new-session-screen">
      <SectionLabel>Who&apos;s this session for?</SectionLabel>
      <ChipRow>
        <Chip
          label="Just me (personal)"
          selected={owner?.kind === 'personal'}
          onPress={() => setOwner({ kind: 'personal' })}
          testID="session-team-personal"
        />
        {(myTeams.data ?? []).map((team) => (
          <Chip
            key={team.id}
            label={team.name}
            selected={owner?.kind === 'team' && owner.teamId === team.id}
            onPress={() => setOwner({ kind: 'team', teamId: team.id })}
            testID={`session-team-${team.name}`}
          />
        ))}
      </ChipRow>

      <TextField
        label="Session title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Tuesday — breakdown focus"
        testID="session-title-input"
      />
      <TextField
        label="Date (YYYY-MM-DD)"
        value={sessionDate}
        onChangeText={setSessionDate}
        placeholder={todayIso()}
        autoCapitalize="none"
        testID="session-date-input"
      />
      <ErrorText>{error}</ErrorText>
      <Button
        label="Create & add drills"
        loading={createSession.isPending}
        onPress={() => {
          setError(null);
          if (!owner) return setError('Pick who this session is for.');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate.trim()))
            return setError('Date must look like 2026-07-14.');
          if (!profile) return;
          const teamId = owner.kind === 'team' ? owner.teamId : null;
          createSession.mutate(
            { teamId, userId: profile.id, title, sessionDate: sessionDate.trim() },
            {
              onSuccess: (sessionId) => router.replace(`/session/${sessionId}/edit`),
              onError: (e) => setError(String(e)),
            },
          );
        }}
        testID="create-session"
      />
      <Muted>Next you&apos;ll pick drills from the library and set timings.</Muted>
    </Screen>
  );
}
