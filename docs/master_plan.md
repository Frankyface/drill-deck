# drill-deck — Master Plan

_This file is the complete vision, written so a brand-new session with zero prior
context can understand the whole project. Current state lives in `handoff.md`;
this file changes only when the vision or roadmap genuinely changes._

## Pitch

A touch-first mobile app where a rugby club's coaches build a shared, searchable
library of drills — tagged, diagrammed, and eventually animated — then chain them
into session plans and review how they ran.

## Problem & Why

Cam coaches rugby. His drills live in his head; other coaches at the club have
their own in theirs. Nothing is shared, sessions get planned from memory, good
drills get forgotten, and nobody records whether a drill actually worked with a
given group. A shared library fixes all four: any coach finds the right drill in
seconds, session planning becomes assembly rather than invention, drills are
explained visually instead of verbally, and post-session reviews make the library
smarter every week.

## Target users & use cases

Coaches at one rugby club — 6+ people across multiple teams (e.g. 1st XV, U16s).
Non-technical; phones and tablets are their primary devices, often used pitch-side.

Top jobs-to-be-done:
1. **"Find me a 12-player breakdown drill that only needs cones"** — search and
   filter the library, mid-planning or pitch-side.
2. **"Plan Tuesday's training"** — chain drills with timings into a team session
   plan and run training off a phone.
3. **"Remember what worked"** — after training, rate and annotate each drill so
   knowledge compounds instead of evaporating.

The one feature they can't live without: the tagged drill database. Everything
else hangs off it.

## v1 scope

**In (all of it, delivered in stages):**
- Shared club-wide drill library with rich tagging, search, and filtering
- Club → teams → coaches structure with email sign-in from day one
- Static 2D drag-and-drop diagrams: players, cones, balls on a pitch canvas
- Progressions attached to drills (variant chains: easier ↔ harder)
- Session plan builder: chain drills with timings, scoped to a team
- Post-session reviews: ratings + notes per drill, surfaced on the drill page
- Animated diagram playback: record movement paths, play the drill back

**Explicit non-goals for v1:**
- Importing from documents/spreadsheets (drills are entered fresh — optimize the
  add-drill flow instead)
- Public sharing outside the club
- Video upload or analysis
- Full offline editing (read-caching of recently viewed data only)
- Anything that costs money — free tiers only

## Future roadmap (6–12 months, sketch only)

- Onboarding polish: coach invites, admin vs coach roles, join-club flow
- Session templates and a season/block planning view
- Export & share: PDF session plans, shareable drill cards
- Attendance-aware planning (who's at training → filter drills by player count)
- Cross-club sharing or a public drill marketplace (maybe)
- Long shot: connect drill usage to match-performance data (Cam's separate
  GainlineIQ / RugbyEval projects)

## Tech stack & key decisions

Each decision's full rationale is in [`decisions.md`](decisions.md).

| Choice | Why (one line) |
|---|---|
| Expo (React Native + TypeScript) | Native touch feel on any coach's device; Cam has Expo Premium so EAS builds/updates are covered |
| Supabase (Postgres + Auth + Storage) | Free tier, built-in email auth, and already connected to Cam's Claude Code tooling |
| Row-Level Security (RLS) | The database itself enforces club/team permissions — no trust in client code |
| React Native Skia + Gesture Handler | The proven stack for a performant touch canvas: drag-and-drop now, animation playback later |
| Diagram scenes as JSONB documents | One `scene` JSON per diagram (elements, positions, later keyframe paths) — flexible, no schema churn as the designer evolves |
| EAS internal distribution | Coaches install builds without app-store review while iterating; store release is a later, optional step |

## Architecture sketch

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Expo app (iOS / Android)   │        │  Supabase (free tier)        │
│  ─ Expo Router screens      │  HTTPS │  ─ Auth (email)              │
│  ─ TanStack Query cache     │ ─────► │  ─ Postgres + RLS            │
│  ─ Skia diagram canvas      │        │  ─ Storage (images, later)   │
│  ─ supabase-js client       │        │                              │
└─────────────────────────────┘        └──────────────────────────────┘
```

Data model (v1 target — refined per stage):
- `clubs` → `teams` → `profiles` (coaches; role: admin | coach)
- `drills` (club-scoped): name, description, coaching points, category,
  skill focuses, min/max players, equipment, space, intensity, level, duration
- `diagrams`: drill_id + `scene` JSONB (elements, positions; keyframes in Stage 5)
- `progressions`: ordered drill variants (parent drill → easier/harder steps)
- `sessions` (team-scoped) → `session_items` (drill, order, minutes)
- `reviews`: session_item + rating + notes, surfaced on the drill page

## Staged roadmap

| Stage | Goal | Headline feature | Definition of done |
|---|---|---|---|
| 1 — Foundation | Working shared library | Drill database + tagging + search | A coach signs in on their phone, adds a tagged drill in <2 min; another coach finds it by filter |
| 2 — Diagrams | Every drill gets a picture | Touch drag-and-drop 2D designer | Build a pitch diagram with players/cones/balls on a phone/tablet, save to a drill, it renders in the library |
| 3 — Sessions | Plan Tuesday's training | Progressions + session builder | Chain 4 drills with timings into a team session plan and run training off a phone from it |
| 4 — Reviews | The library learns | Post-session reviews & notes | After training, rate/note each drill; notes surface next time anyone views that drill |
| 5 — Animation | Drills that move | Animated diagram playback | Record movement paths on a diagram and play the drill back as a smooth animation |

Stage detail policy: Stage 1 fully specified, Stage 2 moderately, Stages 3–5 are
sketches until we approach them (doc-rot prevention).

## Open questions & risks

1. **iOS distribution** — does Cam have an Apple Developer account ($99/yr)?
   Without it iPhone coaches can't install native builds. Tracked in `help.md`.
2. **Touch diagram editor complexity** — Stages 2 and 5 are the technical deep
   end. Mitigation: they're isolated stages; the app is useful without them.
3. **Offline reality** — is pitch-side signal good enough for read-caching to be
   sufficient? Revisit after real use at training.
4. **Auth method** — email+password vs magic link for non-technical coaches.
   Decide at Stage 1 (leaning password: no email-deliverability dependency at
   the pitch).
5. **Tag taxonomy drift** — the tag dimensions will evolve with use. Schema must
   allow adding dimensions/values without painful migrations.

## Glossary

- **Drill** — a single training exercise with tags, description, coaching points, and (later) a diagram.
- **Progression** — an ordered variant of a drill that makes it easier or harder.
- **Session plan** — an ordered, timed chain of drills for one team's training.
- **Review** — post-session rating + notes on how a drill ran.
- **Scene** — the JSON document describing a diagram: elements (player, cone, ball), positions, and (Stage 5) movement keyframes.
- **Club / Team / Coach** — one club contains teams (1st XV, U16s…); coaches belong to the club, sessions belong to a team.
- **RLS** — Row-Level Security; Postgres rules that decide per-row who can read/write.
- **EAS** — Expo Application Services; builds and distributes the app to coaches' devices.
