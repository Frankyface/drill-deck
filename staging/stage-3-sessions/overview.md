# Stage 3 — Sessions & progressions

## Goal
"Plan Tuesday's training." Progressions turn one drill into a coaching arc
(easier ↔ harder variants); the session builder chains drills into a timed,
team-scoped plan a coach runs training from, phone in hand.

_(Sketch by design — spec'd properly when Stage 2 nears completion.)_

## Features (in build order)

- [ ] `feature-progressions.md` — ordered drill variants attached to a parent drill
- [ ] `feature-session-builder.md` — compose, reorder, time, and run a session plan

## Definition of done (testable checklist)

- [ ] A drill shows its progression chain; adding a progression step reuses the
      add-drill flow (a progression IS a drill, linked and ordered).
- [ ] Cam builds a real 60-minute session for one team — warm-up + 4 drills
      with minutes each — in under 5 minutes of phone time.
- [ ] Session view is pitch-side friendly: big text, current drill + next up,
      running clock against the plan.
- [ ] Sessions belong to a team; coaches of other teams can view but not edit.
- [ ] A finished session is stored with its date — the raw material Stage 4's
      reviews attach to.
