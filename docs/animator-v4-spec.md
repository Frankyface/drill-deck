# Animator v4 — Engineering Spec (scene schema v4)

_Design: Fable, 2026-07-13. Implementation: Opus agents. This document is the
contract: implement exactly this; deviations require a decisions.md entry._

## Cam's asks
1. **Placeable balls with pickup** — put a ball on the pitch; when a runner's
   line passes over it during playback, they scoop it up and carry it.
2. **Hold their feet + departure triggers** — players can wait, and leave on
   different cues (whistle, delay, on catch, after passing, with a teammate).
3. **Overall animator upgrade** — acceleration/deceleration on runs, playback
   speed control + loop, ghost trails during playback, release-point markers.

## 1. Schema v4 (`src/scene/schema.ts`)

```ts
// BallElement gains a holder; a ball with heldBy=null sits on the ground.
BallElement = { id, type: 'ball', position: Vec2, heldBy?: string | null }

// Every run gains a departure trigger (default 'start' = back-compat).
Trigger =
  | { kind: 'start' }                          // go on the whistle (t=0)
  | { kind: 'delay'; ms: number }              // hold feet, leave after N ms (500..10000)
  | { kind: 'onCatch' }                        // leave the moment I catch a pass
  | { kind: 'afterPass' }                      // leave the moment I release my pass
  | { kind: 'withPlayer'; playerId: string }   // leave when that player leaves

Run = { elementId, points, speed, trigger?: Trigger }   // absent = {kind:'start'}

// Passes belong to a specific ball (multi-ball drills are now legal).
Pass = { id, ballId, fromId, toId, releaseFrac, type }

SceneV4 = { version: 4, pitch, elements, runs, passes }  // carrierId REMOVED
```

zod: discriminated union on `trigger.kind`; `delay.ms` int 500–10000.
`CURRENT_SCENE_VERSION = 4`. `createEmptyScene()` returns v4.

**Migrations** (`migrateScene`): v1/v2 → v4 as today's →v3 but with the v4
shape. v3 → v4: runs gain `trigger: {kind:'start'}`; if `carrierId` set, find
the first ball element and set `heldBy = carrierId` — if no ball element
exists, CREATE one (`id: 'ball-migrated'`, position = carrier's position,
heldBy = carrierId); every pass gains `ballId` = that ball's id. If v3 had
passes but no carrier (invalid), drop the passes.

## 2. Run kinematics with ramps (`src/scene/playback.ts`)

Runs keep `durationMs = pathLength / RUN_SPEEDS[speed] * 1000` (totals stay
stable) but distance follows a **smoothstep profile** — velocity 0 at both
ends, ~1.5× cruise mid-run:

```
u = clamp((tMs - startMs) / durationMs, 0, 1)
distance = pathLength * (3u² − 2u³)
```

- `positionOnRun(run, tMs, startMs)` — before startMs: run.points[0]. After
  end: last point. Otherwise walk the polyline to `distance`. **'worklet'.**
- `timeToReachDistance(run, d)` (JS-only): invert the smoothstep by bisection
  (≤40 iters, ε=1ms). Used for pickups and release times.
- Release time of a pass from a runner = `startMs + releaseFrac * durationMs`
  (time-fraction, unchanged semantics).

## 3. Timeline resolution (the core algorithm)

`buildDrillTimeline(scene)` returns
`{ totalMs, flights: FlightSegment[] (with ballId), pickups: {ballId, playerId, tMs}[],
   runStartMs: Record<elementId, number>, ballTimelines, warnings: string[] }`.

Fixed-point iteration (bounded, deterministic):

```
startMs[el] = 0 for 'start'; ms for 'delay'; null (unresolved) otherwise
repeat ≤ 8 rounds or until no startMs changed:
  1. PICKUPS — for each ground ball (heldBy == null, not yet picked up this
     round): among runners with resolved startMs whose PATH passes within
     PICKUP_RADIUS_M = 2.0 of ball.position, pickup time = startMs +
     timeToReachDistance(run, distanceAlongPath of first point within radius);
     earliest runner wins; a runner already holding a ball at that moment is
     skipped.
  2. PASS CHAINS — per ball, in pass-array order. Chain start: heldBy holder
     at t=0, else pickup {runner, tPickup}, else chain invalid (warning).
     Each pass: fromId must equal current holder (else warning + skip).
     naturalRelease = holder has run && startMs resolved
       ? startMs[holder] + releaseFrac * runDuration(holder)
       : lastEventMs + STATIC_RELEASE_DELAY_MS (450)
     If holder startMs unresolved → pass unresolved this round.
     releaseMs = max(naturalRelease, lastEventMs + MIN_CARRY_MS (200))
     Arrival: existing lead solver, receiver sampled with positionOnRun
     (+startMs; unresolved receiver = static at run start / element position).
     Holder := toId. Record FlightSegment {ballId, ...}.
  3. TRIGGERS — onCatch: earliest arriveMs of a resolved pass with
     toId == player (any ball). afterPass: earliest releaseMs with
     fromId == player. withPlayer: startMs[other] (if resolved).
after loop: any startMs still null → 0, push warning
  "⚠ {label} couldn't resolve its cue — starting at kickoff".
totalMs = max(run ends, last arrive, last pickup) + TAIL_MS
```

Cycles (A waits on B, B waits on A) therefore degrade gracefully to t=0 with
a warning — never an infinite loop, never a crash.

**Ball sampling** `ballPositionAt(scene, timeline, ballId, tMs)` **('worklet')**:
ground at ball.position → (pickup) carried by runner → flight segments (same
easing/arc as v3) → carried by receiver. Held-from-start balls skip the ground
phase. Multiple balls sample independently.

**Rendering timelines**: `buildElementTimeline` now SAMPLES the eased run at
~24 samples/run into the existing `{times, xs, ys}` breakpoint arrays
(sampleTimeline linear-interp is unchanged and stays 'worklet').

## 4. Editor upgrades (`DiagramEditor.tsx`)

- Palette regains **“+ Ball”** (ground ball at {x:35, y:54}).
- Animate-mode tap hit-tests players AND balls (ball radius 3m). Selected ball
  chips: **[Give to player →tap]** (sets heldBy; ball renders on that player),
  **[Drop on ground]** (heldBy=null at holder's position), **[✕ Remove]**.
- Selected player chips add a **trigger cycle chip**: ▶ Go → ⏱ wait 1s (cycles
  0.5/1/2/3s on further taps while 'delay') → 🫴 on catch → ➡ after pass →
  🤝 with… (enters tap-a-player pick mode) → back to ▶ Go.
- **＋ Pass** uses the ball whose chain-end holder is the selected player; if
  the selected player holds nothing, chip disabled with hint. Pass rows show
  “ball 2” tag when the scene has >1 ball.
- **Release markers**: small ring on the passer's run line at the releaseFrac
  point for each pass (SVG circle, editor only).
- Timeline warnings from buildDrillTimeline render as a Muted ⚠ list.
- `removeElement` (logic.ts): also clears `heldBy` references, drops passes of
  a removed ball, and downgrades `withPlayer` triggers pointing at the removed
  player to `{kind:'start'}`.

## 5. Playback upgrades (`PlaybackView.tsx`)

- One AnimatedBall PER ball element (ground → pickup → flights → carried).
- **Speed chips 0.5× / 1× / 2×** (scale withTiming duration) and **Loop
  toggle** (on finish, restart while enabled — use runOnJS state, no recursion
  inside the worklet callback).
- **Ghost trails**: run polylines + flight lines rendered at ~0.25 opacity
  under the tokens during playback.
- Every function transitively called from a worklet: 'worklet' directive or
  runOnJS — per docs/failed-approaches.md 2026-07-13 rule. This is a HARD gate.

## 6. Success criteria (Opus verifies ALL before returning)

1. `npx tsc --noEmit` exit 0; `npx jest` ALL suites green (existing 49 tests
   updated to v4 API where fixtures used v3 shapes — semantics preserved).
2. NEW unit tests (≥15) proving: smoothstep math (v=0 at ends: position at
   1ms ≈ start; duration unchanged); timeToReachDistance inverts correctly;
   pickup timing (earliest runner wins; delayed runner picks up later;
   unstarted runner never picks up); each trigger kind resolves (onCatch
   player stands until arriveMs then moves; afterPass leaves at release;
   withPlayer syncs; delay offsets); cycle → fallback 0 + warning; multi-ball
   independent chains + per-ball flights; v3→v4 migration (carrier becomes
   heldBy, synthetic ball created when absent) and v1/v2→v4 still parse;
   removeElement cleans heldBy/passes/withPlayer.
3. Editor/browser sanity is the MAIN session's job (not agents') — leave
   testIDs: `add-ball`, `trigger-chip`, `give-to-player`, `drop-ball`,
   `playback-speed-{05|1|2}`, `playback-loop`, `pass-row-*`.
4. No console.log; immutable scene ops only; match existing style.
