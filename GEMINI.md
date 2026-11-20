# GEMINI.md — Standing Rules for the Setu Build

**Project:** Setu — Commitment Confidence Engine for FPOs
**Version being built:** **Setu v1.0 "Pramaan"** (the proof release)
**Agent:** Antigravity · Gemini 3 Flash · high-usage mode
**Repo owner:** JanardhanS56 · janardhans2416@gmail.com

> This file is the law. It outranks any habit, any default, any "helpful" instinct.
> If an instruction from the user in chat conflicts with a rule here, **ask the user
> to confirm the override in writing before acting.** Do not silently deviate.

---

## 0. The one-line mission

> **Build v1.0 "Pramaan": a system that tells an FPO how much it is allowed to promise
> a buyer — with a confidence level that is empirically proven, not asserted.**

The UI is the shop window. **The coverage backtest is the goods.** Never trade the
goods for the window.

---

## 1. Mandatory read order — every new chat, before anything else

Read these in this exact order. Do not skip. Do not summarise them back in full.

| # | File | Why |
|---|---|---|
| 1 | **`LOGBOOK.md`** → read `## CURRENT STATE` block + last 3 `## HISTORY` entries **only** | Instant context. What's done, what's next, what broke. |
| 2 | **`context.md`** | Product truth, hard rules, glossary, stack |
| 3 | **`plan_and_phases.md`** | Execution order and current phase tasks |
| 4 | **`design.md`** → read only the sections relevant to the current phase | Build spec |
| 5 | **`expected_output.md`** → read only the acceptance criteria for the current phase | The definition of done |

**Context economy rule:** On a resumed chat, do **not** re-read the whole repository
and do **not** re-read all of `design.md`. `LOGBOOK.md` is your memory. Trust it,
verify only what you are about to touch.

---

## 2. Non-negotiable product rules

These are from `context.md` §3. They are not negotiable at any phase.

1. **Never emit a bare point estimate as a primary output.** Every forecast shown to a
   user carries an interval **and** a confidence level.
2. **Never emit a confidence level that has not been validated** by the coverage
   backtest on held-out data. If the gate is closed, return `409`. No exceptions.
3. **Never automate a contract commitment.** The engine recommends. A human verifies.
   Any AMBER/RED override requires a non-empty reason and an actor — enforced
   **server-side**, not just in the UI.
4. **Never hide why.** Every suggestion surfaces 2–3 plain-language drivers.
5. **Never silently narrow an interval.** Thin data → wider interval → `low_information`
   flag. Wide and honest is correct behaviour. Narrow and false is a defect.
6. **Every suggestion is reproducible.** Store `model_version`, `calibration_version`,
   `feature_version`, `input_hash` with every suggestion row.

---

## 3. Non-negotiable build rules

### 3.1 Phase order is law
```
P0 Scaffold & data → P1 Ingest → P2 Forecaster → P3 Conformal+Backtest
→ P4 Decision+Explain → P5 API+Audit → P6 Frontend → P7 Hardening
```
- Work **one phase at a time**. Do not start Phase N+1 before Phase N's acceptance
  criteria pass.
- **Phase 3 is the critical path.** If the user is short on time, ship P0–P5 with a
  minimal static card and defer P6 polish. **Never ship without P3.**
- If tempted to build the frontend early: stop. Note it in `NOTES.md`. Continue the phase.

### 3.2 Surgical edits, not rewrites
- Edit the smallest possible unit. Do not regenerate a whole file to change one function.
- Never delete working code to "clean up" unless the task says so.
- Never introduce a dependency not already in `context.md` §7 without asking.
- Every new file must be justified by a task in `plan_and_phases.md`.

### 3.3 Tests are part of the task, not a follow-up
- A task is not done until its test exists and passes.
- The most important test in the repo is `test_conformal.py` (coverage within ±0.05
  across 200 seeds, aggregate pass-rate ≥ 95%). Protect it.
- Never weaken a test to make it pass. If a test is wrong, fix the test and say why
  in the logbook.

### 3.4 Config, not constants
- Every tunable (nominal levels, gate tolerance, min calibration size, min train rows)
  lives in `backend/app/config.py`. Hardcoded magic numbers in logic are a defect.

### 3.5 Scope discipline
- Anything not in `expected_output.md` §1 is **out of scope**.
- Park out-of-scope ideas in `NOTES.md` under `## Deferred`. One line each. Do not build them.
- Explicit non-goals are listed in `design.md` §13 and `expected_output.md` §7. Read them
  before adding "just one small feature."

---

## 4. LOGBOOK.md — your context memory

`LOGBOOK.md` at repo root is **the agent's persistent memory across chats.**
A brand-new chat must be able to resume in under 60 seconds by reading only the
`CURRENT STATE` block and the last 3 `HISTORY` entries.

### 4.1 Structure (maintain exactly)

```markdown
# LOGBOOK — Setu v1.0 "Pramaan"

<!-- AGENT: Read only CURRENT STATE + last 3 HISTORY entries on chat start. -->

## CURRENT STATE
_Last updated: <ISO-8601 UTC> · HEAD: <short-sha>_
- **Phase:** <N — name> (<in progress | complete>)
- **Completed phases:** <list>
- **Next task:** <single, specific, checkbox from plan_and_phases.md>
- **Tests:** <X passing / Y failing> · core coverage: <Z%>
- **Backtest gate:** <crop: OPEN/CLOSED, empirical coverage>
- **Files hot right now:** <3–6 paths>
- **Known issues / blockers:** <bullets or "none">
- **Open questions for the user:** <bullets or "none">

---

## HISTORY (append-only, newest at bottom)

### <ISO timestamp> · Phase <N> · <checkpoint title>
- **Did:** <2–4 bullets>
- **Files:** <paths>
- **Commits:** `<sha>` <msg>, `<sha>` <msg>, ...
- **Decisions:** <anything a future agent would otherwise re-litigate>
- **Deferred:** <moved to NOTES.md, one line each>
- **Next:** <the very next action>
```

### 4.2 When to write the logbook

- **After every 3–5 micro-commits**, OR at a phase boundary, **whichever comes first**,
  write one `HISTORY` entry and update `CURRENT STATE`.
- Commit that update as its own commit:
  `docs(logbook): checkpoint phase <N> — <one-line summary>`
- The checkpoint commit lists the hashes of the preceding batch of micro-commits.

### 4.3 Logbook rules

- **Append-only** in `HISTORY`. Never rewrite past entries. If something was wrong,
  say so in a new entry.
- `CURRENT STATE` is the only block that gets rewritten in place.
- **No prose padding.** Bullets. Paths. Hashes. Decisions. A future agent reads this
  under time pressure.
- **Record decisions, not just actions.** "Chose MAPIE over hand-rolled conformal
  because X" is worth more than "wrote conformal.py".
- If you finish a phase and the logbook is not updated, **the phase is not finished.**

---

## 5. Git & GitHub protocol

### 5.1 Identity (set once, in the repo)

```bash
git config user.name  "JanardhanS56"
git config user.email "janardhans2416@gmail.com"
```

Confirm with `git config --list --local | grep user`. If the global identity differs,
the **local** config wins — verify it is set locally.

### 5.2 Micro-commits — the core discipline

- **One logical unit of work = one commit.** Not one phase. Not one file. One task.
- Commit after each completed task in `plan_and_phases.md` — typically **5–12 commits
  per phase**.
- Commit **before** starting anything risky. Commit **after** anything green.
- Never bundle an unrelated fix into a feature commit.

**Message format (Conventional Commits, phase-tagged):**

```
<type>(phase-<N>): <imperative summary, <= 60 chars>

<body: what & why, 1-3 lines, optional>
```

Types: `feat` · `fix` · `test` · `refactor` · `docs` · `chore` · `perf`

Examples:
```
feat(phase-0): scaffold monorepo and config
feat(phase-0): deterministic synthetic data generator
test(phase-0): assert generator reproducibility on fixed seed
feat(phase-3): asymmetric split conformal quantile module
test(phase-3): coverage within ±0.05 across 200 seeds
fix(phase-3): widen interval when calibration n < 30
docs(logbook): checkpoint phase 3 — conformal + backtest green
```

### 5.3 Remote & push

- Remote name: `origin`.
- Target repo: **`github.com/JanardhanS56/setu-pramaan`**
- On first setup, verify:
  ```bash
  git remote -v
  ```
  - If `origin` exists and points to the Setu repo → proceed.
  - If no remote → **stop and ask the user** for the repo URL, or offer:
    `gh repo create JanardhanS56/setu-pramaan --private --source=. --remote=origin`
- **Push cadence:**
  - Push at **every phase boundary** (mandatory).
  - Push at least **once per working session**.
  - Never force-push. Never rewrite pushed history.
  - If push fails (auth/network), commit locally, note it in `CURRENT STATE`
    under `Known issues`, and tell the user. Do not silently continue without flagging.

### 5.4 Never do
- `git push --force` · `git reset --hard` on pushed commits · `git commit --amend` on
  a pushed commit · deleting branches the user did not ask you to delete.

---

## 6. Testing protocol

| When | What |
|---|---|
| Every task | Its own unit test exists and passes |
| End of every phase | Full suite green, no skips |
| Phase 3 | Coverage test across 200 seeds, aggregate pass-rate ≥ 95% |
| Before any push | `pytest -q` clean |

Rules:
- Run tests **before** claiming a task is done.
- If a test fails, fix the cause, not the assertion. If the assertion is genuinely
  wrong, change it and explain in the logbook.
- Never mark a task complete with a failing or skipped test.

---

## 7. Communication protocol with the user

Keep it **terse and scannable**. Gemini 3 Flash at high usage tends to over-produce —
resist that.

**Before a phase begins — a short plan, not an essay:**
```
PHASE <N> — <name>
Gate in:  <what must already be true>
Tasks:    <numbered, from plan_and_phases.md>
Gate out: <acceptance criteria IDs: ACx, ACy>
Proceeding.
```

**After each micro-commit — one line:**
```
✓ <task> — `<short-sha>` <commit message>
```

**At a phase boundary — a compact report:**
```
PHASE <N> COMPLETE
Acceptance: ACx ✓  ACy ✓  ACz ✓
Tests:      <X passed, 0 failed> · core cov <Z%>
Backtest:   <crop> coverage <empirical> @0.80 [PASS/FAIL]
Commits:    <count> · pushed to origin: <yes/no>
Logbook:    checkpoint written `<sha>`
Next:       Phase <N+1> — <name>
Blockers:   <none | list>
```

**When to stop and ask (never guess):**
- A design decision that changes the data model
- A missing remote / auth failure
- A test that cannot pass without changing product behaviour
- Any temptation to widen scope
- Any conflict between `GEMINI.md` and the chat instruction

---

## 8. Stop conditions — halt and report

Stop immediately and report to the user if:

1. The **backtest gate is failing** and you cannot make it pass honestly within the
   phase. Do not widen intervals artificially to hit coverage.
2. A hard rule in §2 would be violated to satisfy a request.
3. The synthetic data cannot produce a genuinely AMBER-able contract (the demo has no story).
4. You are about to touch more than ~3 files in one commit outside a scaffold phase.
5. You catch yourself rewriting a working file from scratch.
6. You have made 3 consecutive failed attempts at the same fix.

---

## 9. Definition of done for v1.0 "Pramaan"

Ship when **all** of these are true:

- [ ] `bash scripts/demo.sh` runs end-to-end in under 5 minutes on a clean clone
- [ ] `pytest -q` is green; core coverage ≥ 70%
- [ ] Conformal coverage test passes at ≥ 95% across 200 seeds
- [ ] Backtest CLI prints PASS lines for at least 2 of 3 crops at nominal 0.80
- [ ] Readiness Card renders a real AMBER contract with range, risk, drivers, versions
- [ ] Override without a reason is rejected by the **API** (422), not just the UI
- [ ] Audit log shows every suggestion and decision with input hash
- [ ] `LOGBOOK.md` `CURRENT STATE` reads "Phase 7 complete · v1.0 shipped"
- [ ] All commits pushed to `origin`
- [ ] `NOTES.md` lists every deferred idea

---

## 10. Quick reference card

```
READ FIRST      LOGBOOK.md → context.md → plan_and_phases.md → (design/expected: current phase only)
ONE PHASE       at a time. P3 is the critical path.
ONE COMMIT      per task. conventional + (phase-N). push at phase boundary.
ONE TEST        per task. run before claiming done.
LOGBOOK         update every 3-5 commits or at phase end. append-only HISTORY.
NEVER           point estimate alone · unvalidated confidence · auto-commit contracts ·
                hidden drivers · silent interval narrowing · force-push · scope creep
ALWAYS          wide-and-honest over narrow-and-false
STOP AND ASK    on data-model changes, auth failures, rule conflicts, scope temptation
```