import { useEffect } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { pxToMeters, snapToGrid } from '../scene/logic';
import type { SceneElement, Vec2 } from '../scene/schema';
import { TokenView } from './TokenView';

export type EditorMode = 'move' | 'arrow-run' | 'arrow-pass' | 'record';

/**
 * One draggable piece on the editor canvas.
 * Drag position lives in PIXELS (buttery), scene truth in METERS (portable):
 * conversion happens only on commit. Snap on drop, never during drag.
 */
export function DraggableToken({
  element,
  scale,
  size,
  mode,
  onCommitMove,
  onDelete,
  onRecordSample,
  onRecordEnd,
}: {
  element: SceneElement;
  scale: number;
  size: number;
  mode: EditorMode;
  onCommitMove: (elementId: string, meters: Vec2) => void;
  onDelete: (elementId: string) => void;
  onRecordSample: (elementId: string, meters: Vec2) => void;
  onRecordEnd: (elementId: string) => void;
}) {
  const tx = useSharedValue(element.position.x * scale);
  const ty = useSharedValue(element.position.y * scale);
  const start = useSharedValue({ x: 0, y: 0 });

  // Scene is the source of truth: re-sync when it (or the canvas size) changes.
  useEffect(() => {
    tx.value = element.position.x * scale;
    ty.value = element.position.y * scale;
  }, [element.position.x, element.position.y, scale, tx, ty]);

  const isRecording = mode === 'record';
  const isDraggable = mode === 'move' || mode === 'record';

  const commitMove = (pxX: number, pxY: number) => {
    onCommitMove(element.id, snapToGrid(pxToMeters({ x: pxX, y: pxY }, scale)));
  };

  const recordSample = (pxX: number, pxY: number) => {
    onRecordSample(element.id, pxToMeters({ x: pxX, y: pxY }, scale));
  };

  const pan = Gesture.Pan()
    .enabled(isDraggable)
    .onStart(() => {
      start.value = { x: tx.value, y: ty.value };
      if (isRecording) {
        runOnJS(recordSample)(tx.value, ty.value);
      }
    })
    .onUpdate((e) => {
      tx.value = start.value.x + e.translationX;
      ty.value = start.value.y + e.translationY;
      if (isRecording) {
        runOnJS(recordSample)(tx.value, ty.value);
      }
    })
    .onEnd(() => {
      if (isRecording) {
        runOnJS(onRecordEnd)(element.id);
        // recording resets the piece to its start spot (the drill's setup)
        tx.value = start.value.x;
        ty.value = start.value.y;
      } else {
        runOnJS(commitMove)(tx.value, ty.value);
      }
    });

  const longPress = Gesture.LongPress()
    .enabled(mode === 'move')
    .minDuration(500)
    .onStart(() => {
      runOnJS(onDelete)(element.id);
    });

  const gesture = Gesture.Exclusive(longPress, pan);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: -size / 2,
    top: -size / 2,
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style} testID={`token-${element.id}`}>
        <TokenView element={element} size={size} />
      </Animated.View>
    </GestureDetector>
  );
}
