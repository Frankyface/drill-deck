# Stage 5 — Animation

## Goal
Drills that move. Extend Stage 2's diagram scenes with recorded movement paths
and a playback mode: players run their lines, the ball travels, the drill
explains itself on screen. The hardest feature in the app, deliberately last —
everything else already works without it.

_(Sketch by design — spec'd properly when Stage 4 nears completion. Expect a
technical spike before committing to an approach.)_

## Features (in build order)

- [ ] `feature-animated-playback.md` — record paths per element, play the
      drill back with timing

## Definition of done (testable checklist)

- [ ] On an existing diagram, Cam records movement: drag an element along its
      path, per phase/step; multiple elements can move in the same phase.
- [ ] Play button animates the whole drill smoothly (no stutter) on a phone,
      with pause and replay.
- [ ] Old static diagrams still render unchanged (scene schema versioning
      holds — no broken diagrams anywhere in the library).
- [ ] An animated drill can be shown full-screen to players huddled around a
      phone/tablet — the "show off the drill" moment that motivated the app.
