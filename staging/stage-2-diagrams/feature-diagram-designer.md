# Feature: Touch diagram designer
_Stage: stage-2-diagrams · Status: not started_

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
_(empty)_

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
