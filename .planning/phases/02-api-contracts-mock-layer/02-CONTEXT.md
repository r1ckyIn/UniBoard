# Phase 2: API Contracts & Mock Layer - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Define the complete API contract (OpenAPI spec) covering all endpoints from TRD §12, auto-generate TypeScript types, implement Next.js Route Handler mocks returning realistic fixture data, configure ky HTTP client with auth token injection, and create TanStack Query hooks for every data domain. This phase produces the data layer that all 10 page phases (3-12) will consume.

Requirements: INFRA-11

</domain>

<decisions>
## Implementation Decisions

### Type Codegen Strategy
- Claude's discretion on tooling choice (openapi-typescript vs orval vs other)
- Goal: auto-generate TypeScript types from OpenAPI spec, minimize manual type maintenance
- Must integrate well with ky (already installed) and TanStack Query v5 (already installed)

### Mock Data Content
- Use REAL USYD course data fetched via MCP tools (canvas-ed-mcp) for fixtures
- Number of courses determined by actual MCP data available
- If MCP data doesn't cover enough edge cases, user can provide a friend's API tokens for additional data diversity
- Must cover ALL scenarios:
  - Normal path: courses with grades, deadlines, Ed posts, materials
  - Missing data: no grades, no Ed posts, expired tokens, empty states
  - Risk scenarios: GPA below target, imminent deadlines, declining grades, alerts
  - Simulated latency and occasional errors (random delays, 500 errors) to test frontend resilience

### Auth Mock Strategy
- Full simulation of login/register/refresh flows via Route Handlers
- Mock Route Handlers return fake JWT tokens
- zustand stores auth state (token, user info)
- Unauthenticated access to protected pages → redirect to /auth/login (via Next.js middleware)
- Token configuration: login defaults to "unconfigured" → Setup page accepts any string as token → mock returns "valid" → unlocks main page data

### Hook Architecture
- One file per domain: hooks/use-courses.ts, hooks/use-grades.ts, hooks/use-deadlines.ts, etc.
- Each file encapsulates useQuery/useMutation + query key factory for that domain
- Loading/error state handling: Claude's discretion (per-hook vs global boundary vs hybrid)

### Claude's Discretion
- Type codegen tooling selection (openapi-typescript recommended for lightweight + ky compatibility)
- Loading/error state pattern (per-hook return values vs Suspense + Error Boundary)
- OpenAPI spec file organization (single YAML vs split by domain)
- Query key factory pattern implementation
- Mock delay ranges and error rates
- ky client configuration details (interceptors, retry logic)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API Specification (PRIMARY — defines all endpoints)
- `docs/UniBoard_TRD_v2.md` §12 — REST API specification: all endpoints, request/response schemas, pagination, error format, rate limiting conventions
- `docs/UniBoard_TRD_v2.md` §12.1 — API conventions (base URL, response envelope, cursor pagination, rate limits)
- `docs/UniBoard_TRD_v2.md` §12.2 — Auth endpoints (register, login, refresh, logout, forgot/confirm password)
- `docs/UniBoard_TRD_v2.md` §12.3 — User & Token endpoints (profile, token CRUD, verify, delete account, export)
- `docs/UniBoard_TRD_v2.md` §12.4 — Course endpoints (list, detail, grades, materials, discussions, deadlines, outline)
- `docs/UniBoard_TRD_v2.md` §12.5 — GPA endpoints (current report, what-if predict, target path)
- `docs/UniBoard_TRD_v2.md` §12.6 — Deadline endpoints (unified timeline, upcoming)
- `docs/UniBoard_TRD_v2.md` §12.7 — Intelligence & notification endpoints (digest latest/history, alerts, notifications)
- `docs/UniBoard_TRD_v2.md` §12.8 — Sync endpoints (trigger, status)
- `docs/UniBoard_TRD_v2.md` §12.9 — Search endpoint (full-text across materials/discussions)
- `docs/UniBoard_TRD_v2.md` §12.10 — Health check endpoint

### Frontend Architecture
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification
- `docs/frontend_brief.md` — Design aesthetic philosophy (reference only)

### Requirements
- `.planning/REQUIREMENTS.md` — INFRA-11 (OpenAPI contract spec shared between frontend mock and backend)
- `.planning/ROADMAP.md` — Phase 2 success criteria

### Phase 1 Foundation (existing code to build on)
- `frontend/components/design-system/` — RoughCard, HeroDoodles, RoughNotationWrapper, ClientOnly
- `frontend/components/layout/` — AppShell, Header, Sidebar, RightPanel
- `frontend/package.json` — ky, @tanstack/react-query, zustand already installed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ky` v1.14.3: HTTP client already installed — configure with base URL, interceptors, auth header injection
- `@tanstack/react-query` v5.91.2: Already installed — set up QueryClientProvider (may already exist from Phase 1)
- `zustand` v5.0.12: Already installed — use for auth state (token, user info, isAuthenticated)
- `date-fns` v4.1.0: Already installed — use for deadline date formatting in fixtures

### Established Patterns
- Phase 1 used `withClientOnly()` wrapper for client-only components (RoughCard) — may inform how to handle query state
- App uses `next-intl` for i18n — hook error messages should support i18n keys
- Route groups: `app/[locale]/(dashboard)/` pattern established in Phase 1

### Integration Points
- ky client will be imported by all TanStack Query hooks
- Route Handler mocks go in `frontend/app/api/v1/...` (Next.js App Router API routes)
- Auth middleware in `frontend/middleware.ts` — extend to check JWT validity
- QueryClientProvider likely needs to be added to root layout or locale layout
- Each page phase (3-12) will import hooks directly: `import { useCourses } from '@/hooks/use-courses'`

</code_context>

<specifics>
## Specific Ideas

- MCP tools (canvas-ed-mcp) are available in dev environment for fetching real Canvas/Ed data to build fixtures
- User can provide additional API tokens from friends for data diversity if needed
- Mock should feel realistic enough for demo/pitch purposes (startup project)
- All mock data should use real USYD course codes and names (not fictional)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-api-contracts-mock-layer*
*Context gathered: 2026-03-20*
