# Phase 29: Sentry Hardening - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure Sentry error tracking for both Python (FastAPI) and Next.js with DSN environment variables and CSP policy updates. Backend Sentry SDK is already integrated; frontend needs full setup from scratch.

**In scope:** Sentry project creation, @sentry/nextjs installation + config, DSN env var setup (Railway + Vercel), CSP connect-src update for Railway backend domain, source map upload configuration.
**Out of scope:** Custom error boundaries UI, alerting rules/Slack integrations, performance monitoring dashboards.

</domain>

<decisions>
## Implementation Decisions

### Next.js Sentry SDK Integration
- **D-01:** Install `@sentry/nextjs` and manually configure (not wizard) — create `sentry.client.config.ts`, `sentry.server.config.ts`, and `instrumentation.ts` (App Router instrumentation hook)
- **D-02:** Wrap `next.config.ts` with `withSentryConfig()` — preserve existing `withNextIntl` plugin chain (compose: `withSentryConfig(withNextIntl(nextConfig))`)
- **D-03:** Configure source map upload to Sentry at build time — requires `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=yuan-qin`, `SENTRY_PROJECT=uniboard-web` as Vercel environment variables
- **D-04:** Set `hideSourceMaps: true` in Sentry config — do not serve source maps to browsers
- **D-05:** Conditional init — only call `Sentry.init()` when `NEXT_PUBLIC_SENTRY_DSN` is set (same pattern as Python backend)

### CSP Railway Backend Domain
- **D-06:** Read `process.env.NEXT_PUBLIC_API_URL` at build time in `next.config.ts` to dynamically include Railway backend domain in CSP `connect-src`
- **D-07:** Keep existing CSP entries (`'self'`, `*.supabase.co`, `wss://*.supabase.co`, `*.ingest.sentry.io`) and append the API URL hostname
- **D-08:** Python backend CSP in `src/web/main.py` should also be updated to include the Vercel frontend domain (matching CORS_ORIGINS) for consistency, though browser CSP enforcement comes from the page context

### Sentry Project Naming & Sampling
- **D-09:** Create two separate Sentry projects under org `yuan-qin`: `uniboard-api` (Python/FastAPI) and `uniboard-web` (Next.js)
- **D-10:** Frontend `tracesSampleRate: 0.1` (matches backend 10% sampling)
- **D-11:** Frontend `replaysSessionSampleRate: 0` (session replay not needed for MVP)
- **D-12:** Frontend `replaysOnErrorSampleRate: 1.0` (capture replay on every error for debugging)

### Error Filtering & Scope
- **D-13:** Frontend `beforeSend` hook to filter noise: `ResizeObserver loop limit exceeded`, `ChunkLoadError` / dynamic import failures, network errors from offline users
- **D-14:** Development environment: Sentry init skipped when DSN is empty (both frontend and backend already follow this pattern)
- **D-15:** Backend already sets `environment` to `"production"` or `"development"` based on `debug` flag — frontend should mirror this pattern using `process.env.NODE_ENV`

### Claude's Discretion
- Exact `beforeSend` filter implementation details
- Sentry `release` naming convention (can use `process.env.VERCEL_GIT_COMMIT_SHA` for frontend)
- Whether to add `@sentry/nextjs` tunnel route to avoid ad blockers (defer unless needed)
- `silent: true` vs verbose during Sentry webpack plugin source map upload

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Sentry Integration (Backend)
- `src/web/main.py` — Lines 64-71: existing `sentry_sdk.init()` conditional logic + line 152: `capture_exception` in catch-all handler
- `src/config.py` — Line 89: `sentry_dsn: str = ""` config field
- `tests/unit/test_sentry_init.py` — Existing tests for conditional Sentry init and CSP headers

### Frontend Configuration
- `frontend/next.config.ts` — Current CSP policy, security headers, `withNextIntl` plugin setup
- `frontend/.env.example` — Existing Sentry env var placeholders (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, etc.)

### Deployment
- `docs/deployment.md` — Railway + Vercel env var setup guide, example domains (`uniboard-backend.up.railway.app`, `uniboard.vercel.app`)

### Prior Research
- `.planning/research/hardening/SUMMARY.md` — Research finding: Sentry Next.js SDK wizard may need adjustments for `[locale]` routing (next-intl)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/web/main.py` Sentry init pattern: conditional on DSN, `send_default_pii=False`, environment-aware — frontend should mirror this pattern
- `src/config.py` Settings pattern: env var loaded via pydantic-settings — frontend uses `.env.local` + `NEXT_PUBLIC_` prefix
- `tests/unit/test_sentry_init.py`: test pattern for verifying conditional Sentry init — frontend tests should follow same approach

### Established Patterns
- CSP headers defined in two places: `frontend/next.config.ts` (browser-facing) and `src/web/main.py` (API responses) — both must stay in sync
- Plugin composition in next.config.ts: `withNextIntl(nextConfig)` — adding Sentry wrapper creates `withSentryConfig(withNextIntl(nextConfig))`
- next-intl uses `[locale]` route prefix — Sentry transaction names may need normalization via `beforeSendTransaction`

### Integration Points
- Vercel env vars: `NEXT_PUBLIC_SENTRY_DSN` (runtime), `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` (build-time source map upload)
- Railway env vars: `SENTRY_DSN` (already referenced in `src/config.py`)
- `next.config.ts` CSP `connect-src`: needs `NEXT_PUBLIC_API_URL` hostname appended at build time

</code_context>

<specifics>
## Specific Ideas

- Follow same conditional pattern as Python backend — no DSN = no Sentry (zero-cost in dev)
- Source map upload is essential for meaningful frontend error reports (minified stack traces are useless)
- next-intl `[locale]` routing may cause Sentry to create separate transactions per locale — worth adding `beforeSendTransaction` to normalize `/en/dashboard` and `/zh/dashboard` into `/[locale]/dashboard`

</specifics>

<deferred>
## Deferred Ideas

- Sentry alerting rules / Slack integration — configure after errors are flowing
- Performance monitoring dashboards — not needed until real traffic exists
- Sentry tunnel route to bypass ad blockers — defer unless user reports show blocked Sentry requests
- Session Replay UI — `replaysOnErrorSampleRate: 1.0` captures data but Sentry dashboard exploration is post-setup

</deferred>

---

*Phase: 29-sentry-hardening*
*Context gathered: 2026-04-06*
