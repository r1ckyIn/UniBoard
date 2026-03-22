---
phase: 04-setup-page
plan: 02
subsystem: ui
tags: [react, next-intl, lucide-react, accessibility, tailwind, animation]

# Dependency graph
requires:
  - phase: 04-setup-page/01
    provides: i18n setup namespace (en.json/zh.json), SetupGuard, token validation
  - phase: 03-auth-page
    provides: AnimatedEntry, AuthDoodles, RoughCard, (auth) layout
provides:
  - StepIndicator component (3-circle progress bar with 4 states)
  - WelcomeStep component (Step 1 UI with logo, features, CTA)
  - TutorialStep component (Step 2 orchestrator with two GuideCards)
  - GuideCard component (collapsible platform tutorial with chevron animation)
affects: [04-setup-page plan 03 (SetupPage orchestrator)]

# Tech tracking
tech-stack:
  added: []
  patterns: [collapsible card with aria-expanded and CSS max-height transition, step indicator with computed state classes]

key-files:
  created:
    - frontend/components/setup/StepIndicator.tsx
    - frontend/components/setup/WelcomeStep.tsx
    - frontend/components/setup/TutorialStep.tsx
    - frontend/components/setup/GuideCard.tsx
    - frontend/__tests__/setup/StepIndicator.test.tsx
    - frontend/__tests__/setup/GuideCard.test.tsx
  modified: []

key-decisions:
  - "GuideCard uses CSS max-height transition (0/500px) instead of scrollHeight ref for simpler collapse animation"
  - "Step icons rendered alongside step number circles as decorative elements (not replacing numbers)"

patterns-established:
  - "Collapsible card pattern: useState + aria-expanded on header button + aria-hidden on content + CSS max-height/opacity transitions"
  - "Step indicator: computed stepNum from currentStep prop, Fragment-based circle+line layout"

requirements-completed: [UI-10, PLAT-01]

# Metrics
duration: 4min
completed: 2026-03-22
---

# Phase 04 Plan 02: Setup Step Components Summary

**StepIndicator (3-circle progress bar), WelcomeStep (logo + feature badges + CTA), GuideCard (collapsible platform tutorial), and TutorialStep (Canvas + Ed guide orchestrator) with full test coverage**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T02:45:43Z
- **Completed:** 2026-03-22T02:49:46Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- StepIndicator renders 4 states (step 1/2/3/success) with correct active (orange), completed (green + check), and upcoming (border) visual states plus accessibility attributes
- WelcomeStep displays logo block, title, description, italic subtitle, 3 feature badges (ShieldCheck/Lock/Trash2) with platform-specific soft backgrounds, and Get Started CTA button
- GuideCard implements independently collapsible platform tutorials with chevron rotation animation, numbered steps, and aria-expanded/aria-hidden accessibility
- TutorialStep orchestrates two GuideCards (Canvas + Ed) both default expanded, with Back and "I have my tokens" buttons

## Task Commits

Each task was committed atomically:

1. **Task 1: StepIndicator and WelcomeStep components** - `b9f4633` (feat)
2. **Task 2: GuideCard and TutorialStep components** - `92d21f4` (feat)

## Files Created/Modified
- `frontend/components/setup/StepIndicator.tsx` - 3-circle step progress indicator with 4 visual states
- `frontend/components/setup/WelcomeStep.tsx` - Step 1 welcome screen with logo, features, and CTA
- `frontend/components/setup/GuideCard.tsx` - Collapsible platform tutorial card with chevron animation
- `frontend/components/setup/TutorialStep.tsx` - Step 2 orchestrator rendering Canvas + Ed guide cards
- `frontend/__tests__/setup/StepIndicator.test.tsx` - 5 tests covering all step states and accessibility
- `frontend/__tests__/setup/GuideCard.test.tsx` - 5 tests covering expand/collapse, independence, and aria attributes

## Decisions Made
- GuideCard uses CSS max-height transition (0px to 500px) rather than measuring scrollHeight via ref -- simpler implementation that works for the known content height.
- Step icons (ExternalLink, Settings, Key, Copy) included as decorative elements alongside numbered circles, providing visual hints about each step's action.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All display components (StepIndicator, WelcomeStep, TutorialStep, GuideCard) are ready for Plan 03
- Plan 03 can build TokenStep, SuccessStep, and the SetupPage orchestrator that imports these components
- i18n keys from Plan 01 are used correctly by WelcomeStep (setup.welcome.*) and GuideCard/TutorialStep (setup.tutorial.*)

---
*Phase: 04-setup-page*
*Completed: 2026-03-22*
