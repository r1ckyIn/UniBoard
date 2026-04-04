---
phase: 26-cicd-deployment
plan: 03
subsystem: infra
tags: [sentry, error-tracking, fastapi, nextjs, csp, monitoring]

# Dependency graph
requires:
  - phase: 25-security-observability
    provides: CSP security headers in both backend and frontend
provides:
  - Sentry error tracking for Python FastAPI backend (conditional on DSN)
  - Sentry error tracking for Next.js frontend with App Router instrumentation
  - CSP connect-src updated to allow Sentry ingest domain in both stacks
  - 4 unit tests for Sentry initialization and CSP validation
affects: [production-deployment, monitoring, debugging]

# Tech tracking
tech-stack:
  added: [sentry-sdk 2.54.0 (Python), "@sentry/nextjs 10.47.0 (npm)"]
  patterns: [conditional-sdk-init, instrumentation-client-pattern, withSentryConfig-outermost-wrapper]

key-files:
  created:
    - frontend/instrumentation-client.ts
    - frontend/sentry.server.config.ts
    - frontend/sentry.edge.config.ts
    - frontend/instrumentation.ts
    - tests/unit/test_sentry_init.py
  modified:
    - pyproject.toml
    - uv.lock
    - src/config.py
    - src/web/main.py
    - frontend/package.json
    - frontend/pnpm-lock.yaml
    - frontend/next.config.ts
    - .gitignore

key-decisions:
  - "Sentry init is conditional -- app works normally when DSN is not set (empty string default)"
  - "withSentryConfig is outermost wrapper in next.config.ts chain (Sentry > next-intl > nextConfig)"
  - "10% traces_sample_rate in production, 100% in development"
  - "sendDefaultPii=false for GDPR safety"
  - "silent: !process.env.CI suppresses noisy source map upload logs during local dev"

patterns-established:
  - "Conditional SDK init: check settings field before calling sdk.init() to allow graceful degradation"
  - "Next.js 15 instrumentation pattern: instrumentation-client.ts for browser, instrumentation.ts register() for server/edge"

requirements-completed: [OPS-03]

# Metrics
duration: 6min
completed: 2026-04-04
---

# Phase 26 Plan 03: Sentry Integration Summary

**Sentry error tracking integrated into both Python FastAPI backend and Next.js frontend with conditional initialization, CSP updates, and 4 unit tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-04T02:36:39Z
- **Completed:** 2026-04-04T02:43:07Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Installed sentry-sdk[fastapi] for Python backend with conditional init in create_app()
- Installed @sentry/nextjs and created 4 instrumentation files for Next.js App Router
- Updated CSP connect-src in both backend and frontend to allow *.ingest.sentry.io
- Added 4 passing unit tests: DSN default, CSP header, conditional init (skip/call)
- Frontend builds cleanly with Sentry config wrapper

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Sentry SDKs and create Python backend integration** - `2aac411` (feat)
2. **Task 2: Create Next.js Sentry integration with instrumentation files and config wrapper** - `af847ba` (feat)

## Files Created/Modified
- `pyproject.toml` - Added sentry-sdk[fastapi] dependency and mypy override
- `uv.lock` - Updated lockfile with sentry-sdk and transitive deps
- `src/config.py` - Added sentry_dsn: str = "" field to Settings class
- `src/web/main.py` - Added sentry_sdk.init() conditional block + CSP connect-src update
- `.gitignore` - Added .sentryclirc and sentry.properties
- `tests/unit/test_sentry_init.py` - 4 tests for Sentry initialization and CSP
- `frontend/package.json` - Added @sentry/nextjs dependency
- `frontend/pnpm-lock.yaml` - Updated lockfile
- `frontend/next.config.ts` - Wrapped with withSentryConfig, updated CSP connect-src
- `frontend/instrumentation-client.ts` - Browser-side Sentry init with router transition tracking
- `frontend/sentry.server.config.ts` - Node.js server-side Sentry init
- `frontend/sentry.edge.config.ts` - Edge runtime Sentry init
- `frontend/instrumentation.ts` - Next.js register() hook loading server/edge configs + onRequestError

## Decisions Made
- Sentry init is conditional on DSN presence -- app works normally without Sentry configured
- withSentryConfig must be outermost wrapper (Sentry > next-intl > nextConfig) per Sentry docs
- 10% traces_sample_rate in production to balance visibility vs cost
- sendDefaultPii=false across both stacks for GDPR compliance
- Added sentry_sdk to mypy ignore_missing_imports list (no type stubs available)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added sentry_sdk to mypy overrides**
- **Found during:** Task 1 (Python backend integration)
- **Issue:** sentry_sdk has no type stubs, mypy --strict would fail on import
- **Fix:** Added sentry_sdk and sentry_sdk.* to [[tool.mypy.overrides]] ignore_missing_imports
- **Files modified:** pyproject.toml
- **Verification:** uv run mypy --strict src/config.py src/web/main.py passes
- **Committed in:** 2aac411 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for mypy --strict compliance. No scope creep.

## Issues Encountered
- Build warnings about `import-in-the-middle` and `require-in-the-middle` packages from OpenTelemetry/Sentry with Turbopack -- these are known Turbopack bundling warnings and do not affect functionality. Build completes successfully.

## Known Stubs
None -- all Sentry initialization is wired to environment variables (SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN). The app functions normally without them set.

## User Setup Required
To enable Sentry in production:
1. Create Sentry projects for Python and Next.js at sentry.io
2. Set `SENTRY_DSN` env var on Railway (Python backend)
3. Set `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` on Vercel (frontend)

## Next Phase Readiness
- Sentry integration complete for both stacks
- All CI/CD and deployment configuration for Phase 26 is now complete (plans 01-03)
- Ready for production deployment when platform accounts are set up

## Self-Check: PASSED

- All 5 created files exist on disk
- Both task commits (2aac411, af847ba) found in git log

---
*Phase: 26-cicd-deployment*
*Completed: 2026-04-04*
