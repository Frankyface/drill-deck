# Failed Approaches — drill-deck

_Append-only graveyard of dead ends. Never prune this file — it is the project's
institutional memory of pain. `handoff.md` links here instead of carrying full
stories. Entry format:_

```markdown
## <date> — <What we tried>
**Why it failed:** <root cause> · **Do instead:** <the working direction, if known>
```

---

## 2026-07-13 — "Fixing" frozen animations that weren't broken
**Why it failed:** in the Claude browser-pane harness the page is a HIDDEN tab
(`document.visibilityState === 'hidden'`), so Chrome suspends
`requestAnimationFrame` entirely: Reanimated `withTiming` froze, a hand-rolled
rAF clock froze identically, screenshots timed out waiting for a frame, and it
looked exactly like a broken web animation stack. Two "fixes" were built and
reverted (rAF hybrid clock, disabling React Compiler) before checking
visibility. · **Do instead:** when animations appear dead in browser-pane
testing, check `document.visibilityState` and count rAF firings FIRST; treat
visual playback as device-verification territory.

## 2026-07-13 — Expo static web output with supabase-js
**Why it failed:** `web.output: "static"` server-renders routes in Node during
dev; the Supabase auth client touches browser storage at import → the dev
server dies with exit 7 deep in router-server rendering. · **Do instead:**
`web.output: "single"` for authenticated apps (docs/decisions.md).

## 2026-07-13 — onLayout-driven canvas sizing
**Why it failed:** a zero-height wrapper whose child only renders after
onLayout reports a width never got the callback on web → canvas permanently
empty on direct URL loads. · **Do instead:** derive canvas width from
`useWindowDimensions()` — deterministic on native and web.

## 2026-07-13 — Windows launch.json paths for the preview server
**Why it failed:** spaces in "C:\Program Files\...npm" and in the project path
break the preview harness's unquoted spawn; literal backslashes got eaten too.
· **Do instead:** 8.3 short names with FORWARD slashes (e.g.
`C:/Users/Cam/DOCUME~1/CLAUDE~1/DRILL-~1`) and `npm --prefix <shortpath> run <script>`.

## 2026-07-13 — REST signups for test accounts
**Why it failed:** free-tier Supabase email is rate-limited (~2/hour) and
"Confirm email" defaults ON, so the second test signup 429'd. · **Do instead:**
create test users in SQL (auth.users + auth.identities with extensions.crypt)
— the profile trigger fires the same either way; delete them when done.
