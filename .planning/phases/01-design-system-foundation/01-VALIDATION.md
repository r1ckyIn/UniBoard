---
phase: 1
slug: design-system-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | `frontend/vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `cd frontend && pnpm vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && pnpm vitest run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && pnpm vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFRA-10 | build | `cd frontend && pnpm build` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | UI-07 | unit | `pnpm vitest run src/theme` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | UI-07 | unit | `pnpm vitest run src/components/layout` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | UI-07 | unit | `pnpm vitest run src/components/ds` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | INFRA-10 | unit | `pnpm vitest run src/i18n` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/vitest.config.ts` — vitest configuration with jsdom environment
- [ ] `frontend/src/test/setup.ts` — shared test setup (jsdom scrollTo polyfill)
- [ ] vitest + @testing-library/react + jsdom — dev dependencies installed

*Wave 0 is part of Plan 01 (project scaffolding) — test infra installed alongside project creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Paper texture visual fidelity | UI-07 | SVG fractalNoise rendering is visual | Open browser, compare against prototype/dashboard.html side-by-side |
| Font rendering (Source Serif 4 + Inter) | UI-07 | Font rendering is browser-dependent | Inspect computed styles in DevTools, verify font-family applied |
| Sidebar hover expand animation | UI-07 | CSS transition smoothness is subjective | Hover sidebar icon area, verify 68px→224px transition is smooth |
| Rough.js hand-drawn visual quality | UI-07 | Rough.js output randomness is visual | Compare rendered components against prototype screenshots |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
