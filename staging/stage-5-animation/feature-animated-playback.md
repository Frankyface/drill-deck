# Feature: Animated playback
_Stage: stage-5-animation · Status: awaiting verification_

## Goal
Record movement on a diagram by dragging elements along their paths, organised
into phases (step 1: ball carrier runs + support runs; step 2: pass; …), then
play the whole drill back as a smooth animation.

## Success Criteria
- [ ] Record mode: select element → drag its path → path stored as keyframes
      in the scene document; per-phase organisation.
- [ ] Playback animates all elements per phase with sensible relative timing;
      pause/replay/scrub.
- [ ] Runs smoothly on a mid-range phone with a realistic drill (10+ moving
      elements).
- [ ] Scene `version` migration: every pre-animation diagram in the library
      still renders perfectly.

## How We'll Verify
Written when the stage is spec'd. Skeleton: animate one real drill end-to-end,
show it to actual players at training, record whether they understood the
drill without verbal explanation.

## Verification Log
**2026-07-13 (automated, Claude):**
- Playback math has 8 dedicated unit tests: phase-flattened timelines, cross-phase interpolation, **hold-not-drift** for elements static in a phase, clamping outside [0,1], RDP path simplification, drag-samples→keyframes conversion.
- Recording pipeline implemented: record mode per phase, per-frame sampling during drag, RDP reduction, track replacement; phases UI (add/duration-stepper/delete, run counts) rendered and read a 2-phase scene correctly in the browser.
- Playback UI verified in browser: play mode opens, Play/Pause/Replay state machine flips correctly, per-element timelines built from the scene.
- **Visual motion could NOT be verified in the browser harness** — the test browser keeps the page hidden, which suspends `requestAnimationFrame` and freezes ALL animation (see docs/failed-approaches.md). This is a harness limitation, not an app defect; Reanimated `withTiming` is the standard path on a visible device.
- **Remaining for Cam (device):** record a run on a diagram, play it back smoothly, and show it to players — the criterion that matters.

## Open Questions
- Timing model: fixed per-phase duration vs per-path speed vs draggable
  timeline? Spike first.
- Ball animation: independent element or passed between players as an event?
- Export to video/GIF for sharing outside the app — in scope here or future
  roadmap?

## Notes & Decisions
- Skia + Reanimated is the assumed stack (bet placed in Stage 2) — the spike
  validates it before deep work.
