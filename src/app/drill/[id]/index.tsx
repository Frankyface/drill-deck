import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DiagramCanvas } from '../../../components/DiagramCanvas';
import { useDiagram } from '../../../features/diagrams';
import { useDrill } from '../../../features/drills';
import { useCategories, useEquipmentTypes, useSkillFocuses } from '../../../features/lookups';
import {
  useAddDrillToProgression,
  useCreateProgressionGroup,
  useProgressionsForDrill,
} from '../../../features/progressions';
import { useReviewsForDrill } from '../../../features/reviews';
import { useAuth } from '../../../providers/AuthProvider';
import {
  Button,
  Card,
  Chip,
  ChipRow,
  LoadingState,
  Muted,
  Screen,
  SectionLabel,
  TextField,
  Title,
} from '../../../ui/core';
import { StarRating } from '../../../ui/pickers';
import { colors, font, spacing } from '../../../ui/theme';

export default function DrillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile, isAdmin, session } = useAuth();
  const { data: drill, isLoading } = useDrill(id);
  const diagram = useDiagram(id);
  const reviews = useReviewsForDrill(id);
  const progressions = useProgressionsForDrill(id);
  const skills = useSkillFocuses();
  const equipment = useEquipmentTypes();
  const categories = useCategories();

  const createGroup = useCreateProgressionGroup();
  const addToGroup = useAddDrillToProgression();
  const [newGroupName, setNewGroupName] = useState('');
  const [canvasWidth, setCanvasWidth] = useState(0);

  if (isLoading || !drill) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const canEdit = isAdmin || drill.created_by === session?.user.id;
  const nameOf = (list: { id: string; name: string }[] | undefined, lookupId: string) =>
    list?.find((x) => x.id === lookupId)?.name ?? '…';

  const groupsWithoutThisDrill = progressions.allGroups.filter(
    (g) => !g.progression_items.some((i) => i.drill_id === drill.id),
  );

  return (
    <Screen testID="drill-detail-screen">
      <Title>{drill.name}</Title>
      <Muted>
        {nameOf(categories.data, drill.category_id)} · {drill.min_players}–{drill.max_players}{' '}
        players · {drill.duration_minutes} min · {drill.intensity} · {drill.level} ·{' '}
        {drill.space_needed}
      </Muted>
      {drill.avg_rating !== null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <StarRating value={Math.round(drill.avg_rating)} size={18} />
          <Muted>
            {drill.avg_rating.toFixed(1)} from {drill.review_count} review
            {drill.review_count === 1 ? '' : 's'}
          </Muted>
        </View>
      )}

      {/* Diagram */}
      <SectionLabel>Diagram</SectionLabel>
      <View onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}>
        {diagram.data && canvasWidth > 0 ? (
          <Pressable onPress={() => router.push(`/drill/${drill.id}/diagram`)}>
            <DiagramCanvas scene={diagram.data.scene} widthPx={canvasWidth} />
          </Pressable>
        ) : (
          <Muted>No diagram yet.</Muted>
        )}
      </View>
      <Button
        label={diagram.data ? 'Edit diagram / animate' : '+ Draw the diagram'}
        variant="secondary"
        onPress={() => router.push(`/drill/${drill.id}/diagram`)}
        testID="open-diagram"
      />

      {/* Content */}
      {drill.description ? (
        <>
          <SectionLabel>What happens</SectionLabel>
          <Text style={styles.body}>{drill.description}</Text>
        </>
      ) : null}
      {drill.setup_instructions ? (
        <>
          <SectionLabel>Setup</SectionLabel>
          <Text style={styles.body}>{drill.setup_instructions}</Text>
        </>
      ) : null}
      {drill.coaching_points ? (
        <>
          <SectionLabel>Coaching points</SectionLabel>
          <Text style={styles.body}>{drill.coaching_points}</Text>
        </>
      ) : null}

      {(drill.skill_focus_ids.length > 0 || drill.equipment_ids.length > 0) && (
        <>
          <SectionLabel>Tags</SectionLabel>
          <ChipRow>
            {drill.skill_focus_ids.map((sid) => (
              <Chip key={sid} label={nameOf(skills.data, sid)} />
            ))}
            {drill.equipment_ids.map((eid) => (
              <Chip key={eid} label={`🛠 ${nameOf(equipment.data, eid)}`} />
            ))}
          </ChipRow>
        </>
      )}

      {/* Progressions */}
      <SectionLabel>Progressions</SectionLabel>
      {progressions.data.length === 0 && <Muted>This drill isn&apos;t part of a progression yet.</Muted>}
      {progressions.data.map((group) => (
        <Card key={group.id} testID={`progression-${group.name}`}>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.progression_items.map((item, idx) => (
            <Pressable
              key={item.drill_id}
              disabled={item.drill_id === drill.id}
              onPress={() => router.push(`/drill/${item.drill_id}`)}
              style={styles.progressionRow}
            >
              <Text
                style={[
                  styles.progressionStep,
                  item.drill_id === drill.id && styles.progressionCurrent,
                ]}
              >
                {idx + 1}. {item.drills?.name ?? 'Unknown drill'}
                {item.drill_id === drill.id ? '  ← you are here' : ''}
              </Text>
            </Pressable>
          ))}
        </Card>
      ))}

      {groupsWithoutThisDrill.length > 0 && (
        <>
          <Muted>Add this drill as the next step of:</Muted>
          <ChipRow>
            {groupsWithoutThisDrill.map((group) => (
              <Chip
                key={group.id}
                label={`+ ${group.name}`}
                onPress={() =>
                  addToGroup.mutate({
                    groupId: group.id,
                    drillId: drill.id,
                    position: group.progression_items.length,
                  })
                }
              />
            ))}
          </ChipRow>
        </>
      )}
      <TextField
        label="Start a new progression from this drill"
        value={newGroupName}
        onChangeText={setNewGroupName}
        placeholder="e.g. Tackle technique pathway"
        testID="new-progression-input"
      />
      <Button
        label="Create progression"
        variant="secondary"
        loading={createGroup.isPending}
        onPress={() => {
          if (!newGroupName.trim() || !profile) return;
          createGroup.mutate(
            {
              name: newGroupName,
              clubId: profile.club_id,
              userId: profile.id,
              drillIds: [drill.id],
            },
            { onSuccess: () => setNewGroupName('') },
          );
        }}
        testID="create-progression"
      />

      {/* Reviews */}
      <SectionLabel>How it&apos;s gone at training</SectionLabel>
      {(reviews.data ?? []).length === 0 && (
        <Muted>No reviews yet — they&apos;re written after a session that used this drill.</Muted>
      )}
      {(reviews.data ?? []).map((review) => (
        <Card key={review.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <StarRating value={review.rating} size={16} />
            <Muted>
              {review.session_items?.sessions?.teams?.name ?? ''} ·{' '}
              {review.session_items?.sessions?.session_date ?? ''}
            </Muted>
          </View>
          {review.note ? <Text style={styles.body}>{review.note}</Text> : null}
          <Muted>— {review.profiles?.display_name ?? 'a coach'}</Muted>
        </Card>
      ))}

      {canEdit && (
        <Button
          label="Edit drill"
          onPress={() => router.push(`/drill/${drill.id}/edit`)}
          testID="edit-drill"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: font.md, color: colors.text, lineHeight: 22, marginBottom: spacing.xs },
  groupName: { fontSize: font.md, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  progressionRow: { paddingVertical: 4 },
  progressionStep: { fontSize: font.sm, color: colors.text },
  progressionCurrent: { fontWeight: '800', color: colors.primary },
});
