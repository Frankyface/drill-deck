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

export type EditorMode = 'move' | 'arrow-run' | 'arrow-pass' | 'animate';

/**
 * One draggable piece on the editor canvas (move mode only — in animate mode
 * the canvas-level gestures own the touches for run-drawing and selection).
 * Drag position lives in PIXELS, scene truth in METERS; snap on drop.
 */
export function DraggableToken({
  element,
  scale,
  size,
  mode,
  selected = false,
  onCommitMove,
  onDelete,
}: {
  element: SceneElement;
  scale: number;
  size: number;
  mode: EditorMode;
  selected?: boolean;
  onCommitMove: (elementId: string, meters: Vec2) => void;
  onDelete: (elementId: string) => void;
}) {
  const tx = useSharedValue(element.position.x * scale);
  const ty = useSharedValue(element.position.y * scale);
  const start = useSharedValue({ x: 0, y: 0 });

  useEffect(() => {
    tx.value = element.position.x * scale;
    ty.value = element.position.y * scale;
  }, [element.position.x, element.position.y, scale, tx, ty]);

  const isDraggable = mode === 'move';

  const commitMove = (pxX: number, pxY: number) => {
    onCommitMove(element.id, snapToGrid(pxToMeters({ x: pxX, y: pxY }, scale)));
  };

  const pan = Gesture.Pan()
    .enabled(isDraggable)
    .onStart(() => {
      start.value = { x: tx.value, y: ty.value };
    })
    .onUpdate((e) => {
      tx.value = start.value.x + e.translationX;
      ty.value = start.value.y + e.translationY;
    })
    .onEnd(() => {
      runOnJS(commitMove)(tx.value, ty.value);
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
      <Animated.View style={style} testID={`token-${element.id}`} pointerEvents={isDraggable ? 'auto' : 'none'}>
        <TokenView element={element} size={size} selected={selected} />
      </Animated.View>
    </GestureDetector>
  );
}
