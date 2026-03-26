# Phase 13: Supabase Foundation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the hybrid backend foundation: Supabase project (PostgreSQL + Auth + RLS), FastAPI skeleton connecting to Supabase DB, frontend auth store adapted from mock JWT to Supabase session, and local dev environment via Supabase CLI. This phase produces the infrastructure that all subsequent M2 phases (14-16) build on.

Requirements: INFRA-01, INFRA-07, INFRA-08, INFRA-09

</domain>

<decisions>
## Implementation Decisions

### Auth Migration Scope
- **Bridge pattern**: supabase-js handles login/register/token refresh, `onAuthStateChange` syncs access_token into existing zustand store
- ky client continues reading from `useAuthStore.getState().accessToken` — **all 26 data hooks and TanStack Query layer unchanged**
- Only auth components change: LoginForm/RegisterForm call `supabase.auth.signInWithPassword()` / `supabase.auth.signUp()` instead of mock API
- 6 auth mock Route Handlers (`/api/v1/auth/*`) deleted and replaced by direct supabase-js calls
- `tokenConfigured` flag stays in zustand (Supabase Auth has no concept of Canvas/Ed token setup state)
- Use `@supabase/ssr` with `createBrowserClient()` for Next.js App Router compatibility
- Supabase client singleton in `frontend/lib/supabase/client.ts`
- Auth guard logic remains in components (AuthGuard, SetupGuard) — check Supabase session instead of zustand isAuthenticated

### Mock API Coexistence
- 26 data mock Route Handlers (`/api/v1/courses/*`, `/api/v1/deadlines/*`, etc.) stay untouched
- Frontend continues independent development with mock data during M2
- Phase 15 (Core Services & API Routes) provides real Python endpoints; at that point ky `prefixUrl` switches via env var
- Mock handlers serve as contract reference and regression fallback

### Database Schema & Migration
- Supabase CLI manages schema (`supabase db push`, `supabase migration new`)
- Schema follows TRD §4 data model: users, courses, grades, deadlines, ed_threads, course_materials, skills, encrypted_tokens
- All tables include `user_id UUID REFERENCES auth.users(id)` column for RLS
- Use Supabase Auth's built-in `auth.users` table — no separate users table for auth (application profile data in a `profiles` table linked to `auth.users`)
- Token encryption (AES-256-GCM) stored as `bytea` columns in `user_tokens` table

### Data Isolation Model
- Per-user RLS on all tables: `CREATE POLICY ... USING (auth.uid() = user_id)`
- Each student syncs their own copy of course data (from their own Canvas/Ed API tokens)
- No shared data between students at MVP scale — simpler, more secure
- RLS enabled on every table before any data is inserted

### Python Backend Structure
- FastAPI app in `src/` package (standard Python project layout with `pyproject.toml` + uv)
- SQLAlchemy 2.0 async models connecting to Supabase PostgreSQL via `asyncpg` connection string
- JWT validation middleware: decode Supabase JWT using `SUPABASE_JWT_SECRET` env var, extract `sub` as user_id
- Health check endpoint: `GET /api/v1/health`
- CORS configured to allow frontend origin (localhost:3001 dev, Vercel domain prod)
- No supabase-py client in Python — direct SQL via SQLAlchemy for full query flexibility

### Local Development Environment
- `supabase start` runs local PostgreSQL + Auth + GoTrue emulator (Docker)
- Python backend via Docker Compose connecting to local Supabase DB
- `.env.local` switches between local Supabase (dev) and remote Supabase (prod)
- `supabase db reset` for clean state during development
- Frontend dev server (port 3001) connects to local Supabase Auth + local Python API

### Frontend Auth Flow (Updated)
- Login: `supabase.auth.signInWithPassword()` → onAuthStateChange fires → zustand setAuth → smart routing (tokenConfigured ? dashboard : setup)
- Register: `supabase.auth.signUp()` → auto-confirm (dev) or email confirm (prod) → success overlay → setup
- Logout: `supabase.auth.signOut()` → onAuthStateChange fires → zustand clearAuth → redirect to /auth
- Token refresh: Supabase SDK handles automatically via `onAuthStateChange` SIGNED_IN events
- Forgot password: `supabase.auth.resetPasswordForEmail()` replaces placeholder toast (real flow now possible)

### Claude's Discretion
- SQLAlchemy model field types and index design
- Exact RLS policy SQL syntax and edge cases
- Docker Compose service configuration details
- Supabase CLI migration file naming and organization
- FastAPI middleware implementation pattern (dependency injection vs middleware class)
- Error response format alignment with existing OpenAPI spec
- Python project dependency versions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model (PRIMARY — defines all tables)
- `docs/UniBoard_TRD_v2.md` §4 — Complete data model: all entities, relationships, field types, indexes
- `docs/UniBoard_TRD_v2.md` §15 — Database management: migration strategy, connection pooling, backup

### Security & Auth
- `docs/UniBoard_TRD_v2.md` §7 — Security implementation: token encryption (AES-256-GCM), authentication flow, CORS
- `docs/UniBoard_TRD_v2.md` §12.2 — Auth endpoints spec (register, login, refresh, logout) — Python backend must match these contracts

### API Contracts
- `docs/UniBoard_TRD_v2.md` §12 — Full REST API specification (32 endpoints) — Python backend implements these
- `docs/UniBoard_TRD_v2.md` §12.1 — API conventions (response envelope, pagination, error format)

### Local Dev Environment
- `docs/UniBoard_TRD_v2.md` §18 — Local development environment setup

### Existing Frontend Auth Code (must be adapted)
- `frontend/lib/auth/store.ts` — Zustand auth store (accessToken, refreshToken, user, isAuthenticated, tokenConfigured)
- `frontend/lib/api/client.ts` — ky HTTP client with Bearer token injection from zustand
- `frontend/hooks/use-auth.ts` — useLogin, useRegister, useLogout, useRefreshToken mutations (replace with supabase-js calls)
- `frontend/middleware.ts` — next-intl middleware (may need auth route protection)
- `frontend/app/api/v1/auth/` — 6 mock auth Route Handlers (to be deleted)

### Architecture Decision
- `.planning/PROJECT.md` — Supabase hybrid architecture decision, constraints, key decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/lib/auth/store.ts`: Zustand store with persist — keep as bridge layer, sync Supabase session into it
- `frontend/lib/api/client.ts`: ky client with Bearer injection — unchanged, continues reading from zustand
- `frontend/hooks/use-auth.ts`: Auth mutations — rewrite to use supabase-js instead of ky POST to mock handlers
- `frontend/components/auth/AuthGuard.tsx`: Auth guard — adapt to check Supabase session
- `frontend/components/auth/AuthDoodles.tsx`, `AnimatedEntry.tsx`, `LanguageSwitcher.tsx`: Unaffected by auth migration
- 26 data mock Route Handlers in `frontend/app/api/v1/`: Stay untouched

### Established Patterns
- `useAuthStore.getState()` for mutations outside render cycle (Phase 2) — keep this pattern
- `withClientOnly()` wrapper for Rough.js components (Phase 1) — unrelated but establishes SSR safety pattern
- Route groups: `(auth)` for standalone layout, `(dashboard)` for AppShell (Phase 1/3) — unchanged
- URL search params for state persistence across locale switches (Phase 3) — unchanged

### Integration Points
- `onAuthStateChange` listener needs to be registered early — in root layout or a dedicated AuthProvider component
- ky client's `prefixUrl` stays `/api/v1` (mock handlers) until Phase 15 switches to Python API
- Python backend needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL` env vars
- Supabase CLI config in `supabase/config.toml` at project root

</code_context>

<specifics>
## Specific Ideas

- Supabase Auth email confirmation should be disabled in local dev (auto-confirm) for fast iteration
- Python backend connects via Supabase's direct connection string (not pooler) for local dev; use pooler (`?pgbouncer=true`) in production
- The `profiles` table should store `display_name`, `university`, `faculty` — fields that Supabase Auth's `auth.users` doesn't natively have
- AES-256-GCM encryption key stored in `TOKEN_ENCRYPTION_KEY` env var, never in database or Supabase Dashboard

</specifics>

<deferred>
## Deferred Ideas

- Real Canvas/Ed token validation against external APIs — Phase 14 (Platform Adapters)
- Password reset email template customization — future enhancement
- OAuth / social login (Google, GitHub) — out of scope for MVP
- Supabase Realtime for sync status push — Phase 16 (Sync Engine) may use this
- Supabase Edge Functions — not needed, Python handles all server logic
- Multi-environment Supabase projects (dev/staging/prod) — Phase 22 (Deployment)

</deferred>

---

*Phase: 13-supabase-foundation*
*Context gathered: 2026-03-26*
