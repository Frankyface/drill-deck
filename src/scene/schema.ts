// Scene schema — pure module, NO react-native imports (Jest- and worklet-safe).
// Positions are meters in a fixed virtual pitch space so phones and tablets
// render identically: x across the pitch width, y down its length.
//
// v3 animation model (Real Rugby-inspired, professionalized): each player can
// have ONE run line with a real-world speed; the ball starts with a carrier
// and moves via PASS EVENTS placed along the carrier's run. Passes lead the
// receiver (interception solver in playback.ts).
import { z } from 'zod';

export const PITCH_WIDTH_M = 70; // x axis (touchline to touchline)
export const PITCH_LENGTH_M = 100; // y axis (try line to try line)

export type Vec2 = { x: number; y: number };

export const PITCH_BACKGROUNDS = ['full', 'half', 'quarter', 'blank-grid'] as const;
export type PitchBackground = (typeof PITCH_BACKGROUNDS)[number];

export const TEAMS = ['attack', 'defence', 'neutral'] as const;
export type Team = (typeof TEAMS)[number];

/** Real-world movement speeds, m/s (walk→sprint). */
export const RUN_SPEEDS = { walk: 1.4, jog: 3.0, run: 5.5, sprint: 8.0 } as const;
export type RunSpeed = keyof typeof RUN_SPEEDS;
export const RUN_SPEED_ORDER: RunSpeed[] = ['walk', 'jog', 'run', 'sprint'];

/** Pass flight speeds, m/s. Lofted flies slower but renders with an arc. */
export const PASS_SPEEDS = { pop: 9, spin: 16, lofted: 11 } as const;
export type PassType = keyof typeof PASS_SPEEDS;
export const PASS_TYPE_ORDER: PassType[] = ['pop', 'spin', 'lofted'];

const vec2Schema = z.object({ x: z.number(), y: z.number() });

const elementBase = {
  id: z.string().min(1),
  position: vec2Schema,
  rotation: z.number().optional(),
};

const playerSchema = z.object({
  ...elementBase,
  type: z.literal('player'),
  team: z.enum(TEAMS),
  label: z.string().max(4).optional(),
});

const coneSchema = z.object({ ...elementBase, type: z.literal('cone') });
const ballSchema = z.object({ ...elementBase, type: z.literal('ball') });

const arrowSchema = z.object({
  ...elementBase,
  type: z.literal('arrow'),
  points: z.array(vec2Schema).min(2),
  style: z.enum(['run', 'pass']),
});

const sceneElementSchema = z.discriminatedUnion('type', [
  playerSchema,
  coneSchema,
  ballSchema,
  arrowSchema,
]);

export type PlayerElement = z.infer<typeof playerSchema>;
export type ConeElement = z.infer<typeof coneSchema>;
export type BallElement = z.infer<typeof ballSchema>;
export type ArrowElement = z.infer<typeof arrowSchema>;
export type SceneElement = z.infer<typeof sceneElementSchema>;

/** One player's run line: a drawn path traversed at a constant real speed. */
const runSchema = z.object({
  elementId: z.string().min(1),
  points: z.array(vec2Schema).min(2),
  speed: z.enum(RUN_SPEED_ORDER as [RunSpeed, ...RunSpeed[]]),
});
export type Run = z.infer<typeof runSchema>;

/**
 * A pass event. Passes form a chain from the initial carrier: pass N's
 * `fromId` is whoever holds the ball after pass N-1. `releaseFrac` is how far
 * along the passer's OWN run the ball leaves their hands (0..1; static passers
 * release a beat after receiving).
 */
const passSchema = z.object({
  id: z.string().min(1),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  releaseFrac: z.number().min(0).max(1),
  type: z.enum(PASS_TYPE_ORDER as [PassType, ...PassType[]]),
});
export type Pass = z.infer<typeof passSchema>;

// ---- Versioned scenes ----

export const sceneV1Schema = z.object({
  version: z.literal(1),
  pitch: z.enum(PITCH_BACKGROUNDS),
  elements: z.array(sceneElementSchema),
});
export type SceneV1 = z.infer<typeof sceneV1Schema>;

/** v2 (phases/keyframes model) — superseded by v3; parsed only to migrate. */
const keyframeSchema = z.object({ t: z.number().min(0).max(1), position: vec2Schema });
const trackSchema = z.object({
  elementId: z.string().min(1),
  keyframes: z.array(keyframeSchema).min(2),
});
const phaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  durationMs: z.number().int().min(200).max(60_000),
  tracks: z.array(trackSchema),
});
export const sceneV2Schema = z.object({
  version: z.literal(2),
  pitch: z.enum(PITCH_BACKGROUNDS),
  elements: z.array(sceneElementSchema),
  phases: z.array(phaseSchema),
});
export type SceneV2 = z.infer<typeof sceneV2Schema>;

export const sceneV3Schema = z.object({
  version: z.literal(3),
  pitch: z.enum(PITCH_BACKGROUNDS),
  elements: z.array(sceneElementSchema),
  runs: z.array(runSchema),
  passes: z.array(passSchema),
  /** Player holding the ball at kickoff of the animation (null = no ball play). */
  carrierId: z.string().nullable(),
});
export type SceneV3 = z.infer<typeof sceneV3Schema>;

export const sceneSchema = z.discriminatedUnion('version', [
  sceneV1Schema,
  sceneV2Schema,
  sceneV3Schema,
]);
export type Scene = z.infer<typeof sceneSchema>;

export const CURRENT_SCENE_VERSION = 3 as const;

/** Every scene read from the database goes through this: validate + migrate. */
export function parseScene(raw: unknown): SceneV3 {
  return migrateScene(sceneSchema.parse(raw));
}

export function migrateScene(scene: Scene): SceneV3 {
  switch (scene.version) {
    case 1:
      return {
        version: 3,
        pitch: scene.pitch,
        elements: scene.elements,
        runs: [],
        passes: [],
        carrierId: null,
      };
    case 2: {
      // v2 keyframe tracks approximate to v3 runs: keep the drawn shape,
      // pick the nearest speed preset from the recorded pace. (No v2 scenes
      // were ever stored in production — this is belt-and-braces.)
      const totalMs = scene.phases.reduce((s, p) => s + p.durationMs, 0);
      const runs: Run[] = [];
      for (const el of scene.elements) {
        const points: Vec2[] = [];
        for (const phase of scene.phases) {
          const track = phase.tracks.find((t) => t.elementId === el.id);
          if (track) points.push(...track.keyframes.map((k) => k.position));
        }
        if (points.length >= 2 && totalMs > 0) {
          let length = 0;
          for (let i = 1; i < points.length; i += 1) {
            length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
          }
          const speedMs = length / (totalMs / 1000);
          const nearest = RUN_SPEED_ORDER.reduce((best, s) =>
            Math.abs(RUN_SPEEDS[s] - speedMs) < Math.abs(RUN_SPEEDS[best] - speedMs) ? s : best,
          );
          runs.push({ elementId: el.id, points, speed: nearest });
        }
      }
      return {
        version: 3,
        pitch: scene.pitch,
        elements: scene.elements,
        runs,
        passes: [],
        carrierId: null,
      };
    }
    case 3:
      return scene;
  }
}

export function createEmptyScene(pitch: PitchBackground = 'half'): SceneV3 {
  return {
    version: CURRENT_SCENE_VERSION,
    pitch,
    elements: [],
    runs: [],
    passes: [],
    carrierId: null,
  };
}
