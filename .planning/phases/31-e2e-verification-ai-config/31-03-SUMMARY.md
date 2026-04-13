---
phase: 31
plan: 3
title: "Fix auth navigation race condition & history stack leaks"
status: complete
started: 2026-04-13T13:00:00Z
completed: 2026-04-13T13:10:00Z
---

# Plan 31-03 Summary

## What was built

Fixed two UAT-reported auth navigation bugs:

1. **AuthGuard race condition** — Removed reactive Effect 3 that watched `isAuthenticated` and redirected with stale `tokenConfigured=false` before LoginForm could check the backend. Redirect now only happens inside the session-check effect after `restoreTokenConfiguredIfNeeded()` completes.

2. **Logout history stack leak** — Switched Header logout from `router.push` to `router.replace` + `useLogout` hook (which also clears QueryClient). SuccessStep and LoginForm also use `router.replace` to prevent /auth and /setup from staying in history.

## Key files

| File | Change |
|------|--------|
| `frontend/components/auth/AuthGuard.tsx` | Removed reactive redirect effect; consolidated into session-check |
| `frontend/components/auth/LoginForm.tsx` | `router.push` → `router.replace` |
| `frontend/components/layout/Header.tsx` | Inline signOut → `useLogout` hook + `router.replace` |
| `frontend/components/setup/SuccessStep.tsx` | `router.push` → `router.replace` |
| `frontend/__tests__/auth/AuthGuard.test.tsx` | Rewritten for session-check redirect behavior (6 tests) |
| `frontend/__tests__/auth/LoginForm.test.tsx` | Added `useLocale` mock |
| `frontend/__tests__/auth/AuthFormCard.test.tsx` | Added `useLocale` mock |

## Verification

- `pnpm vitest run __tests__/auth/` — 53/53 tests pass (8 files)
- `pnpm tsc --noEmit` — zero errors
- `pnpm lint --max-warnings 0` — zero warnings

## Deviations

- Fixed pre-existing `useLocale` mock gaps in `LoginForm.test.tsx` and `AuthFormCard.test.tsx` (these tests were already broken before our changes, but the missing mock was exposed when running the full auth suite).
