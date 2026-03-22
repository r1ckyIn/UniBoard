---
phase: 4
slug: setup-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react + jsdom |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && pnpm test -- --run --testPathPattern setup` |
| **Full suite command** | `cd frontend && pnpm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm test -- --run --testPathPattern setup`
- **After every plan wave:** Run `cd frontend && pnpm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | UI-10 | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/SetupGuard` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | UI-10 | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/SetupGuard` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | UI-10 | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/SetupPage` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | UI-10 | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/StepIndicator` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | PLAT-01 | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/token-validation` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | PLAT-01 | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/TokenStep` | ❌ W0 | ⬜ pending |
| 04-03-03 | 03 | 2 | PLAT-01 | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/GuideCard` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | UI-10 | unit | `cd frontend && pnpm test -- --run --testPathPattern i18n/message-keys` | ✅ partial | ⬜ pending |
| 04-05-01 | 05 | 3 | UI-10 | manual | N/A — browser UAT | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/setup/SetupGuard.test.tsx` — stubs for UI-10-a, UI-10-b (redirect logic)
- [ ] `__tests__/setup/SetupPage.test.tsx` — stubs for UI-10-c (step navigation flow)
- [ ] `__tests__/setup/StepIndicator.test.tsx` — stubs for UI-10-d (step states)
- [ ] `__tests__/setup/token-validation.test.ts` — stubs for PLAT-01-a, PLAT-01-b (format validation)
- [ ] `__tests__/setup/TokenStep.test.tsx` — stubs for PLAT-01-c (sequential validation)
- [ ] `__tests__/setup/GuideCard.test.tsx` — stubs for PLAT-01-d (expand/collapse)
- [ ] Update existing `__tests__/i18n/message-keys.test.ts` to check "setup" namespace

*Existing infrastructure covers test framework and shared fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual rendering of all 4 steps | UI-10 | Requires browser rendering of Rough.js canvas, Motion animations, and paper texture | Navigate to /setup, verify: step indicator progression, guide card expand/collapse, token input states, success animation |
| Background doodles visual match | UI-10 | Canvas rendering not testable in jsdom | Verify AuthDoodles match auth page appearance |
| Step transition animations | UI-10 | Motion AnimatePresence timing not testable in jsdom | Verify crossfade + height morph between steps |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
