# Error Handling Rules

Rules for the UniboardError hierarchy, structured error responses, and resilience.

## Rule 1: Error Hierarchy
`UniboardError` base class with `status_code` and `code` fields. Subclasses: `TokenInvalidError` (401), `UpstreamAPIError` (502), `RateLimitError` (429). Custom exception handler in `src/web/main.py` converts to `ErrorResponse`.

## Rule 2: Response Format
All errors return:
```python
ErrorResponse(
    error=ErrorDetail(code="ERROR_CODE", message="Human-readable message"),
    meta=MetaInfo(request_id=request_id, timestamp=now),
)
```
Never expose internal state, stack traces, or database details in error messages.

## Rule 3: Circuit Breaker
Per-platform CircuitBreaker instances (Canvas and Ed independent). Failure threshold triggers open state. Recovery timeout allows probe requests. Configured in `src/adapters/resilience.py`.

## Rule 4: Catch-All Handler
`catch_all_handler` in `src/web/main.py` catches all unhandled exceptions. Logs full traceback via structlog. Returns generic 500 with "An unexpected error occurred." Never leaks internals.
