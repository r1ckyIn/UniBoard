---
phase: 01-design-system-foundation
plan: 02
subsystem: ui
tags: [roughjs, rough-notation, lucide-react, layout, sidebar, header, app-shell, design-system, client-only]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Next.js 15 scaffold, Tailwind v4 @theme tokens, i18n routing, Vitest, cn() utility"
provides:
  - "RoughCard component with hand-drawn Rough.js border and ResizeObserver"
  - "RoughNotationWrapper for rough-notation text annotations"
  - "HeroDoodles decorative background Rough.js shapes"
  - "ClientOnly SSR bypass wrapper using next/dynamic ssr:false"
  - "AnimatedEntry staggered slideUp entrance animation"
  - "Three-column AppShell layout (Sidebar + Header + RightPanel)"
  - "Sidebar with 7 nav items, collapsible 68px/224px on hover"
  - "Header with search bar, notification dropdown, avatar dropdown"
  - "RightPanel with profile card, calendar, activity feed placeholders"
  - "Dashboard route group using AppShell"
  - "Auth route group with centered layout (no sidebar)"
affects: [all-page-phases, 03-auth-setup]

# Tech tracking
tech-stack:
  added: []
  patterns: [rough-js-client-only, resize-observer-redraw, three-column-app-shell, dropdown-click-outside, auto-hide-scrollbar]

key-files:
  created:
    - frontend/components/design-system/ClientOnly.tsx
    - frontend/components/design-system/RoughCard.tsx
    - frontend/components/design-system/RoughNotationWrapper.tsx
    - frontend/components/design-system/HeroDoodles.tsx
    - frontend/components/shared/AnimatedEntry.tsx
    - frontend/components/layout/Sidebar.tsx
    - frontend/components/layout/Header.tsx
    - frontend/components/layout/RightPanel.tsx
    - frontend/components/layout/AppShell.tsx
    - frontend/app/[locale]/(dashboard)/layout.tsx
    - frontend/app/[locale]/(dashboard)/page.tsx
    - frontend/app/[locale]/(auth)/layout.tsx
    - frontend/__tests__/design-system/RoughCard.test.tsx
    - frontend/__tests__/layout/AppShell.test.tsx
  modified:
    - frontend/messages/en.json
    - frontend/messages/zh.json

key-decisions:
  - "Used withClientOnly() wrapper for RoughCard in RightPanel to avoid hydration mismatches"
  - "Removed old app/[locale]/page.tsx in favor of (dashboard)/page.tsx route group"
  - "RightPanel hidden on screens below xl (1280px) via hidden xl:flex"
  - "Imported rough-notation types from rough-notation/lib/model.js (not directly exported)"

patterns-established:
  - "Client-only Rough.js: all Rough.js components use 'use client' + withClientOnly() for SSR bypass"
  - "RoughCard ResizeObserver: hand-drawn borders automatically redraw on element resize"
  - "Dropdown pattern: useState toggle + useRef + click-outside listener for header dropdowns"
  - "Auto-hide scrollbar: add 'scrolling' class on scroll, remove after 1200ms idle timeout"
  - "Route groups: (dashboard) uses AppShell layout, (auth) uses centered full-page layout"

requirements-completed: [UI-07]

# Metrics
duration: 7min
completed: 2026-03-20
---

# Phase 01 Plan 02: Design System Components & App Shell Layout Summary

**Rough.js design system (RoughCard, RoughNotation, HeroDoodles, AnimatedEntry) plus three-column AppShell layout with collapsible sidebar, sticky header with dropdowns, and right panel with profile/calendar/activity placeholders**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-20T09:01:57Z
- **Completed:** 2026-03-20T09:09:35Z
- **Tasks:** 3
- **Files modified:** 17 (14 created, 2 modified, 1 deleted)

## Accomplishments
- 5 design system components: ClientOnly SSR wrapper, RoughCard with hand-drawn border and ResizeObserver, RoughNotationWrapper for text annotations, HeroDoodles decorative shapes, AnimatedEntry staggered animation
- Three-column AppShell layout: fixed sidebar (68px collapsed, 224px on hover with 7 nav items), sticky header (search, notification/avatar dropdowns), right panel (profile, calendar, activity)
- Dashboard and Auth route groups with proper layout composition
- 12 passing tests (9 new component smoke tests + 3 existing i18n tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build design system components** - `b3c7a73` (feat)
2. **Task 2: Build app shell layout and dashboard route group** - `d83301c` (feat)
3. **Task 3: Add visual verification tests** - `e2e2095` (test)

## Files Created/Modified
- `frontend/components/design-system/ClientOnly.tsx` - withClientOnly() wrapper using next/dynamic ssr:false
- `frontend/components/design-system/RoughCard.tsx` - Card with Rough.js hand-drawn border, ResizeObserver redraw
- `frontend/components/design-system/RoughNotationWrapper.tsx` - Wrapper for rough-notation annotate() API
- `frontend/components/design-system/HeroDoodles.tsx` - Full-viewport decorative Rough.js shapes (stars, sparkles, circles, waves)
- `frontend/components/shared/AnimatedEntry.tsx` - Staggered slideUp animation with 10-step delay map
- `frontend/components/layout/Sidebar.tsx` - Collapsible sidebar with UniBoard logo, 7 nav items, active state
- `frontend/components/layout/Header.tsx` - Sticky header with search, notification dropdown, avatar dropdown
- `frontend/components/layout/RightPanel.tsx` - Profile card, mini calendar, activity feed with auto-hide scrollbar
- `frontend/components/layout/AppShell.tsx` - Three-column composition (Sidebar + Header + main + RightPanel)
- `frontend/app/[locale]/(dashboard)/layout.tsx` - Dashboard route group layout using AppShell
- `frontend/app/[locale]/(dashboard)/page.tsx` - Placeholder dashboard page with welcome text
- `frontend/app/[locale]/(auth)/layout.tsx` - Auth route group with centered layout
- `frontend/__tests__/design-system/RoughCard.test.tsx` - RoughCard smoke tests (5 tests)
- `frontend/__tests__/layout/AppShell.test.tsx` - AppShell layout smoke tests (4 tests)
- `frontend/messages/en.json` - Added rightPanel, dashboard, header.profile/logout keys
- `frontend/messages/zh.json` - Added rightPanel, dashboard, header.profile/logout keys

## Decisions Made
- Used `withClientOnly()` wrapper when importing RoughCard in RightPanel to prevent SSR hydration mismatches from Rough.js
- Removed old `app/[locale]/page.tsx` since `(dashboard)/page.tsx` route group now serves the root locale page
- RightPanel uses `hidden xl:flex xl:flex-col` to auto-hide below 1280px (matching prototype's 1200px breakpoint with xl)
- Imported rough-notation types from `rough-notation/lib/model.js` since the main package does not re-export `RoughAnnotation` type

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed rough-notation type import path**
- **Found during:** Task 1 (RoughNotationWrapper)
- **Issue:** `import { type RoughAnnotation } from "rough-notation"` fails -- module declares the type locally but does not export it
- **Fix:** Import from `rough-notation/lib/model.js` which directly exports `RoughAnnotation` and `RoughAnnotationType`
- **Files modified:** frontend/components/design-system/RoughNotationWrapper.tsx
- **Verification:** `pnpm build` exits 0
- **Committed in:** b3c7a73 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed SVG className check in RoughCard test**
- **Found during:** Task 3 (RoughCard test)
- **Issue:** `svg.className` returns SVGAnimatedString in jsdom, not a regular string -- `toContain()` fails
- **Fix:** Used `svg.getAttribute("class")` instead of `svg.className` for SVG elements in jsdom
- **Files modified:** frontend/__tests__/design-system/RoughCard.test.tsx
- **Verification:** All 12 tests pass
- **Committed in:** e2e2095 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes required for build/test to pass. No scope creep.

## Issues Encountered
None -- all builds, tests, lint, and typecheck passed after auto-fixes.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- All design system components available for import in any page phase
- Three-column layout active on dashboard route group -- pages only need to provide content
- Auth route group ready for login/setup pages
- RoughCard, AnimatedEntry, and withClientOnly() tested and verified
- All Tailwind @theme tokens, fonts, paper texture working in layout context
- 12 tests provide regression safety for layout and design system changes

## Self-Check: PASSED

All 14 key files verified present. All 3 task commits verified in git log.

---
*Phase: 01-design-system-foundation*
*Completed: 2026-03-20*
