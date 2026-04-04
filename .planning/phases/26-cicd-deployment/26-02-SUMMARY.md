---
phase: 26-cicd-deployment
plan: 02
subsystem: infra
tags: [railway, vercel, docker, deployment, env-vars, documentation]

# Dependency graph
requires:
  - phase: 22-critical-fixes
    provides: Dockerfile.production with multi-stage build, tini, non-root user
  - phase: 25-security-observability
    provides: /health endpoint returning 200/503, security headers, CORS config
provides:
  - "railway.toml config-as-code for Railway deployment"
  - "Updated frontend/.env.example with all production env vars"
  - "Bilingual deployment guide with complete env var tables for Railway and Vercel"
affects: [26-cicd-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Config-as-code deployment via railway.toml pointing to Dockerfile.production"]

key-files:
  created:
    - railway.toml
    - docs/deployment.md
  modified:
    - frontend/.env.example

key-decisions:
  - "Railway uses DOCKERFILE builder with existing Dockerfile.production rather than Nixpacks auto-detect"
  - "Sentry build-time vars commented out in .env.example since they are Vercel-only"
  - "Optional env vars documented separately from required ones for clarity"

patterns-established:
  - "Config-as-code: railway.toml at project root for Railway deployment configuration"
  - "Bilingual deployment docs: English section first, Chinese section mirrors, per project documentation rules"

requirements-completed: [OPS-02]

# Metrics
duration: 3min
completed: 2026-04-04
---

# Phase 26 Plan 02: Railway + Vercel Deployment Config Summary

**Railway DOCKERFILE deployment config with health checks, updated frontend .env.example, and bilingual deployment guide documenting all env vars for Railway + Vercel + Supabase**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-04T02:29:03Z
- **Completed:** 2026-04-04T02:32:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created railway.toml pointing to Dockerfile.production with /health check path, 120s timeout, and ON_FAILURE restart policy
- Updated frontend/.env.example with NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SENTRY_DSN, and Sentry build-time variables
- Created comprehensive bilingual deployment guide (docs/deployment.md) with complete env var tables, setup steps for Railway/Vercel/Supabase, production validation explanation, and troubleshooting section

## Task Commits

Each task was committed atomically:

1. **Task 1: Create railway.toml and update frontend .env.example** - `1bd0b59` (feat)
2. **Task 2: Create deployment documentation with complete env var guide** - `83db9d8` (docs)

## Files Created/Modified
- `railway.toml` - Railway deployment configuration pointing to Dockerfile.production with health check and restart policy
- `frontend/.env.example` - Updated with NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SENTRY_DSN, and commented Sentry build-time vars
- `docs/deployment.md` - Bilingual (EN+CN) production deployment guide with env var tables, setup steps, and troubleshooting

## Decisions Made
- Railway DOCKERFILE builder chosen over Nixpacks for full control (Dockerfile.production already exists with tini, non-root user, multi-stage build)
- Sentry build-time vars (SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT) commented out in .env.example since they are only needed in Vercel env vars, not local development
- Optional env vars with defaults documented in a separate table from required vars for deployment clarity
- Production validation (model_post_init) documented in deployment guide so operators understand startup failures

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required at this stage. The deployment guide documents the manual steps needed when the user is ready to deploy.

## Next Phase Readiness
- Railway deployment config ready - will auto-deploy when GitHub repo is linked to Railway
- Frontend env template ready for Vercel deployment
- Deployment guide provides complete reference for production setup
- Phase 26 Plan 03 (Sentry integration) can proceed independently

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 26-cicd-deployment*
*Completed: 2026-04-04*
