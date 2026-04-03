---
phase: 25-security-observability
plan: 02
subsystem: api
tags: [fastapi, slowapi, rate-limiting, jwt, middleware, 429]

# Dependency graph
requires:
  - phase: 25-01
    provides: "Security headers middleware and access logging in main.py"
provides:
  - "Per-user API rate limiting: 60/min general, 10/min AI endpoints"
  - "Custom 429 ErrorResponse JSON format with RATE_LIMITED code"
  - "JWT-based user identification for rate limit keys"
  - "Health endpoint exempt from rate limiting"
affects: [26-deployment, 25-03]

# Tech tracking
tech-stack:
  added: [slowapi]
  patterns: ["Custom _RateLimitMiddleware subclass for structured 429 responses", "Extracted rate_limit.py module to avoid circular imports"]

key-files:
  created: [src/web/rate_limit.py, tests/unit/test_rate_limiting.py]
  modified: [src/web/main.py, src/web/routes/ai.py, src/web/routes/roi.py, src/web/routes/health.py, pyproject.toml]

key-decisions:
  - "Extracted limiter and key_func to src/web/rate_limit.py to avoid circular imports between main.py and route modules"
  - "Custom _RateLimitMiddleware subclass overrides SlowAPIMiddleware.dispatch to replace plaintext 429 with structured ErrorResponse JSON"

patterns-established:
  - "Rate limit module pattern: src/web/rate_limit.py provides limiter singleton imported by both main.py and route modules"
  - "AI endpoint rate limit: @limiter.limit('10/minute') decorator on all AI/ROI routes"

requirements-completed: [OPS-04]

# Metrics
duration: 7min
completed: 2026-04-03
---

# Phase 25 Plan 02: Per-User API Rate Limiting Summary

**slowapi-based per-user rate limiting with JWT key extraction: 60 req/min general, 10 req/min AI endpoints, structured 429 ErrorResponse**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-03T11:42:36Z
- **Completed:** 2026-04-03T11:49:40Z
- **Tasks:** 1
- **Files modified:** 7

## Accomplishments
- All general API endpoints rate-limited at 60 requests per user per minute via slowapi default_limits
- AI endpoints (qa, review, qa/stream, review/stream) and ROI endpoint rate-limited at 10 requests per user per minute
- Health endpoint exempt from rate limiting via @limiter.exempt
- JWT-based key extraction: authenticated requests keyed by user:{uuid}, unauthenticated by ip:{address}
- Custom _RateLimitMiddleware returns structured ErrorResponse JSON with code "RATE_LIMITED" instead of plaintext
- 7 unit/integration tests covering key function, rate limits, 429 format, and health exemption

## Task Commits

Each task was committed atomically:

1. **Task 1: Install slowapi and configure rate limiting with tests**
   - `2b0d805` (test: failing tests for rate limiting)
   - `a185d37` (feat: implementation with all tests passing)

## Files Created/Modified
- `src/web/rate_limit.py` - Limiter singleton with get_user_id_or_ip key function (JWT extraction)
- `src/web/main.py` - Custom _RateLimitMiddleware for structured 429 responses
- `src/web/routes/ai.py` - @limiter.limit("10/minute") on 4 AI endpoints + request: Request added to stream endpoints
- `src/web/routes/roi.py` - @limiter.limit("10/minute") on ROI endpoint
- `src/web/routes/health.py` - @limiter.exempt for health check
- `pyproject.toml` - slowapi dependency and mypy overrides
- `tests/unit/test_rate_limiting.py` - 7 tests for key function, rate limits, 429 format, health exemption

## Decisions Made
- Extracted rate_limit.py module: limiter and get_user_id_or_ip live in src/web/rate_limit.py (not main.py) to avoid circular imports when route modules import the limiter
- Custom _RateLimitMiddleware subclass: SlowAPIMiddleware.dispatch returns plaintext 429 by default, so we override dispatch to intercept 429 responses and replace with structured ErrorResponse JSON

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extracted rate_limit.py to avoid circular imports**
- **Found during:** Task 1 (implementation step)
- **Issue:** Plan suggested importing limiter from main.py into route modules, which would create circular imports (main.py imports routes via __init__.py)
- **Fix:** Created src/web/rate_limit.py as the canonical location for limiter and get_user_id_or_ip, as the plan's IMPORTANT note suggested
- **Files modified:** src/web/rate_limit.py (new)
- **Committed in:** a185d37

**2. [Rule 1 - Bug] Custom middleware subclass for structured 429 responses**
- **Found during:** Task 1 (GREEN phase testing)
- **Issue:** SlowAPIMiddleware catches RateLimitExceeded internally and returns plaintext 429 response, bypassing FastAPI exception handlers
- **Fix:** Created _RateLimitMiddleware subclass that overrides dispatch() to intercept 429 responses and replace with structured ErrorResponse JSON
- **Files modified:** src/web/main.py
- **Committed in:** a185d37

**3. [Rule 1 - Bug] Fixed mypy untyped-decorator error on health.py**
- **Found during:** Task 1 (verification step)
- **Issue:** @limiter.exempt is an untyped decorator, causing mypy strict mode error
- **Fix:** Added `# type: ignore[untyped-decorator]` comment
- **Files modified:** src/web/routes/health.py
- **Committed in:** a185d37

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. Circular import prevention was anticipated by the plan. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Rate limiting foundation complete with per-user JWT-based identification
- Ready for Plan 03 (error boundaries, remaining observability)
- slowapi pattern established for any future rate-limited endpoints

## Self-Check: PASSED

- All 7 created/modified files exist on disk
- Both commits (2b0d805, a185d37) present in git log
- 7/7 tests pass, ruff clean, mypy clean
- All 13 acceptance criteria verified

---
*Phase: 25-security-observability*
*Completed: 2026-04-03*
