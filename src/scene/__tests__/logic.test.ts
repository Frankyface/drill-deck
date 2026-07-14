import {
  addElement,
  canUndo,
  clampToPitch,
  commit,
  createHistory,
  HISTORY_LIMIT,
  metersToPx,
  moveElement,
  newElementId,
  pxToMeters,
  removeElement,
  snapToGrid,
  undo,
} from '../logic';
import { createEmptyScene, type PlayerElement, type SceneV4 } from '../schema';

const player = (id: string): PlayerElement => ({
  id,
  type: 'player',
  team: 'attack',
  position: { x: 35, y: 50 },
});

describe('coordinate conversion', () => {
  test('meters ↔ px round-trip at any scale', () => {
    const scale = 375 / 70; // phone width
    const meters = { x: 12.5, y: 88 };
    expect(pxToMeters(metersToPx(meters, scale), scale)).toEqual(meters);
  });

  test('clampToPitch keeps positions on the pitch', () => {
    expect(clampToPitch({ x: -5, y: 120 })).toEqual({ x: 0, y: 100 });
    expect(clampToPitch({ x: 35, y: 50 })).toEqual({ x: 35, y: 50 });
  });

  test('snapToGrid snaps to the requested grid and clamps', () => {
    expect(snapToGrid({ x: 11.2, y: 48.9 }, 2.5)).toEqual({ x: 10, y: 50 });
    expect(snapToGrid({ x: 69.9, y: 101 }, 2.5)).toEqual({ x: 70, y: 100 });
  });
});

describe('immutable scene operations', () => {
  test('addElement returns a new scene, original untouched', () => {
    const scene = createEmptyScene();
    const next = addElement(scene, player('p1'));
    expect(scene.elements).toHaveLength(0);
    expect(next.elements).toHaveLength(1);
  });

  test('moveElement clamps and does not mutate', () => {
    const scene = addElement(createEmptyScene(), player('p1'));
    const next = moveElement(scene, 'p1', { x: 999, y: -3 });
    expect(next.elements[0].position).toEqual({ x: 70, y: 0 });
    expect(scene.elements[0].position).toEqual({ x: 35, y: 50 });
  });

  test('removeElement drops the run and truncates the pass chain at the removed player', () => {
    let scene = addElement(createEmptyScene(), player('p1'));
    scene = addElement(scene, player('p2'));
    scene = addElement(scene, player('p3'));
    scene = addElement(scene, { id: 'ball1', type: 'ball', position: { x: 35, y: 50 }, heldBy: 'p1' });
    scene = {
      ...scene,
      runs: [
        {
          elementId: 'p2',
          points: [
            { x: 35, y: 50 },
            { x: 40, y: 40 },
          ],
          speed: 'run',
        },
      ],
      passes: [
        { id: 'a', ballId: 'ball1', fromId: 'p1', toId: 'p2', releaseFrac: 0.5, type: 'spin' },
        { id: 'b', ballId: 'ball1', fromId: 'p2', toId: 'p3', releaseFrac: 0.5, type: 'spin' },
      ],
    };
    const next = removeElement(scene, 'p2');
    expect(next.elements.map((e) => e.id)).toEqual(['p1', 'p3', 'ball1']);
    expect(next.runs).toHaveLength(0);
    // chain truncated from the first pass involving p2 (both of them here)
    expect(next.passes).toHaveLength(0);
  });
});

describe('undo history', () => {
  test('commit + undo restores the previous scene', () => {
    const initial = createEmptyScene();
    let history = createHistory(initial);
    history = commit(history, addElement(initial, player('p1')));
    expect(canUndo(history)).toBe(true);
    history = undo(history);
    expect(history.present).toEqual(initial);
    expect(canUndo(history)).toBe(false);
  });

  test('undo on empty history is a no-op', () => {
    const history = createHistory(createEmptyScene());
    expect(undo(history)).toBe(history);
  });

  test('history is capped at HISTORY_LIMIT snapshots', () => {
    let history = createHistory(createEmptyScene());
    for (let i = 0; i < HISTORY_LIMIT + 10; i += 1) {
      history = commit(history, addElement(history.present, player(`p${i}`)));
    }
    expect(history.past.length).toBe(HISTORY_LIMIT);
  });
});

describe('newElementId', () => {
  test('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newElementId()));
    expect(ids.size).toBe(200);
  });
});

describe('removeElement multi-ball independence (audit regression)', () => {
  test('removing a player only truncates the ball chains they are in', () => {
    const scene: SceneV4 = {
      ...createEmptyScene(),
      elements: [
        player('X'),
        player('R'),
        player('M'),
        player('N'),
        { id: 'b1', type: 'ball', position: { x: 0, y: 0 }, heldBy: 'X' },
        { id: 'b2', type: 'ball', position: { x: 20, y: 0 }, heldBy: 'M' },
      ],
      passes: [
        { id: 'p1', ballId: 'b1', fromId: 'X', toId: 'R', releaseFrac: 0.5, type: 'spin' },
        { id: 'p2', ballId: 'b2', fromId: 'M', toId: 'N', releaseFrac: 0.5, type: 'spin' },
      ],
    };
    // R is only in ball b1's chain; ball b2's independent pass must survive.
    expect(removeElement(scene, 'R').passes.map((p) => p.id)).toEqual(['p2']);
  });
});
