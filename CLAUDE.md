# drill-deck — CLAUDE.md

Touch-first Expo app: a rugby club's shared drill library — tagged drills,
2D pitch diagrams (animated later), progressions, session plans, reviews.

**Stack:** Expo (React Native + TypeScript) · Supabase (Postgres/Auth/Storage,
free tier, RLS) · React Native Skia + Gesture Handler (diagram canvas) ·
EAS builds/updates (Cam has Expo Premium).

## Read this first
1. Read `handoff.md`, then follow its 🔗 Pointer to the active feature file.
2. Doc model: **CLAUDE.md** = the constant · **handoff.md** = head of the
   linked list (current state) · **staging/<stage>/feature-*.md** = the list
   (the ordered body of work).
3. Truth hierarchy: actual code/system state > handoff.md > stage files >
   docs/master_plan.md. When docs and reality conflict, reality wins —
   fix the docs and say you did.

## Standing command
When the user says **"update all relevant files"**, run `/sync-docs`.

## Verification protocol (never skip)
- Status state machine: `not started → in progress → awaiting verification →
  verified done`. Finishing code reaches `awaiting verification`, never done.
- `verified done` ONLY after executing the feature's **How We'll Verify**
  steps and recording dated evidence in its **Verification Log**. `/verify`
  runs this loop. Blocked verification → note it in `help.md`, tell Cam.
- Project convention: **show it working** — screenshots/recordings from the
  running app, and Cam taps through it on his own device before a stage
  closes. Automated tests where cheap (data logic, utils); no coverage quota.

## Conventions
- TypeScript strict. camelCase functions/vars, PascalCase components/types,
  is/has/should prefixes for booleans. Immutable updates, early returns.
- Small focused files: 200–400 lines typical, 800 max.
- Commits: conventional format (`feat:` `fix:` `docs:` `chore:` …).
  **No AI attribution lines** in commits or PR bodies.
- Branching: work on `main` until Stage 1 is verified done, then feature
  branches. Commit at every verified-green checkpoint.
- Run: `npx expo start` · Tests: `npx jest` (once the app skeleton exists).
- Secrets: Supabase URL + anon key in `.env` (gitignored, `.env.example`
  committed). Only the anon/publishable key ever ships in the client —
  RLS is the security boundary. Never hardcode secrets.

## Budgets & hygiene
- `handoff.md` ≤ 60 lines: rewrite sections in place, never accumulate.
  History lives in `git log` and `docs/failed-approaches.md`.
- CLAUDE.md ≤ 80 lines. Vision → `docs/master_plan.md`, choices →
  `docs/decisions.md`, dead ends → `docs/failed-approaches.md`.
- Cam is a non-coder building via Claude Code: explain in plain language,
  demo visually, never assume he'll read the code.
