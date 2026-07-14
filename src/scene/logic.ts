// Pure scene operations — immutable, no react-native imports.
import {
  PITCH_LENGTH_M,
  PITCH_WIDTH_M,
  type Scene,
  type SceneElement,
  type SceneV4,
  type Trigger,
  type Vec2,
} from './schema';

export const DEFAULT_GRID_M = 2.5;

/** px-per-meter scale for a canvas of the given width (pitch is width-fit). */
export function scaleForCanvas(canvasWidthPx: number): number {
  'worklet';
  return canvasWidthPx / PITCH_WIDTH_M;
}

export function metersToPx(pos: Vec2, scale: number): Vec2 {
  'worklet';
  return { x: pos.x * scale, y: pos.y * scale };
}

export function pxToMeters(px: Vec2, scale: number): Vec2 {
  'worklet';
  return { x: px.x / scale, y: px.y / scale };
}

export function clampToPitch(pos: Vec2): Vec2 {
  'worklet';
  return {
    x: Math.min(PITCH_WIDTH_M, Math.max(0, pos.x)),
    y: Math.min(PITCH_LENGTH_M, Math.max(0, pos.y)),
  };
}

export function snapToGrid(pos: Vec2, gridM: number = DEFAULT_GRID_M): Vec2 {
  'worklet';
  return clampToPitch({
    x: Math.round(pos.x / gridM) * gridM,
    y: Math.round(pos.y / gridM) * gridM,
  });
}

export function addElement(scene: SceneV4, element: SceneElement): SceneV4 {
  return { ...scene, elements: [...scene.elements, element] };
}

export function updateElement(
  scene: SceneV4,
  elementId: string,
  patch: Partial<Omit<SceneElement, 'id' | 'type'>>,
): SceneV4 {
  return {
    ...scene,
    elements: scene.elements.map((el) =>
      el.id === elementId ? ({ ...el, ...patch } as SceneElement) : el,
    ),
  };
}

export function moveElement(scene: SceneV4, elementId: string, position: Vec2): SceneV4 {
  return updateElement(scene, elementId, { position: clampToPitch(position) });
}

/**
 * Removing an element cleans up every reference to it:
 * - its own run is dropped;
 * - a removed BALL drops all passes tagged with its id;
 * - a removed PLAYER truncates EACH ball's chain independently from the first
 *   pass of that ball involving them (so other balls' passes survive), releases
 *   any ball they were holding (heldBy → null, back to ground), and downgrades
 *   `withPlayer` triggers pointing at them to `{kind:'start'}`.
 */
export function removeElement(scene: SceneV4, elementId: string): SceneV4 {
  const removed = scene.elements.find((el) => el.id === elementId);
  const isBall = removed?.type === 'ball';

  let passes = scene.passes;
  if (isBall) {
    passes = passes.filter((p) => p.ballId !== elementId);
  } else {
    // Truncate per ball: once a ball's chain hits the removed player, drop that
    // pass and every later pass OF THE SAME BALL, but leave other balls intact.
    const brokenBalls = new Set<string>();
    passes = passes.filter((p) => {
      if (brokenBalls.has(p.ballId)) return false;
      if (p.fromId === elementId || p.toId === elementId) {
        brokenBalls.add(p.ballId);
        return false;
      }
      return true;
    });
  }

  const elements = scene.elements
    .filter((el) => el.id !== elementId)
    .map((el) => (el.type === 'ball' && el.heldBy === elementId ? { ...el, heldBy: null } : el));

  const startTrigger: Trigger = { kind: 'start' };
  const runs = scene.runs
    .filter((run) => run.elementId !== elementId)
    .map((run) =>
      run.trigger && run.trigger.kind === 'withPlayer' && run.trigger.playerId === elementId
        ? { ...run, trigger: startTrigger }
        : run,
    );

  return { ...scene, elements, runs, passes };
}

export function setPitch(scene: SceneV4, pitch: SceneV4['pitch']): SceneV4 {
  return { ...scene, pitch };
}

// ---- Undo history: immutable snapshots, one per committed action ----

export type SceneHistory = {
  past: SceneV4[];
  present: SceneV4;
};

export const HISTORY_LIMIT = 25;

export function createHistory(scene: SceneV4): SceneHistory {
  return { past: [], present: scene };
}

export function commit(history: SceneHistory, next: SceneV4): SceneHistory {
  const past = [...history.past, history.present];
  return {
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    present: next,
  };
}

export function undo(history: SceneHistory): SceneHistory {
  if (history.past.length === 0) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
  };
}

export function canUndo(history: SceneHistory): boolean {
  return history.past.length > 0;
}

// ---- Misc ----

let idCounter = 0;
/** Unique-enough element ids without pulling in a uuid dependency. */
export function newElementId(): string {
  idCounter += 1;
  return `el-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function countByType(scene: Scene): Record<string, number> {
  return scene.elements.reduce<Record<string, number>>((acc, el) => {
    acc[el.type] = (acc[el.type] ?? 0) + 1;
    return acc;
  }, {});
}
