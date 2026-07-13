import {
  buildTrackTimeline,
  sampleTimeline,
  samplesToKeyframes,
  simplifyPath,
  totalDurationMs,
} from '../playback';
import { createEmptyScene, type SceneV2 } from '../schema';

function sceneWithMovingPlayer(): SceneV2 {
  return {
    ...createEmptyScene(),
    elements: [
      { id: 'p1', type: 'player', team: 'attack', position: { x: 10, y: 10 } },
      { id: 'p2', type: 'player', team: 'defence', position: { x: 60, y: 90 } },
    ],
    phases: [
      {
        id: 'ph1',
        durationMs: 2000,
        tracks: [
          {
            elementId: 'p1',
            keyframes: [
              { t: 0, position: { x: 10, y: 10 } },
              { t: 1, position: { x: 30, y: 10 } },
            ],
          },
        ],
      },
      {
        id: 'ph2',
        durationMs: 2000,
        tracks: [
          {
            elementId: 'p1',
            keyframes: [
              { t: 0, position: { x: 30, y: 10 } },
              { t: 1, position: { x: 30, y: 40 } },
            ],
          },
        ],
      },
    ],
  };
}

describe('playback timeline', () => {
  test('totalDurationMs sums phases', () => {
    expect(totalDurationMs(sceneWithMovingPlayer())).toBe(4000);
    expect(totalDurationMs(createEmptyScene())).toBe(0);
  });

  test('moving element interpolates through both phases', () => {
    const timeline = buildTrackTimeline(sceneWithMovingPlayer(), 'p1');
    expect(sampleTimeline(timeline, 0)).toEqual({ x: 10, y: 10 });
    expect(sampleTimeline(timeline, 0.25)).toEqual({ x: 20, y: 10 }); // halfway through phase 1
    expect(sampleTimeline(timeline, 0.5)).toEqual({ x: 30, y: 10 }); // phase boundary
    expect(sampleTimeline(timeline, 0.75)).toEqual({ x: 30, y: 25 }); // halfway through phase 2
    expect(sampleTimeline(timeline, 1)).toEqual({ x: 30, y: 40 });
  });

  test('element with no tracks holds its position for the whole drill', () => {
    const timeline = buildTrackTimeline(sceneWithMovingPlayer(), 'p2');
    expect(sampleTimeline(timeline, 0)).toEqual({ x: 60, y: 90 });
    expect(sampleTimeline(timeline, 0.5)).toEqual({ x: 60, y: 90 });
    expect(sampleTimeline(timeline, 1)).toEqual({ x: 60, y: 90 });
  });

  test('element moving only in phase 1 holds (not drifts) through phase 2', () => {
    const scene = sceneWithMovingPlayer();
    const oneTrackScene: SceneV2 = {
      ...scene,
      phases: [scene.phases[0], { ...scene.phases[1], tracks: [] }],
    };
    const timeline = buildTrackTimeline(oneTrackScene, 'p1');
    expect(sampleTimeline(timeline, 0.5)).toEqual({ x: 30, y: 10 });
    expect(sampleTimeline(timeline, 0.75)).toEqual({ x: 30, y: 10 }); // held, no drift
    expect(sampleTimeline(timeline, 1)).toEqual({ x: 30, y: 10 });
  });

  test('sampling clamps outside [0,1]', () => {
    const timeline = buildTrackTimeline(sceneWithMovingPlayer(), 'p1');
    expect(sampleTimeline(timeline, -1)).toEqual({ x: 10, y: 10 });
    expect(sampleTimeline(timeline, 2)).toEqual({ x: 30, y: 40 });
  });
});

describe('path simplification', () => {
  test('collinear points collapse to endpoints', () => {
    const line = Array.from({ length: 50 }, (_, i) => ({ x: i, y: i * 0.5 }));
    const simplified = simplifyPath(line, 0.5);
    expect(simplified).toEqual([line[0], line[line.length - 1]]);
  });

  test('a corner is preserved', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(simplifyPath(path, 0.5)).toEqual(path);
  });

  test('samplesToKeyframes produces normalized, ordered keyframes', () => {
    const samples = Array.from({ length: 30 }, (_, i) => ({
      position: { x: i, y: i < 15 ? 0 : (i - 15) * 2 },
      atMs: 1000 + i * 33,
    }));
    const keyframes = samplesToKeyframes(samples);
    expect(keyframes.length).toBeGreaterThanOrEqual(2);
    expect(keyframes[0].t).toBe(0);
    expect(keyframes[keyframes.length - 1].t).toBe(1);
    for (let i = 1; i < keyframes.length; i += 1) {
      expect(keyframes[i].t).toBeGreaterThanOrEqual(keyframes[i - 1].t);
    }
  });

  test('too-short recordings return no keyframes', () => {
    expect(samplesToKeyframes([{ position: { x: 0, y: 0 }, atMs: 0 }])).toEqual([]);
  });
});
