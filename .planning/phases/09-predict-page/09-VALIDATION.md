---
phase: 9
slug: predict-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run --testPathPattern predict` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --testPathPattern predict -x`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | UI-04a | unit | `cd frontend && npx vitest run --testPathPattern wam-engine -x` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | UI-04b | unit | `cd frontend && npx vitest run --testPathPattern wam-engine -x` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | UI-04c | unit | `cd frontend && npx vitest run --testPathPattern faculty-weights -x` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | UI-04d | component | `cd frontend && npx vitest run --testPathPattern PredictCard -x` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | UI-04e | component | `cd frontend && npx vitest run --testPathPattern PredictCard -x` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 2 | UI-04f | component | `cd frontend && npx vitest run --testPathPattern PredictPage -x` | ❌ W0 | ⬜ pending |
| 09-03-02 | 03 | 2 | UI-04g | component | `cd frontend && npx vitest run --testPathPattern PredictPage -x` | ❌ W0 | ⬜ pending |
| 09-03-03 | 03 | 2 | UI-04h | component | `cd frontend && npx vitest run --testPathPattern PredictPage -x` | ❌ W0 | ⬜ pending |
| 09-03-04 | 03 | 2 | UI-04i | unit | `cd frontend && npx vitest run --testPathPattern message-keys -x` | ✅ (update) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/predict/wam-engine.test.ts` — stubs for UI-04a, UI-04b (WAM calculation, reverse calculation, all 3 faculty schemes)
- [ ] `frontend/__tests__/predict/faculty-weights.test.ts` — stubs for UI-04c (level weight mapping per scheme)
- [ ] `frontend/__tests__/predict/PredictCard.test.tsx` — stubs for UI-04d, UI-04e (expand/collapse, input clamping)
- [ ] `frontend/__tests__/predict/PredictPage.test.tsx` — stubs for UI-04f, UI-04g, UI-04h (real-time updates, target slider, deep-link)
- [ ] Update `frontend/__tests__/i18n/message-keys.test.ts` — add predict namespace for UI-04i

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rough.js card rendering quality | UI-04 SC4 | Canvas-based visual rendering not testable via jsdom | Open /predict, verify RoughCard borders render with hand-drawn style |
| CSS slideUp entrance animation | UI-04 | CSS animation timing not observable in jsdom | Open /predict, verify staggered card entrance |
| Target slider drag interaction | UI-04 SC3 | Range input drag UX requires real browser | Drag target WAM slider, verify smooth required scores update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
