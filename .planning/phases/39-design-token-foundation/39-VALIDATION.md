---
phase: 39
slug: design-token-foundation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-28
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 39-RESEARCH.md §Validation Architecture (lines 1033-1080).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 (unit) + Playwright 1.59.1 (visual regression) |
| **Config files** | `frontend/vitest.config.ts` (existing) + `frontend/playwright.config.ts` (existing) |
| **Quick run command** | `cd frontend && pnpm test -- --run __tests__/scripts __tests__/eslint __tests__/styles __tests__/lint` |
| **Full suite command** | `cd frontend && pnpm test -- --run && pnpm playwright test --grep "@phase39"` |
| **Estimated runtime** | ~30s (quick) / ~3min (full + visual) |

---

## Sampling Rate

- **After every task commit:** Run quick command (~30s on Phase 39 test surface)
- **After every plan wave:** Run full vitest suite (must remain green)
- **Before `/gsd-verify-work`:** Full vitest + `pnpm build` + Playwright `@phase39` tag green
- **Max feedback latency:** 30 seconds (quick) / 180 seconds (full)

---

## Per-Requirement Verification Map

> Plan-level task IDs are filled by `gsd-planner` in step 8. This table maps requirements → automated tests created in Wave 0 (TDD). Planner's per-task `<verify>` blocks reference these test commands.

| Req ID | Plan | Wave | Behavior | Threat Ref | Test Type | Automated Command | File Exists |
|--------|------|------|----------|------------|-----------|-------------------|-------------|
| DESIGN-01 | 01 | 0 | hex→oklch script produces oklch string for every input hex with ΔE round-trip < 1.0 | — | unit (TDD) | `pnpm test -- --run __tests__/scripts/hex-to-oklch.test.ts` | ❌ W0 |
| DESIGN-01 | 01 | 1 | globals.css contains `oklch(...)` declarations under `@theme` AND `@supports not (color: oklch(...))` fallback block | — | unit (CSS string parse) | `pnpm test -- --run __tests__/styles/tokens-css.test.ts` | ❌ W0 |
| DESIGN-01 | 01 | 1 | Compiled Tailwind output exposes `--color-orange`, `--color-cream` etc. on `:root` | — | manual UAT | manual: open dashboard, inspect computed `:root --color-orange` in DevTools | manual-only |
| DESIGN-02 | 01 | 1 | `pnpm build` succeeds; compiled CSS includes `.p-1`, `.m-2`, `.gap-4` etc. with new spacing tokens | — | smoke | `pnpm build && grep -E '\.p-1\s*\{' frontend/.next/static/css/*.css` | ❌ W0 |
| DESIGN-03 | 03 | 1 | globals.css contains `--motion-fast: 150ms`, `--motion-base: 250ms`, `--motion-slow: 400ms`, `--ease-claude-out: cubic-bezier(0.165, 0.85, 0.45, 1)` | — | unit (CSS string parse) | `pnpm test -- --run __tests__/styles/motion-tokens.test.ts` | ❌ W0 |
| MOTION-01 | 04 | 1 | Zero matches for `transition-(all\|colors)\s+duration-(\d+\|\[)` in `frontend/{app,components}` after sed-sweep + manual edges (sweep moved from plan-3 to plan-4 per ISSUE-39-05) | — | unit (grep wrapper) | `pnpm test -- --run __tests__/lint/no-raw-transition.test.ts` | ❌ W0 (plan-3 stub) → GREEN (plan-4) |
| MOTION-01 | 03 | 0 | ESLint custom rule fires on fixture JSX containing `className="transition-all duration-150"` | — | unit (TDD) | `pnpm test -- --run __tests__/eslint/no-raw-transition.test.ts` | ❌ W0 |
| MOTION-01 | 04 | 2 | Playwright pixel-diff: 10-page interaction state snapshots match post-migration baseline (≤ 0.5% per page); user-verified checkpoint per ISSUE-39-04; ≥18 PNG files per ISSUE-39-07 | — | visual regression (checkpoint:human-verify) | `ls frontend/tests/e2e/__screenshots__/phase39-transition-parity.spec.ts-snapshots/*.png | wc -l | awk '{exit ($1 < 18)}'` AND `pnpm playwright test --grep "@phase39 @transition-parity"` | ❌ W0 (plan-3 stub) → GREEN (plan-4 checkpoint) |
| MOTION-02 | 03 | 1 | globals.css contains `@keyframes streaming-cursor-blink` (1s step-end infinite) and `@keyframes streaming-chunk-fadein` definitions | — | unit | `pnpm test -- --run __tests__/styles/sse-keyframes.test.ts` | ❌ W0 |
| MOTION-02 | 03 | 1 | Keyframe parsability — manual UAT (Phase 40 SHARED-02 actually integrates) | — | manual UAT | manual via storybook or temporary test page | manual-only |
| TYPO-01 | 02 | 1 | globals.css contains `--text-hero`, `--text-section`, `--text-body`, `--text-caption` + matching `--leading-*` and `--tracking-*` (Tailwind v4 namespace correction per RESEARCH §Q1) | — | unit | `pnpm test -- --run __tests__/styles/typography-tokens.test.ts` | ❌ W0 |
| TYPO-01 | 02 | 1 | Compiled Tailwind output includes `.text-hero`, `.leading-section`, `.tracking-caption` rules | — | smoke | `pnpm build && grep -E '\.text-hero\s*\{' frontend/.next/static/css/*.css` | ❌ W0 |
| TYPO-02 | 02 | 1 | `TYPO-USAGE.md` exists at `.planning/phases/39-design-token-foundation/TYPO-USAGE.md` and lists 9+ Source Serif 4 elements + 9+ Inter elements | — | unit | `test -f .planning/phases/39-*/TYPO-USAGE.md && grep -c '^- ' .planning/phases/39-*/TYPO-USAGE.md` | ❌ plan-2 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · W0 = Wave 0 deliverable*

---

## Wave 0 Requirements

Wave 0 (TDD) creates failing tests **before** implementation. Plan-1/2/3 each include Wave 0 tasks creating the relevant fixtures.

- [ ] `frontend/__tests__/scripts/hex-to-oklch.test.ts` — DESIGN-01 (script I/O contract: every PALETTE entry → valid oklch + ΔE < 1.0)
- [ ] `frontend/__tests__/eslint/no-raw-transition.test.ts` — MOTION-01 (load `eslint.config.mjs`, run on fixture JSX, expect violations + zero false positives on permitted patterns)
- [ ] `frontend/__tests__/styles/tokens-css.test.ts` — DESIGN-01 (read globals.css as text, regex-assert oklch tokens + `@supports not (color: oklch(...))` fallback block)
- [ ] `frontend/__tests__/styles/motion-tokens.test.ts` — DESIGN-03 (read globals.css, assert `--motion-fast: 150ms`, `--motion-base: 250ms`, `--motion-slow: 400ms`, `--ease-claude-out`)
- [ ] `frontend/__tests__/styles/sse-keyframes.test.ts` — MOTION-02 (read globals.css, assert `@keyframes streaming-cursor-blink` + `streaming-chunk-fadein`)
- [ ] `frontend/__tests__/styles/typography-tokens.test.ts` — TYPO-01 (read globals.css, assert `--text-hero/section/body/caption` + matching `--leading-*` + `--tracking-*`)
- [ ] `frontend/__tests__/lint/no-raw-transition.test.ts` — MOTION-01 grep gate (spawn `grep -rE 'transition-(all|colors)\s+duration-(\[|\d)' frontend/{app,components}`; expect exit code 1 = no matches)
- [ ] `frontend/tests/e2e/phase39-transition-parity.spec.ts` — MOTION-01 visual regression (10-page interaction states screenshot diff vs v2.0 baseline at ≤ 0.5% pixel-diff; port 3001, zh-CN locale)
- [ ] Framework install: `pnpm add -D culori@4.0.2` (covered in plan-1 Wave 0)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `:root` CSS custom properties resolve to expected oklch literals in browser | DESIGN-01 | Browser-rendered computed style; CI JSDOM doesn't fully resolve CSS variables in cascade | Open `http://localhost:3001/zh/dashboard`, DevTools → Computed → `:root`, verify `--color-orange` shows `oklch(...)` literal |
| Streaming cursor blink visually correct (1s rhythm, sharp on/off via `step-end`) | MOTION-02 | No SSE consumer exists yet (Phase 40 deliverable); only verify keyframe parsability automatically | Add temporary `<span style="animation: streaming-cursor-blink 1s step-end infinite;">█</span>` to a test page; verify blink rhythm; remove before merge |
| Brand color identity preserved (oklch outputs visually match v2.0 hex on calibrated display) | DESIGN-01 §"brand parity" | ΔE < 1.0 is mathematical bound; perceptual sign-off requires human eyes | Compare deployed v3.0-preview branch dashboard side-by-side with v2.0 production on same monitor; flag any visible drift |

---

## Validation Sign-Off

- [x] All requirements have `<automated>` verify or Wave 0 dependencies (3 manual-only justified above)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (per-plan grouping ensures coverage)
- [x] Wave 0 covers all MISSING references (8 test files + culori install)
- [x] No watch-mode flags (all commands use `--run` for vitest)
- [x] Feedback latency < 30s for quick / < 180s for full
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-28 (drafted from RESEARCH.md §Validation Architecture; awaiting plan-checker confirmation)
