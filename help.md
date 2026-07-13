# help.md — Cam's to-do list

_The platform is built. What's left needs your hands, your phone, and your accounts._

## 1 — Two-minute dashboard job (do this first)

- [ ] **Turn OFF "Confirm email"** in Supabase → Authentication → Sign In / Up
  → Email. Why: coaches sign in immediately after signup (free-tier email is
  rate-limited to ~2/hour, which will bite on a signup night). The app handles
  either setting, but OFF is right for rollout.
- [ ] Optional: set the **Reset Password email template** to include the
  `{{ .Token }}` 6-digit code (Auth → Email Templates) — the in-app
  "Forgot password" flow asks for that code.

## 2 — Your device verification pass

Install **Expo Go**, run `npx expo start` in the project folder, scan the QR:

- [ ] **Sign up with just email + password** (no code — clubs are gone, anyone
  can join). Check "Forgot password?" sends you a code that works.
- [ ] **Teams tab:** create a team (you become its admin), see its invite
  code, regenerate it, edit your display name.
- [ ] **Add a drill**, set visibility 👥 My teams + pick your team; add another
  as 🔒 Private and one as 🌍 Public. Check the library scope chips
  (All / Mine / Team shared / Public) slice them correctly.
- [ ] **Animate a drill** (the new flow): open its diagram → place attackers/
  defenders → 🎬 Animate → drag a line from each runner → pick speeds
  (walk/jog/run/sprint) → tap a player → 🏉 Give ball → ＋ Pass → tap the
  receiver → ▶ Play. The pass should lead the runner — ball arrives in stride.
  Try a "lofted" pass (it arcs) and an "early/late" release.
- [ ] **Second phone / a mate:** sign up, join your team with the code,
  confirm they see the team drill but NOT your private one, and can
  📋 Copy-to-my-drills your public one.
- [ ] Build a session, run it, review it — check the drill's star rating shows
  while the review text stays team-only.

Anything that fails: tell the next Claude session; it fixes and re-verifies.

## 3 — Coach rollout (after your pass)

- [ ] Share your team invite code with your coaches (they self-serve signup).
- [ ] **iOS installs:** Expo Go works free. A standalone iPhone app needs the
  Apple Developer Program ($99/yr) — Expo Premium covers builds, not Apple's
  fee. Android: free APK via EAS internal distribution.

## Not blocking anything

- [ ] Google Play Console ($25 one-off) — only for a Play Store listing.
- [x] ~~Supabase project~~ — live ("Drill Deck", Canada region), 8 migrations.
- [x] ~~gh CLI~~ — installed at C:\Program Files\GitHub CLI (not on Claude's
  shells' PATH; plain git works).
