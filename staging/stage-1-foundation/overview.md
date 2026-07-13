# Stage 1 — Foundation

## Goal
The working shared drill library: an Expo app talking to Supabase where any
coach at the club signs in on their own phone, adds a fully-tagged drill in
under 2 minutes, and finds drills by search and filter. This is the backbone —
every later stage (diagrams, sessions, reviews, animation) hangs off it.

## Features (in build order)

- [ ] `feature-project-setup.md` — Expo app + Supabase project exist and talk to each other
- [ ] `feature-auth-and-club-structure.md` — coaches sign in; club → teams → profiles with RLS
- [ ] `feature-drill-crud.md` — add / edit / archive drills with the full tag set, fast on mobile
- [ ] `feature-search-and-filter.md` — browse, search, and filter the library

## Definition of done (testable checklist)

- [ ] `npx expo start` boots the app with zero errors; it loads on Cam's
      physical phone (Expo Go or dev build).
- [ ] Cam signs in with email on his phone; signing out and back in works.
- [ ] The club exists with at least 2 teams; Cam's profile has the admin role.
- [ ] A second, non-admin coach account can sign in and sees the same library.
- [ ] Cam adds a drill with every tag dimension filled on his phone in under
      2 minutes (timed).
- [ ] A drill added by account A is immediately visible to account B; a
      logged-out client can read nothing (RLS verified with a real query).
- [ ] Filtering by category, player count, equipment, and skill focus each
      return correct results against seeded test drills; text search matches
      name and description.
- [ ] All four feature files below are `verified done` with dated evidence in
      their Verification Logs.
