import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { useMyTeamIds, useTeams } from '../../features/club';
import { useCreateSession } from '../../features/sessions';
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
import { colors, spacing } from '../../ui/theme';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewSessionScreen() {
  const router = useRouter();
  const { profile, isAdmin } = useAuth();
  const teams = useTeams();
  const myTeamIds = useMyTeamIds(profile?.id);
  const createSession = useCreateSession();

  const [teamId, setTeamId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);

  // Coaches build sessions for their own teams; admin for any team.
  const eligibleTeams = (teams.data ?? []).filter(
    (team) => isAdmin || (myTeamIds.data ?? []).includes(team.id),
  );

  return (
    <Screen testID="new-session-screen">
      <SectionLabel>Which team?</SectionLabel>
      {eligibleTeams.length === 0 ? (
        <Muted>
          You haven&apos;t joined a team yet — go to the{' '}
          <Link href="/club">
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Club tab</Text>
          </Link>{' '}
          and tap your team first.
        </Muted>
      ) : (
        <ChipRow>
          {eligibleTeams.map((team) => (
            <Chip
              key={team.id}
              label={team.name}
              selected={teamId === team.id}
              onPress={() => setTeamId(team.id)}
              testID={`session-team-${team.name}`}
            />
          ))}
        </ChipRow>
      )}

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
          if (!teamId) return setError('Pick a team.');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate.trim()))
            return setError('Date must look like 2026-07-14.');
          if (!profile) return;
          createSession.mutate(
            {
              teamId,
              clubId: profile.club_id,
              userId: profile.id,
              title,
              sessionDate: sessionDate.trim(),
            },
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
