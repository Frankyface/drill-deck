# help.md — Cam's to-do list

_The app is built. What's left needs your hands, your phone, and your accounts._

## 1 — Two-minute dashboard jobs (do these first)

- [ ] **Turn OFF "Confirm email"** in Supabase → Authentication → Sign In / Up
  → Email. Why: coaches sign in immediately after signup instead of hunting
  for a confirmation email (free-tier email is also rate-limited to ~2/hour,
  which will bite on a signup night). The app handles either setting, but OFF
  is the right call for a club.

## 2 — Your device verification pass (the real "verified done" gate)

Install **Expo Go** (App Store / Play Store), then in a terminal in the
project folder run `npx expo start` and scan the QR. Then:

- [ ] **Sign up with invite code `RUCK-7H3Q`** — you're the FIRST user, so
  this account automatically becomes the club **admin**. Use your real email.
- [ ] Sign-in screen showed "✓ Connected"; airplane mode shows a friendly
  error instead of a crash.
- [ ] Add a real drill from your head, fully tagged, and time it (< 2 min).
- [ ] Filter the library ("12 players", "only cones") — right drills come back.
- [ ] Open the drill → Draw the diagram: drag players/cones/balls around by
  finger, draw a run arrow, save, reopen — identical.
- [ ] Add a step, drag a player along a run to record it, press ▶ Play —
  the drill animates smoothly.
- [ ] Join a team (Club tab), build a session with timings, try Run mode.
- [ ] Review the session (stars + note) and see it appear on the drill page.
- [ ] Kill and reopen the app — still signed in.

Anything that fails: tell the next Claude session; it fixes and re-verifies.

## 3 — Coach rollout (after your pass)

- [ ] Share the invite code with your coaches (they sign up in-app).
- [ ] Decide team names: currently seeded 1st XV, 2nd XV, U16s — rename/add
  in the Club tab (you're admin).
- [ ] **iOS installs:** Expo Go works free for everyone. For a proper
  standalone app on iPhones you'll need the Apple Developer Program ($99/yr,
  https://developer.apple.com/programs/) — Expo Premium covers the builds,
  not Apple's fee. Android: free APK via EAS internal distribution.

## Not blocking anything

- [ ] Google Play Console ($25 one-off) — only for a Play Store listing.
- [x] ~~Supabase project creation~~ — done (project "Drill Deck", Canada region).
- [x] ~~gh CLI~~ — installed at C:\Program Files\GitHub CLI (not on PATH in
  Claude's shells; plain git works fine).
