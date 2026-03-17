# User Actions Skills

Skills for API endpoint patterns, error handling, and notification delivery.

## Quick Reference

| Skill | File | When to Use |
|-------|------|-------------|
| API Patterns | rules/api-patterns.md | Creating new REST endpoints |
| Error Handling | rules/error-handling.md | UniboardError hierarchy, response format |
| Notification Patterns | rules/notification-patterns.md | Creating and delivering notifications |

## Meta-Rules

### Rule 1: Response Envelope
All endpoints return `SuccessResponse[T]` with `MetaInfo` (request_id, timestamp). Errors return `ErrorResponse` with `ErrorDetail` (code, message).

### Rule 2: Service Injection
Services created via `Depends(get_xxx_service)` factory. Session injected via `Depends(get_session)`. Auth via `Depends(get_current_user)`.

### Rule 3: Read-Only External
System never writes to Canvas or Ed. All external platform access is read-only. User data (notifications, scenarios, settings) is read-write in PostgreSQL.

## Key Patterns

- APIRouter per domain, aggregated in `src/web/routes/__init__.py`
- B008 ruff suppression for `Depends()` in function parameter defaults
- Request ID middleware injects `X-Request-ID` header on every response
- CORS configured for `http://localhost:3000` (frontend dev server)
- Catch-all exception handler: never leak stack traces to clients

## Files

- `src/web/routes/__init__.py` — Router aggregation
- `src/web/deps.py` — Dependency factories
- `src/web/main.py` — App factory, middleware, error handlers
- `src/schemas/common.py` — SuccessResponse, ErrorResponse, UniboardError
