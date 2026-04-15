---
phase: 33-token-lifecycle-onboarding
plan: 05
subsystem: frontend-auth
tags: [auth, oauth, google, usyd-banner, i18n]
requirements: [AUTH-HARDEN-01, AUTH-HARDEN-02]
dependency_graph:
  requires:
    - "33-04 (auth/callback route handler + Supabase Google provider config)"
    - "Plan 32 auth UI (LoginForm, RegisterForm, AuthPage)"
  provides:
    - "useGoogleLogin hook (supabase.auth.signInWithOAuth wrapper)"
    - "UsydBanner component (dismissible 30-day re-show)"
    - "Google OAuth UI on LoginForm + RegisterForm"
    - "Corrected post-register 'Account created — sign in now' copy"
  affects:
    - "frontend/components/auth/AuthFormCard (via Login/RegisterForm exposing new button)"
tech_stack:
  added: []
  patterns:
    - "Client-only component with 'use client' directive for localStorage access (UsydBanner)"
    - "Inline SVG 4-color Google mark (no external image dep)"
    - "Scoped useTranslations namespace for reusable banner component"
key_files:
  created:
    - frontend/components/auth/UsydBanner.tsx
    - frontend/components/icons/GoogleIcon.tsx
    - frontend/__tests__/auth/UsydBanner.test.tsx
  modified:
    - frontend/hooks/use-auth.ts
    - frontend/components/auth/LoginForm.tsx
    - frontend/components/auth/RegisterForm.tsx
    - frontend/messages/en.json
    - frontend/messages/zh.json
    - frontend/__tests__/auth/LoginForm.test.tsx
    - frontend/__tests__/auth/RegisterForm.test.tsx
    - frontend/__tests__/auth/AuthFormCard.test.tsx
decisions:
  - "UsydBanner storageKey and reShowAfterDays are props (with sensible defaults) — allows per-page customization without global config"
  - "Inline SVG Google 'G' mark in a dedicated components/icons/GoogleIcon.tsx — no next/image, no external asset, SSR-safe"
  - "checkEmail.goToLogin is a primary-style button (not a text link) — registration is a conversion funnel step and users need a clear CTA"
  - "auth.checkEmail.backToLogin kept for backward-compat even though unused by RegisterForm — ForgotPasswordForm still references it"
  - "AuthFormCard test mock upgrade (added useGoogleLogin, sonner.error) treated as in-scope fix (Rule 3 blocking issue) since it's directly caused by LoginForm/RegisterForm imports added in this plan"
metrics:
  duration_min: 9
  tasks_completed: 3
  files_created: 3
  files_modified: 8
  tests_added: 5  # UsydBanner (5) + 3 LoginForm + 3 RegisterForm (reused slot for check-email) = 11 new test cases; UsydBanner file is 5
  completed_date: 2026-04-15
---

# Phase 33 Plan 05: Visible Auth-Hardening UI (Google Button + USYD Banner) Summary

**One-liner:** Added `Continue with Google` button + `or` divider to both LoginForm and RegisterForm, a dismissible USYD-specific info banner on RegisterForm (30-day localStorage re-show), and replaced the no-longer-accurate "Check your email" copy with "Account created — sign in now" + a "Go to sign in" CTA (email confirmation is permanently OFF per Plan 33-08).

## What shipped

### `useGoogleLogin` hook (`frontend/hooks/use-auth.ts`)

TanStack Query mutation wrapping `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <origin>/auth/callback } })`. Throws on error (caught by mutation's `error` state; consumers subscribe via `useEffect` to show toast).

### `UsydBanner` component (`frontend/components/auth/UsydBanner.tsx`)

- Client component (`"use client"`) — uses `localStorage`.
- Reads `uniboard.banner.usydRegister` key on mount; renders banner when absent, malformed, or older than `reShowAfterDays` (default 30).
- Dismiss button writes current `new Date().toISOString()` and hides banner immediately.
- Scoped `useTranslations("auth.usydBanner")` for i18n.
- Brand-orange tinted styling (`bg-[rgba(217,119,87,0.06)]` + matching border).

### `GoogleIcon` component (`frontend/components/icons/GoogleIcon.tsx`)

Pure SVG 4-color Google "G" mark. No external asset, SSR-safe.

### LoginForm UI (`frontend/components/auth/LoginForm.tsx`)

- Google button rendered *above* the form (not inside), then `or` divider, then email/password form.
- Google error state subscribed via `useEffect` → `toast.error(t("auth.google.errorGeneric"))`.

### RegisterForm UI (`frontend/components/auth/RegisterForm.tsx`)

- `<UsydBanner />` above Google button (banner appears even before form title's whitespace).
- Google button + `or` divider identical to LoginForm.
- Post-submit state replaced: `Mail` icon → `CheckCircle`; title "Account created — sign in now"; description explains email confirmation is disabled; primary CTA "Go to sign in" (fills full button style, not a text link).
- Removed all "we've sent a confirmation link" verbiage.

### i18n

- `auth.google.{continueWith,or,errorGeneric}` (en + zh)
- `auth.usydBanner.{body,dismiss}` (en + zh)
- `auth.checkEmail.title` replaced with "Account created — sign in now" / "账户已创建 — 立即登录"
- `auth.checkEmail.description` replaced with "Email confirmation is disabled…" / "邮箱确认已关闭…"
- `auth.checkEmail.goToLogin` added ("Go to sign in" / "前往登录")
- `auth.checkEmail.backToLogin` preserved (ForgotPasswordForm still uses it)

## Tests

| File                             | New tests | Covers                                                                           |
| -------------------------------- | --------- | -------------------------------------------------------------------------------- |
| `UsydBanner.test.tsx`            | 5         | Render when storage absent; render when >30d; hide when <30d; dismiss writes ISO; DOM removed on dismiss |
| `LoginForm.test.tsx`             | +3        | Google button renders; "or" divider renders; click triggers `googleLogin.mutate` |
| `RegisterForm.test.tsx`          | +3 (incl. updated check-email test) | Google button; USYD banner; Go-to-login CTA click; no leaked "confirmation link" copy |
| `AuthFormCard.test.tsx`          | (mocks fixed) | Added `useGoogleLogin` to hooks mock, sonner `.error` subkey, `auth.usydBanner` i18n namespace |

**Result:** `pnpm vitest run __tests__/auth/` — **90/90 passing**.

## Verification evidence

- `pnpm vitest run __tests__/auth/` → 13 files, 90 tests, all pass
- `pnpm typecheck` → exit 0
- `pnpm build` → clean (`/auth/callback`, `/en/auth`, `/zh/auth` routes all render)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking Issue] AuthFormCard test missing `useGoogleLogin` mock**

- **Found during:** Overall verification (after Task 3 commit)
- **Issue:** `AuthFormCard.test.tsx` mocks `@/hooks/use-auth` but did not export `useGoogleLogin`. Since LoginForm and RegisterForm (both rendered by AuthFormCard) now import `useGoogleLogin`, AuthFormCard tests failed with "No 'useGoogleLogin' export is defined on the '@/hooks/use-auth' mock".
- **Fix:** Added `useGoogleLogin` mock alongside existing hooks. Also expanded `sonner` mock to include `error/success/info` (required by Google error toast). Taught next-intl mock about the `auth.usydBanner` namespace (rendered inside RegisterForm).
- **Files modified:** `frontend/__tests__/auth/AuthFormCard.test.tsx`
- **Commit:** `a79e8a9`

**2. [Rule 2 — Robustness] `auth.checkEmail.backToLogin` key preserved**

- **Plan said:** Replace `auth.checkEmail` block entirely
- **Found:** `ForgotPasswordForm.tsx` (from Phase 32) also references `auth.checkEmail.backToLogin`. Removing it would break that form.
- **Fix:** Kept `backToLogin` key alongside new `goToLogin` key. RegisterForm uses the new `goToLogin`; ForgotPasswordForm continues using `backToLogin`.

## Out-of-scope (deferred)

Logged to `.planning/phases/33-token-lifecycle-onboarding/deferred-items.md`:

1. **Lint warnings in `frontend/__tests__/auth/callback-route.test.ts`** — 4 `no-unused-vars` warnings introduced by Plan 33-04 (commit 82db052). Not caused by this plan; `pnpm lint` exits non-zero because of `--max-warnings 0`. Must be fixed before merging the Phase 33 branch.
2. **Pre-existing test failures in `__tests__/setup/SetupGuard.test.tsx`** — "No intl context found" (missing NextIntlClientProvider in test setup). Pre-dates Plan 33-05.

## Known Stubs

None. The Google button compiles and renders correctly; end-to-end OAuth flow depends on user completing Google Cloud Console + Supabase Dashboard provisioning (tracked separately per `<dependency_notes>`). The button is NOT hidden or disabled — the plan explicitly says "Write the code as if the OAuth provider is live". Once provisioning lands, the button works without any code changes.

## Commits

| Task | Hash      | Message                                                                                       |
| ---- | --------- | --------------------------------------------------------------------------------------------- |
| 1    | `7198df0` | `feat(33-05): add useGoogleLogin hook + UsydBanner + i18n strings`                            |
| 2    | `6252520` | `feat(33-05): add Google OAuth button + 'or' divider to LoginForm`                            |
| 3    | `2bb416f` | `feat(33-05): add Google button + USYD banner + corrected check-email copy to RegisterForm`   |
| Fix  | `a79e8a9` | `fix(33-05): update AuthFormCard test mocks for useGoogleLogin + sonner.error`                |

## Self-Check: PASSED

All 7 created/modified files confirmed on disk. All 4 commits (7198df0, 6252520, 2bb416f, a79e8a9) confirmed in git log.
