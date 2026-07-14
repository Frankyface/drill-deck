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

## 2026-07-13 — TestFlight build crashed instantly on launch (build #2)
**Why it failed:** `.env` is gitignored, so EAS cloud builds never receive it —
`EXPO_PUBLIC_SUPABASE_URL/KEY` were undefined at bundle time and the supabase
client factory's fail-fast throw killed the app 0.15s after launch (RCTFatal,
SIGABRT — TestFlight crash report confirmed a JS fatal). The build log had
warned: "No environment variables found for the 'production' environment."
Dev builds masked it because Metro on the PC loads the local .env.
· **Do instead:** keep the publishable URL/key registered as EAS project env
vars for ALL environments (production/preview/development) — done via
`eas env:create`, verify with `eas env:list --environment production` before
any store build. The fail-fast throw stays: it caught a real misconfiguration.

## 2026-07-13 — Animate mode crashed on device (TestFlight build 3)
**Why it failed:** canvas gesture callbacks are auto-workletized (run on the
Reanimated UI thread in release builds) and called `pxToMeters` — a plain JS
function with no 'worklet' directive. On-device that throws inside the UI
event worklet → unhandled worklet exception → SIGABRT. Invisible in browser
testing because web runs one JS thread — device-only crash class.
· **Do instead:** worklet side ships only raw numbers through runOnJS; do all
conversion/logic JS-side. Geometry helpers in scene/logic.ts now carry
'worklet' directives as belt-and-braces. RULE: any function transitively
called from a Gesture.* callback, useAnimatedStyle/useDerivedValue body, or
animation completion callback must have 'worklet' as its first statement or
be reached via runOnJS. An Opus audit swept all UI-thread call sites clean
(2026-07-13); re-audit after touching gesture/animation code.
