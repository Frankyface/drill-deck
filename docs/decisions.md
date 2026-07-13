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

## 2026-07-13 — Views + SVG for the diagram canvas (supersedes the Skia bet)
**Chose:** Reanimated Animated.Views for draggable tokens over a react-native-svg
pitch/arrow layer; Skia removed from dependencies · **Because:** the research
spike found drill diagrams (~15–30 elements) are 10× below where Skia's batching
pays off; Views render real DOM nodes on web (testable/inspectable) while a Skia
canvas is an opaque blob; zero web setup vs a 2.9MB WASM boot shim · **Rejected:**
Skia-first (the original tentative bet — it was explicitly "validate with a
spike", and the spike said no) · **Revisit if:** Stage-5 playback janks with 10+
moving elements on a mid-range Android — Skia is the contained escalation path
(scene logic is renderer-agnostic).

## 2026-07-13 — Debate-resolved product decisions (Cam delegated to an Opus debate)
**Chose:** (a) email+password sign-in — both debaters independently converged
(magic links = deep-link fragility + pitch-side email dependency); (b) club
invite code at signup, first account in the club auto-becomes admin — kills the
temp-password handoff failure and the approval-queue bottleneck; (c) drill
photos deferred — diagrams shipped in the same build, so the adoption-gap
argument dissolved; (d) progression groups + ordered join table — drill reuse
across age-group pathways is the domain norm; the join table does linear chains
at no extra cost and avoids the one truly painful migration; (e) sessions: flat
reorder UX with a typed `phase` column — structure captured, no nested
drag-and-drop; (f) reviews captured team-scoped (via session), displayed
club-wide aggregate with per-note team context · **Rejected:** magic links,
admin-precreated accounts, Stage-1 photo uploads, parent-chain progressions,
free-text phase labels, aggregate-only rating storage · **Revisit if:** club
adoption reveals different behavior (each is individually reversible).

## 2026-07-13 — Client-side filtering over Postgres queries
**Chose:** fetch the club's drills once (react-query cache, persisted) and
filter/sort in pure TypeScript · **Because:** club scale is hundreds of drills,
not millions; instant filtering; works offline from cache pitch-side; trivially
unit-testable (13 tests) · **Rejected:** per-filter Postgres queries (network
round-trip per filter tap, useless offline) · **Revisit if:** the library
exceeds ~2,000 drills or multi-club sharing lands.

## 2026-07-13 — Expo web output = 'single' (SPA), not 'static'
**Chose:** SPA web output · **Because:** static output SSR-renders routes in
Node at dev time, where supabase-js touches browser-only storage and crashes
the server; the app is 100% authenticated so static rendering buys nothing ·
**Rejected:** static/SSR output · **Revisit if:** a public marketing page ever
lives in this app (it shouldn't — separate site instead).

## 2026-07-13 — Auth gate renders nothing until redirects settle
**Chose:** the root gate returns a spinner (never children) whenever the
session state and the current route group disagree, and the query cache is
invalidated on sign-in / cleared on sign-out · **Because:** a one-frame anon
mount of protected screens cached empty query results as fresh, showing empty
pickers after sign-in; cache clearing also prevents coach-A data flashing for
coach-B on a shared device · **Rejected:** per-hook `enabled: !!session` threading
(invasive, easy to forget on new hooks) · **Revisit if:** never — this is load-bearing.

## 2026-07-13 — Team self-join stays open (trusted-club model)
**Chose:** any club member can join/leave any team themselves (and thereby edit
that team's sessions); admin can also assign · **Because:** the adversarial
audit flagged this as a permission-escalation path, but for one real club of
colleagues it IS the intended collaboration model — an approval flow would
recreate the admin-bottleneck the onboarding debate rejected · **Rejected:**
admin-only team assignment · **Revisit if:** a coach outside a team ever
tampers with another team's plans (then flip `team_coaches_insert` to admin-only
— a one-line policy change).

## 2026-07-13 — Sharing-platform verdicts (second Opus debate, both sides converged)
**Chose:** (a) new drills default PRIVATE with one-tap widening (share is
deliberate; retraction is a social incident); (b) clubs REMOVED — teams are the
only grouping, membership is many-to-many WITH ROLES (admin/coach), the role
column being the load-bearing primitive; (c) public = signed-in users for now,
schema leaves a clean seam for anonymous read via a sanitized view later;
(d) owner-only content edits + team-admin lifecycle rights (unshare) +
copy-to-my-drills fork for everyone; (e) tag vocabularies GLOBAL and
system-managed (per-team vocab would fragment public search); (f) plain
signup, join-by-code as a separate repeatable action, optional code field at
signup that runs the join AFTER account creation; invite codes are per-team
and admin-regenerable (regenerate = revoke) · **Because:** both debaters
independently converged on 5 of 6; the one real split (edit rights) resolved
as A's axis-separation (sharing ≠ co-ownership) satisfying B's orphan concern
via admin lifecycle rights · **Rejected:** club tier, wiki-style team edits,
anonymous public reads at launch, per-team vocabularies, signup-coupled join ·
**Revisit if:** a real multi-team club needs an org tier (additive nullable
grouping — no migration), or fork-demand shows genuine co-authoring need.

## 2026-07-13 — Reviews stay team-private; only aggregates cross team lines
**Chose:** raw review rows readable ONLY by the session's team (RLS); every
other viewer of a drill gets `{avg, count, team_count}` from a SECURITY
DEFINER function · **Because:** both debaters flagged the same trap — a public
drill must not broadcast a team's candid internal notes, and an RLS-filtered
client-side average would silently count only your own team's reviews ·
**Rejected:** public-drill ⇒ public-reviews coupling, client-side aggregation ·
**Revisit if:** review volume makes per-team display sparse enough to matter.

## 2026-07-13 — Animation authoring v2: plan-then-play with pass events
**Chose:** scene schema v3 — per-player run lines traversed at real speeds
(walk 1.4 / jog 3.0 / run 5.5 / sprint 8.0 m/s), a kickoff ball carrier, and a
pass-event chain (pop 9 / spin 16 / lofted 11 m/s, release early/mid/late along
the passer's run); the receiver-lead interception solver ported from Cam's
Real Rugby game (its one professional-grade mechanic per the reverse-
engineering report), plus the report's polish list: lofted arc rendering,
eased catches (no teleports), Chaikin-smoothed drawn paths, no RNG ·
**Because:** Cam specified this authoring model ("drag a line, pick its speed,
decide when to pass") and asked for "a more professional version" of Real
Rugby's passing · **Rejected:** the old drag-recording keyframe model (v2
scenes — replaced wholesale; none were stored), per-path bezier storage,
knock-on randomness · **Revisit if:** coaches want per-segment speeds on one
run (Real Rugby's speed-segment bar) or a draggable release dot instead of
early/mid/late presets.
