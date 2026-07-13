Run drill-deck's verification protocol on the active feature.

1. Read `handoff.md` → follow the **🔗 Pointer** → open the active feature file.
2. **Claim:** state which Success Criteria you believe are now satisfied.
3. **Test:** execute the feature's **How We'll Verify** steps for real — run
   the commands, exercise the app end-to-end the way a coach would. "It
   compiles", "the code looks right", and "the tests I just wrote pass" do not
   count on their own. If a step needs Cam's device or account, stop, ask him
   to do that step, and wait for his report.
4. **Evidence:** append a dated entry to the feature's **Verification Log**:
   what was run and the actual output/result (real command output, screenshot
   file paths, or Cam's confirmation quoted).
5. **Status:** apply the state machine
   `not started → in progress → awaiting verification → verified done`:
   - **Pass** → set `verified done`, tick the satisfied criteria, update the
     stage's `overview.md` checklist.
   - **Fail** → status stays `in progress`; record the failure; if it was a
     dead end, append the story to `docs/failed-approaches.md`.
   - **Blocked on Cam** (missing account/key/device) → status stays
     `awaiting verification`; add the blocker to `help.md` and tell him.

Rules: a feature with an empty Verification Log can never be `verified done`.
Never weaken Success Criteria to make them pass — changing criteria requires
Cam's explicit sign-off plus a `docs/decisions.md` entry.
