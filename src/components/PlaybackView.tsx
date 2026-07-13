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

import { scaleForCanvas } from '../scene/logic';
import {
  ballPositionAt,
  buildDrillTimeline,
  buildElementTimeline,
  sampleTimeline,
  type DrillTimeline,
} from '../scene/playback';
import type { SceneElement, SceneV3 } from '../scene/schema';
import { Button } from '../ui/core';
import { colors, radius, spacing } from '../ui/theme';
import { canvasHeightFor } from './DiagramCanvas';
import { SvgPitch } from './SvgPitch';
import { TOKEN_SIZE, TokenView } from './TokenView';

function AnimatedPlaybackToken({
  element,
  scene,
  totalMs,
  scale,
  size,
  progress,
}: {
  element: SceneElement;
  scene: SceneV3;
  totalMs: number;
  scale: number;
  size: number;
  progress: SharedValue<number>;
}) {
  const timeline = useMemo(
    () => buildElementTimeline(scene, element.id, totalMs),
    [scene, element.id, totalMs],
  );

  const style = useAnimatedStyle(() => {
    const pos = sampleTimeline(timeline, progress.value);
    return {
      position: 'absolute' as const,
      left: -size / 2,
      top: -size / 2,
      transform: [{ translateX: pos.x * scale }, { translateY: pos.y * scale }],
    };
  });

  return (
    <Animated.View style={style}>
      <TokenView element={element} size={size} />
    </Animated.View>
  );
}

function AnimatedBall({
  scene,
  timeline,
  totalMs,
  scale,
  size,
  progress,
}: {
  scene: SceneV3;
  timeline: DrillTimeline;
  totalMs: number;
  scale: number;
  size: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const sample = ballPositionAt(scene, timeline, progress.value * totalMs);
    // lofted passes climb: rendered as a vertical offset + gentle scale-up
    const lift = sample.arcOffsetM * scale;
    const grow = 1 + Math.min(0.6, sample.arcOffsetM / 6);
    return {
      position: 'absolute' as const,
      left: -size / 2,
      top: -size / 2,
      opacity: sample.visible ? 1 : 0,
      transform: [
        { translateX: sample.x * scale },
        { translateY: sample.y * scale - lift },
        { scale: grow },
      ],
    };
  });

  const ballElement: SceneElement = {
    id: '__ball__',
    type: 'ball',
    position: { x: 0, y: 0 },
  };

  return (
    <Animated.View style={style}>
      <TokenView element={ballElement} size={size} />
    </Animated.View>
  );
}

/** Full drill playback: runners hit their lines at real speeds, passes lead the receiver. */
export function PlaybackView({ scene, widthPx }: { scene: SceneV3; widthPx: number }) {
  const scale = scaleForCanvas(widthPx);
  const heightPx = canvasHeightFor(widthPx);
  const size = Math.max(16, Math.min(TOKEN_SIZE, widthPx / 12));

  const timeline = useMemo(() => buildDrillTimeline(scene), [scene]);
  const durationMs = timeline.totalMs;

  const progress = useSharedValue(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const hasBallPlay = scene.carrierId !== null;
  const tokens = scene.elements.filter(
    (el) => el.type !== 'arrow' && !(hasBallPlay && el.type === 'ball'),
  );

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
        {tokens.map((el) => (
          <AnimatedPlaybackToken
            key={el.id}
            element={el}
            scene={scene}
            totalMs={durationMs}
            scale={scale}
            size={size}
            progress={progress}
          />
        ))}
        {hasBallPlay && (
          <AnimatedBall
            scene={scene}
            timeline={timeline}
            totalMs={durationMs}
            scale={scale}
            size={size * 0.9}
            progress={progress}
          />
        )}
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, barStyle]} />
      </View>

      {durationMs === 0 ? (
        <Text style={styles.hint}>
          Nothing to animate yet — draw run lines in Animate mode and give someone the ball.
        </Text>
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
