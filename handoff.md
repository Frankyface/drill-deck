# Handoff — drill-deck
_Last updated: 2026-07-13 · Current stage: stages 1–7 implemented, awaiting device verification_

## 🎯 Goals
Cam runs the device checklist (help.md), then coaches roll out: sign up, make
teams, share drills.

## 📍 Current State
- Platform model live: standard accounts (open signup + OTP password reset),
  teams with roles + per-team invite codes, drill visibility
  private/team/public, copy-to-my-drills fork, team-private reviews with
  cross-team aggregate RPC.
- Animation v2: 🎬 animate mode — draw run lines, real m/s speeds, ball
  carrier, pass chain (pop/spin/lofted) with receiver-lead interception solver
  (ported from Cam's Real Rugby game, professionalized per Opus report).
- tsc clean · **49/49 jest** · REST visibility matrix verified with two live
  accounts · browser e2e of new UI · 8 migrations, advisors clean.
- Database pristine: zero users/teams/drills; global vocabularies seeded.
- CLUBS ARE GONE: no club invite code; signup is open; admin = per-team role.

## 📂 Files I'm Working On
- Nothing mid-flight.

## ✅ Things I've Changed
- 2026-07-13: Sharing platform (M6–M8): open signup, teams, visibility RLS,
  fork, scope chips, aggregate RPC. Debate-resolved; matrix-verified via REST.
- 2026-07-13: Animation v2 (scene v3): run lines + speeds + pass events,
  interception solver, arc + eased catch, editor rewrite. 49/49 tests.
- 2026-07-13: OTP password reset + display-name editing.

## ❌ Watch Out
- Browser-pane testing: hidden tab suspends rAF — animations look frozen but
  aren't. See docs/failed-approaches.md FIRST.
- Deleting a player truncates the pass chain from its first involvement — by
  design (chain would dangle).
- Supabase "Confirm email" still ON + rate-limited until Cam flips it (help.md).

## ➡️ Next Up
1. Cam: device checklist in help.md (sign up plain, create a team, share a
   drill to it, draw runs + passes in animate mode, watch it play).
2. Coach rollout: share team invite codes.
3. Future: draggable release dot, per-segment speeds, org tier if a club asks.

## 🔗 Pointer
→ Current stage folder: `staging/stage-6-sharing-platform/` · Then:
`staging/stage-7-animation-v2/overview.md` (both awaiting device pass)
