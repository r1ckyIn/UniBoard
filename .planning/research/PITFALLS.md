# Pitfalls Research: Hardening & Production Deployment

**Domain:** FastAPI + Next.js production hardening for University GPA dashboard
**Researched:** 2026-04-01
**Scope:** Adding CI/CD, Docker, monitoring, security, and deployment hardening to existing UniBoard codebase
**Overall confidence:** HIGH -- pitfalls derived from codebase audit + verified community patterns

---

## Common Mistakes

Mistakes organized by area, mapped to the phases that should address them.

### 1. CI/CD Pipeline (GitHub Actions for Python + Next.js Monorepo)

| Pitfall | Impact | Prevention | Phase |
|---------|--------|------------|-------|
| **Full rebuild on every push** -- both Python and Next.js rebuild even when only one changed | Wasted CI minutes, 5-10min per PR. At scale, blocks merges. | Use `dorny/paths-filter` or `tj-actions/changed-files` to detect which subdirectory changed. Run `backend-ci` only when `src/`, `tests/`, `pyproject.toml` change; `frontend-ci` only when `frontend/` changes. Always run both on `main` merges. | CI setup |
| **uv cache miss on every run** -- not caching `uv` dependency resolution | Python CI takes 60-90s extra per run for dependency install. | Cache `~/.cache/uv` with key `${{ hashFiles('pyproject.toml') }}`. uv is fast but network-bound package downloads still add up. For pnpm, cache `~/.pnpm-store` with `pnpm-lock.yaml` hash. | CI setup |
| **Running mypy/ruff/pytest in same job** -- one failure blocks feedback on others | Developer waits 3min for pytest to finish only to learn ruff already failed. | Parallelize: separate jobs for `lint` (ruff), `typecheck` (mypy), `test` (pytest), `frontend-lint`, `frontend-typecheck`, `frontend-test`. Use `needs: [lint, typecheck]` only for deploy job. | CI setup |
| **No required status checks configured** -- PRs merge with failing CI | Broken code reaches main. Deployment fails downstream. | Configure branch protection: require `backend-lint`, `backend-typecheck`, `backend-test`, `frontend-build` as required checks. Use `if: always()` on a final `ci-gate` job that reports overall status. | CI setup |
| **Alembic migration not tested in CI** -- schema changes break at deploy time | Migration syntax errors, missing imports, or upgrade/downgrade asymmetry discovered only during Railway deploy. | Add a CI step: start a disposable PostgreSQL service container, run `alembic upgrade head`, then `alembic downgrade -1` to verify reversibility. Use `services: postgres:15` in the GitHub Actions job. | CI setup |
| **Forgetting `UNIBOARD_DISABLE_SYNC=true` in test CI** -- APScheduler starts during pytest | Tests hang or produce flaky failures from background sync tasks executing. The codebase already has this env guard but CI must set it. | Always set `UNIBOARD_DISABLE_SYNC=true` in pytest CI environment. Also set dummy values for `SUPABASE_JWT_SECRET` and `DATABASE_URL` (pointing to CI Postgres). | CI setup |
| **Next.js build failure from missing env vars** -- `NEXT_PUBLIC_*` vars not set at build time | Build succeeds locally (`.env.local` exists) but fails in CI because env vars aren't injected. `process.env.NEXT_PUBLIC_SUPABASE_URL!` becomes `undefined!`. | Create `.env.ci` with placeholder values for all `NEXT_PUBLIC_*` vars. In CI, either source this file or set vars explicitly. Document every required env var in a `env.example` file. | CI setup |

### 2. Railway Deployment (FastAPI Backend)

| Pitfall | Impact | Prevention | Phase |
|---------|--------|------------|-------|
| **APScheduler duplicate execution with multiple workers** -- gunicorn spawns N processes, each starts its own scheduler | Sync tasks run N times concurrently (duplicate API calls, race conditions on DB writes, N times the Canvas API rate limit consumption). This is the #1 Railway deployment bug for this codebase. | **Option A (recommended for v1):** Run exactly 1 uvicorn worker (`--workers 1`) on Railway. APScheduler runs in-process safely. Scale vertically (more RAM/CPU on single instance). **Option B (future):** Extract scheduler to a separate Railway service (worker process) communicating via Redis/database job queue. Web service runs with multiple workers but no scheduler. | Docker + Deploy |
| **`--reload` in production Dockerfile** -- file watcher consumes CPU, triggers restarts on any file change | CPU overhead from inotify watches. Any stray file write (log, temp) can restart the server. Known existing issue in the Dockerfile. | Remove `--reload` from CMD. Use `uvicorn src.web.main:app --host 0.0.0.0 --port 8000` for production. Keep `--reload` only in `docker-compose.yml` for local dev (via volume mount). | Docker |
| **Health check always returns 200** -- Railway/Docker thinks service is healthy when database is down | Traffic routes to an instance that can't serve requests. Users see 500 errors but orchestrator doesn't restart. Current health endpoint returns 200 even with `status: degraded`. | Return HTTP 503 when database is disconnected. Railway's health check uses HTTP status codes, not response body. Keep a separate `/ready` (for traffic routing) and `/health` (for liveness). `/ready` returns 503 if DB is down. `/health` returns 200 unless the process itself is broken. | Health check |
| **No graceful shutdown** -- Railway sends SIGTERM, uvicorn gets 10s to shut down, APScheduler jobs may be mid-execution | In-flight sync tasks get killed mid-write. Database connections left open. Partial data written. | Handle SIGTERM: `scheduler.shutdown(wait=True)` with a reasonable timeout (e.g., 30s). Set Railway's `RAILWAY_HEALTHCHECK_TIMEOUT` accordingly. Ensure database sessions are committed/rolled back in sync task finally blocks. The current code uses `wait=False` which is unsafe for production. | Deploy config |
| **Cold start timeout** -- Railway sleeps free-tier services. First request after sleep has 10-20s latency (import time + DB pool + APScheduler startup + initial sync triggers) | First user after idle period sees timeout or very slow response. Initial sync tasks (5 one-shot jobs) compete with the first request for CPU/memory. | Delay initial sync triggers by 30-60 seconds after startup (use `misfire_grace_time` and `next_run_time=datetime.now() + timedelta(seconds=60)`). Ensure health check endpoint responds before sync starts. Consider Railway's always-on option ($5/mo) to avoid cold starts entirely. | Deploy config |
| **No connection pooling limits** -- asyncpg creates unlimited connections, exhausts Supabase's pool | Supabase free tier allows 60 direct connections. If APScheduler tasks + web requests all open connections, pool exhaustion causes `too many connections` errors. | Set SQLAlchemy pool limits: `pool_size=5, max_overflow=10` in engine creation. Use Supabase's connection pooler (PgBouncer on port 6543) for the web process. Direct connection (port 5432) for migrations only. | DB config |
| **VoyageAI blocking call in async context** -- `vo.embed()` is a synchronous HTTP call inside `async def _answer_rag()` | Blocks the entire asyncio event loop for 1-5 seconds per embedding call. All concurrent requests stall. Known existing issue. | Wrap in `asyncio.to_thread()`: `embeddings = await asyncio.to_thread(vo.embed, chunks, model="voyage-3", input_type="document")`. The project already uses this pattern in `src/email/ses.py` for boto3 calls. Apply the same pattern to both `_answer_rag` and `embed_course_materials`. | Code fix |

### 3. Vercel Deployment (Next.js Frontend)

| Pitfall | Impact | Prevention | Phase |
|---------|--------|------------|-------|
| **API route timeout for AI streaming** -- Vercel free tier has 10s function timeout, AI chat streaming can take 30-60s | SSE stream from `/api/v1/threads/` gets killed at 10s. User sees partial response then connection drops. | **Do not proxy AI streaming through Vercel API routes.** Connect directly from the browser to the Railway FastAPI backend for streaming endpoints (the frontend already does this via `NEXT_PUBLIC_API_URL`). For non-streaming API routes, set `maxDuration` in route config: `export const maxDuration = 30;` (requires Vercel Pro for >10s). | Deploy config |
| **Frontend health check is fake** -- current `/api/v1/health/route.ts` hardcodes `status: "healthy"` without checking anything | Monitoring tools show green even when backend is down or Supabase is unreachable. False confidence. | Either (a) remove the frontend health endpoint entirely (Vercel manages frontend health), or (b) make it actually ping the Python backend `/health` endpoint. Option (a) is simpler and correct -- Vercel's own health monitoring is sufficient for static/SSR apps. | Health check |
| **`NEXT_PUBLIC_API_URL` empty string fallback** -- code uses `process.env.NEXT_PUBLIC_API_URL \|\| ""` which resolves to same-origin | In production, frontend is on `uniboard.vercel.app` and backend is on `uniboard.railway.app`. Empty string means API calls go to Vercel's own domain, returning 404. | Make `NEXT_PUBLIC_API_URL` **required** in production. Add a build-time check: if `NODE_ENV=production` and `NEXT_PUBLIC_API_URL` is empty, fail the build. Add a runtime warning in the API client if the URL is relative. | Env var management |
| **Server Components calling Python API without error boundaries** -- RSC data fetching fails, entire page crashes | User sees Next.js error page instead of graceful degradation. One backend timeout breaks the whole page. | Wrap data-fetching Server Components in `<Suspense>` with fallback UI. Use `error.tsx` boundary files per route segment. For critical data (grades, deadlines), show cached/stale data when backend is unreachable. | Frontend hardening |
| **Middleware auth check latency** -- Next.js middleware runs on every request, Supabase token refresh adds 100-300ms | Every page navigation gets slower. Users on slow connections see noticeable delay. | Use Supabase's `getSession()` which reads from cookies without network call. Only call `getUser()` (which makes a network request) when you need fresh user data. Cache the session check result for the request lifetime. | Auth optimization |

### 4. Docker Production Image

| Pitfall | Impact | Prevention | Phase |
|---------|--------|------------|-------|
| **No init system (PID 1 problem)** -- Python process runs as PID 1, doesn't reap zombie processes or handle signals properly | `SIGTERM` is ignored (Python's default PID 1 behavior). `docker stop` waits 10s then `SIGKILL`s the process. APScheduler tasks get no chance to clean up. Zombie processes accumulate from subprocesses (if any). Known existing issue. | Add `tini` as init system. In Dockerfile: `RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*` then `ENTRYPOINT ["tini", "--"]`. Alternatively use `--init` flag in docker-compose or Docker's built-in `DOCKER_DEFAULT_INIT`. | Docker |
| **Running as root** -- current Dockerfile doesn't create a non-root user | Container compromise gives attacker root on the host (in some configurations). Against security best practices. | Add to Dockerfile: `RUN useradd -r -s /bin/false appuser && USER appuser`. Ensure `/app` is writable by appuser. Place this after `COPY` and before `CMD`. | Docker |
| **Dev dependencies in production image** -- `uv pip install -e ".[dev]"` installs pytest, mypy, ruff in production | Image 200-400MB larger than necessary. Attack surface increased (dev tools available to attacker). Slower builds and deploys. | Multi-stage build: stage 1 (`builder`) installs all deps and runs tests; stage 2 (`runtime`) copies only production deps. `uv pip install --system --no-cache "."` (without `[dev]`). | Docker |
| **No `.dockerignore`** -- entire repo (including `.git`, `node_modules`, `frontend/`, `prototype/`) is sent as build context | Build context is 500MB+ instead of 20MB. Builds take 30-60s longer. Sensitive files (`.env`) may be included. | Create `.dockerignore` excluding: `.git`, `frontend/`, `prototype/`, `node_modules/`, `*.pyc`, `__pycache__/`, `.env*`, `.planning/`, `docs/`, `supabase/`, `.claude/`, `mcp-server/`. | Docker |
| **Source code mounted as volume in production** -- `docker-compose.yml` mounts `./src:/app/src` | In production, this would override the built image's code with whatever is on the host. If deployed via compose in production (unlikely but possible), this is catastrophic. | Create separate `docker-compose.prod.yml` without volume mounts. Or better: use `docker-compose.yml` only for local dev, deploy via Railway's Dockerfile build. | Docker |
| **Large base image** -- `python:3.12-slim` is ~150MB, acceptable but could be smaller | Slower pulls during deploy. | `python:3.12-slim` is actually the right choice for this project. Don't use Alpine -- asyncpg, lxml, and cryptography all require C compilation that breaks on musl libc. The slim image is the pragmatic choice. | Docker |

### 5. Monitoring and Logging

| Pitfall | Impact | Prevention | Phase |
|---------|--------|------------|-------|
| **Logging every request body** -- structlog with verbose middleware logs full request/response payloads | Log storage costs explode. PII/tokens accidentally logged (despite redaction, new fields slip through). Performance overhead of serializing large payloads. | Log request metadata only: method, path, status, duration, user_id, request_id. Log full payloads only at DEBUG level (disabled in production). The current `redact_sensitive_fields` processor is good but only catches known key names -- new sensitive fields won't be caught. | Monitoring |
| **No request duration tracking** -- current middleware adds request_id but not timing | Can't identify slow endpoints. Can't set SLO alerts. Invisible performance degradation. | Add timing to the request_id middleware: `start = time.monotonic()` at entry, `duration_ms = (time.monotonic() - start) * 1000` at exit. Log with structlog: `logger.info("request_completed", method=..., path=..., status=..., duration_ms=...)`. | Monitoring |
| **Alert fatigue from APScheduler** -- every sync cycle logs success for every user for every data type | 8 sync types x 100 users x every-15-min = 3,200 log entries/hour of "sync completed successfully." Obscures actual errors. | Log sync summaries, not per-user results: `sync_grades_completed: users=95, failed=5, duration=12s`. Log individual failures at WARNING level. Only log individual successes at DEBUG level. | Monitoring |
| **No error rate tracking** -- errors logged but not counted/aggregated | Can't detect gradual degradation (error rate rising from 1% to 5%). No alerting threshold. | Use structlog's bound logger to tag error types. Expose `/metrics` endpoint with error counts per endpoint (or integrate Sentry for error tracking with deduplication). Railway provides basic metrics; supplement with Sentry free tier (5K errors/mo). | Monitoring |
| **structlog using PrintLoggerFactory in production** -- bypasses standard library, no integration with log aggregation tools | Railway captures stdout, so this works, but loses integration with tools expecting standard library logging. No log level filtering in production -- `make_filtering_bound_logger(0)` means level 0 (DEBUG) and above. | Change to `make_filtering_bound_logger(logging.INFO)` in production (import from settings). Keep `PrintLoggerFactory` for Railway (stdout capture is correct). Add `log_level` env var support (already in Settings but not wired into `configure_logging`). | Monitoring |
| **Missing correlation IDs in sync tasks** -- request_id middleware only covers HTTP requests, not background scheduler tasks | Can't trace a sync failure through multiple service calls. Debugging APScheduler issues requires manual timestamp correlation. | Bind a `sync_id` (UUID) to structlog context at the start of each sync task using `structlog.contextvars.bind_contextvars(sync_id=...)`. Clear it at task end. | Monitoring |

### 6. Security Hardening

| Pitfall | Impact | Prevention | Phase |
|---------|--------|------------|-------|
| **Over-restrictive CORS breaks production auth** -- changing from `allow_origins=["http://localhost:3001"]` to a strict production origin breaks preflight requests | Login fails silently. API calls return CORS errors that are hard to debug (browser shows generic "blocked by CORS" without details). | Make CORS origins configurable via env var: `ALLOWED_ORIGINS=https://uniboard.vercel.app,http://localhost:3001`. Parse as comma-separated list. In production, include the exact Vercel deployment URL. Remember Vercel generates preview URLs (`uniboard-*.vercel.app`) -- decide whether to allow wildcard for previews or restrict to production only. | Security |
| **CORS wildcard in desperation** -- after CORS errors in staging, developer sets `allow_origins=["*"]` to "fix" it | Any website can make authenticated API calls on behalf of logged-in users. Combined with `allow_credentials=True`, this is a critical security vulnerability. Browsers actually reject `*` with credentials, so it breaks AND is insecure. | Never use `allow_origins=["*"]` with `allow_credentials=True`. Debug CORS methodically: check the `Origin` header in the preflight request, verify it's in the allowed list, check that `Access-Control-Allow-Credentials: true` is in the response. | Security |
| **Supabase JWT secret mismatch** -- dev uses the default `super-secret-jwt-token-with-at-least-32-characters-long`, production needs the real Supabase project JWT secret | All JWT validation fails silently (returns 401 for every request). Users appear "logged out" even with valid sessions. The current config default is a known placeholder. | Make `SUPABASE_JWT_SECRET` **required** in production (no default). Add a startup check: if `debug=False` and `supabase_jwt_secret` equals the default placeholder, raise `RuntimeError("Production requires real SUPABASE_JWT_SECRET")`. | Security |
| **Config defaults unsafe for production** -- `debug: bool = True`, `encryption_key: str = ""`, `supabase_jwt_secret` has dev default | Production accidentally runs in debug mode (verbose errors, possibly debug endpoints). Empty encryption key means tokens stored unencrypted or encryption silently fails. Known existing issue. | Add a `validate_production_config()` method on Settings that runs when `debug=False`. It should assert: encryption_key is not empty, supabase_jwt_secret is not the placeholder, anthropic_api_key is set (if AI features enabled), database_url does not contain `localhost`. Call this in the FastAPI lifespan before starting the scheduler. | Security |
| **Missing rate limiting** -- no rate limiting on any endpoint | Single user or attacker can exhaust API resources. AI endpoints (`/api/v1/ai/ask`) could trigger unlimited Claude API costs. Background sync could be triggered repeatedly via `/api/v1/sync/trigger`. | Add `slowapi` (built on `limits` library) for per-user rate limiting. Critical limits: AI endpoints (20/hour per user), sync trigger (5/hour per user), auth endpoints (10/minute per IP). Configure via env vars so production limits differ from dev. | Security |
| **No HTTPS enforcement** -- FastAPI doesn't enforce HTTPS, relies on Railway/Vercel reverse proxy | Man-in-the-middle attacks intercept JWTs. Cookies without `Secure` flag sent over HTTP. | Railway and Vercel enforce HTTPS at the edge, so this is handled by infrastructure. But add `TrustedHostMiddleware` to reject requests to unexpected hostnames. Add `Secure` and `SameSite=Lax` to any cookies. Set `HSTS` header via middleware. | Security |

### 7. Database Migration During Deployment

| Pitfall | Impact | Prevention | Phase |
|---------|--------|------------|-------|
| **Running migrations in app startup** -- `alembic upgrade head` runs in FastAPI lifespan | If migration fails, the app crashes on startup. If migration takes 30s, health check times out and Railway restarts the container (infinite restart loop). Two instances starting simultaneously run migrations concurrently (race condition). | Run migrations as a **separate step** before starting the app. In Railway: use a release command or a separate deploy step. In Docker: use an entrypoint script that runs `alembic upgrade head` then `exec uvicorn ...`. Never run migrations inside the FastAPI lifespan handler. | Deploy pipeline |
| **Alembic and Supabase CLI migration conflict** -- project uses both Alembic (in `alembic/`) and Supabase CLI migrations (in `supabase/`) | Two migration systems managing the same database. One doesn't know about the other's changes. `alembic upgrade head` may conflict with `supabase db push` changes. Schema drift between the two systems. | **Choose one migration system and stick with it.** Since the Python backend owns the data model (SQLAlchemy models), Alembic should be the single source of truth for schema migrations. Use Supabase CLI only for Auth/RLS policies and Edge Functions, not for table DDL. Document this boundary clearly. | Migration strategy |
| **No migration downgrade path** -- Alembic migrations have `upgrade()` but empty `downgrade()` | If a migration breaks production data, there's no automated rollback. Manual SQL fixes under pressure lead to more errors. | Write `downgrade()` for every migration. Test downgrade in CI (see CI pipeline section). For destructive changes (DROP COLUMN), the downgrade should re-add the column. For data migrations, consider if downgrade is even possible (it may not be). | Migration discipline |
| **Large migration locks tables** -- `ALTER TABLE ADD COLUMN ... DEFAULT ...` on a large table acquires an exclusive lock | All reads/writes to that table block for the duration of the migration. Users see 500 errors or timeouts. For tables like `grades` or `deadlines` with many rows, this can take minutes. | Use `ADD COLUMN ... DEFAULT NULL` (instant on PostgreSQL 11+). Add the default value via a separate `UPDATE` in batches. For index creation, use `CREATE INDEX CONCURRENTLY` (requires Alembic's `op.execute()` with raw SQL, not `op.create_index()`). | Migration discipline |
| **Forgetting pgvector extension in migration** -- Alembic migration references `VECTOR` type but pgvector extension isn't installed | `alembic upgrade head` fails with `type "vector" does not exist`. This already bit the project once (documented in CLAUDE.md). | Add `op.execute("CREATE EXTENSION IF NOT EXISTS vector")` as the first operation in any migration that introduces vector columns. Test the full migration chain from scratch in CI. | Migration discipline |

### 8. Environment Variable Mismatches

| Pitfall | Impact | Prevention | Phase |
|---------|--------|------------|-------|
| **Dev defaults silently used in production** -- pydantic-settings fills defaults when env vars are missing, no error raised | Production runs against `localhost:54322` database, `localhost:54321` Supabase, debug mode enabled. Symptoms are subtle: app "works" but talks to nothing or the wrong service. Current config has dev-friendly defaults for EVERY setting. | Create two tiers of settings: required-in-production (no defaults) and optional (with defaults). Use a custom validator: `@model_validator(mode="after")` that checks if `self.debug is False` and critical fields are still at their default values. Raise `ValueError` with a clear message listing which env vars are missing. | Config hardening |
| **NEXT_PUBLIC_ vs server-only env var confusion** -- putting secret keys in `NEXT_PUBLIC_*` exposes them to the browser | Supabase service role key or API secrets visible in browser JavaScript bundle. `NEXT_PUBLIC_` variables are inlined at build time into client bundles. | Audit all env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are correct (these are public by design). `SUPABASE_SERVICE_ROLE_KEY` must NEVER be `NEXT_PUBLIC_` prefixed. Backend secrets stay in Railway env vars only. | Security |
| **Railway and Vercel env vars not synced** -- adding a new feature requires env vars in both services, developer forgets one | Backend expects `VOYAGE_API_KEY` but it's only set in Railway, not needed in Vercel. Or `NEXT_PUBLIC_API_URL` is updated in Vercel but the old Railway URL still hardcoded somewhere. | Maintain a single `env.requirements.md` document listing every env var, which service needs it (Railway/Vercel/both), whether it's required or optional, and the production value source. Review this document during every PR that adds a new env var. | Env management |
| **`.env` file committed to git** -- especially dangerous with real Canvas/Ed tokens during development | Tokens exposed in git history forever. Even deleting the file doesn't remove it from history. GitHub secret scanning may flag it. | `.env` is already in `.gitignore`. Add a pre-commit hook check: if any `.env*` file (except `.env.example`) is staged, reject the commit. Provide `.env.example` with placeholder values and comments explaining each variable. | Security |
| **Encrypted token key rotation impossible** -- `ENCRYPTION_KEY` used for AES-256-GCM but no rotation mechanism | If the key is compromised, all stored Canvas/Ed tokens must be re-encrypted. Without rotation logic, this requires manual database intervention. | Design encryption with key versioning from the start. Store `key_version` alongside encrypted data. When rotating, encrypt new tokens with the new key, and re-encrypt existing tokens in a background migration. Support decryption with any known key version. | Security (future) |

---

## Integration Pitfalls

Mistakes specific to adding hardening features to an **existing working codebase** -- the risk of breaking what already works.

### Integration Pitfall 1: CORS Change Breaks Existing Frontend

**What goes wrong:** Developer changes CORS from `allow_origins=["http://localhost:3001"]` to a configurable list but forgets to include `http://localhost:3001` in the dev default. Local development immediately breaks -- API calls return CORS errors, but the browser console error is vague ("blocked by CORS policy").

**Prevention:** Add CORS origins via environment variable with a dev-friendly default:
```python
cors_origins: str = "http://localhost:3001"  # comma-separated, production adds real origin
```
Parse as list in middleware setup. Test CORS changes by running frontend AND backend locally before merging.

**Detection:** Any API call from the browser returns a CORS error. Check browser Network tab -- preflight `OPTIONS` request returns without `Access-Control-Allow-Origin` header.

---

### Integration Pitfall 2: Health Check Change Triggers Restart Loop

**What goes wrong:** Developer fixes health check to return 503 when database is down. But during deployment, the new code starts before the database connection is established (async pool initialization takes 2-3 seconds). Railway's health check hits `/health` during startup, gets 503, considers the service unhealthy, and restarts it. Infinite restart loop.

**Prevention:** Implement a startup grace period. The health endpoint should return 200 for the first 30 seconds after process start regardless of DB status. Use a module-level `_startup_time = time.monotonic()` and check if `time.monotonic() - _startup_time < 30` before reporting DB failures. Alternatively, configure Railway's health check with a start period / initial delay.

**Detection:** Railway logs show repeated "Service restarting" entries every 30-60 seconds. Health check endpoint always returns 503 in the first few seconds.

---

### Integration Pitfall 3: Docker Multi-Stage Build Breaks Dev Workflow

**What goes wrong:** Developer creates a production multi-stage Dockerfile. Now `docker-compose up` for local development uses the production image (no dev dependencies, no volume mounts, no `--reload`). Developer must maintain two Dockerfiles or gets confused switching between them.

**Prevention:** Keep the existing Dockerfile for local development (renamed to `Dockerfile.dev` or keep as-is with docker-compose override). Create `Dockerfile.prod` for production/Railway. Railway's Dockerfile config can point to `Dockerfile.prod`. The local `docker-compose.yml` continues using the dev Dockerfile.

**Detection:** `docker-compose up` fails to mount volumes or doesn't have pytest available.

---

### Integration Pitfall 4: Adding Gunicorn Breaks APScheduler

**What goes wrong:** Developer adds gunicorn for production (`gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.web.main:app`). Each of the 4 workers starts its own APScheduler instance. Sync tasks run 4 times simultaneously. Canvas API rate limits are hit. Database receives 4x the writes. Duplicate data everywhere.

**Prevention:** For this project's architecture, **do not add gunicorn multi-worker mode until APScheduler is extracted to a separate service.** Run a single uvicorn worker in production. This is sufficient for the expected user load (100-500 students). When scaling is needed, extract the scheduler to a worker service first, then add gunicorn workers to the web service.

**Detection:** Database has duplicate sync entries. Canvas API returns 429 (rate limit). Sync logs show the same user being synced multiple times within the same cycle.

---

### Integration Pitfall 5: Production Config Validation Breaks Tests

**What goes wrong:** Developer adds startup validation that rejects default/empty config values when `debug=False`. Tests that don't explicitly set `debug=True` now crash on import because `get_settings()` is called at module level and the validator fires.

**Prevention:** The validator should only run when explicitly called (e.g., in FastAPI lifespan), not in the `Settings.__init__`. Use a separate `validate_for_production()` method, not a `@model_validator`. Tests set `UNIBOARD_DISABLE_SYNC=true` but don't set `DEBUG=true` -- add `DEBUG=true` to the test environment setup.

**Detection:** `pytest` fails on import with `RuntimeError: Production requires real SUPABASE_JWT_SECRET`.

---

### Integration Pitfall 6: Rate Limiting Breaks Background Sync

**What goes wrong:** Developer adds rate limiting (e.g., 60 requests/minute per IP) to all endpoints. The background sync engine calls the **same API endpoints internally** (or uses the same services). Internal sync requests get rate-limited and start failing.

**Prevention:** Rate limiting should be applied at the API layer (FastAPI middleware/dependency), not at the service layer. Background sync tasks call services directly, bypassing the API router, so they're unaffected. If sync does go through the API (e.g., internal HTTP calls), exempt internal requests by checking the source (local IP or a special header with a secret).

**Detection:** Sync logs show HTTP 429 errors. Sync success rate drops after rate limiting is deployed.

---

### Integration Pitfall 7: Logging Changes Break Structured Log Parsing

**What goes wrong:** Developer changes structlog configuration (new processors, different field names, different JSON structure). Existing log monitoring/alerting rules (if any) break because they depend on specific field names like `event`, `timestamp`, `level`.

**Prevention:** Define a log schema contract. The minimum fields that every log entry must have: `event` (string), `level` (string), `timestamp` (ISO 8601), `request_id` or `sync_id` (UUID). New fields can be added but these core fields must never be renamed or removed. Test this contract with a unit test that asserts log output structure.

**Detection:** Log aggregation dashboard shows "parse error" or missing fields. Alerts stop firing because the field they match on was renamed.

---

## Warning Signs

How to detect if you're making these mistakes during the hardening process.

### Pre-Deploy Checklist

| Check | Command / Method | Red Flag |
|-------|-----------------|----------|
| Docker image runs without `--reload` | `docker run <image>` and check logs | Logs show "Watching for changes" or uvicorn reload messages |
| Non-root user in container | `docker run <image> whoami` | Output is `root` |
| Health check returns real status | `curl -s http://localhost:8000/health` then stop DB, curl again | Status is still 200 when DB is down |
| CORS allows production origin | `curl -H "Origin: https://yourdomain.com" -X OPTIONS http://localhost:8000/api/v1/courses` | No `Access-Control-Allow-Origin` header in response |
| No dev defaults in production | Set `DEBUG=false`, unset all optional env vars, start the app | App starts successfully instead of failing with missing config |
| Migrations run independently | Run `alembic upgrade head` in a fresh database | Errors about missing tables, extensions, or circular dependencies |
| APScheduler runs exactly once | Start 2 instances, check logs for sync execution | Same sync task logged in both instances simultaneously |
| VoyageAI doesn't block event loop | Trigger a RAG query while sending concurrent requests | Concurrent requests stall during embedding |
| Docker image size is reasonable | `docker images <image>` | Image is >1GB (should be 300-500MB with slim base) |
| Signal handling works | `docker stop <container>` and check logs | No "graceful shutdown" log entry; container takes 10s to stop (SIGKILL) |

### Runtime Warning Signs

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Duplicate database entries after sync | Multiple APScheduler instances (gunicorn workers) | Check process count, verify single worker |
| 401 errors on all API calls in production | JWT secret mismatch between Supabase and Python config | Compare `SUPABASE_JWT_SECRET` with Supabase dashboard |
| Frontend API calls return CORS errors | Missing production origin in CORS allowed list | Check `Access-Control-Allow-Origin` response header |
| Alembic migration hangs | Table lock from non-concurrent index creation | Check `pg_locks` and `pg_stat_activity` |
| Container restarts every 30-60 seconds | Health check returning 503 during startup | Add startup grace period, check Railway deploy logs |
| Sync tasks suddenly stop running | APScheduler crashed silently (no error handler) | Check if scheduler is still alive: `/health` should report scheduler status |
| Memory leak over days | structlog or APScheduler accumulating state | Monitor RSS over time; check if scheduler stores growing job history |

---

## Sources

### FastAPI Production Deployment
- [FastAPI Deployment Documentation](https://fastapi.tiangolo.com/deployment/)
- [FastAPI Best Practices for Production 2026](https://fastlaunchapi.dev/blog/fastapi-best-practices-production-2026)
- [10 FastAPI Scaling Mistakes (2025)](https://medium.com/@ThinkingLoop/10-fastapi-scaling-mistakes-that-break-performance-39a426e360e3)
- [FastAPI Server Workers with Uvicorn](https://fastapi.tiangolo.com/deployment/server-workers/)

### Railway Deployment
- [Railway FastAPI Guide](https://docs.railway.com/guides/fastapi)
- [Deploy FastAPI to Railway with Dockerfile](https://www.codingforentrepreneurs.com/blog/deploy-fastapi-to-railway-with-this-dockerfile)
- [APScheduler with FastAPI Discussions](https://github.com/fastapi/fastapi/discussions/9143)

### Docker Best Practices
- [Docker Best Practices for Python (TestDriven.io)](https://testdriven.io/blog/docker-best-practices/)
- [Docker PID 1 and Tini](https://dev-aditya.medium.com/pid-1-and-tini-in-docker-why-your-container-ignores-ctrl-c-800b565cb76e)
- [dumb-init: Init System for Docker](https://engineeringblog.yelp.com/2016/01/dumb-init-an-init-for-docker.html)
- [Docker Official Best Practices](https://docs.docker.com/build/building/best-practices/)

### Vercel / Next.js Deployment
- [How to Solve Next.js Timeouts (Inngest)](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts)
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations)
- [Vercel Limits](https://vercel.com/docs/limits)

### CI/CD Monorepo
- [GitHub Actions Monorepo CI/CD Guide (2026)](https://dev.to/pockit_tools/github-actions-in-2026-the-complete-guide-to-monorepo-cicd-and-self-hosted-runners-1jop)
- [Vanilla GitHub Actions Monorepo Setup](https://generalreasoning.com/blog/2025/03/22/github-actions-vanilla-monorepo.html)

### Database Migrations
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)

### Security
- [Supabase Product Security](https://supabase.com/docs/guides/security/product-security)
- [Supabase Securing Your API](https://supabase.com/docs/guides/api/securing-your-api)

### Monitoring / Logging
- [structlog Logging Best Practices](https://www.structlog.org/en/stable/logging-best-practices.html)
- [structlog Performance](https://www.structlog.org/en/stable/performance.html)

### Environment Management
- [Environment Management Best Practices (2026)](https://www.envsentinel.dev/blog/environment-variable-management-tips-best-practices)
- [Storing Secrets in Env Vars Considered Harmful (Arcjet)](https://blog.arcjet.com/storing-secrets-in-env-vars-considered-harmful/)

### UniBoard Codebase (Direct Analysis)
- `Dockerfile` -- identified `--reload` in CMD, no init system, no non-root user, dev deps in production
- `src/config.py` -- identified unsafe defaults (debug=True, empty encryption_key, placeholder JWT secret)
- `src/web/main.py` -- identified hardcoded CORS origin, no rate limiting
- `src/web/routes/health.py` -- identified always-200 health check
- `src/sync/engine.py` -- identified `scheduler.shutdown(wait=False)`, initial sync at startup
- `src/services/qa.py` -- identified blocking VoyageAI calls in async context (lines 171-173, 387-389)
- `src/logging.py` -- identified `make_filtering_bound_logger(0)` (DEBUG level), `PrintLoggerFactory`
- `frontend/app/api/v1/health/route.ts` -- identified fake health check (hardcoded "healthy")
- `docker-compose.yml` -- identified volume mounts and dev environment defaults
- `CLAUDE.md` -- referenced known issues and project architecture
