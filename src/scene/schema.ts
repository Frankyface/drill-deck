// Scene schema — pure module, NO react-native imports (Jest- and worklet-safe).
// Positions are meters in a fixed virtual pitch space so phones and tablets
// render identically: x across the pitch width, y down its length.
import { z } from 'zod';

export const PITCH_WIDTH_M = 70; // x axis (touchline to touchline)
export const PITCH_LENGTH_M = 100; // y axis (try line to try line)

export type Vec2 = { x: number; y: number };

export const PITCH_BACKGROUNDS = ['full', 'half', 'quarter', 'blank-grid'] as const;
export type PitchBackground = (typeof PITCH_BACKGROUNDS)[number];

export const TEAMS = ['attack', 'defence', 'neutral'] as const;
export type Team = (typeof TEAMS)[number];

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

const coneSchema = z.object({
  ...elementBase,
  type: z.literal('cone'),
});

const ballSchema = z.object({
  ...elementBase,
  type: z.literal('ball'),
});

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

const keyframeSchema = z.object({
  t: z.number().min(0).max(1), // normalized within the owning phase
  position: vec2Schema,
});
export type Keyframe = z.infer<typeof keyframeSchema>;

const trackSchema = z.object({
  elementId: z.string().min(1),
  keyframes: z.array(keyframeSchema).min(2),
});
export type Track = z.infer<typeof trackSchema>;

const phaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  durationMs: z.number().int().min(200).max(60_000),
  tracks: z.array(trackSchema),
});
export type Phase = z.infer<typeof phaseSchema>;

export const sceneV1Schema = z.object({
  version: z.literal(1),
  pitch: z.enum(PITCH_BACKGROUNDS),
  elements: z.array(sceneElementSchema),
});
export type SceneV1 = z.infer<typeof sceneV1Schema>;

export const sceneV2Schema = z.object({
  version: z.literal(2),
  pitch: z.enum(PITCH_BACKGROUNDS),
  elements: z.array(sceneElementSchema),
  phases: z.array(phaseSchema),
});
export type SceneV2 = z.infer<typeof sceneV2Schema>;

export const sceneSchema = z.discriminatedUnion('version', [sceneV1Schema, sceneV2Schema]);
export type Scene = z.infer<typeof sceneSchema>;

export const CURRENT_SCENE_VERSION = 2 as const;

/** Every scene read from the database goes through this: validate + migrate. */
export function parseScene(raw: unknown): SceneV2 {
  return migrateScene(sceneSchema.parse(raw));
}

/** v1 → v2 is purely additive: a v2 scene with no phases is a static diagram. */
export function migrateScene(scene: Scene): SceneV2 {
  switch (scene.version) {
    case 1:
      return { version: 2, pitch: scene.pitch, elements: scene.elements, phases: [] };
    case 2:
      return scene;
  }
}

export function createEmptyScene(pitch: PitchBackground = 'half'): SceneV2 {
  return { version: CURRENT_SCENE_VERSION, pitch, elements: [], phases: [] };
}
