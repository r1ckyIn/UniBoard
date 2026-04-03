# Phase 25: Security & Observability - Research

**Researched:** 2026-04-03
**Domain:** HTTP security headers, structured request logging, error boundaries, API rate limiting
**Confidence:** HIGH

## Summary

Phase 25 adds defense-in-depth security and observability to the UniBoard stack. The work spans both the Python FastAPI backend and the Next.js 15 frontend, covering four distinct domains: (1) security response headers on both tiers, (2) structured HTTP request logging with request_id correlation via structlog contextvars, (3) React error boundaries for graceful failure in the frontend, and (4) per-user rate limiting using slowapi.

The existing codebase is well-prepared for these changes. The FastAPI app already has a `request_id_middleware` that generates UUIDs and sets `X-Request-ID` headers, and structlog is configured with `merge_contextvars` in the processor chain -- but `bind_contextvars`/`clear_contextvars` are never called, so the request_id is not propagated to downstream logs. The frontend has zero error boundaries and no `error.tsx` or `global-error.tsx` files. Security headers are absent from both tiers. Rate limiting is not implemented anywhere.

**Primary recommendation:** Implement as four parallel workstreams -- (A) security headers middleware on both tiers, (B) access logging middleware with structlog contextvars binding, (C) Next.js error boundaries at `[locale]` and root levels, (D) slowapi rate limiting with per-user key extraction from JWT. These are independent and can be planned as separate tasks.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-02 | Next.js and FastAPI return security response headers (HSTS, X-Frame-Options, X-Content-Type-Options, CSP) | Security headers via next.config.ts `headers()` and FastAPI middleware; see Architecture Patterns |
| SEC-03 | Every HTTP request logged with method, path, status_code, duration_ms; request_id bound to structlog contextvars for downstream correlation | Access logging middleware pattern with `time.perf_counter()` and `structlog.contextvars.bind_contextvars`; see Code Examples |
| SEC-04 | Frontend has error.tsx and global-error.tsx error boundaries with basic error logging to console | Next.js App Router error boundary convention with `'use client'` directive; see Architecture Patterns |
| OPS-04 | API rate limiting via slowapi (60 req/user/min general, 10 req/user/min for AI endpoints) | slowapi 0.1.9 with custom key_func extracting user_id from JWT; see Standard Stack and Code Examples |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Code comments:** Pure English only -- no Chinese, no bilingual
- **Type checking:** `mypy --strict` for all Python code
- **Linting:** `ruff` for Python, `eslint --max-warnings 0` for frontend
- **Testing:** `pytest + pytest-asyncio` (backend), `vitest` (frontend)
- **Package management:** `uv` (backend), `pnpm 9+` (frontend)
- **Frontend port:** Dev server runs on port 3001
- **Design system:** Warm academic aesthetic (Rough.js, paper texture, Source Serif 4 + Inter fonts)
- **i18n:** Error boundary text needs both `en` and `zh` message keys
- **Auth pattern:** Supabase JWT validated in Python via `get_current_user_id` dependency

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| slowapi | 0.1.9 | Per-user API rate limiting | Only mature rate-limiting library for FastAPI/Starlette; wraps `limits` library; production-proven |
| structlog | Already installed (24.x-26.x range) | Structured logging with contextvars | Already in use; has `merge_contextvars` processor and `bind_contextvars` API |
| Next.js | 15.5.14 (installed) | Security headers via `next.config.ts` `headers()` + error boundaries via file conventions | Already installed; native support for both features |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| limits | Transitive dep of slowapi | Rate limit parsing and storage backends | Automatically installed with slowapi; provides `"60/minute"` syntax |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| slowapi | fastapi-limiter | fastapi-limiter requires Redis; slowapi works with in-memory backend (simpler for MVP) |
| slowapi | Custom middleware | Hand-rolling rate limiting is error-prone (race conditions, storage, cleanup); slowapi handles all edge cases |
| next.config.ts headers | Next.js middleware.ts headers | middleware.ts is better for dynamic CSP nonces; for static headers, next.config.ts is simpler and more predictable |
| Secweb (FastAPI) | Custom middleware | Secweb adds a dependency for something achievable in ~15 lines of middleware; not worth the dependency |

**Installation:**
```bash
# Backend -- add slowapi to pyproject.toml
cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard
uv add slowapi
```

No frontend packages needed -- Next.js has built-in support for headers and error boundaries.

## Architecture Patterns

### SEC-02: Security Headers

#### FastAPI Security Headers Middleware

Add a simple middleware in `src/web/main.py` that sets security headers on every response. No external library needed -- this is ~15 lines of code.

**Headers to set:**
| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Force HTTPS for 2 years |
| `X-Frame-Options` | `DENY` | Prevent clickjacking via iframe embedding |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing attacks |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co` | XSS mitigation |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer header leakage |

**CSP note:** The CSP must allow:
- `'unsafe-inline'` for styles (Tailwind CSS injects inline styles)
- `'unsafe-eval'` for scripts (Next.js dev mode needs it; can tighten in production)
- `connect-src` must include Supabase URLs for auth flows
- `font-src 'self' data:` for Google Fonts (loaded via `next/font`, which is self-hosted)

**Placement:** Add as middleware in `create_app()`, AFTER CORS middleware (order matters -- CORS must run first for preflight requests).

#### Next.js Security Headers (next.config.ts)

Use the `headers()` async function in `next.config.ts` to set the same security headers. This applies headers to all responses served by the Next.js server.

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

### SEC-03: Structured Request Logging

#### Access Logging Middleware Pattern

Extend the existing `request_id_middleware` in `src/web/main.py` to:
1. Clear previous contextvars at request start
2. Bind `request_id` to structlog contextvars
3. Measure request duration with `time.perf_counter()`
4. Log the complete access record on response

**Key insight:** The project already configures `structlog.contextvars.merge_contextvars` in the processor chain (`src/logging.py:29`), so once `bind_contextvars(request_id=...)` is called, ALL downstream log calls in services/adapters will automatically include the request_id. This is the whole point of the contextvars approach.

**Must fix simultaneously:** `src/web/routes/ai.py:4,25` uses stdlib `logging` instead of structlog (audit finding O-7). This should be changed to `structlog.get_logger()` so AI endpoint logs go through the same JSON pipeline with request_id correlation.

### SEC-04: Frontend Error Boundaries

#### Error Boundary File Placement

Next.js App Router uses file conventions for error boundaries:

```
frontend/app/
  global-error.tsx     # Catches errors in root layout -- MUST define own <html><body>
  [locale]/
    error.tsx          # Catches errors in locale-scoped pages (wraps the layout's children)
    (dashboard)/
      error.tsx        # Optional: more specific boundary for dashboard routes
```

**Critical requirements for error boundaries:**
1. Must use `'use client'` directive (Client Components only)
2. Must accept `error: Error & { digest?: string }` and `reset: () => void` props
3. `global-error.tsx` must render its own `<html>` and `<body>` tags
4. For i18n, `error.tsx` inside `[locale]/` can use `useTranslations()` since it's wrapped by `NextIntlClientProvider` in the locale layout
5. `global-error.tsx` is OUTSIDE the locale layout, so it cannot use `useTranslations()` -- must use hardcoded English strings or a locale detection fallback

**Design consideration:** Error UI should match the project's warm academic aesthetic (paper texture background, Source Serif 4 font, muted colors). Since `global-error.tsx` renders its own HTML, it needs inline styles or a minimal subset of the design tokens.

### OPS-04: Rate Limiting

#### slowapi Integration Pattern

```
src/web/main.py:
  1. Import Limiter, _rate_limit_exceeded_handler, RateLimitExceeded
  2. Create Limiter with custom key_func (extract user_id from JWT)
  3. Attach to app.state.limiter
  4. Register exception handler for RateLimitExceeded
  5. Set default_limits=["60/minute"] for all endpoints

src/web/routes/ai.py:
  @limiter.limit("10/minute")  on each AI endpoint

src/web/routes/roi.py:
  @limiter.limit("10/minute")  on the ROI endpoint
```

**AI endpoints requiring 10/minute limit (5 total):**
| Route File | Path | Method |
|------------|------|--------|
| `ai.py` | `/courses/{course_id}/qa` | POST |
| `ai.py` | `/courses/{course_id}/review` | GET |
| `ai.py` | `/courses/{course_id}/qa/stream` | POST |
| `ai.py` | `/courses/{course_id}/review/stream` | GET |
| `roi.py` | `/courses/{course_id}/roi` | GET |

**All other endpoints:** Use the default 60/minute limit (inherited from `default_limits`).

**Key function design:** The key_func must extract the user_id from the Supabase JWT. Since slowapi's `key_func` only receives a `Request` object, it must parse the Authorization header and decode the JWT to get the `sub` claim. For unauthenticated requests (health check), fall back to IP address.

**Critical detail:** Two AI endpoints (`qa/stream` and `review/stream`) currently do NOT have `request: Request` in their function signature. slowapi requires the `Request` parameter to be explicitly present. These must be updated to include `request: Request`.

### Recommended Project Structure Changes

```
src/web/
  main.py              # Modified: add security headers middleware, enhance request_id middleware
                        #           with access logging + contextvars, add slowapi setup
  middleware/           # NOT recommended -- keep in main.py for simplicity (only 2 middleware)
  routes/
    ai.py              # Modified: add @limiter.limit("10/minute"), add request: Request to stream endpoints
    roi.py             # Modified: add @limiter.limit("10/minute")

frontend/
  next.config.ts       # Modified: add headers() with security headers
  app/
    global-error.tsx   # NEW: root-level error boundary
    [locale]/
      error.tsx        # NEW: locale-scoped error boundary
  messages/
    en.json            # Modified: add "error" section for error boundary text
    zh.json            # Modified: add "error" section for error boundary text
```

### Anti-Patterns to Avoid

- **Do NOT create a separate middleware module** for just security headers and access logging. The existing `main.py` pattern of inline middleware is clean and co-located with the app factory. Two middleware functions in main.py is fine.
- **Do NOT use `Secweb` library** for FastAPI security headers. It's an unnecessary dependency for what amounts to setting 5 headers.
- **Do NOT use nonce-based CSP** in this phase. Nonce-based CSP requires middleware.ts to generate a fresh nonce per request and coordinate with server components. For MVP hardening, static CSP directives are sufficient.
- **Do NOT add `@limiter.limit()` to the health endpoint** -- health checks should never be rate limited (they are used by load balancers).
- **Do NOT rate-limit by IP only** -- multiple users behind the same NAT/proxy would share a limit. Always extract user_id from JWT for authenticated endpoints.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom counter + dict + cleanup | slowapi + limits | Sliding window, token bucket, storage backends, thread safety, cleanup -- all solved |
| Rate limit parsing | Custom "60/minute" parser | limits library (transitive) | Format parsing is deceptively complex (plurals, multiple limits, etc.) |
| Error boundaries | Custom try/catch wrapper components | Next.js `error.tsx` convention | Framework handles the React ErrorBoundary lifecycle, reset, and component tree placement |

**Key insight:** Security headers and access logging are simple enough to implement inline. Rate limiting is not -- the storage, window calculation, and cleanup logic is where bugs hide.

## Common Pitfalls

### Pitfall 1: CORS and Security Headers Middleware Order
**What goes wrong:** Security headers middleware runs before CORS middleware, causing preflight OPTIONS requests to fail because security headers (like CSP) interfere with CORS headers.
**Why it happens:** FastAPI middleware runs in reverse order of registration (last added = first to run).
**How to avoid:** Register CORS middleware FIRST, then security headers middleware. In FastAPI, `add_middleware(CORSMiddleware, ...)` before adding the security headers middleware function.
**Warning signs:** Preflight requests return 200 but with unexpected headers; browser blocks actual requests.

### Pitfall 2: slowapi Requires Explicit `request: Request` Parameter
**What goes wrong:** slowapi decorator silently fails or raises cryptic errors because the endpoint function doesn't have a `request: Request` parameter.
**Why it happens:** slowapi hooks into the request lifecycle by inspecting the function signature for the `Request` parameter. If absent, it cannot extract the key.
**How to avoid:** Ensure every rate-limited endpoint has `request: Request` in its signature. The two SSE streaming endpoints in `ai.py` currently lack this.
**Warning signs:** `AttributeError` or `TypeError` when hitting a rate-limited endpoint.

### Pitfall 3: global-error.tsx Must Define Own HTML Shell
**What goes wrong:** `global-error.tsx` renders but loses all styling, fonts, and layout because it replaces the root layout.
**Why it happens:** Unlike `error.tsx` (which inherits the parent layout), `global-error.tsx` replaces the entire component tree including `<html>` and `<body>` tags.
**How to avoid:** Include `<html>` and `<body>` tags in `global-error.tsx`. Add inline styles or import `globals.css` to maintain minimal design consistency.
**Warning signs:** Error page appears unstyled with default browser fonts.

### Pitfall 4: structlog contextvars Leaking Between Requests
**What goes wrong:** Request B's logs show Request A's request_id because contextvars were not cleared.
**Why it happens:** In async frameworks, if you don't call `clear_contextvars()` at the start of each request, the previous request's context leaks via the same asyncio Task context.
**How to avoid:** Call `structlog.contextvars.clear_contextvars()` at the very beginning of the access logging middleware, before binding new values.
**Warning signs:** Mismatched request_ids in logs; log entries contain stale context from previous requests.

### Pitfall 5: CSP Blocking Supabase Auth
**What goes wrong:** Login/register flows fail because `connect-src` doesn't include the Supabase Auth URL.
**Why it happens:** Supabase Auth requires XHR/fetch to `*.supabase.co` domains for authentication.
**How to avoid:** Include `https://*.supabase.co` in `connect-src` directive. Also allow `wss://*.supabase.co` if using Supabase Realtime.
**Warning signs:** Browser console shows "Refused to connect to 'https://xyz.supabase.co'" CSP violation.

### Pitfall 6: Rate Limit Key Function Failing on Unauthenticated Endpoints
**What goes wrong:** Health check or unauthenticated endpoints crash because the key function tries to decode a JWT from a request without an Authorization header.
**Why it happens:** `default_limits` applies to ALL endpoints, including unauthenticated ones like `/health`.
**How to avoid:** The custom key_func must gracefully fall back to IP-based limiting when no Authorization header is present. Also use `@limiter.exempt` on the health endpoint.
**Warning signs:** 500 errors on `/health` endpoint after adding rate limiting.

### Pitfall 7: mypy --strict Compliance for slowapi
**What goes wrong:** slowapi's type stubs are incomplete, causing mypy errors.
**Why it happens:** slowapi 0.1.9 does not ship with py.typed marker or complete type annotations.
**How to avoid:** Add `slowapi` and `slowapi.*` to the `[[tool.mypy.overrides]]` section with `ignore_missing_imports = true` in `pyproject.toml`.
**Warning signs:** `error: Library stubs not installed for "slowapi"` or `Module "slowapi" has no attribute "Limiter"`.

## Code Examples

### Access Logging Middleware (SEC-03)

```python
# Source: structlog contextvars docs + FastAPI middleware pattern
import time
import structlog
from structlog.contextvars import bind_contextvars, clear_contextvars

logger = structlog.get_logger()

@application.middleware("http")
async def access_log_middleware(request: Request, call_next):
    """Log every HTTP request with method, path, status, duration + bind request_id."""
    clear_contextvars()
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    bind_contextvars(request_id=request_id)

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )

    response.headers["X-Request-ID"] = request_id
    return response
```

### Security Headers Middleware (SEC-02, FastAPI)

```python
# Source: FastAPI middleware pattern + OWASP security headers guide
@application.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Add security response headers to every response."""
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = (
        "max-age=63072000; includeSubDomains"
    )
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self' data:; "
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co"
    )
    return response
```

### slowapi Rate Limiting Setup (OPS-04)

```python
# Source: slowapi GitHub docs + custom key_func pattern
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

def get_user_id_or_ip(request: Request) -> str:
    """Extract user_id from JWT for rate limiting; fall back to IP."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            token = auth_header[7:]
            payload = jwt.decode(
                token,
                get_settings().supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            return f"user:{payload.get('sub', 'unknown')}"
        except Exception:
            pass
    # Fallback to IP for unauthenticated requests
    return f"ip:{request.client.host if request.client else 'unknown'}"

limiter = Limiter(key_func=get_user_id_or_ip, default_limits=["60/minute"])

# In create_app():
application.state.limiter = limiter
application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### Next.js Error Boundary (SEC-04)

```typescript
// frontend/app/[locale]/error.tsx
// Source: Next.js App Router error handling docs
'use client';

import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorBoundary');

  // Log error to console for observability
  console.error('[UniBoard Error]', error.message, error.digest);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center max-w-md mx-auto p-8">
        <h2 className="font-serif text-2xl font-bold text-text-1 mb-3">
          {t('title')}
        </h2>
        <p className="text-text-2 mb-6">{t('description')}</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-orange text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          {t('retry')}
        </button>
      </div>
    </div>
  );
}
```

```typescript
// frontend/app/global-error.tsx
// Source: Next.js App Router global-error docs
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('[UniBoard Global Error]', error.message, error.digest);

  return (
    <html>
      <body style={{ fontFamily: "'Source Serif 4', serif", backgroundColor: '#faf9f5' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d2d2a', marginBottom: '0.75rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#6b6b65', marginBottom: '1.5rem' }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: '#d97757',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

### Next.js Security Headers (SEC-02)

```typescript
// frontend/next.config.ts
// Source: Next.js headers() configuration docs
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| X-Frame-Options only | CSP frame-ancestors (+ X-Frame-Options for legacy) | CSP Level 2+ | frame-ancestors is more flexible; keep X-Frame-Options as fallback for old browsers |
| stdlib logging | structlog with JSON + contextvars | structlog 21.x+ | Structured JSON logs with automatic context propagation |
| IP-based rate limiting | User-ID-based rate limiting | Best practice | Prevents false positives for shared IPs (university campuses, NAT) |
| React class ErrorBoundary | Next.js file-convention error.tsx | Next.js 13+ (2023) | Zero-config error boundaries via file naming |

**Deprecated/outdated:**
- `X-XSS-Protection`: Removed from modern browsers. Do NOT add it -- it was actually exploitable as an attack vector in some browsers.
- `X-Frame-Options SAMEORIGIN`: Use CSP `frame-ancestors 'self'` instead, but keep X-Frame-Options: DENY for legacy browser compat.

## Open Questions

1. **CSP Strictness Level**
   - What we know: The current CSP uses `'unsafe-inline'` and `'unsafe-eval'` for scripts, which is permissive. Tailwind CSS v4 uses `@import` and may inject styles via JavaScript.
   - What's unclear: Whether the Next.js production build requires `'unsafe-eval'` or if it's only needed for dev mode (`next dev`).
   - Recommendation: Start with permissive CSP (including `'unsafe-eval'`), verify in dev. For production hardening, test with `'unsafe-eval'` removed and add it back only if the build breaks. This is a Phase 26+ concern.

2. **Rate Limit Storage Backend**
   - What we know: slowapi defaults to in-memory storage. If the FastAPI app runs multiple workers (Gunicorn), each worker has its own counter.
   - What's unclear: Whether Railway deployment will use multiple workers.
   - Recommendation: Use in-memory storage for now. If multiple workers are needed, add Redis storage in Phase 26 (deployment). Railway single-process is fine for MVP.

3. **429 Response Format**
   - What we know: slowapi's default `_rate_limit_exceeded_handler` returns a plain text response. The project uses structured JSON error responses (`ErrorResponse` schema).
   - What's unclear: Whether the frontend handles 429 status codes specifically.
   - Recommendation: Write a custom 429 handler that returns the project's `ErrorResponse` JSON format instead of using the default handler. This maintains API consistency.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-asyncio (backend), vitest 4.x (frontend) |
| Config file | `pyproject.toml [tool.pytest.ini_options]` (backend), `vitest.config.ts` (frontend) |
| Quick run command | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/unit/ -x -q` |
| Full suite command | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/ -x -q` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-02 | FastAPI responses include HSTS, X-Frame-Options, X-Content-Type-Options, CSP | unit | `pytest tests/unit/test_security_headers.py -x` | Wave 0 |
| SEC-02 | Next.js responses include security headers | manual | `curl -I http://localhost:3001 \| grep -i strict` | N/A (manual) |
| SEC-03 | HTTP request logged with method, path, status_code, duration_ms, request_id | unit | `pytest tests/unit/test_access_logging.py -x` | Wave 0 |
| SEC-04 | error.tsx renders fallback UI on component error | manual | Visual verification in browser | N/A (manual) |
| SEC-04 | global-error.tsx renders fallback UI on root error | manual | Visual verification in browser | N/A (manual) |
| OPS-04 | General endpoints return 429 after 60 requests | unit | `pytest tests/unit/test_rate_limiting.py::test_general_rate_limit -x` | Wave 0 |
| OPS-04 | AI endpoints return 429 after 10 requests | unit | `pytest tests/unit/test_rate_limiting.py::test_ai_rate_limit -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `python -m pytest tests/unit/ -x -q && ruff check src/ && mypy src/`
- **Per wave merge:** Full backend + frontend verification
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_security_headers.py` -- covers SEC-02 (FastAPI)
- [ ] `tests/unit/test_access_logging.py` -- covers SEC-03
- [ ] `tests/unit/test_rate_limiting.py` -- covers OPS-04

## Sources

### Primary (HIGH confidence)
- [slowapi GitHub](https://github.com/laurentS/slowapi) - Setup guide, key_func, storage backends, examples
- [slowapi PyPI](https://pypi.org/project/slowapi/) - Version 0.1.9, released 2024-02-05
- [structlog contextvars docs](https://www.structlog.org/en/latest/contextvars.html) - bind_contextvars, clear_contextvars, merge_contextvars
- [next-intl error files](https://next-intl.dev/docs/environments/error-files) - i18n in error.tsx and global-error.tsx
- [Next.js headers config](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers) - next.config.ts headers() function
- [Next.js error handling](https://nextjs.org/docs/app/getting-started/error-handling) - error.tsx, global-error.tsx conventions

### Secondary (MEDIUM confidence)
- [FastAPI structlog integration](https://wazaari.dev/blog/fastapi-structlog-integration) - Access logging middleware pattern with duration_ms
- [Complete Next.js security guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) - Security headers best practices
- [FastAPI security headers guide](https://medium.com/@Nexumo_/fastapi-security-headers-that-dont-slow-you-down-7c8ac864a5ee) - Middleware pattern for security headers
- UniBoard Codebase Audit (`docs/project/codebase_audit.md`) - Findings O-1 through O-13, S-6

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- slowapi is the de facto choice for FastAPI rate limiting; structlog and Next.js are already in the project
- Architecture: HIGH -- patterns are well-established (middleware for headers/logging, file conventions for error boundaries)
- Pitfalls: HIGH -- documented from codebase audit findings (O-1 through O-7) and official docs
- CSP policy specifics: MEDIUM -- may need tuning based on runtime behavior (connect-src, script-src)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable domain -- security headers and logging patterns change slowly)
