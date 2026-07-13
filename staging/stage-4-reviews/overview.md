# Stage 4 — Reviews

## Goal
The library learns. After training, a coach rates and annotates each drill from
that session in under a minute; those notes surface on the drill page forever
after, so the next coach picks drills with the club's accumulated judgment
behind them.

_(Sketch by design — spec'd properly when Stage 3 nears completion.)_

## Features (in build order)

- [ ] `feature-session-reviews.md` — post-session rating + notes per drill,
      surfaced on drill pages

## Definition of done (testable checklist)

- [ ] After a session, a "review it" prompt walks through its drills: 1–5
      rating + optional note each, whole flow < 1 minute for a 5-drill session.
- [ ] A drill's detail page shows its review history (rating average + recent
      notes, with which team/date context).
- [ ] Library can sort/filter by rating ("club favourites").
- [ ] Reviews are attributed to the coach who wrote them.
