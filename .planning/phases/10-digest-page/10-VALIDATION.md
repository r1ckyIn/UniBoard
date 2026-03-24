---
phase: 10
slug: digest-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 + @testing-library/react |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run __tests__/digest --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run __tests__/digest --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | UI-05-A | unit | `cd frontend && npx vitest run __tests__/digest/DigestPage.test.tsx -t "renders course sections"` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | UI-05-B | unit | `cd frontend && npx vitest run __tests__/digest/HighlightItem.test.tsx -t "shows type icon and urgency badge"` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | UI-05-C | unit | `cd frontend && npx vitest run __tests__/digest/DigestPage.test.tsx -t "filters by type"` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | UI-05-D | unit | `cd frontend && npx vitest run __tests__/digest/DigestPage.test.tsx -t "renders right panel"` | ❌ W0 | ⬜ pending |
| 10-01-05 | 01 | 1 | UI-05-E | unit | `cd frontend && npx vitest run __tests__/digest/DigestPage.test.tsx -t "loading state"` | ❌ W0 | ⬜ pending |
| 10-01-06 | 01 | 1 | UI-05-F | unit | `cd frontend && npx vitest run __tests__/digest/DigestPage.test.tsx -t "urgent banner"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/digest/DigestPage.test.tsx` — stubs for UI-05-A, UI-05-C, UI-05-D, UI-05-E, UI-05-F
- [ ] `frontend/__tests__/digest/HighlightItem.test.tsx` — stubs for UI-05-B
- [ ] `frontend/__tests__/digest/CourseSectionCard.test.tsx` — covers course section rendering with stripe/header

*Existing infrastructure (vitest, jsdom, roughjs mock pattern) already exists from prior phases.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual course section styling (left stripe, color dot) | UI-05 | CSS visual appearance | Inspect page at /digest, verify colored left stripe and course header styling |
| Rough.js hand-drawn borders on right panel cards | UI-05 | Canvas rendering | Verify RoughCard renders with hand-drawn aesthetic on Summary and Recent Digests cards |
| Entrance animation stagger timing | UI-05 | CSS animation timing | Reload page, confirm slideUp stagger on course sections |
| Responsive layout breakpoints | UI-05 | Viewport-dependent | Resize browser to mobile/tablet, verify layout adapts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
