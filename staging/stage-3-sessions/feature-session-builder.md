# Feature: Session builder
_Stage: stage-3-sessions · Status: not started_

## Goal
Chain drills into a timed session plan for a team, then run training from a
phone: what's now, what's next, how long is left. Sessions are the app's
output — drills are the ingredients.

## Success Criteria
- [ ] Create a session: pick team + date, add drills from the library (search/
      filter reused), set minutes per drill, drag to reorder.
- [ ] Total session time computed and visible while building.
- [ ] "Run" mode: current drill full-screen (diagram included), next drill
      preview, elapsed/remaining time. Readable in sunlight, gloves-friendly
      tap targets.
- [ ] Team scoping enforced by RLS: other teams' coaches read-only.
- [ ] Past sessions listed per team with their dates.

## How We'll Verify
Written when the stage is spec'd. Skeleton: Cam builds and "runs" a real
session at an actual training night; screen recording + his verdict is the
evidence.

## Verification Log
_(empty)_

## Open Questions
- Copy-last-session as a starting point in v1 of this feature?
- Blocks/phases (warm-up / skills / game) as first-class structure, or just
  ordered drills with an optional label?

## Notes & Decisions
- None yet — revisit when starting.
