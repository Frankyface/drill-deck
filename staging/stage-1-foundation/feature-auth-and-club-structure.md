# Feature: Auth & club structure
_Stage: stage-1-foundation · Status: awaiting verification_

## Goal
Coaches sign in with email on their own devices, and the database knows the
club's shape: one club, its teams (1st XV, U16s, …), and each coach's profile
with a role (admin | coach). Row-Level Security makes the database itself
enforce who can see and change what.

## Success Criteria
- [ ] A brand-new coach signs up / signs in with email on their phone and lands
      on the library, with a profile row created automatically.
- [ ] Cam's account has the `admin` role; he can create/rename teams in-app or
      via a simple admin screen.
- [ ] The club has at least 2 teams stored.
- [ ] A signed-out client gets zero rows from every table (verified with a raw
      anon-key query, not just the app's behavior).
- [ ] A signed-in coach can read the whole club library but cannot delete
      another coach's drill (RLS policy test).
- [ ] Sign out → sign in works repeatedly; session survives an app restart.

## How We'll Verify
1. Fresh account walkthrough on a real phone (screen recording): sign up,
   land on library, check `profiles` row appeared in Supabase.
2. RLS probe from a terminal: `curl` the REST endpoint with the anon key and
   no auth → expect `[]` on drills/profiles/teams; with a coach JWT → rows.
3. Attempt forbidden write (coach deletes admin's drill) via supabase-js in a
   script → expect a policy error, paste it.
4. Kill and reopen the app → still signed in.

## Verification Log
**2026-07-13 (automated, Claude):** verified with two disposable test accounts (deleted afterwards — club reset to empty so Cam's real signup becomes admin).
- Signup trigger: first user via invite code `RUCK-7H3Q` → role **admin**; second → **coach**; both landed in Drill Deck RFC (SQL-verified profiles).
- 8 REST probes with real HTTP requests: anon → `[]` on drills/profiles/teams ✓; anon reads `health_check` probe row (deliberate) ✓; coach password sign-in ✓; coach sees both members ✓; coach **denied team creation with RLS error 42501** ✓; coach reads 3 seeded teams ✓.
- Browser: sign-in → auth gate redirect → library; sign-out → sign-in screen; session survived a dev-server restart (persistence).
- Invite-code UI: sign-up screen validates the code via `validate_invite_code` RPC before creating the account.
- **Remaining for Cam (device):** his own signup on his phone (becomes admin), app-restart session persistence on device.

## Open Questions
- Password vs magic-link sign-in (leaning password — no email-deliverability
  dependency pitch-side; decide when building, log it in docs/decisions.md).
- How do coaches join: open sign-up + admin approval, or invite-only (admin
  pre-creates accounts)? Decide with Cam before rollout.
- Single club hardcoded for v1, or `clubs` table ready for multi-club? (Schema
  has the table either way; app can assume one club.)

## Notes & Decisions
- Schema for this feature: `clubs`, `teams`, `profiles` (fk → auth.users,
  role enum) + RLS policies on all three.
- Coach emails + team names needed from Cam — tracked in `help.md`.
