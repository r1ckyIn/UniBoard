---
phase: 12-settings-page
plan: 01
subsystem: ui
tags: [next-intl, scroll-spy, intersection-observer, portal, settings]

requires:
  - phase: 01-app-shell
    provides: AppShell layout with right-panel-slot portal target
  - phase: 05-dashboard
    provides: AnimatedEntry, RoughCard, portal-slot pattern

provides:
  - Settings route at /[locale]/(dashboard)/settings
  - SettingsNav scroll-spy component with 6 nav items
  - SettingsPage orchestrator with IntersectionObserver scroll tracking
  - Complete i18n settings namespace (en/zh) for all section labels
  - IntersectionObserver and scrollIntoView test polyfills
  - 6 Wave 0 test stub files (34 todo tests)

affects: [12-02-PLAN, 12-03-PLAN]

tech-stack:
  added: []
  patterns:
    - "Scroll-spy nav with IntersectionObserver + isScrollingRef race condition guard"
    - "Settings section ID convention: sec-tokens, sec-gpa, sec-notifications, sec-courses, sec-profile, sec-danger"

key-files:
  created:
    - frontend/app/[locale]/(dashboard)/settings/page.tsx
    - frontend/components/settings/SettingsNav.tsx
    - frontend/components/settings/SettingsPage.tsx
    - frontend/__tests__/settings/SettingsPage.test.tsx
    - frontend/__tests__/settings/TokensSection.test.tsx
    - frontend/__tests__/settings/GpaTargetSection.test.tsx
    - frontend/__tests__/settings/NotificationsSection.test.tsx
    - frontend/__tests__/settings/ProfileSection.test.tsx
    - frontend/__tests__/settings/DangerZoneSection.test.tsx
  modified:
    - frontend/messages/en.json
    - frontend/messages/zh.json
    - frontend/src/test/setup.ts

key-decisions:
  - "Scroll-spy uses isScrollingRef guard to prevent race condition during smooth scroll (800ms timeout)"
  - "SettingsNav uses hidden min-[900px]:flex for responsive hide matching prototype"
  - "Section placeholder cards use RoughCard with AnimatedEntry stagger delays 1-6"

patterns-established:
  - "Settings section ID convention: sec-{name} for consistent scroll-spy targeting"
  - "IntersectionObserver rootMargin: -120px 0px -60% 0px for scroll-spy activation zone"

requirements-completed: []

duration: 4min
completed: 2026-03-25
---

# Phase 12 Plan 01: Settings Page Infrastructure Summary

**Settings route with scroll-spy navigation, i18n namespace (en/zh), IntersectionObserver-based active section tracking, and 6 Wave 0 test stubs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-25T11:31:34Z
- **Completed:** 2026-03-25T11:36:16Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Complete i18n settings namespace with all section labels in English and Chinese (i18n parity test passes)
- Settings route following established Next.js 15 page pattern with Suspense wrapper
- SettingsNav scroll-spy component with 6 items, active highlighting, responsive hide below 900px
- SettingsPage orchestrator with IntersectionObserver scroll tracking, smooth-scroll nav, right panel portal
- IntersectionObserver polyfill and scrollIntoView mock added to test setup for jsdom
- 34 Wave 0 test stubs across 6 test files covering all settings sections

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n settings namespace, route file, IntersectionObserver polyfill, Wave 0 test stubs** - `7eacb3a` (feat)
2. **Task 2: SettingsNav scroll-spy component and SettingsPage orchestrator skeleton** - `80f1f9e` (feat)

## Files Created/Modified
- `frontend/messages/en.json` - Added "settings" namespace with nav, tokens, gpa, notifications, courses, profile, danger, rightPanel keys
- `frontend/messages/zh.json` - Added Chinese translations for all settings keys
- `frontend/app/[locale]/(dashboard)/settings/page.tsx` - Settings route with setRequestLocale and Suspense
- `frontend/src/test/setup.ts` - Added IntersectionObserver polyfill and scrollIntoView mock
- `frontend/components/settings/SettingsNav.tsx` - 6-item scroll-spy nav with active state, responsive hide
- `frontend/components/settings/SettingsPage.tsx` - Page orchestrator with scroll-spy, portal, section placeholders
- `frontend/__tests__/settings/*.test.tsx` - 6 test stub files with 34 todo tests

## Decisions Made
- Scroll-spy uses isScrollingRef guard to prevent race condition during smooth scroll (800ms timeout)
- SettingsNav uses `hidden min-[900px]:flex` for responsive hide matching prototype breakpoint
- Section placeholder cards wrapped in RoughCard with AnimatedEntry stagger delays 1-6
- Danger Zone nav item uses permanent red icon color (#cc4455) regardless of active state
- SettingsNav border-left uses inline style to override Tailwind border utility specificity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Settings infrastructure ready for Plan 02 (Tokens, GPA, Notifications sections) and Plan 03 (Courses, Profile, Danger Zone sections)
- Section placeholder cards can be replaced by real components without modifying SettingsPage layout
- Right panel portal content can be enhanced with real data from useCurrentUser and useSyncStatus hooks

## Self-Check: PASSED

- All 12 files verified present on disk
- Commit 7eacb3a (Task 1) verified in git log
- Commit 80f1f9e (Task 2) verified in git log
- i18n parity test passes (en/zh key match)
- All 34 Wave 0 test stubs report as todo (no failures)

---
*Phase: 12-settings-page*
*Completed: 2026-03-25*
