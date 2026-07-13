# help.md — Cam's to-do list

_Things only the human can do: accounts, payments, approvals, physical devices.
Sessions add items here when they hit a wall only Cam can clear. Ordered by
which stage they block._

## Blocking Stage 1 (Foundation)

- [ ] **Confirm Supabase project creation.** When the session asks to create the
  `drill-deck` Supabase project (free tier, $0), approve the cost-confirmation
  prompt. Why: the shared database and coach logins live there.
- [ ] **Have your phone ready with Expo Go installed** (free app — App Store /
  Play Store). Why: Stage 1 verification is you tapping through the app on your
  own device via `npx expo start`.

## Blocking coach rollout (end of Stage 1)

- [ ] **Decide the iOS install path.** Expo Premium covers building the app, but
  Apple charges separately to put it on iPhones: TestFlight/App Store need the
  Apple Developer Program ($99/yr — https://developer.apple.com/programs/).
  Options: (a) pay it, (b) iPhone coaches use Expo Go for now (clunkier but
  free), (c) check how many coaches are actually on iPhone first. Android
  coaches are free either way via an EAS internal-distribution APK.
- [ ] **Collect coaches' email addresses** for their sign-ins, and decide team
  names (e.g. 1st XV, 2nd XV, U16s). Why: needed to seed the club structure.

## Not blocking anything yet

- [ ] **Google Play Console ($25 one-off)** — only if you later want the app in
  the Play Store; internal APK distribution works without it.
- [ ] **(Optional) Install GitHub CLI** (`winget install GitHub.cli`) — plain
  git works fine over HTTPS, so this is convenience only (PRs from terminal).
