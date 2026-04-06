# Phase 29: Sentry Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 29-sentry-hardening
**Areas discussed:** Next.js Sentry SDK Integration, CSP Railway Domain, Sentry Project Naming & Sampling, Error Filtering & Scope

---

## Discussion Mode

User selected "全部使用最佳实践，生成context" — all four gray areas resolved using best practices without individual discussion.

## Next.js Sentry SDK Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Wizard setup | Use `npx @sentry/wizard` to auto-generate config files | |
| Manual setup | Manually create sentry.client.config.ts, sentry.server.config.ts, instrumentation.ts | ✓ |

**User's choice:** Best practices (manual setup for full control over config)
**Notes:** Manual setup chosen because it provides better control over the existing `withNextIntl` plugin chain and avoids wizard overwriting `next.config.ts`

## CSP Railway Backend Domain

| Option | Description | Selected |
|--------|-------------|----------|
| Wildcard `*.up.railway.app` | Allows any Railway subdomain | |
| Exact domain from env var | Read `NEXT_PUBLIC_API_URL` at build time | ✓ |
| Hardcoded domain | Hardcode specific Railway URL | |

**User's choice:** Best practices (dynamic from env var)
**Notes:** Using `process.env.NEXT_PUBLIC_API_URL` at build time in `next.config.ts` — most secure (no wildcard) and works across environments

## Sentry Project Naming & Sampling

| Option | Description | Selected |
|--------|-------------|----------|
| Single project | One Sentry project for both frontend and backend | |
| Two projects | Separate `uniboard-api` and `uniboard-web` projects | ✓ |

**User's choice:** Best practices (two separate projects)
**Notes:** Separate projects enable independent alerting, release tracking, and source map management

## Error Filtering & Scope

| Option | Description | Selected |
|--------|-------------|----------|
| No filtering | Send all errors | |
| Noise filtering | Filter ResizeObserver, ChunkLoadError, network errors | ✓ |
| Aggressive filtering | Filter + whitelist only specific errors | |

**User's choice:** Best practices (noise filtering)
**Notes:** Standard `beforeSend` filter for known browser noise; development environment skipped via conditional DSN check

## Claude's Discretion

- Exact `beforeSend` filter implementation
- Sentry `release` naming convention
- `silent` flag for source map upload logs
- Sentry tunnel route (deferred)

## Deferred Ideas

- Sentry alerting rules / Slack integration
- Performance monitoring dashboards
- Session Replay UI exploration
- Sentry tunnel route for ad blocker bypass
