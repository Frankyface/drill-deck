# Stage 6 — Sharing platform (standard accounts, teams, visibility)

## Goal
Pivot from single-club tool to coaching platform: anyone signs up, teams are
the sharing unit (create/join by invite code, admin/coach roles), and every
drill has a visibility: 🔒 private / 👥 team / 🌍 public. Reviews stay
team-private; only an anonymized rating aggregate crosses team lines.

Decisions were resolved by an Opus debate pair (see docs/decisions.md
2026-07-13 "Sharing-platform verdicts").

## Definition of done (testable checklist)

- [x] Plain email+password signup (no code); optional team code joins after signup
- [x] OTP password reset (no deep links)
- [x] Create team → creator is admin; join by invite code; leave; member list
      with roles; admin regenerates the code (revokes old)
- [x] Drill visibility picker + share-to-teams; library scope chips
      (All / Mine / Team shared / Public)
- [x] Visibility matrix enforced by RLS (verified with two live accounts over
      REST): stranger sees ONLY public; teammate sees team+public, never
      private; non-owner edits touch 0 rows; coach denied code regeneration
- [x] "Copy to my drills" fork for non-owners
- [x] Cross-team rating aggregate via SECURITY DEFINER RPC (client-side
      aggregation would silently average only your own team's reviews)
- [ ] Cam's on-device pass (see help.md)

## Verification Log
**2026-07-13 (automated, Claude):** tsc clean · 49/49 jest · M6–M8 migrations
applied, advisor re-checked (one ERROR — missing RLS enable on drill_teams —
caught and fixed immediately) · full REST visibility matrix with two disposable
accounts (results above) · browser: new signup links, scope chips, Teams
screen (card, role, regenerated code, member list), drill visibility badge.
Test data wiped afterwards; database pristine.
