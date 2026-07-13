# Feature: Progressions
_Stage: stage-3-sessions · Status: awaiting verification_

## Goal
Real coaching moves through progressions: start simple, layer difficulty. A
drill page shows its chain (e.g. "2v1 grid → 3v2 → 3v2 with contact") and a
coach steps through it. A progression is itself a drill — linked and ordered —
so everything (tags, diagrams, later reviews) works on progressions for free.

## Success Criteria
- [ ] From a drill's detail screen: "Add progression" creates/links a drill as
      the next step; chains display in order and are re-orderable.
- [ ] Navigating a chain is one tap per step (prev/next).
- [ ] A drill can appear in multiple chains without duplication.

## How We'll Verify
Written when the stage is spec'd. Skeleton: build a real 3-step chain
on-device, round-trip it, verify ordering survives edits and re-ordering.

## Verification Log
**2026-07-13 (automated, Claude):** Model resolved by the delegated debate: **named progression groups + ordered join table** (drills reusable across groups) — see docs/decisions.md.
- Browser: created "Decision-making pathway" from the drill detail screen; chain rendered with ordered steps and the "← you are here" marker; add-to-existing-group chips render for groups not containing the drill.
- Schema: `progression_groups` + `progression_items(group_id, drill_id, position)` live with club-scoped RLS (creator/admin edits).
- **Remaining for Cam (device):** build a real 3-step chain and reorder it.

## Open Questions
- Simple linked list per drill, or named "progression groups" that hold an
  ordered set? Decide against real drills entered during Stages 1–2.
- Regressions too (an "easier" direction), or is order alone enough?

## Notes & Decisions
- None yet — revisit when starting.
