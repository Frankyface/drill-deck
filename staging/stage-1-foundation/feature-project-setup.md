# Feature: Project setup
_Stage: stage-1-foundation · Status: not started_

## Goal
A runnable Expo (TypeScript) app connected to a live Supabase project, with
secrets handled properly. Proves the entire pipeline — code on Cam's machine →
app on Cam's phone → database in the cloud — before any real features are built
on top of it.

## Success Criteria
- [ ] Cam opens the app on his physical phone and sees a "drill-deck" home
      screen (not the Expo template screen).
- [ ] That screen displays a value fetched live from a `health_check` table in
      the drill-deck Supabase project — proving app ↔ database connectivity.
- [ ] Turning on airplane mode and reopening shows a clear "can't reach the
      server" message, not a crash or infinite spinner.
- [ ] The repo contains `.env.example` (placeholder keys) but no real secrets;
      `git log -p` shows no key was ever committed.
- [ ] `npx jest` runs and passes at least one real test (e.g. the Supabase
      client factory returns a configured client).

## How We'll Verify
1. Run `npx expo start`; scan the QR with Expo Go on Cam's phone — home screen
   renders, no red error screen.
2. Confirm the on-screen value matches the row in Supabase (change the row via
   SQL, pull-to-refresh in the app, see the new value).
3. Airplane-mode test on the phone — friendly error state appears.
4. Run `git log --all -p -- .env* | grep -i "key\|secret"` → no real values;
   confirm `.env` is untracked (`git status --ignored`).
5. Run `npx jest` → all green, screenshot/paste output.

## Verification Log
_(empty — a feature with an empty log can never be `verified done`)_

## Open Questions
- Expo SDK version: use whatever `create-expo-app@latest` ships at build time
  (record the version here once created).
- Does Cam's phone run Android or iOS? Determines whether Expo Go is fully
  sufficient for Stage 1 or a dev build is needed sooner.

## Notes & Decisions
- App lives at the repo ROOT (docs folders alongside), not in a subfolder.
- Supabase project creation goes through the connected Supabase tooling and
  needs Cam to approve the cost-confirm step (free tier, $0) — see `help.md`.
- Client uses only the anon/publishable key; RLS (next feature) is the real
  security boundary.
