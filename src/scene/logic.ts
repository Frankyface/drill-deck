// Pure scene operations — immutable, no react-native imports.
import {
  PITCH_LENGTH_M,
  PITCH_WIDTH_M,
  type Scene,
  type SceneElement,
  type SceneV2,
  type Vec2,
} from './schema';

export const DEFAULT_GRID_M = 2.5;

/** px-per-meter scale for a canvas of the given width (pitch is width-fit). */
export function scaleForCanvas(canvasWidthPx: number): number {
  return canvasWidthPx / PITCH_WIDTH_M;
}

export function metersToPx(pos: Vec2, scale: number): Vec2 {
  return { x: pos.x * scale, y: pos.y * scale };
}

export function pxToMeters(px: Vec2, scale: number): Vec2 {
  return { x: px.x / scale, y: px.y / scale };
}

export function clampToPitch(pos: Vec2): Vec2 {
  return {
    x: Math.min(PITCH_WIDTH_M, Math.max(0, pos.x)),
    y: Math.min(PITCH_LENGTH_M, Math.max(0, pos.y)),
  };
}

export function snapToGrid(pos: Vec2, gridM: number = DEFAULT_GRID_M): Vec2 {
  return clampToPitch({
    x: Math.round(pos.x / gridM) * gridM,
    y: Math.round(pos.y / gridM) * gridM,
  });
}

export function addElement(scene: SceneV2, element: SceneElement): SceneV2 {
  return { ...scene, elements: [...scene.elements, element] };
}

export function updateElement(
  scene: SceneV2,
  elementId: string,
  patch: Partial<Omit<SceneElement, 'id' | 'type'>>,
): SceneV2 {
  return {
    ...scene,
    elements: scene.elements.map((el) =>
      el.id === elementId ? ({ ...el, ...patch } as SceneElement) : el,
    ),
  };
}

export function moveElement(scene: SceneV2, elementId: string, position: Vec2): SceneV2 {
  return updateElement(scene, elementId, { position: clampToPitch(position) });
}

/** Removing an element also removes any animation tracks that referenced it. */
export function removeElement(scene: SceneV2, elementId: string): SceneV2 {
  return {
    ...scene,
    elements: scene.elements.filter((el) => el.id !== elementId),
    phases: scene.phases.map((phase) => ({
      ...phase,
      tracks: phase.tracks.filter((tr) => tr.elementId !== elementId),
    })),
  };
}

export function setPitch(scene: SceneV2, pitch: SceneV2['pitch']): SceneV2 {
  return { ...scene, pitch };
}

// ---- Undo history: immutable snapshots, one per committed action ----

export type SceneHistory = {
  past: SceneV2[];
  present: SceneV2;
};

export const HISTORY_LIMIT = 25;

export function createHistory(scene: SceneV2): SceneHistory {
  return { past: [], present: scene };
}

export function commit(history: SceneHistory, next: SceneV2): SceneHistory {
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
