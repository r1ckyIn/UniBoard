---
phase: 7
slug: course-detail-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + React Testing Library |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && pnpm vitest run --testPathPattern courses` |
| **Full suite command** | `cd frontend && pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm vitest run --testPathPattern courses`
- **After every plan wave:** Run `cd frontend && pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | UI-11 | unit | `pnpm vitest run --testPathPattern course-detail` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | UI-11 | unit | `pnpm vitest run --testPathPattern assessment` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | UI-11 | unit | `pnpm vitest run --testPathPattern materials` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 1 | INTEL-01 | unit | `pnpm vitest run --testPathPattern discussion` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/courses/course-detail/` — test directory structure
- [ ] Test stubs for assessment table, materials browser, Ed Discussion, prediction logic

*Existing vitest infrastructure covers framework needs — no new installs required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rough.js hand-drawn card borders render correctly | UI-11 | Canvas rendering not testable in jsdom | Visual inspection in browser |
| Entrance slide-up animations play with correct stagger | UI-11 | CSS animation timing not verifiable in jsdom | Navigate to course detail, verify animations |
| CountUp animation on Projected Final | UI-11 | requestAnimationFrame timing in jsdom | Type prediction score, observe number animation |
| Portal-slot right panel renders in correct position | UI-11 | Layout/positioning not testable in jsdom | Check right panel shows Quick Links, Deadlines, Ed Posts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
