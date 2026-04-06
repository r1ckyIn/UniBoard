---
phase: 29-sentry-hardening
verified: 2026-04-06T14:25:00Z
status: passed
score: 8/8 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 6/8
  gaps_closed:
    - "Backend CSP connect-src includes Vercel frontend domain derived from CORS_ORIGINS"
    - "Sentry projects uniboard-api and uniboard-web exist under org yuan-qin (human approved)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Trigger an error in production and verify it appears in Sentry"
    expected: "Error event with de-minified stack trace in Sentry dashboard"
    why_human: "End-to-end error flow requires deployed app and Sentry UI"
  - test: "Check browser console for CSP violations on deployed app"
    expected: "No CSP violation errors in DevTools Console"
    why_human: "Requires browser with deployed production app"
---

# Phase 29: Sentry Hardening Verification Report

**Phase Goal:** Error tracking captures both backend and frontend errors in production with correct CSP policies
**Verified:** 2026-04-06T14:25:00Z
**Status:** passed
**Re-verification:** Yes -- after gap closure (commit 23f2243 fixes backend CSP; human approved Sentry projects/DSN)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Frontend errors are captured and sent to Sentry when DSN is configured | VERIFIED | `frontend/instrumentation-client.ts` contains `Sentry.init({dsn, ...})` inside `if (dsn)` guard. 14 tests pass covering init, config values, noise filtering. |
| 2 | Frontend Sentry does NOT initialize when DSN is empty (zero cost in dev) | VERIFIED | `if (dsn)` guard at line 5 of `instrumentation-client.ts`. Tests explicitly verify `mockInit.not.toHaveBeenCalled()` for empty and undefined DSN. |
| 3 | CSP connect-src includes Railway backend domain dynamically from NEXT_PUBLIC_API_URL | VERIFIED | `frontend/next.config.ts` lines 8-19: reads `NEXT_PUBLIC_API_URL`, extracts origin via `new URL().origin`, includes in connectSrc array with `.filter(Boolean)`. 4 CSP tests pass. |
| 4 | Source maps are uploaded to Sentry at build time and deleted from client bundles | VERIFIED | `frontend/next.config.ts` lines 49-58: `withSentryConfig` wrapper with `sourcemaps: { deleteSourcemapsAfterUpload: true }`, `widenClientFileUpload: true`, `authToken: process.env.SENTRY_AUTH_TOKEN`. |
| 5 | Error boundaries report exceptions to Sentry before displaying fallback UI | VERIFIED | `frontend/app/global-error.tsx` line 14: `Sentry.captureException(error)` before `console.error`. `frontend/app/[locale]/error.tsx` line 17: same pattern. Both import `@sentry/nextjs`. |
| 6 | Backend CSP connect-src includes Vercel frontend domain derived from CORS_ORIGINS | VERIFIED | `src/web/main.py` lines 108-115: `connect_src_parts` list built with static entries, then `connect_src_parts.extend(origins)` where `origins` is derived from `settings.cors_origins.split(",")` at line 73. Line 129: `f"connect-src {connect_src}"` injects dynamic value into CSP header. Commit 23f2243 implements this fix. 3 new tests in `TestCspContainsCorsOrigins` class all pass. |
| 7 | Existing backend Sentry conditional init and catch-all handler remain unchanged | VERIFIED | `src/web/main.py` lines 65-71: `if settings.sentry_dsn: sentry_sdk.init(...)` unchanged. Line 162: `sentry_sdk.capture_exception(exc)` in catch-all handler unchanged. |
| 8 | Sentry projects uniboard-api and uniboard-web exist under org yuan-qin | VERIFIED | Human approved. SUMMARY 29-02 documents checkpoint as approved (commit 3418f0f). User confirmed Sentry projects created and DSN env vars configured in Railway and Vercel. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/instrumentation-client.ts` | Client Sentry init with noise filtering | VERIFIED | 36 lines, contains `Sentry.init`, `beforeSend`, `ignoreErrors`, `replayIntegration`, conditional `if (dsn)` guard |
| `frontend/sentry.server.config.ts` | Server-side Sentry init | VERIFIED | 12 lines, contains `Sentry.init` with conditional DSN guard |
| `frontend/sentry.edge.config.ts` | Edge runtime Sentry init | VERIFIED | 12 lines, identical structure to server config |
| `frontend/instrumentation.ts` | Next.js instrumentation hook | VERIFIED | 12 lines, `register()` with dynamic imports for server/edge, `onRequestError` export |
| `frontend/next.config.ts` | Sentry plugin + dynamic CSP | VERIFIED | 58 lines, `withSentryConfig` wrapper, dynamic `connectSrc` from `NEXT_PUBLIC_API_URL`, `deleteSourcemapsAfterUpload: true` |
| `frontend/app/global-error.tsx` | Sentry.captureException | VERIFIED | Line 14: `Sentry.captureException(error)` in useEffect |
| `frontend/app/[locale]/error.tsx` | Sentry.captureException | VERIFIED | Line 17: `Sentry.captureException(error)` in useEffect |
| `frontend/__tests__/sentry/sentry-init.test.ts` | Tests for conditional Sentry init | VERIFIED | 171 lines, 14 test cases covering init, config values, beforeSend filtering, ignoreErrors |
| `frontend/__tests__/sentry/csp-headers.test.ts` | Tests for CSP connect-src | VERIFIED | 78 lines, 4 test cases covering API URL inclusion, existing entries retention, empty URL handling |
| `src/web/main.py` | Dynamic CSP with CORS origins | VERIFIED | Lines 108-115: `connect_src_parts.extend(origins)` dynamically adds CORS origins to connect-src. Fix delivered in commit 23f2243. |
| `tests/unit/test_sentry_init.py` | Extended tests with TestCspContainsCorsOrigins | VERIFIED | 142 lines, 7 tests total. `TestCspContainsCorsOrigins` class at line 42 with 3 test methods: `test_csp_contains_cors_origin`, `test_csp_contains_multiple_cors_origins`, `test_csp_retains_existing_entries_with_cors`. All pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `frontend/instrumentation.ts` | `frontend/sentry.server.config.ts` | `import("./sentry.server.config")` in register() | WIRED | Line 5: `await import("./sentry.server.config")` |
| `frontend/instrumentation.ts` | `frontend/sentry.edge.config.ts` | `import("./sentry.edge.config")` in register() | WIRED | Line 8: `await import("./sentry.edge.config")` |
| `frontend/next.config.ts` | `@sentry/nextjs` | `withSentryConfig` wrapper | WIRED | Line 2: import, Line 49: `withSentryConfig(withNextIntl(nextConfig), {...})` |
| `frontend/app/global-error.tsx` | `@sentry/nextjs` | `Sentry.captureException` | WIRED | Line 3: import, Line 14: `Sentry.captureException(error)` |
| `frontend/app/[locale]/error.tsx` | `@sentry/nextjs` | `Sentry.captureException` | WIRED | Line 3: import, Line 17: `Sentry.captureException(error)` |
| `src/web/main.py` | `src/config.py` | `settings.cors_origins` in CSP | WIRED | Line 73: `origins` built from `settings.cors_origins`. Line 114: `connect_src_parts.extend(origins)` injects into CSP. Previously NOT_WIRED, now fixed by commit 23f2243. |

### Data-Flow Trace (Level 4)

Not applicable -- Sentry config files and CSP are infrastructure/configuration, not dynamic data rendering components.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Frontend Sentry tests pass | `cd frontend && pnpm vitest run __tests__/sentry/` | 18/18 tests pass | PASS |
| Backend Sentry tests pass | `uv run pytest tests/unit/test_sentry_init.py -x -v` | 7/7 tests pass (was 4/4, now 7/7 with 3 new CORS tests) | PASS |
| TypeScript compiles clean | `cd frontend && pnpm tsc --noEmit` | Exit 0, no errors | PASS |
| ruff clean on backend changes | `uv run ruff check src/web/main.py tests/unit/test_sentry_init.py` | All checks passed | PASS |
| mypy --strict clean on backend | `uv run mypy --strict src/web/main.py tests/unit/test_sentry_init.py` | Success: no issues found in 2 source files | PASS |
| No hideSourceMaps (deprecated) | `grep -r "hideSourceMaps" frontend/` | No matches | PASS |
| @sentry/nextjs in package.json | `grep "@sentry/nextjs" frontend/package.json` | `"@sentry/nextjs": "^10.47.0"` | PASS |
| Backend CSP contains CORS origins | `grep "extend(origins)" src/web/main.py` | Line 114: `connect_src_parts.extend(origins)` | PASS |
| Backend test has TestCspContainsCorsOrigins | `grep "TestCspContainsCorsOrigins" tests/unit/test_sentry_init.py` | Line 42: class definition found | PASS |
| Commit 23f2243 exists and modifies correct files | `git show --stat 23f2243` | 2 files changed: src/web/main.py (+76/-3), tests/unit/test_sentry_init.py (+63) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| OBS-01 | 29-02 | Sentry Python (FastAPI) project created, DSN configured in Railway env vars | SATISFIED | Backend Sentry init code exists (`src/web/main.py` lines 65-71). Human confirmed Sentry project created and DSN configured in Railway. |
| OBS-02 | 29-01 | Sentry Next.js project created, DSN configured in Vercel env vars | SATISFIED | Frontend Sentry SDK installed and fully configured. Human confirmed Sentry project created and DSN configured in Vercel. |
| OBS-03 | 29-01, 29-02 | Frontend CSP connect-src includes Railway backend domain and Sentry ingest domain | SATISFIED | Frontend: `next.config.ts` dynamically includes `NEXT_PUBLIC_API_URL` origin and `*.ingest.sentry.io`. Backend: `src/web/main.py` dynamically includes `settings.cors_origins` in connect-src (fixed by commit 23f2243). Both sides now have synchronized dynamic CSP. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none found) | - | - | - | Both frontend and backend implementations are clean with no TODOs, placeholders, or stubs |

### Human Verification Recommended (Post-Deployment)

### 1. End-to-End Error Capture

**Test:** Trigger an error on the deployed app (e.g., navigate to a non-existent route or use browser console to throw)
**Expected:** Error event appears in Sentry dashboard with de-minified stack trace (if source maps uploaded)
**Why human:** End-to-end error flow requires deployed app and Sentry UI

### 2. No CSP Violations in Production

**Test:** Open deployed app in browser, open DevTools Console, navigate through pages
**Expected:** No CSP violation errors logged
**Why human:** Requires browser with deployed production app

### Gaps Summary

**All gaps from initial verification have been resolved.**

**Gap 1 (CLOSED): Backend CSP now includes CORS origins**

Commit `23f2243` adds `connect_src_parts.extend(origins)` to `src/web/main.py` lines 108-115, dynamically building the CSP connect-src directive from `settings.cors_origins`. Three new tests in `TestCspContainsCorsOrigins` verify single origin, multiple origins, and retention of existing entries. All 7 backend Sentry tests pass. ruff and mypy --strict clean.

**Gap 2 (CLOSED): Sentry project/DSN verified by human**

User confirmed Sentry projects (uniboard-api, uniboard-web) exist under org yuan-qin and DSN environment variables are configured in Railway and Vercel deployment platforms.

---

_Verified: 2026-04-06T14:25:00Z_
_Verifier: Claude (gsd-verifier)_
