---
phase: 33-token-lifecycle-onboarding
plan: 06
subsystem: auth
tags: [next-intl, react-hook-form, sonner, vitest, supabase-auth, password-reset]

requires:
  - phase: 32-production-email
    provides: ForgotPasswordForm (success state + useResetPassword hook)
provides:
  - Resend password-reset button with 60s client-side cooldown on ForgotPasswordForm success state
  - Bilingual i18n keys (en/zh) for resend label, cooldown, success toast, failure toast
  - Vitest coverage for all 6 resend/cooldown behaviors (fake-timer driven)
affects: [35-push-notifications, future-auth-phases]

tech-stack:
  added: []
  patterns:
    - "Client-side cooldown: cooldownEnd timestamp + setInterval ticker for countdown labels (Supabase enforces server-side rate-limit separately)"
    - "Failed mutation does NOT restart cooldown (enables immediate retry)"
    - "Fake-timer tests install vi.useFakeTimers() BEFORE render + use fireEvent (not userEvent) to avoid wall-clock delays fighting react-hook-form"

key-files:
  created: []
  modified:
    - frontend/components/auth/ForgotPasswordForm.tsx
    - frontend/messages/en.json
    - frontend/messages/zh.json
    - frontend/__tests__/auth/ForgotPasswordForm.test.tsx

key-decisions:
  - "Persist submitted email in component state (submittedEmail) so resend reuses it without re-prompting"
  - "Start cooldown immediately on initial success (not only on resend) to prevent rapid-fire initial submissions"
  - "Use toast error message from Error.message when available; fallback to i18n resendFailed string"
  - "Failure path does NOT restart cooldown — UX tradeoff favoring immediate retry on transient errors"

patterns-established:
  - "useEffect setInterval only starts when cooldownEnd is non-null; cleanup via return () => clearInterval(id)"
  - "Test helper installs fake timers before render; uses fireEvent.change + fireEvent.click wrapped in act() with microtask flushes for react-hook-form resolver"

requirements-completed: [AUTH-HARDEN-03]

duration: 7min
completed: 2026-04-15
---

# Phase 33 Plan 06: Password Reset Resend + Cooldown Summary

**Resend email button with 60s client-side cooldown on ForgotPasswordForm success state, backed by sonner toasts and fake-timer vitest coverage.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-15T07:33:00Z
- **Completed:** 2026-04-15T07:42:00Z
- **Tasks:** 1 (TDD: RED → GREEN)
- **Files modified:** 4

## Accomplishments

- Users who lose a password-reset email (e.g., Mimecast quarantine) can now resend from the same success-state UI without re-entering their email
- 60s cooldown provides client-side UX throttling; server-side rate limiting (Supabase `max_frequency = "1s"`) remains untouched
- Failed resend keeps the button enabled for immediate retry — transient errors don't penalize the user
- 6 new vitest tests pin the behavior: initial cooldown start, 30s tick-down, enable-at-0, success restart, failure-no-restart, same-email reuse
- AUTH-HARDEN-03 closed: explicit recovery path exists for password-reset email delivery failures

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): failing tests for Resend + cooldown** - `41d7bed` (test)
2. **Task 1 (GREEN): Resend button + cooldown + i18n** - `cb2f5a9` (feat)

## Files Created/Modified

- `frontend/components/auth/ForgotPasswordForm.tsx` — added cooldownEnd/tick state, setInterval ticker, submittedEmail state, handleResend callback, Resend button in success-state JSX
- `frontend/messages/en.json` — added 4 keys under `auth.forgotPassword`: `resend`, `resendCooldown`, `resendSuccess`, `resendFailed`
- `frontend/messages/zh.json` — parallel Chinese keys matching en.json structure
- `frontend/__tests__/auth/ForgotPasswordForm.test.tsx` — added sonner mock + 6 new tests under "Resend button with 60s cooldown" describe block; mock for `useTranslations` extended to interpolate `{seconds}` placeholder

## Decisions Made

- **Cooldown starts on initial reset success** (not only after first resend click). Prevents users from accidentally flooding their own inbox via rapid form re-submission.
- **Error toast prefers `err.message`** over generic i18n string — Supabase errors carry meaningful context (e.g. "For security purposes, you can only request this once every 60 seconds") that users benefit from seeing.
- **Cooldown kept client-only.** Server-side rate limit is Supabase's job; duplicating it in state would introduce drift and require a round-trip.
- **Test strategy: fireEvent over userEvent** once fake timers are installed. `user.type` with real-timer delays hangs forever under `vi.useFakeTimers()`; swapping to `fireEvent.change` + `fireEvent.click` + microtask flush for react-hook-form's async resolver keeps tests deterministic and fast.

## Deviations from Plan

None — plan executed exactly as written. One minor refinement on the test approach (fireEvent vs userEvent) noted in Decisions.

## Issues Encountered

- **Initial test hang under fake timers.** `userEvent.setup({ advanceTimers })` did not prevent `user.type` from hanging; switched to `fireEvent` which is synchronous and plays nicely with fake timers. Added `await Promise.resolve()` twice inside `act()` to flush react-hook-form's zodResolver microtasks. Resolved cleanly.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Resend UX is live; ForgotPasswordForm pattern (cooldown + toast + mutation hook) is reusable for any future "re-send X" flows (email verification, magic links, etc.).
- No blockers for remaining Phase 33 plans.

## Self-Check: PASSED

Verified artifacts:
- FOUND: frontend/components/auth/ForgotPasswordForm.tsx (imports `toast` from sonner, has `cooldownEnd` state + setInterval ticker, renders Resend button)
- FOUND: frontend/messages/en.json (contains `auth.forgotPassword.resend`, `resendCooldown`, `resendSuccess`, `resendFailed`)
- FOUND: frontend/messages/zh.json (parallel Chinese keys present)
- FOUND: frontend/__tests__/auth/ForgotPasswordForm.test.tsx (6 new tests in "Resend button with 60s cooldown" describe block, all passing)
- FOUND commit: 41d7bed (RED)
- FOUND commit: cb2f5a9 (GREEN)
- Verified: `pnpm vitest run __tests__/auth/ForgotPasswordForm.test.tsx` → 11/11 tests pass
- Verified: `pnpm typecheck` → 0 errors
- Verified: `pnpm lint` → 0 warnings
- Verified: `pnpm build` → succeeds

---
*Phase: 33-token-lifecycle-onboarding*
*Completed: 2026-04-15*
