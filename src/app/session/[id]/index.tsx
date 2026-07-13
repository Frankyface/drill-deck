import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  sessionTotalMinutes,
  useSession,
  withPhaseHeaders,
  type SessionItemWithDrill,
} from '../../../features/sessions';
import {
  Button,
  Card,
  LoadingState,
  Muted,
  Screen,
  SectionLabel,
  Title,
} from '../../../ui/core';
import { colors, font, radius, spacing } from '../../../ui/theme';

/** Pitch-side run mode: big text, current + next drill, running clock. */
type RunItem = SessionItemWithDrill & { showPhaseHeader: boolean };

function RunMode({ items, onExit }: { items: RunItem[]; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [index]);

  useEffect(() => setElapsedSec(0), [index]);

  const current = items[index];
  const next = items[index + 1];
  const plannedSec = (current?.duration_minutes ?? 0) * 60;
  const isOver = elapsedSec > plannedSec && plannedSec > 0;
  const mmss = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  if (!current) {
    return (
      <View>
        <Title>Session complete 🎉</Title>
        <Button label="Back to plan" onPress={onExit} />
      </View>
    );
  }

  return (
    <View testID="run-mode">
      <Muted>
        Drill {index + 1} of {items.length}
        {current.phase ? ` · ${current.phase}` : ''}
      </Muted>
      <Text style={styles.runDrillName}>{current.drills?.name ?? 'Drill'}</Text>
      <Text style={[styles.runClock, isOver && { color: colors.danger }]}>
        {mmss(elapsedSec)} / {current.duration_minutes}:00
      </Text>
      {current.drills?.coaching_points ? (
        <Card>
          <SectionLabel>Coaching points</SectionLabel>
          <Text style={styles.runPoints}>{current.drills.coaching_points}</Text>
        </Card>
      ) : null}
      {next ? (
        <Muted>Next up: {next.drills?.name ?? 'Drill'} ({next.duration_minutes} min)</Muted>
      ) : (
        <Muted>Last drill of the night.</Muted>
      )}
      <View style={styles.runControls}>
        <Button
          label="◀ Previous"
          variant="secondary"
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        />
        <Button label="Next ▶" onPress={() => setIndex((i) => i + 1)} testID="run-next" />
      </View>
      <Button label="Exit run mode" variant="secondary" onPress={onExit} testID="exit-run" />
    </View>
  );
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession(id);
  const [isRunning, setIsRunning] = useState(false);

  const items = useMemo(
    () => withPhaseHeaders(session.data?.session_items ?? []),
    [session.data?.session_items],
  );

  if (session.isLoading || !session.data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (isRunning) {
    return (
      <Screen testID="session-run-screen">
        <RunMode items={items} onExit={() => setIsRunning(false)} />
      </Screen>
    );
  }

  const total = sessionTotalMinutes(session.data.session_items);

  return (
    <Screen testID="session-detail-screen">
      <Title>{session.data.title}</Title>
      <Muted>
        {session.data.teams?.name} · {session.data.session_date} · {items.length} drills ·{' '}
        {total} min
      </Muted>

      <View style={styles.actionRow}>
        <Button
          label="▶ Run session"
          onPress={() => setIsRunning(true)}
          disabled={items.length === 0}
          testID="run-session"
        />
        <Button
          label="Edit plan"
          variant="secondary"
          onPress={() => router.push(`/session/${session.data!.id}/edit`)}
          testID="edit-session"
        />
      </View>

      <SectionLabel>Plan</SectionLabel>
      {items.length === 0 && <Muted>Nothing planned yet — tap Edit plan.</Muted>}
      {items.map((item) => (
        <View key={item.id}>
          {item.showPhaseHeader && item.phase ? (
            <Text style={styles.phaseHeader}>{item.phase}</Text>
          ) : null}
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>{item.drills?.name ?? 'Drill'}</Text>
            <Text style={styles.itemMinutes}>{item.duration_minutes} min</Text>
          </View>
        </View>
      ))}

      <Button
        label="✍ Review how it went"
        variant="secondary"
        onPress={() => router.push(`/session/${session.data!.id}/review`)}
        disabled={items.length === 0}
        testID="review-session"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  phaseHeader: {
    fontSize: font.sm,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  itemName: { fontSize: font.md, fontWeight: '600', color: colors.text, flex: 1 },
  itemMinutes: { fontSize: font.sm, fontWeight: '700', color: colors.textMuted },
  runDrillName: { fontSize: 40, fontWeight: '900', color: colors.text, marginVertical: spacing.sm },
  runClock: { fontSize: 56, fontWeight: '900', color: colors.primary, marginBottom: spacing.md },
  runPoints: { fontSize: font.lg, color: colors.text, lineHeight: 28 },
  runControls: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
