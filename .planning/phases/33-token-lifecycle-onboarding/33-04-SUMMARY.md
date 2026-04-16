---
phase: 33-token-lifecycle-onboarding
plan: 04
subsystem: auth
tags: [supabase, oauth, google, nextjs, route-handler, usyd-workspace, mimecast-bypass]

# Dependency graph
requires:
  - phase: 33-01-migration
    provides: handle_new_user() COALESCE patch so Google OAuth signups get a real display_name
  - phase: 32-production-email
    provides: supabase/config.toml email template / SMTP foundation (extended here with [auth.external.google])
provides:
  - Supabase Google OAuth provider config (env-var-driven, no secrets in git)
  - /auth/callback Next.js Route Handler exchanging OAuth code for session cookie
  - Token-state-aware redirect (/setup vs /en) after successful OAuth exchange
  - .env.example documentation of the two new env vars
  - Live Google Cloud OAuth Client (prod + local) wired to Supabase Dashboard
affects: [33-05-google-button-ui, auth-hardening, usyd-onboarding]

# Tech tracking
tech-stack:
  added:
    - Google Cloud OAuth 2.0 Client (External consent screen, UniBoard branding)
    - Supabase [auth.external.google] provider
  patterns:
    - Env-var-driven OAuth secrets (mirrors existing Apple template at supabase/config.toml)
    - Locale-agnostic OAuth callback route at app/auth/callback (same convention as app/auth/confirm)
    - Post-exchange profile inspection to branch redirect between /setup and /en

key-files:
  created:
    - frontend/app/auth/callback/route.ts
    - frontend/__tests__/auth/callback-route.test.ts
  modified:
    - supabase/config.toml
    - .env.example

key-decisions:
  - "Google OAuth configured via env() references in supabase/config.toml — raw client_id/secret kept only in root .env (gitignored) and Supabase Dashboard (prod)"
  - "Callback route reads profile.canvas_token_status + ed_token_status to decide redirect target; both 'missing' (or NULL) → /setup, otherwise → /en"
  - "Custom ?next=<path> searchParam overrides the default token-state redirect for future flexibility"
  - "Route lives at app/auth/callback (not inside [locale]) because Supabase OAuth redirect URIs are locale-agnostic"
  - "OAuth consent screen registered as External (USYD Google Workspace users authenticate as normal Google users, no org verification required for sign-in)"

patterns-established:
  - "SUPABASE_AUTH_EXTERNAL_{PROVIDER}_{CLIENT_ID|SECRET} env var convention for any future third-party OAuth provider"
  - "OAuth callback pattern: exchangeCodeForSession(code) → getUser() → profile query → redirect"

requirements-completed: [AUTH-HARDEN-02]

# Metrics
duration: ~45min (execution + human OAuth provisioning + smoke test)
completed: 2026-04-16
---

# Phase 33 Plan 04: Google OAuth Wiring Summary

**Supabase [auth.external.google] provider wired end-to-end with a token-state-aware /auth/callback Next.js Route Handler; live Google Cloud OAuth client provisioned and verified against local Supabase with a real 302 redirect to accounts.google.com**

## Performance

- **Duration:** ~45 min (Tasks 1-2 automated on 2026-04-15; Task 3 human-action resolved on 2026-04-16)
- **Started:** 2026-04-15 (Task 1 — ebede29)
- **Completed:** 2026-04-16T00:28Z (Task 3 verified + supabase config hotfix e9530d9)
- **Tasks:** 3 of 3 complete (Task 3 was a required human-action checkpoint)
- **Files modified:** 4 (2 created, 2 edited)

## Accomplishments
- Added [auth.external.google] block to supabase/config.toml using env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID) / env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)
- Extended additional_redirect_urls with http://localhost:3001/auth/callback
- Documented the two new env vars in .env.example (empty values, no secrets)
- Created /auth/callback Route Handler implementing exchangeCodeForSession + token-state-aware redirect
- 5 unit tests covering success branches (both-missing→/setup, one-configured→/en, custom next), failure branches (no code, exchange error), all passing
- Provisioned production Google Cloud OAuth 2.0 Web Client with UniBoard consent branding (External, USYD email as support contact)
- Registered both redirect URIs (prod + local) in Google Cloud Console
- Enabled Google provider in Supabase Dashboard (production project brcsgbxnflyxbmijwbte) with Client ID + Secret
- Populated root .env (gitignored) with local dev credentials and verified local Supabase picks them up
- Delivered AUTH-HARDEN-02: Google OAuth becomes the primary auth path for USYD students, bypassing Mimecast email quarantine entirely

## Task Commits

1. **Task 1: Add [auth.external.google] block + .env.example docs** — `ebede29` (feat)
2. **Task 2 RED: failing test for /auth/callback route handler** — `82db052` (test)
3. **Task 2 GREEN: add /auth/callback Route Handler for Google OAuth** — `17800af` (feat)
4. **Task 3 (human-action): provision Google Cloud OAuth client + populate Supabase Dashboard** — no git commit (manual dashboard config; env vars in gitignored .env)
5. **Out-of-scope unblocker during Task 3 smoke test** — `e9530d9` (fix, supabase config template paths)

_TDD: Task 2 split into RED (test) and GREEN (impl) commits per `<tdd_execution>` protocol. No refactor commit needed — route handler was already clean._

## Files Created/Modified
- `frontend/app/auth/callback/route.ts` (created) — Next.js GET handler; calls `supabase.auth.exchangeCodeForSession(code)`, inspects profile token state, redirects to /setup or /en (or custom ?next=)
- `frontend/__tests__/auth/callback-route.test.ts` (created) — 5 test cases covering all documented behaviors
- `supabase/config.toml` (modified) — Added [auth.external.google] block below [auth.external.apple], extended additional_redirect_urls with /auth/callback
- `.env.example` (modified) — Documented SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID + SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET (empty values)

## Decisions Made

- **Env-var convention over inline secrets**: Even though Supabase accepts raw values in config.toml, using `env(...)` references keeps the committed file secret-free. Real values live in root .env (gitignored) for local and in Supabase Dashboard for prod — classic dev/prod split.
- **Token-state logic prefers inclusive "missing" check**: The route treats `null`, `undefined`, and the literal string `"missing"` as equivalent so brand-new OAuth users (who have no profile row yet, or have defaults that haven't been initialized by handle_new_user) reliably land on /setup.
- **Locale defaults to /en**: OAuth redirect_uri is locale-agnostic. When no `?next=` is present, we redirect to /en (matching the /auth/confirm pattern). Locale switching happens post-login via the existing LanguageSwitcher.
- **External consent screen, not Internal**: USYD Google Workspace accounts can authenticate against any External-type Google OAuth client without org-level verification; this is the standard pattern for third-party apps serving Workspace users. No USYD IT admin approval required.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing supabase config email template paths (out-of-scope unblocker)**
- **Found during:** Task 3 smoke test (attempting `supabase stop && supabase start` to pick up Google env vars)
- **Issue:** `supabase start` failed with `open templates/confirmation.html: no such file or directory`. Phase 32-01 set `content_path = "./templates/confirmation.html"` but the files live at `./supabase/templates/*.html`. The commented-out invite template at line 231 shows the correct convention.
- **Fix:** Changed both paths in supabase/config.toml (confirmation + recovery) to `./supabase/templates/*.html`.
- **Files modified:** supabase/config.toml
- **Verification:** `supabase start` succeeds; Google OAuth smoke test proceeds.
- **Committed in:** `e9530d9` — **not a 33-04 scope change**, but was a blocking prerequisite for completing the 33-04 human-action checkpoint. Pre-existing Phase 32 bug surfaced here.

### Scope Boundary Notes
No other uncommitted file modifications were attributed to this plan.

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking — out-of-scope Phase 32 config bug). No scope creep on 33-04 itself.
**Impact on plan:** The supabase config hotfix was essential to complete the smoke test in Task 3. Without it, local Supabase could not start, and Google OAuth live verification would have been impossible. Correction was minimal (two path strings) and properly scoped to its own commit.

## Issues Encountered

- **Phase 32 supabase template paths blocked smoke test** → fixed in commit e9530d9 as described above.
- No issues with the planned work itself — Tasks 1-2 executed per plan; Task 3 checkpoint resolved with standard Google Cloud + Supabase Dashboard dance.

## User Setup Required

**External services require manual configuration.** This plan's Task 3 was a human-action checkpoint and is now complete:
- Google Cloud OAuth 2.0 Web Client (client ID `266895413864-q41e9u8oijqacd4a4ulka2op984eifvu.apps.googleusercontent.com`) — live
- OAuth consent screen configured (External, UniBoard branding, USYD email support)
- Authorized redirect URIs: `http://localhost:54321/auth/v1/callback`, `https://brcsgbxnflyxbmijwbte.supabase.co/auth/v1/callback`
- Supabase Dashboard (prod project `brcsgbxnflyxbmijwbte`) → Authentication → Providers → Google → enabled with Client ID + Secret
- Root `.env` populated with `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` + `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` (gitignored)

## Verification Evidence

```
# Supabase local config picks up Google provider
curl -s http://localhost:54321/auth/v1/settings | jq '.external.google'
→ true

# OAuth authorize endpoint redirects to real Google consent screen
curl -sI 'http://localhost:54321/auth/v1/authorize?provider=google&redirect_to=http://localhost:3001/auth/callback'
→ HTTP/1.1 302 Found
→ Location: https://accounts.google.com/o/oauth2/auth?...
         &client_id=266895413864-q41e9u8oijqacd4a4ulka2op984eifvu.apps.googleusercontent.com
         &scope=email+profile
         &redirect_uri=http://localhost:54321/auth/v1/callback

# Config.toml contains the block (Task 1 verify)
grep -c '\[auth.external.google\]' supabase/config.toml  → 1
grep -c '/auth/callback' supabase/config.toml           → 1

# Env var documented
grep -c 'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID' .env.example  → 1

# No secrets committed
git show ebede29 -- supabase/config.toml | grep -E 'secret.*=.*[a-zA-Z0-9]{20,}'  → (empty)
```

## Known Follow-ups (deferred, not blocking this plan)

- **Lint warnings in `frontend/__tests__/auth/callback-route.test.ts`** (4x `@typescript-eslint/no-unused-vars` on underscore-prefixed mock args at lines 16-18). Logged in `deferred-items.md` by Plan 33-05 executor. Not in scope for 33-04 completion; will be cleaned up in phase-level pre-PR lint cleanup to satisfy CI `--max-warnings 0`.
- **Pre-existing typecheck error in `RegisterForm.tsx` (line 80: `Cannot find name 'Mail'`)** — Plan 33-07 deferral, unrelated to 33-04.

## Self-Check: PASSED

- Files created: `frontend/app/auth/callback/route.ts`, `frontend/__tests__/auth/callback-route.test.ts` → FOUND
- Files modified: `supabase/config.toml`, `.env.example` → FOUND
- Commits: `ebede29` (Task 1), `82db052` (Task 2 RED), `17800af` (Task 2 GREEN), `e9530d9` (out-of-scope unblocker) → ALL FOUND IN git log
- Task 3 human action: smoke test curl returned 302 to accounts.google.com with real client_id → verified on 2026-04-16
- Requirement mapped: AUTH-HARDEN-02 (Google OAuth as primary auth path)

## Next Phase Readiness

- Plan 33-05 (already complete) provides the visible Google button on LoginForm/RegisterForm — full end-to-end chain from UI → Google consent → Supabase session → /setup or /en is now live in local dev.
- Production verification still to do: click-through smoke test against the deployed Vercel frontend once the next Vercel deploy ships with /auth/callback route. Not gating 33-04 completion — the provider config + route code is shipped; only the deploy pipeline is pending.
- No blockers for Phase 33 completion (Plan 33-04 was the last gated plan; Plans 33-05 through 33-08 were already merged ahead of Task 3 manual work).

---
*Phase: 33-token-lifecycle-onboarding*
*Completed: 2026-04-16*
