---
phase: 12-settings-page
plan: 04
subsystem: ui, mock-api
tags: [settings, uat-gap-closure, css-fix, mock-state, gpa-sync]

requires:
  - phase: 12-settings-page-03
    provides: All settings section components (SettingsNav, Notifications, Profile, DangerZone)

key-files:
  modified:
    - frontend/components/settings/SettingsNav.tsx
    - frontend/components/settings/NotificationsSection.tsx
    - frontend/components/settings/ProfileSection.tsx
    - frontend/components/settings/DangerZoneSection.tsx
    - frontend/app/api/v1/users/me/route.ts
    - frontend/app/api/v1/gpa/route.ts
  created:
    - frontend/lib/fixtures/mock-state.ts
---

## Summary

Closed 5 UAT gaps from Phase 12 settings page user testing:

1. **Sticky nav position** — Changed `top-[calc(56px+20px)]` to `top-0` since the scroll container is `<main>`, not the viewport
2. **Notification description alignment** — Removed `ml-[52px]` from description paragraphs (toggle switch is right-aligned, indent was pointless)
3. **Date line-breaking** — Added `whitespace-nowrap` to account creation date span to prevent Chinese locale dates from breaking mid-string
4. **Dialog centering** — Added `m-auto` to both `<dialog>` elements (Tailwind Preflight resets UA `margin: auto`)
5. **GPA target persistence** — Created shared mock-state module; PATCH updates now persist for GET calls; GPA report route syncs `target_wam` from current user state

## Decisions

- Used a shared `mock-state.ts` module instead of exporting mutable state from route handlers, avoiding circular import risks
- Did not modify the static `gpa.ts` fixture — it remains the seed data; runtime mutation handled by mock-state layer

## Self-Check: PASSED

- [x] All 5 UAT gaps addressed
- [x] 29 settings tests pass, 0 regressions
- [x] TypeScript compiles (only pre-existing CourseCard.test.tsx error, unrelated)
- [x] Each task committed atomically
