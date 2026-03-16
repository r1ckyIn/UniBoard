---
phase: 01-foundation-data-acquisition
plan: "02"
subsystem: auth
tags: [pyjwt, bcrypt, passlib, fastapi, oauth2, jwt, pydantic-v2]

# Dependency graph
requires:
  - phase: 01-01
    provides: "User ORM model, Settings, get_session, TokenEncryption, FastAPI app factory, SuccessResponse/ErrorResponse envelope"
provides:
  - "Password hashing (hash_password, verify_password) via passlib CryptContext"
  - "JWT creation/validation (create_access_token, create_refresh_token, decode_access_token) with PyJWT"
  - "OAuth2PasswordBearer scheme + get_current_user FastAPI dependency"
  - "Auth endpoints: POST /auth/register, /auth/login, /auth/refresh"
  - "User profile endpoints: GET/PATCH /users/me, PUT/DELETE /users/me/tokens/{platform}"
  - "Health check: GET /health with DB connectivity status"
  - "15 integration tests validating full auth flow (SC-2)"
affects: [01-03-adapters, 02-services-api, 03-frontend]

# Tech tracking
tech-stack:
  added: [types-passlib]
  patterns: [oauth2-password-form, jwt-jti-uniqueness, per-test-session-override, request-meta-helper]

key-files:
  created:
    - src/security/password.py
    - src/security/auth.py
    - src/schemas/auth.py
    - src/schemas/user.py
    - src/web/deps.py
    - src/web/routes/__init__.py
    - src/web/routes/auth.py
    - src/web/routes/users.py
    - src/web/routes/health.py
    - tests/integration/test_auth.py
    - alembic/versions/1eb0cbc46f28_add_display_name_to_users.py
  modified:
    - src/models/user.py
    - src/web/main.py
    - tests/conftest.py
    - pyproject.toml

key-decisions:
  - "JWT jti claim (uuid4) added to ensure token uniqueness even within same second"
  - "B008 ruff rule suppressed for src/web/ since FastAPI Depends() requires function calls in defaults"
  - "OAuth2PasswordRequestForm used for login (form data, not JSON) for OAuth2 compatibility"
  - "Token validation hits real Canvas/Ed APIs via httpx (not adapters) for simplicity"
  - "Health endpoint at root /health (not /api/v1/health) per TRD SS12.10"

patterns-established:
  - "get_request_meta(request) helper for building MetaInfo from request context"
  - "test_client fixture with dependency override for per-test session rollback"
  - "Router aggregation in routes/__init__.py with api_router (prefixed) + health_router (root)"
  - "Token type claim ('access' vs 'refresh') for preventing cross-token-type usage"

requirements-completed: [INFRA-08, INFRA-07]

# Metrics
duration: 10min
completed: 2026-03-16
---

# Phase 1 Plan 02: Authentication Summary

**JWT auth with PyJWT + passlib bcrypt, register/login/refresh endpoints, user profile CRUD, encrypted platform token storage, and 15 passing integration tests against real PostgreSQL**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-16T05:33:51Z
- **Completed:** 2026-03-16T05:44:36Z
- **Tasks:** 4/4
- **Files modified:** 15

## Accomplishments

- Complete auth flow: register -> login -> Bearer token -> access protected endpoints (SC-2 validated)
- Password hashing via passlib[bcrypt] CryptContext, JWT with PyJWT (no python-jose)
- Platform token storage with real API validation (Canvas/Ed) before AES-256-GCM encryption
- Health check endpoint with database connectivity reporting (healthy/degraded)
- 15 integration tests covering all auth scenarios against real PostgreSQL
- Full verification chain passes: mypy --strict (0 errors), ruff check (0 warnings), pytest (15 green)

## Task Commits

Each task was committed atomically:

1. **Task 1: Password hashing, JWT module, and auth schemas** - `d2be35c` (feat)
2. **Task 2: Auth route endpoints (register, login, refresh)** - `4b2d166` (feat)
3. **Task 3: User profile, token config, and health endpoints** - `729dcf6` (feat)
4. **Task 4: Auth integration tests** - `eb006a2` (test)
5. **Lint fixes** - `474909f` (fix)

## Files Created/Modified

- `src/security/password.py` - passlib CryptContext for bcrypt hashing
- `src/security/auth.py` - PyJWT token creation/validation, OAuth2PasswordBearer, get_current_user
- `src/schemas/auth.py` - RegisterRequest, LoginResponse, RefreshRequest (Pydantic v2)
- `src/schemas/user.py` - UserResponse, UserUpdateRequest, TokenConfigRequest, TokenStatus
- `src/web/deps.py` - Shared FastAPI deps: get_request_meta, re-exported get_session/get_current_user
- `src/web/routes/__init__.py` - Router aggregation (api_router + health_router)
- `src/web/routes/auth.py` - POST /register, /login, /refresh endpoints
- `src/web/routes/users.py` - GET/PATCH /me, PUT/DELETE /me/tokens/{platform}
- `src/web/routes/health.py` - GET /health with DB connectivity check
- `src/models/user.py` - Added display_name column
- `src/web/main.py` - Included api_router and health_router
- `tests/conftest.py` - Added test_client fixture with per-test session override
- `tests/integration/test_auth.py` - 15 integration tests covering full auth flow
- `alembic/versions/1eb0cbc46f28_add_display_name_to_users.py` - display_name migration
- `pyproject.toml` - Added ruff per-file-ignores for FastAPI B008

## Decisions Made

- **JWT jti claim**: Added uuid4-based `jti` claim to every JWT to guarantee uniqueness even when tokens are created within the same second (discovered during test_refresh_token_success).
- **OAuth2PasswordRequestForm for login**: Uses form data (not JSON) for OAuth2 compatibility with the `tokenUrl` in OAuth2PasswordBearer. This is the standard FastAPI pattern.
- **Health at root level**: GET /health mounted at root (not /api/v1/) per TRD SS12.10. Infrastructure monitoring tools expect health checks at a well-known root path.
- **Token validation via httpx directly**: PUT /users/me/tokens/{platform} validates tokens by calling real Canvas/Ed APIs via httpx. Not using adapters since they aren't built yet and a simple GET with timeout=10s suffices for validation.
- **B008 ruff suppression**: FastAPI's `Depends()` requires function calls in argument defaults by design. Suppressed B008 for web routes rather than refactoring to non-idiomatic patterns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing display_name column to User model**
- **Found during:** Task 1 (Pre-task analysis)
- **Issue:** Plan's interface definition says User model has `display_name: Mapped[str]`, but the actual model from Plan 01-01 didn't include it. Auth endpoints require display_name for registration.
- **Fix:** Added `display_name: Mapped[str] = mapped_column(String(100), default="")` to User model with corresponding Alembic migration.
- **Files modified:** `src/models/user.py`, `alembic/versions/1eb0cbc46f28_add_display_name_to_users.py`
- **Verification:** Migration applied successfully, model tests still pass
- **Committed in:** `d2be35c` (Task 1 commit)

**2. [Rule 1 - Bug] Added jti claim to JWT tokens for uniqueness**
- **Found during:** Task 4 (test_refresh_token_success failure)
- **Issue:** When register, login, and refresh happen within the same second, the access_token from login and from refresh are identical (same sub, same exp, same type). Test assertion `new_access_token != access_token` fails.
- **Fix:** Added `jti` (JWT ID) claim using `uuid.uuid4()` to both `create_access_token` and `create_refresh_token`, ensuring every token is unique regardless of timing.
- **Files modified:** `src/security/auth.py`
- **Verification:** test_refresh_token_success now passes consistently
- **Committed in:** `eb006a2` (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- **Untracked test files cause collection error**: Pre-existing untracked files `tests/integration/test_canvas.py` and `test_ed_discussion.py` use the deprecated `event_loop` fixture pattern, causing `MultipleEventLoopsRequestedError` when running `pytest tests/`. These are out of scope (Plan 01-03 artifacts). Auth tests pass independently and in combination with 01-01 tests (33/33 green). Logged to `deferred-items.md`.

## User Setup Required

None - all dependencies installed, Docker Compose handles PostgreSQL. Encryption key from `.env` used for token storage.

## Next Phase Readiness

- Auth infrastructure complete: register/login/refresh/profile/token-storage all operational
- `get_current_user` dependency ready for all protected endpoints in Plan 01-03 (adapters)
- Token encryption roundtrip verified: adapters can decrypt stored tokens for API calls
- Health endpoint ready for infrastructure monitoring
- `test_client` fixture with per-test rollback available for future integration tests

## Self-Check: PASSED

All 11 created files verified present. All 5 commits (d2be35c, 4b2d166, 729dcf6, eb006a2, 474909f) verified in git log.

---
*Phase: 01-foundation-data-acquisition*
*Completed: 2026-03-16*
