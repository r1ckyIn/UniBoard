# Canvas API Skills

Rules for working with Canvas LMS API via `CanvasAdapter` in `src/adapters/canvas.py`.

---

## Rule 1: Rate Limiting via X-Rate-Limit-Remaining Header

Canvas uses a sliding window rate limiter. The remaining quota is communicated via the `X-Rate-Limit-Remaining` response header (a float, not integer).

**Implementation:** `CanvasRateLimiter` in `src/adapters/resilience.py`:
```python
@dataclass
class CanvasRateLimiter:
    remaining: float = 700.0     # Canvas default quota
    min_remaining: float = 50.0  # Safety buffer

    def update_from_headers(self, headers: httpx.Headers) -> None:
        raw = headers.get("x-rate-limit-remaining")
        if raw is not None:
            self.remaining = float(raw)

    async def wait_if_needed(self) -> None:
        if self.remaining <= self.min_remaining:
            await asyncio.sleep(2.0)
```

**Key points:**
- Updated after EVERY request (including pagination requests)
- Throttles with 2s sleep when remaining drops below 50
- Canvas quota regenerates continuously (sliding window)
- The header value is a float (e.g., `687.4`), not an integer

---

## Rule 2: Link Header Pagination

Canvas API uses RFC 5988 `Link` headers for pagination. The `_paginate()` method follows `rel="next"` links automatically.

**Pattern:**
```python
_LINK_NEXT_RE = re.compile(r'<([^>]+)>;\s*rel="next"')

async def _paginate(self, path, params=None) -> list[dict]:
    results = []
    response = await self._request("GET", path, params=params)
    results.extend(response.json())
    while True:
        link_header = response.headers.get("link", "")
        match = _LINK_NEXT_RE.search(link_header)
        if not match:
            break
        next_url = match.group(1)  # Absolute URL
        response = await self._client.send(
            self._client.build_request("GET", next_url)
        )
        results.extend(response.json())
    return results
```

**Key points:**
- Pagination URLs are ABSOLUTE (not relative to base_url) -- use `client.send(client.build_request())` instead of `client.request()`
- Circuit breaker and rate limiter are checked on each paginated request
- `per_page=100` reduces total pages (Canvas default is 10)
- Both list and single-object responses are handled (response may be `list` or `dict`)

---

## Rule 3: Circuit Breaker (Per-Platform Instance)

Each platform (Canvas, Ed Discussion, Ed Lessons) has its own `CircuitBreaker` instance. They fail independently.

**State machine:** `CLOSED -> OPEN (after 5 failures) -> HALF_OPEN (after 60s cooldown) -> CLOSED (on success)`

```python
@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    state: CircuitState = CircuitState.CLOSED
```

**Key points:**
- `can_execute()` called before every request; raises `UpstreamUnavailableError` if OPEN
- `record_success()` resets to CLOSED with zero failures
- `record_failure()` increments count; transitions to OPEN at threshold
- HALF_OPEN allows one test request; success returns to CLOSED
- Canvas circuit breaker is checked during pagination too (each page is a separate check)

---

## Rule 4: Modules API with include[]=items

The Canvas Modules API returns empty `items` arrays by default. To get module items inline (avoiding N+1 per-module requests), pass `include[]=items`.

**Implementation in `get_modules()`:**
```python
async def get_modules(self, course_id: str) -> list[dict]:
    return await self._paginate(
        f"/courses/{course_id}/modules",
        params={"include[]": "items", "per_page": 100},
    )
```

**Key points:**
- Without `include[]=items`: each module needs a separate `GET /courses/{id}/modules/{id}/items` request
- With `include[]=items`: items are embedded in the module response (single paginated call)
- This is the biggest performance win for Canvas data fetching
- Module items include: title, type (File, Page, ExternalUrl, Assignment, etc.), url

---

## Rule 5: Retry with Exponential Backoff

Canvas requests use `RetryConfig` for transient failures (429, 5xx).

**Configuration:**
```python
@dataclass
class RetryConfig:
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 30.0
    retryable_statuses: set[int] = {429, 500, 502, 503, 504}

    def get_delay(self, attempt: int) -> float:
        return min(self.base_delay * (2 ** attempt), self.max_delay)
```

**Key points:**
- 401/403 are NOT retryable (raise `TokenInvalidError` immediately)
- 429 uses `Retry-After` header when available; falls back to exponential backoff
- After all retries exhausted: 429 raises `RateLimitedError`, 5xx raises `UpstreamAPIError`
- Backoff sequence: 1s, 2s, 4s (capped at 30s)

---

## Rule 6: Request Pipeline Order

Every Canvas API request follows this exact pipeline:

```
1. circuit_breaker.can_execute() — fail fast if circuit open
2. rate_limiter.wait_if_needed() — throttle if quota low
3. client.request(method, path, params) — actual HTTP call
4. rate_limiter.update_from_headers(response.headers) — update quota
5. Check status: 401/403 -> TokenInvalidError, retryable -> retry loop
6. circuit_breaker.record_success() or record_failure()
7. Return response
```

This order is critical: rate limiter BEFORE request, header update AFTER response.
