---
phase: 39-design-token-foundation
plan: 04
subsystem: ui
tags: [motion, transition-migration, sed-sweep, eslint-enforcement, deferred-visual-baselines]

# Dependency graph
requires:
  - phase: 39-design-token-foundation/plan-01
    provides: oklch color tokens, 8-point spacing scale, @supports fallback layer
  - phase: 39-design-token-foundation/plan-02
    provides: 4-tier typography scale, TYPO-USAGE.md
  - phase: 39-design-token-foundation/plan-03
    provides: Motion tokens (--motion-fast/base/slow + --ease-claude-out), SSE keyframes (streaming-cursor-blink + streaming-chunk-fadein), v2.0 legacy ease aliases (D-14), prefers-reduced-motion stub (Q5), ESLint no-restricted-syntax rule (D-16), 5 Wave 0 test/spec scaffolds
provides:
  - "Zero raw transition-{all|colors} duration-{N|[Xs]} occurrences in frontend/{app,components} — 56 occurrences across 36 files migrated to var(--motion-fast|base|slow) + var(--ease-claude-out) arbitrary properties"
  - "Zero Form C transition-[<property>] duration-N occurrences — 21 cases across 14 files migrated (auth/settings/digest/deadlines/predict/layout/setup/timetable)"
  - "Zero adjacent ease-in-out conflicts with --ease-claude-out — 8 cases in setup/* files plus 1 follow-up Form C variant cleared"
  - "Wave 0 lint sweep test (frontend/__tests__/lint/no-raw-transition.test.ts) turned GREEN — 2/2 it() blocks now report 0 violations on recursive walk of frontend/{app,components}"
  - "ESLint no-restricted-syntax rule enforces zero raw transitions going forward — pnpm lint exits 0 with rule active"
  - "Test fixture override added in eslint.config.mjs for __tests__/eslint/no-raw-transition.test.ts — its intentional violation strings no longer fail the project lint while preserving the rule everywhere else"
  - "Reworded ESLint rule error message to remove `var(--motion-fast|base|slow)` literal — eliminated Tailwind CSS optimizer warning during build"
affects: [40-shared-components, 40-shared-streaming, 41-states-a11y, 42-newvis, 43-dark-mode]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BSD sed migration playbook for macOS Intel: `sed -i '' -E` with `[[:>:]]` for word-boundary-end (BSD does NOT support \\b — known Pitfall 1 amplified by direct verification)"
    - "Commit-before-cleanup discipline (RESEARCH §Q3): sed pass committed atomically before manual edge-case edits so the diff is PR-reviewable as a pure mechanical transform, then manual edits as a separate atomic commit"
    - "Form C supplementary sed playbook: `transition-\\[<property>\\] duration-{N|[Xs]}` migrated via 4 additional passes preserving the property list (sed regex `(transition-\\[[^]]+\\]) duration-{NNN|[Xs]}`); sed handles uniformly-shaped Form C just as well as Form A/B"
    - "ESLint test-fixture override pattern: when a TDD spec for a no-restricted-syntax rule contains the rule's own forbidden patterns as fixture strings, scope an `off` override to the test file alone (one-file glob in eslint.config.mjs files: array)"
    - "Tailwind CSS optimizer warning avoidance: bracket-form Tailwind class strings inside ESLint rule message literals can be parsed as classNames and emit CSS warnings. Reword the message to use prose (`mapped to var(...)`) instead of literal class syntax"

key-files:
  created:
    - .planning/phases/39-design-token-foundation/39-04-SUMMARY.md
    - .planning/seeds/SEED-39-playwright-baselines.md
  modified:
    # 36 sed-target files (Task 1 commit)
    - frontend/components/auth/LanguageSwitcher.tsx
    - frontend/components/auth/LoginForm.tsx
    - frontend/components/auth/PasswordStrengthMeter.tsx
    - frontend/components/auth/RegisterForm.tsx
    - frontend/components/course-detail/AssessmentRow.tsx
    - frontend/components/course-detail/MaterialItem.tsx
    - frontend/components/dashboard/CourseGradesTable.tsx
    - frontend/components/dashboard/DeadlineTimeline.tsx
    - frontend/components/dashboard/MiniCalendar.tsx
    - frontend/components/dashboard/RecentActivity.tsx
    - frontend/components/deadlines/DeadlineCard.tsx
    - frontend/components/deadlines/DeadlineTitleRow.tsx
    - frontend/components/digest/DigestFilterBar.tsx
    - frontend/components/digest/DigestPage.tsx
    - frontend/components/digest/DigestTitleRow.tsx
    - frontend/components/layout/Header.tsx
    - frontend/components/layout/NotificationPanel.tsx
    - frontend/components/layout/Sidebar.tsx
    - frontend/components/predict/PredictAssessmentTable.tsx
    - frontend/components/settings/DangerZoneSection.tsx
    - frontend/components/settings/GpaTargetSection.tsx
    - frontend/components/settings/LanguageSection.tsx
    - frontend/components/settings/NotificationsSection.tsx
    - frontend/components/settings/ProfileSection.tsx
    - frontend/components/settings/SettingsNav.tsx
    - frontend/components/settings/SettingsQuickActions.tsx
    - frontend/components/settings/TokensSection.tsx
    - frontend/components/setup/StepIndicator.tsx
    - frontend/components/setup/SuccessStep.tsx
    - frontend/components/setup/TokenInput.tsx
    - frontend/components/setup/TokenStep.tsx
    - frontend/components/setup/TutorialStep.tsx
    - frontend/components/setup/WelcomeStep.tsx
    - frontend/components/shared/FeedbackButton.tsx
    - frontend/components/timetable/TimetablePage.tsx
    - frontend/components/timetable/TimetableTitleRow.tsx
    # 21 Task 2 files (some overlap with above — Form C / ease-in-out / config edits)
    - frontend/components/auth/ForgotPasswordForm.tsx
    - frontend/components/auth/SuccessOverlay.tsx
    - frontend/components/auth/UpdatePasswordForm.tsx
    - frontend/components/digest/DigestHistoryCard.tsx
    - frontend/components/digest/HighlightItem.tsx
    - frontend/components/predict/PredictCard.tsx
    - frontend/components/timetable/TimetableDeadlineOverlay.tsx
    - frontend/components/timetable/TimetableEvent.tsx
    - frontend/eslint.config.mjs

key-decisions:
  - "BSD sed `\\b` non-support handled mid-execution: the canonical RESEARCH §Code Example 4 uses `\\b` for word-boundary-end which is a GNU sed extension. First run produced 0 replacements on macOS Intel. Switched to `[[:>:]]` (BSD POSIX-extended) which correctly matched `duration-150[[:>:]]` as `duration-150` followed by non-word-char, including space. Pre/post counts confirm: 51+5 -> 0+0."
  - "User chose to defer Task 3 (Playwright visual baselines) to production visual UAT instead of generating local baselines. Rationale: avoids local credential setup friction; user will visually verify transition migration on Vercel preview after PR ships. ESLint rule continues to enforce no-raw-transitions going forward, so future regressions blocked at lint time even without pixel-diff baselines."
  - "MOTION-01 status set to **partial** (NOT complete) per user instruction. Sweep + ESLint enforcement are done (the sweep itself is the visible mechanical work); pixel-diff regression coverage is deferred (the visual safety net D-11 specified). Remediation tracked via SEED-39-playwright-baselines.md. The task-3 spec at frontend/tests/e2e/phase39-transition-parity.spec.ts remains in-tree as an env-gated stub — auto-skips when PERF_TEST_PASSWORD is unset (correct behavior)."
  - "Form C scope was larger than RESEARCH-predicted: PLAN-39-04 named '6 manual edge cases' but actual count was 21 Form C + 8 ease-in-out adjacency + 1 follow-up = 30 individual touches. Sed handled Form C as cleanly as Form A/B because the property list inside `transition-[<property>]` is already a uniform shape — generalized the sed playbook to 4 supplementary passes (Form C duration-150/300/[0.14s|0.15s]/[400ms]) rather than hand-edit each one."
  - "ESLint test-fixture file required `no-restricted-syntax: off` override scoped to `__tests__/eslint/no-raw-transition.test.ts` alone — that file's whole purpose is to TDD the rule, so its 5 fixture strings (shortcut/bracket/migrated/template-literal cases) intentionally include the forbidden pattern. Without the override, `pnpm lint` would never pass after plan-3 installed the rule. Added as a separate flat-config block per ESLint flat-config conventions."
  - "Tailwind CSS optimizer warning resolution: the rule's error message contained the literal substring `[transition-duration:var(--motion-fast|base|slow)]` which Tailwind v4's class scanner picked up as a candidate className with `|` separator and emitted `Unexpected token Delim('|')` warning. Reworded message to plain prose to eliminate the warning. Build now exits 0 with zero warnings."

patterns-established:
  - "BSD sed `[[:>:]]` for word-boundary-end on macOS Intel — propagate this pitfall fix to RESEARCH §Pitfall 1 for any future `--mode-fixing` sed playbook"
  - "Deferred-work tracking via SEED-NN-<topic>.md: when a task within a plan is deferred (vs skipped), file a seed with explicit trigger conditions, effort estimate, and dependencies. Keeps the deferred item discoverable on next milestone kickoff (`/gsd-review-backlog` will surface it)."
  - "Test-fixture ESLint override scoping: the test that validates a no-restricted-syntax rule must be exempted from the rule itself, scoped to one file via flat-config files: glob"
  - "ESLint message literal hygiene: error messages should not contain Tailwind-shaped substrings (bracket-form arbitrary properties with separator tokens). Use prose (`mapped to var(...)`) instead of literal class samples to avoid CSS optimizer false positives"

requirements-completed: []
requirements-partial: [MOTION-01]
requirements-partial-note: "MOTION-01 sweep + ESLint enforcement complete (zero raw transitions remain in source; rule blocks future regressions in CI). Pixel-diff visual regression coverage (D-11 success criterion) deferred to production visual UAT per user decision — see Deferred Work section + SEED-39-playwright-baselines.md."

# Metrics
duration: 16min
completed: 2026-04-30
---

# Phase 39 Plan 04: Transition Migration Sweep + Visual Regression Baselines (deferred) Summary

**56 raw `transition-{all|colors} duration-{N|[Xs]}` className occurrences (across 36 files) plus 21 Form C `transition-[<property>] duration-N` cases (across 14 files) plus 8 conflicting `ease-in-out` adjacencies migrated to motion tokens (`var(--motion-fast|base|slow)` + `var(--ease-claude-out)`) via a 9-pass BSD sed playbook (5 base + 4 Form C supplementary) plus 1 manual follow-up edit. Wave 0 RED lint sweep test (`__tests__/lint/no-raw-transition.test.ts`) turned GREEN. ESLint `no-restricted-syntax` rule from plan-3 now enforces zero raw transitions in CI going forward. `pnpm lint` and `pnpm build` both exit 0 with zero warnings. Task 3 (Playwright visual regression baselines) **deferred to production visual UAT** per user decision; tracked in `SEED-39-playwright-baselines.md` for future closure.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-04-30T11:14:40Z
- **Completed:** 2026-04-30T11:31:00Z (excluding deferred Task 3)
- **Tasks:** 2 of 3 complete; Task 3 deferred
- **Files touched:** 47 unique (36 sed-target + 14 Form C overlapping ones counted once + eslint.config.mjs + this SUMMARY + new seed file)

## Accomplishments

### Task 1 — Bulk sed sweep (commit `40b6501`)

5-pass BSD sed playbook over `frontend/{app,components}/**/*.tsx`:

| Pass | Pattern | Tier | Occurrences |
|------|---------|------|-------------|
| 1 | `transition-{all\|colors} duration-150` | `--motion-fast` | ~30 |
| 2 | `transition-{all\|colors} duration-200` | `--motion-fast` (closest) | ~5 |
| 3 | `transition-{all\|colors} duration-300` | `--motion-base` | ~16 |
| 4 | `transition-{all\|colors} duration-[0.14s\|0.15s]` | `--motion-fast` | ~3 |
| 5 | `transition-{all\|colors} duration-[0.28s]` | `--motion-base` | ~2 |

**Pre/post grep counts** (all on `frontend/{app,components}`):
- Shortcut form `transition-(all\|colors)\s+duration-[0-9]`: **51 → 0**
- Bracket form `transition-(all\|colors)\s+duration-\[[^\]]+\]`: **5 → 0**
- 36 files now contain `var(--motion-*)` token references

**BSD sed correction (mid-execution):** Original RESEARCH playbook used `\b` word-boundary; on macOS Intel this is unsupported and the first 5-pass run produced 0 replacements. Replaced `\b` with BSD POSIX `[[:>:]]` (word-boundary-end). Re-run successful. Documented in commit message + this SUMMARY for future plan reference.

### Task 2 — Manual edge cases + ESLint test override (commit `29f6cf9`)

Three categories of cleanup:

1. **Form C — `transition-[<property>] duration-N`**: 21 occurrences across 14 files, migrated via 4 supplementary sed passes (Form C 150/300/[0.14s|0.15s]/[400ms]). Files affected: `auth/{ForgotPasswordForm,LoginForm,RegisterForm,SuccessOverlay,UpdatePasswordForm}.tsx`, `settings/{DangerZoneSection,ProfileSection}.tsx`, `digest/{DigestHistoryCard,HighlightItem}.tsx`, `deadlines/DeadlineCard.tsx`, `predict/PredictCard.tsx`, `layout/Sidebar.tsx` (`transition-[width]`), `setup/StepIndicator.tsx`, `timetable/{TimetableDeadlineOverlay,TimetableEvent}.tsx`.

2. **Adjacent `ease-in-out` conflicts with `--ease-claude-out`**: 8 occurrences across 7 setup/* files cleared via single sed pass deleting the trailing `ease-in-out` token next to `[transition-timing-function:var(--ease-claude-out)]`. Tailwind's `ease-in-out` utility would otherwise override the inline arbitrary timing function and silently undo the migration. Plus 1 manual follow-up on `setup/StepIndicator.tsx:33` (Form C variant — sed Form C pass produced an `ease-in-out` adjacency which manual edit cleared).

3. **ESLint configuration polish** (`frontend/eslint.config.mjs`):
   - Added `__tests__/eslint/no-raw-transition.test.ts` `no-restricted-syntax: off` override block. The TDD spec contains intentional violation strings as fixtures (the test verifies the rule fires on these); without the override, `pnpm lint` could never pass after plan-3 installed the rule.
   - Reworded the rule's error message from `[transition-duration:var(--motion-fast|base|slow)]` literal to prose. Tailwind v4's class scanner was picking up the bracket form as a candidate className and emitting `Unexpected token Delim('|')` CSS warning during build.

### Task 3 — Playwright baselines (DEFERRED to production visual UAT)

**Status:** Not executed in this plan. Deferred per user decision in this conversation.

**Decision rationale (user):**
- Avoids local Playwright credential setup friction (PERF_TEST_PASSWORD + Supabase env vars)
- Visual verification will happen on Vercel preview deployment after PR ships
- ESLint rule from plan-3 continues to enforce no raw transitions in CI — future regressions blocked at lint time even without pixel-diff baselines
- The Playwright spec at `frontend/tests/e2e/phase39-transition-parity.spec.ts` remains in-tree as an env-gated stub. It auto-skips when `PERF_TEST_PASSWORD` is unset (matches Phase 38 P04 convention) — that's correct behavior; no further action needed for this plan.

**What's NOT done in this plan** (see Deferred Work section below):
- Generate ≥18 PNG baselines (10 pages × baseline+hover with 2-PNG tolerance per ISSUE-39-07)
- Verify pixel-diff stays under `maxDiffPixelRatio: 0.005` (D-11)
- Re-run Playwright spec without `--update-snapshots` to confirm 100% match

**Visual verification path (post-PR):** Vercel deploys this branch's PR → user clicks through 10 documented pages on the preview URL → confirms hover states / transitions still feel correct → reports "approved" on the PR.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| 1 | `40b6501` | refactor | sed-sweep transition-{all\|colors} duration-{N\|[Xs]} to motion tokens (5 passes ~56 occurrences across 36 files) |
| 2 | `29f6cf9` | fix | manual cleanup of Form C transitions + adjacent ease-in-out + ESLint test fixture override |
| 3 | _(deferred — production visual UAT)_ | — | _no commit; spec is env-gated and auto-skips_ |

## Files Created/Modified

See `key-files` in frontmatter. 47 unique files touched:
- 36 sed-target component .tsx files (Task 1, mechanical migration only)
- 14 additional Task 2 files (some overlap with Task 1) for Form C + ease-in-out cleanup
- `frontend/eslint.config.mjs` (Task 2 — test fixture override + message rewording)
- `.planning/phases/39-design-token-foundation/39-04-SUMMARY.md` (this file)
- `.planning/seeds/SEED-39-playwright-baselines.md` (deferred-work tracking)

## Verification Evidence

All Wave 1 success criteria pass:

- ✓ `cd frontend && grep -rEn 'transition-(all|colors)\s+duration-[0-9]' app components` → 0 matches (shortcut form swept)
- ✓ `cd frontend && grep -rEn 'transition-(all|colors)\s+duration-\[[^\]]+\]' app components` → 0 matches (bracket form swept)
- ✓ `cd frontend && grep -rEn 'transition-\[[^\]]+\]\s+duration-' app components` → 0 matches (Form C swept)
- ✓ `cd frontend && grep -rEn 'var\(--ease-claude-out\).*ease-in-out|ease-in-out.*var\(--ease-claude-out\)' app components` → 0 matches (no conflicting timing function)
- ✓ `cd frontend && pnpm lint` → exit 0 (zero ESLint violations after sweep + test fixture override)
- ✓ `cd frontend && pnpm build` → exit 0 (Tailwind v4 compiles all arbitrary-property classes; 46/46 static pages generated; First Load JS 220 kB unchanged from pre-sweep; **zero CSS warnings** after message rewording)
- ✓ `cd frontend && pnpm exec vitest run __tests__/lint/no-raw-transition.test.ts` → 2/2 tests pass (Wave 0 RED stub from plan-3 turned GREEN)
- ✓ `cd frontend && pnpm exec vitest run __tests__/styles __tests__/lint/no-raw-transition.test.ts __tests__/eslint/no-raw-transition.test.ts` → **6 files / 42 tests pass** (full Phase 39 test surface; cross-plan check confirms plan-1 + plan-2 + plan-3 invariants intact)

Wave 2 success criteria (Task 3) **NOT verified in this plan** — see Deferred Work below.

## Deferred Work

### Generate Playwright transition-parity baselines

**Tracked in:** `.planning/seeds/SEED-39-playwright-baselines.md`

**What's deferred:**
- Generate ≥18 PNG baselines under `frontend/tests/e2e/__screenshots__/phase39-transition-parity.spec.ts-snapshots/` (10 pages × baseline+hover with 2-PNG tolerance per ISSUE-39-07)
- Verify Playwright pixel-diff stays under `maxDiffPixelRatio: 0.005` (D-11)
- Commit baselines with `test(39-04): commit Playwright baselines for transition-parity spec` message
- Re-run spec without `--update-snapshots` to confirm 100% match

**Why deferred (user decision this conversation):**
- Local Playwright credential setup friction (`PERF_TEST_PASSWORD` + Supabase env vars not at hand)
- Visual verification will happen on Vercel preview deployment after PR ships (production visual UAT)
- ESLint rule from plan-3 already enforces no raw transitions in CI — future regressions blocked at lint time, providing a different (lint-level) safety net even without pixel-diff coverage
- Design-conscious profile (per CLAUDE.md USER-PROFILE.md) — user wants visual verification on prod, not skipped

**Trigger to revisit (per SEED-39-playwright-baselines.md):**
- Visual drift reported in motion or Phase 40 components after migration ships, OR
- v3.1 milestone kickoff (revisit during `/gsd-review-backlog`), OR
- Phase 40 SHARED-01 starts and wants visual safety net before refactoring shared components

**Reference docs for the deferred work:**
- `39-04-PLAN.md` Task 3 (full 9-step `<how-to-verify>` block)
- `39-04-PLAN.md` `<success_criteria>` ISSUE-39-04 + ISSUE-39-07 compliance
- `frontend/tests/e2e/phase39-transition-parity.spec.ts` (spec already staged; no changes needed)

## Decisions Made

- **Defer Task 3 to production visual UAT** (user decision this conversation) — see "Why deferred" above. MOTION-01 status downgraded from "complete" to "partial" to reflect the unfinished D-11 visual gate.
- **BSD sed `[[:>:]]` over `\b`** — `\b` is a GNU sed extension; macOS Intel ships BSD sed which silently produces 0 replacements. RESEARCH §Pitfall 1 amplified into a concrete pattern: always use `[[:>:]]` for BSD-portable word-boundary-end. (RESEARCH text mentioned BSD compatibility but the example used `\b` literally; this plan ran into it and corrected mid-execution.)
- **Generalize sed to Form C** — PLAN-39-04 had 6 manual edge cases listed; reality was 21 Form C cases (much higher than RESEARCH estimate). Generalized the sed playbook with 4 supplementary passes (`(transition-\[[^]]+\]) duration-{NNN|[Xs]}`) preserving the property list. Reduces manual touch count from 21 → 1 (one final ease-in-out follow-up after Form C sed produced an adjacency).
- **ESLint test-fixture override scoped to one file** — `__tests__/eslint/no-raw-transition.test.ts` is the TDD spec for the rule; its 5 fixture strings (per plan-3 SUMMARY) intentionally contain the forbidden pattern. Without an `off` override scoped to this one file via flat-config glob, `pnpm lint` would never pass after plan-3 installed the rule. Adopted as a project-wide pattern: when a TDD spec for a no-restricted-syntax rule contains the rule's own forbidden patterns, scope the override to that file alone.
- **ESLint message literal hygiene** — Tailwind v4's CSS scanner emits warnings on bracket-form className-shaped strings appearing in source files (including in error messages). Reworded the rule message to prose-based description. Pattern: ESLint error messages should describe the migration target, not literally render it.
- **Spec stays in-tree, env-gated** — `frontend/tests/e2e/phase39-transition-parity.spec.ts` continues to live in the tree even though baselines are deferred. The env-gating via `shouldRunPerfSuite()` means it auto-skips locally and in CI without secrets — zero noise. When the deferred work surfaces (per SEED trigger), the spec is ready to consume `--update-snapshots` without code changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] BSD sed `\b` non-support produced 0 replacements on first run**
- **Found during:** Task 1 Step 3 (post-sed verification grep)
- **Issue:** RESEARCH §Code Example 4 sed playbook uses `\b` for word-boundary-end. macOS Intel ships BSD sed which does not support `\b` (GNU sed extension); the regex compiles silently but never matches. First 5-pass run reported "Pass N done" on each step but pre/post grep counts were unchanged at 51+5 → 51+5.
- **Fix:** Replaced `\b` with BSD POSIX `[[:>:]]` (word-boundary-end). Re-ran 5-pass playbook. Pre/post grep counts confirmed: 51+5 → 0+0.
- **Files modified:** No additional files modified (re-run on same 36 sed-target files).
- **Verification:** `grep -rEn 'transition-(all|colors)\s+duration-[0-9]' app components` → 0 matches; `grep -rEn 'transition-(all|colors)\s+duration-\[[^\]]+\]' app components` → 0 matches.
- **Committed in:** `40b6501` (Task 1 — committed only after fix, so the diff is the correct sed transformation, not the no-op first attempt).

**2. [Rule 2 — Missing critical functionality] Form C scope was 21 cases, not the 6 the PLAN named**
- **Found during:** Task 2 Step 1 (`grep -rEn 'transition-\[[^\]]+\] duration-' app components`)
- **Issue:** PLAN-39-04 named 6 manual edge cases. Actual count: 21 Form C occurrences across 14 files. Hand-editing 21 cases manually would have been error-prone + slow.
- **Fix:** Generalized the sed playbook with 4 supplementary Form C passes preserving the property list: `(transition-\[[^]]+\]) duration-{150|300|[0.14s|0.15s]|[400ms]}`. Sed handled Form C as cleanly as Form A/B because the property list inside `transition-[<property>]` is a uniform shape. Reduced manual touch to 1 (a single ease-in-out adjacency that Form C sed produced as a side-effect).
- **Files modified:** 14 Form C files via supplementary sed; 1 manual edit (`setup/StepIndicator.tsx:33` follow-up).
- **Verification:** `grep -rEn 'transition-\[[^\]]+\]\s+duration-' app components` → 0 matches.
- **Committed in:** `29f6cf9` (Task 2).

**3. [Rule 3 — Blocking] ESLint TDD test fixture file caused `pnpm lint` to fail**
- **Found during:** Task 2 Step 4 (first `pnpm lint` after sed sweep)
- **Issue:** `__tests__/eslint/no-raw-transition.test.ts` (created in plan-3 as the rule's TDD spec) contains 5 fixture strings with raw `transition-{all|colors} duration-{N|[Xs]}` patterns. The rule itself is testing whether it fires on these — but ESLint applies the rule to the test file too. After plan-3 installed the rule, `pnpm lint` reported 5 errors on the test fixtures.
- **Fix:** Added a flat-config block in `eslint.config.mjs` scoping `no-restricted-syntax: off` to `__tests__/eslint/no-raw-transition.test.ts` only. The rule remains active everywhere else in the project.
- **Files modified:** `frontend/eslint.config.mjs`.
- **Verification:** `pnpm lint` → exit 0; the 5 ESLint TDD tests in `__tests__/eslint/no-raw-transition.test.ts` still pass (the override doesn't affect the rule's behavior when invoked through `Linter.verify()` — that uses an in-process Linter, not the project ESLint config).
- **Committed in:** `29f6cf9` (Task 2).

**4. [Rule 1 — Bug] Tailwind v4 CSS optimizer warning from ESLint rule message literal**
- **Found during:** Task 2 final `pnpm build` after fix #3
- **Issue:** ESLint rule's error message contained the literal `[transition-duration:var(--motion-fast|base|slow)]`. Tailwind v4's class scanner picks up bracket-form arbitrary-property strings as candidate classNames; the `|` separator inside `var(--motion-fast|base|slow)` is invalid in Tailwind utility syntax, emitting `Unexpected token Delim('|')` CSS warning during build (1 warning per occurrence in scanned files, multiple across the bundle).
- **Fix:** Reworded the rule's error message to plain prose: "Use the migrated form with two arbitrary properties: transition-duration mapped to var(--motion-fast / --motion-base / --motion-slow), and transition-timing-function mapped to var(--ease-claude-out)." No more bracket-form className-shaped substrings.
- **Files modified:** `frontend/eslint.config.mjs`.
- **Verification:** `pnpm build` → exit 0 with **zero warnings**.
- **Committed in:** `29f6cf9` (Task 2).

---

**Total deviations:** 4 auto-fixed (1 Rule 3 blocking BSD sed, 1 Rule 2 expanded scope, 1 Rule 3 blocking ESLint test fixture, 1 Rule 1 bug Tailwind CSS warning). All essential for the plan's verification chain. No scope creep — all modifications stayed within the migration sweep + ESLint config surface defined in `files_modified`. Rule 4 (architectural change requiring user OK) was triggered for Task 3 deferral; user provided the decision in this conversation.

## Issues Encountered

- **Pre-existing test failures unchanged** (continues from plan-1/2/3): 6 test files (course-detail / deadlines / setup / layout) fail in full vitest sweep due to missing `QueryClientProvider` / `NextIntlProvider` test wrappers. Confirmed plan-4 introduces zero new regressions. Out of scope for v3.0 design tokens.
- **Task 3 deferred** — see Deferred Work above. MOTION-01 is partial, not complete.

## Cross-plan Regression Check (plan-1 + plan-2 + plan-3 still in place)

- ✓ `pnpm exec vitest run __tests__/styles` → 4 files / 35 tests pass (plan-1 tokens-css 14 + plan-2 typography 11 + plan-3 motion 5 + plan-3 sse 5 = 35)
- ✓ `pnpm exec vitest run __tests__/eslint/no-raw-transition.test.ts` → 5 tests pass (plan-3 ESLint rule TDD spec — 4 fixture cases + 1 config-presence check)
- ✓ `pnpm exec vitest run __tests__/lint/no-raw-transition.test.ts` → 2 tests pass (plan-3 RED stub — now GREEN)
- ✓ `pnpm exec vitest run __tests__/scripts/hex-to-oklch.test.ts` → all entries pass (plan-1 conversion script TDD)
- Phase 39 test surface total (Wave 0 deliverables): **6 files / 42 tests pass**

## TDD Gate Compliance

- Plan-4 is **not** a TDD plan (`type: execute`, not `type: tdd`). Tasks 1+2 are sweep + cleanup; the verification gate is the GREEN turn of plan-3's RED `__tests__/lint/no-raw-transition.test.ts` (which this plan delivers).
- Plan-3's TDD gates verified intact:
  - RED gate `1a8e434` (test scaffolds) — present in `git log --oneline`
  - GREEN gate `28e750c` (motion tokens + ESLint rule) — present
  - REFACTOR gate skipped per plan-3 SUMMARY

Sequence verified in `git log --oneline`:

```
29f6cf9 fix(39-04): manual cleanup of Form C transitions + adjacent ease-in-out + ESLint test fixture override
40b6501 refactor(39-04): sed-sweep transition-{all|colors} duration-{N|[Xs]} to motion tokens (5 passes ~56 occurrences across 36 files)
69a100f docs(39-03): complete Motion + SSE + ESLint Foundation plan
28e750c feat(39-03): add motion tokens + SSE keyframes (no alternate per Q7) + reduced-motion stub + ESLint no-restricted-syntax rule
1a8e434 test(39-03): add failing motion+sse+eslint+lint+playwright test scaffolds (RED)
```

## User Setup Required

**Required for plan completion:** None — Tasks 1+2 fully shipped, Task 3 deferred per user decision.

**Required for the deferred work** (when revisited per SEED-39-playwright-baselines.md trigger):
- `PERF_TEST_PASSWORD` (test user password)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Local dev server on port 3001 (`cd frontend && pnpm dev`)
- ~30 min wall time (10 pages × 2 states `--update-snapshots` + manual sanity check + commit)

**Production visual UAT path** (immediate, post-PR):
1. Wait for Vercel preview deployment of this branch
2. Open preview URL, log in as test user
3. Click through 10 pages: dashboard, courses, course-detail/comp2017, deadlines, predict, digest, timetable, settings, auth, setup
4. On each page: hover any button, verify smooth color transition (no visual jank, motion preserved at v2.0 rhythm)
5. If all 10 pages look correct → comment "approved" on the PR; merge to main

## Next Phase Readiness

Plan 39-04 (with Task 3 deferred) unlocks:

- **Phase 40 SHARED-01 (Card/Button/Input/Modal/Tooltip)**: Can now use the migrated arbitrary-property form `[transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]` from day 1. The ESLint rule blocks accidental regression to raw `transition-{all|colors} duration-N` on every PR.
- **Phase 40 SHARED-02 (no-bubble streaming AI reply)**: Will consume `--animate-streaming-cursor-blink` (1s step-end infinite — no alternate, terminal-cursor pattern) and `--animate-streaming-chunk-fadein` (var(--motion-fast) ease-claude-out forwards) from plan-3.
- **Phase 41 A11Y-05 (`prefers-reduced-motion`)**: Empty `@media (prefers-reduced-motion: reduce) { }` block from plan-3 awaits Phase 41's universal-selector overrides.
- **Phase 43 DARK-01..03**: Empty `[data-theme="dark"]` block from plan-1 awaits dark-mode color overrides.
- **MOTION-01 closure** (deferred work): When SEED-39-playwright-baselines.md triggers, generate baselines and commit; this turns MOTION-01 from "partial" → "complete" and provides D-11 pixel-diff coverage for the v3.0 motion subsystem.

## Threat Model Disposition

Per plan-4's `<threat_model>`:

- **T-39-25** (Tampering — ~24 component className edits) — **mitigated**: Sed playbook is grep-stable + idempotent; `pnpm lint` after sweep enforces zero leftover; commit-before-cleanup made diff PR-reviewable; ESLint rule from plan-3 blocks future regressions in CI. **Note:** Pixel-diff visual safety net (T-39-25 secondary mitigation) **deferred** to production visual UAT — see Deferred Work; tracked via SEED-39-playwright-baselines.md.
- **T-39-26** (Tampering — Playwright baseline PNGs) — **n/a** (no baselines committed; deferred). Re-evaluate when SEED triggers.
- **T-39-27** (Information Disclosure — Playwright PNGs may capture user data) — **n/a** (no baselines generated).
- **T-39-29** (DoS — Build-time sed sweep) — **accepted**: BSD sed ran in <1s on macOS Intel; xargs handled ~400 .tsx files in O(n).
- **T-39-31** (Spoofing — Playwright env vars) — **n/a** (no spec executed).

**Threat flags raised:** None. The deferral is procedural (user decision), not a security trade-off.

## Self-Check: PASSED

- ✓ Commit `40b6501` (Task 1 sed sweep) exists in `git log --oneline`
- ✓ Commit `29f6cf9` (Task 2 manual cleanup + ESLint config) exists
- ✓ `frontend/__tests__/lint/no-raw-transition.test.ts` runs 2/2 tests GREEN (Wave 0 RED stub closed)
- ✓ `frontend/__tests__/eslint/no-raw-transition.test.ts` runs 5/5 tests GREEN
- ✓ `frontend/__tests__/styles/{tokens-css,typography-tokens,motion-tokens,sse-keyframes}.test.ts` run 35/35 tests GREEN (cross-plan)
- ✓ `cd frontend && pnpm lint` exits 0
- ✓ `cd frontend && pnpm build` exits 0 (no warnings)
- ✓ `grep -rEn 'transition-(all|colors)\s+duration-' frontend/{app,components}` returns 0 matches
- ✓ `grep -rEn 'transition-\[[^\]]+\]\s+duration-' frontend/{app,components}` returns 0 matches
- ✓ `grep -rEn 'var\(--ease-claude-out\).*ease-in-out|...' frontend/{app,components}` returns 0 matches
- ✓ Task 3 marked DEFERRED with explicit rationale (user decision); Deferred Work section enumerates what's not done
- ✓ MOTION-01 status set to **partial**, not complete (per user instruction)
- ✓ SEED-39-playwright-baselines.md created to capture deferred work (Step 7 of completion plan)
- ✓ `frontend/tests/e2e/phase39-transition-parity.spec.ts` left in-tree as env-gated stub (auto-skips when PERF_TEST_PASSWORD unset)
- ✓ No baseline PNGs committed (`__screenshots__/phase39-transition-parity.spec.ts-snapshots/` does not exist)

---

*Phase: 39-design-token-foundation*
*Plan: 04 — Transition Migration Sweep + Visual Regression Baselines (deferred)*
*Completed: 2026-04-30 (Tasks 1+2 shipped; Task 3 deferred to production visual UAT)*
