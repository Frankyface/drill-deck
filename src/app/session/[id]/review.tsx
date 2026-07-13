import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useMySessionReviews, useUpsertReview } from '../../../features/reviews';
import { useSession, withPhaseHeaders } from '../../../features/sessions';
import { useAuth } from '../../../providers/AuthProvider';
import {
  Button,
  Card,
  ErrorText,
  LoadingState,
  Muted,
  Screen,
  TextField,
  Title,
} from '../../../ui/core';
import { StarRating } from '../../../ui/pickers';
import { colors, font } from '../../../ui/theme';

type DraftReview = { rating: number; note: string };

export default function SessionReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const session = useSession(id);
  const myReviews = useMySessionReviews(id, profile?.id);
  const upsert = useUpsertReview();

  const [drafts, setDrafts] = useState<Record<string, DraftReview>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  // Pre-fill from existing reviews (editing a past review just works).
  useEffect(() => {
    if (!myReviews.data) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const review of myReviews.data) {
        if (!next[review.session_item_id]) {
          next[review.session_item_id] = { rating: review.rating, note: review.note };
        }
      }
      return next;
    });
  }, [myReviews.data]);

  if (session.isLoading || !session.data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const items = withPhaseHeaders(session.data.session_items);

  const setDraft = (itemId: string, patch: Partial<DraftReview>) =>
    setDrafts((prev) => ({
      ...prev,
      [itemId]: { rating: prev[itemId]?.rating ?? 0, note: prev[itemId]?.note ?? '', ...patch },
    }));

  const saveAll = async () => {
    setError(null);
    if (!profile) return;
    const rated = Object.entries(drafts).filter(([, d]) => d.rating > 0);
    if (rated.length === 0) {
      setError('Rate at least one drill (tap the stars).');
      return;
    }
    try {
      for (const [sessionItemId, draft] of rated) {
        await upsert.mutateAsync({
          sessionItemId,
          coachId: profile.id,
          rating: draft.rating,
          note: draft.note,
        });
      }
      setSavedCount(rated.length);
      setTimeout(() => router.back(), 900);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <Screen testID="session-review-screen">
      <Title>How did it go?</Title>
      <Muted>
        {session.data.teams?.name} · {session.data.session_date}. Skip any drill you don&apos;t want
        to rate.
      </Muted>

      {items.map((item) => (
        <Card key={item.id} testID={`review-item-${item.drills?.name}`}>
          <Text style={{ fontSize: font.md, fontWeight: '700', color: colors.text }}>
            {item.drills?.name ?? 'Drill'}
          </Text>
          <StarRating
            value={drafts[item.id]?.rating ?? 0}
            onChange={(rating) => setDraft(item.id, { rating })}
            testID={`rate-${item.drills?.name}`}
          />
          <TextField
            label="Notes (optional)"
            value={drafts[item.id]?.note ?? ''}
            onChangeText={(note) => setDraft(item.id, { note })}
            placeholder="What worked, what to change…"
            multiline
          />
        </Card>
      ))}

      <ErrorText>{error}</ErrorText>
      {savedCount !== null ? (
        <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'center' }}>
          Saved {savedCount} review{savedCount === 1 ? '' : 's'} ✓
        </Text>
      ) : null}
      <Button label="Save reviews" onPress={saveAll} loading={upsert.isPending} testID="save-reviews" />
    </Screen>
  );
}
