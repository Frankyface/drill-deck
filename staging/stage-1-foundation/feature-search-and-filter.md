# Feature: Search & filter the library
_Stage: stage-1-foundation · Status: awaiting verification_

## Goal
The payoff of tagging: a coach thinks "12 players, breakdown work, only cones"
and has the right drill on screen within ~10 seconds. Browse, text search, and
tag filters that combine — fast and obvious on a phone.

## Success Criteria
- [ ] Library screen lists all non-archived drills, newest first, each card
      showing name, category, player range, and duration at a glance.
- [ ] Text search matches drill name AND description as you type.
- [ ] Filter controls exist for at least: category, skill focus, player count
      ("works with N players" — N within min–max), equipment, intensity, and
      age/level.
- [ ] Filters combine with AND logic (e.g. breakdown + ≤12 players + cones
      only) and can be stacked with text search.
- [ ] Active filters are visible as removable chips; one tap clears all.
- [ ] Empty state is helpful: "No drills match — try removing a filter", not a
      blank screen.
- [ ] With 50+ seeded drills, search/filter results update in under a second
      on a phone.

## How We'll Verify
1. Seed ~50 varied test drills via script (kept in repo for reuse).
2. Scripted checks: for 5 predefined filter combinations, compare app results
   against direct SQL results — must match exactly.
3. On-device run (screen recording): Cam performs 3 real lookups he'd actually
   do ("weather's rubbish — indoor handling drill for 8", etc.) and finds a
   correct drill in ≤ 10 seconds each.
4. Delete the seed drills afterwards (or keep in a marked "demo" category —
   Cam's call, logged here).

## Verification Log
**2026-07-13 (automated, Claude):**
- 13 unit tests green on the pure filter/sort engine (`drillFilters.test.ts`): archived visibility, case-insensitive name+description search, category, player-count-in-range, "I only have this equipment" subset semantics, ALL-selected-skills, combined AND stacking, level 'all' passthrough, min-rating excluding unrated, all three sorts.
- Browser: library renders search box, filter panel with every dimension, sort chips, result count footer, empty states; ★ 4.0 (1) rating badge appeared on the card after a review was saved.
- **Remaining:** 50-drill seeded perf check and Cam's 3 real pitch-side lookups (device).

## Open Questions
- Client-side filtering (simple, fine at club scale) vs Postgres queries
  (scales, testable in SQL)? Likely Postgres via supabase-js — decide when
  building.
- Sort options beyond newest-first (name, most-used later once sessions exist)?

## Notes & Decisions
- "Works with N players" beats raw min/max filters — coaches know how many
  players showed up tonight.
