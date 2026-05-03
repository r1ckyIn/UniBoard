---
phase: 39-design-token-foundation
plan: 01
subsystem: ui
tags: [design-tokens, oklch, tailwind-v4, color, spacing, culori, tdd]

# Dependency graph
requires:
  - phase: 01-design-system-foundation
    provides: v2.0 hex color palette, --shadow-card/-hover/-dropdown tokens, layout spacing tokens, next/font integration
  - phase: 38-first-load-performance
    provides: vitest setup conventions, file-as-text test idiom (dashboard-prefetch.test.ts)
provides:
  - "12 brand+project colors declared in oklch space (orange/blue/green/amber/purple/red, with -soft variants at /0.11 alpha)"
  - "9 neutral colors declared in oklch space (dark/cream/card-bg/-hover/-border/text-1..3/divider)"
  - "@supports not (color: oklch(0% 0 0)) hex/rgba fallback block for browsers without oklch support"
  - "8-point spacing scale --spacing-1..--spacing-16 (4/8/12/16/24/32/48/64 px) generating Tailwind p-/m-/gap-/w-/h- utilities"
  - "Empty [data-theme=\"dark\"] reservation block for Phase 43"
  - "frontend/scripts/hex-to-oklch.mjs: library + CLI dual-use ESM script with exported convert() (round-trip ΔE < 1.0 verified)"
  - "frontend/__tests__/scripts/hex-to-oklch.test.ts: TDD spec, 17 tests covering all 15 PALETTE entries"
  - "frontend/__tests__/styles/tokens-css.test.ts: file-as-text invariant gate, 14 tests"
affects: [39-02-typography, 39-03-motion-sse, 40-shared-components, 40-shared-streaming, 41-states-a11y, 42-newvis, 43-dark-mode]

# Tech tracking
tech-stack:
  added: [culori@4.0.2, "@types/culori@4.0.1"]
  patterns: ["build-time CSS token generation via Node ESM script", "library+CLI dual-use via `import.meta.url === file://${process.argv[1]}` guard", "file-as-text vitest invariant assertions", "@supports feature-query fallback layer with hex/rgba mirrors"]

key-files:
  created:
    - frontend/scripts/hex-to-oklch.mjs
    - frontend/__tests__/scripts/hex-to-oklch.test.ts
    - frontend/__tests__/styles/tokens-css.test.ts
  modified:
    - frontend/app/globals.css
    - frontend/package.json
    - frontend/pnpm-lock.yaml

key-decisions:
  - "Used culori@4.0.2 for hex→oklch conversion (RESEARCH §Standard Stack); ΔE measured via differenceEuclidean('oklch') with mode arg (Pitfall 5)"
  - "Script structured as library+CLI hybrid so unit tests dynamic-import convert() rather than re-implementing the conversion (DRY)"
  - "@supports fallback uses oklch(0% 0 0) test value (Pitfall 3) — oklch(0) parses as a number and fails the feature query on the very browsers that need the fallback"
  - "Brand SSOT preservation: orange/blue/green hex literals (#d97757/#6a9bcc/#788c5d) appear unchanged in @supports fallback; oklch values cite anthropics/skills/brand-guidelines as source"
  - "Additive layer only — v2.0 layout tokens, shadow tokens, animation tokens, keyframes, @theme inline (next/font integration) preserved verbatim"
  - "Auto-installed @types/culori@4.0.1 (Rule 1) when typecheck flagged missing declarations — required for the unit test to compile under strict TS"

patterns-established:
  - "TDD plan-1 RED→GREEN: failing tests committed before implementation; 17+14=31 tests turn green via Task 2"
  - "Build-time token generation: scripts/<name>.mjs as ESM; library+CLI dual-use pattern for testability"
  - "Token annotation: inline /* source: brand-guidelines #XXXXXX */ vs /* source: prototype #XXXXXX */ comments per D-02"
  - "Tailwind v4 @theme block extension: additive only; never restructure or relocate existing tokens"

requirements-completed: [DESIGN-01, DESIGN-02]

# Metrics
duration: 15min
completed: 2026-04-30
---

# Phase 39 Plan 01: Color & Spacing Token Foundation Summary

**oklch color tokens (12 brand+project + 9 neutral) with hex `@supports` fallback, 8-point spacing scale, and `[data-theme="dark"]` reservation block established additively in `frontend/app/globals.css`; build-time culori conversion script (round-trip ΔE = 0.0000) committed under TDD RED→GREEN.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-30T00:30:51Z
- **Completed:** 2026-04-30T00:46:16Z
- **Tasks:** 2 (TDD pair)
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- Tailwind v4 `@theme` block extended with 21 oklch color tokens — every conversion verified at ΔE = 0.0000 (well under success-criterion #1 threshold of 1.0)
- 8-point spacing scale (`--spacing-1`..`--spacing-16`) generates `p-1`..`p-16`, `m-*`, `gap-*`, `w-*`, `h-*` utilities via Tailwind v4 namespaces
- `@supports not (color: oklch(0% 0 0))` fallback re-declares all 21 color tokens with v2.0 hex/rgba — preserves visual contract on Safari < 16.4, Chrome < 111, Firefox < 113
- Empty `[data-theme="dark"]` block reserved for Phase 43 (warm-deep-brown dark surface)
- `frontend/scripts/hex-to-oklch.mjs` is a library+CLI hybrid — `convert()` is testable in isolation, CLI emits paste-ready CSS
- All v2.0 invariants preserved: `--shadow-card/-hover/-dropdown`, `--spacing-sidebar-w/-w-expanded/-right-panel-w/-header-h`, `--animate-*`, `@keyframes`, `@theme inline` (next/font) — zero regression

## Task Commits

Each task committed atomically per TDD discipline:

1. **Task 1 (RED): failing tests for hex-to-oklch script + tokens-css invariants** — `726eb10` (test)
2. **Task 2 (GREEN): oklch color tokens + 8-point spacing + dark-mode reservation** — `c1de7c9` (feat)

_Note: REFACTOR step was unnecessary — implementation matched final shape on first pass._

## Files Created/Modified

- `frontend/scripts/hex-to-oklch.mjs` (NEW, 144 lines) — Library+CLI ESM script. Exports `convert({ name, hex, source })`; CLI guard `if (import.meta.url === \`file://${process.argv[1]}\`)` emits `@theme` + `@supports` blocks to stdout. PALETTE constant lists all 15 entries with provenance strings.
- `frontend/__tests__/scripts/hex-to-oklch.test.ts` (NEW) — TDD spec. Dynamic-imports `convert()`; uses `it.each(FIXTURES)` over 15 entries to assert ΔE round-trip, CSS literal regex shape, and name/hex echo. Mode-aware `differenceEuclidean('oklch')` (Pitfall 5).
- `frontend/__tests__/styles/tokens-css.test.ts` (NEW) — File-as-text invariant gate. Single hoisted `readFileSync` of `globals.css`; 14 assertions covering oklch token count (≥ 12), `@supports` block, brand-SSOT hex preservation, `[data-theme="dark"]` reservation, 8-point spacing values (whitespace-tolerant per ISSUE-39-03), v2.0 layout/shadow preservation.
- `frontend/app/globals.css` (MODIFIED) — Color tokens swapped to oklch values; spacing scale inserted after `--radius-sm`; `@supports` and `[data-theme="dark"]` blocks appended after default `@theme { ... }` close, before `@theme inline`. Annotation comments cite brand-guidelines vs prototype source per D-02.
- `frontend/package.json` (MODIFIED) — `culori@4.0.2` and `@types/culori@4.0.1` added as devDependencies.
- `frontend/pnpm-lock.yaml` (MODIFIED) — Lockfile updated for the two new dev dependencies.

## ΔE Round-trip Evidence

`node scripts/hex-to-oklch.mjs` output (relevant excerpt — every entry shows `ΔE=0.0000`):

```
/* source: brand-guidelines #d97757 (accent: primary)  ΔE=0.0000 */
--color-orange: oklch(0.6724 0.1308 38.76);
/* source: brand-guidelines #6a9bcc (accent: secondary)  ΔE=0.0000 */
--color-blue: oklch(0.6742 0.0901 249.29);
/* source: brand-guidelines #788c5d (accent: tertiary)  ΔE=0.0000 */
--color-green: oklch(0.6118 0.0713 127.12);
... (all 15 entries report ΔE=0.0000) ...
```

Stderr from the CLI run: empty (zero ΔE warnings — every conversion is well under the 1.0 threshold).

## Brand SSOT Preservation Evidence

```bash
$ grep -E -- '--color-(orange|blue|green):\s+#' frontend/app/globals.css
    --color-orange: #d97757;
    --color-blue: #6a9bcc;
    --color-green: #788c5d;
```

The brand SSOT hex literals appear inside the `@supports not (color: oklch(0% 0 0))` fallback block exactly as v2.0 — anthropics/skills/brand-guidelines colors propagate unchanged for non-oklch browsers.

## Verification

- `pnpm exec vitest run __tests__/scripts/hex-to-oklch.test.ts __tests__/styles/tokens-css.test.ts` → **2 files / 31 tests PASS** (GREEN)
- `pnpm build` → Tailwind v4 compiled successfully; `.next/static/css/*.css` contains `--color-orange:oklch(67.24% .1308 38.76)`, `--color-orange:#d97757` (in `@supports not(...)`), `--spacing-1:4px`, `--spacing-4:16px`, `--spacing-16:64px`
- `pnpm lint` → 0 errors / 0 warnings
- `pnpm typecheck` → 0 errors
- `node scripts/hex-to-oklch.mjs > /tmp/oklch-output.css 2>/tmp/oklch-stderr.txt` → stderr empty, all 15 entries `ΔE=0.0000`
- Full vitest sweep: pre-existing failures (5 files / 23 tests in setup/deadlines/course-detail/layout) unchanged — plan-1 introduces zero regressions

## Decisions Made

- **culori 4.0.2 + @types/culori 4.0.1**: Use as the canonical hex→oklch pipeline (RESEARCH §Standard Stack). `differenceEuclidean('oklch')` with explicit mode arg per Pitfall 5.
- **Library+CLI dual-use**: `scripts/hex-to-oklch.mjs` exports `convert()` so unit tests dynamic-import it instead of re-implementing the math. CLI block guarded by `import.meta.url === \`file://${process.argv[1]}\``. Pattern per PATTERNS.md §hex-to-oklch.mjs.
- **Brand color provenance comments**: Inline `/* source: brand-guidelines #XXXXXX */` for orange/blue/green; `/* source: prototype #XXXXXX */` for amber/purple/red and neutrals. Annotates the SSOT in CSS itself per D-02.
- **`@supports` test value `oklch(0% 0 0)`**: Pitfall 3 — `oklch(0)` is parsed as a number and fails the feature query on Safari < 16.4 / Chrome < 111. Use the syntactically-minimal-but-valid literal.
- **Additive only**: All v2.0 tokens and structures (shadow, layout spacing, animation, keyframes, `@theme inline`) preserved unchanged. Plan-1 is purely additive — visual equivalence guaranteed by both regex assertions in `tokens-css.test.ts` (preservation it() blocks) and Tailwind compile output (no missing utilities).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `hex` destructure in CLI loop**
- **Found during:** Task 2 (GREEN — first lint pass)
- **Issue:** `for (const { name, source, css, hex, delta } of results)` destructured `hex` but the variable was never read inside the `@theme` emit loop (the `@supports` loop *does* use `hex`). `pnpm lint --max-warnings 0` failed with `'hex' is assigned a value but never used`.
- **Fix:** Removed `hex` from the @theme-emit destructure pattern; `@supports` loop kept its destructure since it actually consumes the value.
- **Files modified:** `frontend/scripts/hex-to-oklch.mjs`
- **Verification:** `pnpm lint` returns 0 warnings.
- **Committed in:** `c1de7c9` (Task 2 commit, alongside the GREEN implementation).

**2. [Rule 3 - Blocking] Added `@types/culori@4.0.1` devDependency**
- **Found during:** Task 2 (GREEN — first typecheck pass)
- **Issue:** `pnpm typecheck` (`tsc --noEmit`) errored on `__tests__/scripts/hex-to-oklch.test.ts:17`: `Could not find a declaration file for module 'culori'`. Without types the unit test cannot compile under the project's strict TS config.
- **Fix:** `pnpm add -D @types/culori@4.0.1` (current upstream version, matches culori 4.0.2 runtime).
- **Files modified:** `frontend/package.json`, `frontend/pnpm-lock.yaml`
- **Verification:** `pnpm typecheck` returns 0 errors; `pnpm exec vitest run` continues to pass.
- **Committed in:** `c1de7c9` (Task 2 commit, alongside the GREEN implementation).

---

**Total deviations:** 2 auto-fixed (1 lint warning Rule 1, 1 missing type declarations Rule 3)
**Impact on plan:** Both fixes essential for the plan's verify command to pass cleanly. No scope creep — both modifications are within `files_modified` (script + package.json + lockfile).

## Issues Encountered

- **Pre-existing test failures not from this plan:** 5 test files (`setup/SetupGuard.test.tsx`, `course-detail/CourseDetailPage.test.tsx`, `deadlines/DeadlineCard.test.tsx`, `deadlines/DeadlinesPage.test.tsx`, `layout/AppShell.test.tsx`) fail due to missing `QueryClientProvider` / `NextIntlProvider` wrappers in test setup. Verified via `git stash` of plan-1 changes that the same 5 files / 23 tests fail without our work — these are pre-existing react-query/next-intl test infrastructure gaps, out of scope for plan-1. **Logged as deferred:** these belong in a future test infrastructure plan (separate from v3.0 design tokens).

## TDD Gate Compliance

- **RED gate:** `726eb10` (`test(39-01): add failing tests...`) — both targeted tests fail before implementation exists. Confirmed via `pnpm exec vitest run __tests__/scripts/hex-to-oklch.test.ts __tests__/styles/tokens-css.test.ts` showing module-load error on the script test and 11 assertion failures on the CSS test.
- **GREEN gate:** `c1de7c9` (`feat(39-01): add oklch color tokens + 8-point spacing...`) — both targeted tests pass after implementation. Confirmed via the same command showing **2 files / 31 tests passed**.
- **REFACTOR gate:** Skipped — implementation matched final shape on first pass; no separate refactor commit needed.

Sequence verified in `git log --oneline -3`:
```
c1de7c9 feat(39-01): add oklch color tokens + 8-point spacing + dark-mode reservation per D-01..D-04
726eb10 test(39-01): add failing tests for hex-to-oklch script + tokens-css invariants
d25d0d0 fix(39): revise plans per checker feedback (ISSUE-39-01..07)
```

## User Setup Required

None — no external service configuration required. All work is in-repo.

## Next Phase Readiness

Plan 39-01 unlocks:
- **Plan 39-02 (Typography)**: Will extend `@theme` with `--text-*`, `--leading-*`, `--tracking-*` tokens (per RESEARCH Q1 correction — v4 namespace required for `text-hero` / `leading-section` utility generation).
- **Plan 39-03 (Motion + SSE)**: Will add `--motion-fast/base/slow`, `--ease-claude-out`, SSE keyframes; will run the migration sweep + add ESLint rule (D-16).
- **Phase 40 components** (SHARED-01 Card/Button/Input/Modal/Tooltip; SHARED-02 streaming text): Will consume `var(--color-*)` and `var(--spacing-*)`. Tokens are now available.
- **Phase 43 dark mode**: Empty `[data-theme="dark"] { }` block reserved per D-03 — Phase 43 fills with warm-deep-brown overrides without restructuring globals.css.

No blockers. No concerns.

## Self-Check: PASSED

- ✓ `frontend/scripts/hex-to-oklch.mjs` exists (verified via `ls`)
- ✓ `frontend/__tests__/scripts/hex-to-oklch.test.ts` exists
- ✓ `frontend/__tests__/styles/tokens-css.test.ts` exists
- ✓ `frontend/app/globals.css` modified (Tailwind compile succeeded; oklch + @supports + spacing all present)
- ✓ Commit `726eb10` exists (`git log --oneline -3` confirms)
- ✓ Commit `c1de7c9` exists
- ✓ Both targeted tests pass: `pnpm exec vitest run` returns `2 passed (2)` / `31 passed (31)`
- ✓ `pnpm build` succeeds; `.next/static/css/` contains expected token output
- ✓ `pnpm lint` returns 0 errors / 0 warnings
- ✓ `pnpm typecheck` returns 0 errors
- ✓ Pre-existing test failures unchanged (5 files / 23 tests both before and after plan-1)

---
*Phase: 39-design-token-foundation*
*Plan: 01*
*Completed: 2026-04-30*
