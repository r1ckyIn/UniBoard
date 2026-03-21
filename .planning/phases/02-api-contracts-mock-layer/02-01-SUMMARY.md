---
phase: 02-api-contracts-mock-layer
plan: 01
subsystem: api
tags: [openapi, typescript, ky, zustand, tanstack-query, codegen]

requires:
  - phase: 01-shell-layout-i18n
    provides: Next.js app shell with locale layout, vitest config, package.json with ky/zustand/tanstack-query installed
provides:
  - OpenAPI 3.1 YAML spec covering all 32 TRD section 12 endpoints
  - Auto-generated TypeScript types from OpenAPI spec (types.gen.d.ts)
  - ky HTTP client with auth token injection and 401 handling
  - Zustand auth store with persist middleware
  - QueryProvider wired into locale layout
  - Wave 0 tests for client and auth store
affects: [02-02, 02-03, 02-04, 02-05, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12]

tech-stack:
  added: [openapi-typescript 7.13.0, "@tanstack/react-query-devtools 5.91.3"]
  patterns: [openapi-typescript codegen, ky beforeRequest/afterResponse hooks, zustand persist middleware, vi.hoisted() for mock factories]

key-files:
  created:
    - frontend/openapi/openapi.yaml
    - frontend/lib/api/types.gen.d.ts
    - frontend/lib/api/client.ts
    - frontend/lib/auth/store.ts
    - frontend/lib/query/client.tsx
    - frontend/__tests__/api/client.test.ts
    - frontend/__tests__/auth/store.test.ts
  modified:
    - frontend/package.json
    - frontend/app/[locale]/layout.tsx

key-decisions:
  - "Single YAML spec over split-by-domain: ~32 endpoints fits comfortably in one file"
  - "vi.hoisted() pattern for ky mock: resolves let-before-init issues with vi.mock factory hoisting"

patterns-established:
  - "OpenAPI codegen: openapi-typescript generates types.gen.d.ts from openapi.yaml via pnpm generate:types"
  - "ky auth injection: useAuthStore.getState().accessToken inside beforeRequest hook (not closure capture)"
  - "QueryProvider placement: inside NextIntlClientProvider in locale layout"
  - "Zustand persist key: uniboard-auth in localStorage"

requirements-completed: [INFRA-11]

duration: 7min
completed: 2026-03-21
---

# Phase 02 Plan 01: API Contracts & Foundation Summary

**OpenAPI 3.1 spec with 32 endpoints, auto-generated TypeScript types, ky client with auth injection, zustand auth store with persist, and QueryProvider in locale layout**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-21T01:33:33Z
- **Completed:** 2026-03-21T01:41:02Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Complete OpenAPI 3.1 YAML spec covering all 32 TRD section 12 endpoints (auth, users, courses, grades, materials, discussions, deadlines, GPA, digest, alerts, notifications, sync, search, health)
- TypeScript types auto-generated via openapi-typescript v7.13.0 with regeneration scripts
- ky HTTP client configured with /api/v1 prefix, auth token injection from zustand, 401 auto-logout, and retry logic
- Zustand auth store with persist middleware storing accessToken, refreshToken, user, isAuthenticated, tokenConfigured
- QueryProvider (client component) wrapping locale layout children with ReactQueryDevtools
- Wave 0 tests: 12 new tests (7 client + 5 store) covering auth injection, 401 handling, state management, persist key

## Task Commits

Each task was committed atomically:

1. **Task 1: Write OpenAPI 3.1 YAML spec and generate TypeScript types** - `3ca5932` (feat)
2. **Task 2: Configure ky HTTP client, zustand auth store, and QueryProvider** - `1927645` (feat)
3. **Task 3: Create Wave 0 test files for ky client and auth store** - `d601d34` (test)

## Files Created/Modified
- `frontend/openapi/openapi.yaml` - Complete OpenAPI 3.1 spec (single source of truth for API types)
- `frontend/lib/api/types.gen.d.ts` - Auto-generated TypeScript types from spec
- `frontend/lib/api/client.ts` - ky instance with auth injection, 401 handling, retry config
- `frontend/lib/auth/store.ts` - Zustand auth store with persist middleware
- `frontend/lib/query/client.tsx` - QueryProvider client component with devtools
- `frontend/app/[locale]/layout.tsx` - Added QueryProvider wrapping children
- `frontend/package.json` - Added generate:types and check:types-api scripts, new devDependencies
- `frontend/__tests__/api/client.test.ts` - ky client unit tests
- `frontend/__tests__/auth/store.test.ts` - Auth store unit tests

## Decisions Made
- Used single YAML spec (not split-by-domain) since 32 endpoints fits comfortably in one file
- Used vi.hoisted() pattern to resolve let-before-init issues with Vitest mock factory hoisting when testing ky.create() config capture

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Vitest mock hoisting caused `ReferenceError: Cannot access 'capturedConfig' before initialization` when using `let` variable in mock factory. Resolved by using `vi.hoisted()` to create the capture variable before mock factory execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- OpenAPI spec ready for mock Route Handler implementation (Plans 02-04)
- types.gen.d.ts available for typed API responses in hooks (Plan 05)
- ky client and auth store ready for use by all downstream hooks
- QueryProvider in layout enables TanStack Query hooks in any page component

---
*Phase: 02-api-contracts-mock-layer*
*Completed: 2026-03-21*
