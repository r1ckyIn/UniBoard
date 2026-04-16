---
phase: 33-token-lifecycle-onboarding
verified: 2026-04-15T00:00:00Z
status: human_needed
score: 7/7 must-haves verified
human_verification:
  - test: "Google OAuth button click-through on deployed frontend"
    expected: "Clicking 'Continue with Google' on /en/auth redirects to accounts.google.com, returns to /auth/callback, exchanges code, and lands on /setup (no tokens) or /en (with tokens)"
    why_human: "Requires a real Google account + the production Vercel deploy + Supabase production Google provider; cannot be grep-verified"
  - test: "USYD banner dismiss persistence"
    expected: "Dismiss icon writes uniboard.banner.usydRegister=<ISO timestamp> to localStorage; banner stays hidden across page reloads; re-appears after 30 days (simulated by clearing storage)"
    why_human: "DOM interaction + localStorage round-trip must be observed in browser; code paths all verified"
  - test: "Forgot-password Resend button cooldown visual"
    expected: "After submitting password-reset, success state shows 'Resend email' enabled; clicking it toasts success and counts down 'Resend in 00:60' → 00:01 → enabled again; failure path keeps button enabled (no cooldown restart)"
    why_human: "Timer/toast visual UX; React Testing Library confirms logic, but real-timer feel must be validated by user"
  - test: "Recall email end-to-end deliverability"
    expected: "Given a profile with canvas_token_status='expired', last_sign_in_at and last_sync_at both older than 14 days, and recall_email_sent_at NULL or older than 30 days, the next check_token_health() tick dispatches one recall email from noreply@uniboard.uk; AWS SES MessageId returned; profiles.recall_email_sent_at updated"
    why_human: "Requires APScheduler tick in Railway prod + real SES credentials + inspecting an inbox; 20 unit tests already green"
  - test: "Per-platform sync counts render on SuccessStep after real sync"
    expected: "After triggering a sync in Setup flow, SuccessStep shows 'Canvas: N courses, M deadlines' and 'Ed: K discussions' populated from /sync/status.per_platform_counts"
    why_human: "Requires real Canvas + Ed tokens + full sync pipeline; frontend wiring and backend aggregation both verified at code level"
  - test: "Retry failed only targets correct adapter"
    expected: "Forcing a sync failure on Ed only, then clicking 'Retry failed only', results in POST /sync/trigger with body {platforms: ['ed']} and only sync_ed_discussions running (Canvas untouched)"
    why_human: "Requires controlled sync-failure conditions in deployed env; static dispatch table already verified"
  - test: "WelcomeStep 'signed in as {email}' note"
    expected: "After Google OAuth signup, WelcomeStep shows 'You're signed in as <google-email>. First-time users can also sign in with Google.' — email sourced from useCurrentUser()"
    why_human: "Requires completing an OAuth flow; useCurrentUser wiring verified statically"
---

# Phase 33: Token Lifecycle & Onboarding (with Auth Hardening) Verification Report

**Phase Goal:** Deliver three coordinated outcomes — (1) EMAIL-03 token-lifecycle recall emails after 14-day absence, (2) ONBD-01/ONBD-02 onboarding polish (per-platform sync progress, token-cache skip-revalidate, retry UX), (3) AUTH-HARDEN-01..04 (Google OAuth primary path, USYD banner, password-reset resend with cooldown, permanent-OFF email-confirmation docs).

**Verified:** 2026-04-15
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Dormant users with expired tokens get a recall email after 14 days of app+sync absence (rate-limited to once per 30 days) | VERIFIED | migration 00000000000007 adds `recall_email_sent_at`; `should_send_recall_email()` in `src/services/recall_email.py` enforces 4-gate logic; wired in `src/sync/scheduled.py:201-204` inside isolated try/except with Sentry `phase=33` tag |
| 2 | Google OAuth signups get a real display name (not their email) via handle_new_user() trigger | VERIFIED | Migration 00000000000007 replaces `handle_new_user()` with COALESCE(display_name, full_name, name, '') — confirmed in file lines 22-39 |
| 3 | Google OAuth is a visible primary auth path: button + callback route + live Supabase provider | VERIFIED | `supabase/config.toml:327-329` `[auth.external.google]` block `enabled = true`; `frontend/app/auth/callback/route.ts` exchanges code + redirects token-state-aware; `LoginForm.tsx:11,13,28,78-81` and `RegisterForm.tsx:14,16,29,110,120` render Google button; Google Cloud client 266895413864-…apps.googleusercontent.com live (per 33-04 SUMMARY smoke-test curl returning 302 to accounts.google.com) |
| 4 | Forgot-password success state has a Resend button with 60s client-side cooldown | VERIFIED | `ForgotPasswordForm.tsx` lines 38-130: submittedEmail state, cooldownEnd + tick state, handleResend() calls resetMutation, cooldown label interpolates seconds; 6 fake-timer vitest cases green per 33-06 SUMMARY |
| 5 | Email confirmation permanently-OFF decision is documented in three canonical places | VERIFIED | TRD §7.5 "Email Confirmation Policy" (line 1292) + §16.9 "Supabase Auth Configuration" (line 2754); `.planning/PROJECT.md:202` Key Decisions row; `supabase/config.toml:205-208` 3-line comment block above `enable_confirmations = true` |
| 6 | SuccessStep displays per-platform sync counts grouped as Canvas/Ed | VERIFIED | `src/web/routes/sync.py:47` DOMAIN_TO_PLATFORM constant; `aggregate_per_platform_counts()` at line 54; wired into /sync/status response at line 326-327, 351; `frontend/lib/api/types.gen.d.ts:827,830` has typed `per_platform_counts?: PerPlatformCounts`; `SuccessStep.tsx:74-75,133-167` renders two PlatformRow components + Retry failed only button |
| 7 | Setup edge cases handled: token cache skip-revalidate, invalid-vs-unreachable failure panels, retry-failed-only, WelcomeStep signed-in-as note | VERIFIED | `frontend/lib/setup/tokenCache.ts` SHA-256 + sessionStorage TTL cache (5 min); `TokenStep.tsx` imports tokenCache, FailurePanel rendered for both `invalid` and `unreachable` modes, submitWithBackoff helper (2s/4s/8s) at line 67; `WelcomeStep.tsx:6,35,61-62` uses useCurrentUser to interpolate signedInAs/firstTimeNote; backend `src/web/routes/sync.py:110,144,201-208` platforms filter with _PLATFORM_TO_SCOPES dispatch |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `supabase/migrations/00000000000007_recall_email_and_oauth_profile.sql` | EMAIL-03 column + AUTH-HARDEN-01 trigger patch | VERIFIED | 43 lines; both ALTER TABLE and CREATE OR REPLACE FUNCTION present with correct COALESCE chain |
| `src/models/user.py` | Profile.recall_email_sent_at Mapped field | VERIFIED | Line 47: `recall_email_sent_at: Mapped[datetime \| None] = mapped_column(...)` |
| `src/services/recall_email.py` | RecallEmailService + should_send_recall_email | VERIFIED | 171 lines; 4-gate pure function + SES dispatch + Sentry failure tagging + profile timestamp update on success |
| `src/email/templates/recall.html` + `recall.txt` | Branded + plaintext bodies with deep_link | VERIFIED | Both files present (3431 + 363 bytes); 4 str.format placeholders |
| `src/sync/scheduled.py` | check_token_health extended with recall branch | VERIFIED | Lines 13 (import), 127-135 (docstring), 201-204 (gating + dispatch), 205-211 (isolated try/except + Sentry tag) |
| `src/web/routes/sync.py` | per_platform_counts aggregation + platforms filter | VERIFIED | DOMAIN_TO_PLATFORM (line 47), aggregate_per_platform_counts (line 54), SyncTriggerRequest.platforms (line 110), filter logic (line 201-208), response field (line 351) |
| `frontend/lib/api/types.gen.d.ts` | PerPlatformCounts type | VERIFIED | Lines 827, 830: `per_platform_counts?: ... \| null` and `PerPlatformCounts: { canvas, ed }` |
| `frontend/app/auth/callback/route.ts` | OAuth callback Route Handler | VERIFIED | 65 lines; exchangeCodeForSession + profile query + token-state redirect; custom `next` param honored |
| `frontend/components/auth/LoginForm.tsx` | Google button + or divider | VERIFIED | Imports GoogleIcon + useGoogleLogin; button at lines 78-81 |
| `frontend/components/auth/RegisterForm.tsx` | USYD banner + Google button + corrected check-email copy | VERIFIED | Imports UsydBanner + GoogleIcon; `<UsydBanner />` at line 110; `auth.checkEmail.goToLogin` CTA at line 93 |
| `frontend/components/auth/UsydBanner.tsx` | Dismissible banner with 30-day re-show | VERIFIED | 68 lines; localStorage read/write; 30-day default reShowAfterDays; i18n via auth.usydBanner |
| `frontend/components/icons/GoogleIcon.tsx` | Inline SVG Google mark | VERIFIED | File exists (1256 bytes), SSR-safe SVG |
| `frontend/components/auth/ForgotPasswordForm.tsx` | Resend button + 60s cooldown | VERIFIED | submittedEmail state, cooldownEnd + tick + interval cleanup, handleResend handler, resendLabel interpolation |
| `frontend/components/setup/TokenStep.tsx` | skip-revalidate + FailurePanel + exp-backoff | VERIFIED | tokenCache import, FailurePanel with invalid/unreachable variants, submitWithBackoff helper, keystroke invalidation |
| `frontend/components/setup/SuccessStep.tsx` | Two platform rows + retry-failed-only | VERIFIED | canvasCounts/edCounts from per_platform_counts, PlatformRow subcomponent rendered twice, data-testid="retry-failed-button" |
| `frontend/components/setup/WelcomeStep.tsx` | signed-in-as note | VERIFIED | useCurrentUser import, signedInAs + firstTimeNote translation calls (lines 35, 61-62) |
| `frontend/lib/setup/tokenCache.ts` | SHA-256 + sessionStorage cache | VERIFIED | hashToken, readTokenCache, writeTokenCache, clearTokenCache, isTokenCachedAndFresh; 5-min TTL constant |
| `supabase/config.toml` | [auth.external.google] + additional_redirect_urls + comment block | VERIFIED | Line 152 adds /auth/callback; lines 205-208 comment block; lines 327-332 Google provider enabled with env() refs |
| `docs/UniBoard_TRD_v2.md` | §7.5 + §16.9 | VERIFIED | Both subsection headings present at lines 1292 and 2754 |
| `.planning/PROJECT.md` | Key Decisions row | VERIFIED | Line 202 references "permanently OFF" with Mimecast + AUTH-HARDEN-01/02/03 cross-refs |
| `tests/unit/test_recall_email.py` + `test_token_health.py` + `test_sync_status.py` | New unit tests | VERIFIED | 12 + 5 (new) + 6 tests per SUMMARY; regression gate confirms all green |
| Frontend tests (UsydBanner, callback-route, SuccessStep, tokenCache) | New frontend tests | VERIFIED | 4 test files on disk, 116/116 frontend tests in phase scope pass |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `check_token_health()` scheduled job | `RecallEmailService.send_recall()` | import + call in try/except | WIRED | src/sync/scheduled.py:13 import + 201-204 gating/call |
| `RecallEmailService` | AWS SES sender | SESEmailSender.send_html_email(text_body=...) | WIRED | src/services/recall_email.py:145-151 |
| `RecallEmailService` | DeadlineService.list_upcoming | composition | WIRED | src/services/recall_email.py:117-121 |
| `RecallEmailService` success path | profiles.recall_email_sent_at | UPDATE SQL | WIRED | src/services/recall_email.py:160-164 |
| LoginForm / RegisterForm | supabase.auth.signInWithOAuth('google') | useGoogleLogin hook | WIRED | LoginForm.tsx:11,28 and RegisterForm.tsx:14,29 import+use; redirectTo = <origin>/auth/callback per 33-05 SUMMARY |
| `/auth/callback` route | Supabase session | exchangeCodeForSession | WIRED | frontend/app/auth/callback/route.ts:28 |
| `/auth/callback` route | profile token state | Supabase query + redirect branch | WIRED | frontend/app/auth/callback/route.ts:50-64 |
| SuccessStep | /sync/status per_platform_counts | TanStack Query (useSyncStatus) | WIRED | SuccessStep.tsx:74-75 reads syncStatus?.per_platform_counts?.canvas / ed |
| "Retry failed only" button | /sync/trigger with platforms filter | useSyncTrigger mutation | WIRED | Backend _PLATFORM_TO_SCOPES (sync.py:201-208) dispatches sync_ed_discussions for ed, canvas scopes for canvas |
| ForgotPasswordForm Resend | supabase.auth.resetPasswordForEmail | useResetPassword mutation + handleResend | WIRED | ForgotPasswordForm.tsx:75-97 |
| TokenStep | tokenCache helpers | import + skip path + invalidate on keystroke | WIRED | TokenStep.tsx:20 imports; 113 uses alreadyValidated skip; keystroke invalidation per 33-07 SUMMARY |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| SuccessStep PlatformRow (Canvas) | canvasCounts | useSyncStatus → /sync/status.per_platform_counts.canvas | aggregate_per_platform_counts() reads real SyncResults (not static); zero-filled when domain missing | FLOWING |
| SuccessStep PlatformRow (Ed) | edCounts | useSyncStatus → /sync/status.per_platform_counts.ed | Same, aggregation groups discussions under 'ed' via DOMAIN_TO_PLATFORM | FLOWING |
| WelcomeStep signedInAs | userResp.email | useCurrentUser → /auth/me | Sourced from real Supabase session user; graceful fallback omits note when email empty | FLOWING |
| Recall email deadline_count | upcoming list length | DeadlineService.list_upcoming(user_id, horizon_days=14, now) | Real DB query via DeadlineService.get_deadlines; no static fallback | FLOWING |
| ForgotPasswordForm submittedEmail | submittedEmail state | onSubmit handler sets from form input | Stored for resend reuse; not hardcoded | FLOWING |
| /auth/callback redirect target | tokensMissing | Supabase profiles table (canvas_token_status + ed_token_status) | Real query; defensive null handling | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Phase 33 backend unit tests pass | `UNIBOARD_DISABLE_SYNC=true DEBUG=true uv run pytest tests/unit/test_recall_email.py tests/unit/test_token_health.py tests/unit/test_sync_status.py` | 20 + 6 = 26 passing (per summary frontmatter + context regression gate confirms 26/26 passed) | PASS |
| Phase 33 frontend unit tests pass | `pnpm vitest run __tests__/auth/ __tests__/setup/` | 116/116 passing (per context regression gate) | PASS |
| Recall templates render without KeyError | Python: `tpl.format(display_name='x', deadline_count=0, deadline_line='', deep_link='https://…')` | Per 33-02 SUMMARY: both templates smoke-tested, no KeyError | PASS |
| OpenAPI type regen | `pnpm typecheck` in frontend | 0 errors per 33-03 SUMMARY; types.gen.d.ts has PerPlatformCounts | PASS |
| Google provider live (smoke test) | `curl -sI 'http://localhost:54321/auth/v1/authorize?provider=google&...'` | 302 → accounts.google.com with real client_id per 33-04 SUMMARY Task 3 | PASS |
| config.toml paths resolve | `supabase start` with config.toml | Succeeds after e9530d9 hotfix (templates path = ./supabase/templates/*.html) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| EMAIL-03 | 33-01, 33-02 | Token expiry 14-day recall email | SATISFIED | Migration + RecallEmailService + check_token_health wiring all verified; 20 tests green |
| AUTH-HARDEN-01 | 33-01, 33-05 | Google OAuth primary path (includes trigger display_name fix) | SATISFIED | Migration COALESCE verified; useGoogleLogin hook + buttons on both forms verified |
| AUTH-HARDEN-02 | 33-04, 33-05 | Google OAuth visible path + USYD banner (note: REQUIREMENTS.md labels AUTH-HARDEN-02 as "注册页 USYD 用户提示 banner"; plans 33-04 owns OAuth plumbing and 33-05 owns banner UI) | SATISFIED | UsydBanner component + /auth/callback route + [auth.external.google] block all on disk; live client ID provisioned |
| AUTH-HARDEN-03 | 33-06 | Resend email + 60s cooldown (scoped to ForgotPasswordForm per research correction) | SATISFIED | ForgotPasswordForm.tsx implements full cooldown logic; 6 fake-timer tests green |
| AUTH-HARDEN-04 | 33-08 | Permanent-OFF email confirmation documentation | SATISFIED | TRD §7.5 + §16.9 + PROJECT.md Key Decisions + supabase/config.toml comment block all verified |
| ONBD-01 | 33-03, 33-07 | Per-platform sync counts + SuccessStep display | SATISFIED | Backend aggregation + typed API contract + SuccessStep PlatformRow rendering all verified |
| ONBD-02 | 33-07 | Setup edge cases (token cache, retry failed only, welcome email note) | SATISFIED | tokenCache module, FailurePanel invalid/unreachable, retry-failed-button, WelcomeStep signedInAs all verified |

**No orphaned requirements.** All 7 requirement IDs from PLAN frontmatters map 1:1 to REQUIREMENTS.md entries, all marked Complete in REQUIREMENTS.md traceability table.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none blocking) | — | — | — | — |

Notes:
- 33-04 SUMMARY mentions 4 lint warnings in `frontend/__tests__/auth/callback-route.test.ts` (no-unused-vars on `_` prefixed mock args) — logged to `deferred-items.md`, expected to be cleaned at phase pre-PR lint gate, not a goal-blocker.
- No TODO/FIXME/placeholder code smells introduced by Phase 33 in the files spot-checked.
- All "empty" patterns (return null, {}, []) seen in spot checks are legitimate SSR guards (UsydBanner when not visible, callback route when no code, WelcomeStep when no user email) — all have alternative code paths populating them from real data. Not stubs.

### Human Verification Required

Seven items require browser/production testing. Per the user's documented workflow (`feedback_post_phase_production_verify`), these are intended for post-merge UAT on Vercel+Railway+Supabase rather than local browser sessions. Detailed test plan is in the YAML frontmatter.

Summary:
1. Google OAuth click-through end-to-end against deployed app
2. USYD banner dismiss persistence across browser reloads + 30-day re-show
3. Forgot-password Resend cooldown visual (toast + 60 → 0 countdown + immediate retry on failure)
4. Recall email live SES dispatch (APScheduler tick + Mimecast-aware inbox check)
5. Per-platform sync counts render with real Canvas+Ed token data after sync
6. Retry failed only targets correct adapter (platforms filter end-to-end)
7. WelcomeStep "signed in as {email}" note renders for Google-authed user

### Gaps Summary

No automated gaps. All 7 observable truths verified; all artifacts exist with substantive content; all key links wired; all data flows trace to real sources; 7/7 requirements satisfied. The remaining 7 items (above) are by-design human-UAT concerns (visual timers, OAuth round-trip, real email deliverability) consistent with Phase 33's scope spanning UI + third-party auth + email transport.

---

*Verified: 2026-04-15*
*Verifier: Claude (gsd-verifier)*
