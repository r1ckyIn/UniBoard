---
phase: 03-auth-page
plan: 02
subsystem: auth
tags: [react-hook-form, zod, motion, roughjs, i18n, next-intl, animation, form-validation]

# Dependency graph
requires:
  - phase: 03-auth-page plan 01
    provides: "Zod schemas (loginSchema, registerSchema), getPasswordStrength, AuthGuard, AuthDoodles, LanguageSwitcher, i18n messages, auth layout"
  - phase: 02-api-contract
    provides: "Auth hooks (useLogin, useRegister), auth store, mock API routes"
  - phase: 01-app-shell
    provides: "RoughCard, ClientOnly, withClientOnly, next-intl routing"
provides:
  - "BrandPanel with logo, tagline, 3 feature highlights (GPA Tracking, Smart Digest, Deadline Intelligence)"
  - "LoginForm with react-hook-form + zod validation, forgot password toast, smart post-login routing"
  - "RegisterForm with password strength meter, register->auto-login->success overlay flow"
  - "PasswordStrengthMeter 4-bar visual indicator (red/amber/green)"
  - "AuthFormCard with Motion layout spring + AnimatePresence for smooth form switching"
  - "SuccessOverlay with green checkmark and Continue to Setup CTA"
  - "AuthPage two-panel orchestrator with staggered entrance animation"
  - "Next.js page route at /[locale]/(auth)/auth"
affects: [setup-page, settings-page, dashboard-page]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Motion layout spring (stiffness:300, damping:30) for container height morphing", "AnimatePresence mode=wait for crossfade between login/register", "Staggered entrance with containerVariants + itemVariants", "react-hook-form + zodResolver mode=onBlur for inline validation", "Tuple cast for Motion ease values to satisfy TypeScript strict types"]

key-files:
  created:
    - frontend/components/auth/BrandPanel.tsx
    - frontend/components/auth/LoginForm.tsx
    - frontend/components/auth/RegisterForm.tsx
    - frontend/components/auth/PasswordStrengthMeter.tsx
    - frontend/components/auth/AuthFormCard.tsx
    - frontend/components/auth/SuccessOverlay.tsx
    - frontend/components/auth/AuthPage.tsx
    - frontend/app/[locale]/(auth)/auth/page.tsx
    - frontend/__tests__/auth/PasswordStrengthMeter.test.tsx
    - frontend/__tests__/auth/LoginForm.test.tsx
    - frontend/__tests__/auth/RegisterForm.test.tsx
    - frontend/__tests__/auth/AuthFormCard.test.tsx
    - frontend/__tests__/auth/SuccessOverlay.test.tsx
  modified: []

key-decisions:
  - "Used tuple cast [number, number, number, number] for Motion ease arrays to satisfy TypeScript strict mode"
  - "SuccessOverlay positioned absolutely over AuthFormCard area using relative wrapper in AuthPage"
  - "BrandPanel uses min-[900px]:flex for exact 900px breakpoint matching prototype"

patterns-established:
  - "react-hook-form + zodResolver with mode onBlur for form validation"
  - "Motion AnimatePresence mode=wait with opacity+y crossfade for form switching"
  - "Motion layout spring for smooth container height morphing"
  - "data-testid=pw-bar pattern for querying strength meter bars in tests"

requirements-completed: [UI-09, PLAT-02]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 03 Plan 02: Auth Page UI Summary

**Complete auth page with two-panel layout, react-hook-form + zod validation, Motion spring animations for form switching, password strength meter, and staggered entrance animation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-21T04:38:38Z
- **Completed:** 2026-03-21T04:44:26Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Built all 7 auth page UI components with TDD for core form components
- LoginForm with inline validation, forgot password toast, smart routing (dashboard vs setup) based on tokenConfigured
- RegisterForm with password strength meter, register->auto-login->success overlay flow
- AuthFormCard with Motion layout spring for smooth height morphing and AnimatePresence crossfade
- AuthPage orchestrates two-panel layout with staggered entrance animation matching prototype

## Task Commits

Each task was committed atomically:

1. **Task 1: BrandPanel, LoginForm, RegisterForm, PasswordStrengthMeter (TDD)** - `0c80f01` (test: RED), `27d5014` (feat: GREEN)
2. **Task 2: AuthFormCard, SuccessOverlay, AuthPage, page.tsx** - `3968eb2` (feat)

_Note: Task 1 used TDD with separate RED/GREEN commits._

## Files Created/Modified
- `frontend/components/auth/PasswordStrengthMeter.tsx` - 4-bar strength indicator with color-coded bars and i18n labels
- `frontend/components/auth/BrandPanel.tsx` - Left panel with logo mark, tagline, 3 feature highlights, responsive hidden below 900px
- `frontend/components/auth/LoginForm.tsx` - Login form with react-hook-form + zod, Eye/EyeOff toggle, forgot password toast, smart routing
- `frontend/components/auth/RegisterForm.tsx` - Register form with 4 fields, password strength, register->auto-login->onRegisterSuccess
- `frontend/components/auth/AuthFormCard.tsx` - RoughCard wrapper with Motion layout spring + AnimatePresence for form switching
- `frontend/components/auth/SuccessOverlay.tsx` - Post-registration green checkmark overlay with Continue to Setup CTA
- `frontend/components/auth/AuthPage.tsx` - Two-panel orchestrator with staggered entrance animation
- `frontend/app/[locale]/(auth)/auth/page.tsx` - Next.js route wiring for /[locale]/auth
- `frontend/__tests__/auth/PasswordStrengthMeter.test.tsx` - 7 tests for bar rendering at each strength level
- `frontend/__tests__/auth/LoginForm.test.tsx` - 6 tests for rendering, validation, toast, submit, switch link
- `frontend/__tests__/auth/RegisterForm.test.tsx` - 7 tests for rendering, validation, register+login flow, switch link
- `frontend/__tests__/auth/AuthFormCard.test.tsx` - 4 tests for mode switching and link callbacks
- `frontend/__tests__/auth/SuccessOverlay.test.tsx` - 3 tests for visibility and button click

## Decisions Made
- Used tuple cast `[number, number, number, number]` for Motion ease arrays — TypeScript strict mode infers `number[]` which is incompatible with Motion's `Easing` type
- SuccessOverlay positioned absolutely over AuthFormCard using a relative wrapper in AuthPage, matching prototype's overlay pattern
- BrandPanel uses `min-[900px]:flex` for exact 900px breakpoint matching the prototype's `@media(max-width:900px)` rule

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Motion ease type incompatibility**
- **Found during:** Task 2 (typecheck verification)
- **Issue:** `ease: [0.16, 1, 0.3, 1]` inferred as `number[]` but Motion expects `[number, number, number, number]` tuple
- **Fix:** Added tuple cast `as [number, number, number, number]` to ease array
- **Files modified:** frontend/components/auth/AuthPage.tsx
- **Verification:** `pnpm typecheck` passes
- **Committed in:** 3968eb2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor TypeScript type fix, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth page is fully functional at /[locale]/auth with login/register flows, animations, and i18n support
- Phase 03 (auth-page) is now complete — all UI components built and tested
- Ready for Phase 04 (next page in roadmap)

## Self-Check: PASSED

All 13 created files verified present. All 3 commits (0c80f01, 27d5014, 3968eb2) verified in git log.

---
*Phase: 03-auth-page*
*Completed: 2026-03-21*
