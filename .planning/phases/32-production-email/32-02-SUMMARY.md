---
phase: 32-production-email
plan: 02
subsystem: frontend-auth
tags: [auth, email-confirmation, password-reset, i18n]
dependency_graph:
  requires: [32-01]
  provides: [forgot-password-flow, update-password-flow, email-confirmation-ui]
  affects: [RegisterForm, LoginForm, AuthFormCard, AuthPage, use-auth.ts]
tech_stack:
  added: []
  patterns: [4-mode-auth-routing, check-email-state-pattern]
key_files:
  created:
    - frontend/components/auth/ForgotPasswordForm.tsx
    - frontend/components/auth/UpdatePasswordForm.tsx
    - frontend/__tests__/auth/ForgotPasswordForm.test.tsx
    - frontend/__tests__/auth/UpdatePasswordForm.test.tsx
  modified:
    - frontend/hooks/use-auth.ts
    - frontend/components/auth/RegisterForm.tsx
    - frontend/components/auth/LoginForm.tsx
    - frontend/components/auth/AuthFormCard.tsx
    - frontend/components/auth/AuthPage.tsx
    - frontend/messages/en.json
    - frontend/messages/zh.json
    - frontend/__tests__/auth/RegisterForm.test.tsx
    - frontend/__tests__/auth/LoginForm.test.tsx
    - frontend/__tests__/auth/AuthFormCard.test.tsx
decisions:
  - "RegisterForm handles its own check-email success state internally via emailSent useState, removing need for SuccessOverlay in AuthPage"
  - "AuthPage supports 4 modes via URL search params: login, register, forgot-password, reset-password"
  - "ForgotPasswordForm uses inline zod schema for email-only validation (reuses same USYD domain check)"
  - "UpdatePasswordForm uses PasswordStrengthMeter from existing component for visual password feedback"
metrics:
  duration: 11min
  completed: 2026-04-13
---

# Phase 32 Plan 02: Frontend Auth Flow for Email Confirmation & Password Reset Summary

Complete auth UI flow: ForgotPasswordForm + UpdatePasswordForm components, RegisterForm check-email state, 4-mode AuthPage routing, 2 new Supabase auth hooks, i18n for both locales

## What Was Done

### Task 1: Add auth hooks and create ForgotPasswordForm + UpdatePasswordForm (TDD)
- **Commit:** e66b4a6
- Added `useResetPassword` hook (calls `supabase.auth.resetPasswordForEmail`)
- Added `useUpdatePassword` hook (calls `supabase.auth.updateUser`)
- Created `ForgotPasswordForm` with email validation, loading state, and success UI (Mail icon + "Check your email" message)
- Created `UpdatePasswordForm` with password + confirm fields, PasswordStrengthMeter, eye toggle, and success UI (Check icon + "Password updated!")
- 10 tests: 5 for ForgotPasswordForm, 5 for UpdatePasswordForm

### Task 2: Update RegisterForm, LoginForm, AuthFormCard, AuthPage + i18n
- **Commit:** c000b50
- RegisterForm: added `emailSent` state, shows "Check your email" UI on success instead of calling `onRegisterSuccess`
- LoginForm: added `onSwitchToForgotPassword` prop, replaced demo toast with real navigation
- AuthFormCard: extended to 4 modes with ForgotPasswordForm and UpdatePasswordForm routing
- AuthPage: removed SuccessOverlay, added 4-mode URL param handling, added confirmation_failed error toast
- i18n: added `forgotPassword`, `updatePassword`, `checkEmail` sections in both en.json and zh.json
- Removed deprecated `forgotPasswordDemo` and `forgotPasswordDemoDesc` keys
- Updated RegisterForm, LoginForm, and AuthFormCard tests to match new interfaces

## Verification Results

- All auth tests pass: 63/63 across 10 test files
- TypeScript: zero errors (`npx tsc --noEmit`)
- 5 pre-existing test failures in unrelated files (CourseDetailPage, DeadlineCard, DeadlinesPage, AppShell, SetupGuard) -- not caused by this plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed AuthFormCard.test.tsx type error**
- **Found during:** Task 2
- **Issue:** AuthFormCard test still passed `onRegisterSuccess` prop which was removed from the interface
- **Fix:** Removed the prop from all test renders, added mocks for new auth hooks
- **Files modified:** `frontend/__tests__/auth/AuthFormCard.test.tsx`
- **Commit:** c000b50

**2. [Rule 1 - Bug] Fixed ForgotPasswordForm test type error**
- **Found during:** Task 1 verification
- **Issue:** TypeScript error assigning `Error` to `null` typed mock field
- **Fix:** Typed `error` field as `Error | null`
- **Files modified:** `frontend/__tests__/auth/ForgotPasswordForm.test.tsx`
- **Commit:** c000b50

## Known Stubs

None -- all components are fully wired to Supabase auth hooks.

## Self-Check: PASSED

All 6 key files verified present. Both commits (e66b4a6, c000b50) verified in git log.
