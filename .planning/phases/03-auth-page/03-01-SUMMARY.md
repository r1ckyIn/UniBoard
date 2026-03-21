---
phase: 03-auth-page
plan: 01
subsystem: auth
tags: [zod, react-hook-form, motion, sonner, roughjs, i18n, next-intl, zustand]

# Dependency graph
requires:
  - phase: 01-app-shell
    provides: "Design system (HeroDoodles, ClientOnly, withClientOnly), next-intl routing, route groups"
  - phase: 02-api-contract
    provides: "Auth store (zustand), auth hooks, mock API routes"
provides:
  - "Zod validation schemas (loginSchema, registerSchema) with USYD email domain enforcement"
  - "getPasswordStrength scoring function (0-4)"
  - "AuthGuard component with zustand hydration-safe redirect"
  - "AuthDoodles colorful Rough.js background at 0.15-0.20 opacity"
  - "LanguageSwitcher for EN/ZH locale toggle"
  - "Complete auth.* i18n translations in both en.json and zh.json"
  - "Auth layout wiring AuthGuard + AuthDoodles + LanguageSwitcher + Sonner Toaster"
affects: [03-auth-page plan 02, setup-page, settings-page]

# Tech tracking
tech-stack:
  added: [motion 12.38.0, react-hook-form 7.71.2, "@hookform/resolvers 5.2.2", zod 4.3.6, sonner 2.0.7]
  patterns: ["Zod 4 schema validation with refine for domain check", "zustand persist hydration guard pattern", "withClientOnly for Rough.js SSR safety"]

key-files:
  created:
    - frontend/lib/validations/auth.ts
    - frontend/components/auth/AuthGuard.tsx
    - frontend/components/auth/AuthDoodles.tsx
    - frontend/components/auth/LanguageSwitcher.tsx
    - frontend/__tests__/auth/validation.test.ts
    - frontend/__tests__/auth/AuthGuard.test.tsx
  modified:
    - frontend/package.json
    - frontend/pnpm-lock.yaml
    - frontend/messages/en.json
    - frontend/messages/zh.json
    - frontend/app/[locale]/(auth)/layout.tsx

key-decisions:
  - "Used zod default import (not zod/v4 subpath) since zod 4.x is installed and @hookform/resolvers auto-detects v4"
  - "Auth layout is 'use client' since it wraps multiple client components (AuthGuard, LanguageSwitcher, Toaster)"
  - "AuthDoodles uses full-screen scatter pattern (not centered like Dashboard) with 4 quadrants + center concentric circles"

patterns-established:
  - "Zod 4 validation with domain-specific refine checks"
  - "AuthGuard: zustand persist.onFinishHydration + hasHydrated for flash-free auth redirect"
  - "withClientOnly lazy loading for Rough.js components in layouts"

requirements-completed: [UI-09, PLAT-02]

# Metrics
duration: 6min
completed: 2026-03-21
---

# Phase 03 Plan 01: Auth Foundation Summary

**Zod validation schemas (login/register with USYD email enforcement), zustand hydration-safe AuthGuard, colorful Rough.js auth doodles, EN/ZH language switcher, and complete i18n translations for all auth page text**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-21T04:28:18Z
- **Completed:** 2026-03-21T04:35:13Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Installed 5 new dependencies (motion, react-hook-form, @hookform/resolvers, zod, sonner) for auth page UI
- Created loginSchema and registerSchema with USYD email domain validation and password strength scoring
- Built AuthGuard with zustand persist hydration check to prevent flash-of-auth-page
- Created AuthDoodles with colorful Rough.js shapes scattered across full screen at 0.15-0.20 opacity
- Added complete auth.* i18n translations (login, register, validation, success, errors, brand) in both EN and ZH
- Updated auth layout to wire all components together

## Task Commits

Each task was committed atomically:

1. **Task 1: Validation schemas and auth guard (TDD)** - `413b75b` (test: failing tests), `b27426a` (feat: implementation + deps)
2. **Task 2: Auth doodles, language switcher, i18n, layout** - `55c32f9` (feat)

_Note: Task 1 used TDD with separate RED/GREEN commits._

## Files Created/Modified
- `frontend/lib/validations/auth.ts` - Zod schemas for login/register, getPasswordStrength function
- `frontend/components/auth/AuthGuard.tsx` - Client-side auth redirect with zustand hydration check
- `frontend/components/auth/AuthDoodles.tsx` - Colorful Rough.js background doodles (adapted from HeroDoodles)
- `frontend/components/auth/LanguageSwitcher.tsx` - EN/ZH locale toggle button using next-intl routing
- `frontend/app/[locale]/(auth)/layout.tsx` - Auth layout with all components wired together
- `frontend/messages/en.json` - Added auth.* translations (35 keys)
- `frontend/messages/zh.json` - Added auth.* translations (35 keys, Chinese)
- `frontend/__tests__/auth/validation.test.ts` - 14 tests for schemas and password strength
- `frontend/__tests__/auth/AuthGuard.test.tsx` - 4 tests for redirect logic
- `frontend/package.json` - 5 new dependencies
- `frontend/pnpm-lock.yaml` - Lock file update

## Decisions Made
- Used `import { z } from "zod"` (default import for zod 4.x) instead of `"zod/v4"` subpath since @hookform/resolvers auto-detects zod version
- Made auth layout a client component ("use client") since it wraps AuthGuard, LanguageSwitcher, and Toaster which all require client-side rendering
- AuthDoodles uses full-screen scatter (4 quadrants + center) rather than centered placement, matching CONTEXT decision for "scattered across full-screen background"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed lint warnings in AuthGuard test**
- **Found during:** Task 2 (lint verification)
- **Issue:** Unused `act` import and `hydrationCallback` variable triggered @typescript-eslint/no-unused-vars warnings
- **Fix:** Removed unused `act` import, removed unnecessary `hydrationCallback` tracking variable from mock
- **Files modified:** frontend/__tests__/auth/AuthGuard.test.tsx
- **Verification:** `pnpm lint` passes with zero warnings
- **Committed in:** 55c32f9 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All auth infrastructure is ready for Plan 02 (form components and animations)
- Validation schemas, AuthGuard, AuthDoodles, LanguageSwitcher, and i18n translations are all in place
- Plan 02 can focus purely on LoginForm, RegisterForm, PasswordStrengthMeter, SuccessOverlay, AuthPage, BrandPanel, and AuthFormCard components

## Self-Check: PASSED

All 7 created files verified present. All 3 commits (413b75b, b27426a, 55c32f9) verified in git log.

---
*Phase: 03-auth-page*
*Completed: 2026-03-21*
