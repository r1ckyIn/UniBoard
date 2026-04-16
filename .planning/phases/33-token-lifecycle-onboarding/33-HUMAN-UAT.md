---
status: partial
phase: 33-token-lifecycle-onboarding
source: [33-VERIFICATION.md]
started: 2026-04-16T00:45:00Z
updated: 2026-04-16T00:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Google OAuth click-through end-to-end
expected: Clicking "Continue with Google" on /en/auth redirects to accounts.google.com, returns to /auth/callback, exchanges code, and lands on /setup (no tokens) or /en (with tokens)
result: [pending]

### 2. USYD banner dismiss persistence
expected: Dismiss icon writes `uniboard.banner.usydRegister=<ISO timestamp>` to localStorage; banner stays hidden across page reloads; re-appears after 30 days (simulated by clearing storage)
result: [pending]

### 3. Forgot-password Resend button cooldown visual
expected: After submitting password-reset, success state shows "Resend email" enabled; clicking it toasts success and counts down "Resend in 00:60" → 00:01 → enabled again; failure path keeps button enabled (no cooldown restart)
result: [pending]

### 4. Recall email end-to-end deliverability
expected: Given a profile with canvas_token_status='expired', last_sign_in_at and last_sync_at both older than 14 days, and recall_email_sent_at NULL or older than 30 days, the next check_token_health() tick dispatches one recall email from noreply@uniboard.uk; AWS SES MessageId returned; profiles.recall_email_sent_at updated
result: [pending]

### 5. Per-platform sync counts render on SuccessStep after real sync
expected: After triggering a sync in Setup flow, SuccessStep shows "Canvas: N courses, M deadlines" and "Ed: K discussions" populated from /sync/status.per_platform_counts
result: [pending]

### 6. Retry failed only targets correct adapter
expected: Forcing a sync failure on Ed only, then clicking "Retry failed only", results in POST /sync/trigger with body {platforms: ['ed']} and only sync_ed_discussions running (Canvas untouched)
result: [pending]

### 7. WelcomeStep "signed in as {email}" note
expected: After Google OAuth signup, WelcomeStep shows "You're signed in as <google-email>. First-time users can also sign in with Google." — email sourced from useCurrentUser()
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
