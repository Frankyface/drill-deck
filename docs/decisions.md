# Decision Log — drill-deck

_Append-only. One entry per significant choice. Future sessions append; they
never rewrite history. Newest at the bottom._

## 2026-07-12 — Native app via Expo (not PWA or plain website)
**Chose:** Expo (React Native + TypeScript) native app · **Because:** coaches use
phones/tablets as primary devices and Cam explicitly wants native; he already
owns Expo Premium so EAS builds/updates are covered · **Rejected:** PWA (weaker
touch/offline feel, Cam vetoed), plain website (no offline, no home-screen
presence) · **Revisit if:** iOS distribution cost/friction blocks real coaches
from installing.

## 2026-07-12 — Supabase as the backend
**Chose:** Supabase (Postgres + Auth + Storage, free tier) · **Because:** shared
multi-coach database needs a real backend; generous free tier; already connected
to Cam's Claude Code tooling so sessions can manage it directly · **Rejected:**
Firebase (no tooling connection, NoSQL fits the relational drill/session model
worse), file-based sync (breaks down with 6+ concurrent editors) · **Revisit
if:** free-tier limits are hit (500MB DB / 50k MAU is far beyond a club's needs).

## 2026-07-12 — Club → teams → coaches modelled from day one
**Chose:** full club structure in the v1 schema; drill library club-scoped,
sessions team-scoped · **Because:** the user base is a whole club (6+ coaches,
multiple teams); retrofitting teams later is a painful migration · **Rejected:**
flat coach pool (simpler now, migration pain later) · **Revisit if:** the club
structure gets in the way of the fast add-drill flow.

## 2026-07-12 — Library-first staging; animation last
**Chose:** stage order Foundation → Diagrams → Sessions → Reviews → Animation ·
**Because:** Cam named the tagged database as the one indispensable feature;
animation is the hardest single feature and the app is useful without it ·
**Rejected:** designer-first (a drill without a searchable home is just a
drawing), animation with static diagrams in Stage 2 (front-loads the biggest
risk) · **Revisit if:** Cam decides seeing drills move matters more than reviews
(swap Stages 4 and 5 — he was offered this and can still take it).

## 2026-07-12 — All four headline features are IN v1
**Chose:** static diagrams, animated diagrams, progressions + sessions, and
reviews all committed to v1 scope (staged) · **Because:** Cam explicitly selected
all of them; no deadline pressure, free budget, so v1 = the full vision delivered
stage by stage · **Rejected:** cutting animation or reviews to a v2 · **Revisit
if:** progress stalls badly in Stage 2's touch canvas work.

## 2026-07-12 — Verification convention: "show it working"
**Chose:** every feature is demonstrated running (screenshots/recordings from the
actual app) AND Cam taps through it on his own device before a stage closes;
automated tests only where cheap (data logic, utilities) · **Because:** Cam is a
non-coder — a green test suite means nothing to him; a working screen does. This
consciously overrides his global 80%-coverage TDD rule for this project, per his
explicit choice in the planning interview · **Rejected:** mandatory 80% coverage
(slows a solo hobby project), trust-the-build (reckless for multi-user) ·
**Revisit if:** regressions start slipping through demos — then add tests around
whatever broke.

## 2026-07-12 — Free tier only
**Chose:** zero recurring spend: Supabase free tier + EAS (already paid via
Expo Premium) · **Because:** Cam picked "free only, no deadline" · **Rejected:**
paid tiers, custom domain · **Revisit if:** Apple Developer Program ($99/yr)
becomes necessary for iOS coach installs — that's Cam's call, tracked in
`help.md`.

## 2026-07-12 — Tag taxonomy (v1 dimensions)
**Chose:** category (single), skill focuses (multi), min–max players, equipment
(multi), space needed, intensity, age/level suitability, duration, coaching
points · **Because:** proposed in the interview readback and approved unchanged ·
**Rejected:** free-form tags only (no structured filtering) · **Revisit if:**
real use shows missing/unused dimensions — schema is designed to add values
without migrations.

## 2026-07-12 — Diagram scenes stored as JSONB documents
**Chose:** each diagram is one `scene` JSONB column (element list, positions,
later keyframe paths) rendered by the Skia canvas · **Because:** the designer
will evolve rapidly; a document avoids schema churn, and diagrams are always
loaded whole · **Rejected:** normalized element tables (joins for no benefit) ·
**Revisit if:** we ever need to query INSIDE scenes (e.g. "all drills using 5+
cones") — Postgres JSONB operators can cover that anyway.

## 2026-07-12 — Repo: private, Frankyface/drill-deck
**Chose:** private GitHub repo `Frankyface/drill-deck` (Cam created it; scaffold
pushed over the stub initial commit) · **Because:** club tool, no reason to be
public; name chosen by Cam · **Rejected:** public repo · **Revisit if:** Cam
wants it as a portfolio piece later.
