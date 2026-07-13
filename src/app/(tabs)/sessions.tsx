import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSessions } from '../../features/sessions';
import { Button, EmptyState, LoadingState, Screen, Title } from '../../ui/core';
import { colors, font, radius, spacing } from '../../ui/theme';

export default function SessionsScreen() {
  const router = useRouter();
  const sessions = useSessions();

  return (
    <Screen testID="sessions-screen">
      <View style={styles.headerRow}>
        <Title>Sessions</Title>
        <Button label="+ New" onPress={() => router.push('/session/new')} testID="new-session" />
      </View>

      {sessions.isLoading ? (
        <LoadingState />
      ) : sessions.isError ? (
        <EmptyState title="Couldn't load sessions" hint={String(sessions.error)} />
      ) : (sessions.data ?? []).length === 0 ? (
        <EmptyState
          title="No sessions planned yet"
          hint="Create one and chain drills from the library into Tuesday's plan."
        />
      ) : (
        (sessions.data ?? []).map((session) => (
          <Pressable
            key={session.id}
            onPress={() => router.push(`/session/${session.id}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            testID={`session-card-${session.title}`}
          >
            <Text style={styles.cardTitle}>{session.title}</Text>
            <Text style={styles.cardMeta}>
              {session.team_name} · {session.session_date} · {session.drill_count} drill
              {session.drill_count === 1 ? '' : 's'} · {session.total_minutes} min
            </Text>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
});
