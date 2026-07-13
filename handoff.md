# Handoff — drill-deck
_Last updated: 2026-07-13 · Current stage: all 5 stages implemented, awaiting device verification_

## 🎯 Goals
Get Cam through the on-device verification checklist (help.md) so features can
flip from `awaiting verification` to `verified done`, then roll out to coaches.

## 📍 Current State
- ALL five stages implemented: library+tags+search, diagram editor (Views+SVG),
  progressions, session builder + run mode, reviews, animation record/playback.
- `tsc` clean · **40/40 jest tests** · full browser e2e done (auth, CRUD,
  filters, sessions, reviews, progressions, RLS probes, diagram save/render).
- Supabase live (project `avygkafazentnxtdlaoh`): 5 migrations, RLS hardened
  per advisor, seeded club "Drill Deck RFC" (invite `RUCK-7H3Q`), 3 teams,
  full tag vocabularies. **Zero users — Cam's first signup becomes admin.**
- Touch drag + visual animation playback unverifiable in the browser harness
  (hidden tab suspends animation frames) — they're Cam's device checklist.

## 📂 Files I'm Working On
- Nothing mid-flight. Opus adversarial review findings may add fixes next.

## ✅ Things I've Changed
- 2026-07-13: Full app implementation + tests + browser e2e + RLS probes.
- 2026-07-13: Fixed auth-gate stale-cache race; deterministic canvas width
  (no onLayout race); editor waits for fresh scene fetch; SPA web output.
- 2026-07-13: Debate-resolved product decisions logged in docs/decisions.md.

## ❌ Watch Out
- Browser-pane testing: hidden tab **suspends rAF** — animations look frozen
  but aren't broken. See docs/failed-approaches.md before "fixing" this again.
- Expo static web output SSR-crashes with supabase-js → web.output = 'single'.
- Supabase email confirmations are ON + rate-limited (2/hr) until Cam flips
  the dashboard toggle (help.md).

## ➡️ Next Up
1. Cam: run the device checklist in help.md (sign up with `RUCK-7H3Q` → you
   become admin; add a drill; drag a diagram; record + play an animation).
2. Address Opus review findings (if any outstanding at session end).
3. After device pass: flip feature statuses to `verified done`, then EAS dev
   build / distribution for the other coaches.

## 🔗 Pointer
→ Current stage folder: `staging/stage-1-foundation/` · Active feature file:
`staging/stage-1-foundation/feature-project-setup.md` (first device check)
