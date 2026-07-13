# Feature: Touch diagram designer
_Stage: stage-2-diagrams · Status: awaiting verification_

## Goal
A coach opens a drill, taps "Add diagram", and drags players (two team
colours), cones, balls, and static movement arrows onto a rugby pitch canvas —
entirely by touch. The scene saves as a JSONB document that Stage 5 will later
extend with keyframes for animation.

## Success Criteria
- [ ] Element palette: attacker, defender, neutral player, cone, ball, arrow
      (run) and dashed arrow (pass/kick) — each placeable by drag or tap.
- [ ] Placed elements drag smoothly (60fps feel) with a finger; positions snap
      subtly to a grid so diagrams look tidy.
- [ ] Pitch background options: full pitch, half, quarter, blank grid.
- [ ] Players can be numbered/labelled; long-press deletes; undo ≥ 10 steps.
- [ ] Save writes one `scene` JSONB doc; reopening re-renders identically.
- [ ] Works on both a phone screen and a tablet.

## How We'll Verify
Full procedure written when this stage starts. Skeleton: build a known real
drill's diagram on-device under screen recording; kill/reopen round-trip; scene
JSON inspected in Supabase; jank check while dragging with 20+ elements placed.

## Verification Log
**2026-07-13 (automated, Claude):** Built with **Reanimated Views + react-native-svg, NOT Skia** — the research spike overturned the Skia bet (see docs/decisions.md 2026-07-13 entry).
- Browser: editor renders palette, pitch canvas at correct 70:100 aspect, all element types add via palette (8 pieces: 3 attackers, 2 defenders, 2 cones, ball — DOM-verified with distinct colors), pitch background cycler, undo, arrow-mode instructions.
- Save path: the app's own save mutation wrote a v2 scene (8 elements) to `diagrams` as the signed-in coach — row confirmed in Supabase (RLS write path proven).
- Render path: a curated 10-element scene (spread positions, 2 arrows, 2 phases) loaded from the DB rendered every token at the mathematically correct pixel position (spot-checked coordinates) plus both SVG arrows; thumbnail renders on the drill detail page.
- Scene engine: 15 unit tests (zod validation, v1→v2 migration, JSON round-trip, immutable ops, undo cap, meters↔px, snap/clamp).
- **Not verifiable in the browser harness:** finger drag-and-drop (the test browser can't produce trusted pointer events for gesture-handler; drag commit logic is unit-tested) — **on Cam's device checklist**, including the 5-minute diagram build criterion.

## Open Questions
- Skia canvas vs plain Reanimated views for v1 of the designer? (Skia is the
  bet for animation later — validate with a spike before committing.)
- Scene schema versioning — `scene.version` field from day one so Stage 5 can
  migrate old diagrams safely. Draft the v1 schema before coding.
- Element rotation: needed for arrows only, or players too (facing direction)?

## Notes & Decisions
- Static arrows here ARE the movement notation until Stage 5 animates for real.
- Thumbnails: render-to-image on save (stored in Supabase Storage) vs re-render
  scene small — decide during the spike.
