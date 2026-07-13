# Feature: Session reviews
_Stage: stage-4-reviews · Status: awaiting verification_

## Goal
Close the coaching loop: rate and annotate how each drill actually ran with a
real group, attached to the session it happened in, surfaced wherever that
drill appears again.

## Success Criteria
- [ ] Post-session review flow: each drill in the session gets 1–5 stars +
      optional note; skippable per drill; under a minute total for 5 drills.
- [ ] Drill detail shows average rating, count, and recent notes with team/
      date/coach context.
- [ ] A session's own page shows its reviews together (how did Tuesday go?).
- [ ] Library sort by rating works.

## How We'll Verify
Written when the stage is spec'd. Skeleton: review a real training session the
night it happens; check the notes appear on the drill pages and the sort order
updates.

## Verification Log
**2026-07-13 (automated, Claude):**
- Review flow driven in the browser: 4★ + note on the session's drill → saved; **DB row confirmed** with coach attribution, team, and date.
- Drill page surfaced it exactly per the debate verdict (capture team-scoped, display club-wide): "4.0 from 1 review", the note, "1st XV · 2026-07-13" context, "— Test Coach" attribution.
- Library card showed the ★ 4.0 (1) badge **on a different account** (admin), and "Top rated" sort is wired with a unit-tested comparator.
- Upsert path: one review per coach per drill-in-session (`unique(session_item_id, coach_id)`); editing pre-fills.
- **Remaining for Cam (device):** review a real 5-drill session in under a minute.

## Open Questions
- Free-form note only, or structured prompts ("what would you change?")?
- Should ratings be per-team visible or club-wide aggregated? (Minis drills
  rated by seniors coaches could mislead.)

## Notes & Decisions
- None yet — revisit when starting.
