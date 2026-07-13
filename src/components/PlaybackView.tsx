import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { scaleForCanvas } from '../scene/logic';
import { buildTrackTimeline, sampleTimeline, totalDurationMs } from '../scene/playback';
import type { SceneElement, SceneV2 } from '../scene/schema';
import { Button } from '../ui/core';
import { colors, radius, spacing } from '../ui/theme';
import { canvasHeightFor } from './DiagramCanvas';
import { SvgPitch } from './SvgPitch';
import { TOKEN_SIZE, TokenView } from './TokenView';

function AnimatedPlaybackToken({
  element,
  scene,
  scale,
  size,
  progress,
}: {
  element: SceneElement;
  scene: SceneV2;
  scale: number;
  size: number;
  progress: SharedValue<number>;
}) {
  const timeline = useMemo(() => buildTrackTimeline(scene, element.id), [scene, element.id]);

  const style = useAnimatedStyle(() => {
    const pos = sampleTimeline(timeline, progress.value);
    return {
      position: 'absolute' as const,
      left: -size / 2,
      top: -size / 2,
      transform: [
        { translateX: pos.x * scale },
        { translateY: pos.y * scale },
      ],
    };
  });

  return (
    <Animated.View style={style}>
      <TokenView element={element} size={size} />
    </Animated.View>
  );
}

/** Full drill playback: players run their lines, ball travels. */
export function PlaybackView({ scene, widthPx }: { scene: SceneV2; widthPx: number }) {
  const scale = scaleForCanvas(widthPx);
  const heightPx = canvasHeightFor(widthPx);
  const size = Math.max(16, Math.min(TOKEN_SIZE, widthPx / 12));
  const durationMs = totalDurationMs(scene);

  const progress = useSharedValue(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const tokens = scene.elements.filter((el) => el.type !== 'arrow');

  const finish = () => setIsPlaying(false);

  const play = () => {
    if (durationMs === 0) return;
    if (progress.value >= 1) progress.value = 0;
    setIsPlaying(true);
    const remaining = durationMs * (1 - progress.value);
    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear }, (done) => {
      if (done) runOnJS(finish)();
    });
  };

  const pause = () => {
    cancelAnimation(progress);
    setIsPlaying(false);
  };

  const replay = () => {
    cancelAnimation(progress);
    progress.value = 0;
    play();
  };

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, progress.value * 100))}%`,
  }));

  return (
    <View testID="playback-view">
      <View style={{ width: widthPx, height: heightPx, borderRadius: 8, overflow: 'hidden' }}>
        <SvgPitch pitch={scene.pitch} widthPx={widthPx} />
        <Svg width={widthPx} height={heightPx} style={StyleSheet.absoluteFill} />
        {tokens.map((el) => (
          <AnimatedPlaybackToken
            key={el.id}
            element={el}
            scene={scene}
            scale={scale}
            size={size}
            progress={progress}
          />
        ))}
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, barStyle]} />
      </View>

      {durationMs === 0 ? (
        <Text style={styles.hint}>No animation recorded yet — add phases and record runs in the editor.</Text>
      ) : (
        <View style={styles.controls}>
          {isPlaying ? (
            <Button label="Pause" variant="secondary" onPress={pause} testID="playback-pause" />
          ) : (
            <Button label="Play" onPress={play} testID="playback-play" />
          )}
          <Button label="Replay" variant="secondary" onPress={replay} testID="playback-replay" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: colors.primary },
  controls: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center', marginTop: spacing.sm },
  hint: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
