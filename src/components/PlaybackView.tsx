import { useMemo, useRef, useState } from 'react';
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
import Svg, { Line, Polyline } from 'react-native-svg';

import { scaleForCanvas } from '../scene/logic';
import {
  ballPositionAt,
  buildDrillTimeline,
  buildElementTimeline,
  sampleTimeline,
  type DrillTimeline,
} from '../scene/playback';
import type { BallElement, SceneElement, SceneV4, Team } from '../scene/schema';
import { Button, Chip } from '../ui/core';
import { colors, radius, spacing } from '../ui/theme';
import { canvasHeightFor } from './DiagramCanvas';
import { SvgPitch } from './SvgPitch';
import { TOKEN_SIZE, TokenView } from './TokenView';

const TEAM_TRAIL_COLORS: Record<Team, string> = {
  attack: '#fca5a5',
  defence: '#93c5fd',
  neutral: '#cbd5e1',
};

const PLAYBACK_SPEEDS = [
  { value: 0.5, label: '0.5×', id: '05' },
  { value: 1, label: '1×', id: '1' },
  { value: 2, label: '2×', id: '2' },
] as const;

function AnimatedPlaybackToken({
  element,
  scene,
  totalMs,
  startMs,
  scale,
  size,
  progress,
}: {
  element: SceneElement;
  scene: SceneV4;
  totalMs: number;
  startMs: number;
  scale: number;
  size: number;
  progress: SharedValue<number>;
}) {
  const timeline = useMemo(
    () => buildElementTimeline(scene, element.id, totalMs, startMs),
    [scene, element.id, totalMs, startMs],
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
  element,
  scene,
  timeline,
  totalMs,
  scale,
  size,
  progress,
}: {
  element: BallElement;
  scene: SceneV4;
  timeline: DrillTimeline;
  totalMs: number;
  scale: number;
  size: number;
  progress: SharedValue<number>;
}) {
  const ballId = element.id;
  const style = useAnimatedStyle(() => {
    const sample = ballPositionAt(scene, timeline, ballId, progress.value * totalMs);
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

  return (
    <Animated.View style={style}>
      <TokenView element={element} size={size} />
    </Animated.View>
  );
}

/** Faint run lines + pass flight lines drawn under the moving tokens as guides. */
function GhostTrails({
  scene,
  timeline,
  widthPx,
  heightPx,
  scale,
}: {
  scene: SceneV4;
  timeline: DrillTimeline;
  widthPx: number;
  heightPx: number;
  scale: number;
}) {
  return (
    <Svg width={widthPx} height={heightPx} style={StyleSheet.absoluteFill} pointerEvents="none">
      {scene.runs.map((run) => {
        const owner = scene.elements.find((e) => e.id === run.elementId);
        const team: Team = owner?.type === 'player' ? owner.team : 'neutral';
        return (
          <Polyline
            key={`ghost-run-${run.elementId}`}
            points={run.points.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
            fill="none"
            stroke={TEAM_TRAIL_COLORS[team]}
            strokeWidth={2}
            strokeDasharray="2 6"
            strokeLinecap="round"
            opacity={0.25}
          />
        );
      })}
      {timeline.flights.map((flight, idx) => (
        <Line
          key={`ghost-flight-${idx}`}
          x1={flight.releasePos.x * scale}
          y1={flight.releasePos.y * scale}
          x2={flight.arrivePos.x * scale}
          y2={flight.arrivePos.y * scale}
          stroke="#fde68a"
          strokeWidth={2}
          strokeDasharray="7 6"
          strokeLinecap="round"
          opacity={0.25}
        />
      ))}
    </Svg>
  );
}

/** Full drill playback: runners hit their lines at real speeds, passes lead the receiver. */
export function PlaybackView({ scene, widthPx }: { scene: SceneV4; widthPx: number }) {
  const scale = scaleForCanvas(widthPx);
  const heightPx = canvasHeightFor(widthPx);
  const size = Math.max(16, Math.min(TOKEN_SIZE, widthPx / 12));

  const timeline = useMemo(() => buildDrillTimeline(scene), [scene]);
  const durationMs = timeline.totalMs;

  const progress = useSharedValue(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  const [isLooping, setIsLooping] = useState(false);
  const loopRef = useRef(false);

  const balls = scene.elements.filter((el): el is BallElement => el.type === 'ball');
  const tokens = scene.elements.filter((el) => el.type !== 'arrow' && el.type !== 'ball');

  // Arm a linear tween from the current progress to the end at the current speed.
  const arm = () => {
    const remaining = (durationMs / speedRef.current) * (1 - progress.value);
    progress.value = withTiming(
      1,
      { duration: remaining <= 0 ? 1 : remaining, easing: Easing.linear },
      (done) => {
        if (done) runOnJS(onDone)();
      },
    );
  };

  // Completion runs on the JS thread (via runOnJS) — restart here, never inside
  // the worklet callback, so Loop never recurses on the UI thread.
  const onDone = () => {
    if (loopRef.current) {
      progress.value = 0;
      arm();
    } else {
      setIsPlaying(false);
    }
  };

  const play = () => {
    if (durationMs === 0) return;
    if (progress.value >= 1) progress.value = 0;
    setIsPlaying(true);
    arm();
  };

  const pause = () => {
    cancelAnimation(progress);
    setIsPlaying(false);
  };

  const replay = () => {
    cancelAnimation(progress);
    progress.value = 0;
    setIsPlaying(true);
    arm();
  };

  const changeSpeed = (value: number) => {
    speedRef.current = value;
    setSpeed(value);
    if (isPlaying) {
      cancelAnimation(progress);
      arm(); // re-arm the remaining stretch at the new speed
    }
  };

  const toggleLoop = () => {
    const next = !isLooping;
    loopRef.current = next;
    setIsLooping(next);
  };

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, progress.value * 100))}%`,
  }));

  return (
    <View testID="playback-view">
      <View style={{ width: widthPx, height: heightPx, borderRadius: 8, overflow: 'hidden' }}>
        <SvgPitch pitch={scene.pitch} widthPx={widthPx} />
        <GhostTrails
          scene={scene}
          timeline={timeline}
          widthPx={widthPx}
          heightPx={heightPx}
          scale={scale}
        />
        {tokens.map((el) => (
          <AnimatedPlaybackToken
            key={el.id}
            element={el}
            scene={scene}
            totalMs={durationMs}
            startMs={timeline.runStartMs[el.id] ?? 0}
            scale={scale}
            size={size}
            progress={progress}
          />
        ))}
        {balls.map((el) => (
          <AnimatedBall
            key={el.id}
            element={el}
            scene={scene}
            timeline={timeline}
            totalMs={durationMs}
            scale={scale}
            size={size * 0.9}
            progress={progress}
          />
        ))}
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, barStyle]} />
      </View>

      {durationMs === 0 ? (
        <Text style={styles.hint}>
          Nothing to animate yet — draw run lines in Animate mode and give someone the ball.
        </Text>
      ) : (
        <>
          <View style={styles.controls}>
            {isPlaying ? (
              <Button label="Pause" variant="secondary" onPress={pause} testID="playback-pause" />
            ) : (
              <Button label="Play" onPress={play} testID="playback-play" />
            )}
            <Button label="Replay" variant="secondary" onPress={replay} testID="playback-replay" />
          </View>
          <View style={styles.speedRow}>
            {PLAYBACK_SPEEDS.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                selected={speed === s.value}
                onPress={() => changeSpeed(s.value)}
                testID={`playback-speed-${s.id}`}
              />
            ))}
            <Chip
              label={isLooping ? '🔁 Loop on' : '🔁 Loop off'}
              selected={isLooping}
              onPress={toggleLoop}
              testID="playback-loop"
            />
          </View>
        </>
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
  speedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  hint: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
