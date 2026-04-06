---
phase: 29-sentry-hardening
plan: 02
subsystem: observability
tags: [sentry, csp, fastapi, security-headers, cors]

# Dependency graph
requires:
  - phase: 25-security-observability
    provides: Backend security headers and CSP policy in src/web/main.py
provides:
  - Dynamic CSP connect-src that includes CORS origins (Vercel frontend domain in production)
  - Extended backend Sentry test suite with CSP CORS origin verification
affects: [30-bff-proxy-conversion, 31-e2e-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic CSP construction from settings.cors_origins"

key-files:
  created: []
  modified:
    - src/web/main.py
    - tests/unit/test_sentry_init.py

key-decisions:
  - "CSP connect-src built dynamically from settings.cors_origins split by comma"
  - "Variable renamed from _SECURITY_HEADERS (module constant style) to _security_headers (local variable) since it is now dynamic per create_app() invocation"

patterns-established:
  - "Dynamic CSP: Build connect-src from settings.cors_origins at app creation time"

requirements-completed: [OBS-01, OBS-03]

# Metrics
duration: 4min
completed: 2026-04-06
---

# Phase 29 Plan 02: Backend CSP Dynamic CORS Origins Summary

**Dynamic CSP connect-src includes all CORS origins from settings, with 3 new TDD tests verifying single/multi-origin and retention of existing entries**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-06T03:09:42Z
- **Completed:** 2026-04-06T03:13:51Z
- **Tasks:** 1/2 (checkpoint pending for Task 2)
- **Files modified:** 2

## Accomplishments
- Backend CSP connect-src now dynamically includes all CORS origins (e.g., Vercel frontend domain in production)
- 3 new TDD tests added: single CORS origin, multiple comma-separated origins, and retention of existing CSP entries
- All 7 backend Sentry tests pass, ruff clean, mypy --strict clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Update backend CSP to include CORS origins and extend tests** - `487bfbd` (feat)
2. **Task 2: Verify Sentry projects created and DSN env vars configured** - CHECKPOINT PENDING (human-verify)

_Note: Task 2 is a human verification checkpoint requiring manual confirmation of Sentry project creation and DSN environment variable configuration in Railway/Vercel._

## Files Created/Modified
- `src/web/main.py` - Dynamic CSP connect-src construction from settings.cors_origins
- `tests/unit/test_sentry_init.py` - TestCspContainsCorsOrigins class with 3 test methods

## Decisions Made
- CSP connect-src built dynamically by splitting `settings.cors_origins` on commas and extending the connect-src parts list
- Renamed `_SECURITY_HEADERS` to `_security_headers` (lowercase) since it is now a dynamic local variable, not a module-level constant

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** Task 2 (human-verify checkpoint) requires:
- Sentry project `uniboard-api` exists under org `yuan-qin`
- Sentry project `uniboard-web` exists under org `yuan-qin`
- `SENTRY_DSN` configured in Railway environment variables
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` configured in Vercel environment variables

## Known Stubs

None -- no stubs or placeholders introduced.

## Next Phase Readiness
- Backend CSP is production-ready with dynamic CORS origin inclusion
- Pending: user confirmation of Sentry project creation and DSN env vars (Task 2 checkpoint)
- After checkpoint resolution, backend Sentry hardening is complete

---
*Phase: 29-sentry-hardening*
*Completed: 2026-04-06 (Task 1 only; Task 2 checkpoint pending)*
