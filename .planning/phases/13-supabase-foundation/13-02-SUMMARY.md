---
phase: 13-supabase-foundation
plan: 02
subsystem: auth, infra
tags: [supabase, jwt, fastapi, sqlalchemy, docker, aes-256-gcm]

# Dependency graph
requires:
  - phase: 13-supabase-foundation
    provides: "Supabase CLI migrations, RLS policies, profiles table (Plan 01)"
provides:
  - "Supabase JWT validation (decode_supabase_jwt, get_current_user_id)"
  - "Profile model replacing User model (profiles table, no email/password)"
  - "Docker Compose for Python backend connecting to local Supabase"
  - "AES-256-GCM encryption unit tests"
  - "All routes use get_current_user_id (UUID) instead of get_current_user (User object)"
affects: [14-platform-adapters, frontend-auth-hooks, sync-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase JWT validation via pyjwt with audience=authenticated"
    - "Profile model PK matches auth.users(id) -- no auto-generated UUID"
    - "Routes use get_current_user_id -> uuid.UUID dependency, fetch Profile from DB when needed"
    - "Email delivery queries auth.users directly via raw SQL (not via Profile model)"

key-files:
  created:
    - tests/unit/test_supabase_auth.py
    - tests/unit/test_encryption.py
    - Dockerfile
  modified:
    - src/security/auth.py
    - src/config.py
    - src/models/user.py
    - src/models/course.py
    - src/models/digest.py
    - src/models/notification.py
    - src/models/push_record.py
    - src/models/whatif.py
    - src/web/main.py
    - docker-compose.yml

key-decisions:
  - "Profile model has no email field -- email managed by auth.users, queried via raw SQL when needed"
  - "All routes use get_current_user_id (UUID) instead of full User object dependency"
  - "UserResponse schema drops email field since Profile model no longer has it"
  - "Notification email delivery queries auth.users table directly for email address"

patterns-established:
  - "Supabase JWT auth: HTTPBearer -> decode_supabase_jwt -> get_current_user_id"
  - "Profile fetching: routes that need profile attributes do session.get(Profile, user_id)"
  - "Docker Compose backend uses host.docker.internal to reach local Supabase services"

requirements-completed: [INFRA-07, INFRA-08, INFRA-09]

# Metrics
duration: 14min
completed: 2026-03-26
---

# Phase 13 Plan 02: Python Backend Supabase Adaptation Summary

**Supabase JWT validation with Profile model, Docker Compose backend, and AES-256-GCM encryption tests**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-26T03:09:42Z
- **Completed:** 2026-03-26T03:23:42Z
- **Tasks:** 3
- **Files modified:** 35

## Accomplishments
- Supabase JWT validation replaces self-signed JWT (6 auth tests + 3 encryption tests pass)
- Profile model replaces User model across all 5 referencing models, all services, and sync engine
- Docker Compose backend service connects to local Supabase DB via host.docker.internal
- Old auth code fully removed: password.py, register/login/refresh endpoints, secret_key config

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD tests and security/config rewrite** - `f6cec72` (test)
2. **Task 2: Profile model, all references, routes** - `bad363f` (feat)
3. **Task 3: Dockerfile and Docker Compose** - `7d27a26` (chore)

_Note: Task 1 was TDD (RED -> GREEN in single commit since scope was clear)_

## Files Created/Modified
- `tests/unit/test_supabase_auth.py` - 6 JWT validation tests (valid, expired, wrong secret, wrong audience, valid user_id, missing bearer)
- `tests/unit/test_encryption.py` - 3 AES-256-GCM tests (round-trip, wrong key, canary check)
- `src/security/auth.py` - Rewritten: decode_supabase_jwt + get_current_user_id (Supabase JWT)
- `src/config.py` - Added supabase_url, supabase_jwt_secret, supabase_service_role_key; removed secret_key and token expire fields
- `src/security/password.py` - DELETED (Supabase Auth handles password hashing)
- `src/models/user.py` - User -> Profile, removed email/hashed_password, tablename profiles
- `src/models/course.py` - ForeignKey profiles.id, relationship Profile
- `src/models/digest.py` - ForeignKey profiles.id, relationship Profile
- `src/models/notification.py` - ForeignKey profiles.id, relationship Profile
- `src/models/push_record.py` - ForeignKey profiles.id, relationship Profile
- `src/models/whatif.py` - ForeignKey profiles.id, relationship Profile
- `src/models/__init__.py` - Export Profile instead of User
- `src/schemas/user.py` - Removed email from UserResponse
- `src/web/main.py` - CORS origin changed to localhost:3001
- `src/web/deps.py` - Re-export get_current_user_id instead of get_current_user
- `src/web/routes/auth.py` - Removed register/login/refresh, added GET /me with Profile query
- `src/web/routes/*.py` - All 10 route files updated to use get_current_user_id
- `src/services/*.py` - All 6 service files updated User -> Profile
- `src/sync/tasks.py` - All User references -> Profile
- `Dockerfile` - Python 3.12-slim + uv, uvicorn entrypoint, healthcheck
- `docker-compose.yml` - Backend service connecting to local Supabase at port 54322

## Decisions Made
- Profile model has no email field -- email is managed exclusively by Supabase auth.users table. For email delivery (notifications), raw SQL query to auth.users is used.
- All route handlers switched from `current_user: User = Depends(get_current_user)` to `current_user_id: uuid.UUID = Depends(get_current_user_id)`. Routes needing profile attributes fetch it from DB.
- UserResponse schema drops email field since Profile model no longer has it.
- Docker backend uses `host.docker.internal` to reach Supabase services running on host machine.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated all route files to use get_current_user_id in Task 1**
- **Found during:** Task 1 (tests wouldn't run because conftest imports create_app which cascades through routes)
- **Issue:** Removing `get_current_user` from auth.py broke all route imports via deps.py
- **Fix:** Updated all 10 route files and deps.py to use `get_current_user_id` (pulled forward from Task 2 scope)
- **Files modified:** src/web/deps.py, all src/web/routes/*.py
- **Verification:** All 9 unit tests pass
- **Committed in:** f6cec72 (Task 1 commit)

**2. [Rule 3 - Blocking] Updated all service files and sync/tasks.py User -> Profile in Task 2**
- **Found during:** Task 2 (import chain would break since User class no longer exists)
- **Issue:** 6 service files and sync/tasks.py imported User which was renamed to Profile
- **Fix:** Updated all import statements and variable references across services and sync engine
- **Files modified:** src/services/qa.py, notification.py, digest.py, materials.py, risk_alert.py, intelligence.py, src/sync/tasks.py
- **Verification:** All imports work, tests pass
- **Committed in:** bad363f (Task 2 commit)

**3. [Rule 2 - Missing Critical] Updated notification email delivery for Supabase auth model**
- **Found during:** Task 2 (notification service accessed user.email which no longer exists on Profile)
- **Issue:** Email delivery code referenced `user.email` but Profile model has no email field
- **Fix:** Changed to raw SQL query against `auth.users` table to get email address
- **Files modified:** src/services/notification.py
- **Verification:** Import chain works, fire-and-forget pattern preserved
- **Committed in:** bad363f (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical)
**Impact on plan:** All auto-fixes necessary to maintain working import chain after User->Profile rename. No scope creep.

## Issues Encountered
- Task 1 tests couldn't run initially because conftest.py imports `create_app()` which cascades through all route files. Removing `get_current_user` from auth.py meant all route imports had to be updated in Task 1 rather than deferring to Task 2. This expanded Task 1's scope but was the only way to get tests running.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Python backend validates Supabase JWTs and connects to Supabase PostgreSQL
- Docker Compose ready for local dev with `supabase start` + `docker compose up backend`
- Plan 03 (frontend auth migration) can proceed -- backend API now expects Supabase JWT tokens
- Phase 14 (Platform Adapters) can use Profile model for token storage/retrieval

## Self-Check: PASSED

All files exist, all commits verified, password.py confirmed deleted.

---
*Phase: 13-supabase-foundation*
*Completed: 2026-03-26*
