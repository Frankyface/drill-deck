# Handoff — drill-deck
_Last updated: 2026-07-13 · Live on TestFlight; animator v4 shipping in build 5_

## 🎯 Goals
Cam device-tests build 5 (the animator v4 upgrade), then invites coaches.

## 📍 Current State
- LIVE on TestFlight (app id 6790523464). Build 3 launched OK; build 4 fixed
  an animate-mode device crash; **build 5 (compiling now) = animator v4**.
- Cam has a real account (cammer3034) + 1 drill with a **v3 diagram** — the
  v3→v4 migration keeps it working (carrier→held ball, runs gain triggers).
- Animator v4: placeable balls with run-line PICKUP, departure triggers
  (whistle/delay/on-catch/after-pass/with-player), smoothstep accel-decel,
  per-ball multi-ball passes, playback speed 0.5/1/2× + loop + ghost trails.
- tsc clean · **77 jest tests** · Opus adversarial audit clean (worklet-safety
  + engine); 2 MEDIUM findings fixed with regression tests. Browser smoke test
  clean (editor mounts, all controls render, zero console errors).
- EAS: env vars registered (all envs), submit ascAppId wired → hands-free
  build→TestFlight. Icon = tactics board.

## 📂 Files I'm Working On
- Nothing mid-flight. Spec at docs/animator-v4-spec.md.

## ✅ Things I've Changed
- 2026-07-13: Animator v4 (schema v4, engine, editor, playback) via Opus to
  docs/animator-v4-spec.md; audit fixes + 77 tests. Build 5 → TestFlight.
- 2026-07-13: Fixed animate-mode worklet crash (build 3→4); EAS env vars
  (crash fix, build 2→3); iOS build+submit credentials + auto-submit.
- 2026-07-13: New app icon; README + PRIVACY on GitHub Pages (Drill-Deck-ReadMe).

## ❌ Watch Out
- WORKLET RULE (device-only crash class): any fn reached from a Gesture
  callback / useAnimatedStyle / animation completion must be 'worklet' or via
  runOnJS. See docs/failed-approaches.md 2026-07-13. Re-audit after gesture/anim edits.
- Browser harness can't show motion/gestures/pickups (hidden tab suspends rAF)
  — animator behaviour is Cam's device checklist.
- Store builds need EAS env vars (not .env, which is gitignored).

## ➡️ Next Up
1. Cam: TestFlight build 5 — animate a drill: place a ground ball, drag a
   runner over it (scoop), set a receiver to leave "on catch", ▶ Play; try
   speed 2× and loop. His existing v3 drill should still animate.
2. Then: coach rollout via team invite codes (help.md).
3. Future ideas: draggable release dot, per-segment run speeds, defenders.

## 🔗 Pointer
→ docs/animator-v4-spec.md (the v4 contract) · staging/stage-7-animation-v2/
  (superseded by v4; overview still lists the base animator criteria)
