# Phase 26: CI/CD & Production Deployment - Research

**Researched:** 2026-04-04
**Domain:** DevOps -- CI/CD, deployment platforms, error monitoring
**Confidence:** HIGH

## Summary

Phase 26 delivers three pillars: (1) GitHub Actions CI pipelines for automated backend and frontend validation, (2) Railway + Vercel deployment configuration for production hosting, and (3) Sentry error tracking and performance monitoring for both stacks. The project already has strong foundations -- a production Dockerfile (`Dockerfile.production`) with multi-stage build/tini/non-root user from Phase 22, lockfiles for both `uv` and `pnpm`, and all lint/type/test commands are defined and passing from Phase 24.

The main work involves creating configuration files (workflow YAML, railway.toml, vercel.json, Sentry init files) and installing Sentry SDKs. There are no architectural changes needed. The critical subtlety is the CSP header update -- both `next.config.ts` and `src/web/main.py` must add Sentry's ingest domain to `connect-src` or error reports will be silently blocked by the browser.

**Primary recommendation:** Structure as 3 plans: (1) GitHub Actions CI, (2) Railway + Vercel deployment config, (3) Sentry integration for both stacks. Each is independently testable and progressively builds on the previous.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPS-01 | GitHub Actions CI pipeline with separate backend (mypy+ruff+pytest) and frontend (tsc+eslint+build) workflows | Verified: `astral-sh/setup-uv` for Python, `pnpm/action-setup` + `actions/setup-node` for frontend. All commands exist in project (ruff check, mypy --strict, pytest, tsc --noEmit, eslint --max-warnings 0, next build). Lockfiles exist for reproducible installs. |
| OPS-02 | Railway and Vercel deployment config (railway.toml, vercel.json, env var documentation), deployed to production | Verified: `Dockerfile.production` already exists with multi-stage build, tini, non-root user. Railway needs `railway.toml` pointing to it. Vercel needs `frontend/vercel.json` or relies on `next.config.ts` headers. All env vars documented in `src/config.py` and `frontend/.env.example`. |
| OPS-03 | Sentry integrated for both Python backend (sentry-sdk) and Next.js frontend (@sentry/nextjs) with error tracking and performance monitoring | Verified: `sentry-sdk` auto-detects FastAPI integration. `@sentry/nextjs` supports Next.js 15 + Turbopack + App Router via `instrumentation-client.ts` pattern. Error boundaries already exist (`error.tsx`, `global-error.tsx`) -- Sentry hooks into existing `console.error` calls. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Code comments**: Must be pure English -- no Chinese in code files
- **Commit messages**: `<type>(<phase>-<plan>): <description>` format (GSD project with `.planning/`)
- **Backend tools**: mypy --strict, ruff, pytest, uv package manager
- **Frontend tools**: tsc --noEmit, ESLint --max-warnings 0, pnpm 9+, vitest
- **Deployment target**: Supabase (DB+Auth) + Railway (Python backend) + Vercel (Next.js frontend)
- **Backend dev server**: `uvicorn src.web.main:app --reload --port 8000`
- **Frontend dev server**: port 3001
- **Auth**: Frontend supabase-js direct to Supabase Auth; Python validates JWT
- **Data queries**: All data queries go through Python API; frontend does NOT query Supabase DB directly

## Standard Stack

### Core (CI/CD)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `astral-sh/setup-uv` | v7 | Install uv in GitHub Actions | Official Astral action, built-in caching via `enable-cache: true` |
| `pnpm/action-setup` | v4 | Install pnpm in GitHub Actions | Official pnpm action, required before `actions/setup-node` caching |
| `actions/setup-node` | v4 | Install Node.js in GitHub Actions | Standard action, `cache: 'pnpm'` for lockfile caching |
| `actions/checkout` | v4 | Checkout repository | Standard action |

### Core (Sentry)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `sentry-sdk` (Python) | `>=2.50,<3.0` (latest 2.53.0) | Backend error tracking + performance tracing | Auto-detects FastAPI integration, captures unhandled exceptions, request context, traces |
| `@sentry/nextjs` (npm) | `^10.47` | Frontend error tracking + performance tracing | Single SDK instruments React components, API routes, supports Turbopack + App Router |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `actions/upload-artifact` | v4 | Upload test/coverage artifacts | If coverage reporting is needed in CI |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate backend/frontend workflows | Single monorepo workflow with matrix | Separate is cleaner -- different runtimes (Python vs Node), different caching strategies, independent failure |
| Railway Dockerfile deploy | Railway Nixpacks auto-detect | Dockerfile gives full control, already written. Nixpacks may not handle uv + Python correctly |
| Vercel `vercel.json` headers | `next.config.ts` `headers()` (already exists) | Headers already configured in `next.config.ts` -- `vercel.json` is redundant for headers but useful for other Vercel settings |

**Installation:**
```bash
# Backend -- add sentry-sdk to production dependencies
cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard
uv add "sentry-sdk[fastapi]>=2.50,<3.0"

# Frontend -- add @sentry/nextjs
cd frontend && pnpm add @sentry/nextjs
```

## Architecture Patterns

### Recommended File Structure (new files only)

```
.github/
  workflows/
    backend-ci.yml       # Python: lint -> type -> test
    frontend-ci.yml      # Node: lint -> typecheck -> test -> build
  dependabot.yml         # Automated dependency updates
railway.toml             # Railway deployment config -> Dockerfile.production
frontend/
  vercel.json            # Vercel framework detection override (optional)
  instrumentation-client.ts   # Sentry browser SDK init
  sentry.server.config.ts     # Sentry Node.js server SDK init
  sentry.edge.config.ts       # Sentry Edge runtime SDK init
  instrumentation.ts           # Next.js instrumentation hook (imports sentry configs)
```

### Pattern 1: Separate CI Workflows per Stack

**What:** One workflow file per technology stack (backend-ci.yml, frontend-ci.yml)
**When to use:** Monorepo with different language runtimes
**Why:** Different caching strategies (uv cache vs pnpm store), different triggers (path filters), independent pass/fail status on PRs

```yaml
# .github/workflows/backend-ci.yml
name: Backend CI
on:
  push:
    branches: [main]
    paths: ['src/**', 'tests/**', 'pyproject.toml', 'uv.lock']
  pull_request:
    paths: ['src/**', 'tests/**', 'pyproject.toml', 'uv.lock']

jobs:
  lint-and-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v7
        with:
          enable-cache: true
      - run: uv sync --locked --all-extras --dev
      - run: uv run ruff check .
      - run: uv run mypy --strict src/

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v7
        with:
          enable-cache: true
      - run: uv sync --locked --all-extras --dev
      - run: uv run pytest tests/ -x --timeout=120
```

### Pattern 2: Sentry FastAPI Integration (Python)

**What:** Initialize Sentry SDK at app startup with FastAPI auto-detection
**When to use:** Production error tracking and performance monitoring

```python
# In src/web/main.py create_app()
import sentry_sdk

def create_app() -> FastAPI:
    settings = get_settings()

    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            traces_sample_rate=0.1,  # 10% in production
            send_default_pii=False,  # GDPR-safe
            environment="production" if not settings.debug else "development",
        )
    # ... rest of app setup
```

### Pattern 3: Sentry Next.js 15 + Turbopack + next-intl Chain

**What:** Wrap existing `withNextIntl` config with `withSentryConfig`
**Critical:** The wrapper chain order matters -- Sentry must be the outermost wrapper

```typescript
// frontend/next.config.ts
import { withSentryConfig } from "@sentry/nextjs";

// ... existing nextConfig and securityHeaders ...

// Chain: Sentry wraps next-intl wraps nextConfig
export default withSentryConfig(withNextIntl(nextConfig), {
  org: "uniboard",
  project: "uniboard-frontend",
  silent: !process.env.CI,
  // Source maps upload requires SENTRY_AUTH_TOKEN env var
});
```

### Pattern 4: Railway Dockerfile Deployment

**What:** railway.toml points to existing Dockerfile.production
**Critical:** Railway injects `PORT` env var -- already handled in Dockerfile.production CMD

```toml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile.production"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### Anti-Patterns to Avoid

- **Single combined workflow**: Do not put Python and Node.js CI in one workflow file -- they have completely different setup, caching, and failure modes
- **Gunicorn in Railway**: Do NOT add gunicorn. Railway manages container scaling; single uvicorn process per container is correct (FastAPI official recommendation)
- **Hardcoded DSN in code**: Sentry DSN must come from environment variable, never committed to git
- **`vercel.json` headers duplicating `next.config.ts`**: Headers are already defined in `next.config.ts` -- don't duplicate in `vercel.json` to avoid conflicts
- **Skipping CSP update for Sentry**: Browser SDK will silently fail to report errors if Sentry's ingest domain is not in `connect-src`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CI pipeline caching | Manual cache key construction | `astral-sh/setup-uv` with `enable-cache: true` | Built-in uv cache management, handles invalidation automatically |
| Sentry error capture | Custom error reporting middleware | `sentry-sdk` auto-integration with FastAPI | Auto-detects FastAPI, captures request context, stack traces, performance data |
| Source map upload | Manual sentry-cli commands | `withSentryConfig()` in next.config.ts | Handles source map upload during build automatically |
| Health check endpoint | New health check for Railway | Existing `/health` endpoint | Already built in Phase 22/23 with 503 on degraded state |

## Common Pitfalls

### Pitfall 1: CSP Blocks Sentry Error Reports

**What goes wrong:** Sentry browser SDK sends error reports to `*.ingest.sentry.io`, but CSP `connect-src` only allows `'self'` and Supabase domains. Browser silently blocks Sentry requests.
**Why it happens:** CSP was configured in Phase 25 before Sentry was integrated.
**How to avoid:** Update `connect-src` in BOTH `next.config.ts` AND `src/web/main.py` to include `https://*.ingest.sentry.io`.
**Warning signs:** Sentry dashboard shows zero events despite error boundaries firing.

### Pitfall 2: Railway PORT Variable Not Used

**What goes wrong:** App starts on port 8000 but Railway routes traffic to a different port.
**Why it happens:** Railway dynamically assigns PORT via environment variable.
**How to avoid:** Already handled -- `Dockerfile.production` uses `${PORT:-8000}` in CMD. Just verify it works.
**Warning signs:** Health check timeout (300s) then deployment marked as failed.

### Pitfall 3: uv.lock Not In Repo or Not Synced

**What goes wrong:** `uv sync --locked` fails in CI because lockfile is missing or outdated.
**Why it happens:** Developer added dependency but forgot to commit updated uv.lock.
**How to avoid:** `uv.lock` exists (3458 lines, verified). CI uses `--locked` flag which fails fast if lock is stale.
**Warning signs:** CI fails with "Resolved locked requirements are not up to date."

### Pitfall 4: pnpm-lock.yaml Drift

**What goes wrong:** `pnpm install --frozen-lockfile` fails in CI.
**Why it happens:** Developer used `pnpm add` but lockfile wasn't committed.
**How to avoid:** `pnpm-lock.yaml` exists (verified). CI uses `--frozen-lockfile`. No `packageManager` field in `package.json` yet -- `pnpm/action-setup@v4` auto-detects version.
**Warning signs:** "ERR_PNPM_FROZEN_LOCKFILE_WITH_OUTDATED_LOCKFILE" in CI.

### Pitfall 5: Sentry withSentryConfig + withNextIntl Wrapper Order

**What goes wrong:** Source maps not uploaded, or next-intl routing breaks.
**Why it happens:** `withSentryConfig` must be the outermost wrapper to properly hook into the build pipeline.
**How to avoid:** `withSentryConfig(withNextIntl(nextConfig), sentryOptions)` -- Sentry outermost.
**Warning signs:** Build succeeds but Sentry shows minified stack traces.

### Pitfall 6: pytest in CI Without PostgreSQL Service

**What goes wrong:** All DB-dependent tests fail in CI.
**Why it happens:** Integration tests need a PostgreSQL instance. The existing `conftest.py` auto-skips tests marked `@pytest.mark.db` when PG is not reachable, and the `test_engine` fixture also skips when PG is down.
**How to avoid:** For the initial CI setup, rely on the existing auto-skip mechanism. Unit tests (majority) will pass without a DB. Integration tests can be added later with a PostgreSQL service container.
**Warning signs:** Unexpectedly few tests reported as passed (DB tests silently skipped).

### Pitfall 7: NEXT_PUBLIC_API_URL Not Set in Vercel

**What goes wrong:** Frontend API proxy routes (SSE streaming, AI chat) fail because `NEXT_PUBLIC_API_URL` defaults to empty string.
**Why it happens:** Three files use `process.env.NEXT_PUBLIC_API_URL || ""` -- in production this must point to the Railway backend URL.
**How to avoid:** Set `NEXT_PUBLIC_API_URL` in Vercel environment variables to the Railway production URL (e.g., `https://uniboard-backend.up.railway.app`).
**Warning signs:** AI streaming and feedback features return 404/network errors in production.

### Pitfall 8: Mock API Route Handlers Still Active in Production

**What goes wrong:** Frontend serves mock data from local Route Handlers instead of hitting the real Python backend.
**Why it happens:** 17 of 29 frontend API route handlers use mock fixtures. The ky client has `prefixUrl: "/api/v1"` which hits the Next.js Route Handlers, not the Python backend.
**How to avoid:** This is a known architectural decision -- Route Handlers act as a BFF (Backend-for-Frontend) proxy layer. In production, they need to proxy to the Railway backend instead of returning mocks. This is a separate concern from this phase -- the current mock handlers are the Phase 2 contract layer. Production proxying is a future task.
**Warning signs:** Data doesn't change when backend syncs real data. This is documented architecture, not a bug in Phase 26.

## Code Examples

### GitHub Actions Backend CI (Verified Pattern)

```yaml
# Source: astral-sh/setup-uv docs + project pyproject.toml
name: Backend CI
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'tests/**'
      - 'pyproject.toml'
      - 'uv.lock'
      - '.github/workflows/backend-ci.yml'
  pull_request:
    paths:
      - 'src/**'
      - 'tests/**'
      - 'pyproject.toml'
      - 'uv.lock'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v7
        with:
          enable-cache: true
      - run: uv sync --locked --all-extras --dev
      - name: Lint (ruff)
        run: uv run ruff check .
      - name: Type check (mypy)
        run: uv run mypy --strict src/
      - name: Test (pytest)
        run: uv run pytest tests/ -x --timeout=120
        env:
          DEBUG: "true"
          UNIBOARD_DISABLE_SYNC: "true"
```

### GitHub Actions Frontend CI (Verified Pattern)

```yaml
# Source: pnpm/action-setup docs + project package.json scripts
name: Frontend CI
on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-ci.yml'
  pull_request:
    paths:
      - 'frontend/**'

jobs:
  check:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
          cache-dependency-path: frontend/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - name: Lint (ESLint)
        run: pnpm lint
      - name: Type check (TypeScript)
        run: pnpm typecheck
      - name: Build
        run: pnpm build
```

### Sentry Python Init (src/web/main.py)

```python
# Source: Sentry FastAPI docs
import sentry_sdk

# In create_app(), before middleware setup:
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,       # 10% of requests
        send_default_pii=False,       # GDPR-safe
        environment="production" if not settings.debug else "development",
    )
```

### Sentry Next.js instrumentation-client.ts

```typescript
// Source: Sentry Next.js manual setup docs
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  sendDefaultPii: false,
  environment: process.env.NODE_ENV,
});

// App Router transition tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

### Sentry Next.js instrumentation.ts

```typescript
// Source: Sentry Next.js manual setup docs
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

### CSP Update Pattern

```typescript
// In next.config.ts -- add Sentry ingest domain to connect-src
"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io",
```

```python
# In src/web/main.py -- mirror the same update
"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io",
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `sentry.client.config.ts` | `instrumentation-client.ts` | Sentry SDK v10+ / Next.js 15 | New file naming convention for App Router compatibility |
| `pip install` in CI | `uv sync --locked` in CI | 2025 | 10x faster dependency install, reproducible via lockfile |
| gunicorn + uvicorn workers | Single uvicorn per container | FastAPI docs 2025+ | Container orchestration (Railway/K8s) manages scaling, not gunicorn |
| `setup-uv@v5` | `setup-uv@v7` | 2025-2026 | v7 is current stable; v8+ removed major version tags for supply chain security |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Python 3.12+ | Backend CI | Locally: yes | 3.12.7 | CI uses ubuntu-latest with setup-uv |
| Node.js 22 | Frontend CI | Locally: yes | 22.14.0 | CI uses setup-node@v4 |
| pnpm 9+ | Frontend CI | Locally: yes | 10.28.2 | CI uses pnpm/action-setup@v4 |
| uv | Backend CI | Locally: yes | 0.6.8 | CI uses astral-sh/setup-uv@v7 |
| gh CLI | PR creation | Locally: yes | 2.83.2 | Not needed for CI config files |
| Railway CLI | Deployment | Not installed | -- | Not needed -- Railway auto-deploys from GitHub, config is `railway.toml` |
| Vercel CLI | Deployment | Not installed | -- | Not needed -- Vercel auto-deploys from GitHub, config is `vercel.json` |
| uv.lock | Reproducible Python CI | Exists | 3458 lines | -- |
| pnpm-lock.yaml | Reproducible Node CI | Exists | 189KB | -- |
| Dockerfile.production | Railway build | Exists | Multi-stage, tini, non-root | -- |

**Missing dependencies with no fallback:** None -- all deployment platforms use config-as-code committed to the repo.

**Missing dependencies with fallback:**
- Railway CLI: Not needed; Railway deploys from GitHub automatically using `railway.toml`
- Vercel CLI: Not needed; Vercel deploys from GitHub automatically via dashboard integration

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | pytest 8.3+ with pytest-asyncio |
| Backend config | pyproject.toml `[tool.pytest.ini_options]` |
| Backend quick run | `uv run pytest tests/ -x --timeout=120` |
| Frontend framework | vitest 4.1+ |
| Frontend config | frontend/vitest.config.ts |
| Frontend quick run | `cd frontend && pnpm test -- --run` |
| Frontend lint | `cd frontend && pnpm lint` |
| Frontend typecheck | `cd frontend && pnpm typecheck` |
| Backend lint | `uv run ruff check .` |
| Backend typecheck | `uv run mypy --strict src/` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPS-01 | CI workflows run on push/PR | manual-only | Push to branch and verify GitHub Actions run | N/A -- CI config validation |
| OPS-01 | Backend CI: ruff+mypy+pytest pass | smoke | `uv run ruff check . && uv run mypy --strict src/ && uv run pytest tests/ -x` | Existing tests |
| OPS-01 | Frontend CI: eslint+tsc+build pass | smoke | `cd frontend && pnpm lint && pnpm typecheck && pnpm build` | Existing tests |
| OPS-02 | railway.toml valid and Dockerfile.production builds | smoke | `docker build -f Dockerfile.production -t uniboard-test .` | Dockerfile.production exists |
| OPS-02 | Production env vars documented | manual-only | Review env var documentation | N/A -- docs |
| OPS-03 | Sentry Python init with FastAPI | unit | `uv run pytest tests/ -x -k sentry` | Wave 0 |
| OPS-03 | Sentry Next.js init files exist | smoke | `cd frontend && pnpm typecheck && pnpm build` | Wave 0 |
| OPS-03 | CSP updated to allow Sentry | unit | Check CSP string contains `ingest.sentry.io` | Wave 0 |

### Sampling Rate
- **Per task commit:** `uv run ruff check . && uv run mypy --strict src/ && cd frontend && pnpm typecheck`
- **Per wave merge:** Full backend test suite + frontend build
- **Phase gate:** All CI checks green, config files committed

### Wave 0 Gaps
- [ ] Test for Sentry SDK initialization (verify sentry_sdk.init called with correct params)
- [ ] Test for CSP header containing Sentry domain

## Existing State Inventory

### Files That Need Modification

| File | Change | Reason |
|------|--------|--------|
| `src/config.py` | Add `sentry_dsn: str = ""` field | Sentry DSN from environment variable |
| `src/web/main.py` | Add `sentry_sdk.init()` + update CSP `connect-src` | Error tracking + allow Sentry reports |
| `frontend/next.config.ts` | Wrap with `withSentryConfig()` + update CSP `connect-src` | Source map upload + allow Sentry reports |
| `pyproject.toml` | Add `sentry-sdk[fastapi]` to dependencies | Sentry Python SDK |
| `frontend/package.json` | Add `@sentry/nextjs` to dependencies | Sentry Next.js SDK |
| `.gitignore` | Add `.sentryclirc`, `sentry.properties` | Sentry auth token files |

### Files That Need Creation

| File | Purpose |
|------|---------|
| `.github/workflows/backend-ci.yml` | Backend CI pipeline |
| `.github/workflows/frontend-ci.yml` | Frontend CI pipeline |
| `.github/dependabot.yml` | Automated dependency updates |
| `railway.toml` | Railway deployment config |
| `frontend/instrumentation-client.ts` | Sentry browser SDK init |
| `frontend/sentry.server.config.ts` | Sentry Node.js server SDK init |
| `frontend/sentry.edge.config.ts` | Sentry Edge runtime SDK init |
| `frontend/instrumentation.ts` | Next.js instrumentation hook |

### Environment Variables for Production

**Railway (Python Backend):**

| Variable | Source | Required |
|----------|--------|----------|
| `DATABASE_URL` | Supabase connection string (asyncpg format) | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `ENCRYPTION_KEY` | 64-char hex AES-256 key | Yes |
| `ANTHROPIC_API_KEY` | Claude API key | Yes (for AI features) |
| `VOYAGE_API_KEY` | Voyage AI embeddings key | Yes (for RAG) |
| `SENTRY_DSN` | Sentry Python project DSN | Yes |
| `CORS_ORIGINS` | Vercel production URL | Yes |
| `DEBUG` | `false` | Yes (triggers production validation) |
| `PORT` | Auto-injected by Railway | Automatic |

**Vercel (Next.js Frontend):**

| Variable | Source | Required |
|----------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Yes |
| `NEXT_PUBLIC_API_URL` | Railway backend URL | Yes |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry Next.js project DSN | Yes |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (source map upload) | Yes (build-time) |
| `SENTRY_ORG` | Sentry organization slug | Yes (build-time) |
| `SENTRY_PROJECT` | Sentry project slug | Yes (build-time) |

## Open Questions

1. **Sentry Project Setup**
   - What we know: Sentry DSNs are needed for both Python and Next.js projects
   - What's unclear: Has the user already created a Sentry account/project?
   - Recommendation: Create config with env var placeholders (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`). Document that user needs to create Sentry projects and set DSNs. SDK initialization should be conditional (`if settings.sentry_dsn:`) so the app works without Sentry.

2. **Railway and Vercel Account Setup**
   - What we know: Config files (railway.toml, vercel.json) can be created without accounts
   - What's unclear: Whether user has Railway/Vercel accounts and linked GitHub repos
   - Recommendation: Create config files. Document the manual steps: create Railway project, link GitHub repo, set env vars. Same for Vercel. Actual deployment is a manual dashboard step, not automatable via code.

3. **Frontend Mock vs Production API Routes**
   - What we know: 17 of 29 frontend API routes serve mock data. The ky client hits `/api/v1` (local Route Handlers).
   - What's unclear: When/how to switch from mock to real backend proxy
   - Recommendation: This is out of scope for Phase 26. Document as a known gap. The frontend will work on Vercel but serve mock data until Route Handlers are converted to proxy the Python API.

## Sources

### Primary (HIGH confidence)
- Existing hardening research: `.planning/research/hardening/STACK.md` -- comprehensive CI/deployment/Sentry stack research done 2026-04-01
- [Sentry FastAPI Integration](https://docs.sentry.io/platforms/python/integrations/fastapi/) -- Auto-detection, init config
- [Sentry Next.js Manual Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) -- instrumentation-client.ts, withSentryConfig
- [Astral uv GitHub Actions](https://docs.astral.sh/uv/guides/integration/github/) -- setup-uv v7, enable-cache
- [Railway Config as Code](https://docs.railway.com/reference/config-as-code) -- railway.toml schema
- [Railway Healthchecks](https://docs.railway.com/deployments/healthchecks) -- /health endpoint, PORT variable

### Secondary (MEDIUM confidence)
- [sentry-sdk on PyPI](https://pypi.org/project/sentry-sdk/) -- v2.53.0 confirmed
- [@sentry/nextjs on npm](https://www.npmjs.com/package/@sentry/nextjs) -- v10.47.0 confirmed
- [astral-sh/setup-uv releases](https://github.com/astral-sh/setup-uv/releases) -- v7.6.0 confirmed

### Tertiary (LOW confidence)
- None -- all findings verified against official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All tools are well-established, versions verified against PyPI/npm
- Architecture: HIGH -- Patterns match official documentation, project already has foundations
- Pitfalls: HIGH -- CSP issue is documented in Sentry docs, PORT handling already solved in Dockerfile.production

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days -- stable ecosystem, no rapid changes expected)
