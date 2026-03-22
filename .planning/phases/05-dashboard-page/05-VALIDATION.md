---
phase: 5
slug: dashboard-page
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-22
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && pnpm vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && pnpm vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && pnpm vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 00-T1 | 05-00 | 0 | UI-01 | scaffold | `pnpm vitest run -- __tests__/dashboard/` | W0 creates | pending |
| 00-T2 | 05-00 | 0 | UI-01 | scaffold | `pnpm vitest run -- __tests__/layout/NotificationPanel __tests__/layout/AvatarMenu` | W0 creates | pending |
| 01-T1 | 05-01 | 1 | UI-01 | unit | `pnpm vitest run -- __tests__/dashboard/encouragement __tests__/dashboard/course-colors` | W0 | pending |
| 01-T2 | 05-01 | 1 | UI-01 | unit | `pnpm vitest run -- __tests__/dashboard/SkeletonCard` | W0 | pending |
| 02-T1 | 05-02 | 1 | UI-01 | unit | `pnpm vitest run -- __tests__/layout/NotificationPanel` | W0 | pending |
| 02-T2 | 05-02 | 1 | UI-01 | unit | `pnpm vitest run -- __tests__/layout/AvatarMenu` | W0 | pending |
| 03-T1 | 05-03 | 2 | UI-01 | unit | `pnpm vitest run -- __tests__/dashboard/HeroSection` | W0 | pending |
| 03-T2 | 05-03 | 2 | UI-01 | unit | `pnpm vitest run -- __tests__/dashboard/StatsRow` | W0 | pending |
| 03-T3 | 05-03 | 2 | UI-01 | unit | `pnpm vitest run -- __tests__/dashboard/CourseGradesTable` | W0 | pending |
| 04-T1 | 05-04 | 2 | UI-01 | unit | `pnpm vitest run -- __tests__/dashboard/ExternalLinkDialog` | W0 | pending |
| 04-T2 | 05-04 | 2 | UI-01 | unit | `pnpm vitest run -- __tests__/dashboard/MiniCalendar __tests__/dashboard/RecentActivity` | W0 | pending |
| 05-T1 | 05-05 | 3 | UI-01 | unit | `pnpm vitest run -- __tests__/dashboard/DeadlineTimeline __tests__/dashboard/AssessmentDonut` | W0 | pending |
| 05-T2 | 05-05 | 3 | UI-01 | unit + integration | `pnpm vitest run` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Plan 05-00 creates all 13 test stub files:
- [x] `__tests__/dashboard/HeroSection.test.tsx`
- [x] `__tests__/dashboard/StatsRow.test.tsx`
- [x] `__tests__/dashboard/CourseGradesTable.test.tsx`
- [x] `__tests__/dashboard/DeadlineTimeline.test.tsx`
- [x] `__tests__/dashboard/AssessmentDonut.test.tsx`
- [x] `__tests__/dashboard/MiniCalendar.test.tsx`
- [x] `__tests__/dashboard/RecentActivity.test.tsx`
- [x] `__tests__/dashboard/ExternalLinkDialog.test.tsx`
- [x] `__tests__/dashboard/SkeletonCard.test.tsx`
- [x] `__tests__/dashboard/encouragement.test.ts`
- [x] `__tests__/dashboard/course-colors.test.ts`
- [x] `__tests__/layout/NotificationPanel.test.tsx`
- [x] `__tests__/layout/AvatarMenu.test.tsx`

*Existing infrastructure covers test framework setup -- vitest + testing-library already configured from prior phases.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero parallax fade on scroll | UI-01 | Scroll-driven visual effect, jsdom lacks scroll simulation | Scroll past hero, verify text fades progressively |
| Donut converge animation | UI-01 | Canvas animation timing, visual smoothness | Load dashboard, observe segments converge to center |
| Rough.js hand-drawn rendering | UI-01 | Visual quality of canvas-drawn elements | Inspect stats cards, progress bars, timeline, donut borders |
| Calendar dot color depth | UI-01 | Color intensity proportional to weight, visual judgment | Check calendar dates with varying deadline weights |
| Deadline hover micro-displacement | UI-01 | CSS translateX animation, visual effect | Hover deadline items, observe pop-up displacement |
| Staggered entrance animations | UI-01 | CSS delay timing and visual sequencing | Refresh page, observe slideUp + fadeIn staggering |

*These are visual/animation behaviors that require human verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (05-00-PLAN.md)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
