---
phase: 27
slug: frontend-ux-fixes-and-course-materials-preview
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && pnpm vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && pnpm vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && pnpm vitest run && pnpm typecheck && pnpm lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | UX-01 | unit | `cd frontend && pnpm vitest run __tests__/dashboard/RecentActivity.test.tsx -x` | Exists (.todo() stubs) | ⬜ pending |
| 27-01-02 | 01 | 1 | UX-02 | unit | `cd frontend && pnpm vitest run __tests__/dashboard/CourseGradesTable.test.tsx -x` | ✅ exists | ⬜ pending |
| 27-02-01 | 02 | 1 | UX-03 | unit | `cd frontend && pnpm vitest run __tests__/timetable/TimetableEvent.test.tsx -x` | ❌ Wave 0 | ⬜ pending |
| 27-02-02 | 02 | 1 | UX-04 | unit | `cd frontend && pnpm vitest run __tests__/timetable/TimetableUpcomingDeadlines.test.tsx -x` | ❌ Wave 0 | ⬜ pending |
| 27-03-01 | 03 | 2 | FEAT-01 | unit | `cd frontend && pnpm vitest run __tests__/course-detail/MaterialViewerPanel.test.tsx -x` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/timetable/TimetableEvent.test.tsx` — stubs for UX-03 (solid/dashed border)
- [ ] `__tests__/timetable/TimetableUpcomingDeadlines.test.tsx` — stubs for UX-04 (scroll indicator)
- [ ] `__tests__/course-detail/MaterialViewerPanel.test.tsx` — stubs for FEAT-01 (slide-out panel)
- [ ] `__tests__/dashboard/RecentActivity.test.tsx` — implement .todo() stubs for per-type navigation (UX-01)

*Existing infrastructure covers framework — only test file stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Material viewer iframe loads external docs | FEAT-01 | X-Frame-Options may block iframe — browser-only | Open course detail, click material, verify iframe loads or fallback triggers |
| Timetable visual border distinction | UX-03 | Visual regression — solid vs dashed border | Open timetable, compare attendance vs non-attendance course blocks |
| Scroll indicator visual appearance | UX-04 | Visual UX cue design | Open timetable with 5+ deadlines, verify scroll indicator appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
