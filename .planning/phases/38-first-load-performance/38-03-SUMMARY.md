---
phase: 38-first-load-performance
plan: 03
subsystem: infra
tags: [github-actions, railway, cold-start, observability, cron, healthz]

requires:
  - phase: 30-bff-proxy-conversion
    provides: Railway-hosted Python backend reachable via `NEXT_PUBLIC_API_URL` and exposing `/healthz`

provides:
  - Standalone Node 22 cold-start measurement runner (`measure-coldstart.ts`)
  - GH Actions workflow for on-demand 10-sample measurement with 15-min idle windows
  - Conditional warmup cron workflow — shipped disabled, user activates after measuring
  - `coldstart-report.md` stub documenting the measurement procedure + warmup decision tree
  - Placeholder Playwright spec reserved for P04 activation

affects:
  - 38-04-PLAN.md (Playwright suite can extend `coldstart.spec.ts` once `@playwright/test` lands)
  - post-ship verification (`/gsd-verify-work 38` cannot close until `coldstart-report.md` TBDs filled)

tech-stack:
  added:
    - "Node --experimental-strip-types (zero-dep TypeScript execution in CI)"
  patterns:
    - "Workflow-driven percentile aggregation (script produces one SAMPLE_MS; shell for-loop + sort + sed compute p50/p95)"
    - "Conditional GH Actions cron: ship commented-out schedule block, user uncomments after measurement"
    - "Env-var indirection for workflow_dispatch inputs (security hardening against command injection)"

key-files:
  created:
    - frontend/tests/e2e/perf/measure-coldstart.ts
    - frontend/tests/e2e/perf/coldstart.spec.ts
    - .github/workflows/railway-coldstart-measure.yml
    - .github/workflows/railway-warmup.yml
    - .planning/phases/38-first-load-performance/coldstart-report.md
  modified:
    - frontend/eslint.config.mjs
    - .planning/phases/38-first-load-performance/38-VALIDATION.md

key-decisions:
  - "Used Node 22's built-in --experimental-strip-types instead of adding tsx as a devDependency"
  - "Shipped warmup workflow with schedule: block commented, manual activation path documented in coldstart-report.md"
  - "Split the 150-min measurement loop into Plan-execution-time (infra) vs human-runtime (the actual measurement) per D-A5 autonomous: false"

patterns-established:
  - "Repo's first scheduled GH Actions workflow — structurally a reference for future cron jobs"
  - "Human-decision-gated plan pattern: ship the infra, stub the report, document activation steps"

requirements-completed: []  # PERF-03 remains open until coldstart-report.md TBDs are filled by the user; see "Checkpoint: Human Decision" below.

duration: 8min
completed: 2026-04-21
---

# Phase 38 Plan 3: Railway Cold-Start Measurement + Conditional Warmup Summary

**Shipped zero-dependency measurement infrastructure and a pre-built warmup workflow (disabled by default) for PERF-03, plus a `coldstart-report.md` stub that a human will fill in after running the 150-min measurement loop.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-21T00:42:38Z
- **Completed:** 2026-04-21T00:50:20Z
- **Tasks:** 3 autonomous (infra) + 1 stubbed (human action)
- **Files created:** 5 | **Files modified:** 2

## Accomplishments

- **Measurement runner is zero-dep:** `measure-coldstart.ts` runs on stock Node 22 via `--experimental-strip-types`. No `tsx` / `ts-node` / `@playwright/test` installation needed for the measurement itself.
- **Measurement workflow is safe and hands-off:** `railway-coldstart-measure.yml` is `workflow_dispatch`-only, validates numeric inputs defensively, handles a 3-hour timeout ceiling, and uploads `samples.txt` as a build artifact with p50/p95 already computed inline.
- **Warmup workflow is pre-wired but dormant:** `railway-warmup.yml` ships with its `schedule:` block commented out. A single-line edit (removing `# ` from two lines) activates the 10-minute cron once the user has measured p95 > 2000 ms.
- **Report stub tells the next human exactly what to do:** `coldstart-report.md` contains the measurement spec, both Option A (GH Actions, recommended) and Option B (local) invocations, TBD placeholders for 10 samples + p50 + p95, and two mutually-exclusive decision checkboxes.

## Task Commits

1. **Task 1: Measurement script + Playwright placeholder** — `0650595` (feat)
2. **Task 2: Cold-start measurement GH Actions workflow** — `6a72a55` (feat)
3. **Task 3: Warmup cron workflow (disabled by default)** — `802e3f0` (feat)
4. **Task 4: `coldstart-report.md` stub** — `b78836c` (docs)
5. **Deviation: VALIDATION row update** — `e712c82` (docs)
6. **Deviation: ESLint exclusion for placeholder spec** — `ba8b528` (chore)

## Files Created/Modified

- `frontend/tests/e2e/perf/measure-coldstart.ts` (60 lines) — Node-only single-sample runner. Exit 0 + `SAMPLE_MS=<n>` on success; exit 1 with `FAIL ...` on timeout / non-2xx / network error.
- `frontend/tests/e2e/perf/coldstart.spec.ts` (40 lines) — `@ts-nocheck` placeholder; P04 activates it by installing `@playwright/test` and removing the top-of-file pragma + `test.skip` guard.
- `.github/workflows/railway-coldstart-measure.yml` (108 lines) — `workflow_dispatch`-only measurement workflow. N=10 × 15 min default; numeric-input validation; inline p50/p95 computation via `sort` + `sed` + `awk`.
- `.github/workflows/railway-warmup.yml` (42 lines) — Conditional cron. `workflow_dispatch` active; `schedule:` commented out; activation recipe in header comment.
- `.planning/phases/38-first-load-performance/coldstart-report.md` (119 lines) — Measurement procedure + TBD placeholders + decision checkboxes.
- `frontend/eslint.config.mjs` — Added `tests/e2e/perf/coldstart.spec.ts` to `ignores` so the `@ts-nocheck` pragma doesn't trigger `@typescript-eslint/ban-ts-comment`.
- `.planning/phases/38-first-load-performance/38-VALIDATION.md` — Rewrote the "Railway warmup cron activation decision" Manual-Only row to point at the shipped infra + report stub.

## Decisions Made

1. **`--experimental-strip-types` over `tsx`.** The plan's code sample used `pnpm exec tsx`, but the repo does not have `tsx` installed. Node 22.14.0 (verified locally; matches `node-version: "22"` in the workflow) supports `--experimental-strip-types` as a stable feature — zero new dependencies, same contract.
2. **Defensive input validation in the measurement workflow.** Even though `workflow_dispatch` inputs are collaborator-controlled, I added `[[ ... =~ ^[0-9]+$ ]]` guards + bounds (`N ∈ [1, 50]`, `IDLE ∈ [0, 60]`) to avoid footguns like accidentally setting `IDLE=1500` and burning 25 hours of Actions time.
3. **Env-var indirection for untrusted inputs.** Security-reminder hook surfaced the workflow-injection concern. `INPUT_SAMPLE_COUNT` and `INPUT_IDLE_MINUTES` are read from `env:` rather than interpolated directly into shell blocks.
4. **Inline percentile computation.** Computing p50/p95 in the workflow (rather than uploading raw samples and deferring the math) keeps the workflow log self-documenting — the `::notice::` annotation surfaces both percentiles at the top of the run summary.
5. **Warmup ships with `workflow_dispatch`.** Even though the cron is commented out, `workflow_dispatch` is kept active so the user can fire a one-off warmup ping from the UI to sanity-check the curl command works against their `NEXT_PUBLIC_API_URL` secret before enabling the schedule.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced `pnpm exec tsx` with `node --experimental-strip-types`**
- **Found during:** Task 2 (measurement workflow authoring)
- **Issue:** Plan action block referenced `pnpm exec tsx tests/e2e/perf/measure-coldstart.ts`, but `tsx` is not in `frontend/devDependencies`. Using `pnpm exec tsx` would fail with "command not found" on CI.
- **Fix:** Switched to Node 22's built-in `--experimental-strip-types` flag (stable from 22.6+). Matches the workflow's already-pinned `node-version: "22"`.
- **Files modified:** `.github/workflows/railway-coldstart-measure.yml`, `frontend/tests/e2e/perf/measure-coldstart.ts` (comment update only).
- **Verification:** Ran `NEXT_PUBLIC_API_URL=http://127.0.0.1:1 node --experimental-strip-types frontend/tests/e2e/perf/measure-coldstart.ts` locally — produced the expected `FAIL error=fetch failed elapsed=...` output.
- **Committed in:** `6a72a55` (Task 2).

**2. [Rule 3 - Blocking] Added `@ts-nocheck` + ESLint ignore for `coldstart.spec.ts`**
- **Found during:** Post-Task-3 lint run.
- **Issue:** The placeholder Playwright spec imports from `@playwright/test`, which isn't installed until P04. Without a `@ts-nocheck` pragma the TypeScript compiler cannot resolve the import; WITH the pragma, ESLint's `@typescript-eslint/ban-ts-comment` rule rejects it (`--max-warnings 0`).
- **Fix:** (a) Added `// @ts-nocheck` at the top of `coldstart.spec.ts`, (b) added the file to `eslint.config.mjs` ignores. Both `pnpm typecheck` and `pnpm lint` now pass.
- **Files modified:** `frontend/tests/e2e/perf/coldstart.spec.ts` (annotated), `frontend/eslint.config.mjs` (one ignore entry).
- **Verification:** `cd frontend && pnpm typecheck && pnpm lint` both green.
- **Committed in:** `ba8b528` (chore).

**3. [Rule 2 - Missing Critical] Added input-bounds validation to measurement workflow**
- **Found during:** Task 2 review against the security-reminder hook output.
- **Issue:** Plan's code sample had no validation of `sample_count` or `idle_minutes`. A collaborator typo (e.g. `IDLE=1500`) would run for 25+ hours against Actions minutes.
- **Fix:** Added regex + bounds checks (`N ∈ [1, 50]`, `IDLE ∈ [0, 60]`). Fails fast with `::error::` on invalid input.
- **Files modified:** `.github/workflows/railway-coldstart-measure.yml`.
- **Verification:** Shell arithmetic patterns are standard; YAML parses cleanly via `yaml.safe_load`.
- **Committed in:** `6a72a55` (Task 2; folded into the original task commit).

**4. [Rule 2 - Missing Critical] Env-var indirection for `workflow_dispatch` inputs**
- **Found during:** Task 2 post-write security-hook reminder.
- **Issue:** Direct `${{ github.event.inputs.* }}` interpolation into shell blocks is flagged as a workflow-injection risk.
- **Fix:** Promoted both inputs to job-level `env:` (`INPUT_SAMPLE_COUNT`, `INPUT_IDLE_MINUTES`); shell references them as `$INPUT_*`.
- **Files modified:** `.github/workflows/railway-coldstart-measure.yml`.
- **Verification:** YAML valid; shell still functions with env-var expansion.
- **Committed in:** `6a72a55` (Task 2).

---

**Total deviations:** 4 auto-fixed (2 Rule 3 blocking, 2 Rule 2 missing critical).
**Impact on plan:** All four were technical necessities — `tsx` not installed, `@ts-nocheck` required to satisfy BOTH tsc and ESLint, input validation and env-var indirection are security hardening that the plan's plain-text code block didn't specify. No scope creep; all stay within the PERF-03 boundary.

## Issues Encountered

- **`node_modules` not present in worktree.** Had to run `pnpm install --frozen-lockfile --prefer-offline` in the worktree's `frontend/` before `pnpm typecheck` would work. One-time setup; does not affect committed artifacts. Lockfile was unchanged.
- **ESLint flat-config error on `@ts-nocheck`.** Resolved via narrow ignore (only the one spec file). Left the rule active for the rest of the repo.

## User Setup Required

None for Plan 38-03 itself — infrastructure is fully committed. **However, PERF-03 is NOT satisfied until a human:**

1. Ensures `NEXT_PUBLIC_API_URL` is set as a GitHub Actions secret.
2. Triggers **GitHub → Actions → "Railway Cold-Start Measurement" → Run workflow** (default inputs).
3. Fills the 10 sample values + p50 + p95 into `.planning/phases/38-first-load-performance/coldstart-report.md`.
4. Checks ONE of the two decision boxes.
5. If `p95 > 2000 ms`: edits `.github/workflows/railway-warmup.yml` to uncomment the `schedule:` block + cron line, and commits as `chore(38-03): enable railway warmup cron (p95=<value>ms)`.

## Checkpoint: Human Decision

> This plan is intentionally `autonomous: false`. The measurement loop (~150 min wall-clock) and the warmup activation decision must be run by a human; Claude can prepare the infrastructure and the report template but cannot choose the outcome.

### How to run the measurement

**Option A — GitHub Actions (recommended).** Once `NEXT_PUBLIC_API_URL` is set as a repo secret, go to **GitHub → Actions → "Railway Cold-Start Measurement" → Run workflow**. Accept the defaults (N=10, IDLE=15). Wait ~150 min. Download `samples.txt` from the workflow run → Artifacts.

**Option B — Local.** Requires Node 22+:

```bash
export NEXT_PUBLIC_API_URL="https://uniboard-production.up.railway.app"
cd frontend
for i in 1 2 3 4 5 6 7 8 9 10; do
  echo "--- Sample $i of 10 ---"
  node --experimental-strip-types tests/e2e/perf/measure-coldstart.ts
  if [ "$i" -lt 10 ]; then sleep 900; fi
done
```

### How to interpret the result

Sort the 10 `SAMPLE_MS=` values ascending. p50 = 5th value; p95 = 10th value (for N=10, per-ceil convention).

- **If `p95 ≤ 2000 ms`:** Warmup remains disabled. `railway-warmup.yml` stays in its `workflow_dispatch`-only state. Check the first box in `coldstart-report.md`. Re-measurement suggested in 6 months or after a Railway plan change.
- **If `p95 > 2000 ms`:** Activate the warmup cron. In `.github/workflows/railway-warmup.yml`, remove the leading `# ` from **both** the `# schedule:` line AND the `#   - cron: "*/10 * * * *"` line. Commit as `chore(38-03): enable railway warmup cron (p95=<value>ms)`. Check the second box in `coldstart-report.md`.

### Phase-level blocker

`coldstart-report.md` currently has TBD placeholders. **Phase 38 cannot be fully verified (via `/gsd-verify-work 38`) until those TBDs are replaced with real numbers AND a decision box is checked.** The other three plans (38-01, 38-02, 38-04) can execute in parallel — cold-start warmup activation is independent of RSC prefetch and Playwright pixel-diff work.

## Next Phase Readiness

- **P01 / P02 / P04 unblocked.** This plan ships no runtime dependencies; prefetch and Playwright work proceeds independently.
- **PERF-03 remains OPEN.** Marked NOT in `requirements-completed` in frontmatter to reflect that the empirical measurement + warmup decision are still pending. When the human fills `coldstart-report.md`, they should then re-run `/gsd-verify-work 38`, which will update `requirements-completed` / REQUIREMENTS.md as appropriate.

---

## Self-Check: PASSED

Verified all claimed artifacts exist + all claimed commits are in the git history:

- `frontend/tests/e2e/perf/measure-coldstart.ts`: FOUND
- `frontend/tests/e2e/perf/coldstart.spec.ts`: FOUND
- `.github/workflows/railway-coldstart-measure.yml`: FOUND
- `.github/workflows/railway-warmup.yml`: FOUND
- `.planning/phases/38-first-load-performance/coldstart-report.md`: FOUND
- `frontend/eslint.config.mjs`: FOUND (modified)
- `.planning/phases/38-first-load-performance/38-VALIDATION.md`: FOUND (modified)
- Commit `0650595`: FOUND
- Commit `6a72a55`: FOUND
- Commit `802e3f0`: FOUND
- Commit `b78836c`: FOUND
- Commit `e712c82`: FOUND
- Commit `ba8b528`: FOUND

Verification commands green in this session:

- `cd frontend && pnpm typecheck` → clean
- `cd frontend && pnpm lint` → clean (with the narrow ignore for `coldstart.spec.ts`)
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/railway-coldstart-measure.yml'))"` → OK
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/railway-warmup.yml'))"` → OK
- `grep -q "^  # schedule:" .github/workflows/railway-warmup.yml` → match (warmup disabled by default)

---

*Phase: 38-first-load-performance*
*Plan: 03*
*Completed: 2026-04-21*
