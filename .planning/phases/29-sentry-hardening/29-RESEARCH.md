# Phase 29: Sentry Hardening - Research

**Researched:** 2026-04-06
**Domain:** Error tracking (Sentry), CSP policy, Next.js SDK integration
**Confidence:** HIGH

## Summary

Phase 29 integrates Sentry error tracking for the Next.js frontend (the Python backend already has a working Sentry setup) and updates CSP policies to allow both Sentry ingest traffic and the Railway backend domain. The backend Sentry integration in `src/web/main.py` is fully functional with conditional init, `capture_exception` in the catch-all handler, and CSP headers already including `*.ingest.sentry.io`. The frontend needs a fresh `@sentry/nextjs` installation with four new config files, a `next.config.ts` wrapper update, and CSP `connect-src` expansion.

A critical finding from this research: the CONTEXT.md decision D-01 references creating `sentry.client.config.ts`, but the **current official Sentry docs (v10.x)** have renamed this to `instrumentation-client.ts`. The planner must use the current file naming convention. Additionally, decision D-04 references `hideSourceMaps: true` -- this option was **removed in v9**; the SDK now emits hidden sourcemaps by default and automatically deletes client-side source maps after upload (`sourcemaps.deleteSourcemapsAfterUpload: true` is the default).

**Primary recommendation:** Install `@sentry/nextjs` v10.x, create the four standard config files using current naming conventions (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`), wrap `next.config.ts` with `withSentryConfig(withNextIntl(nextConfig))`, and add `NEXT_PUBLIC_API_URL` hostname to CSP `connect-src`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Install `@sentry/nextjs` and manually configure (not wizard) -- create `sentry.client.config.ts`, `sentry.server.config.ts`, and `instrumentation.ts` (App Router instrumentation hook) **[NOTE: File name updated to `instrumentation-client.ts` per current SDK docs]**
- **D-02:** Wrap `next.config.ts` with `withSentryConfig()` -- preserve existing `withNextIntl` plugin chain (compose: `withSentryConfig(withNextIntl(nextConfig))`)
- **D-03:** Configure source map upload to Sentry at build time -- requires `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=yuan-qin`, `SENTRY_PROJECT=uniboard-web` as Vercel environment variables
- **D-04:** Set `hideSourceMaps: true` in Sentry config -- do not serve source maps to browsers **[NOTE: Removed in v9; SDK now hides by default]**
- **D-05:** Conditional init -- only call `Sentry.init()` when `NEXT_PUBLIC_SENTRY_DSN` is set (same pattern as Python backend)
- **D-06:** Read `process.env.NEXT_PUBLIC_API_URL` at build time in `next.config.ts` to dynamically include Railway backend domain in CSP `connect-src`
- **D-07:** Keep existing CSP entries (`'self'`, `*.supabase.co`, `wss://*.supabase.co`, `*.ingest.sentry.io`) and append the API URL hostname
- **D-08:** Python backend CSP in `src/web/main.py` should also be updated to include the Vercel frontend domain (matching CORS_ORIGINS) for consistency
- **D-09:** Create two separate Sentry projects under org `yuan-qin`: `uniboard-api` (Python/FastAPI) and `uniboard-web` (Next.js)
- **D-10:** Frontend `tracesSampleRate: 0.1` (matches backend 10% sampling)
- **D-11:** Frontend `replaysSessionSampleRate: 0` (session replay not needed for MVP)
- **D-12:** Frontend `replaysOnErrorSampleRate: 1.0` (capture replay on every error for debugging)
- **D-13:** Frontend `beforeSend` hook to filter noise: `ResizeObserver loop limit exceeded`, `ChunkLoadError` / dynamic import failures, network errors from offline users
- **D-14:** Development environment: Sentry init skipped when DSN is empty (both frontend and backend already follow this pattern)
- **D-15:** Backend already sets `environment` to `"production"` or `"development"` based on `debug` flag -- frontend should mirror this pattern using `process.env.NODE_ENV`

### Claude's Discretion
- Exact `beforeSend` filter implementation details
- Sentry `release` naming convention (can use `process.env.VERCEL_GIT_COMMIT_SHA` for frontend)
- Whether to add `@sentry/nextjs` tunnel route to avoid ad blockers (defer unless needed)
- `silent: true` vs verbose during Sentry webpack plugin source map upload

### Deferred Ideas (OUT OF SCOPE)
- Sentry alerting rules / Slack integration
- Performance monitoring dashboards
- Sentry tunnel route to bypass ad blockers
- Session Replay UI exploration
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OBS-01 | Sentry Python (FastAPI) project created, DSN configured in Railway env vars | Backend SDK already integrated (`src/web/main.py` lines 64-71, `src/config.py` line 89). Only needs Sentry project creation on sentry.io and DSN env var in Railway. |
| OBS-02 | Sentry Next.js project created, DSN configured in Vercel env vars | Requires `@sentry/nextjs` v10.x installation, 4 config files, `next.config.ts` wrapper, global-error.tsx Sentry integration. DSN via `NEXT_PUBLIC_SENTRY_DSN` Vercel env var. |
| OBS-03 | Frontend CSP connect-src includes Railway backend domain and Sentry ingest domain | CSP already has `*.ingest.sentry.io`. Need to append `NEXT_PUBLIC_API_URL` hostname. Both `next.config.ts` and `src/web/main.py` CSP must stay in sync. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sentry/nextjs` | 10.47.0 | Frontend error tracking + source maps | Official Sentry SDK for Next.js, auto-instruments App Router |
| `sentry-sdk[fastapi]` | 2.54.0 (installed) | Backend error tracking | Already in `pyproject.toml`, already initialized in `src/web/main.py` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | No additional libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@sentry/nextjs` | Generic `@sentry/react` + `@sentry/node` | Loses App Router auto-instrumentation, source map upload, server component error capture |

**Installation:**
```bash
cd frontend && pnpm add @sentry/nextjs@^10.47.0
```

**Version verification:**
- `@sentry/nextjs`: 10.47.0 (verified via `npm view @sentry/nextjs version` on 2026-04-06)
- `sentry-sdk`: 2.54.0 (verified via `pip show sentry-sdk` -- already installed)
- Next.js: 15.5.14 (verified via `node_modules/next/package.json`)

## Architecture Patterns

### New Files to Create (Frontend)
```
frontend/
├── instrumentation-client.ts    # Client-side Sentry.init() -- MUST use this name (not sentry.client.config.ts)
├── sentry.server.config.ts      # Server-side Sentry.init()
├── sentry.edge.config.ts        # Edge runtime Sentry.init()
├── instrumentation.ts           # Next.js instrumentation hook -- imports server/edge configs
├── next.config.ts               # MODIFIED: wrap with withSentryConfig()
├── app/
│   ├── global-error.tsx         # MODIFIED: add Sentry.captureException()
│   └── [locale]/
│       └── error.tsx            # MODIFIED: add Sentry.captureException()
└── .env.example                 # MODIFIED: already has SENTRY placeholders (no changes needed)
```

### Files to Modify (Backend)
```
src/web/main.py                  # CSP connect-src: add Vercel frontend domain
```

### Pattern 1: Conditional Sentry Init (Frontend mirrors Backend)
**What:** Only call `Sentry.init()` when DSN is provided; zero-cost in dev
**When to use:** All Sentry config files
**Example:**
```typescript
// Source: Mirroring src/web/main.py lines 64-71
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    // ... other options
  });
}
```

### Pattern 2: Plugin Composition in next.config.ts
**What:** Chain `withNextIntl` and `withSentryConfig` wrappers
**When to use:** `next.config.ts` modification
**Example:**
```typescript
// Source: Sentry manual setup docs + existing next.config.ts
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = { /* ... */ };

// Order: inner plugin first, Sentry outermost
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
```

### Pattern 3: instrumentation.ts (Server/Edge Registration)
**What:** Next.js instrumentation file dynamically imports server/edge Sentry configs
**When to use:** Required file for server-side Sentry
**Example:**
```typescript
// Source: Sentry official docs - manual setup
import * as Sentry from "@sentry/nextjs";

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

### Pattern 4: instrumentation-client.ts (Client Init + Router Hooks)
**What:** Client-side Sentry init with noise filtering and router transition capture
**When to use:** Required file for client-side Sentry
**Example:**
```typescript
// Source: Sentry official docs - manual setup
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value ?? "";
      if (/ChunkLoadError|Loading chunk/.test(message)) return null;
      if (/Failed to fetch|NetworkError|Load failed/.test(message)) return null;
      return event;
    },
  });
}

// Instrument App Router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

### Pattern 5: Dynamic CSP with API URL
**What:** Read `NEXT_PUBLIC_API_URL` at build time to add Railway domain to CSP
**When to use:** `next.config.ts` CSP modification
**Example:**
```typescript
// Extract hostname from API URL for CSP
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiHost = apiUrl ? new URL(apiUrl).origin : "";

const connectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://*.ingest.sentry.io",
  apiHost,
].filter(Boolean).join(" ");
```

### Anti-Patterns to Avoid
- **Do NOT use `sentry.client.config.ts`:** Renamed to `instrumentation-client.ts` in current SDK. Using the old name will silently fail -- client-side Sentry will not initialize.
- **Do NOT set `hideSourceMaps: true`:** Option removed in v9. SDK handles this by default. Setting it will cause a build error.
- **Do NOT use `experimental.instrumentationHook`:** Next.js 15 supports `instrumentation.ts` natively. Setting this experimental option triggers a deprecation warning.
- **Do NOT hardcode Railway domain in CSP:** Use `NEXT_PUBLIC_API_URL` env var to derive the hostname dynamically (different per environment).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Source map upload | Custom webpack plugin | `withSentryConfig` `authToken` option | Handles build integration, upload, and deletion automatically |
| Error boundary integration | Manual `componentDidCatch` wrappers | `global-error.tsx` + `Sentry.captureException` | SDK auto-wraps App Router error boundaries |
| Router transition tracing | Custom performance marks | `onRouterTransitionStart = Sentry.captureRouterTransitionStart` | SDK provides built-in hook for App Router |
| CSP Sentry domain | Hardcoded domain strings | `*.ingest.sentry.io` wildcard | Covers all Sentry data centers without region-specific configuration |

**Key insight:** The `@sentry/nextjs` SDK handles most integration complexity automatically through `withSentryConfig` and the instrumentation file convention. Manual integration is limited to creating the four config files with correct names and updating CSP headers.

## Common Pitfalls

### Pitfall 1: Wrong Client Config File Name
**What goes wrong:** Client-side Sentry silently fails to initialize -- no errors in console, but no events sent to Sentry
**Why it happens:** Old docs/tutorials reference `sentry.client.config.ts`, but current SDK (v9+) expects `instrumentation-client.ts`
**How to avoid:** Always use `instrumentation-client.ts` at the frontend root directory
**Warning signs:** Sentry dashboard shows server-side events but zero client-side events after deployment

### Pitfall 2: Plugin Composition Order
**What goes wrong:** `withNextIntl` or `withSentryConfig` features break
**Why it happens:** `withSentryConfig` must be the outermost wrapper because it adds webpack/turbopack plugins that need to process the final config
**How to avoid:** Always compose as `withSentryConfig(withNextIntl(nextConfig), sentryOptions)` -- Sentry outermost
**Warning signs:** Source maps not uploaded, or i18n routing breaks

### Pitfall 3: CSP Blocks Sentry Events
**What goes wrong:** Sentry events fail to send; browser console shows CSP violation for `connect-src`
**Why it happens:** CSP `connect-src` missing the Sentry ingest domain
**How to avoid:** Verify `https://*.ingest.sentry.io` is in `connect-src` (already present in current config -- do not accidentally remove it during CSP changes)
**Warning signs:** CSP violation errors in browser DevTools Network tab

### Pitfall 4: CSP Blocks API Calls to Railway
**What goes wrong:** All API requests from browser fail after CSP update
**Why it happens:** Railway backend domain not in `connect-src`; adding it incorrectly (wrong format, missing protocol)
**How to avoid:** Parse `NEXT_PUBLIC_API_URL` with `new URL()` to extract the origin; ensure it includes `https://`
**Warning signs:** API calls return 0 bytes, CSP violation in console

### Pitfall 5: Source Map Upload Without Auth Token
**What goes wrong:** Build succeeds but source maps not uploaded -- Sentry shows minified stack traces
**Why it happens:** `SENTRY_AUTH_TOKEN` not set in Vercel env vars (it's a build-time variable, not runtime)
**How to avoid:** Verify token is set in Vercel dashboard under Environment Variables (not just `.env.local`)
**Warning signs:** Sentry events show minified code in stack traces

### Pitfall 6: Sentry Init Runs in Development
**What goes wrong:** Development errors flood Sentry dashboard, exhaust quota
**Why it happens:** DSN accidentally set in `.env.local` during development
**How to avoid:** Never set `NEXT_PUBLIC_SENTRY_DSN` in `.env.local`; conditional init skips when DSN is empty
**Warning signs:** Sentry dashboard shows `development` environment events

### Pitfall 7: next-intl Locale Routes Create Transaction Noise
**What goes wrong:** Sentry creates separate transaction groups for `/en/dashboard` and `/zh/dashboard`
**Why it happens:** Sentry auto-extracts route from URL path including the `[locale]` prefix
**How to avoid:** This is handled automatically by `@sentry/nextjs` which reads Next.js route definitions. If it does occur, add `beforeSendTransaction` to normalize locale prefixes.
**Warning signs:** Performance dashboard shows duplicate routes per locale

## Code Examples

### global-error.tsx Integration
```typescript
// Source: Sentry official docs + existing app/global-error.tsx
'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ /* existing styles */ }}>
        {/* existing UI */}
      </body>
    </html>
  );
}
```

### [locale]/error.tsx Integration
```typescript
// Source: Existing app/[locale]/error.tsx + Sentry pattern
'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorBoundary');

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      {/* existing UI */}
    </div>
  );
}
```

### Backend CSP Update (src/web/main.py)
```python
# Add Vercel frontend domain to match CORS_ORIGINS
# Current: connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io
# Updated: append origins from settings.cors_origins
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `sentry.client.config.ts` | `instrumentation-client.ts` | Sentry SDK v9 (2025) | Client file MUST use new name or init silently fails |
| `hideSourceMaps: true` | Default behavior (hidden source maps) | Sentry SDK v9 (2025) | Option removed -- do not set |
| `experimental.instrumentationHook: true` | Native `instrumentation.ts` support | Next.js 15 | No experimental flag needed |
| `sentry` key in next.config | `withSentryConfig` second argument | Sentry SDK v9 (2025) | All Sentry options passed to wrapper function |
| Separate `sentry.properties` file | Inline options in `withSentryConfig` | Sentry SDK v8+ | Org/project/authToken in withSentryConfig options |
| Manual `@sentry/webpack-plugin` | Built into `withSentryConfig` | Sentry SDK v8+ | No separate webpack plugin needed |

**Deprecated/outdated:**
- `hideSourceMaps`: Removed in v9. SDK uses hidden source maps by default.
- `sentry.client.config.ts`: Renamed to `instrumentation-client.ts` in v9+.
- `experimental.instrumentationHook`: Not needed in Next.js 15 (native support).
- `enableTracing` option: Removed in v9. Use `tracesSampleRate` instead.

## Open Questions

1. **Sentry Edge Config Necessity**
   - What we know: The official setup guide includes `sentry.edge.config.ts` for edge runtime
   - What's unclear: This project removed Next.js middleware (Edge Runtime incompatibility on Vercel per STATE.md). Without middleware, edge config may be unnecessary.
   - Recommendation: Create the file anyway (3 lines of code) for future-proofing. If no edge functions exist, it simply never loads.

2. **`onRouterTransitionStart` conditional export**
   - What we know: Can export conditionally based on `process.env.NODE_ENV`
   - What's unclear: Whether unconditional export causes issues in dev without DSN
   - Recommendation: Export unconditionally. `captureRouterTransitionStart` is a no-op when Sentry is not initialized.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pnpm | Frontend package install | Checked at runtime | 10.28.2 (from packageManager field) | -- |
| Node.js | Frontend build | Checked at runtime | 18+ required | -- |
| Sentry account | OBS-01, OBS-02 | Manual setup required | Business trial (14-day, started 2026-04-05) | Free tier after trial |

**Missing dependencies with no fallback:**
- Sentry project creation (`uniboard-api`, `uniboard-web`) -- manual step on sentry.io, cannot be automated in code

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Backend) | pytest 8.x + pytest-asyncio |
| Framework (Frontend) | vitest 4.x + @testing-library/react |
| Config file (Backend) | `pyproject.toml` [tool.pytest.ini_options] |
| Config file (Frontend) | `frontend/vitest.config.ts` |
| Quick run (Backend) | `uv run pytest tests/unit/test_sentry_init.py -x` |
| Quick run (Frontend) | `cd frontend && pnpm vitest run __tests__/sentry/ --reporter=verbose` |
| Full suite (Backend) | `uv run pytest tests/unit/ -x` |
| Full suite (Frontend) | `cd frontend && pnpm test run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OBS-01 | Backend Sentry conditional init + DSN config | unit | `uv run pytest tests/unit/test_sentry_init.py -x` | Existing |
| OBS-02 | Frontend Sentry conditional init when DSN set | unit | `cd frontend && pnpm vitest run __tests__/sentry/sentry-init.test.ts -x` | Wave 0 |
| OBS-02 | Frontend Sentry skipped when no DSN | unit | `cd frontend && pnpm vitest run __tests__/sentry/sentry-init.test.ts -x` | Wave 0 |
| OBS-03 | CSP connect-src includes Railway API domain | unit | `cd frontend && pnpm vitest run __tests__/sentry/csp-headers.test.ts -x` | Wave 0 |
| OBS-03 | CSP connect-src includes Sentry ingest domain | unit | `uv run pytest tests/unit/test_sentry_init.py::TestCspContainsSentryIngest -x` | Existing |
| OBS-03 | Backend CSP includes Vercel frontend domain | unit | `uv run pytest tests/unit/test_sentry_init.py -x` (extend existing) | Extend existing |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/unit/test_sentry_init.py -x` + `cd frontend && pnpm vitest run __tests__/sentry/ -x`
- **Per wave merge:** Full backend + frontend test suites
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/sentry/sentry-init.test.ts` -- covers OBS-02 (conditional Sentry init)
- [ ] `frontend/__tests__/sentry/csp-headers.test.ts` -- covers OBS-03 (CSP connect-src validation)
- [ ] Extend `tests/unit/test_sentry_init.py` -- add test for backend CSP including Vercel domain

## Project Constraints (from CLAUDE.md)

- **Code comments:** Must be pure English (no Chinese, no bilingual)
- **Type checking:** `mypy --strict` for Python, `tsc --noEmit` for TypeScript
- **Lint:** `ruff` for Python, `eslint --max-warnings 0` for frontend
- **Test:** `pytest` for Python, `vitest` for frontend
- **Package managers:** `uv` (backend), `pnpm 9+` (frontend)
- **Verification loop:** Build -> Test -> Lint -> TypeCheck on every code change
- **Commit format:** `<type>(<phase>-<plan>): <description>` (GSD project)
- **Frontend dev port:** 3001

## Sources

### Primary (HIGH confidence)
- [Sentry Next.js Manual Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) -- file naming, instrumentation-client.ts convention, all config file structures
- [Sentry Build Options](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/) -- withSentryConfig options, sourcemaps config, release options
- [Sentry v8-to-v9 Migration](https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v8-to-v9/) -- hideSourceMaps removal, sentry config key deprecation
- [Sentry v9-to-v10 Migration](https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v9-to-v10/) -- OpenTelemetry v2, removed APIs
- [npm @sentry/nextjs](https://www.npmjs.com/package/@sentry/nextjs) -- version 10.47.0 confirmed

### Secondary (MEDIUM confidence)
- [Sentry Filtering Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/filtering/) -- beforeSend, ignoreErrors patterns
- [GitHub Issue #16091](https://github.com/getsentry/sentry-javascript/issues/16091) -- Turbopack + webpack warning (fixed in #17013)
- [GitHub Issue #13613](https://github.com/getsentry/sentry-javascript/issues/13613) -- hideSourceMaps removal tracking

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- `@sentry/nextjs` v10.47.0 verified on npm, `sentry-sdk` 2.54.0 already installed
- Architecture: HIGH -- File naming verified against official docs, plugin composition order confirmed
- Pitfalls: HIGH -- hideSourceMaps removal and file rename verified via official migration guides
- CSP: HIGH -- Existing CSP already has Sentry ingest domain; only need to add API URL hostname

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- Sentry SDK changes slowly at the config level)
