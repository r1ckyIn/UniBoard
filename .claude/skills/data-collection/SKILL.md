# Data Collection Skills

Skills for fetching data from external platforms (Canvas LMS, Ed Discussion, Ed Lessons, USYD Unit Outline).

## Quick Reference

| Skill | File | When to Use |
|-------|------|-------------|
| Canvas API | rules/canvas-api.md | Fetching courses, grades, assignments, modules |
| Ed API | rules/ed-api.md | Fetching threads, posts, lessons, slides |
| Unit Outline | rules/unit-outline.md | Parsing USYD assessment weights from HTML |

## Key Patterns

- All adapters use `_request()` pipeline: circuit breaker check -> rate limiter wait -> HTTP call -> header update -> retry loop
- Pydantic response models with `ConfigDict(extra='ignore', strict=False)` absorb undocumented API fields safely
- Per-item error handling: `ValidationError` caught per-item, logged via structlog, skipped (never crash batch)
- Ed adapters return empty lists/dicts on network failure (graceful degradation, never raise to caller)
- Canvas adapter raises typed errors (`TokenInvalidError`, `RateLimitedError`, `UpstreamAPIError`)
- Circuit breaker is per-platform instance (Canvas and Ed are independent)

## Rule 1: Adapter Base Pattern

All adapters inherit from protocol classes in `src/adapters/base.py`:
- `LMSAdapter` (Canvas) — `get_courses`, `get_grades`, `get_assignments`, `get_modules`
- `DiscussionAdapter` (Ed Discussion) — `get_threads`, `get_thread`, `search_threads`
- `LessonAdapter` (Ed Lessons) — `get_lessons`, `get_lesson`

Each adapter composes: `httpx.AsyncClient` + `CircuitBreaker` + `RetryConfig` (+ `CanvasRateLimiter` for Canvas only).

## Rule 2: Error Hierarchy

Adapters raise from `src/schemas/common.py`:
- `TokenInvalidError("Canvas")` — 401/403 responses
- `RateLimitedError(msg)` — 429 after retry exhaustion
- `UpstreamAPIError(platform, detail)` — 5xx after retries
- `UpstreamUnavailableError(msg)` — Circuit breaker open

Ed adapters catch these internally and return empty; Canvas adapter propagates them.

## Rule 3: Token Validation

Every adapter implements `validate_token() -> bool`:
- Canvas: `GET /users/self` (status 200 = valid)
- Ed Discussion/Lessons: `GET /courses` (status 200 = valid)
- Always catches `httpx.RequestError` and returns `False` on network failure

## Files

- `src/adapters/canvas.py` — CanvasAdapter (7 endpoints)
- `src/adapters/ed_discussion.py` — EdDiscussionAdapter (4 endpoints)
- `src/adapters/ed_lessons.py` — EdLessonsAdapter (3 endpoints)
- `src/adapters/resilience.py` — CircuitBreaker, CanvasRateLimiter, RetryConfig
- `src/adapters/base.py` — Protocol base classes
- `src/parsers/usyd_outline.py` — UnitOutlineParser (HTML scraping)
- `src/parsers/ed_document.py` — Ed XML `<document version="2.0">` parser

## Common Pitfalls

- Canvas rate limiting uses `X-Rate-Limit-Remaining` header (sliding window, not fixed)
- Ed API is undocumented; field names verified in TRD SS9.4 — `content` not `passage`, `number` not `lesson_number`
- Canvas Modules API requires `include[]=items` parameter to avoid N+1 requests
- zsh `export` may escape special characters in tokens; use inline in curl for testing
- Ed thread list endpoint wraps data in `{"threads": [...]}`, not a bare array
- Ed Lessons list returns `(lessons, modules)` tuple — slides only populated via `get_lesson()`
- Link header pagination regex: `<([^>]+)>;\s*rel="next"`
- Canvas pagination URLs are absolute (not relative to base_url)

## Endpoints Reference

### Canvas LMS (`https://canvas.sydney.edu.au/api/v1`)
| Method | Path | Params | Returns |
|--------|------|--------|---------|
| GET | /courses | enrollment_state=active, per_page=100 | Course list |
| GET | /courses/{id}/enrollments | user_id=self, include[]=current_points | Grade data |
| GET | /courses/{id}/assignments | per_page=100 | Assignment list |
| GET | /courses/{id}/modules | include[]=items, per_page=100 | Modules with items |
| GET | /courses/{id}/tabs | — | Navigation tabs |
| GET | /courses/{id}/external_tools/{id} | — | External tool config |
| GET | /users/self | — | Token validation |

### Ed Discussion (`https://edstem.org/api`)
| Method | Path | Params | Returns |
|--------|------|--------|---------|
| GET | /courses/{id}/threads | sort, limit, offset, filter | Thread list |
| GET | /threads/{id} | — | Single thread |
| GET | /courses | — | Token validation |

### Ed Lessons (`https://edstem.org/api`)
| Method | Path | Params | Returns |
|--------|------|--------|---------|
| GET | /courses/{id}/lessons | — | Lessons + modules |
| GET | /lessons/{id} | — | Single lesson with slides |
| GET | /courses | — | Token validation |
