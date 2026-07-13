# Feature: Drill create / edit / archive
_Stage: stage-1-foundation · Status: awaiting verification_

## Goal
The heart of the app: any coach adds a drill from their phone fast enough to do
it in the clubhouse after training. Every drill carries the full tag set so the
library stays searchable as it grows. Drills are archived, never hard-deleted —
the library is club memory.

## Tag dimensions (v1 — locked in docs/decisions.md)
- **Category** (single): e.g. passing, breakdown, defense, kicking, lineout,
  scrum, fitness, handling, evasion, game-sense — seed list, admin-extendable
- **Skill focuses** (multi): finer-grained (e.g. offloading, tackle height,
  ruck speed, communication)
- **Players**: min–max range
- **Equipment** (multi): balls, cones, tackle bags, shields, ladders, poles…
- **Space needed**: e.g. 10x10m grid, quarter pitch, half pitch, full pitch
- **Intensity**: walk-through / moderate / high / match-intensity
- **Age/level suitability**: minis / juniors / seniors / all
- **Duration**: typical minutes
- Plus free text: **description**, **setup instructions**, **coaching points**

## Success Criteria
- [ ] From the library screen, "Add drill" → filled form → save takes under
      2 minutes on a phone for a fully-tagged drill (timed with Cam driving).
- [ ] All tag dimensions above are enterable with phone-friendly controls
      (chips/steppers/pickers — not raw text fields for structured data).
- [ ] Saved drill appears in the library instantly and shows every field on
      its detail screen.
- [ ] The coach who created a drill (or an admin) can edit it; edits show a
      "last edited by / when" line.
- [ ] Archiving hides a drill from the default library view but it remains
      recoverable from an "archived" filter (no hard delete anywhere in v1).
- [ ] Required-field validation: a drill can't be saved without name, category,
      and player range; clear inline messages, no crashes on bad input.

## How We'll Verify
1. Timed run: Cam adds a real drill from his head on his phone, screen-recorded;
   stopwatch under 2:00 from tapping "Add drill" to seeing it in the library.
2. Field round-trip: enter a drill with every field populated → check the row
   in Supabase → reload app → detail screen shows identical data.
3. Edit + archive walkthrough on a second account (permission boundaries hold).
4. Validation: try to save an empty form → inline errors, nothing saved.

## Verification Log
**2026-07-13 (automated, Claude):**
- Created "3v2 Decision Grid" through the real UI: name, category (Attack & evasion), 4–12 players, description, 2 skill focuses, 2 equipment tags, 20x20 grid, high intensity, all levels, setup + coaching points.
- Full round-trip verified: every field and tag rendered identically on the detail screen; row + m2m rows confirmed in Supabase.
- Edit path exercised implicitly (admin saw Edit button on the coach's drill — permission logic works both directions).
- **Not yet exercised end-to-end:** empty-form validation in browser (logic unit-level only), archive/restore round-trip, and the timed <2-minute phone entry — all on Cam's device checklist.

## Open Questions
- Should category/equipment seed lists be editable by admin in-app in v1, or
  is a DB-managed list fine until it hurts?
- Photo on a drill (camera roll) in v1, or wait for Stage 2 diagrams?

## Notes & Decisions
- Schema: `drills` (club-scoped, created_by, archived_at nullable) with tag
  columns/arrays; seed lists in lookup tables so adding values needs no
  migration.
- Optimize the form order for entry speed: name → category → players →
  description; everything else collapsible.
