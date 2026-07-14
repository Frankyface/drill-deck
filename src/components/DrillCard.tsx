import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DrillListItem } from '../features/drills';
import type { SceneV4 } from '../scene/schema';
import { colors, font, radius, spacing } from '../ui/theme';
import { DiagramCanvas } from './DiagramCanvas';

const THUMB_WIDTH = 76;

export function DrillCard({
  drill,
  scene,
  onPress,
}: {
  drill: DrillListItem;
  scene?: SceneV4 | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      testID={`drill-card-${drill.name}`}
      accessibilityRole="button"
    >
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {drill.name}
          {drill.archived_at ? '  (archived)' : ''}
        </Text>
        <Text style={styles.meta}>
          {drill.category_name} · {drill.min_players}–{drill.max_players} players ·{' '}
          {drill.duration_minutes} min
        </Text>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{drill.intensity}</Text>
          <Text style={styles.badge}>{drill.level}</Text>
          {drill.review_count > 0 && drill.avg_rating !== null ? (
            <Text style={styles.rating}>
              ★ {drill.avg_rating.toFixed(1)} ({drill.review_count})
            </Text>
          ) : null}
        </View>
      </View>
      {scene ? (
        <View style={styles.thumb}>
          <DiagramCanvas scene={scene} widthPx={THUMB_WIDTH} tokenSize={10} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  body: { flex: 1, paddingRight: spacing.sm },
  name: { fontSize: font.md, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, alignItems: 'center' },
  badge: {
    fontSize: font.xs,
    color: colors.textMuted,
    backgroundColor: colors.chipBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  rating: { fontSize: font.xs, color: colors.warning, fontWeight: '700' },
  thumb: { borderRadius: radius.sm, overflow: 'hidden' },
});
