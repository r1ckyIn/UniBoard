---
phase: 03-auth-page
plan: 04
subsystem: ui
tags: [motion, rough.js, 3d-animation, framer-motion]

requires:
  - phase: 03-auth-page/03-02
    provides: "Auth page UI components (BrandPanel, AuthFormCard, AuthPage)"
  - phase: 03-auth-page/03-03
    provides: "URL-based form mode state, scrollbar fix, validation fix"
provides:
  - "3D book-opening entrance animation with perspective + rotateY"
  - "RoughCard fixed seed for deterministic hand-drawn borders"
  - "RoughCard rAF burst loop for smooth border transitions during layout animation"
  - "RoughCard disableHover prop for opt-out of float effect"
affects: []

tech-stack:
  added: []
  patterns:
    - "Fixed seed rough.js rendering for animation-safe hand-drawn borders"
    - "rAF burst loop pattern for tracking CSS/framer-motion transitions"

key-files:
  created: []
  modified:
    - frontend/components/design-system/RoughCard.tsx
    - frontend/components/auth/AuthFormCard.tsx
    - frontend/components/auth/AuthPage.tsx

key-decisions:
  - "Used seed: 42 for rough.js deterministic paths — eliminates jitter on redraw"
  - "rAF burst loop (400ms) rather than prop-based API — simpler, self-contained"
  - "Spring physics stiffness: 60, damping: 15 for gentle page-turn feel"

patterns-established:
  - "RoughCard disableHover pattern: opt-out hover effects for specific contexts"

requirements-completed: [UI-09]

duration: 8min
completed: 2026-03-21
---

# Plan 03-04: 3D Book-Opening Animation & RoughCard Border Fix

**3D book-opening entrance animation with perspective rotateY, deterministic rough.js borders via fixed seed, and rAF burst loop for smooth border transitions**

## Performance

- **Duration:** ~8 min
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments
- Auth page entrance replaced with 3D book-opening: left panel swings from right edge (-90deg→0), right panel from left edge (90deg→0)
- RoughCard uses fixed seed (42) for deterministic hand-drawn paths — no visual jitter on resize
- ResizeObserver triggers 400ms rAF burst loop for smooth border tracking during framer-motion layout animations
- disableHover prop on RoughCard prevents unwanted float effect on auth form card
- All 5 UAT gap closures visually verified and approved by user

## Task Commits

1. **Task 1: RoughCard smooth border transitions and disableHover prop** - `759d6aa` (fix)
2. **Task 2: 3D book-opening entrance animation** - `c994b25` (feat)
3. **Task 3: Visual verification of all 5 UAT fixes** - user approved (checkpoint)

## Files Created/Modified
- `frontend/components/design-system/RoughCard.tsx` - Fixed seed, rAF burst loop, disableHover prop
- `frontend/components/auth/AuthFormCard.tsx` - Added disableHover to RoughCard usage
- `frontend/components/auth/AuthPage.tsx` - Replaced slide-up with 3D book-opening animation

## Decisions Made
- Used `seed: 42` for rough.js — produces identical wobble pattern every redraw, only dimensions change
- 400ms rAF burst matches spring animation duration — self-terminating, no cleanup needed
- Spring params (stiffness: 60, damping: 15, mass: 1) — gentle page turn, not bouncy

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 UAT issues from Phase 03 resolved
- Auth page polished with book-opening animation, smooth borders, proper validation
- Ready for Phase 04

---
*Phase: 03-auth-page*
*Completed: 2026-03-21*
