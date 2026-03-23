---
phase: 08
slug: deadlines-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + @testing-library/react |
| **Config file** | frontend/vitest.config.ts |
| **Quick run command** | `cd frontend && npx vitest run --testPathPattern="deadlines" --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --testPathPattern="deadlines" --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | UI-03 | unit | `vitest run --testPathPattern="deadlines"` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | UI-03 | unit | `vitest run --testPathPattern="deadlines"` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | UI-03 | unit | `vitest run --testPathPattern="deadlines"` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 2 | UI-03 | unit | `vitest run --testPathPattern="deadlines"` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 3 | UI-03 | unit | `vitest run --testPathPattern="deadlines"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/deadlines/DeadlinesPage.test.tsx` — stubs for page orchestrator
- [ ] `frontend/__tests__/deadlines/DeadlineCard.test.tsx` — stubs for card component
- [ ] `frontend/__tests__/deadlines/DeadlineTimeline.test.tsx` — stubs for timeline view
- [ ] `frontend/__tests__/deadlines/DeadlineCalendar.test.tsx` — stubs for calendar view

*Existing infrastructure (vitest, testing-library, roughjs mocks) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar dot indicators align with dates | UI-03 | Visual alignment check | Open /deadlines, switch to calendar view, verify dots match deadline dates |
| Expandable card animation is smooth | UI-03 | Animation quality | Click a deadline card, verify expand/collapse transition |
| AI chat placeholder disabled state | UI-03 | Visual UX check | Verify disabled input, grayed send button, "Coming Soon" badge |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
