---
phase: 40-shared-component-polish
plan: 01
subsystem: ui
tags: [cva, tailwind-v4, eslint, motion-tokens, design-tokens, primitives]

# Dependency graph
requires:
  - phase: 39-design-token-foundation
    provides: "Phase 39 @theme tokens (--motion-fast/base/slow + --ease-claude-out + orange/red/cream/card-border colors), no-restricted-syntax rule scaffold (D-16), TDD triplet pattern"
provides:
  - "cva-based Button primitive (4 variants × 2 sizes + iconOnly + loading)"
  - "cva-based Input primitive (2 variants + error + leftIcon/rightIcon slots)"
  - "@utility transition-claude-fast/base/slow shorthands in globals.css"
  - "ESLint rule extension blocking verbose-form + legacy --ease/--ease-fast aliases"
  - "56-caller verbose-form sweep complete across 36 files (SEED-40 closure)"
affects: [phase-40-plan-02 (SHARED-02 AI no-bubble — depends on cva primitives for input/button JSX in DeadlineAiChat/AiCourseChat callers), phase-40-plan-03 (SHARED-03 Sidebar two-layer — depends on Sidebar.tsx already swept to transition-claude-base), phase-41 (A11Y — focus-visible groundwork already laid in Button cva base; legacy --ease ESLint gate also defends new a11y code), phase-42 (NEWVIS — TokenStep/SuccessStep/AI Chat fragments will consume Button + Input primitives)]

# Tech tracking
tech-stack:
  added: ["class-variance-authority ^0.7.1 (single transitive dep clsx ^2.1.1 already present); ~22KB unpacked, type-safe variant binding"]
  patterns: ["cva variant primitive (forwardRef + variants + defaultVariants + named-export buttonVariants/inputVariants)", "Tailwind v4 @utility shorthand for repeated arbitrary-property triples", "ESLint no-restricted-syntax extension via additional selector array entries", "self-config-file override to prevent rule self-trip on regex source containing forbidden substring"]

key-files:
  created:
    - "frontend/components/ui/Button.tsx (cva primitive — 4 variants × 2 sizes + iconOnly + loading)"
    - "frontend/components/ui/Input.tsx (cva primitive — 2 variants + error + icon slots)"
    - "frontend/__tests__/components/ui/Button.test.tsx (8 unit tests, 40-01-01..08)"
    - "frontend/__tests__/components/ui/Input.test.tsx (6 unit tests, 40-01-09..14)"
    - ".planning/phases/40-shared-component-polish/deferred-items.md (pre-existing test failures docs)"
  modified:
    - "frontend/app/globals.css (3 @utility blocks added at top-level after @theme)"
    - "frontend/eslint.config.mjs (4 new no-restricted-syntax selectors + self-override)"
    - "frontend/__tests__/eslint/no-raw-transition.test.ts (4 new fixture tests + 1 fixture update)"
    - "frontend/package.json + frontend/pnpm-lock.yaml (cva 0.7.1 added)"
    - "36 .tsx files swept verbose-form → shorthand (56 occurrences)"

key-decisions:
  - "D-40-01 honored: Button + Input only extracted; Modal stays native <dialog>; Tooltip not extracted; Card untouched (Rough.js hard constraint)"
  - "D-40-02 honored: cva-based variants; no Radix UI; no shadcn primitives"
  - "D-40-03 honored: SEED-40 motion utility DRY refactor folded in; 56 verbose-form occurrences swept to shorthand"
  - "D-40-04 honored: legacy --ease/--ease-fast ESLint-gated only; aliases REMAIN in globals.css for forward-compat"
  - "D-40-12 honored: TDD triplet RED→GREEN→docs preserved (Task 1a RED commit lands BEFORE Task 1b GREEN)"
  - "D-40-13 honored: only cva added; no Radix, Tailwind plugin, or shadcn CLI"
  - "BLOCKER-2 resolution: @utility blocks moved to Task 0 (was Task 3) — eliminates build window where utilities are referenced but not yet defined"
  - "BLOCKER-3 resolution: Task 1 split into 1a (RED) + 1b (GREEN) — strict TDD triplet pattern from Phase 39 LEARNINGS"
  - "Phase 39 ESLint test fixture updated: the negative-control 'does NOT flag the migrated form' test fixture migrated from now-forbidden verbose form to the new shorthand (preserves semantic intent — rule does NOT false-flag legal post-migration utility)"

patterns-established:
  - "Pattern 1: cva primitive scaffold — forwardRef + cva variants + named export of variants builder (Button/Input set the precedent for downstream Phase 41/42 primitives)"
  - "Pattern 2: Tailwind v4 @utility block placed top-level after @theme for shorthand utilities (NOT nested inside @theme — silently no-ops)"
  - "Pattern 3: ESLint self-override for config files where rule selectors must contain the forbidden substring as regex source"
  - "Pattern 4: BSD sed playbook (6 passes covering fast/base/slow × all/colors) for grep-stable mechanical className sweeps"

requirements-completed: [SHARED-01]

# Metrics
duration: ~18min
completed: 2026-05-02
---

# Phase 40 Plan 01: SHARED-01 Primitive Extraction + SEED-40 Motion DRY Summary

**cva-based Button + Input primitives extracted with 4+2 variants bound to Phase 39 design tokens; SEED-40 closure sweeps 56 verbose-form transition occurrences across 36 files to new @utility shorthands; ESLint rule extended to defend forward debt against verbose form and legacy --ease/--ease-fast aliases.**

## Performance

- **Duration:** ~18 min (5 task commits + 1 docs commit)
- **Started:** 2026-05-02T16:35:00Z (worktree initialization)
- **Completed:** 2026-05-02T16:53:00Z
- **Tasks:** 6 (Task 0 + Task 1a RED + Task 1b GREEN + Task 2 sweep + Task 3 ESLint + Task 4 docs)
- **Files modified:** 45 (36 sweep targets + 2 cva sources + 2 cva tests + 2 ESLint files + globals.css + package.json/pnpm-lock.yaml)

## Accomplishments

- **cva primitive layer**: Button.tsx (4 variants × 2 sizes + iconOnly + loading) + Input.tsx (2 variants + error + leftIcon/rightIcon slots) — type-safe, forwardRef-wrapped, bound to Phase 39 tokens. Lays Phase 41 A11Y-01 focus ring groundwork (focus-visible:ring-orange/40).
- **SEED-40 closure**: 56 verbose-form `transition-(all|colors) [transition-duration:var(--motion-X)] [transition-timing-function:var(--ease-claude-out)]` occurrences across 36 files swept to `transition-claude-{fast,base,slow}` shorthand via 6 BSD sed passes. Phase 39 LEARNINGS guard verified (zero stale ease-[cubic-bezier(...)] literals). SEED-40 status flips dormant → closed.
- **ESLint defense**: 4 new no-restricted-syntax selectors block (a) verbose Literal, (b) verbose TemplateElement, (c) `var(--ease)`/`var(--ease-fast)` Literal, (d) same TemplateElement. Defends D-40-04 deprecation gate (RESEARCH Finding 3 verified 0 active call sites; rule defends forward debt only).
- **TDD triplet preserved (D-40-12)**: RED (Task 1a) → GREEN (Task 1b) → docs (Task 4) commit pattern from Phase 39 LEARNINGS honored.
- **Build green**: pnpm lint --max-warnings 0 + pnpm typecheck + pnpm build all exit 0; First Load JS unchanged at 220KB (matches Phase 39 LEARNINGS surprise: Tailwind v4 dedupes globally; 56 className changes net zero bundle delta).

## Task Commits

Each task was committed atomically per the D-40-12 TDD triplet pattern:

1. **Task 0: Add @utility transition-claude shorthands** — `e450031` (feat)
2. **Task 1a: TDD RED — Failing tests for Button + Input cva primitives** — `1148481` (test)
3. **Task 1b: TDD GREEN — Implement Button + Input cva primitives** — `daecb87` (feat)
4. **Task 2: Sed sweep — 56 verbose-form occurrences across 36 files** — `71da02b` (refactor)
5. **Task 3: Extend ESLint rule + 4 new fixture tests** — `77c9c1f` (feat)
6. **Task 4: Docs commit (this SUMMARY.md)** — pending docs commit (worktree mode)

_Note: TDD tasks 1a + 1b form the RED→GREEN pair per D-40-12; Task 4 closes the triplet with the docs commit._

## Files Created/Modified

### Created
- `frontend/components/ui/Button.tsx` — cva-based Button primitive (4 variants × 2 sizes + iconOnly + loading) bound to Phase 39 tokens
- `frontend/components/ui/Input.tsx` — cva-based Input primitive (2 variants + error + leftIcon/rightIcon slots) bound to Phase 39 tokens
- `frontend/__tests__/components/ui/Button.test.tsx` — 8 Vitest unit tests (40-01-01..08)
- `frontend/__tests__/components/ui/Input.test.tsx` — 6 Vitest unit tests (40-01-09..14)
- `.planning/phases/40-shared-component-polish/deferred-items.md` — pre-existing test failures docs (DEFERRED-40-01)

### Modified (logic / config)
- `frontend/app/globals.css` — 3 @utility blocks (transition-claude-fast/base/slow) added at top-level immediately after @theme
- `frontend/eslint.config.mjs` — 4 new no-restricted-syntax selectors (D-40-03 + D-40-04) + self-override to prevent rule self-trip
- `frontend/__tests__/eslint/no-raw-transition.test.ts` — 4 new fixture tests + 1 fixture update (Phase 39 negative-control migrated from verbose to shorthand)
- `frontend/package.json` + `frontend/pnpm-lock.yaml` — cva ^0.7.1 added

### Modified (mechanical sweep — 36 files)
- `frontend/components/auth/{LanguageSwitcher,LoginForm,PasswordStrengthMeter,RegisterForm}.tsx`
- `frontend/components/course-detail/{AssessmentRow,MaterialItem}.tsx`
- `frontend/components/dashboard/{CourseGradesTable,DeadlineTimeline,MiniCalendar,RecentActivity}.tsx`
- `frontend/components/deadlines/{DeadlineCard,DeadlineTitleRow}.tsx`
- `frontend/components/digest/{DigestFilterBar,DigestPage,DigestTitleRow}.tsx`
- `frontend/components/layout/{Header,NotificationPanel,Sidebar}.tsx`
- `frontend/components/predict/PredictAssessmentTable.tsx`
- `frontend/components/settings/{DangerZoneSection,GpaTargetSection,LanguageSection,NotificationsSection,ProfileSection,SettingsNav,SettingsQuickActions,TokensSection}.tsx`
- `frontend/components/setup/{StepIndicator,SuccessStep,TokenInput,TokenStep,TutorialStep,WelcomeStep}.tsx`
- `frontend/components/shared/FeedbackButton.tsx`
- `frontend/components/timetable/{TimetablePage,TimetableTitleRow}.tsx`

## Validation Status

| Task ID | Test Type | Command | Status |
|---------|-----------|---------|--------|
| 40-01-01 | unit | pnpm test -t "primary variant" | ✅ green |
| 40-01-02 | unit | pnpm test -t "secondary variant" | ✅ green |
| 40-01-03 | unit | pnpm test -t "ghost variant" | ✅ green |
| 40-01-04 | unit | pnpm test -t "danger variant" | ✅ green |
| 40-01-05 | unit | pnpm test -t "iconOnly size" | ✅ green |
| 40-01-06 | unit | pnpm test -t "loading state" | ✅ green |
| 40-01-07 | unit | pnpm test -t "merges caller className" | ✅ green |
| 40-01-08 | unit | pnpm test -t "focus-visible ring" | ✅ green |
| 40-01-09 | unit | pnpm test -t "default variant" | ✅ green |
| 40-01-10 | unit | pnpm test -t "search variant" | ✅ green |
| 40-01-11 | unit | pnpm test -t "leftIcon" | ✅ green |
| 40-01-12 | unit | pnpm test -t "rightIcon" | ✅ green |
| 40-01-13 | unit | pnpm test -t "error state" | ✅ green |
| 40-01-14 | unit | pnpm test -t "disabled state" | ✅ green |
| 40-01-15 | typecheck | grep -E '@utility transition-claude-(fast\|base\|slow)' app/globals.css → 3 matches | ✅ green |
| 40-01-16 | unit | pnpm test -t "verbose tokenized form" | ✅ green |
| 40-01-17 | unit | pnpm test -t "var(--ease)" | ✅ green |
| 40-01-18 | grep | ! grep verbose-form → 0 matches | ✅ green |
| 40-01-19 | integration | pnpm lint --max-warnings 0 && pnpm typecheck && pnpm build | ✅ green |

**Total plan-01 scoped tests: 23/23 passing** (8 Button + 6 Input + 9 ESLint = 23; the plan target was 22 because it counted the rule-block-exists test as part of Phase 39's 4, not as +1).

## Decisions Honored

- **D-40-01** ✅ Button + Input only (Modal/Tooltip/Card untouched per CONTEXT)
- **D-40-02** ✅ cva-based variants; no Radix UI
- **D-40-03** ✅ SEED-40 motion utility DRY refactor folded in (3 @utility blocks + 56-caller sweep)
- **D-40-04** ✅ Legacy --ease/--ease-fast ESLint-gated, no full sweep; aliases retained in globals.css
- **D-40-12** ✅ TDD triplet preserved (Task 1a RED → Task 1b GREEN → Task 4 docs)
- **D-40-13** ✅ Only cva added (no Radix, no Tailwind plugin, no shadcn CLI)

## Checker Resolution

- **BLOCKER-2 (was Task 3 ordering)** ✅ Resolved by moving @utility blocks to Task 0 — eliminates the build window where utilities were referenced but not yet defined; subsequent tasks (cva primitives, sed sweep, Sidebar two-layer rewrite in plan-03) can reference the new utilities without "Could not resolve" errors.
- **BLOCKER-3 (was Task 1 monolithic)** ✅ Resolved by splitting Task 1 into 1a (RED) + 1b (GREEN) — honors D-40-12 strict TDD triplet pattern from Phase 39 LEARNINGS.
- **WARNING-2 (fragile regex in acceptance criteria)** ✅ Resolved by replacing fragile escaped regex with simpler substring grep (`grep -c "var.--ease"` returns 7).
- **WARNING-3 (scope_justification missing)** ✅ Resolved via frontmatter scope_justification field documenting the 45-file blast radius (36 sweep + 2 cva sources + 2 cva tests + globals.css + eslint.config.mjs + 1 ESLint test extension + 2 lockfile/package.json).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Phase 39 ESLint test fixture became invalid after Phase 40 D-40-03 selector addition**
- **Found during:** Task 3 (TDD GREEN — adding 4 new selectors to no-restricted-syntax)
- **Issue:** The Phase 39 negative-control test "does NOT flag the migrated form" used a fixture string containing the verbose form `transition-colors [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]`. After adding the new D-40-03 selector that blocks this exact form, the rule correctly fired on the fixture, causing the test to fail (the rule was no longer "not flagging" — it was correctly flagging the now-forbidden form).
- **Fix:** Updated the fixture string from the now-forbidden verbose form to the new shorthand `transition-claude-fast hover:bg-orange`. The test name was also updated to "does NOT flag the migrated form (now: shorthand transition-claude-fast)" with a comment explaining the migration. Semantic intent preserved: the test verifies the rule does NOT false-flag a legal post-migration utility.
- **Files modified:** `frontend/__tests__/eslint/no-raw-transition.test.ts` (fixture + test name update)
- **Verification:** All 9 ESLint tests pass post-update.
- **Committed in:** `77c9c1f` (Task 3)

**2. [Rule 1 - Bug] ESLint config file self-trip on rule's own regex source**
- **Found during:** Task 3 (TDD GREEN verification — running pnpm lint after adding selectors)
- **Issue:** The new `Literal[value=/var\\(--ease(?:-fast)?\\)/]` selector matches Literal values containing `var(--ease)` substring. The selector regex itself, when ESLint lints `eslint.config.mjs`, contains `var\\(--ease(?:-fast)?\\)` as a string Literal — which the rule then matches and flags. Self-fire blocked `pnpm lint --max-warnings 0`.
- **Fix:** Added a file-level override in eslint.config.mjs targeting `eslint.config.mjs` itself with `"no-restricted-syntax": "off"`. Mirrors the existing Phase 39 D-16 test fixtures override (lines 97-107) which solves the analogous problem for the rule's TDD spec. The rule remains active on every other file in the repo.
- **Files modified:** `frontend/eslint.config.mjs` (self-override block added at lines 108-119)
- **Verification:** pnpm lint --max-warnings 0 exits 0 and 9 ESLint fixture tests still pass (override does not affect the in-process Linter() runs in the test file).
- **Committed in:** `77c9c1f` (Task 3)

### Logged out-of-scope discoveries (not auto-fixed per SCOPE BOUNDARY rule)

**1. [Out-of-scope] 23 pre-existing test failures from missing next-intl provider in test setup**
- See `.planning/phases/40-shared-component-polish/deferred-items.md` (DEFERRED-40-01) for full details.
- Verified pre-existing via `git stash` + re-run: identical failure counts pre/post sweep.
- 5 affected test files (CourseDetailPage, DeadlineCard, DeadlinesPage, AppShell, SetupGuard).
- Root cause: components consuming `useLocale()` rendered without `NextIntlClientProvider` wrapper.
- Recommended fix: Phase 41 A11Y kickoff or dedicated test-infra plan adding shared `renderWithIntl()` wrapper.
- These failures do NOT block plan-01 closure — plan-01 scoped tests (23/23) all pass; sweep introduces zero new regressions.

## Pattern References Used

- **RESEARCH Pattern 1** (Button.tsx with cva — full source copied verbatim per RESEARCH lines 322-403)
- **RESEARCH Pattern 2** (Input.tsx with cva + leftIcon/rightIcon slots — RESEARCH lines 438-519)
- **RESEARCH Pattern 6** (Tailwind v4 @utility blocks for SEED-40 shorthand — RESEARCH lines 906-933)
- **RESEARCH Pattern 7** (ESLint no-restricted-syntax extension — RESEARCH lines 944-1007)
- **RESEARCH Pattern 8** (BSD sed playbook for 56 verbose-form sweep — RESEARCH lines 1027-1063)
- **RESEARCH Pattern 9** (Vitest unit test scaffold — RESEARCH lines 1094-1190)
- **PATTERNS Excerpt B** (FeedbackButton typed-prop button shape analog)
- **PATTERNS Excerpt C** (DeadlineAiChat input-with-icons shape analog)
- **PATTERNS Excerpt J** (4 new ESLint fixture tests scaffold)
- **PATTERNS Excerpt K** (globals.css @utility insertion point + Phase 39 LEARNINGS PostCSS minifier guard)
- **Phase 39 LEARNINGS** (sed playbook, ESLint regex modifier-prefix handling, TDD triplet commit pattern, "First Load JS unchanged after className sweep" surprise)

## Build Stats

- **First Load JS shared by all:** 220 KB (unchanged from pre-plan-01 baseline)
- **Largest chunk:** `chunks/2808-bb7ba393eb56bf3b.js` 124 KB (slight hash drift from pre-plan-01 due to className edits redirecting to shorthand)
- **Phase 39 LEARNINGS surprise CONFIRMED**: 56 className substitutions + 2 new components + 1 new dep (cva 22KB unpacked) net ZERO measurable bundle delta. Tailwind v4 dedupes globally; the verbose `[transition-duration:...]` Tailwind arbitrary properties were already collapsing to a tiny number of rule emissions, and the cva runtime is tree-shaken to ~0 cost when only static variant lookups happen at build time.

## Open Questions / Followups

None. Plan-01 closes cleanly:
- Plan-02 (SHARED-02 AI no-bubble) is unblocked (parallel-safe per CONTEXT D-40-11; touches disjoint files).
- Plan-03 (SHARED-03 Sidebar two-layer) is unblocked (Sidebar.tsx already swept to `transition-claude-base` for plan-03 to inherit cleanly).

The 114-caller Button/Input migration (raw `<button>`/`<input>` JSX → `<Button>`/`<Input>`) is NOT in plan-01 scope per D-40-11 + RESEARCH Q9 (mapping table requires intent-aware variant assignment; sed insufficient). Deferred to Phase 41/42 follow-up or a dedicated future plan in this phase if user decides.

---

## Self-Check: PASSED

- ✅ `frontend/components/ui/Button.tsx` exists
- ✅ `frontend/components/ui/Input.tsx` exists
- ✅ `frontend/__tests__/components/ui/Button.test.tsx` exists
- ✅ `frontend/__tests__/components/ui/Input.test.tsx` exists
- ✅ `frontend/app/globals.css` modified (3 @utility blocks added)
- ✅ `frontend/eslint.config.mjs` modified (4 new selectors + self-override)
- ✅ `frontend/__tests__/eslint/no-raw-transition.test.ts` modified (4 new fixtures + 1 update)
- ✅ commit `e450031` exists (Task 0)
- ✅ commit `1148481` exists (Task 1a RED)
- ✅ commit `daecb87` exists (Task 1b GREEN)
- ✅ commit `71da02b` exists (Task 2 sweep)
- ✅ commit `77c9c1f` exists (Task 3 ESLint)
- ✅ pnpm lint --max-warnings 0 exits 0
- ✅ pnpm typecheck exits 0
- ✅ pnpm test --run __tests__/components/ui/ + __tests__/eslint/ → 23/23 plan-01 scoped tests pass
- ✅ pnpm build exits 0; First Load JS = 220 KB (unchanged)
- ✅ verbose form remaining: 0; shorthand applied: 39 files
- ✅ All comments in source files (Button.tsx, Input.tsx, globals.css @utility blocks, eslint.config.mjs new section, test files) are English-only per CLAUDE.md
