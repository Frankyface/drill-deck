# Feature: Progressions
_Stage: stage-3-sessions · Status: not started_

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
_(empty)_

## Open Questions
- Simple linked list per drill, or named "progression groups" that hold an
  ordered set? Decide against real drills entered during Stages 1–2.
- Regressions too (an "easier" direction), or is order alone enough?

## Notes & Decisions
- None yet — revisit when starting.
