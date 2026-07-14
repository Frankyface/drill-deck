// Scene schema — pure module, NO react-native imports (Jest- and worklet-safe).
// Positions are meters in a fixed virtual pitch space so phones and tablets
// render identically: x across the pitch width, y down its length.
//
// v4 animation model (Real Rugby-inspired, professionalized): each player can
// have ONE run line with a real-world speed AND a departure trigger; balls are
// explicit elements that either sit on the ground (heldBy=null) or are carried
// (heldBy=playerId). Passes belong to a specific ball, so multi-ball drills are
// legal. Runners scoop up ground balls their line crosses (pickups, playback.ts).
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

/** A ball element. `heldBy=null`/absent sits on the ground; a player id means carried. */
const ballSchema = z.object({
  ...elementBase,
  type: z.literal('ball'),
  heldBy: z.string().nullable().optional(),
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

/**
 * Departure trigger — when a runner leaves their mark. `start` is the whistle
 * (t=0) and the back-compat default when a run has no trigger.
 */
export const DELAY_MIN_MS = 500;
export const DELAY_MAX_MS = 10_000;
const triggerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('start') }),
  z.object({ kind: z.literal('delay'), ms: z.number().int().min(DELAY_MIN_MS).max(DELAY_MAX_MS) }),
  z.object({ kind: z.literal('onCatch') }),
  z.object({ kind: z.literal('afterPass') }),
  z.object({ kind: z.literal('withPlayer'), playerId: z.string().min(1) }),
]);
export type Trigger = z.infer<typeof triggerSchema>;

/**
 * One player's run line: a drawn path traversed with a smoothstep speed
 * profile (playback.ts). `trigger` decides when they set off (absent = start).
 */
const runSchema = z.object({
  elementId: z.string().min(1),
  points: z.array(vec2Schema).min(2),
  speed: z.enum(RUN_SPEED_ORDER as [RunSpeed, ...RunSpeed[]]),
  trigger: triggerSchema.optional(),
});
export type Run = z.infer<typeof runSchema>;

/**
 * A pass event, belonging to a specific ball (`ballId`). Passes form a chain
 * from that ball's initial holder: pass N's `fromId` is whoever holds the ball
 * after pass N-1. `releaseFrac` is how far along the passer's OWN run the ball
 * leaves their hands (0..1; static passers release a beat after receiving).
 */
const passSchema = z.object({
  id: z.string().min(1),
  ballId: z.string().min(1),
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

/** v2 (phases/keyframes model) — superseded; parsed only to migrate. */
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

// v3 (single-carrier model) — superseded by v4; parsed only to migrate. Its
// runs have no trigger and its passes no ballId; a single `carrierId` names the
// kickoff ball-holder.
const legacyV3RunSchema = z.object({
  elementId: z.string().min(1),
  points: z.array(vec2Schema).min(2),
  speed: z.enum(RUN_SPEED_ORDER as [RunSpeed, ...RunSpeed[]]),
});
const legacyV3PassSchema = z.object({
  id: z.string().min(1),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  releaseFrac: z.number().min(0).max(1),
  type: z.enum(PASS_TYPE_ORDER as [PassType, ...PassType[]]),
});
const sceneV3Schema = z.object({
  version: z.literal(3),
  pitch: z.enum(PITCH_BACKGROUNDS),
  elements: z.array(sceneElementSchema),
  runs: z.array(legacyV3RunSchema),
  passes: z.array(legacyV3PassSchema),
  carrierId: z.string().nullable(),
});
type SceneV3Legacy = z.infer<typeof sceneV3Schema>;

export const sceneV4Schema = z.object({
  version: z.literal(4),
  pitch: z.enum(PITCH_BACKGROUNDS),
  elements: z.array(sceneElementSchema),
  runs: z.array(runSchema),
  passes: z.array(passSchema),
});
export type SceneV4 = z.infer<typeof sceneV4Schema>;

export const sceneSchema = z.discriminatedUnion('version', [
  sceneV1Schema,
  sceneV2Schema,
  sceneV3Schema,
  sceneV4Schema,
]);
export type Scene = z.infer<typeof sceneSchema>;

export const CURRENT_SCENE_VERSION = 4 as const;

/** Every scene read from the database goes through this: validate + migrate. */
export function parseScene(raw: unknown): SceneV4 {
  return migrateScene(sceneSchema.parse(raw));
}

export function migrateScene(scene: Scene): SceneV4 {
  switch (scene.version) {
    case 1:
      return {
        version: 4,
        pitch: scene.pitch,
        elements: scene.elements,
        runs: [],
        passes: [],
      };
    case 2: {
      // v2 keyframe tracks approximate to runs: keep the drawn shape, pick the
      // nearest speed preset from the recorded pace. (No v2 scenes were ever
      // stored in production — this is belt-and-braces.)
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
        version: 4,
        pitch: scene.pitch,
        elements: scene.elements,
        runs,
        passes: [],
      };
    }
    case 3:
      return migrateV3ToV4(scene);
    case 4:
      return scene;
  }
}

const MIGRATED_BALL_ID = 'ball-migrated';

/**
 * v3 → v4: every run gains `trigger: {kind:'start'}`. If a `carrierId` held the
 * ball, the first ball element becomes `heldBy = carrierId` (one is synthesised
 * at the carrier's position when none exists), and every pass is tagged with
 * that ball's id. v3 passes with no carrier were invalid and are dropped.
 */
function migrateV3ToV4(scene: SceneV3Legacy): SceneV4 {
  const runs: Run[] = scene.runs.map((run) => ({ ...run, trigger: { kind: 'start' } }));

  if (!scene.carrierId) {
    return { version: 4, pitch: scene.pitch, elements: scene.elements, runs, passes: [] };
  }

  const carrierId = scene.carrierId;
  const firstBall = scene.elements.find((el): el is BallElement => el.type === 'ball');

  let elements: SceneElement[];
  let ballId: string;
  if (firstBall) {
    ballId = firstBall.id;
    elements = scene.elements.map((el) =>
      el.type === 'ball' && el.id === ballId ? { ...el, heldBy: carrierId } : el,
    );
  } else {
    ballId = MIGRATED_BALL_ID;
    const carrier = scene.elements.find((el) => el.id === carrierId);
    const position = carrier ? carrier.position : { x: 0, y: 0 };
    const synthetic: BallElement = { id: ballId, type: 'ball', position, heldBy: carrierId };
    elements = [...scene.elements, synthetic];
  }

  const passes: Pass[] = scene.passes.map((pass) => ({ ...pass, ballId }));
  return { version: 4, pitch: scene.pitch, elements, runs, passes };
}

export function createEmptyScene(pitch: PitchBackground = 'half'): SceneV4 {
  return {
    version: CURRENT_SCENE_VERSION,
    pitch,
    elements: [],
    runs: [],
    passes: [],
  };
}
