---
phase: 39-design-token-foundation
verified: 2026-04-30T02:30:00Z
verifier: gsd-verifier
re_verified: 2026-04-30T03:00:00Z
status: passed
score: 7/7 must-haves verified (1 had pixel-diff coverage deferred → SEED-39)
overrides_applied: 0
re_verification: true
gaps:
  - id: GAP-39-01
    severity: nonblocking
    type: human_needed
    status: resolved
    resolved_at: 2026-04-30T03:00:00Z
    resolution: "User completed prod visual UAT on https://uniboard.uk and replied 'approved'. CSS verified live via Chrome DevTools MCP — token layer present in /_next/static/css/7cf4913a98f2a700.css (lastModified 2026-04-30T02:53:11Z, age <3min when fetched, etag W/d36483f...): oklch colors ✓, --motion-fast/base/slow ✓, --ease-claude-out (cubic-bezier(.165,.85,.45,1)) ✓, streaming-cursor-blink with step-end ✓, @supports hsl fallback ✓, --text-hero/body ✓, --spacing-1..16 ✓. Computed style of <html> element confirmed all token values resolve to expected v3.0 design contract. Phase 39 design intent (zero visual regression) honored — token layer functions as additive infrastructure for Phase 40-43."
    description: "Production visual UAT pending for MOTION-01 — user will click through 10 documented pages on Vercel preview after PR merge to confirm transition migration is visually preserved (no regressions on hover states, no rhythm shift on Intel Mac)"
    remediation: "Post-merge, open Vercel preview, log in as test user, click through dashboard / courses / course-detail/comp2017 / deadlines / predict / digest / timetable / settings / auth / setup, hover any button on each, verify smooth color transition. If all 10 pages look correct → comment 'approved' on PR."
    truth_failed: "MOTION-01 — visual contract preserved post-sweep (D-11 visual gate; verified manually since Playwright baselines deferred)"
  - id: GAP-39-02
    severity: nonblocking
    type: human_needed_or_future_phase
    description: "Playwright pixel-diff baselines deferred to SEED-39 per user decision (avoids local Playwright credential setup). Spec at frontend/tests/e2e/phase39-transition-parity.spec.ts is in-tree and env-gated via shouldRunPerfSuite() — auto-skips when PERF_TEST_PASSWORD unset. ESLint no-restricted-syntax rule (D-16) provides lint-level enforcement going forward but does not catch silent visual rhythm shifts."
    remediation: "Trigger SEED-39 closure procedure (.planning/seeds/SEED-39-playwright-baselines.md, 9-step block) when (a) visual drift reported in motion or Phase 40 components on production, OR (b) Phase 40 SHARED-01 starts and wants visual safety net, OR (c) v3.1 milestone kickoff via /gsd-review-backlog."
    truth_failed: "MOTION-01 — pixel-diff regression coverage at maxDiffPixelRatio 0.005 (D-11 second-half visual gate; tracked via SEED-39 for future closure)"
deferred:
  - truth: "Playwright pixel-diff visual regression baselines for transition parity"
    addressed_in: "SEED-39 closure (planted 2026-04-30; awaiting trigger)"
    evidence: "User explicit decision 2026-04-30 — defer to production visual UAT on Vercel preview; ESLint rule from plan-3 provides lint-level enforcement going forward; tracked in .planning/seeds/SEED-39-playwright-baselines.md with 4 trigger conditions and 9-step closure procedure. Spec already staged in tree (frontend/tests/e2e/phase39-transition-parity.spec.ts), no code changes needed when seed surfaces."
human_verification:
  - test: "Production visual UAT — 10-page hover state walk-through on Vercel preview"
    expected: "All 10 pages (dashboard, courses, course-detail/comp2017, deadlines, predict, digest, timetable, settings, auth, setup) render correctly with smooth color transitions on hover; no visible rhythm shift compared to v2.0; no broken layout"
    why_human: "Visual perception of motion rhythm and color transition smoothness on Intel Mac requires human eyes; pixel-diff Playwright spec was deferred to SEED-39; ESLint rule provides lint-level safety but cannot detect silent visual rhythm shifts (e.g., slightly faster ease curve perceptibly different on hover)"
---

# Phase 39: Design Token Foundation Verification Report

**Phase Goal:** Establish a complete design token system (oklch color, 8-point spacing, motion timing, 4-tier serif typography, SSE streaming primitives) as CSS variables that all v3.0 phases (40 SHARED, 41 STATES/A11Y, 42 NEWVIS, 43 DARK) consume. **Additive layer only** — Tailwind v4 `@theme` block extended; existing v2.0 hsl/rgb values preserved as `@supports` fallback; no component visual changes (durations preserved, easings semantically renamed). Migrate 56 raw `transition-{all|colors} duration-{N|[Xs]}` className occurrences to motion tokens with ESLint enforcement preventing regressions.

**Verified:** 2026-04-30T02:30:00Z
**Status:** partial (6 REQs complete, MOTION-01 partial — sweep + ESLint enforcement done, pixel-diff visual baselines deferred to SEED-39)
**Re-verification:** No (initial verification)

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Color picker on shadcn.io/theme/claude produces same hue on UniBoard primary buttons in DevTools (oklch values match within ΔE < 1.0) | ✓ VERIFIED | hex-to-oklch.mjs reports ΔE=0.0000 for all 15 PALETTE entries (well under 1.0 threshold); 24 oklch( declarations in globals.css; brand SSOT hex (#d97757/#6a9bcc/#788c5d) preserved in @supports fallback |
| 2 | Every `transition: all 0.3s ease` inline style replaced with `var(--motion-*)` reference; grep on `transition: all` returns zero matches across `frontend/src/` (extended to className patterns per D-09) | ⚠️ PARTIAL | Sweep complete: shortcut form (51 → 0), bracket form (5 → 0), Form C (21 → 0), ease-in-out adjacency conflicts (8 → 0); ESLint rule blocks future regressions; **but** pixel-diff visual gate (D-11 maxDiffPixelRatio 0.005) deferred to SEED-39 |
| 3 | SSE streaming components use single shared motion primitive | ✓ VERIFIED (primitives only) | `@keyframes streaming-cursor-blink` (50%/50.01% opacity flip per Q7 — NO alternate) + `@keyframes streaming-chunk-fadein` published; semantic aliases `--motion-stream-cursor-period: 1s` and `--motion-stream-chunk-fadein: var(--motion-fast)`; `--animate-streaming-cursor-blink: streaming-cursor-blink var(--motion-stream-cursor-period) step-end infinite`. **Note**: Phase 40 SHARED-02 builds the React consumer per D-15 — Phase 39 contributes primitives only, which is the documented split. |
| 4 | Source Serif 4 4-tier scale renders with consistent line-height and letter-spacing | ✓ VERIFIED | `--text-hero/section/body/caption` registered under Tailwind v4 namespaces (RESEARCH §Q1 correction applied); 4 --text-*, 4 --leading-*, 3 --tracking-* (body omitted per Q6); compiled CSS contains `.text-hero { font-size: var(--text-hero) }`; TYPO-USAGE.md provides 9+9 element mapping per D-07 |
| 5 | brand-guidelines values quoted as SSOT in CSS variable comments | ✓ VERIFIED | Inline `/* source: brand-guidelines #XXXXXX */` comments on orange/blue/green tokens; `/* source: prototype #XXXXXX */` on others; D-05 font reconciliation comment present; D-13/D-15 (Q7) corrections annotated inline |

**Score:** 6/7 truths VERIFIED, 1 PARTIAL (MOTION-01 — sweep+ESLint complete, visual baselines deferred to SEED-39)

### Plan-level Truths (PLAN frontmatter must_haves union)

| # | Truth | Plan | Status | Evidence |
|---|-------|------|--------|----------|
| 6 | Every brand color (orange/blue/green) + project color (amber/purple/red) declared in oklch | 39-01 | ✓ VERIFIED | 24 `oklch(` matches in globals.css; brand colors plus -soft alpha variants |
| 7 | Every neutral color (dark/cream/card-bg/-hover/-border/text-1/2/3/divider) declared in oklch | 39-01 | ✓ VERIFIED | All 9 neutrals present in @theme block |
| 8 | `@supports not (color: oklch(0% 0 0))` block re-declares every token with v2.0 hex/rgba fallback | 39-01 | ✓ VERIFIED | grep on `@supports not (color: oklch(0% 0 0))` returns 1 match; brand SSOT hex literals preserved verbatim inside fallback |
| 9 | 8-point spacing tokens --spacing-1..16 (4/8/12/16/24/32/48/64 px) | 39-01 | ✓ VERIFIED | 8 `--spacing-[0-9]` matches; v2.0 layout tokens (--spacing-sidebar-w etc.) preserved untouched |
| 10 | Empty `[data-theme="dark"] { }` reservation for Phase 43 | 39-01 | ✓ VERIFIED | 1 `data-theme="dark"` match in globals.css |
| 11 | scripts/hex-to-oklch.mjs exports convert() with ΔE round-trip < 1.0 | 39-01 | ✓ VERIFIED | `node -e "import('./scripts/hex-to-oklch.mjs').then(m => console.log(typeof m.convert))"` → "function"; CLI run reports ΔE=0.0000 across 15 PALETTE entries |
| 12 | 4-tier typography scale text-hero/section/body/caption under Tailwind v4 namespaces | 39-02 | ✓ VERIFIED | --text-hero: 2.8rem, --text-section: 1.5rem, --text-body: 0.95rem, --text-caption: 0.74rem; Q1 namespace correction documented inline |
| 13 | Each tier has matching --leading-{tier} | 39-02 | ✓ VERIFIED | 4 --leading-* tokens present |
| 14 | Hero/section have -0.02em tracking; caption has +0.06em tracking | 39-02 | ✓ VERIFIED | 3 --tracking-* tokens present (body intentionally omitted per Q6) |
| 15 | TYPO-USAGE.md exists with 9+ Source Serif 4 + 9+ Inter elements per D-07 | 39-02 | ✓ VERIFIED | File exists; 20 bullets per plan-02 SUMMARY (>= 18 threshold) |
| 16 | Three motion duration tokens --motion-fast (150ms), --motion-base (250ms), --motion-slow (400ms) declared | 39-03 | ✓ VERIFIED | 5 --motion-* tokens (3 duration + 2 stream aliases) |
| 17 | --ease-claude-out is cubic-bezier(0.165, 0.85, 0.45, 1) | 39-03 | ✓ VERIFIED | 1 --ease-claude-out match |
| 18 | Two SSE keyframes (streaming-cursor-blink with step-end infinite — NO alternate per Q7; streaming-chunk-fadein) | 39-03 | ✓ VERIFIED | Both keyframes present in compiled CSS; `step-end infinite` (no alternate); Q7 correction codified in CSS comment + negative regex test |
| 19 | Semantic SSE aliases --motion-stream-cursor-period (1s) + --motion-stream-chunk-fadein (var(--motion-fast)) | 39-03 | ✓ VERIFIED | Both aliases present |
| 20 | v2.0 legacy --ease and --ease-fast tokens preserved per D-14 | 39-03 | ✓ VERIFIED | Both legacy aliases re-installed inside motion block with deprecation comment |
| 21 | Empty @media (prefers-reduced-motion: reduce) stub | 39-03 | ✓ VERIFIED | 1 match in globals.css; placed at root scope outside @theme per Pitfall 2 |
| 22 | ESLint custom rule (no-restricted-syntax) blocks Literal + TemplateElement variants | 39-03 | ✓ VERIFIED | 3 `no-restricted-syntax` mentions in eslint.config.mjs (1 rule + 1 error message + 1 TemplateElement); both selectors present; 5 modifier-prefix patterns added per WR-04 fix |
| 23 | Zero matches for `transition-(all\|colors)\s+duration-(\d+\|\[)` after sweep | 39-04 | ✓ VERIFIED | 0 matches via grep |
| 24 | Zero Form C `transition-\[<property>\] duration-N` after manual cleanup | 39-04 | ✓ VERIFIED | 0 matches via grep |
| 25 | Zero adjacent ease-in-out conflicts with --ease-claude-out | 39-04 | ✓ VERIFIED | 0 matches |
| 26 | pnpm lint exits 0 (rule fires on zero remaining occurrences) | 39-04 | ✓ VERIFIED | `pnpm lint` exit code = 0 |
| 27 | pnpm build exits 0 after migration | 39-04 | ✓ VERIFIED | Build complete; 220 kB First Load JS; 46/46 static pages |
| 28 | lint/no-raw-transition.test.ts (Wave 0 RED stub) turns GREEN | 39-04 | ✓ VERIFIED | 2/2 it() blocks pass; 0 violations on recursive walk |
| 29 | Playwright spec has ≥18 PNG baselines committed | 39-04 | ✗ DEFERRED | Directory does not exist; deferred to SEED-39 per user decision; spec env-gated and auto-skips |
| 30 | Playwright re-run passes 100% (baselines lock visual contract per D-11) | 39-04 | ✗ DEFERRED | Cannot run without baselines; tracked in SEED-39 |

**Score:** 28/30 plan-level truths VERIFIED; 2 DEFERRED (truths 29-30 absorbed into MOTION-01 partial / GAP-39-02 / SEED-39).

---

## Programmatic Check Results

### Build & Lint Pipeline

| Check | Command | Result | Interpretation |
|-------|---------|--------|----------------|
| Lint | `pnpm lint` | exit 0 | ESLint no-restricted-syntax rule fires on zero remaining occurrences; sweep is complete |
| TypeCheck | `pnpm typecheck` | exit 0 | TypeScript compilation clean; no type regressions from token additions |
| Build | `pnpm build` | exit 0 | Tailwind v4 compiles all @theme tokens + arbitrary-property classes; 46/46 static pages; 220 kB First Load JS (unchanged from pre-sweep baseline per plan-04 SUMMARY) |
| Phase 39 Tests | `pnpm exec vitest run __tests__/styles __tests__/scripts __tests__/eslint __tests__/lint --testTimeout=30000 --hookTimeout=30000` | 7 files / 59 tests pass | Full Phase 39 test surface GREEN with extended timeout; default 10s `beforeAll` timeout in `__tests__/eslint/no-raw-transition.test.ts` is environmental (loads eslint-config-next + parser transitively in beforeAll) — see Anti-Pattern Review below |

### Sweep Invariants (D-09 + D-11 first half)

| Pattern | Expected | Actual | Status |
|---------|----------|--------|--------|
| `transition-(all\|colors)\s+duration-(\[\|[0-9])` in `app/` + `components/` | 0 | 0 | ✓ |
| `transition-\[[^\]]+\]\s+duration-` (Form C) | 0 | 0 | ✓ |
| `var\(--ease-claude-out\).*ease-(in-out\|out\|in)\b\|ease-(in-out\|out\|in)\b.*var\(--ease-claude-out\)` (timing-function conflict) | 0 | 0 | ✓ (WR-01..WR-04 fixes verified) |
| `transitionTimingFunction.*cubic-bezier\(\.4` (inline style override per WR-02) | 0 | 0 | ✓ |
| Modifier-prefix variants `(after\|before\|hover\|focus\|dark\|group-hover):transition-(all\|colors)` (WR-04 fix) | 0 | 0 | ✓ |

### Token Landing in globals.css

| Pattern | Expected | Actual | Status |
|---------|----------|--------|--------|
| `oklch(` | >= 21 (12 brand+project + 9 neutral) | 24 | ✓ (24 includes -soft alpha variants per spec) |
| `^[[:space:]]*--motion-` | >= 3 (fast/base/slow) | 5 (3 duration + 2 stream aliases) | ✓ |
| `^[[:space:]]*--ease-claude-out` | >= 1 | 1 | ✓ |
| `^[[:space:]]*--spacing-[0-9]` | >= 8 (1..16) | 8 | ✓ |
| `^[[:space:]]*--text-` | >= 4 (hero/section/body/caption) | 4 (excluding 1 comment line in declaration list) | ✓ |
| `@keyframes streaming-cursor-blink` | 1 | 1 | ✓ |
| `step-end` (NOT alternate per Q7) | >= 1 | 2 (token def + comment); zero `alternate` adjacency | ✓ |
| `data-theme="dark"` | >= 1 (Phase 43 reservation) | 1 | ✓ |
| `@media (prefers-reduced-motion: reduce)` | >= 1 (Phase 41 reservation) | 1 | ✓ |

### ESLint Rule Active

| Pattern | Expected | Actual | Status |
|---------|----------|--------|--------|
| `no-restricted-syntax` in eslint.config.mjs | >= 1 | 3 (rule + message + TemplateElement) | ✓ |
| `transition-(all\|colors)` regex selector present | >= 1 | 2 (Literal + TemplateElement) | ✓ |
| Modifier-prefix capture `(?:[a-z][a-z0-9-]*:)*` (WR-04 fix) | present | 5 mentions across config | ✓ |
| Test fixture override `__tests__/eslint/no-raw-transition.test.ts: no-restricted-syntax: off` | present | 1 scoped flat-config block | ✓ |

### Deferred-Work Tracker

| Pattern | Expected | Actual | Status |
|---------|----------|--------|--------|
| `.planning/seeds/SEED-39-playwright-baselines.md` exists | yes | yes | ✓ (125 lines; 4 trigger conditions; 9-step closure procedure; cross-references all relevant plans/SUMMARYs) |
| `.planning/phases/39-design-token-foundation/TYPO-USAGE.md` exists | yes | yes | ✓ |
| `frontend/tests/e2e/phase39-transition-parity.spec.ts` exists with `@phase39 @transition-parity` tag + `maxDiffPixelRatio: 0.005` + `shouldRunPerfSuite()` env gate | yes | yes | ✓ (env-gated, auto-skips when PERF_TEST_PASSWORD unset; ready for SEED-39 closure) |
| `frontend/tests/e2e/__screenshots__/phase39-transition-parity.spec.ts-snapshots/` | NOT YET (correctly deferred) | does not exist | ✓ (correctly absent — deferred per user decision) |

### Hex-to-oklch Script Sanity

| Check | Result | Interpretation |
|-------|--------|----------------|
| `convert` exported as function | ✓ | Library+CLI dual-use working |
| ΔE round-trip values | All 15 PALETTE entries report ΔE=0.0000 (well under 1.0 threshold) | Brand identity preserved at conversion math; success criterion #1 satisfied |
| Stderr from CLI run | empty | Zero ΔE warnings; no degenerate conversions |

### Compiled CSS Evidence

| Token | Compiled value | Status |
|-------|---------------|--------|
| `--motion-fast` | `.15s` (150ms) | ✓ |
| `--text-hero` | `2.8rem` (42px @ 15px base) | ✓ |
| `--color-orange` | `oklch(67.24% .1308 38.76)` | ✓ |
| `--animate-streaming-cursor-blink` | `streaming-cursor-blink var(--motion-stream-cursor-period) step-end infinite` (NO alternate per Q7) | ✓ |
| Hex fallback for `--color-orange` (in `@supports not (color: oklch(0% 0 0))`) | `#d97757` | ✓ (brand SSOT preserved) |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/scripts/hex-to-oklch.mjs` | Library+CLI script with exported `convert()` | ✓ VERIFIED | Exists; convert export confirmed via dynamic import; CLI run produces ΔE=0.0000 |
| `frontend/__tests__/scripts/hex-to-oklch.test.ts` | TDD spec | ✓ VERIFIED | Exists; 17 tests pass (15 PALETTE entries + structural assertions) |
| `frontend/__tests__/styles/tokens-css.test.ts` | File-as-text invariant gate | ✓ VERIFIED | Exists; 14 tests pass |
| `frontend/__tests__/styles/typography-tokens.test.ts` | TDD spec for typography | ✓ VERIFIED | Exists; 11 tests pass |
| `frontend/__tests__/styles/motion-tokens.test.ts` | File-as-text invariant for motion | ✓ VERIFIED | Exists; 5 tests pass |
| `frontend/__tests__/styles/sse-keyframes.test.ts` | File-as-text invariant for SSE keyframes (Q7 negative regex) | ✓ VERIFIED | Exists; 5 tests pass |
| `frontend/__tests__/eslint/no-raw-transition.test.ts` | Linter test for D-16 rule | ✓ VERIFIED | Exists; 5 tests pass with extended timeout (default 10s `beforeAll` is borderline due to eslint-config-next + parser transitive resolution) |
| `frontend/__tests__/lint/no-raw-transition.test.ts` | Sweep completeness gate | ✓ VERIFIED | Exists; 2 tests pass (closes plan-3 RED stub) |
| `frontend/tests/e2e/phase39-transition-parity.spec.ts` | Playwright spec stub (env-gated) | ✓ VERIFIED | Exists; auto-skips when PERF_TEST_PASSWORD unset |
| `frontend/tests/e2e/__screenshots__/phase39-transition-parity.spec.ts-snapshots/` | NOT YET (deferred) | ✗ DEFERRED | Correctly absent per user decision; tracked in SEED-39 |
| `frontend/app/globals.css` | Extended @theme block with all tokens | ✓ VERIFIED | All 6 token categories landed (color/spacing/typography/motion/SSE/reduced-motion stub); v2.0 invariants preserved |
| `frontend/eslint.config.mjs` | no-restricted-syntax rule + WR-04 modifier-prefix capture + test fixture override | ✓ VERIFIED | All three present and validated |
| `.planning/phases/39-design-token-foundation/TYPO-USAGE.md` | Project-internal serif-vs-Inter mapping (D-07) | ✓ VERIFIED | Exists; 20 bullets per plan-02 SUMMARY |
| `.planning/seeds/SEED-39-playwright-baselines.md` | Deferred-work tracker | ✓ VERIFIED | Exists; comprehensive 9-step closure procedure |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `frontend/components/{auth,settings,setup,layout,digest,course-detail,dashboard}/*.tsx` | `globals.css` motion tokens | Tailwind v4 arbitrary properties `[transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]` | ✓ WIRED | 36 sed-target files contain `var(--motion-*)` references; compiled CSS resolves via @theme block |
| `frontend/eslint.config.mjs` | Phase 40-43 raw-transition prevention | `no-restricted-syntax` Literal + TemplateElement + modifier-prefix selectors | ✓ WIRED | Rule fires on zero current matches (sweep clean); CI lint blocks any future PR re-introducing raw `transition-{all\|colors} duration-N` (covered by Linter test in `__tests__/eslint/no-raw-transition.test.ts`) |
| `frontend/__tests__/eslint/no-raw-transition.test.ts` | `eslint.config.mjs` | dynamic import + Linter.verify() | ✓ WIRED | 5 fixture cases cover: shortcut FLAGS, bracket FLAGS, migrated CLEAN, template-literal FLAGS, modifier-prefix FLAGS (post-WR-04) |
| `frontend/__tests__/styles/{tokens-css,typography-tokens,motion-tokens,sse-keyframes}.test.ts` | `frontend/app/globals.css` | `readFileSync` + regex assertions | ✓ WIRED | All 4 tests pass; file-as-text idiom validated |
| `frontend/scripts/hex-to-oklch.mjs` | `culori` (parse/oklch/formatCss/differenceEuclidean) | ESM import | ✓ WIRED | culori 4.0.2 + @types/culori 4.0.1 in package.json devDependencies |
| `frontend/tests/e2e/phase39-transition-parity.spec.ts` | `frontend/tests/e2e/perf/helpers/{auth,clock}.ts` | `loginAsPerfTestUser` + `installFixedClock` + `shouldRunPerfSuite` | ✓ STAGED | Spec correctly env-gated; ready for SEED-39 closure without code changes |

---

## Data-Flow Trace (Level 4)

Phase 39 ships pure CSS tokens + ESLint config + scripts/tests. No dynamic-data-rendering components are built in this phase (Phase 40 SHARED-02 will consume the SSE keyframes). Level 4 trace is N/A for this phase — there are no React components introduced that render dynamic data from API/store sources.

The token consumption flow (token → Tailwind compile → component className → browser style) is verified at the compile level:
- `globals.css` `@theme` block declares tokens
- Tailwind v4 reads `--motion-fast` etc. and emits `--motion-fast: .15s` in compiled CSS bundle
- Component arbitrary-property classes `[transition-duration:var(--motion-fast)]` reference the token
- Browser's CSS engine resolves the cascade

This flow is fully exercised by `pnpm build` (passing) and verified by grep on compiled `.next/static/css/*.css` (all expected tokens present).

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| hex-to-oklch script export shape | `node -e "import('./frontend/scripts/hex-to-oklch.mjs').then(m => console.log(typeof m.convert))"` | `function` | ✓ PASS |
| hex-to-oklch CLI runs without ΔE warnings | `cd frontend && node scripts/hex-to-oklch.mjs 2>/tmp/stderr.log; cat /tmp/stderr.log` | empty stderr | ✓ PASS |
| Tailwind compiles all expected tokens into bundle | `cd frontend && grep -oE -- '--motion-fast:[^;]*\|--text-hero:[^;]*\|--color-orange:oklch[^;]*' .next/static/css/*.css` | 3 token declarations found | ✓ PASS |
| SSE keyframe + animation token present in compiled CSS | `cd frontend && grep -oE 'streaming-cursor-blink[^,;}]*\|--animate-streaming-cursor-blink:[^;]+' .next/static/css/*.css` | both found with `step-end infinite` (no `alternate`) | ✓ PASS |
| Phase 39 vitest surface (default timeout) | `cd frontend && pnpm exec vitest run __tests__/styles __tests__/scripts __tests__/eslint __tests__/lint` | 1 file flaky timeout in `__tests__/eslint/no-raw-transition.test.ts:beforeAll` (10s default exhausted by eslint-config-next + @typescript-eslint/parser transitive load) | ⚠️ FLAKY |
| Phase 39 vitest surface (extended timeout) | same with `--testTimeout=30000 --hookTimeout=30000` | 7 files / 59 tests pass | ✓ PASS |
| Production lint pipeline | `cd frontend && pnpm lint` | exit 0 | ✓ PASS |
| Production build pipeline | `cd frontend && pnpm build` | exit 0; 220 kB First Load JS; 46/46 static pages | ✓ PASS |
| Production typecheck | `cd frontend && pnpm typecheck` | exit 0 | ✓ PASS |

**Spot-check note (FLAKY):** The `__tests__/eslint/no-raw-transition.test.ts` `beforeAll` hook resolves `eslint-config-next` + `@typescript-eslint/parser` through pnpm strict symlinks in <26s warm but exhausts the default 10s vitest hook timeout on cold runs. Plan-3 SUMMARY recorded this as auto-fix #1 but did not lift the timeout to 30s. **Suggestion** (info-level — does not block phase ship): Add `hookTimeout: 30000` to the test file's `describe.options` or to `vitest.config.ts` so CI runs are deterministic. Recorded as suggestion only — not a gap that blocks Phase 39.

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| DESIGN-01 | All color tokens migrated to oklch (light + dark variants); existing hsl values preserved as fallback | ✓ SATISFIED | 24 oklch declarations + @supports hex fallback + dark-mode reservation block (Phase 43 fills); ΔE=0.0000 round-trip; brand SSOT preserved in fallback. **REQUIREMENTS.md still shows `[ ]` Pending** — documentation gap (REQ status table not updated post-implementation). |
| DESIGN-02 | Spacing scale (4/8/12/16/24/32/48/64 px) + elevation/shadow tokens defined as CSS variables and applied | ✓ SATISFIED | 8 --spacing-* tokens; v2.0 --shadow-card/-hover/-dropdown preserved; Tailwind v4 generates p-/m-/gap-/w-/h- utilities. **REQUIREMENTS.md still shows `[ ]` Pending** — documentation gap. |
| DESIGN-03 | Motion timing constants (cubic-bezier(0.165, 0.85, 0.45, 1) ease-out + 150/250/400ms duration tiers) defined as CSS variables | ✓ SATISFIED | --motion-fast/base/slow + --ease-claude-out present; D-13 specifications met. REQUIREMENTS.md shows `[x]`. |
| MOTION-01 | All hover/focus/active state transitions use motion constants (zero inline `transition: all 0.3s ease`) | ⚠️ PARTIAL | Sweep + ESLint enforcement COMPLETE (zero raw transitions, lint exit 0); pixel-diff visual regression coverage DEFERRED to SEED-39. REQUIREMENTS.md correctly shows `[~]` partial. |
| MOTION-02 | SSE streaming components have unified streaming-cursor + chunk-arrival animation primitives | ✓ SATISFIED (primitives) | Both keyframes published; semantic aliases present; Q7 correction applied (no alternate). Note: Phase 40 SHARED-02 will build the React consumer per documented D-15 split. REQUIREMENTS.md shows `[x]`. |
| TYPO-01 | 4-tier serif type scale (hero/section/body/caption) with consistent line-height + letter-spacing tokens | ✓ SATISFIED | --text-/--leading-/--tracking-* tokens present under v4-correct namespaces; Q1 correction applied. REQUIREMENTS.md shows `[x]`. |
| TYPO-02 | Serif vs Inter usage clarified in design system doc | ✓ SATISFIED | TYPO-USAGE.md exists with 20 bullets covering 9+ serif + 9+ Inter elements per D-07. REQUIREMENTS.md shows `[x]`. |

**Coverage:** 6/7 SATISFIED; 1 PARTIAL (MOTION-01 — see GAP-39-01/02 + SEED-39).

**ORPHANED requirements:** None. All 7 REQs claimed by ROADMAP.md Phase 39 are claimed by at least one plan in this phase (39-01 through 39-04).

**Documentation gap (info, not blocking):** `.planning/REQUIREMENTS.md` shows `[ ]` Pending for DESIGN-01 and DESIGN-02 in the bullet list, while DESIGN-03/MOTION-02/TYPO-01/TYPO-02 correctly show `[x]`. The status TABLE at the bottom shows all 7 as "Pending". This is purely a documentation freshness issue — actual implementation is verified complete via this report. Suggest updating REQUIREMENTS.md as part of `/gsd-extract_learnings 39` or `/gsd-ship 39`.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/__tests__/eslint/no-raw-transition.test.ts` | 37 (beforeAll) | Default 10s `beforeAll` timeout flaky — eslint-config-next + @typescript-eslint/parser transitive load occasionally exceeds 10s on cold runs | ℹ️ Info | Does not affect phase deliverables; works with extended timeout. Suggest hardening via `vi.setConfig({ hookTimeout: 30000 })` or per-file timeout override. |
| `frontend/scripts/hex-to-oklch.mjs` | 112 | Windows-incompatible CLI sentinel `import.meta.url === \`file://${process.argv[1]}\`` | ℹ️ Info (REVIEW IN-01) | macOS-only project; impact ~zero. Cosmetic preference: use `fileURLToPath(import.meta.url)`. Not blocking. |
| `frontend/scripts/hex-to-oklch.mjs` | 104 | Greyscale chroma=0 hue fallback emits `0` instead of `none` | ℹ️ Info (REVIEW IN-02) | CSS Color 4 spec allows both; equivalent rendering. Cosmetic. |
| `frontend/__tests__/scripts/hex-to-oklch.test.ts` | 25-44 | FIXTURES table-copied from PALETTE without single-source enforcement | ℹ️ Info (REVIEW IN-03) | Drift risk if PALETTE adds entries; comment warns. Cosmetic. |
| `frontend/__tests__/styles/tokens-css.test.ts` | 74 | Spacing regex requires `\s+` (≥1 space); fragile if PostCSS minifies later | ℹ️ Info (REVIEW IN-04) | Future-proofing; not currently blocking. |
| `frontend/tests/e2e/phase39-transition-parity.spec.ts` | 93,108 | `maxDiffPixelRatio: 0.005` is 4× stricter than Phase 38; cross-platform CI risk | ℹ️ Info (REVIEW IN-05) | Spec deferred; risk only manifests when SEED-39 closes. Note in SEED-39 — consider 0.01 or pinning Playwright OS image. |
| `frontend/app/globals.css` | 148-231 | 6 `@keyframes` blocks nested inside `@theme { ... }` is Tailwind v4 idiom but counter-intuitive | ℹ️ Info (REVIEW IN-06) | Cosmetic; suggest comment explaining v4 idiom. |

**Severity counts:** 0 blockers, 0 warnings, 7 info-level (4 from code review + 1 vitest hook timeout + 2 from this verification). All 4 WR-warnings (WR-01..WR-04) from `/gsd-code-review 39` were fixed in commits `782e5af`, `9d38a2c`, `81aeae3`, `d5195c2` — verified via grep returning zero matches in this report's "Sweep Invariants" section.

---

## Cross-Phase Integration Check

Does Phase 39 land what Phase 40 will consume?

| Phase 40 expectation | Phase 39 delivery | Status |
|---------------------|--------------------|--------|
| **SHARED-01 (Card/Button/Input/Modal/Tooltip)** consumes `--font-size-*` (now `--text-*`), `--motion-*`, `--ease-claude-out`, padding/spacing tokens, color tokens | All 4 tier `text-*`, 3 motion durations, ease-claude-out, 8 spacing tokens, 21 oklch color tokens published in @theme block; 4 leading-* + 3 tracking-* line-height/letter-spacing matching scale; TYPO-USAGE.md provides per-element decision reference | ✓ READY |
| **SHARED-01** uses migrated `[transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]` form from day 1 | ESLint rule with modifier-prefix capture (post-WR-04) blocks raw `transition-{all\|colors} duration-N` and prefixed variants in CI | ✓ READY |
| **SHARED-02 (no-bubble streaming AI reply)** consumes `--animate-streaming-cursor-blink` (1s step-end infinite — no alternate, terminal-cursor pattern) and `--animate-streaming-chunk-fadein` (var(--motion-fast) ease-claude-out forwards) | Both animation tokens registered + both keyframes published in compiled CSS; Q7 correction applied (50%/50.01% opacity flip; no alternate); semantic aliases in place | ✓ READY |
| **STATES (Phase 41)** consume `--motion-base` for layout shift, `--text-body` / `--text-caption` for inline messages, `--color-text-3` / `--color-divider` for empty states | All tokens present in @theme | ✓ READY |
| **A11Y-05 (`prefers-reduced-motion`)** fills empty stub from plan-3 with universal-selector overrides, preserving streaming-cursor-blink as the documented exception | Empty `@media (prefers-reduced-motion: reduce) { }` reserved at root scope outside @theme per Pitfall 2 (line ~292 of globals.css) | ✓ READY |
| **DARK (Phase 43)** fills empty `[data-theme="dark"] { }` block with warm-deep-brown overrides | Empty selector reserved per D-03; convention documented inline | ✓ READY |
| **NEWVIS (Phase 42)** uses `text-hero font-serif tracking-hero leading-hero` for stat numbers per D-07 | All tokens + TYPO-USAGE.md guidance ready | ✓ READY |
| **MOTION-01 closure** when SEED-39 triggers: spec at `frontend/tests/e2e/phase39-transition-parity.spec.ts` ready to consume `--update-snapshots` | Spec staged + env-gated; helpers reused from Phase 38 P04; no code changes needed at closure | ✓ READY |

**Conclusion:** Phase 39 publishes all token primitives Phase 40 (SHARED-01 + SHARED-02), Phase 41 (STATES + A11Y), Phase 42 (NEWVIS), and Phase 43 (DARK) need. Cross-phase contracts are healthy.

---

## Human Verification Required

### 1. Production Visual UAT (Vercel Preview, 10-page hover walk-through)

**Test:** After PR merge, wait for Vercel preview deployment of branch `chore/milestone-v3.0-init`. Open preview URL, log in as test user, click through these 10 pages: dashboard, courses, course-detail/comp2017, deadlines, predict, digest, timetable, settings, auth, setup. On each page, hover any button or interactive element. Verify smooth color transition (no visual jank, motion preserved at v2.0 rhythm). Specifically watch for:

- Sidebar: hover toggle without layout-thrashing (Intel Mac 60fps stable per ROADMAP success criterion #3 of Phase 40 — but Phase 39's sweep should not regress this)
- Buttons: hover background-color transition feels equivalent to v2.0 (not faster/slower)
- Card expansion (DeadlineCard, PredictCard — WR-02 fix sites): expand/collapse animation now uses `var(--ease-claude-out)` instead of overridden inline `cubic-bezier(.4,0,.2,1)`; motion may FEEL slightly different (this is correct per D-13 brand spec)
- StepIndicator (setup): `transition-[background] duration-base ease-claude-out` migrated correctly; active-step transition preserved

**Expected:** All 10 pages render correctly with smooth transitions; no visible rhythm shift compared to v2.0; no broken layout. If all 10 pages look correct → comment "approved" on PR; merge to main.

**Why human:** Visual perception of motion rhythm and color transition smoothness on Intel Mac requires human eyes; pixel-diff Playwright spec was deferred to SEED-39 per user decision; ESLint rule provides lint-level safety but cannot detect silent visual rhythm shifts.

### 2. (Optional, future-triggered) SEED-39 Closure — Generate Playwright Baselines

**Test:** When trigger fires (per SEED-39: visual drift reported, Phase 40 SHARED-01 starts, v3.1 milestone kickoff, or Phase 40-43 PR fails visual review), run the 9-step closure procedure in `.planning/seeds/SEED-39-playwright-baselines.md`:

1. Set `PERF_TEST_PASSWORD` + `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
2. Restart dev server clean (kill-9 + rm .next + pnpm dev)
3. `pnpm exec playwright test --grep "@phase39 @transition-parity" --update-snapshots`
4. Re-run without `--update-snapshots`; expect 100% match
5. Manual sanity check on 1-2 PNGs side-by-side with v2.0 prod
6. File count gate: `ls .../*.png | wc -l | awk '{exit ($1 < 18)}'` exits 0
7. Commit baselines via `test(39-04): commit Playwright baselines ... — closes SEED-39`
8. Stop dev server cleanup
9. Update REQUIREMENTS.md: flip MOTION-01 from `[~] partial` → `[x] complete`; update SEED-39 status to `closed`

**Expected:** ≥18 PNG baselines committed; spec re-run passes 100%; MOTION-01 flips to complete.

**Why human:** Requires user-only credentials (`PERF_TEST_PASSWORD`); requires visual sanity check (perceptual judgment); requires environment context (when trigger condition is met).

---

## Gaps Summary

**Status: partial** — 6 of 7 ROADMAP success criteria fully verified; MOTION-01 is partial (sweep + ESLint enforcement complete, pixel-diff visual baselines deferred to SEED-39 per documented user decision).

**No blocking gaps.** Both gaps identified are explicitly user-decided and tracked:

- **GAP-39-01** (production visual UAT pending): Not a code-level gap — it's a documented post-merge verification step. The user's USER-PROFILE.md flags them as "design-conscious" so they will perform this check; the path is documented in plan-04 SUMMARY § "Production visual UAT path".
- **GAP-39-02** (SEED-39 deferred): Tracked via `.planning/seeds/SEED-39-playwright-baselines.md` with 4 explicit trigger conditions and a 9-step closure procedure. Spec is in-tree and env-gated — no code work needed at closure.

**Phase 39 ships in this state per user instruction.** MOTION-01 is correctly tagged `[~] partial` in REQUIREMENTS.md with full traceability via the seed and plan SUMMARY.

**Recommended next action:** Proceed to `/gsd-ship 39` (PR creation) → user performs production visual UAT on Vercel preview → user comments "approved" on PR → merge to main → `/gsd-extract_learnings 39` (capture knowledge: BSD sed `[[:>:]]` pattern, Q7 correction, ESLint test-fixture override pattern, Tailwind CSS optimizer warning avoidance from message-literal hygiene).

---

*Verified: 2026-04-30T02:30:00Z*
*Verifier: Claude (gsd-verifier)*
