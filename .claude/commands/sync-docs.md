Sync all drill-deck docs to reality. (Natural-language trigger: Cam says
"update all relevant files".)

1. **Review what actually happened this session** — what changed, what was
   decided, what got built, what failed. Record only reality: if something
   wasn't verified, do not record it as working.
2. **Update, as needed:**
   - `handoff.md` — ALWAYS. Rewrite every section in place (Goals, Current
     State, Files, Changed, Watch Out, Next Up, Pointer). Enforce the budget:
     ≤ 60 lines total; "Things I've Changed" keeps only the last 5, newest
     first; "Watch Out" at most 3 one-liners, each pointing into
     `docs/failed-approaches.md`. If over budget, compressing it is part of
     the sync, not optional.
   - Active **feature files** — Status per the state machine (`verified done`
     requires a Verification Log entry — no exceptions); resolve or append
     Open Questions.
   - Stage **overview.md** — if scope, done-criteria, or a feature status
     changed.
   - `docs/decisions.md` — append decisions made this session (what, why,
     rejected alternatives, revisit-trigger).
   - `docs/failed-approaches.md` — append dead ends (root cause + do instead).
   - `docs/master_plan.md` — only if the vision/roadmap genuinely changed.
   - `CLAUDE.md` — only if a rule, convention, or stack fact changed.
   - `new_session_prompt.md` / `.claude/commands/resume.md` — if the resume
     procedure changed.
   - `help.md` — new human to-dos appeared or old ones completed.
3. **Infer relevance yourself** — don't quiz Cam with a checklist; decide what
   changed and update those files.
4. **Integrity check:** handoff's pointer resolves to a real stage folder +
   feature file; handoff ≤ 60 lines; every `verified done` feature has
   Verification Log evidence; no file left mid-edit.
5. **Report back in 3–5 lines:** which files changed and why, plus anything
   deliberately NOT updated.
6. Offer to commit: `docs: sync session state`.
