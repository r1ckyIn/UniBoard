# Phase 22: Critical Fixes & Config Hardening - Research

**Researched:** 2026-04-01
**Domain:** Async concurrency, config validation, Docker hardening, CORS configuration
**Confidence:** HIGH

## Summary

Phase 22 addresses four discrete issues: (1) VoyageAI embedding calls blocking the async event loop, (2) unsafe default config values in production, (3) a dev-mode Dockerfile unfit for production, and (4) hardcoded CORS origins. All four are well-understood problems with clear, proven solutions in the FastAPI/Python ecosystem.

The most impactful finding is that VoyageAI's Python library already ships an `AsyncClient` class (confirmed in installed `voyageai==0.3.7`) with an async `embed()` method that has the exact same interface as the synchronous `Client.embed()`. This means the fix is a direct swap -- no `asyncio.to_thread()` wrapper needed. The existing codebase already uses `asyncio.to_thread()` for boto3 (in `src/email/ses.py`), proving the pattern works, but the native async client is the better solution for VoyageAI.

For config hardening, pydantic-settings already powers the config layer (`src/config.py`). Adding a `model_post_init()` validator that rejects known default values (the hardcoded `"super-secret-jwt-token-with-at-least-32-characters-long"` JWT secret and all-zeros encryption key) is a clean one-function addition that fails fast at startup.

**Primary recommendation:** Use `voyageai.AsyncClient` (native async), add startup config validators via pydantic, create a multi-stage `Dockerfile.production` with tini, and make CORS origins configurable via environment variable with a sensible dev default.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRIT-01 | VoyageAI embed() calls wrapped so they do not block the async event loop | VoyageAI `AsyncClient` with native async `embed()` available in installed v0.3.7. Two call sites in `src/services/qa.py` (lines 171-174 and 387-390) need migration. |
| CRIT-03 | Application fails fast on startup when production-critical config is missing (JWT secret, encryption key, database URL) | `src/config.py` has hardcoded dev defaults for `supabase_jwt_secret` and `database_url`. Add `model_post_init()` to Settings that rejects known default values when `debug=False`. |
| CRIT-04 | Dockerfile uses multi-stage build, tini init, non-root user, no --reload, no dev dependencies | Current `Dockerfile` is single-stage, runs as root with `--reload`, installs dev deps, copies tests. Create `Dockerfile.production` with proper production patterns. |
| SEC-01 | CORS origins configurable via environment variable, defaulting to localhost:3001 for development | Current CORS in `src/web/main.py:33` hardcodes `["http://localhost:3001"]`. Add `cors_origins` to Settings class and read from env. |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| voyageai | 0.3.7 | Embedding API client | Already installed; has `AsyncClient` with native async `embed()` |
| pydantic-settings | 2.x | Config management | Already installed; `model_post_init()` for startup validation |
| fastapi | 0.115.x | Web framework | Already installed; `CORSMiddleware` already configured |

### Supporting (Docker -- no Python packages)
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| tini | latest | PID 1 init system for Docker | Always in production Dockerfile |
| python:3.12-slim | 3.12 | Base Docker image | Multi-stage build base |

### No New Dependencies Required

This phase requires zero new pip packages. All changes are:
- Swapping `voyageai.Client` to `voyageai.AsyncClient` (same package)
- Adding validation logic to existing `Settings` class (pydantic-settings)
- Creating a new Dockerfile (Docker tooling only)
- Reading a new env var for CORS (pydantic-settings)

## Architecture Patterns

### Pattern 1: VoyageAI AsyncClient Migration
**What:** Replace synchronous `voyageai.Client` with `voyageai.AsyncClient` in `src/services/qa.py`
**When to use:** Any call to VoyageAI's embedding API from async code
**Why:** The synchronous `vo.embed()` blocks the asyncio event loop during the HTTP request to VoyageAI's servers (typically 200-2000ms). During this time, ALL concurrent requests are stalled -- no database queries, no other API calls, nothing. The `AsyncClient` uses aiohttp internally and yields control back to the event loop during the network wait.

**Current code (BLOCKING):**
```python
# src/services/qa.py, lines 171-174 and 387-390
vo = voyageai.Client(api_key=self._voyage_api_key)
q_embedding = vo.embed(
    [question], model="voyage-3", input_type="query"
).embeddings[0]
```

**Fixed code (NON-BLOCKING):**
```python
vo = voyageai.AsyncClient(api_key=self._voyage_api_key)
result = await vo.embed(
    [question], model="voyage-3", input_type="query"
)
q_embedding = result.embeddings[0]
```

**Call sites to fix:**
1. `_answer_rag()` method -- question embedding (line 171-174)
2. `embed_course_materials()` method -- batch document embedding (line 387-390)

**Confidence:** HIGH -- `voyageai.AsyncClient` confirmed installed, `embed()` confirmed as coroutine via `inspect.iscoroutinefunction()`.

### Pattern 2: Fail-Fast Config Validation
**What:** Reject known default/insecure values for critical config at startup
**When to use:** Application initialization, before any requests are served

**Current state (`src/config.py`):**
```python
supabase_jwt_secret: str = (
    "super-secret-jwt-token-with-at-least-32-characters-long"
)
database_url: str = (
    "postgresql+asyncpg://postgres:postgres@localhost:54322/postgres"
)
encryption_key: str = ""
```

These defaults are appropriate for local development but dangerous in production. The JWT secret default means any attacker can forge valid tokens. The all-zeros encryption key from `.env.example` means tokens are encrypted with a known key.

**Recommended approach:** Add a `model_post_init` validator to `Settings`:

```python
KNOWN_UNSAFE_JWT_SECRETS = frozenset({
    "super-secret-jwt-token-with-at-least-32-characters-long",
})
KNOWN_UNSAFE_ENCRYPTION_KEYS = frozenset({
    "0000000000000000000000000000000000000000000000000000000000000000",
    "",
})

def model_post_init(self, __context: Any) -> None:
    """Reject known-insecure defaults in production."""
    if self.debug:
        return  # Allow defaults in dev mode

    errors: list[str] = []
    if self.supabase_jwt_secret in KNOWN_UNSAFE_JWT_SECRETS:
        errors.append("SUPABASE_JWT_SECRET uses a known default value")
    if self.encryption_key in KNOWN_UNSAFE_ENCRYPTION_KEYS:
        errors.append("ENCRYPTION_KEY is missing or uses a known default")
    if "localhost" in self.database_url:
        errors.append("DATABASE_URL points to localhost in production")
    if errors:
        raise ValueError(
            "Production config validation failed:\n"
            + "\n".join(f"  - {e}" for e in errors)
        )
```

**Guard condition:** `debug: bool = True` is the existing guard. Production deployments set `DEBUG=false`. This means dev mode (default) allows all defaults, but production mode rejects them.

**Confidence:** HIGH -- pydantic `model_post_init` is the standard hook for cross-field validation in pydantic-settings.

### Pattern 3: Multi-Stage Docker Build with tini
**What:** Production Dockerfile with build stage and runtime stage
**When to use:** Any production Docker deployment

**Current Dockerfile issues:**
1. Single stage -- includes uv, build tools, dev deps in final image
2. `--reload` flag -- file watcher wastes CPU
3. Runs as root -- container escape risk
4. Copies `tests/` -- unnecessary attack surface
5. Exec form CMD -- cannot expand `${PORT}` variable
6. No init system -- PID 1 zombie process problem
7. No `uv.lock` copied -- non-reproducible builds

**Production Dockerfile structure:**
```
Stage 1: builder
  FROM python:3.12-slim
  COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
  COPY pyproject.toml uv.lock ./
  RUN uv sync --locked --no-dev --no-editable
  COPY src/ alembic/ alembic.ini ./

Stage 2: runtime
  FROM python:3.12-slim
  RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
  RUN useradd --create-home --shell /bin/bash appuser
  COPY --from=builder /app/.venv /app/.venv
  COPY --from=builder /app/src /app/src
  COPY --from=builder /app/alembic* /app/
  ENV PATH="/app/.venv/bin:$PATH"
  USER appuser
  ENTRYPOINT ["tini", "--"]
  CMD uvicorn src.web.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

**Key decisions:**
- `tini` as init system (PID 1 signal forwarding, zombie reaping)
- `uv sync --locked --no-dev` for reproducible prod-only install
- Shell form CMD for `${PORT:-8000}` expansion (Railway injects PORT)
- Non-root `appuser` for security
- Only `src/` and `alembic/` copied (no `tests/`, no `docs/`)

**Confidence:** HIGH -- verified against FastAPI Docker docs, uv Docker guide, and existing hardening research.

### Pattern 4: Environment-Based CORS Configuration
**What:** Read CORS origins from env var with dev-safe default
**When to use:** Any multi-origin deployment

**Current code (`src/web/main.py:31-37`):**
```python
application.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)
```

**Fix approach:** Add `cors_origins` field to Settings:
```python
# In Settings class
cors_origins: str = "http://localhost:3001"
```

Then parse in `create_app()`:
```python
settings = get_settings()
origins = [o.strip() for o in settings.cors_origins.split(",")]
application.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    ...
)
```

**Usage:**
- Local dev: no env var needed, defaults to `http://localhost:3001`
- Production: `CORS_ORIGINS=https://uniboard.vercel.app`
- Multiple: `CORS_ORIGINS=https://uniboard.vercel.app,https://staging.uniboard.vercel.app`

**Confidence:** HIGH -- standard FastAPI pattern, comma-separated env vars work with pydantic-settings.

### Anti-Patterns to Avoid
- **Don't use `asyncio.to_thread()` for VoyageAI:** The native `AsyncClient` is cleaner than wrapping synchronous calls. `asyncio.to_thread()` still creates a thread per call and has GIL contention. The async client uses aiohttp with proper connection pooling.
- **Don't validate config lazily:** Checking config at first request creates a race condition where some requests succeed and others fail. Validate at startup so the app either works completely or doesn't start at all.
- **Don't use `*` for CORS in production:** While `allow_origins=["*"]` works, it disables credential support (browsers refuse `Access-Control-Allow-Credentials: true` with wildcard origins).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async embedding calls | Thread pool wrapper around sync client | `voyageai.AsyncClient` | Native async with proper connection pooling, retry logic, backoff |
| Config validation | Custom startup scripts or decorators | Pydantic `model_post_init()` | Standard pydantic hook, runs at model instantiation, type-safe |
| PID 1 init system | Shell signal trap scripts | tini (Docker init) | Handles zombie reaping, signal forwarding, battle-tested |
| Docker PORT handling | Hardcoded port or env-file | Shell form CMD with `${PORT:-8000}` | Railway/Heroku/Render all inject PORT dynamically |

## Common Pitfalls

### Pitfall 1: VoyageAI Client Instantiation Per Call
**What goes wrong:** Creating a new `voyageai.AsyncClient` instance for every embedding call opens and closes HTTP connections, losing connection pooling benefits.
**Why it happens:** Copy-pasting the existing pattern where `vo = voyageai.Client(...)` is inside the method body.
**How to avoid:** Create the `AsyncClient` once per `QAService` instance (in `__init__`) or as a module-level singleton. The client is safe to reuse across calls -- it manages its own connection pool.
**Warning signs:** Slow embedding calls, "connection pool exhausted" errors under load.

### Pitfall 2: Config Validation Breaking Tests
**What goes wrong:** Adding strict config validation in `model_post_init()` causes test failures because tests use default/dummy values.
**Why it happens:** Tests don't set `DEBUG=true` explicitly, or the test conftest creates settings with production-like `debug=False`.
**How to avoid:** Gate validation behind `if not self.debug: ...`. The default is `debug: bool = True`, so all existing tests pass without changes. Only production (which sets `DEBUG=false`) triggers validation.
**Warning signs:** Tests that were passing now fail with "Production config validation failed".

### Pitfall 3: Docker HEALTHCHECK vs Railway Healthcheck
**What goes wrong:** The `HEALTHCHECK` directive in the Dockerfile and Railway's `healthcheckPath` serve different purposes. The Docker HEALTHCHECK runs continuously; Railway's health check runs only during deployment.
**Why it happens:** Confusion between Docker's built-in health monitoring and Railway's deployment readiness check.
**How to avoid:** Include both. Docker HEALTHCHECK provides container-level monitoring for `docker compose`. Railway's `healthcheckPath` in `railway.toml` provides deployment gating. They can point to the same `/health` endpoint.
**Warning signs:** Railway deployment shows "healthy" but `docker compose ps` shows "unhealthy" (or vice versa).

### Pitfall 4: tini Not Installed in Slim Image
**What goes wrong:** `python:3.12-slim` does not include tini. If the Dockerfile doesn't explicitly install it, the `ENTRYPOINT ["tini", "--"]` fails.
**Why it happens:** Assuming slim images include all common tools.
**How to avoid:** Explicitly `apt-get install -y --no-install-recommends tini` in the runtime stage. Clean up apt cache with `rm -rf /var/lib/apt/lists/*`.
**Warning signs:** Container fails to start with "exec tini: not found".

### Pitfall 5: Comma-Separated CORS Origins with Whitespace
**What goes wrong:** `CORS_ORIGINS=https://a.com, https://b.com` (space after comma) creates origin `" https://b.com"` which never matches.
**Why it happens:** Shell env vars preserve whitespace.
**How to avoid:** Strip whitespace when parsing: `[o.strip() for o in settings.cors_origins.split(",")]`.
**Warning signs:** CORS errors in browser console for some origins but not others.

## Code Examples

### VoyageAI AsyncClient Migration (verified pattern)

```python
# Before (BLOCKING -- current code in src/services/qa.py)
import voyageai
vo = voyageai.Client(api_key=self._voyage_api_key)
result = vo.embed([question], model="voyage-3", input_type="query")
q_embedding = result.embeddings[0]

# After (NON-BLOCKING)
import voyageai
vo = voyageai.AsyncClient(api_key=self._voyage_api_key)
result = await vo.embed([question], model="voyage-3", input_type="query")
q_embedding = result.embeddings[0]
```
Source: Verified via `inspect.iscoroutinefunction(AsyncClient.embed)` on installed `voyageai==0.3.7`

### Existing asyncio.to_thread Pattern (project reference)

```python
# src/email/ses.py -- existing project pattern for wrapping sync calls
await asyncio.to_thread(
    self._client.send_email,
    Source=sender,
    Destination={"ToAddresses": [to_email]},
    ...
)
```
Source: `src/email/ses.py:32-38` -- NOT recommended for VoyageAI since native async client exists.

### pydantic model_post_init Config Validation

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    debug: bool = True
    supabase_jwt_secret: str = "super-secret-..."
    encryption_key: str = ""
    database_url: str = "postgresql+asyncpg://...localhost..."

    def model_post_init(self, __context: Any) -> None:
        if self.debug:
            return
        # Fail fast in production
        if self.supabase_jwt_secret in _KNOWN_UNSAFE:
            raise ValueError("...")
```
Source: Pydantic v2 docs -- `model_post_init` runs after all field validation.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `asyncio.to_thread()` wrappers for sync HTTP clients | Use native async clients when available | Always preferred | Eliminates thread overhead, proper connection pooling |
| Gunicorn + multiple Uvicorn workers | Single Uvicorn per container, orchestrator scales | FastAPI docs 2024 | Simpler, avoids conflicting with container orchestration |
| `python:3.12` base image | `python:3.12-slim` | Always for production | ~800MB vs ~150MB final image |
| uv pip install from pyproject.toml | `uv sync --locked` from uv.lock | uv 0.4+ | Reproducible builds, lockfile-based |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3+ with pytest-asyncio 0.25+ |
| Config file | `pyproject.toml` [tool.pytest.ini_options] |
| Quick run command | `python3 -m pytest tests/unit/ -x --timeout=30 -q` |
| Full suite command | `python3 -m pytest tests/ --timeout=120 -q` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRIT-01 | VoyageAI embed calls are async (non-blocking) | unit | `python3 -m pytest tests/unit/test_qa_service.py -x -q` | Exists (needs new test cases) |
| CRIT-03 | App refuses to start with unsafe defaults when debug=False | unit | `python3 -m pytest tests/unit/test_config_validation.py -x -q` | Wave 0 |
| CRIT-04 | Production Docker image builds correctly | smoke | `docker build -f Dockerfile.production -t uniboard-prod . && docker run --rm uniboard-prod python -c "import src"` | Manual (Docker build) |
| SEC-01 | CORS origins read from env var | unit | `python3 -m pytest tests/unit/test_cors_config.py -x -q` | Wave 0 |

### Sampling Rate
- **Per task commit:** `python3 -m pytest tests/unit/ -x --timeout=30 -q`
- **Per wave merge:** `python3 -m pytest tests/ --timeout=120 -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_config_validation.py` -- covers CRIT-03 (fail-fast on unsafe defaults)
- [ ] `tests/unit/test_cors_config.py` -- covers SEC-01 (env-based CORS origins)
- [ ] New test cases in `tests/unit/test_qa_service.py` -- covers CRIT-01 (AsyncClient usage verification)

*(No new framework install needed -- pytest already configured)*

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12 | Backend runtime | Yes | 3.12.7 | -- |
| Docker | Dockerfile.production build/test | Yes | 28.5.1 | -- |
| uv | Dependency management | Yes | 0.6.8 | -- |
| voyageai (AsyncClient) | CRIT-01 | Yes | 0.3.7 | asyncio.to_thread() wrapper |
| tini | Docker init system | N/A (installed in Docker image) | -- | apt-get install in Dockerfile |

**Missing dependencies with no fallback:** None
**Missing dependencies with fallback:** None

## Open Questions

1. **VoyageAI AsyncClient lifecycle management**
   - What we know: The `AsyncClient` manages an aiohttp session internally. Creating one per call is wasteful.
   - What's unclear: Whether the `AsyncClient` needs explicit cleanup (`.close()`) or handles it via `__del__`.
   - Recommendation: Create the client once per `QAService` instance in `__init__`. If it has a `.close()` method, call it when the service is done. If not, let the GC handle it. Either way, don't create it per-call.

2. **Dockerfile.production vs Dockerfile naming**
   - What we know: Railway auto-detects `Dockerfile` in root. Creating `Dockerfile.production` requires `railway.toml` to point to it.
   - What's unclear: Whether to rename existing `Dockerfile` to `Dockerfile.dev` or keep both.
   - Recommendation: Keep existing `Dockerfile` for local dev (docker-compose.yml references it). Create `Dockerfile.production` for Railway. Phase 26 will add `railway.toml` pointing to it.

## Sources

### Primary (HIGH confidence)
- VoyageAI Python SDK (installed `voyageai==0.3.7`) -- `AsyncClient` confirmed via `inspect.iscoroutinefunction()`, same `embed()` signature as sync client
- [VoyageAI AsyncClient source](https://github.com/voyage-ai/voyageai-python/blob/main/voyageai/client_async.py) -- async embed() method with retry logic
- Existing codebase analysis: `src/services/qa.py` (two blocking call sites), `src/config.py` (unsafe defaults), `Dockerfile` (dev-mode only), `src/web/main.py` (hardcoded CORS)
- Existing project pattern: `src/email/ses.py` uses `asyncio.to_thread()` for boto3 -- proves the team understands async blocking, but native async is preferred
- FastAPI official Docker docs -- multi-stage build, single uvicorn process per container

### Secondary (MEDIUM confidence)
- [Milestone-level hardening research](.planning/research/hardening/) -- ARCHITECTURE.md, PITFALLS.md, SUMMARY.md (thorough parallel research done 2026-04-01)
- Pydantic v2 docs -- `model_post_init` hook for cross-field validation

### Tertiary (LOW confidence)
- None -- all findings verified against installed code or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all changes use existing libraries
- Architecture: HIGH -- patterns verified against installed code, existing project conventions, and official docs
- Pitfalls: HIGH -- drawn from codebase analysis + milestone-level hardening research already completed

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain -- Docker, pydantic, FastAPI patterns change slowly)
