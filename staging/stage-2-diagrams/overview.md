# Stage 2 — Diagrams

## Goal
Every drill gets a picture. A touch-first 2D designer where a coach drags
players, cones, and balls onto a pitch canvas and saves the diagram to a drill.
The scene format built here is the foundation Stage 5's animation extends —
get the data model right, keep the tooling simple.

_(Moderate detail by design — fully spec'd when Stage 1 is verified done.)_

## Features (in build order)

- [ ] `feature-diagram-designer.md` — the touch canvas: place, move, style, save
- [ ] Diagram rendering in the library — detail screens and cards show the
      diagram (thumbnail on cards); split into its own feature file when the
      stage is spec'd properly.

## Definition of done (testable checklist)

- [ ] On a phone or tablet, Cam builds a real drill's diagram — pitch markings,
      ≥6 players in two colours, cones, a ball — in under 5 minutes.
- [ ] Elements can be added, dragged, rotated where sensible, and deleted;
      undo works for at least the last 10 actions.
- [ ] Saved diagram round-trips: close the app, reopen, the scene re-renders
      identically from its stored JSONB.
- [ ] The drill detail screen shows the diagram; the library card shows a
      thumbnail without noticeable scroll jank.
- [ ] Arrows/paths can be drawn to show movement direction (static arrows —
      actual animation is Stage 5).
