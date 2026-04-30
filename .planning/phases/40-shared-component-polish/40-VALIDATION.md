---
phase: 40
slug: shared-component-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: §"Validation Architecture" of `40-RESEARCH.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + @testing-library/react 16.3.2 + @testing-library/user-event 14.6.1 + Playwright 1.59.1 |
| **Config file** | `frontend/vitest.config.ts` (jsdom env, globals enabled, css enabled, setup `./src/test/setup.ts`) + `frontend/playwright.config.ts` |
| **Quick run command** | `cd frontend && pnpm test --run` (full Vitest one-shot — under 30 s for unit tests) |
| **Full suite command** | `cd frontend && pnpm lint --max-warnings 0 && pnpm typecheck && pnpm test --run && pnpm build` |
| **Estimated runtime** | ~45 s quick run; ~3 min full suite (lint + typecheck + tests + build) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm test --run` (Vitest one-shot — under 30 s for unit tests)
- **After every plan wave:** Run `cd frontend && pnpm lint --max-warnings 0 && pnpm typecheck && pnpm test --run`
- **Before `/gsd-verify-work 40`:** Full suite green (`pnpm lint && pnpm typecheck && pnpm test --run && pnpm build`) + production deploy + human UAT on Intel Mac for SHARED-03 60fps verification
- **Max feedback latency:** 30 s (quick run); 3 min (full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | SHARED-01 | — | N/A (UI primitive) | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "primary variant"` | ❌ W0 | ⬜ pending |
| 40-01-02 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "secondary variant"` | ❌ W0 | ⬜ pending |
| 40-01-03 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "ghost variant"` | ❌ W0 | ⬜ pending |
| 40-01-04 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "danger variant"` | ❌ W0 | ⬜ pending |
| 40-01-05 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "iconOnly size"` | ❌ W0 | ⬜ pending |
| 40-01-06 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "loading state"` | ❌ W0 | ⬜ pending |
| 40-01-07 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "merges caller className"` | ❌ W0 | ⬜ pending |
| 40-01-08 | 01 | 1 | SHARED-01 | — | XSS guard via React text-node escape (default) | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "focus-visible ring"` | ❌ W0 | ⬜ pending |
| 40-01-09 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Input.test.tsx -t "default variant"` | ❌ W0 | ⬜ pending |
| 40-01-10 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Input.test.tsx -t "search variant"` | ❌ W0 | ⬜ pending |
| 40-01-11 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Input.test.tsx -t "leftIcon"` | ❌ W0 | ⬜ pending |
| 40-01-12 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Input.test.tsx -t "rightIcon"` | ❌ W0 | ⬜ pending |
| 40-01-13 | 01 | 1 | SHARED-01 | — | N/A | unit | `pnpm test __tests__/components/ui/Input.test.tsx -t "error state"` | ❌ W0 | ⬜ pending |
| 40-01-14 | 01 | 1 | SHARED-01 | — | XSS guard via type=text default | unit | `pnpm test __tests__/components/ui/Input.test.tsx -t "disabled state"` | ❌ W0 | ⬜ pending |
| 40-01-15 | 01 | 1 | SHARED-01 | — | N/A (build-time CSS) | typecheck | `cd frontend && grep -E '@utility transition-claude-(fast\|base\|slow)' app/globals.css` | ✅ existing | ⬜ pending |
| 40-01-16 | 01 | 1 | SHARED-01 | — | N/A (lint guard) | unit | `pnpm test __tests__/eslint/no-raw-transition.test.ts -t "verbose tokenized form"` | ✅ extends | ⬜ pending |
| 40-01-17 | 01 | 1 | SHARED-01 | — | N/A (lint guard) | unit | `pnpm test __tests__/eslint/no-raw-transition.test.ts -t "var\\(--ease\\)"` | ✅ extends | ⬜ pending |
| 40-01-18 | 01 | 1 | SHARED-01 | — | N/A (sweep verification) | grep | `cd frontend && ! grep -rEn "transition-(all\|colors)\\s+\\[transition-duration:var\\(--motion-(fast\|base\|slow)\\)\\]" components/ app/` | ✅ existing | ⬜ pending |
| 40-01-19 | 01 | 1 | SHARED-01 | — | N/A (build verification) | integration | `cd frontend && pnpm lint --max-warnings 0 && pnpm typecheck && pnpm build` | ✅ existing | ⬜ pending |
| 40-02-01 | 02 | 2 | SHARED-02 | — | XSS guard: streaming text rendered via React text node, never via raw HTML injection APIs | unit | `pnpm test __tests__/hooks/useStreamingText.test.ts -t "initial empty state"` | ❌ W0 | ⬜ pending |
| 40-02-02 | 02 | 2 | SHARED-02 | — | N/A | unit | `pnpm test __tests__/hooks/useStreamingText.test.ts -t "chunkIndex bumps"` | ❌ W0 | ⬜ pending |
| 40-02-03 | 02 | 2 | SHARED-02 | — | N/A | unit | `pnpm test __tests__/hooks/useStreamingText.test.ts -t "stream complete"` | ❌ W0 | ⬜ pending |
| 40-02-04 | 02 | 2 | SHARED-02 | — | N/A | unit | `pnpm test __tests__/hooks/useStreamingText.test.ts -t "isStreaming false on completion"` | ❌ W0 | ⬜ pending |
| 40-02-05 | 02 | 2 | SHARED-02 | — | N/A | unit | `pnpm test __tests__/components/shared/StreamingAssistant.test.tsx -t "cursor mounts when streaming"` | ❌ W0 | ⬜ pending |
| 40-02-06 | 02 | 2 | SHARED-02 | — | N/A | unit | `pnpm test __tests__/components/shared/StreamingAssistant.test.tsx -t "cursor unmounts on completion"` | ❌ W0 | ⬜ pending |
| 40-02-07 | 02 | 2 | SHARED-02 | — | N/A | unit | `pnpm test __tests__/components/shared/StreamingAssistant.test.tsx -t "Source Serif 4 body class"` | ❌ W0 | ⬜ pending |
| 40-02-08 | 02 | 2 | SHARED-02 | — | N/A | unit | `pnpm test __tests__/components/shared/UserMessage.test.tsx -t "right-aligned orange bubble"` | ❌ W0 | ⬜ pending |
| 40-02-09 | 02 | 2 | SHARED-02 | — | XSS guard: text passed as children/prop, React escapes by default | unit | `pnpm test __tests__/components/shared/UserMessage.test.tsx -t "renders text content"` | ❌ W0 | ⬜ pending |
| 40-02-10 | 02 | 2 | SHARED-02 | — | N/A (file deletion verification) | grep | `cd frontend && ! test -f components/shared/AiChatBubble.tsx` | ✅ | ⬜ pending |
| 40-02-11 | 02 | 2 | SHARED-02 | — | N/A (caller migration verification) | grep | `cd frontend && ! grep -rEn "AiChatBubble" components/ app/` | ✅ | ⬜ pending |
| 40-02-12 | 02 | 2 | SHARED-02 | — | N/A (build still passes after caller migration) | integration | `cd frontend && pnpm typecheck && pnpm build` | ✅ existing | ⬜ pending |
| 40-03-01 | 03 | 2 | SHARED-03 | — | N/A | unit | `pnpm test __tests__/components/layout/Sidebar.test.tsx -t "two-layer DOM renders"` | ❌ W0 | ⬜ pending |
| 40-03-02 | 03 | 2 | SHARED-03 | — | N/A | unit | `pnpm test __tests__/components/layout/Sidebar.test.tsx -t "outer 68px container fixed"` | ❌ W0 | ⬜ pending |
| 40-03-03 | 03 | 2 | SHARED-03 | — | N/A | unit | `pnpm test __tests__/components/layout/Sidebar.test.tsx -t "inner panel translateX collapsed default"` | ❌ W0 | ⬜ pending |
| 40-03-04 | 03 | 2 | SHARED-03 | — | N/A | unit | `pnpm test __tests__/components/layout/Sidebar.test.tsx -t "active highlight inside inner panel"` | ❌ W0 | ⬜ pending |
| 40-03-05 | 03 | 2 | SHARED-03 | — | N/A (Phase 40 verbose-form sweep also touched Sidebar.tsx — verify shorthand applied) | grep | `cd frontend && grep -E "transition-claude-base" components/layout/Sidebar.tsx` | ✅ | ⬜ pending |
| 40-03-06 | 03 | 2 | SHARED-03 | — | N/A (production human UAT — 60fps Intel Mac) | manual-only | human UAT post-deploy | n/a | ⬜ pending |
| 40-03-07 | 03 | 2 | SHARED-03 | — | N/A (env-gated visual regression stub) | visual | env-gated Playwright (deferred) | ❌ W0 stub | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/components/ui/Button.tsx` + `frontend/__tests__/components/ui/Button.test.tsx` — covers SHARED-01 Button variants (primary/secondary/ghost/danger/iconOnly/loading/className-merge/focus-visible)
- [ ] `frontend/components/ui/Input.tsx` + `frontend/__tests__/components/ui/Input.test.tsx` — covers SHARED-01 Input variants (default/search/leftIcon/rightIcon/error/disabled)
- [ ] `frontend/hooks/useStreamingText.ts` + `frontend/__tests__/hooks/useStreamingText.test.ts` — covers SHARED-02 hook contract (initial empty / chunkIndex bumps / stream complete / isStreaming transition)
- [ ] `frontend/components/shared/StreamingAssistant.tsx` + `frontend/__tests__/components/shared/StreamingAssistant.test.tsx` — covers SHARED-02 cursor mount/unmount + Source Serif 4 body class
- [ ] `frontend/components/shared/UserMessage.tsx` + `frontend/__tests__/components/shared/UserMessage.test.tsx` — covers SHARED-02 right-aligned orange bubble + text rendering
- [ ] `frontend/__tests__/components/layout/Sidebar.test.tsx` (extend or create) — covers SHARED-03 two-layer DOM + active-highlight-inside-inner-panel
- [ ] `frontend/__tests__/eslint/no-raw-transition.test.ts` — EXTEND existing file with 4 new fixtures (verbose tokenized form positive + negative; `var(--ease)` positive + negative)
- [ ] `frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts` — env-gated stub (runs under Playwright; auto-skips without `PERF_TEST_PASSWORD`)
- [ ] No new test framework install — all dependencies already in `package.json` (vitest, @testing-library/react, @playwright/test, eslint, tailwindcss, react). Add only `class-variance-authority` via `pnpm add class-variance-authority`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar 60fps stable on Intel Mac during hover-expand/collapse | SHARED-03 (success criterion #3) | CI lacks Intel Mac hardware; framerate signal varies by GPU/refresh-rate. Phase 39 SEED-39 pattern: env-gated Playwright spec stub authored, baseline generation deferred to production human UAT | Post-deploy on user's primary Intel Mac: open dashboard / predict / settings / timetable, open DevTools → Performance, record 5-second hover-expand interaction → confirm 60fps stable bar (no red layout-shift markers) |
| Pixel-diff visual parity vs v2.0 baseline (Sidebar 4 pages, Button/Input across 10 pages) | SHARED-01, SHARED-03 (success criteria #1, #4) | Playwright baseline generation requires `PERF_TEST_PASSWORD` and provisioned auth state; deferred per SEED-39 closure procedure | Post-deploy: visual regression suite runs against production with credentials provisioned; or manual screenshot diff via Chrome DevTools Recorder against v2.0 reference deployment |
| AI no-bubble flowing reply visual feel (assistant continuous narrative, user discrete bubble) | SHARED-02 (success criterion #2) | Subjective UX judgment; cannot be expressed as pixel-diff alone | Post-deploy: navigate to /deadlines, trigger AI summary, confirm assistant text flows in serif without bubble + cursor blinks at end while streaming + user replies show right-aligned orange bubble |
| Rough.js hand-drawn borders preserved across all components | success criterion #5 (hard constraint) | RoughCard render uses random seed deterministic per component; visual smoke check confirms borders still render after any Tailwind/CSS variable change | Post-deploy: load each of 10 pages in production, confirm RoughCard borders visible on every card (sketchy hand-drawn aesthetic intact) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (per-task quick-run keeps signal continuous)
- [ ] Wave 0 covers all MISSING references (8 new test files; 1 ESLint test extension; 1 Playwright stub)
- [ ] No watch-mode flags (Vitest invoked with `--run` for one-shot determinism)
- [ ] Feedback latency < 30 s (quick run) and < 3 min (full suite)
- [ ] `nyquist_compliant: true` set in frontmatter once planner confirms task↔test mapping above is complete

**Approval:** pending
