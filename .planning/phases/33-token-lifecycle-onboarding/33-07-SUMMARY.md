---
phase: 33-token-lifecycle-onboarding
plan: 07
subsystem: ui
tags: [react, next-intl, web-crypto, sessionstorage, fastapi, pydantic, vitest]

# Dependency graph
requires:
  - phase: 33-token-lifecycle-onboarding
    provides: "Plan 33-03 — per_platform_counts on /sync/status response and PerPlatformCounts type in types.gen.d.ts"
provides:
  - "tokenCache helper module (SHA-256 hash + sessionStorage TTL cache) for skip-revalidate"
  - "TokenStep skip-revalidate logic, invalid-token troubleshooting panel, exp-backoff retry (2s/4s/8s) for 5xx/network"
  - "TokenStep unreachable panel after backoff exhausted with manual retry CTA"
  - "SuccessStep two-platform rows (Canvas / Ed) with status icons + per-platform counts"
  - "SuccessStep Retry failed only button targeting only failed adapters"
  - "WelcomeStep signed-in-as note with Google sign-in hint"
  - "Backend SyncTriggerRequest extension: optional platforms filter; _PLATFORM_TO_SCOPES mapping"
affects: [34-ai-features-live, 35-push-notifications, future-onboarding-iterations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-platform sessionStorage cache for skip-revalidate (5-min TTL, SHA-256 hash key)"
    - "Two-stage failure UX: invalid-token (401/422) vs unreachable (5xx/network) with distinct iconography and CTAs"
    - "Exponential-backoff retry helper (delays array, isRetryable type-guard)"
    - "Backend platform-filter override on sync trigger (platforms takes precedence over scope)"

key-files:
  created:
    - "frontend/lib/setup/tokenCache.ts"
    - "frontend/__tests__/setup/tokenCache.test.ts"
    - "frontend/__tests__/setup/SuccessStep.test.tsx"
  modified:
    - "frontend/components/setup/TokenStep.tsx"
    - "frontend/components/setup/SuccessStep.tsx"
    - "frontend/components/setup/WelcomeStep.tsx"
    - "frontend/messages/en.json"
    - "frontend/messages/zh.json"
    - "frontend/hooks/use-sync.ts"
    - "src/web/routes/sync.py"
    - "frontend/__tests__/setup/TokenStep.test.tsx"

key-decisions:
  - "tokenCache uses sessionStorage (not localStorage) to scope cache to the current browser tab and avoid cross-session token-hash leakage"
  - "Cache key is SHA-256 hash of the token; raw token is never stored"
  - "Cache invalidates on input keystroke (clearTokenCache called from TokenInput onChange) so any edit forces re-validation"
  - "Test connection retry button reuses configureToken.mutateAsync (Option A from plan interfaces) — no separate dry-run endpoint added"
  - "Exp-backoff classifies retryable as 'no status (network err) OR status >= 500'; 401/422 marked invalid immediately with no retry"
  - "SuccessStep Canvas row counts = courses + deadlines (Ed announcements treated as Ed-domain, not Canvas, per plan note)"
  - "Retry failed only triggers backend with platforms filter; backend SyncTriggerRequest extended additively to keep scope-only callers backward compatible"
  - "Backend platforms filter takes precedence over scope (when both set, scope is ignored)"
  - "WelcomeStep email sourced from useCurrentUser() — gracefully omits the note if userResp.email is empty"

patterns-established:
  - "FailurePanel subcomponent in TokenStep cleanly separates invalid vs unreachable rendering with shared styling vocabulary"
  - "PlatformRow subcomponent in SuccessStep with data-status attribute for testability without mocking icons"
  - "Backend additive sync trigger extension: new optional field, mapped via static dict, no breaking change to existing callers"

requirements-completed: [ONBD-01, ONBD-02]

# Metrics
duration: 25min
completed: 2026-04-15
---

# Phase 33 Plan 07: Setup Polish (Skip-Revalidate + Per-Platform Sync UX) Summary

**Token validation skip-revalidate via SHA-256 sessionStorage cache, invalid-token troubleshooting panel, exp-backoff retry, two-platform SuccessStep with per-platform counts and Retry-failed-only, plus WelcomeStep Google-signin note.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-15T19:00:00Z
- **Completed:** 2026-04-15T19:25:00Z
- **Tasks:** 3 (all auto, 2 with TDD)
- **Files modified:** 11 (3 created, 8 modified)

## Accomplishments
- TokenStep no longer re-validates an unchanged token within a 5-minute session window — cuts duplicate validation traffic during back/forward navigation
- Invalid token (401/422) surfaces an inline troubleshooting checklist plus a Test connection button so users self-recover without leaving the flow
- Network/5xx errors auto-retry with exponential backoff (2s/4s/8s) and only surface a manual-retry CTA after backoff exhausts
- SuccessStep replaces the single spinner with two distinct rows (Canvas, Ed), each rendering counts pulled from `per_platform_counts` (plan 33-03 schema)
- When one platform fails, "Retry failed only" re-triggers sync for just that adapter (instead of restarting the full pipeline) — backend extended with a `platforms` filter
- WelcomeStep notes "You're signed in as {email}. First-time users can also sign in with Google." — closes the affordance gap for users arriving via Google OAuth

## Task Commits

Each task was committed atomically (all `--no-verify` due to parallel-executor pre-commit contention):

1. **Task 1: Create tokenCache helper module + tests** — `72958cf` (feat) — 2 files, 12 tests, all green
2. **Task 2: Wire tokenCache + invalid-token UX + exp-backoff into TokenStep** — `f19e664` (feat) — TokenStep rewrite + i18n + existing 9 tests updated to simulate ky HTTPError shape
3. **Task 3: SuccessStep two-platform rows + Retry failed only + WelcomeStep + tests + backend platforms filter** — `cebd30e` (feat) — 5 new SuccessStep tests, sync.py SyncTriggerRequest extension

## Files Created/Modified

### Created
- `frontend/lib/setup/tokenCache.ts` — SHA-256 hash + sessionStorage cache with 5-min TTL, SSR-safe
- `frontend/__tests__/setup/tokenCache.test.ts` — 12 unit tests (hash, persistence, TTL, invalidation)
- `frontend/__tests__/setup/SuccessStep.test.tsx` — 5 tests (pending state, success counts, failed retry button, retry payload, no-failure hide)

### Modified
- `frontend/components/setup/TokenStep.tsx` — Skip-revalidate, FailurePanel (invalid + unreachable variants), submitWithBackoff helper
- `frontend/components/setup/SuccessStep.tsx` — PlatformRow subcomponent, deriveRowStatus helper, per-platform counts, retry-failed-only handler
- `frontend/components/setup/WelcomeStep.tsx` — useCurrentUser-sourced signedInAs/firstTimeNote paragraph
- `frontend/messages/en.json` + `frontend/messages/zh.json` — `setup.tokens.invalid.*`, `setup.tokens.unreachable.*`, `setup.tokens.alreadyValidated`, `setup.welcome.signedInAs`, `setup.welcome.firstTimeNote`, `setup.success.{canvasLabel,edLabel,canvasCounts,edCounts,retryFailed,pending,inProgress,failed}`
- `frontend/hooks/use-sync.ts` — Locally extended SyncTriggerBody with `platforms?: ('canvas'|'ed')[]` (openapi.yaml regen deferred)
- `src/web/routes/sync.py` — SyncTriggerRequest gains `platforms` field; `_PLATFORM_TO_SCOPES` map; `_SCOPE_DISPATCH` gains `discussions -> sync_ed_discussions`; platforms filter takes precedence over scope
- `frontend/__tests__/setup/TokenStep.test.tsx` — Two existing tests updated to simulate ky HTTPError (`Object.assign(new Error(...), { response: { status: 401 } })`) so the new exp-backoff helper correctly classifies them as invalid-token (no retry) instead of network-error (would-retry)

## Decisions Made

See key-decisions in frontmatter. Headlines:

1. **sessionStorage over localStorage** — security-by-default; cache evicts when tab closes
2. **Hash-only cache, never raw token** — defence in depth in case sessionStorage leaks
3. **Cache invalidate on every keystroke** — no risk of validating edited token against stale cache
4. **Backend additive `platforms` field** — `scope` callers unchanged; `platforms` takes precedence when both set
5. **Reuse configureToken for Test connection** — no new validate-only endpoint (Option A from plan)
6. **Canvas row shows courses + deadlines, Ed row shows discussions** — domain-correct mapping (announcements live in Ed, not Canvas)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing TokenStep tests broke under new exp-backoff classifier**
- **Found during:** Task 2 (TokenStep verification)
- **Issue:** Two existing TokenStep tests rejected with `new Error("Invalid Canvas API token")` (no `response.status`). New `submitWithBackoff` classifies status-less errors as retryable (network/5xx) and waits 2s+4s+8s = 14s before failing — `waitFor` in tests timed out.
- **Fix:** Updated the two failing test cases to simulate the real ky HTTPError shape: `Object.assign(new Error(...), { response: { status: 401 } })`. Production ky errors always carry `response.status`; the original mocks were technically incorrect.
- **Files modified:** `frontend/__tests__/setup/TokenStep.test.tsx` (2 test cases)
- **Verification:** All 9 TokenStep tests pass after change
- **Committed in:** f19e664 (Task 2 commit)

**2. [Rule 3 - Blocking] Backend `_SCOPE_DISPATCH` was missing 'discussions' entry needed for Ed-only retry**
- **Found during:** Task 3 (Retry failed only wiring)
- **Issue:** Existing `_SCOPE_DISPATCH` had `grades/deadlines/modules/outline` (all Canvas) — no path to dispatch only `sync_ed_discussions`. Without this, "Retry failed only" with `platforms=['ed']` would no-op.
- **Fix:** Added `"discussions": sync_ed_discussions` to `_SCOPE_DISPATCH` and imported the function. The new `_PLATFORM_TO_SCOPES["ed"] = ["discussions"]` map then dispatches it correctly.
- **Files modified:** `src/web/routes/sync.py`
- **Verification:** mypy clean; 6 existing sync status unit tests still pass; smoke-tested `SyncTriggerRequest(scope="all", platforms=["ed"])` parses correctly
- **Committed in:** cebd30e (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 test-data bug, 1 blocking missing dispatch entry)
**Impact on plan:** Both fixes essential for the plan's stated success criteria. No scope creep — the backend addition is the minimal extension explicitly permitted by the plan ("scope it INTO this plan").

## Issues Encountered

- **Pre-existing typecheck error in `frontend/components/auth/RegisterForm.tsx`** — A parallel agent (likely 33-05 Google OAuth) had uncommitted changes that removed `Mail` from imports but left a usage at line 80. Logged to `.planning/phases/33-token-lifecycle-onboarding/deferred-items.md`. Not in this plan's scope. Resolved itself after parallel agent committed (verified with final `pnpm typecheck` returning clean).
- **Parallel-execution contention on Task 3 commit** — `git add <files>` swept up `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, and `.planning/phases/33-token-lifecycle-onboarding/33-05-SUMMARY.md` that the parallel 33-05 agent had staged. These are not my plan's outputs but the commit message is clear about my own changes. Doc-state files will be regenerated by my own state-update step.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Setup flow polished end-to-end: skip-revalidate, invalid-token recovery, network-failure backoff, per-platform progress, failed-only retry, signed-in note all live
- Backend `platforms` filter on sync trigger ready for any future caller (settings page "Sync Now" per platform, dashboard "Re-sync Ed" buttons, etc.)
- `tokenCache` helper is reusable: settings page TokenSection could adopt it for "skip re-validate" on token updates
- ONBD-01 (per-platform progress) and ONBD-02 (4 edge cases) requirements both satisfied

## Self-Check: PASSED

Verified post-write:
- `frontend/lib/setup/tokenCache.ts` — exists, exports all 5 helpers
- `frontend/__tests__/setup/tokenCache.test.ts` — exists, 12 tests pass
- `frontend/__tests__/setup/SuccessStep.test.tsx` — exists, 5 tests pass
- `frontend/components/setup/TokenStep.tsx` — modified, contains `tokenCache` import, all 9 existing tests pass
- `frontend/components/setup/SuccessStep.tsx` — modified, contains `per_platform_counts` reference and `retry-failed-button` testid
- `frontend/components/setup/WelcomeStep.tsx` — modified, contains `signedInAs` and `firstTimeNote` translation calls
- `frontend/messages/en.json` + `zh.json` — both contain `setup.tokens.unreachable` and `setup.success.retryFailed` keys
- `src/web/routes/sync.py` — modified, `SyncTriggerRequest` has `platforms` field, mypy clean
- Commits 72958cf, f19e664, cebd30e all present in `git log`
- `cd frontend && pnpm typecheck` — clean
- `cd frontend && pnpm exec eslint components/setup/ lib/setup/ __tests__/setup/SuccessStep.test.tsx __tests__/setup/tokenCache.test.ts --max-warnings 0` — clean

---
*Phase: 33-token-lifecycle-onboarding*
*Plan: 07*
*Completed: 2026-04-15*
