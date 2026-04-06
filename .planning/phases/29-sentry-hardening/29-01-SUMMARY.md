---
phase: 29-sentry-hardening
plan: 01
subsystem: observability
tags: [sentry, nextjs, error-tracking, csp, source-maps, replay]

# Dependency graph
requires:
  - phase: 25-security-observability
    provides: "Security headers and CSP baseline in next.config.ts"
  - phase: 26-cicd-deployment
    provides: "Vercel deployment with env var configuration"
provides:
  - "@sentry/nextjs v10.47.0 installed with conditional init (zero-cost in dev)"
  - "4 Sentry config files (client, server, edge, instrumentation)"
  - "Noise filtering via beforeSend (ChunkLoadError, NetworkError) and ignoreErrors (ResizeObserver)"
  - "Session replay on error (replaysOnErrorSampleRate: 1.0)"
  - "Dynamic CSP connect-src including NEXT_PUBLIC_API_URL origin"
  - "Source map upload to Sentry at build time with auto-delete"
  - "Error boundaries report to Sentry via captureException"
affects: [30-bff-proxy-conversion, 31-e2e-verification-ai-config]

# Tech tracking
tech-stack:
  added: ["@sentry/nextjs v10.47.0"]
  patterns: ["Conditional Sentry init (skip when DSN empty)", "Plugin composition (withSentryConfig outermost)", "Dynamic CSP from env vars"]

key-files:
  created:
    - "frontend/instrumentation-client.ts"
    - "frontend/sentry.server.config.ts"
    - "frontend/sentry.edge.config.ts"
    - "frontend/instrumentation.ts"
    - "frontend/__tests__/sentry/sentry-init.test.ts"
    - "frontend/__tests__/sentry/csp-headers.test.ts"
  modified:
    - "frontend/next.config.ts"
    - "frontend/app/global-error.tsx"
    - "frontend/app/[locale]/error.tsx"
    - "frontend/package.json"

key-decisions:
  - "Used instrumentation-client.ts (not sentry.client.config.ts) per current SDK v10.x naming convention"
  - "Set replaysSessionSampleRate: 0 and replaysOnErrorSampleRate: 1.0 for cost-effective error debugging"
  - "Used silent: !process.env.CI to show Sentry build output only in CI pipelines"

patterns-established:
  - "Conditional Sentry init: check DSN env var before calling Sentry.init() (mirrors backend pattern)"
  - "Dynamic CSP: read NEXT_PUBLIC_API_URL at build time, extract origin with new URL().origin"
  - "Plugin composition order: withSentryConfig(withNextIntl(nextConfig)) -- Sentry outermost"

requirements-completed: [OBS-02, OBS-03]

# Metrics
duration: 5min
completed: 2026-04-06
---

# Phase 29 Plan 01: Frontend Sentry Integration Summary

**@sentry/nextjs v10.47.0 with conditional init, noise filtering (ChunkLoadError/NetworkError/ResizeObserver), session replay on error, dynamic CSP for Railway backend domain, and source map upload at build time**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-06T03:09:40Z
- **Completed:** 2026-04-06T03:15:13Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Installed @sentry/nextjs v10.47.0 with all 4 required config files using current SDK naming (instrumentation-client.ts, not deprecated sentry.client.config.ts)
- Conditional init: Sentry only initializes when NEXT_PUBLIC_SENTRY_DSN is set, zero overhead in development
- Noise filtering: beforeSend drops ChunkLoadError and NetworkError; ignoreErrors filters ResizeObserver loop messages
- Dynamic CSP connect-src reads NEXT_PUBLIC_API_URL at build time and includes the Railway backend origin
- Both error boundaries (global-error.tsx, [locale]/error.tsx) report exceptions to Sentry via captureException
- 18 unit tests covering all Sentry init behavior, filtering logic, and CSP construction

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @sentry/nextjs, create Sentry config files, and write tests** - `4251a37` (feat)
2. **Task 2: Update next.config.ts with Sentry wrapper and dynamic CSP, integrate error boundaries** - `26dd0d4` (feat)

## Files Created/Modified
- `frontend/instrumentation-client.ts` - Client-side Sentry init with noise filtering and replay config
- `frontend/sentry.server.config.ts` - Server-side Sentry init with conditional DSN guard
- `frontend/sentry.edge.config.ts` - Edge runtime Sentry init with conditional DSN guard
- `frontend/instrumentation.ts` - Next.js instrumentation hook for server/edge Sentry registration
- `frontend/next.config.ts` - Added withSentryConfig wrapper, dynamic CSP connect-src, source map upload options
- `frontend/app/global-error.tsx` - Added Sentry.captureException in error useEffect
- `frontend/app/[locale]/error.tsx` - Added Sentry.captureException in error useEffect
- `frontend/package.json` - Added @sentry/nextjs dependency
- `frontend/__tests__/sentry/sentry-init.test.ts` - 14 tests for conditional init, config values, noise filtering
- `frontend/__tests__/sentry/csp-headers.test.ts` - 4 tests for CSP connect-src construction

## Decisions Made
- Used `instrumentation-client.ts` file name (not deprecated `sentry.client.config.ts`) per Sentry SDK v10.x official docs
- Set `replaysSessionSampleRate: 0` with `replaysOnErrorSampleRate: 1.0` -- only capture replays on errors to minimize cost
- Used `silent: !process.env.CI` so Sentry webpack plugin output only shows in CI, silent during local dev
- Did NOT set `hideSourceMaps: true` (removed in SDK v9, now default behavior)
- Created `sentry.edge.config.ts` despite no current edge functions for future-proofing (3 lines of code)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed NODE_ENV read-only TypeScript error in test file**
- **Found during:** Task 2 (verification step)
- **Issue:** `process.env.NODE_ENV = "production"` fails tsc --noEmit because NODE_ENV is typed as read-only
- **Fix:** Cast to `(process.env as Record<string, string>).NODE_ENV = "production"`
- **Files modified:** `frontend/__tests__/sentry/sentry-init.test.ts`
- **Verification:** `pnpm tsc --noEmit` exits 0
- **Committed in:** 26dd0d4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor type assertion fix for test compatibility. No scope creep.

## Issues Encountered
None.

## Known Stubs
None -- all Sentry configuration is fully wired. DSN must be set via environment variables on Vercel/Railway for production use (documented in user_setup section of the plan).

## User Setup Required

**External services require manual configuration.** Per the plan's `user_setup` section:
- Set `NEXT_PUBLIC_SENTRY_DSN` in Vercel environment variables (from Sentry Dashboard -> Client Keys)
- Set `SENTRY_AUTH_TOKEN` in Vercel environment variables (for build-time source map upload)
- `SENTRY_ORG=yuan-qin` and `SENTRY_PROJECT=uniboard-web` can be hardcoded or set as env vars

## Next Phase Readiness
- Frontend Sentry integration complete -- errors will flow to Sentry once DSN is configured on Vercel
- CSP dynamically includes Railway backend domain via NEXT_PUBLIC_API_URL
- Ready for Plan 02 (backend CSP update) and Phase 30 (BFF proxy conversion)

## Self-Check: PASSED

- All 7 key files: FOUND
- Both commits (4251a37, 26dd0d4): FOUND
- No sentry.client.config.ts: CONFIRMED
- No hideSourceMaps: CONFIRMED

---
*Phase: 29-sentry-hardening*
*Completed: 2026-04-06*
