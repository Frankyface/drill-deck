# Feature: Session builder
_Stage: stage-3-sessions · Status: awaiting verification_

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
**2026-07-13 (automated, Claude):** full browser walkthrough as a coach:
- Joined 1st XV from the Club tab (self-service `team_coaches` insert through RLS).
- Created "Tuesday — attack shape" for 1st XV (team eligibility enforced: only joined teams offered to non-admins).
- Added the drill from the in-builder library search under the **Skills** phase; total showed **10 min planned**; phase header rendered.
- **Run mode:** "Drill 1 of 1 · skills", live ticking clock ("0:01 / 10:00"), coaching points card, next/prev controls.
- Structured-phase capture verified (typed phase column, flat reorder UX per the debate synthesis). Reorder/±duration/phase-cycling math is unit-tested (`sessions.test.ts`).
- **Remaining for Cam (device):** build a real 60-min multi-drill session in under 5 min of phone time and run a real training night from it.

## Open Questions
- Copy-last-session as a starting point in v1 of this feature?
- Blocks/phases (warm-up / skills / game) as first-class structure, or just
  ordered drills with an optional label?

## Notes & Decisions
- None yet — revisit when starting.
