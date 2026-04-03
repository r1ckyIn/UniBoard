# Features Research: Production Readiness

**Domain:** University EdTech SaaS (GPA maximization dashboard)
**Project:** UniBoard (FastAPI + Next.js 15 + Supabase)
**Researched:** 2026-04-01
**Mode:** Ecosystem (production hardening, not new features)

---

## Current State Assessment

Before listing what is needed, here is what already exists:

| Category | What Exists | Status |
|----------|------------|--------|
| Auth | Supabase Auth (JWT), Python JWT verification | Functional |
| Error handling | UniboardError hierarchy, structured ErrorResponse, catch-all handler | Solid |
| Resilience | CircuitBreaker, CanvasRateLimiter, RetryConfig with exponential backoff | Solid |
| Logging | structlog JSON with sensitive field redaction, request_id middleware | Solid |
| Token encryption | AES-256-GCM for Canvas/Ed API tokens | Solid |
| RLS | Row Level Security enabled on all 17 tables with per-user policies | Solid |
| Health check | `/health` endpoint with DB connectivity check | Basic |
| Tests | ~320 tests across 31 unit + 20 integration test files | Good coverage |
| Docker | Dockerfile with healthcheck, docker-compose for local dev | Dev only |
| Config | pydantic-settings with env vars, `.env.example` | Functional |
| CORS | Hardcoded `http://localhost:3001` only | Dev only |

**Key gaps identified:** No CI/CD pipeline, no production CORS config, no security headers on Next.js, no rate limiting on own API endpoints, no production Dockerfile (current one installs dev deps and uses --reload), no environment-aware configuration, no monitoring/alerting, no backup strategy.

---

## Table Stakes

Features that MUST exist before allowing real users to access the system. Missing any of these is a production blocker.

### Security

| Feature | Why Required | Complexity | Current Gap |
|---------|-------------|------------|-------------|
| Production CORS configuration | CORS currently hardcoded to `localhost:3001`. Any deployed frontend domain will be blocked, or if set to `*`, completely insecure. | Low | `allow_origins=["http://localhost:3001"]` in `main.py` must become environment-configurable |
| Security headers (Next.js) | No CSP, HSTS, X-Frame-Options, X-Content-Type-Options. XSS and clickjacking vectors are wide open. CVE-2025-29927 affected Next.js < 15.2.3 (project uses 15.5.14, patched). | Low | `next.config.ts` has zero `headers()` config; middleware lacks security headers |
| API rate limiting (own endpoints) | TRD specifies 60 req/user/min but no implementation exists. AI endpoints especially vulnerable to cost abuse -- a single user could run up Claude API bills. | Medium | Only upstream (Canvas) rate limiting exists; no rate limiting on UniBoard API itself |
| Environment-specific secret validation | `.env` defaults include a hardcoded JWT secret and all-zeros encryption key. Production must fail-fast if real secrets are missing. | Low | `config.py` has permissive defaults for all secrets; no validation that production keys are actually set |
| Disable debug mode in production | `debug: bool = True` as default. Debug mode may expose stack traces or enable dev-only features. | Low | No guard; relies entirely on deployment platform setting `DEBUG=false` |
| HTTPS enforcement | Railway and Vercel handle TLS termination, but the app must set HSTS headers to prevent protocol downgrade attacks. | Low | No HSTS header on either frontend or backend responses |

### Reliability

| Feature | Why Required | Complexity | Current Gap |
|---------|-------------|------------|-------------|
| Production Dockerfile | Current Dockerfile installs dev deps (`.[dev]`), mounts source as volume, runs with `--reload`. Not suitable for production deployment. | Low | Need multi-stage build: slim image, no dev deps, no reload, proper worker config |
| Graceful shutdown | APScheduler background sync must complete in-flight jobs on SIGTERM. Railway sends SIGTERM with a 10s grace period before SIGKILL. | Medium | `lifespan` context manager exists but APScheduler shutdown behavior under SIGTERM needs verification |
| Database connection pool tuning | Default asyncpg pool settings may not suit Railway's single-container model. | Low | Need to verify pool_size, max_overflow, pool_recycle settings match Railway container limits |
| Health check separation (liveness vs readiness) | Current `/health` hits DB every time. Liveness should be fast (process alive); readiness should check dependencies. Railway uses a single health check URL. | Low | Single endpoint conflates liveness and readiness concerns |
| Error recovery for sync engine | If an APScheduler job throws an unhandled exception, does it retry or silently die? Sync failures must not kill the scheduler process. | Medium | Individual sync tasks have try/except but need verification of scheduler-level error isolation |

### Observability

| Feature | Why Required | Complexity | Current Gap |
|---------|-------------|------------|-------------|
| Structured request logging | Log every request with method, path, status_code, latency_ms, user_id. Essential for debugging production issues and identifying slow endpoints. | Low | request_id middleware exists but there is no access log middleware recording request/response details |
| Error alerting | First users hitting 500s should trigger notifications, not wait for someone to manually check logs. | Medium | No alerting mechanism; Railway logs exist but there is no proactive notification on errors |
| Sync status visibility | Background sync is invisible to operators. If a Canvas token expires, nobody knows until a user complains. | Low | Token health check exists in code but no dashboard or notification fires on failure |

### DevOps

| Feature | Why Required | Complexity | Current Gap |
|---------|-------------|------------|-------------|
| CI pipeline (lint + typecheck + test) | No CI exists. PRs can merge with broken types or failing tests. This is the single most impactful gap. | Medium | No `.github/workflows/` directory at all |
| Production deployment config | No Railway/Vercel deployment configuration exists. Deployment would be entirely manual. | Medium | No `railway.toml`, no Vercel config, no deploy scripts |
| Database migration strategy | Supabase CLI migrations exist but there is no automated run-on-deploy. Manual `supabase db push` is error-prone and forgettable. | Medium | 5 migration files exist; need a pre-deploy hook or CI step to apply them |
| Environment variable documentation | `.env.example` exists but lacks production-specific guidance about which vars are required versus which have safe defaults. | Low | `.env.example` has placeholder values with no prod vs dev distinction |

### Performance

| Feature | Why Required | Complexity | Current Gap |
|---------|-------------|------------|-------------|
| Next.js production build verification | Development server (`pnpm dev`) is 10-50x slower than production build. Must verify `pnpm build` succeeds cleanly and the output works. | Low | Build script exists but may have warnings or issues not caught in dev mode |
| API response caching headers | Relatively stable data (GPA summary, course list) can be cached client-side with proper Cache-Control. Reduces backend load and improves perceived speed. | Low | No Cache-Control headers on any endpoint |
| Database index verification | N+1 queries and missing indexes for common access patterns. | Medium | Index strategy defined in TRD SS15.5 but need to verify all indexes are actually created in migrations |

---

## Differentiators

Nice-to-have features that improve production quality but are not blockers for a soft launch with trusted users (friends, classmates).

### Security (Nice-to-Have)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Content Security Policy (strict) | Beyond basic security headers, a tuned CSP prevents XSS payload execution. Requires careful whitelisting of Supabase domain, API domain, inline styles. | Medium | Start with report-only mode (`Content-Security-Policy-Report-Only`) to avoid breaking functionality |
| API key rotation mechanism | If Anthropic/Voyage API keys leak, ability to rotate without downtime or code changes. | Low | Currently a single env var per key; no rotation procedure documented |
| Audit log for sensitive operations | Track who accessed what data and when. Important for EdTech data handling. | Medium | Not needed for initial launch but becomes important if the app grows beyond personal use |
| CSRF protection | Prevents cross-site request forgery for state-changing operations. | Low | Lower priority because API uses Bearer token auth (not cookie-based session auth), which is inherently CSRF-resistant |

### Reliability (Nice-to-Have)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Automated database backups | Supabase Pro plan includes daily backups. Free plan has no automated backups. Data loss would be catastrophic. | Low | Cost decision: Supabase Pro is $25/month; manual `pg_dump` cronjob is the free alternative |
| Retry UI for failed syncs | Users can manually trigger re-sync when platform tokens are fixed or when they notice stale data. | Low | `/api/v1/sync/trigger` endpoint already exists; just needs a frontend button |
| External uptime monitoring | External monitoring (UptimeRobot free tier, Better Stack free tier) to detect outages before users report them. | Low | 5-minute external ping of `/health` endpoint; 10 minutes to set up |
| Blue-green deployment | Zero-downtime deploys. Important once there are active users during deploy windows. | Low | Railway handles this by default for web services |

### Observability (Nice-to-Have)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Centralized log aggregation | Railway logs are ephemeral. Persist logs to a logging service for post-mortem analysis of incidents. | Medium | Better Stack, Logflare (Supabase-native), or Axiom all have free tiers sufficient for this scale |
| Performance metrics dashboard | Track P50/P95/P99 response times, sync job duration, AI API costs per day. | Medium | Could use Railway metrics + simple custom counters logged via structlog |
| User-facing status page | Shows system status (API, sync engine, AI features). Builds user trust. | Low | Simple static page or Instatus/Betteruptime free tier |
| AI cost tracking per user | Monitor Claude/Voyage API spend per user to detect abuse and optimize model routing decisions. | Medium | Token counting infrastructure (tiktoken) already exists in codebase |

### Performance (Nice-to-Have)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| API response compression | gzip/brotli for API responses. Reduces bandwidth for users on slow connections. | Low | FastAPI/uvicorn supports this via GZipMiddleware |
| Stale-while-revalidate caching | TanStack Query already supports this pattern client-side. Server-side Cache-Control headers amplify the benefit. | Low | `staleTime` is configured in TanStack Query hooks; add corresponding server headers |
| Supabase PgBouncer connection pooling | Supabase includes PgBouncer for connection pooling. More efficient connection management for a long-running FastAPI process. | Low | Switch `DATABASE_URL` to Supabase's pooled connection string (port 6543) |

---

## Anti-Features

Things that seem necessary for "production readiness" but are NOT worth building for an early-stage startup targeting fewer than 100 users at a single university.

| Anti-Feature | Why It Seems Necessary | Why to Avoid | What to Do Instead |
|--------------|----------------------|--------------|-------------------|
| Kubernetes / container orchestration | "Production apps need K8s" | Railway abstracts container orchestration entirely. K8s for a single backend container is massive over-engineering for this scale. | Railway single container with auto-restart on crash |
| Multi-region deployment | "Users need low latency globally" | All users are at USYD in Sydney. Single region is sufficient. Supabase is already in a fixed region. | Single region deployment, closest to Sydney |
| Full APM suite (Datadog, New Relic) | "Need application performance monitoring" | Minimum $23/month, overkill for fewer than 100 users. Structured logs plus Railway metrics provide sufficient visibility. | structlog JSON logging + Railway built-in metrics + free uptime monitor |
| FERPA/COPPA compliance certification | "EdTech needs FERPA compliance" | FERPA applies to US institutions receiving federal funding. USYD is Australian, governed by the Australian Privacy Act 1988. UniBoard is a personal tool, not an institutional vendor. | Follow good security practices (encryption at rest, access control, data minimization) without pursuing formal compliance certification |
| SOC 2 / ISO 27001 certification | "SaaS needs security certification" | Costs $10K-$50K minimum for initial certification. Zero value for a student project with fewer than 100 users. | Document security practices in a simple security overview document |
| Web Application Firewall (WAF) | "Need to protect against sophisticated attacks" | Vercel and Railway provide basic DDoS protection at the platform level. A dedicated WAF adds cost and complexity with minimal benefit at this scale. | Rely on platform-provided protections plus application-level rate limiting |
| Automated horizontal scaling | "Need to handle traffic spikes" | Exam periods might see 50 concurrent users maximum. Railway starter plan handles this without autoscaling configuration. | Fixed single instance; monitor and scale manually only if it becomes a bottleneck |
| Feature flags system (LaunchDarkly, Unleash) | "Need to safely roll out features" | Fewer than 100 users means you can personally communicate with every affected user. Feature flags add infrastructure complexity. | Deploy to all users; roll back via Railway if broken |
| A/B testing infrastructure | "Need data-driven feature decisions" | Not enough users for statistical significance. Any A/B test would take months to reach confidence. | Talk to users directly for qualitative feedback |
| Email deliverability optimization (custom DKIM/SPF/DMARC) | "Digest emails need to land in inbox" | SES handles basic deliverability. Custom email infrastructure is premature before validating that users actually want the digest feature. | Use SES defaults, verify the sending domain, monitor bounce rates |
| Load testing suite (Locust, k6) | "Must verify production can handle load" | 100 users with staggered sync windows means fewer than 10 concurrent requests typically. The bottleneck is upstream API rate limits (Canvas 70 req/10s), not UniBoard. | Monitor actual usage patterns; load test only if approaching limits |
| Comprehensive E2E test suite (Playwright/Cypress) | "Need to test user flows end-to-end" | High maintenance cost for a rapidly changing UI. The existing ~320 unit and integration tests cover 90% of risk. | Manual QA for critical flows (auth, token setup, sync); E2E only for the auth flow if time permits |
| API versioning strategy (v2, v3 namespaces) | "Need backward compatibility for API consumers" | Single client (your own frontend), single version. API versioning adds routing complexity with no external consumer to protect. | `/api/v1` prefix already exists; only version if external consumers emerge |
| Separate staging environment | "Need to test before production" | TRD explicitly decided against staging for 100-user scale. Dev environment plus production is sufficient. | Test in dev environment, deploy to prod with confidence from CI |
| Internationalized error messages | "Non-English users need localized errors" | API errors are developer-facing, not user-facing. The frontend already handles i18n for user-visible text. | Keep API errors in English; frontend maps error codes to localized user messages |
| Database read replicas | "Need to separate read and write traffic" | Fewer than 100 users generating maybe 1000 queries per hour. A single Supabase PostgreSQL instance handles this trivially. | Single database instance; revisit only above 10K users |

---

## Complexity Notes

Effort estimates for table stakes items, ordered by recommended implementation sequence.

### Phase 1: Low-Hanging Fruit (1-2 days total)

| Item | Effort | Why First |
|------|--------|-----------|
| Production CORS config | 2 hours | One-line change in `main.py` to read allowed origins from env var. Absolute deployment blocker. |
| Security headers (Next.js middleware) | 2 hours | Add headers in `middleware.ts` or `next.config.ts`. Well-documented patterns in Next.js docs. |
| Environment secret validation | 2 hours | Add validators in `config.py` that raise on startup if critical secrets are missing when `debug=False`. |
| Debug mode guard | 30 min | Already configurable; just ensure `DEBUG=false` in production environment variables. |
| `.env.example` production docs | 1 hour | Add comments documenting which vars are required vs optional, with production value guidance. |
| Production Dockerfile | 3 hours | Multi-stage build: build stage installs deps, runtime stage copies only production artifacts. Remove `--reload`, add gunicorn with uvicorn workers. |
| Cache-Control headers | 2 hours | Add response headers for cacheable endpoints (course list: 5min, GPA summary: 1min, static config: 1h). |

### Phase 2: CI/CD Foundation (2-3 days)

| Item | Effort | Why Second |
|------|--------|------------|
| GitHub Actions CI (backend) | 4 hours | ruff check + mypy --strict + pytest on push/PR to main. Standard workflow yaml. |
| GitHub Actions CI (frontend) | 3 hours | eslint --max-warnings 0 + tsc --noEmit + vitest + next build on push/PR. |
| Railway deployment config | 3 hours | Dockerfile-based deploy, env var setup in Railway dashboard, health check path configuration. |
| Vercel deployment config | 2 hours | Connect GitHub repo, set env vars (NEXT_PUBLIC_* for Supabase + API URL), configure build. |
| Supabase migration in deploy | 2 hours | Add migration step to CI/CD or Railway deploy hook. |

### Phase 3: Reliability and Observability (2-3 days)

| Item | Effort | Why Third |
|------|--------|----------|
| API rate limiting | 4 hours | Use slowapi or custom middleware. Per-user (extracted from JWT sub claim) rate limits. AI endpoints need stricter limits (e.g., 10 req/min). |
| Request access logging middleware | 3 hours | Log method, path, status_code, latency_ms, user_id on every request via structlog. |
| Health check refinement | 2 hours | Separate liveness (`/healthz` -- always 200 if process alive) from readiness (`/readyz` -- checks DB connectivity and upstream reachability). |
| Graceful shutdown verification | 2 hours | Test APScheduler shutdown behavior on SIGTERM. Verify in-flight sync jobs complete within Railway's grace period. |
| Connection pool tuning | 1 hour | Set pool_size=5, max_overflow=5, pool_recycle=300 based on Railway container limits. |
| Sync failure alerting | 3 hours | Log sync failures with error severity; optionally add webhook notification to Discord/Slack on critical sync errors. |

### Phase 4: Polish (1-2 days, can defer post-launch)

| Item | Effort | Deferrable? |
|------|--------|-------------|
| External uptime monitoring setup | 1 hour | Yes, but extremely high ROI for 1 hour of work |
| Database backup procedure | 2 hours | Yes if on Supabase Pro ($25/mo); document manual pg_dump procedure otherwise |
| API response compression | 1 hour | Yes, bandwidth savings are minimal at fewer than 100 users |
| PgBouncer connection pooling URL | 1 hour | Yes, just change the DATABASE_URL to use port 6543 |

**Total estimated effort for all table stakes: 8-10 days of focused work.**

---

## Feature Dependencies

```
Production CORS ─────────────────────────────────────────┐
Security headers ────────────────────────────────────────┤
Secret validation ───────────────────────────────────────┤
Production Dockerfile ───────────────────────────────────┼──> Can Deploy
  |                                                      |
  +──> Railway deployment config ────────────────────────┘
  |
  +──> CI pipeline ──> Automated deploy on merge to main
  |
  +──> Health check refinement ──> Railway auto-restart on failure

Rate limiting ──> Protects AI endpoints ──> Safe to expose publicly
Access logging ──> Sync failure alerting ──> Proactive issue detection
```

---

## MVP Production Readiness Recommendation

**Minimum for a "friends and classmates" soft launch (fewer than 20 users):**

1. Production CORS config (environment-aware origins)
2. Security headers on Next.js (HSTS, X-Frame-Options, X-Content-Type-Options)
3. Production Dockerfile (multi-stage, no dev deps, no --reload)
4. Secret validation (fail-fast on missing production secrets)
5. CI pipeline (at minimum: lint + typecheck + test on PR)
6. Railway + Vercel deployment with environment variables configured
7. API rate limiting (at minimum on AI endpoints to prevent cost runaway)

**Defer to post-launch iteration:**

- Centralized logging (Railway logs are sufficient initially)
- Performance optimization (premature at fewer than 100 users)
- Automated backups (manual pg_dump until Supabase Pro justifies its cost)
- Comprehensive monitoring dashboard (start with free uptime monitor)
- CSP in enforce mode (start with report-only to avoid breaking things)

---

## Sources

### HIGH confidence (official documentation or verified firsthand)

- [FastAPI CORS Documentation](https://fastapi.tiangolo.com/tutorial/cors/) -- CORS middleware configuration reference
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/) -- production deployment patterns
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) -- official production optimization guide
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod) -- Supabase hardening guide
- [Railway Health Checks](https://docs.railway.com/deployments/healthchecks) -- Railway-specific health check configuration
- [Railway FastAPI Guide](https://docs.railway.com/guides/fastapi) -- Railway deployment for FastAPI apps
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- RLS query optimization
- Project TRD v2.5 SS7 (Security), SS14 (Error Handling), SS16 (Deployment) -- internal documentation
- Project source code review: `src/web/main.py`, `src/config.py`, `src/adapters/resilience.py`, `src/schemas/common.py`, `frontend/middleware.ts`, `frontend/next.config.ts`, `Dockerfile`, `docker-compose.yml`

### MEDIUM confidence (multiple credible sources agree)

- [FastAPI Production Checklist (CompileNRun)](https://www.compilenrun.com/docs/framework/fastapi/fastapi-best-practices/fastapi-production-checklist/) -- community production checklist
- [Next.js Security Best Practices 2026 (Authgear)](https://www.authgear.com/post/nextjs-security-best-practices) -- security headers guide
- [Arcjet Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/) -- security header recommendations
- [FastAPI Docker Best Practices (Better Stack)](https://betterstack.com/community/guides/scaling-python/fastapi-docker-best-practices/) -- Docker production patterns
- [CVE-2025-29927 Analysis (Averlon)](https://www.averlon.ai/blog/nextjs-cve-2025-29927-header-injection) -- Next.js middleware bypass vulnerability (patched in 15.2.3; project on 15.5.14 is safe)
- [Render FastAPI Production Best Practices](https://render.com/articles/fastapi-production-deployment-best-practices) -- worker configuration, health checks
- [Supabase Security Retro 2025](https://supaexplorer.com/dev-notes/supabase-security-2025-whats-new-and-how-to-stay-secure.html) -- 2025-2026 security updates

### LOW confidence (used to determine what NOT to build)

- [FERPA Compliance Checklist 2025](https://www.hireplicity.com/blog/ferpa-compliance-checklist-2025) -- confirmed FERPA is US-specific, not applicable to Australian universities
- [EdTech SaaS Compliance Guide (ComplyDog)](https://complydog.com/blog/edtech-saas-compliance-student-privacy-gdpr-implementation) -- general EdTech compliance requirements; used to inform anti-features decisions
