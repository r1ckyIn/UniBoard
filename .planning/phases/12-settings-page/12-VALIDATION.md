---
phase: 12
slug: settings-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.0 + @testing-library/react |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run __tests__/settings/ --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run __tests__/settings/ --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | UI-06 | unit | `cd frontend && npx vitest run __tests__/settings/SettingsPage.test.tsx -x` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | UI-06 | unit | `cd frontend && npx vitest run __tests__/settings/TokensSection.test.tsx -x` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | UI-06 | unit | `cd frontend && npx vitest run __tests__/settings/GpaTargetSection.test.tsx -x` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | UI-06 | unit | `cd frontend && npx vitest run __tests__/settings/NotificationsSection.test.tsx -x` | ❌ W0 | ⬜ pending |
| 12-01-05 | 01 | 1 | UI-06 | unit | `cd frontend && npx vitest run __tests__/settings/ProfileSection.test.tsx -x` | ❌ W0 | ⬜ pending |
| 12-01-06 | 01 | 1 | UI-06 | unit | `cd frontend && npx vitest run __tests__/settings/DangerZoneSection.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/settings/SettingsPage.test.tsx` — page-level integration (portal, nav, sections rendering)
- [ ] `frontend/__tests__/settings/TokensSection.test.tsx` — token CRUD, status badges, visibility toggle
- [ ] `frontend/__tests__/settings/GpaTargetSection.test.tsx` — slider/input sync, grade band display, save
- [ ] `frontend/__tests__/settings/NotificationsSection.test.tsx` — toggle interactions, localStorage persistence
- [ ] `frontend/__tests__/settings/DangerZoneSection.test.tsx` — disconnect dialog, delete account with DELETE confirmation
- [ ] `frontend/__tests__/settings/ProfileSection.test.tsx` — display name edit, email readonly, save
- [ ] Mock `scrollIntoView` in test setup: `Element.prototype.scrollIntoView = vi.fn()`
- [ ] Mock `IntersectionObserver` if not already polyfilled

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scroll-spy smooth scroll animation | UI-06 | Visual animation cannot be verified in jsdom | Click each nav item, verify smooth scroll and active highlight |
| Responsive layout below 900px | UI-06 | Viewport resize behavior not testable in jsdom | Resize browser below 900px, verify secondary nav hides |
| Token eye toggle visual | UI-06 | Password masking rendering is visual | Click eye icon, verify token text toggles between masked/visible |
| Rough.js hand-drawn card borders | UI-06 | Canvas rendering in RoughCard | Visual inspection of card borders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
