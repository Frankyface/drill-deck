# Scene v5 engine contract (Fable design → Opus build)

_Additions on top of v4. `CURRENT_SCENE_VERSION = 5`. All scene changes are
JSONB (no DB migration). Worklet rule (docs/failed-approaches.md 2026-07-13) is
a HARD gate on all gesture/animation code. Pure math stays in metres; only the
render/gesture boundary knows pixels + viewport._

## Schema additions (`src/scene/schema.ts`)

```ts
// #6 tackle gear + tower
PlayerElement.gear?: 'shield' | null            // player holding a tackle pad
TackleTowerElement = { id, type:'tackle-tower', position: Vec2, rotation? }
// add tackle-tower to the sceneElement discriminated union

// #3 per-segment run speeds with holds — segments TILE [0,1] of the path, in order
RunSegment =
  | { fromFrac; toFrac; kind:'move'; speed:'walk'|'jog'|'run'|'sprint' }
  | { fromFrac; toFrac; kind:'hold'; ms: number }   // planted at fromFrac position
Run.segments?: RunSegment[]        // absent ⇒ whole path at Run.speed (v4 behaviour)
// zod: fromFrac/toFrac in [0,1], contiguous & ordered (0..1); hold ms 200..10000

// #2 manual receive-point override (Real Rugby draggable dot)
Pass.receiveOverride?: Vec2 | null   // when set, ball is thrown HERE, solver ignored

// #5 saved viewport (pan/zoom); absent ⇒ fit-width (current)
SceneV5.viewport?: { cx: number; cy: number; zoom: number }  // pitch-metre centre + scale mult
```

## Run kinematics decision (the load-bearing choice)

**Segmented runs use Real Rugby's piecewise-constant model; non-segmented runs
keep v4 smoothstep.** Rationale: the user asked for the segment bar to work
"the same as Real Rugby", which is constant per-segment speed with holds — and
mixing smoothstep across variable-speed sub-segments is stutter-prone and
untestable. So:

- Build `buildRunProfile(run)` (JS, pure) → `{ totalMs, positionAt(tMs):Vec2,
  timeAtFrac(frac):ms }`:
  - No segments: v4 smoothstep over the whole path; totalMs = length/speed.
  - Segments: for each in order, a `move` segment traverses its path-fraction
    span at constant `speed` (durationMs = spanLength / speed); a `hold`
    segment adds `ms` with position pinned at its `fromFrac` point. totalMs =
    Σ segment durations. positionAt walks segments accumulating time.
- `positionOnRun(run, tMs, startMs)` ('worklet') delegates to a pre-built
  profile's breakpoint arrays (same {times,xs,ys} + sampleTimeline pattern as
  today) so the UI thread does only interpolation. `buildElementTimeline` fills
  those arrays from `buildRunProfile` (≥ RUN_SAMPLE_COUNT, plus exact
  breakpoints at every segment/hold boundary so holds render as true pauses).
- `timeToReachDistance` / pickup timing: use the profile (invert
  time↔distance). Pass release time from a runner = `startMs +
  profile.timeAtFrac(releaseFrac)` (releaseFrac is PATH-fraction, mapped to
  time through the profile — so a pass "at 0.6 of the run" respects holds).

## Viewport transform (#5) — render/gesture boundary only

Given canvas width `W`px, `s0 = W / PITCH_WIDTH` (fit-width base). With
`viewport {cx,cy,zoom}` (default `{cx:35, cy:50, zoom:1}` for fit-width... note
fit-width already shows full 100m height):
```
scale = s0 * zoom
metresToPx(p) = { x: W/2 + (p.x - cx)*scale, y: H/2 + (p.y - cy)*scale }
pxToMeters(px) = { x: cx + (px.x - W/2)/scale, y: cy + (px.y - H/2)/scale }
```
- `scaleForCanvas`, `metresToPx`, `pxToMeters` gain an optional `viewport` +
  canvas W/H; keep 'worklet'. Pure playback math (positionOnRun etc.) is in
  METRES and is UNCHANGED — only the render layer applies the viewport.
- Gestures still ship raw px through runOnJS; JS side converts with the current
  viewport. Zoom/pan is a pinch + two-finger drag (or +/− buttons + drag) that
  updates viewport state; "Fit" resets to default. Persisted in the scene.

## receiveOverride (#2)
`buildDrillTimeline`: for a pass with `receiveOverride` set, arrivePos = the
override; arriveMs = releaseMs + dist(releasePos, override)/passSpeed. No solver
iteration. Absent ⇒ existing interception solver. Editor draws a draggable ring
at the (solved or overridden) receive point; drag → set override (px→metres via
viewport, snapToGrid off for a fine handle); a small "auto" button clears it.

## Migration v4→v5 (`migrateScene`)
v4→v5 is additive: runs keep `speed` (no `segments`), players get no `gear`,
passes no `receiveOverride`, no `viewport`. v1/v2/v3→v4→v5 chain unchanged.
`parseScene` returns SceneV5. `createEmptyScene` → v5.

## Tests (≥18 new; existing ported)
segment profile (move+hold durations sum; hold pins position; releaseFrac maps
through holds); non-segmented back-compat (smoothstep unchanged); viewport
metre↔px inversion at zoom≠1 and off-centre; receiveOverride respected vs solver
fallback; migration v4→v5 and older chains; tackle-tower + gear parse/immutable
ops; removeElement clears gear? (gear is on the player, removed with them) and a
removed tackle-tower drops cleanly.
