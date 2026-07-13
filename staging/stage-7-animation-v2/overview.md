# Stage 7 — Animation authoring v2 (run lines, speeds, pass events)

## Goal
Replace drag-recording with professional plan-then-play authoring, per Cam's
spec: place the pieces → hit 🎬 Animate → drag a line from each runner → pick
its speed (walk/jog/run/sprint in real m/s) → give a player the ball → add
passes along the carrier chain (pop/spin/lofted, early/mid/late release).
Modelled on Cam's Real Rugby game (Opus reverse-engineering report), keeping
its one professional-grade mechanic — the receiver-lead interception solver —
and fixing its amateur spots (teleport catches → eased; flat-only flight →
lofted arc; fantasy speeds → real m/s; jaggy paths → Chaikin-smoothed).

## Definition of done (testable checklist)

- [x] Scene schema v3 (runs + passes + carrier), zod-validated, with v1/v2
      migration (no stored legacy scenes existed)
- [x] Interception solver: ball arrives where the RUNNER WILL BE (unit test
      asserts arrival matches the receiver's position at arrival time)
- [x] Pass chains stay time-ordered (catch before next release, min carry gap)
- [x] Speeds: walk 1.4 / jog 3.0 / run 5.5 / sprint 8.0 m/s; passes: pop 9 /
      spin 16 / lofted 11 m/s with rendered arc + eased catch
- [x] Editor: animate mode (drag-from-player run drawing, speed chips, give
      ball, add-pass with receiver pick, pass rows with type/release cycling,
      delete truncates chain), run lines rendered on canvas + thumbnails
- [x] 49/49 unit tests incl. 8 new solver/chain/ball tests
- [x] Browser: run polylines render, ball marker on carrier, pass rows show,
      play mode opens
- [ ] Cam's on-device pass: draw runs by finger, watch the drill play with a
      leading pass (visual motion is device-only — harness suspends rAF)

## Verification Log
**2026-07-13 (automated, Claude):** as ticked above. Playback MOTION cannot be
observed in the browser harness (documented in docs/failed-approaches.md);
its math is exhaustively unit-tested and the state machine verified in-browser.
