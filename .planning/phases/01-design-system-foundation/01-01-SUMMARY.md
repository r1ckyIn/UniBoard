---
phase: 01-design-system-foundation
plan: 01
subsystem: ui
tags: [next.js, tailwind-v4, next-intl, i18n, vitest, roughjs, paper-texture]

# Dependency graph
requires: []
provides:
  - "Next.js 15 project scaffold with Tailwind v4 @theme color system"
  - "Paper texture background (grain + ruled lines)"
  - "Source Serif 4 + Inter fonts via next/font"
  - "next-intl v4 i18n routing (EN/ZH) with middleware"
  - "Vitest test framework with jsdom"
  - "cn() utility for conditional class merging"
  - "Message key parity test ensuring translation consistency"
affects: [01-02, all-page-phases]

# Tech tracking
tech-stack:
  added: [next@15.5.14, tailwindcss@4.2.2, next-intl@4.8.3, roughjs@4.6.6, rough-notation@0.5.1, react-rough-notation@1.0.8, lucide-react, clsx, "@tanstack/react-query", zustand, ky, date-fns, vitest@4.1.0, "@vitejs/plugin-react", "@testing-library/react", "@testing-library/jest-dom", jsdom]
  patterns: [tailwind-v4-css-theme, next-font-css-variables, next-intl-app-router, vitest-jsdom-setup]

key-files:
  created:
    - frontend/app/globals.css
    - frontend/app/layout.tsx
    - frontend/app/[locale]/layout.tsx
    - frontend/app/[locale]/page.tsx
    - frontend/app/[locale]/not-found.tsx
    - frontend/middleware.ts
    - frontend/lib/i18n/routing.ts
    - frontend/lib/i18n/request.ts
    - frontend/lib/i18n/navigation.ts
    - frontend/lib/utils/cn.ts
    - frontend/messages/en.json
    - frontend/messages/zh.json
    - frontend/vitest.config.ts
    - frontend/src/test/setup.ts
    - frontend/__tests__/i18n/message-keys.test.ts
  modified:
    - frontend/package.json
    - frontend/next.config.ts

key-decisions:
  - "Used hasLocale() from next-intl instead of manual includes() for locale validation"
  - "Created i18n files in Task 1 to unblock next-intl plugin in next.config.ts (build dependency)"
  - "Kept Root layout minimal (fonts + CSS only); locale layout handles NextIntlClientProvider"
  - "ResizeObserver polyfill added to test setup for future Rough.js component tests"

patterns-established:
  - "Tailwind v4 @theme: all design tokens defined in globals.css @theme block, generating utility classes automatically"
  - "@theme inline: font families reference next/font CSS variables via var(--font-inter)"
  - "i18n routing: [locale] segment + middleware + setRequestLocale in every page/layout"
  - "Test setup: vitest with jsdom, @testing-library/jest-dom matchers, ResizeObserver polyfill"

requirements-completed: [INFRA-10]

# Metrics
duration: 8min
completed: 2026-03-20
---

# Phase 01 Plan 01: Project Scaffold & i18n Summary

**Next.js 15.5.14 scaffold with Tailwind v4 @theme color system, paper texture background, Source Serif 4 + Inter fonts, next-intl v4 i18n routing (EN/ZH), and Vitest test framework**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-20T08:49:16Z
- **Completed:** 2026-03-20T08:57:50Z
- **Tasks:** 3
- **Files modified:** 21 (created/modified; 80+ old files deleted)

## Accomplishments
- Fresh Next.js 15 project with complete Tailwind v4 @theme: 12 accent colors, 9 neutrals, 3 shadows, 2 radii, 5 animations, 10 stagger delay classes
- Paper texture grain overlay (body::before with SVG fractalNoise) and ruled lines background (body::after)
- next-intl v4 i18n routing: middleware, locale detection, EN/ZH translations for nav/header/common keys
- Vitest + testing-library configured with 3 passing i18n parity tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 15 project** - `7284b08` (feat)
2. **Task 2: Set up next-intl v4 i18n routing** - `6adf2b7` (feat)
3. **Task 3: Create i18n message key parity test** - `a160646` (test)

## Files Created/Modified
- `frontend/app/globals.css` - Complete Tailwind v4 @theme color system, paper texture, animations, scrollbar
- `frontend/app/layout.tsx` - Root layout with Source Serif 4 + Inter fonts via next/font
- `frontend/app/[locale]/layout.tsx` - Locale layout with NextIntlClientProvider
- `frontend/app/[locale]/page.tsx` - Translated homepage
- `frontend/app/[locale]/not-found.tsx` - Locale-specific 404
- `frontend/middleware.ts` - next-intl locale routing middleware
- `frontend/lib/i18n/routing.ts` - defineRouting config (en/zh)
- `frontend/lib/i18n/request.ts` - getRequestConfig with message loading
- `frontend/lib/i18n/navigation.ts` - Locale-aware Link, useRouter, usePathname
- `frontend/lib/utils/cn.ts` - clsx wrapper for conditional class merging
- `frontend/messages/en.json` - English translations (nav, header, common)
- `frontend/messages/zh.json` - Chinese translations (nav, header, common)
- `frontend/vitest.config.ts` - Vitest with jsdom, path aliases
- `frontend/src/test/setup.ts` - jest-dom matchers + ResizeObserver polyfill
- `frontend/__tests__/i18n/message-keys.test.ts` - Key parity and empty value tests
- `frontend/next.config.ts` - next-intl plugin integration
- `frontend/package.json` - All dependencies + test/typecheck/lint scripts

## Decisions Made
- Used `hasLocale()` from next-intl for locale validation instead of manual `includes()` cast
- Created i18n infrastructure files (routing.ts, request.ts, messages) in Task 1 because next-intl plugin in next.config.ts requires them at build time
- Root layout only handles fonts and CSS; locale layout wraps children with NextIntlClientProvider (no html/body tags in locale layout)
- Added ResizeObserver polyfill to test setup proactively for future Rough.js component tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created i18n files early to unblock build**
- **Found during:** Task 1 (Step 10: next.config.ts configured next-intl plugin)
- **Issue:** next-intl plugin references `./lib/i18n/request.ts` which imports routing.ts and messages -- build fails without them
- **Fix:** Created routing.ts, request.ts, en.json, zh.json as part of Task 1 instead of Task 2
- **Files modified:** frontend/lib/i18n/routing.ts, frontend/lib/i18n/request.ts, frontend/messages/en.json, frontend/messages/zh.json
- **Verification:** `pnpm build` exits 0
- **Committed in:** 7284b08 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for build to pass. Task 2 verified and committed the remaining i18n files (navigation.ts, middleware.ts, locale layouts/pages). No scope creep.

## Issues Encountered
None -- all builds, tests, lint, and typecheck passed on first attempt.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- Next.js 15 scaffold complete and building cleanly
- All design tokens available as Tailwind utility classes (bg-orange, text-text-1, shadow-card, rounded-card)
- i18n infrastructure ready -- Plan 01-02 can build design system components (RoughCard, AppShell, etc.)
- Vitest configured -- Plan 01-02 can add component tests immediately

## Self-Check: PASSED

All 18 key files verified present. All 3 task commits verified in git log.

---
*Phase: 01-design-system-foundation*
*Completed: 2026-03-20*
