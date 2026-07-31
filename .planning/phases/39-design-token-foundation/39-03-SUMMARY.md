---
phase: 39-design-token-foundation
plan: 03
subsystem: ui
tags: [design-tokens, motion, sse, eslint, tailwind-v4, tdd-foundation]

# Dependency graph
requires:
  - phase: 01-design-system-foundation
    provides: existing @theme block in globals.css, base ESLint flat config (eslint-config-next + SEED-001 react-hooks overrides)
  - phase: 38-first-load-performance
    provides: tests/e2e/perf/helpers/auth.ts + clock.ts (loginAsPerfTestUser, shouldRunPerfSuite, installFixedClock); Playwright spec template (first-paint.spec.ts); maxDiffPixelRatio convention
  - phase: 39-design-token-foundation/plan-01
    provides: oklch color tokens, 8-point spacing scale, @supports fallback layer, [data-theme="dark"] reservation block
  - phase: 39-design-token-foundation/plan-02
    provides: 4-tier typography scale (text-hero/section/body/caption), TYPO-USAGE.md, file-as-text vitest idiom
provides:
  - "Motion tokens: --motion-fast (150ms), --motion-base (250ms), --motion-slow (400ms), --ease-claude-out cubic-bezier(0.165, 0.85, 0.45, 1) per v3.0 brand spec D-13"
  - "v2.0 legacy ease aliases re-installed per D-14: --ease (0.28s cubic-bezier(0.4,0,0.2,1)) and --ease-fast (0.15s ease) to preserve rhythm at the 50+ existing call sites"
  - "SSE primitives (Phase 40 SHARED-02 consumer): @keyframes streaming-cursor-blink (50%/50.01% opacity flip — RESEARCH Q7 canonical pattern, NOT alternate) + @keyframes streaming-chunk-fadein + semantic aliases --motion-stream-cursor-period (1s) and --motion-stream-chunk-fadein (var(--motion-fast))"
  - "Animation tokens: --animate-streaming-cursor-blink (step-end infinite, no alternate) + --animate-streaming-chunk-fadein (forwards, ease-claude-out)"
  - "Empty @media (prefers-reduced-motion: reduce) {} stub reserved for Phase 41 A11Y-05 enforcement (RESEARCH Q5)"
  - "ESLint no-restricted-syntax rule (D-16): two selectors (Literal + TemplateElement) blocking transition-{all|colors} duration-{N|[Xs]} in JSX className with migration recipe in error message"
  - "5 Wave 0 test/spec scaffolds: motion-tokens.test.ts, sse-keyframes.test.ts, eslint/no-raw-transition.test.ts (TDD GREEN), lint/no-raw-transition.test.ts (RED, plan-4 closes), tests/e2e/phase39-transition-parity.spec.ts (Playwright, baselines deferred to plan-4)"
  - "TDD plan ESLint rule TDD'd via in-process Linter test running on 4 fixture sources (shortcut FLAGS / bracket FLAGS / migrated CLEAN / template-literal FLAGS)"
affects: [39-04-transition-sweep, 40-shared-components, 40-shared-streaming, 41-states-a11y, 42-newvis, 43-dark-mode]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tailwind v4 @theme block additive extension: motion + SSE primitives appended after --animate-skeleton-shimmer; keyframes live inside @theme block (NOT @theme inline) per RESEARCH §Pitfall 2"
    - "v2.0 legacy preservation idiom: re-install --ease/--ease-fast aliases alongside new tokens per D-14; v2.0 components still consume var(--ease) without rhythm shift"
    - "RESEARCH Q-correction propagation: Q7 contradiction with CONTEXT.md D-15 'alternate' wording was caught by RESEARCH and codified in (a) CSS comment block in globals.css and (b) regex-negative assertion in sse-keyframes.test.ts so the pattern can never silently regress"
    - "Empty media-query reservation stub for forward compatibility: ~30 byte cost, zero runtime effect (browser ignores empty rule), gives Phase 41 a co-located target with motion tokens"
    - "ESLint custom rule via no-restricted-syntax: dual-selector (Literal + TemplateElement) covers static strings AND template-literal interpolations; no plugin install, ESLint core only"
    - "TDD ESLint rule via in-process Linter class: faster than full ESLint runner, no fixture file on disk, supports 4 fixture-string assertions in single suite"
    - "createRequire rooted on eslint-config-next module path: resolves @typescript-eslint/parser through pnpm strict symlink layer"

key-files:
  created:
    - frontend/__tests__/styles/motion-tokens.test.ts
    - frontend/__tests__/styles/sse-keyframes.test.ts
    - frontend/__tests__/eslint/no-raw-transition.test.ts
    - frontend/__tests__/lint/no-raw-transition.test.ts
    - frontend/tests/e2e/phase39-transition-parity.spec.ts
  modified:
    - frontend/app/globals.css
    - frontend/eslint.config.mjs

key-decisions:
  - "Adopted RESEARCH §Q7 correction over CONTEXT.md D-15: the streaming-cursor-blink animation uses '1s step-end infinite' (no alternate). D-15 said 'infinite alternate' which would have created a 2s perceived period because the keyframe replays in reverse. Codified in CSS comment + regex-negative test."
  - "v2.0 legacy --ease and --ease-fast aliases re-installed inside the @theme motion block (D-14). Discovery: plan-1 had not actually preserved them in globals.css; the test acceptance criteria in plan-3 expected them, so this commit installs them additively rather than waiting for Phase 40 deprecation."
  - "Reduced-motion stub placed OUTSIDE @theme block (after @theme inline close, before /* Base styles */) per RESEARCH §Pitfall 2 — @theme is for tokens; @media goes at root-scope CSS level."
  - "Tailwind v4 @theme insertion point: appended after --animate-skeleton-shimmer per PATTERNS.md insertion guidance — keeps animation tokens grouped logically; new keyframes precede existing skeleton-shimmer keyframe so they're discoverable when reading the @theme block top-to-bottom."
  - "ESLint rule installed via inline no-restricted-syntax (D-16) — no eslint-plugin-* install. Two selectors required: Literal for static className=\"...\" strings, TemplateElement for className={\\`...\\`} template-literal interpolations (Pitfall 6). createRequire pattern resolves @typescript-eslint/parser under pnpm strict for the in-process Linter test."
  - "Playwright spec staged WITHOUT baselines — plan-4 will run --update-snapshots once on the migrated frontend after the sed sweep closes the 56-occurrence migration surface."

patterns-established:
  - "TDD plan-3 RED → GREEN: 4 vitest scaffolds + 1 Playwright stub committed first; 3 of 4 vitest files turn green via Task 2; the 4th (lint sweep completeness) STAYS RED as the plan-4 completion gate"
  - "Q7-correction-as-test-invariant: RESEARCH-discovered contradictions with CONTEXT.md decisions are preserved as negative regex assertions in tests so they cannot silently regress (e.g., sse-keyframes.test.ts asserts the animation token does NOT contain 'alternate')"
  - "Empty @media stub reservation: ~30 bytes for forward-compat phase boundary handoff (Phase 41 fills); cost-free pattern for cross-phase coordination"
  - "ESLint Linter in-process test idiom: createRequire(require.resolve('eslint-config-next')) → req.resolve('@typescript-eslint/parser') → req(parserPath) walks the pnpm strict symlink layer to load the transitively-installed parser without a top-level dependency"

requirements-completed: [DESIGN-03, MOTION-02]
requirements-partial: [MOTION-01]
requirements-partial-note: "MOTION-01 anti-regression rule installed (D-16 ESLint rule) and TDD'd. Plan-4 completes MOTION-01 by running the 56-occurrence sed sweep + 6 manual edge-case edits + Playwright visual regression baselines (turns lint/no-raw-transition.test.ts GREEN)."

# Metrics
duration: 8min
completed: 2026-04-30
---

# Phase 39 Plan 03: Motion Tokens + SSE Streaming + ESLint Foundation Summary

**Motion timing tokens (--motion-fast/base/slow + --ease-claude-out), SSE streaming keyframes (streaming-cursor-blink with step-end infinite per RESEARCH Q7 correction — NOT alternate; streaming-chunk-fadein), v2.0 legacy --ease/--ease-fast aliases (D-14), empty prefers-reduced-motion stub for Phase 41, and an ESLint no-restricted-syntax rule blocking raw `transition-{all,colors} duration-{N|[Xs]}` in JSX className landed additively in `frontend/app/globals.css` and `frontend/eslint.config.mjs` under TDD RED→GREEN. Three test invariants pass GREEN (motion-tokens, sse-keyframes, eslint/no-raw-transition); the lint-sweep completeness invariant and Playwright visual baselines stay RED until plan-4 runs the 56-occurrence migration sweep.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-30T01:02:57Z
- **Completed:** 2026-04-30T01:11:03Z
- **Tasks:** 2 (TDD pair: RED scaffolds → GREEN implementation)
- **Files touched:** 7 (5 created, 2 modified)

## Accomplishments

- DESIGN-03 motion tokens declared in `@theme` block: `--motion-fast: 150ms`, `--motion-base: 250ms`, `--motion-slow: 400ms`, `--ease-claude-out: cubic-bezier(0.165, 0.85, 0.45, 1)`
- D-14 v2.0 legacy aliases preserved: `--ease: 0.28s cubic-bezier(0.4, 0, 0.2, 1)` and `--ease-fast: 0.15s ease` co-installed inside the motion block with deprecation comment
- MOTION-02 SSE primitives published: `@keyframes streaming-cursor-blink` (50%/50.01% opacity flip per RESEARCH Q7 — NOT alternate); `@keyframes streaming-chunk-fadein`; semantic aliases `--motion-stream-cursor-period: 1s` and `--motion-stream-chunk-fadein: var(--motion-fast)`; animation tokens `--animate-streaming-cursor-blink: streaming-cursor-blink var(--motion-stream-cursor-period) step-end infinite` (NO alternate) and `--animate-streaming-chunk-fadein: streaming-chunk-fadein var(--motion-stream-chunk-fadein) var(--ease-claude-out) forwards`
- A11Y-05 stub: empty `@media (prefers-reduced-motion: reduce) { }` reserved between `@theme inline` close and `/* Base styles */` per RESEARCH Q5; Phase 41 fills with universal-selector overrides
- D-16 ESLint rule installed: `no-restricted-syntax` with two selectors (`Literal[value=...]` + `TemplateElement[value.raw=...]`) blocking `transition-(all|colors) duration-(\[[^\]]*\]|\d+)` regex; error message points users to migrated form `[transition-duration:var(--motion-fast|base|slow)] [transition-timing-function:var(--ease-claude-out)]`
- 5 Wave 0 test/spec deliverables present: motion-tokens / sse-keyframes / eslint/no-raw-transition (3 GREEN) + lint/no-raw-transition (RED, plan-4 closes) + tests/e2e/phase39-transition-parity.spec.ts (staged for plan-4 baselines)
- All v2.0 + plan-1 + plan-2 invariants preserved: 21 oklch color tokens + hex `@supports` fallback, 8-point spacing scale, 4-tier typography scale, layout tokens, shadow tokens, radius tokens, existing `--animate-*` (slide-up/fade-in/gentle-bob/drop-in/spin/skeleton-shimmer), existing `@keyframes`, `@theme inline` (next/font), `[data-theme="dark"]` reservation — zero regression

## Task Commits

Each task committed atomically per TDD discipline:

1. **Task 1 (RED): failing motion/sse/eslint/lint/Playwright test scaffolds** — `1a8e434` (test)
2. **Task 2 (GREEN): motion + SSE + reduced-motion stub + ESLint rule** — `28e750c` (feat)

_REFACTOR step skipped — implementation matched final shape on first pass._

## Files Created/Modified

- `frontend/__tests__/styles/motion-tokens.test.ts` (NEW, 60 lines) — File-as-text vitest unit. Single hoisted `readFileSync`; 5 it() blocks asserting --motion-fast/base/slow exact values, --ease-claude-out cubic-bezier signature with escaped parens, and v2.0 legacy --ease/--ease-fast preservation (D-14).
- `frontend/__tests__/styles/sse-keyframes.test.ts` (NEW, 71 lines) — File-as-text vitest unit. 5 it() blocks: cursor + chunk keyframes present, animation token uses `step-end infinite` AND does NOT contain `alternate` (Q7 enforcement), semantic alias values verified. Negative regex assertion makes Q7 contradiction with D-15 unable to silently regress.
- `frontend/__tests__/eslint/no-raw-transition.test.ts` (NEW, 135 lines) — TDD spec for the no-restricted-syntax rule. Dynamic-imports `eslint.config.mjs`, locates the rule block, runs in-process `Linter.verify()` against 4 fixtures (shortcut FLAGS / bracket FLAGS / migrated CLEAN / template-literal FLAGS). `@typescript-eslint/parser` resolved via `createRequire` rooted on `eslint-config-next` to walk pnpm strict symlinks.
- `frontend/__tests__/lint/no-raw-transition.test.ts` (NEW, 75 lines) — In-process recursive walk over `app/` + `components/` via `node:fs`. 2 it() blocks asserting zero matches for shortcut form `/transition-(all|colors)\s+duration-[0-9]/` and bracket form `/transition-(all|colors)\s+duration-\[[^\]]+\]/`. **Stays RED at end of plan-3** — currently 3 files in `components/layout/` violate bracket form (Header.tsx, NotificationPanel.tsx, Sidebar.tsx); plan-4 sed sweep + manual edge-case edits closes.
- `frontend/tests/e2e/phase39-transition-parity.spec.ts` (NEW, 109 lines) — Playwright visual regression spec. 10 pages (D-11), `@phase39 @transition-parity` describe tag, `maxDiffPixelRatio: 0.005` per-call (D-11 stricter than playwright.config.ts default 0.02), `test.skip(!shouldRunPerfSuite())` env-gate idiom from Phase 38 P04. Imports `loginAsPerfTestUser` + `installFixedClock` from `./perf/helpers/`. Auth page flagged `noLogin: true` and clears cookies in test.beforeEach. **Baselines NOT generated this plan** — plan-4 Task 3 (checkpoint) generates after migration.
- `frontend/app/globals.css` (MODIFIED, +59 lines) — Inserted DESIGN-03 motion tokens + D-14 legacy aliases + MOTION-02 SSE primitives + 2 new keyframes after `--animate-skeleton-shimmer` (line 126), before existing `@keyframes skeleton-shimmer` block. Inserted reduced-motion stub after `@theme inline` close (line 278), before `/* Base styles */`. No deletions or restructuring of existing tokens.
- `frontend/eslint.config.mjs` (MODIFIED, +28 lines) — Inserted D-16 no-restricted-syntax block BEFORE the existing `{ ignores: [...] }` block (per PATTERNS.md additive insertion convention). Two selectors with English-only comment header and migration recipe in error messages.

## ESLint Rule Installation Evidence

`pnpm exec vitest run __tests__/eslint/no-raw-transition.test.ts` output:

```
Test Files  1 passed (1)
     Tests  5 passed (5)
```

Five passing assertions:
1. `the rule block exists in eslint.config.mjs` (config loads + selector present)
2. `flags transition-all duration-150 in JSX className Literal` (shortcut form FLAGS)
3. `flags transition-colors duration-[0.15s] (bracket form per Pitfall 6)` (bracket form FLAGS)
4. `does NOT flag the migrated form [transition-duration:var(--motion-fast)]` (migrated CLEAN)
5. `flags transition-all duration in template literal (TemplateElement selector)` (template-literal FLAGS)

`pnpm exec next build --no-lint` succeeds — the rule is installed but Tailwind v4 compiles all tokens cleanly. `pnpm exec next lint` reports 56 violations across 36 files (the expected migration surface plan-4 will close).

## D-15 → Q7 Correction Documentation

The Q7 correction is preserved in three locations so it cannot silently regress:

1. **CSS comment in `globals.css`** inside `@keyframes streaming-cursor-blink`:
   ```
   Per RESEARCH Q7 correction to D-15: D-15 originally said
   "1s step-end infinite alternate"; RESEARCH proves alternate is wrong
   (creates a 2s perceived period because the keyframe replays in reverse).
   Canonical pattern: opacity flips at the 50% / 50.01% boundary,
   no alternate. Source: amitmerchant.com/simple-blinking-cursor-animation-using-css/
   ```
2. **Negative regex assertion** in `sse-keyframes.test.ts`:
   ```ts
   expect(blinkDef?.[0]).not.toMatch(/alternate/);
   ```
3. **Plan-3 commit message** (`28e750c`) explicitly notes the deviation and rationale.

## Q5 Stub Status

Empty `@media (prefers-reduced-motion: reduce) { }` block reserved at line 292 of `globals.css`. Body contains a single placeholder comment for Phase 41 A11Y-05; cost ~30 bytes; zero runtime effect (browser ignores empty rule sets). Phase 41 will fill with universal-selector overrides preserving SSE streaming-cursor-blink as the documented exception.

## Verification

- `pnpm exec vitest run __tests__/styles/motion-tokens.test.ts __tests__/styles/sse-keyframes.test.ts __tests__/eslint/no-raw-transition.test.ts` → **3 files / 15 tests PASS** (GREEN)
- `pnpm exec vitest run __tests__/styles` → **4 files / 35 tests PASS** (plan-1 tokens-css + plan-2 typography + plan-3 motion + sse all green; no regression)
- `pnpm exec vitest run __tests__/lint/no-raw-transition.test.ts` → **STAYS RED** as designed; 2 violations report (Header.tsx, NotificationPanel.tsx, Sidebar.tsx bracket form) — plan-4 closes
- `pnpm typecheck` → **0 errors**
- `pnpm exec next build --no-lint` → success; CSS bundle contains `--motion-fast:.15s`, `--motion-base:.25s`, `--motion-slow:.4s`, `--ease-claude-out:cubic-bezier(.165...)`, `streaming-cursor-blink` keyframe, `--animate-streaming-cursor-blink: streaming-cursor-blink var(--motion-str…)` semantic alias
- `pnpm lint` → **EXPECTED to fail** with 56 violations across 36 files — the rule fires on raw `transition-{all|colors} duration-{N|[Xs]}` in pre-existing JSX className strings; plan-4 closes by running the sed sweep + 6 manual edge-case edits
- AC grep gates all pass: motion tokens whitespace-tolerant regex matches all four; SSE keyframes both present; animation token contains `step-end infinite` and NOT `alternate`; semantic aliases `1s` and `var(--motion-fast)`; D-14 legacy `--ease(-fast)?:` matches present (count = 2); Q5 stub `@media (prefers-reduced-motion: reduce)` matches once; ESLint `no-restricted-syntax` count = 1; both selector keywords `Literal[value=` + `TemplateElement[value.raw=` present; `transition-(all|colors)` regex present in eslint.config.mjs

## Decisions Made

- **RESEARCH Q7 correction over CONTEXT.md D-15** — D-15 said `1s step-end infinite alternate`. RESEARCH proves `alternate` produces a 2s perceived blink period because CSS animation `alternate` replays the keyframe in reverse on the second iteration; with our 50%/50.01% opacity flip keyframe, that produces a 1s-on / 1s-off pulse, not the desired 0.5s-on / 0.5s-off blink. Plan-3 codifies the correction in CSS comment + regex-negative test invariant.
- **D-14 legacy aliases re-installed** — the plan acceptance criteria explicitly required `--ease:` and `--ease-fast:` token names in globals.css after plan-3 (D-14 preservation). Plan-1 did not actually preserve them; plan-3 installs them additively inside the new motion block with deprecation comment.
- **Reduced-motion stub OUTSIDE @theme** — RESEARCH Pitfall 2 distinguishes `@theme` (for tokens registered with Tailwind v4 namespace registry) from root-scope CSS rules (`@media`, `:root`, etc.). The empty `@media (prefers-reduced-motion: reduce) { }` block goes at root scope after `@theme inline` close; not inside any `@theme` block.
- **ESLint rule via no-restricted-syntax (no plugin)** — D-16 explicitly considered both inline rule and dedicated plugin install; chose inline because the rule is project-specific (transition-className → motion-token migration), not generally reusable. ESLint core ships `no-restricted-syntax`; no `package.json` changes required.
- **Two selectors required (Literal + TemplateElement)** — Tailwind classNames appear as both static strings (`className="..."`) and template-literal interpolations (`` className={`...${x}...`} ``). The Tailwind utility regex must match both AST shapes; one selector each.
- **Auto-installed `createRequire` parser resolution** — pnpm strict mode does not symlink `@typescript-eslint/parser` at the top level. The Linter test uses `createRequire(require.resolve('eslint-config-next'))` to root the resolution at the eslint-config-next module path, which IS symlinked, then resolves the parser through that subgraph.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vite static-import resolution failed for `@typescript-eslint/parser`**
- **Found during:** Task 1 (RED — first vitest run on no-raw-transition.test.ts)
- **Issue:** Initial implementation used `await import("@typescript-eslint/parser")` inside a `try/catch`. Vite's static analyzer resolves the import literal at transform time, BEFORE the try/catch can swallow the error. pnpm strict mode does not symlink `@typescript-eslint/parser` at the top of `frontend/node_modules/`, so resolution fails at module-load time and the entire test file fails to import.
- **Fix:** Replaced static `await import` with `createRequire(require.resolve('eslint-config-next'))` rooted on the eslint-config-next module path. eslint-config-next IS symlinked at the top level, and `@typescript-eslint/parser` is reachable through its require subgraph because eslint-config-next declares it as a dependency. The runtime require call no longer hits Vite's static analyzer.
- **Files modified:** `frontend/__tests__/eslint/no-raw-transition.test.ts`
- **Verification:** `pnpm exec vitest run __tests__/eslint/no-raw-transition.test.ts` → 5 tests pass.
- **Committed in:** `1a8e434` (Task 1 RED commit — fix applied before commit so the RED state was the right kind of red).

**2. [Rule 3 - Blocking] TypeScript narrowed PAGES tuple too tightly, blocking `noLogin` destructure**
- **Found during:** Task 2 (GREEN — first `pnpm typecheck` run after creating phase39-transition-parity.spec.ts)
- **Issue:** The `PAGES` array was declared as a `readonly` tuple with `as const`. TS narrowed each entry to its exact literal type, so only the auth entry had the `noLogin` property in its type, and `for (const { path, name, noLogin } of PAGES)` errored on every other entry: `Property 'noLogin' does not exist on type '{ readonly path: "/zh-CN"; readonly name: "dashboard"; }' | ...`.
- **Fix:** Introduced an explicit `PageEntry` type with optional `noLogin?: boolean`, declared `PAGES: readonly PageEntry[]`. TS no longer narrows; the destructure works for all 10 entries; auth correctly gets `noLogin: true` and the rest get `undefined`.
- **Files modified:** `frontend/tests/e2e/phase39-transition-parity.spec.ts`
- **Verification:** `pnpm typecheck` → 0 errors.
- **Committed in:** `28e750c` (Task 2 GREEN commit, alongside motion + SSE + ESLint rule).

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues that prevented the verify command from passing). Both essential for the plan's verify chain. No scope creep — modifications stayed within `files_modified`.

## Issues Encountered

- **Pre-existing test failures unchanged**: 6 test files (course-detail / deadlines / setup / layout) fail in full vitest sweep due to missing `QueryClientProvider` / `NextIntlProvider` test wrappers (per plan-1 + plan-2 SUMMARY). Confirmed plan-3 introduces zero new regressions. Out of scope for v3.0 design tokens.
- **Lint sweep test stays RED by design** — `__tests__/lint/no-raw-transition.test.ts` reports violations across `components/layout/{Header,NotificationPanel,Sidebar}.tsx` (bracket form `transition-all duration-[0.15s]`) and the broader 56-occurrence migration surface for shortcut form. This is the **plan-4 completion gate**: when plan-4 finishes the sed sweep + 6 manual edge-case edits, this test turns GREEN.
- **`pnpm lint` (and therefore `pnpm build`) fails** — expected per plan acceptance criterion #7 ("`pnpm lint` is EXPECTED to fail (rule fires on 56 existing transition occurrences) — plan-4 fixes by sweep"). `pnpm exec next build --no-lint` confirms the CSS + TS compile cleanly; only the new ESLint rule fires.

## Lint/Sweep Test (lint/no-raw-transition.test.ts) RED Status

This is the **plan-4 completion gate**, NOT a plan-3 failure:
- Plan-3 ships the **rule + tokens + tests** (foundation).
- Plan-4 will run the 56-occurrence sed sweep across 36 files in `app/` + `components/`, hand-edit 6 edge cases (`transition-[background]` / `ease-in-out` adjacency in StepIndicator, SuccessStep, etc.), and commit Playwright baselines.
- The lint sweep test turns GREEN simultaneously with plan-4's sed sweep landing — its failure mode is the **definition** of the plan-4 not-yet-done state.

## Phase39-Transition-Parity Spec Stub Status

`frontend/tests/e2e/phase39-transition-parity.spec.ts` is staged with:
- 10 pages in scope (dashboard, courses, course-detail/comp2017, deadlines, predict, digest, timetable, settings, auth no-login, setup) per CONTEXT.md D-11
- `@phase39 @transition-parity` describe tag for selective CI runs
- `maxDiffPixelRatio: 0.005` per-call (D-11 stricter than `playwright.config.ts`'s 0.02 default)
- `test.skip(!shouldRunPerfSuite(), ...)` env-gate from Phase 38 P04
- Reuses `loginAsPerfTestUser`, `installFixedClock`, `shouldRunPerfSuite` helpers from `tests/e2e/perf/helpers/`

**No baselines committed** — plan-4 Task 3 (checkpoint) runs `pnpm exec playwright test phase39-transition-parity.spec.ts --update-snapshots` after the sed sweep migration is verified visually equivalent, then commits the resulting `.png` files under `tests/e2e/__screenshots__/`.

## Cross-plan Regression Check (plan-1 + plan-2 still in place)

- `pnpm exec vitest run __tests__/styles` → **4 files / 35 tests PASS** (plan-1 tokens-css 14 + plan-2 typography 11 + plan-3 motion 5 + plan-3 sse 5 = 35)
- Plan-1 invariants verified intact: oklch tokens still declared (≥ 12), `@supports not (color: oklch(0% 0 0))` fallback block present, brand SSOT hex literals (#d97757 / #6a9bcc / #788c5d) preserved in fallback, `[data-theme="dark"]` reservation block present, 8-point spacing scale all 8 entries present, layout tokens all 4 entries present, shadow tokens all 3 entries present
- Plan-2 invariants verified intact: 4 size tokens (--text-hero/section/body/caption), 4 leading tokens (--leading-*), 3 tracking tokens (--tracking-hero/section/caption — body intentionally omitted per Q6), exact rem values match, namespace correction comment present

## TDD Gate Compliance

- **RED gate:** `1a8e434` (`test(39-03): add failing motion+sse+eslint+lint+playwright test scaffolds (RED)`) — 4 vitest files committed before implementation; confirmed via `pnpm exec vitest run` showing 4 files / 16 failing tests.
- **GREEN gate:** `28e750c` (`feat(39-03): add motion tokens + SSE keyframes (no alternate per Q7) + reduced-motion stub + ESLint no-restricted-syntax rule`) — 3 of 4 vitest files turn GREEN (motion-tokens, sse-keyframes, eslint/no-raw-transition = 15 tests passing); the 4th (lint sweep completeness) STAYS RED as designed for plan-4.
- **REFACTOR gate:** Skipped — implementation matched final shape on first pass.

Sequence verified in `git log --oneline -3`:

```
28e750c feat(39-03): add motion tokens + SSE keyframes (no alternate per Q7) + reduced-motion stub + ESLint no-restricted-syntax rule
1a8e434 test(39-03): add failing motion+sse+eslint+lint+playwright test scaffolds (RED)
b8be445 docs(39-02): complete Typography Token Layer plan
```

## User Setup Required

None — no external service configuration required. All work is in-repo.

## Next Phase Readiness

Plan 39-03 unlocks:

- **Plan 39-04 (transition migration sweep)**: Will run the 56-occurrence sed playbook (Form A duration-150/200/300, Form B duration-[0.15s] / [0.28s]) + 6 manual edge-case edits (StepIndicator `transition-[background]`, SuccessStep `ease-in-out`, Sidebar/Header/NotificationPanel bracket form) + Playwright baseline checkpoint after visual review. The motion tokens (`var(--motion-fast/base/slow)` + `var(--ease-claude-out)`) are now installed and ready to migrate to.
- **Phase 40 SHARED-01 (Card/Button/Input/Modal/Tooltip)**: Can now use the migrated arbitrary-property form `[transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]` from day 1; the ESLint rule blocks accidental regression to raw `transition-all duration-N` on every PR.
- **Phase 40 SHARED-02 (no-bubble streaming AI reply)**: Will consume `--animate-streaming-cursor-blink` (1s step-end infinite — no alternate, terminal-cursor pattern) and `--animate-streaming-chunk-fadein` (var(--motion-fast) ease-claude-out forwards) via React `<StreamingCursor>` / `<StreamingText>` components and the `useStreamingText` hook. Three SSE pages (Digest, Predict, Deadlines AI chat) migrate together.
- **Phase 41 A11Y-05 (`prefers-reduced-motion`)**: Empty `@media (prefers-reduced-motion: reduce) { }` block reserved at globals.css line 292; Phase 41 fills with universal-selector overrides (animation-duration / transition-duration / animation-iteration-count / scroll-behavior all set to safe values), preserving SSE streaming-cursor-blink as the documented exception (essential AI feedback per Phase 41 ROADMAP success criterion 6).

## Threat Model Disposition

Per plan-3's `<threat_model>`:
- **T-39-16** (Tampering — eslint.config.mjs no-restricted-syntax block) — **mitigated**: TDD'd via in-process Linter test; rule selectors PR-reviewed; CI lint runs on every PR.
- **T-39-17** (Tampering — globals.css motion + SSE keyframes) — **mitigated**: TDD'd via 3 file-as-text vitest specs (motion-tokens, sse-keyframes, plan-1 tokens-css); brand SSOT preserved (D-14 legacy aliases unchanged after addition); Q7 correction codified in CSS comment + negative regex test.
- **T-39-19** through **T-39-24** — accepted / non-applicable per disposition table; no auth, session, or crypto surface added.

No new threat surface introduced. No Threat Flags raised.

## Self-Check: PASSED

- ✓ `frontend/__tests__/styles/motion-tokens.test.ts` exists
- ✓ `frontend/__tests__/styles/sse-keyframes.test.ts` exists
- ✓ `frontend/__tests__/eslint/no-raw-transition.test.ts` exists
- ✓ `frontend/__tests__/lint/no-raw-transition.test.ts` exists
- ✓ `frontend/tests/e2e/phase39-transition-parity.spec.ts` exists
- ✓ `frontend/app/globals.css` modified additively (motion + SSE + reduced-motion stub)
- ✓ `frontend/eslint.config.mjs` modified additively (no-restricted-syntax block)
- ✓ Commit `1a8e434` (RED scaffolds) exists in `git log --oneline -3`
- ✓ Commit `28e750c` (GREEN implementation) exists
- ✓ All 3 GREEN vitest files pass: 15/15 tests
- ✓ Lint sweep test stays RED as designed (plan-4 closes)
- ✓ `pnpm typecheck` → 0 errors
- ✓ `pnpm exec next build --no-lint` → success; tokens compile into CSS bundle
- ✓ `pnpm lint` EXPECTED to fail (56 occurrences) per plan acceptance criterion #7
- ✓ All AC grep gates pass: motion tokens, SSE keyframes, animation token (step-end + no alternate), semantic aliases, D-14 legacy preservation count = 2, Q5 stub count = 1, ESLint rule count = 1, both selectors present
- ✓ Plan-1 + plan-2 invariants still pass (tokens-css.test.ts 14 + typography-tokens.test.ts 11 = 25 tests still GREEN)

---
*Phase: 39-design-token-foundation*
*Plan: 03 — Motion Tokens + SSE Streaming + ESLint Foundation*
*Completed: 2026-04-30*
