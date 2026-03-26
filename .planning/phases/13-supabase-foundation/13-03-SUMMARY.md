---
phase: 13-supabase-foundation
plan: 03
subsystem: auth
tags: [supabase, supabase-ssr, auth, zustand, next-intl, middleware, react-query]

# Dependency graph
requires:
  - phase: 13-01
    provides: Supabase CLI, local dev environment, migration schema with auth.users
provides:
  - Supabase browser/server/proxy client modules (@supabase/ssr)
  - AuthProvider with onAuthStateChange syncing to zustand store
  - Auth hooks (useLogin, useRegister, useLogout) using supabase-js
  - Chained middleware (Supabase session refresh + next-intl)
  - 6 behavioral tests for auth hooks
affects: [14-python-backend, 15-data-integration, frontend-auth]

# Tech tracking
tech-stack:
  added: ["@supabase/ssr ^0.9.0", "@supabase/supabase-js ^2.100.0"]
  patterns: ["bridge pattern: Supabase SDK -> onAuthStateChange -> zustand -> ky client", "chained middleware: updateSession then intlMiddleware with cookie merge"]

key-files:
  created:
    - frontend/lib/supabase/client.ts
    - frontend/lib/supabase/server.ts
    - frontend/lib/supabase/proxy.ts
    - frontend/components/auth/AuthProvider.tsx
    - frontend/.env.example
    - frontend/__tests__/hooks/use-auth.test.ts
  modified:
    - frontend/hooks/use-auth.ts
    - frontend/middleware.ts
    - frontend/components/auth/AuthGuard.tsx
    - frontend/components/auth/LoginForm.tsx
    - frontend/components/auth/RegisterForm.tsx
    - frontend/components/layout/Header.tsx
    - frontend/hooks/use-user.ts
    - frontend/app/[locale]/layout.tsx

key-decisions:
  - "Bridge pattern preserves all 26 data hooks unchanged -- only auth mutation source replaced"
  - "No setTimeout for onAuthStateChange race condition -- fires synchronously during signInWithPassword"
  - "Supabase getUser() in proxy instead of getClaims() for session validation"
  - "Header logout calls supabase.auth.signOut() instead of clearAuth() to properly invalidate Supabase session"

patterns-established:
  - "Bridge pattern: supabase-js auth -> onAuthStateChange -> zustand setAuth -> ky reads accessToken"
  - "Chained middleware: updateSession (Supabase cookies) then intlMiddleware, merge cookies into response"
  - "AuthProvider at root layout inside QueryProvider for early onAuthStateChange subscription"

requirements-completed: [INFRA-08]

# Metrics
duration: 11min
completed: 2026-03-26
---

# Phase 13 Plan 03: Frontend Auth Migration Summary

**Supabase Auth integration via bridge pattern -- supabase-js handles auth, onAuthStateChange syncs to zustand, all 26 data hooks unchanged**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-26T03:09:10Z
- **Completed:** 2026-03-26T03:20:36Z
- **Tasks:** 4
- **Files modified:** 14

## Accomplishments
- Installed @supabase/ssr and @supabase/supabase-js, created browser/server/proxy client modules
- Implemented bridge pattern: AuthProvider syncs Supabase session to zustand store via onAuthStateChange
- Rewrote useLogin/useRegister/useLogout to call supabase-js instead of mock API; removed useRefreshToken
- Chained middleware: Supabase session refresh runs before next-intl with cookie merge
- 6 mock auth Route Handlers deleted; 11 data mock handlers preserved
- All 305 tests pass across 42 test files (6 new + 2 updated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Supabase packages and create client modules** - `f2e7dae` (feat)
2. **Task 2: Implement bridge pattern -- AuthProvider, auth hooks rewrite** - `cce5765` (feat)
3. **Task 3: Update auth components, chain middleware, delete mock auth handlers** - `4375cf2` (feat)
4. **Task 4: Create behavioral tests for frontend auth hooks** - `d303533` (test)

## Files Created/Modified
- `frontend/lib/supabase/client.ts` - Browser client singleton (createBrowserClient)
- `frontend/lib/supabase/server.ts` - Server client for SSR with cookie handling
- `frontend/lib/supabase/proxy.ts` - Middleware session refresh (updateSession)
- `frontend/components/auth/AuthProvider.tsx` - onAuthStateChange listener syncing to zustand
- `frontend/hooks/use-auth.ts` - Rewritten: useLogin/useRegister/useLogout via supabase-js
- `frontend/middleware.ts` - Chained: Supabase updateSession then next-intl createMiddleware
- `frontend/components/auth/AuthGuard.tsx` - Added Supabase getSession check for page refresh
- `frontend/components/auth/LoginForm.tsx` - Updated comment for onSuccess flow
- `frontend/components/auth/RegisterForm.tsx` - Removed nested loginMutation (Supabase auto-confirms)
- `frontend/components/layout/Header.tsx` - Logout calls supabase.auth.signOut()
- `frontend/hooks/use-user.ts` - useDeleteAccount calls signOut after account deletion
- `frontend/app/[locale]/layout.tsx` - AuthProvider added inside QueryProvider
- `frontend/.env.example` - Supabase env var template
- `frontend/__tests__/hooks/use-auth.test.ts` - 6 behavioral tests for auth hooks

## Decisions Made
- Bridge pattern preserves all 26 data hooks unchanged -- only auth mutation source replaced
- No setTimeout for onAuthStateChange race condition -- Supabase fires synchronously during signInWithPassword so zustand is updated before mutation onSuccess
- Used `getUser()` in proxy instead of `getClaims()` for session validation (standard Supabase pattern)
- Header logout and useDeleteAccount both call supabase.auth.signOut() to properly invalidate Supabase session cookies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed logout paths to call supabase.auth.signOut()**
- **Found during:** Task 3 (auth component updates)
- **Issue:** Header.tsx and useDeleteAccount called clearAuth() directly without signing out from Supabase, leaving stale cookies
- **Fix:** Header logout calls supabase.auth.signOut() then router.push; useDeleteAccount calls signOut after API delete
- **Files modified:** frontend/components/layout/Header.tsx, frontend/hooks/use-user.ts
- **Verification:** TypeCheck passes, builds successfully
- **Committed in:** 4375cf2 (Task 3 commit)

**2. [Rule 1 - Bug] Updated existing AuthGuard and RegisterForm tests for Supabase changes**
- **Found during:** Task 4 (behavioral tests)
- **Issue:** AuthGuard test lacked Supabase client mock; RegisterForm test expected old nested login pattern
- **Fix:** Added supabase client mock to AuthGuard test; removed loginMutation expectation from RegisterForm test
- **Files modified:** frontend/__tests__/auth/AuthGuard.test.tsx, frontend/__tests__/auth/RegisterForm.test.tsx
- **Verification:** All 305 tests pass
- **Committed in:** d303533 (Task 4 commit)

**3. [Rule 3 - Blocking] Added .env.example exception to .gitignore**
- **Found during:** Task 1 (env file creation)
- **Issue:** .gitignore pattern `.env*` blocked committing `.env.example`
- **Fix:** Added `!.env.example` exception to .gitignore
- **Files modified:** frontend/.gitignore
- **Verification:** git add succeeds
- **Committed in:** f2e7dae (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 1 bug, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and completeness. No scope creep.

## Issues Encountered
- Auth mock Route Handlers were already deleted in 13-02 commit (f6cec72); git rm in Task 3 was redundant but harmless
- Pre-existing TypeScript error in CourseCard.test.tsx (missing `beforeEach` global) unrelated to plan changes

## User Setup Required
None - local Supabase is already running from Plan 01. `.env.local` created with local Supabase keys.

## Next Phase Readiness
- Frontend auth fully migrated to Supabase Auth via bridge pattern
- All 26 data hooks unchanged and working via mock Route Handlers
- Ready for Phase 14 (Python backend adaptation) and Phase 15 (data integration)
- Mock Route Handlers can be replaced one-by-one in future phases

---
*Phase: 13-supabase-foundation*
*Completed: 2026-03-26*
