import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EMPTY_FILTERS, filterDrills } from '../../../features/drillFilters';
import { useDrills } from '../../../features/drills';
import {
  SESSION_PHASES,
  sessionTeamName,
  sessionTotalMinutes,
  useAddSessionItem,
  useRemoveSessionItem,
  useReorderSessionItems,
  useSession,
  useUpdateSessionItem,
  withPhaseHeaders,
  type SessionPhase,
} from '../../../features/sessions';
import {
  Button,
  Chip,
  ChipRow,
  LoadingState,
  Muted,
  Screen,
  SectionLabel,
  Title,
} from '../../../ui/core';
import { colors, font, radius, spacing } from '../../../ui/theme';

const PHASE_LABEL: Record<string, string> = {
  'warm-up': 'Warm-up',
  skills: 'Skills',
  game: 'Game',
  conditioning: 'Conditioning',
  'cool-down': 'Cool-down',
};

export default function SessionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession(id);
  const drills = useDrills();
  const addItem = useAddSessionItem();
  const updateItem = useUpdateSessionItem();
  const removeItem = useRemoveSessionItem();
  const reorder = useReorderSessionItems();

  const [drillSearch, setDrillSearch] = useState('');
  const [phaseForAdds, setPhaseForAdds] = useState<SessionPhase | null>('skills');

  const items = useMemo(
    () => withPhaseHeaders(session.data?.session_items ?? []),
    [session.data?.session_items],
  );

  const searchResults = useMemo(() => {
    if (!drillSearch.trim()) return (drills.data ?? []).slice(0, 8);
    return filterDrills(drills.data ?? [], { ...EMPTY_FILTERS, search: drillSearch }).slice(0, 8);
  }, [drills.data, drillSearch]);

  if (session.isLoading || !session.data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const totalMinutes = sessionTotalMinutes(session.data.session_items);

  const move = (index: number, direction: -1 | 1) => {
    const ordered = [...items];
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    reorder.mutate({ sessionId: session.data!.id, orderedItemIds: ordered.map((i) => i.id) });
  };

  const cyclePhase = (itemId: string, current: string | null) => {
    const seq: (SessionPhase | null)[] = [null, ...SESSION_PHASES];
    const next = seq[(seq.indexOf(current as SessionPhase | null) + 1) % seq.length];
    updateItem.mutate({ itemId, sessionId: session.data!.id, patch: { phase: next } });
  };

  return (
    <Screen testID="session-edit-screen">
      <Title>{session.data.title}</Title>
      <Muted>
        {sessionTeamName(session.data.team_id, session.data.teams?.name)} ·{' '}
        {session.data.session_date} · {totalMinutes} min planned
      </Muted>

      <SectionLabel>Session plan</SectionLabel>
      {items.length === 0 && <Muted>No drills yet — add them below.</Muted>}
      {items.map((item, index) => (
        <View key={item.id}>
          {item.showPhaseHeader && item.phase ? (
            <Text style={styles.phaseHeader}>{PHASE_LABEL[item.phase] ?? item.phase}</Text>
          ) : null}
          <View style={styles.itemRow} testID={`session-item-${item.drills?.name}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.drills?.name ?? 'Drill'}</Text>
              <View style={styles.itemControls}>
                <Pressable
                  onPress={() =>
                    updateItem.mutate({
                      itemId: item.id,
                      sessionId: session.data!.id,
                      patch: { duration_minutes: Math.max(1, item.duration_minutes - 5) },
                    })
                  }
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>−5</Text>
                </Pressable>
                <Text style={styles.minutes}>{item.duration_minutes} min</Text>
                <Pressable
                  onPress={() =>
                    updateItem.mutate({
                      itemId: item.id,
                      sessionId: session.data!.id,
                      patch: { duration_minutes: Math.min(120, item.duration_minutes + 5) },
                    })
                  }
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>+5</Text>
                </Pressable>
                <Pressable onPress={() => cyclePhase(item.id, item.phase)} style={styles.miniBtn}>
                  <Text style={styles.miniBtnText}>
                    {item.phase ? PHASE_LABEL[item.phase] : 'no phase'}
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.arrows}>
              <Pressable onPress={() => move(index, -1)} hitSlop={6}>
                <Text style={styles.arrow}>↑</Text>
              </Pressable>
              <Pressable onPress={() => move(index, 1)} hitSlop={6}>
                <Text style={styles.arrow}>↓</Text>
              </Pressable>
              <Pressable
                onPress={() => removeItem.mutate({ itemId: item.id, sessionId: session.data!.id })}
                hitSlop={6}
              >
                <Text style={[styles.arrow, { color: colors.danger }]}>✕</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}

      <SectionLabel>Add drills</SectionLabel>
      <Muted>New drills land in:</Muted>
      <ChipRow>
        {SESSION_PHASES.map((phase) => (
          <Chip
            key={phase}
            label={PHASE_LABEL[phase]}
            selected={phaseForAdds === phase}
            onPress={() => setPhaseForAdds(phaseForAdds === phase ? null : phase)}
          />
        ))}
      </ChipRow>
      <TextInput
        style={styles.search}
        placeholder="Search the library…"
        placeholderTextColor={colors.textMuted}
        value={drillSearch}
        onChangeText={setDrillSearch}
        testID="drill-search-input"
      />
      {searchResults.map((drill) => (
        <Pressable
          key={drill.id}
          onPress={() =>
            addItem.mutate({
              sessionId: session.data!.id,
              drillId: drill.id,
              sortOrder: items.length,
              durationMinutes: drill.duration_minutes,
              phase: phaseForAdds,
            })
          }
          style={styles.addRow}
          testID={`add-drill-${drill.name}`}
        >
          <Text style={styles.addRowText}>+ {drill.name}</Text>
          <Muted>
            {drill.duration_minutes} min · {drill.min_players}–{drill.max_players} players
          </Muted>
        </Pressable>
      ))}

      <Button
        label="Done — view session"
        onPress={() => router.replace(`/session/${session.data!.id}`)}
        testID="done-editing"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  itemName: { fontSize: font.md, fontWeight: '700', color: colors.text },
  itemControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  miniBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.bg,
  },
  miniBtnText: { fontSize: font.xs, fontWeight: '700', color: colors.text },
  minutes: { fontSize: font.sm, fontWeight: '700', color: colors.text },
  arrows: { alignItems: 'center', gap: spacing.sm, marginLeft: spacing.sm },
  arrow: { fontSize: font.lg, color: colors.primary, fontWeight: '700' },
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    fontSize: font.md,
    color: colors.text,
    marginVertical: spacing.sm,
  },
  addRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  addRowText: { fontSize: font.md, fontWeight: '600', color: colors.primary },
});
