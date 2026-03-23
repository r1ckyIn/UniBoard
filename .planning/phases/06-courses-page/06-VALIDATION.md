---
phase: 6
slug: courses-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + @testing-library/react |
| **Config file** | frontend/vitest.config.ts |
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
| 06-01-01 | 01 | 0 | UI-02 | unit | `pnpm vitest run __tests__/courses` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/courses/` — test directory for courses page components
- [ ] Test stubs for CourseCard, CoursesGrid, CoursesPage, BannerDeco

*Existing infrastructure covers test framework — only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rough.js hand-drawn borders render correctly | UI-02 SC4 | Canvas/SVG rendering not testable in jsdom | Open /courses in browser, verify hand-drawn borders on all cards |
| Banner deco SVG patterns visible | UI-02 | SVG rendering in jsdom is partial | Open /courses, verify 5 unique deco patterns on banners |
| Hover translateY(-3px) animation | UI-02 SC4 | CSS transitions not testable in jsdom | Hover over each card, verify lift effect |
| Responsive grid breakpoints | UI-02 SC1 | Viewport testing requires browser | Resize browser: 3 cols > 1400px, 2 cols > 900px, 1 col < 900px |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
