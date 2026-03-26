# Phase 13: Supabase Foundation - Research

**Researched:** 2026-03-26
**Domain:** Supabase (DB + Auth + CLI) + FastAPI JWT adaptation + Next.js Auth migration
**Confidence:** HIGH

## Summary

Phase 13 migrates UniBoard from a hand-rolled JWT+bcrypt+Alembic auth system to Supabase-managed PostgreSQL, Auth (via `@supabase/ssr`), and CLI-driven migrations, while preserving the existing FastAPI backend and Python service architecture. The codebase already has substantial Python backend code (models, routes, services, sync engine, security modules), so this phase is primarily an **adaptation** rather than a greenfield build.

The key challenge is a coordinated three-layer migration: (1) Supabase CLI replaces Alembic for schema management + adds RLS policies, (2) Python backend's `security/auth.py` switches from self-signed JWT to Supabase JWT validation, (3) Frontend auth hooks switch from mock Route Handler calls to direct `supabase-js` calls with `onAuthStateChange` syncing into the existing zustand store.

**Primary recommendation:** Follow the bridge pattern -- keep zustand store + ky client untouched, replace only auth mutation sources (mock API -> supabase-js) and JWT validation (self-signed -> Supabase JWT). All 26 data hooks remain unchanged.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Bridge pattern**: supabase-js handles login/register/token refresh, `onAuthStateChange` syncs access_token into existing zustand store
- ky client continues reading from `useAuthStore.getState().accessToken` -- **all 26 data hooks and TanStack Query layer unchanged**
- Only auth components change: LoginForm/RegisterForm call `supabase.auth.signInWithPassword()` / `supabase.auth.signUp()` instead of mock API
- 6 auth mock Route Handlers (`/api/v1/auth/*`) deleted and replaced by direct supabase-js calls
- `tokenConfigured` flag stays in zustand (Supabase Auth has no concept of Canvas/Ed token setup state)
- Use `@supabase/ssr` with `createBrowserClient()` for Next.js App Router compatibility
- Supabase client singleton in `frontend/lib/supabase/client.ts`
- Auth guard logic remains in components (AuthGuard, SetupGuard) -- check Supabase session instead of zustand isAuthenticated
- 26 data mock Route Handlers stay untouched
- Supabase CLI manages schema (`supabase db push`, `supabase migration new`)
- Schema follows TRD SS4 data model
- All tables include `user_id UUID REFERENCES auth.users(id)` column for RLS
- Use Supabase Auth's built-in `auth.users` table -- application profile data in a `profiles` table linked to `auth.users`
- Per-user RLS on all tables: `CREATE POLICY ... USING (auth.uid() = user_id)`
- FastAPI app in `src/` package with `pyproject.toml` + uv
- SQLAlchemy 2.0 async models connecting to Supabase PostgreSQL via `asyncpg`
- JWT validation middleware: decode Supabase JWT using `SUPABASE_JWT_SECRET` env var
- No supabase-py client in Python -- direct SQL via SQLAlchemy
- `supabase start` runs local PostgreSQL + Auth + GoTrue emulator
- Python backend via Docker Compose connecting to local Supabase DB
- Frontend dev server (port 3001) connects to local Supabase Auth + local Python API

### Claude's Discretion
- SQLAlchemy model field types and index design
- Exact RLS policy SQL syntax and edge cases
- Docker Compose service configuration details
- Supabase CLI migration file naming and organization
- FastAPI middleware implementation pattern (dependency injection vs middleware class)
- Error response format alignment with existing OpenAPI spec
- Python project dependency versions

### Deferred Ideas (OUT OF SCOPE)
- Real Canvas/Ed token validation against external APIs -- Phase 14
- Password reset email template customization -- future
- OAuth / social login (Google, GitHub) -- out of scope for MVP
- Supabase Realtime for sync status push -- Phase 16
- Supabase Edge Functions -- not needed
- Multi-environment Supabase projects -- Phase 22

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | PostgreSQL database with schema for users, courses, grades, deadlines, Ed threads, course materials, skills, and encrypted tokens | Supabase CLI migration from TRD SS4, RLS policies, `auth.users` integration |
| INFRA-07 | Token encryption (AES-256-GCM) with key stored in environment variable | Existing `src/security/encryption.py` already implements this -- needs `bytea` column in `user_tokens` table via Supabase migration |
| INFRA-08 | Simple JWT + bcrypt authentication (not Cognito for MVP) | Replaced by Supabase Auth: frontend supabase-js + Python validates Supabase JWT (HS256 + audience "authenticated") |
| INFRA-09 | Docker Compose for local PostgreSQL + backend + frontend development environment | `supabase start` replaces standalone PostgreSQL Docker; Docker Compose wraps Python backend pointing to local Supabase DB |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | ^0.9.0 | Supabase client for Next.js SSR/cookie management | Official Supabase package for framework SSR integration, replaces deprecated `@supabase/auth-helpers-nextjs` |
| `@supabase/supabase-js` | ^2.100.0 | Supabase JavaScript client (Auth, Realtime) | Official client SDK, peer dependency of `@supabase/ssr` |
| `supabase` (CLI) | 2.84.4 | Local dev environment, migrations, schema management | Official Supabase CLI for `supabase start`, `supabase migration new`, `supabase db push` |
| `pyjwt[crypto]` | ^2.10 | Decode and validate Supabase JWT tokens in Python | Already in pyproject.toml, lightweight JWT library supporting HS256 |
| `sqlalchemy[asyncio]` | ^2.0 | Async ORM models connecting to Supabase PostgreSQL | Already in pyproject.toml, async support via `asyncpg` driver |
| `asyncpg` | ^0.30 | PostgreSQL async driver for SQLAlchemy | Already in pyproject.toml, high-performance async PG driver |
| `cryptography` | ^43 | AES-256-GCM encryption for Canvas/Ed tokens | Already in pyproject.toml, used by existing `src/security/encryption.py` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pydantic-settings` | ^2.0 | Load env vars into typed Settings class | Already in use (`src/config.py`), add Supabase env vars |
| `structlog` | ^24.0 | Structured logging | Already in use across Python backend |
| `uvicorn` | (via fastapi[standard]) | ASGI server for local dev | FastAPI dev server |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@supabase/ssr` | `@supabase/supabase-js` directly | Loses cookie-based session management; SSR token refresh broken |
| Supabase CLI migrations | Alembic (existing) | Alembic can't manage RLS policies; Supabase CLI is the blessed tool for Supabase-hosted DB |
| PyJWT HS256 validation | JWKS endpoint validation | Supabase supports JWKS but HS256 with `SUPABASE_JWT_SECRET` is simpler for MVP and fully supported |

**Frontend installation:**
```bash
cd frontend && pnpm add @supabase/ssr @supabase/supabase-js
```

**Supabase CLI installation (if not installed):**
```bash
brew install supabase/tap/supabase
# or via npm: npx supabase init
```

**Python backend -- no new dependencies needed.** PyJWT, SQLAlchemy, asyncpg, cryptography all already in `pyproject.toml`.

## Architecture Patterns

### Recommended Project Structure (New/Modified Files)

```
UniBoard/
├── supabase/                        # NEW: Supabase CLI project
│   ├── config.toml                  # Supabase local dev config
│   ├── migrations/                  # SQL migration files
│   │   ├── 00000000000000_initial_schema.sql
│   │   └── ...
│   └── seed.sql                     # Optional dev seed data
├── src/                             # MODIFIED: Python backend
│   ├── config.py                    # ADD: supabase_url, supabase_jwt_secret, supabase_service_role_key
│   ├── database.py                  # MODIFY: connection string to Supabase PostgreSQL
│   ├── models/
│   │   ├── user.py                  # REWRITE: Remove hashed_password, link to auth.users via supabase_uid
│   │   └── ...                      # MODIFY: All models add user_id FK to profiles/auth.users
│   ├── security/
│   │   ├── auth.py                  # REWRITE: Validate Supabase JWT (HS256, aud="authenticated")
│   │   ├── encryption.py            # KEEP: AES-256-GCM unchanged
│   │   └── password.py              # DELETE: Supabase Auth handles password hashing
│   └── web/
│       ├── main.py                  # MODIFY: CORS allow localhost:3001, remove self-managed auth routes
│       └── routes/
│           └── auth.py              # REWRITE: Remove register/login/refresh (Supabase handles these)
├── frontend/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # NEW: createBrowserClient singleton
│   │   │   ├── server.ts            # NEW: createServerClient for Server Components
│   │   │   └── proxy.ts             # NEW: updateSession for middleware
│   │   └── auth/
│   │       └── store.ts             # MODIFY: Add onAuthStateChange sync
│   ├── hooks/
│   │   └── use-auth.ts              # REWRITE: supabase-js calls instead of ky POST
│   ├── middleware.ts                 # MODIFY: Chain next-intl + Supabase session refresh
│   ├── components/auth/
│   │   ├── AuthGuard.tsx            # MODIFY: Check Supabase session
│   │   ├── LoginForm.tsx            # MODIFY: Call supabase.auth.signInWithPassword()
│   │   └── RegisterForm.tsx         # MODIFY: Call supabase.auth.signUp()
│   └── app/api/v1/auth/             # DELETE: 6 mock auth Route Handlers
└── docker-compose.yml               # MODIFY: Python backend service, remove standalone postgres
```

### Pattern 1: Supabase Browser Client Singleton

**What:** Single `createBrowserClient` instance shared across all client components.
**When to use:** All browser-side Supabase operations (auth only in this phase).

```typescript
// frontend/lib/supabase/client.ts
// Source: https://github.com/supabase/supabase/blob/master/examples/user-management/nextjs-user-management/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

### Pattern 2: Supabase Server Client (for Server Components)

**What:** Server-side Supabase client with cookie management.
**When to use:** Server Components, Server Actions, Route Handlers (future phases).

```typescript
// frontend/lib/supabase/server.ts
// Source: Supabase official Next.js example
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component -- ignored with proxy refreshing
          }
        },
      },
    }
  );
}
```

### Pattern 3: Middleware Session Refresh (Proxy)

**What:** Refresh expired Supabase Auth tokens in Next.js middleware.
**When to use:** Every request (middleware runs on all matched paths).

```typescript
// frontend/lib/supabase/proxy.ts
// Source: Supabase official Next.js example
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  // CRITICAL: Do not run code between createServerClient and getClaims()
  await supabase.auth.getClaims();
  return supabaseResponse;
}
```

### Pattern 4: Bridge Pattern -- Zustand + onAuthStateChange

**What:** Supabase Auth events sync into existing zustand store, preserving ky client compatibility.
**When to use:** Root-level AuthProvider registered early in app lifecycle.

```typescript
// Pattern: AuthProvider component (registered in root layout)
"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/auth/store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          useAuthStore.getState().setAuth(
            { access: session.access_token, refresh: session.refresh_token },
            {
              id: session.user.id,
              email: session.user.email ?? "",
              displayName: session.user.user_metadata?.display_name ?? "",
            }
          );
        } else {
          useAuthStore.getState().clearAuth();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);
  return <>{children}</>;
}
```

### Pattern 5: Python Supabase JWT Validation

**What:** FastAPI dependency that validates Supabase-issued JWTs.
**When to use:** All protected Python API routes.

```python
# src/security/auth.py (rewritten for Supabase JWT)
# Source: https://dev.to/zwx00/validating-a-supabase-jwt-locally-with-python-and-fastapi-59jf
import uuid
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.database import get_session

security = HTTPBearer(auto_error=False)

def decode_supabase_jwt(token: str) -> dict[str, Any]:
    """Decode and validate a Supabase JWT."""
    settings = get_settings()
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

async def get_current_user_id(
    cred: HTTPAuthorizationCredentials | None = Depends(security),
) -> uuid.UUID:
    """Extract user_id (sub) from Supabase JWT."""
    if cred is None:
        raise HTTPException(status_code=401, detail="Bearer authentication required")
    payload = decode_supabase_jwt(cred.credentials)
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing sub")
    return uuid.UUID(sub)
```

### Pattern 6: RLS Policy for Per-User Isolation

**What:** Supabase Row Level Security ensuring each user sees only their data.
**When to use:** Every table with a `user_id` column.

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Performance tip: (select auth.uid()) caches per-statement
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses"
  ON courses FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own courses"
  ON courses FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
```

### Anti-Patterns to Avoid

- **Do NOT use `auth.uid()` without `select` wrapper:** `(select auth.uid())` is optimized by PostgreSQL to cache per-statement. Bare `auth.uid()` is called per-row.
- **Do NOT skip `TO authenticated` in policies:** Without it, policies apply to all roles including `anon`, which may bypass authentication.
- **Do NOT put code between `createServerClient` and `getClaims()`:** The Supabase docs explicitly warn this causes random user logouts.
- **Do NOT use `supabase-py` in Python backend:** CONTEXT.md locks this to direct SQLAlchemy. `supabase-py` would add unnecessary dependency and dual-client complexity.
- **Do NOT run `alembic` migrations alongside Supabase CLI:** Use one migration system only. Supabase CLI is the blessed tool for Supabase-hosted databases.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User authentication | Custom JWT+bcrypt (current `security/auth.py` + `password.py`) | Supabase Auth via `@supabase/ssr` | Handles password hashing, email verification, token refresh, session management. Current hand-rolled code is ~140 LOC that Supabase replaces. |
| Token refresh | Manual `useRefreshToken()` mutation + timer | `onAuthStateChange` from Supabase SDK | Supabase SDK automatically refreshes tokens, fires callback. No manual timer needed. |
| Schema migration (for Supabase DB) | Alembic | `supabase migration new` + `supabase db push` | Supabase CLI manages RLS, auth schema, extensions natively. Alembic cannot manage `auth.users` or RLS policies. |
| Cookie-based session | Custom cookie management | `@supabase/ssr` `createServerClient` | Handles secure cookie storage/retrieval, token rotation, cross-tab sync. |
| Password hashing | `src/security/password.py` (passlib+bcrypt) | Supabase Auth | GoTrue handles bcrypt internally. Remove `passlib` dependency. |

**Key insight:** The existing Python backend has ~250 LOC of auth code (`auth.py` + `password.py` + parts of `routes/auth.py`) that gets replaced by ~30 LOC of Supabase JWT validation. The frontend's 82-line `use-auth.ts` gets rewritten to use `supabase-js` directly.

## Common Pitfalls

### Pitfall 1: Middleware Collision (next-intl + Supabase)

**What goes wrong:** The existing `middleware.ts` uses `createMiddleware(routing)` from `next-intl`. Supabase SSR requires its own middleware for `updateSession`. Running both independently breaks one or both.
**Why it happens:** Next.js only supports a single `middleware.ts` export.
**How to avoid:** Chain them: call `updateSession(request)` first, then pass the resulting response to `createMiddleware(routing)`. Or compose them as sequential steps in a single middleware function.
**Warning signs:** Users randomly logged out (Supabase session not refreshed) or locale detection broken.

### Pitfall 2: Supabase JWT `audience` Claim

**What goes wrong:** `jwt.decode()` without `audience="authenticated"` silently accepts tokens or throws confusing errors.
**Why it happens:** Supabase JWTs always contain `"aud": "authenticated"`. PyJWT validates this claim when specified but gives unhelpful error messages when it's missing vs wrong.
**How to avoid:** Always pass `audience="authenticated"` to `jwt.decode()`.
**Warning signs:** 401 errors with "Invalid token" but no clear reason.

### Pitfall 3: RLS Blocks Python Backend Queries

**What goes wrong:** Python backend uses SQLAlchemy with a direct connection string (not via PostgREST). If connecting as the `postgres` role, RLS is bypassed. If connecting as `anon` or `authenticated` role, RLS blocks queries missing JWT context.
**Why it happens:** RLS policies reference `auth.uid()` which requires a JWT to be set via `set_config('request.jwt.claims', ...)` in the session.
**How to avoid:** Python backend should connect using the `service_role` key (bypasses RLS) since it already validates JWTs in its own middleware. The `service_role` connection is trusted, and user isolation is enforced at the application layer via `WHERE user_id = :current_user_id` in SQLAlchemy queries.
**Warning signs:** Empty result sets or permission denied errors from Python API.

### Pitfall 4: Stale Zustand Persist vs Supabase Session

**What goes wrong:** Zustand persists auth state to localStorage. On page reload, zustand may hydrate stale credentials before Supabase SDK re-validates the session.
**Why it happens:** `zustand/persist` hydrates synchronously from localStorage, but Supabase SDK's `onAuthStateChange` fires asynchronously.
**How to avoid:** Use the existing `persist.onFinishHydration()` pattern (already in AuthGuard), then let `onAuthStateChange` overwrite with fresh session data. Don't trust zustand auth state until Supabase confirms the session.
**Warning signs:** Brief flash of authenticated state before being logged out.

### Pitfall 5: Missing `profiles` Table for User Metadata

**What goes wrong:** Supabase `auth.users` has limited metadata fields. Trying to store `display_name`, `university_id`, `gpa_target`, `gpa_scale` etc. in `auth.users.raw_user_meta_data` is fragile.
**Why it happens:** `auth.users` is managed by GoTrue, not user-controlled. Schema changes to `auth.users` are not supported.
**How to avoid:** Create a `profiles` table linked to `auth.users(id)` for all application-specific user data. Use a trigger or application-layer insert to create the profile row on user registration.
**Warning signs:** Data loss on auth table upgrades, difficulty querying user metadata in SQL.

### Pitfall 6: Docker Compose Port Conflicts with `supabase start`

**What goes wrong:** Existing `docker-compose.yml` runs PostgreSQL on port 5432. `supabase start` also runs PostgreSQL (on port 54322 by default). If the old Docker compose is running, ports may conflict or Python connects to the wrong DB.
**Why it happens:** Two PostgreSQL instances fighting for the same developer machine.
**How to avoid:** Remove the standalone `postgres` service from `docker-compose.yml`. Python backend's `DATABASE_URL` should point to Supabase's local DB at port 54322: `postgresql+asyncpg://postgres:postgres@localhost:54322/postgres`.
**Warning signs:** "Connection refused" or data appearing in wrong database.

### Pitfall 7: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vs `SUPABASE_ANON_KEY`

**What goes wrong:** Supabase recently renamed `SUPABASE_ANON_KEY` to `SUPABASE_PUBLISHABLE_KEY` in their docs and SDK. Using the old name may not work with latest `@supabase/ssr`.
**Why it happens:** Supabase naming convention change in 2025.
**How to avoid:** Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as shown in the official example. The value is the same as the anon key from `supabase status`.
**Warning signs:** "Invalid API key" errors from Supabase client.

## Code Examples

### Supabase CLI Initialization and Migration

```bash
# Initialize Supabase project (run from project root)
cd /path/to/UniBoard
supabase init

# Edit supabase/config.toml for local dev:
# [auth.email]
# enable_confirmations = false  # Auto-confirm for fast dev iteration

# Start local Supabase (Docker required)
supabase start

# Create first migration
supabase migration new initial_schema

# Apply migrations
supabase db push

# Reset DB (apply all migrations from scratch)
supabase db reset

# Get local Supabase credentials
supabase status
# → outputs: API URL, DB URL, anon key, service_role key, JWT secret
```

### Supabase config.toml Key Settings for UniBoard

```toml
# supabase/config.toml (relevant sections)
project_id = "uniboard"

[db]
port = 54322
major_version = 16

[auth]
enabled = true
site_url = "http://localhost:3001"
additional_redirect_urls = ["http://localhost:3001"]
jwt_expiry = 3600
enable_signup = true
enable_anonymous_sign_ins = false

[auth.email]
enable_signup = true
double_confirm_changes = false
enable_confirmations = false  # IMPORTANT: Auto-confirm for local dev

[inbucket]
enabled = true  # Email testing server for viewing confirmation emails
```

### Initial Schema Migration (Supabase SQL)

```sql
-- supabase/migrations/00000000000001_initial_schema.sql
-- Profiles table (extends auth.users with app-specific data)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  university_id TEXT,
  gpa_target REAL,
  gpa_scale TEXT NOT NULL DEFAULT 'wam',
  canvas_api_token_encrypted TEXT,
  ed_api_token_encrypted TEXT,
  canvas_token_status TEXT NOT NULL DEFAULT 'not_configured',
  ed_token_status TEXT NOT NULL DEFAULT 'not_configured',
  canvas_sync_status TEXT NOT NULL DEFAULT 'pending',
  ed_sync_status TEXT NOT NULL DEFAULT 'pending',
  canvas_last_synced_at TIMESTAMPTZ,
  ed_last_synced_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_manual_sync_at TIMESTAMPTZ,
  ai_calls_today INTEGER NOT NULL DEFAULT 0,
  ai_calls_reset_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Python Settings (Config Changes)

```python
# Added to src/config.py Settings class
# Supabase
supabase_url: str = "http://localhost:54321"
supabase_jwt_secret: str = "super-secret-jwt-token-with-at-least-32-characters-long"
supabase_service_role_key: str = ""
# database_url changes to point to Supabase local DB:
# postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
```

### Frontend Auth Hook (Rewritten)

```typescript
// frontend/hooks/use-auth.ts (rewritten for Supabase)
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/auth/store";

export function useLogin() {
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (error) throw error;
      return data;
    },
    // onAuthStateChange handles zustand sync -- no onSuccess needed here
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (body: { email: string; password: string; display_name: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
        options: { data: { display_name: body.display_name } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
      // onAuthStateChange handles zustand clearAuth
    },
  });
}
```

### Docker Compose (Updated for Supabase)

```yaml
# docker-compose.yml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@host.docker.internal:54322/postgres
      SUPABASE_URL: http://host.docker.internal:54321
      SUPABASE_JWT_SECRET: ${SUPABASE_JWT_SECRET}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      DEBUG: "true"
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` ^0.9.0 | 2024 | Consolidated package, framework-agnostic. Must use `@supabase/ssr`, not auth-helpers. |
| `SUPABASE_ANON_KEY` env var name | `SUPABASE_PUBLISHABLE_KEY` | 2025 | Renamed for clarity. Both work but official docs use new name. |
| `supabase.auth.getUser()` in middleware | `supabase.auth.getClaims()` in middleware | 2025 | `getClaims()` avoids network call, reads JWT locally. Faster and more reliable. |
| Static JWT secret (HS256) | JWKS endpoint (RS256) | 2025 (optional) | Supabase now supports JWKS. HS256 still works and is simpler for MVP. |
| Alembic for migrations | Supabase CLI migrations | N/A (Supabase projects) | Supabase CLI is the standard for Supabase-hosted DBs. Alembic doesn't manage RLS/auth schema. |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not install.
- `supabase.auth.getUser()` in middleware: Use `getClaims()` instead. `getUser()` makes a network call per request.
- `passlib[bcrypt]` + `bcrypt` packages in `pyproject.toml`: Should be removed; Supabase Auth handles password hashing.

## Open Questions

1. **Alembic coexistence vs replacement**
   - What we know: CONTEXT.md says "Supabase CLI manages schema". Existing codebase has 7 Alembic migrations.
   - What's unclear: Should Alembic be fully removed, or kept as a backup for non-Supabase environments?
   - Recommendation: Keep Alembic files in `alembic/` as historical reference but don't run them. All new migrations via Supabase CLI. The existing SQLAlchemy models can still be used for ORM mapping.

2. **Python backend connection role**
   - What we know: Python connects via SQLAlchemy, validates JWT in its own middleware.
   - What's unclear: Should it connect as `postgres` (superuser, bypasses RLS) or `service_role` (bypasses RLS but through Supabase's key)?
   - Recommendation: Use the direct PostgreSQL connection string (port 54322 for local, direct connection string for production). Connect as `postgres` role locally. For production, Supabase provides a direct connection string that bypasses RLS -- Python's own middleware provides the access control.

3. **Existing SQLAlchemy models vs Supabase schema**
   - What we know: 16 model files exist in `src/models/`. Supabase migrations create tables via raw SQL.
   - What's unclear: How to keep SQLAlchemy models in sync with Supabase-managed schema.
   - Recommendation: Supabase CLI creates tables (authoritative schema). SQLAlchemy models are updated to match as ORM mappings. `Base.metadata.create_all()` is never called -- schema is managed externally.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 8.3 + pytest-asyncio 0.25 (backend), vitest 4.1 (frontend) |
| Config file | `pyproject.toml` [tool.pytest.ini_options], `frontend/vitest.config.ts` |
| Quick run command | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/unit -x --timeout 30` |
| Full suite command | `python -m pytest tests/ --timeout 120` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Supabase schema matches TRD SS4 (all tables created) | integration | `supabase db reset && supabase db push` | -- Wave 0: migration SQL files |
| INFRA-07 | AES-256-GCM encrypt/decrypt round-trip | unit | `python -m pytest tests/unit/test_encryption.py -x` | -- Wave 0 (adapt existing) |
| INFRA-08 | Supabase JWT validation in Python (valid/expired/invalid tokens) | unit | `python -m pytest tests/unit/test_supabase_auth.py -x` | -- Wave 0 |
| INFRA-08 | Frontend login/register calls supabase-js | unit | `cd frontend && pnpm test -- --run tests/hooks/use-auth.test.ts` | -- Wave 0 |
| INFRA-09 | Docker Compose starts Python backend, connects to Supabase DB | smoke | `docker compose up -d backend && curl http://localhost:8000/health` | -- Wave 0 |
| INFRA-09 | Health check returns "healthy" with DB connected | integration | `python -m pytest tests/integration/test_health.py -x` | -- Wave 0 |

### Sampling Rate

- **Per task commit:** `python -m pytest tests/unit -x --timeout 30`
- **Per wave merge:** `python -m pytest tests/ --timeout 120 && cd frontend && pnpm typecheck`
- **Phase gate:** Full backend test suite + frontend build + typecheck green

### Wave 0 Gaps

- [ ] `tests/unit/test_supabase_auth.py` -- covers INFRA-08 (Supabase JWT validation)
- [ ] `tests/integration/test_health.py` -- covers INFRA-09 (health check with DB)
- [ ] `supabase/migrations/` -- initial schema SQL covering INFRA-01
- [ ] Supabase CLI setup (`supabase init`, `config.toml`)

## Sources

### Primary (HIGH confidence)
- [Supabase official Next.js example](https://github.com/supabase/supabase/tree/master/examples/user-management/nextjs-user-management) -- Browser client, server client, proxy/middleware code verified via GitHub API
- [Supabase SSR docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- createBrowserClient/createServerClient API
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- Policy syntax, `(select auth.uid())` optimization
- [Supabase CLI config reference](https://supabase.com/docs/guides/local-development/cli/config) -- config.toml options
- [Supabase CLI config.toml template](https://github.com/supabase/cli/blob/develop/pkg/config/templates/config.toml) -- All available configuration fields
- npm registry: `@supabase/ssr` v0.9.0, `@supabase/supabase-js` v2.100.0, `supabase` CLI v2.84.4 -- verified 2026-03-26

### Secondary (MEDIUM confidence)
- [FastAPI + Supabase JWT validation](https://dev.to/zwx00/validating-a-supabase-jwt-locally-with-python-and-fastapi-59jf) -- PyJWT decode with `audience="authenticated"`, verified pattern
- [Supabase JWT migration to JWKS](https://objectgraph.com/blog/migrating-supabase-jwt-jwks/) -- Context on HS256 vs RS256, HS256 still supported
- Existing codebase files -- `src/security/auth.py`, `src/config.py`, `src/models/user.py`, `frontend/hooks/use-auth.ts`, `frontend/lib/auth/store.ts`

### Tertiary (LOW confidence)
- None -- all findings verified against official sources or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All versions verified via npm registry and existing pyproject.toml. Official Supabase examples used as reference.
- Architecture: HIGH -- Bridge pattern confirmed feasible by inspecting existing zustand store and ky client. Supabase SSR patterns from official GitHub example.
- Pitfalls: HIGH -- RLS bypass, middleware collision, audience claim all documented in official Supabase docs and community discussions. Port conflict and stale state pitfalls from codebase analysis.
- Validation: MEDIUM -- Test patterns established but Wave 0 test files don't exist yet.

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (Supabase packages update frequently but patterns are stable)
