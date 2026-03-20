# Phase 2: API Contracts & Mock Layer - Research

**Researched:** 2026-03-20
**Domain:** OpenAPI type generation, HTTP client configuration, TanStack Query hooks, Next.js Route Handler mocks
**Confidence:** HIGH

## Summary

Phase 2 establishes the complete data layer that all 10 page phases (3-12) will consume. The work spans five domains: (1) writing an OpenAPI 3.1 YAML spec covering all TRD section 12 endpoints, (2) auto-generating TypeScript types via `openapi-typescript` v7, (3) configuring `ky` as the HTTP client with auth token injection, (4) implementing Next.js Route Handler mocks returning realistic fixture data, and (5) creating per-domain TanStack Query v5 hooks with query key factories.

The existing codebase from Phase 1 provides a solid foundation: `ky` v1.14.3, `@tanstack/react-query` v5.91.2, `zustand` v5.0.12, and `date-fns` v4.1.0 are already installed. The `@/*` path alias, Vitest test infrastructure, and `next-intl` i18n are already configured. There is no `QueryClientProvider` yet -- it must be added to the locale layout. Route Handlers go in `frontend/app/api/v1/...` (outside the `[locale]` group, already excluded from the i18n middleware matcher).

**Primary recommendation:** Use `openapi-typescript` v7.13.0 for zero-runtime type generation from a single `openapi.yaml` spec, wire types through ky via thin wrapper functions, and expose data via per-domain hook files using `queryOptions()` factories from TanStack Query v5.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Type Codegen**: Auto-generate TypeScript types from OpenAPI spec; must integrate with ky + TanStack Query v5
- **Mock Data Content**: Use REAL USYD course data fetched via MCP tools (canvas-ed-mcp) for fixtures; must cover normal path, missing data, risk scenarios, simulated latency/errors
- **Auth Mock Strategy**: Full simulation of login/register/refresh via Route Handlers; mock returns fake JWT; zustand stores auth state; unauthenticated access redirects to /auth/login via Next.js middleware; login defaults to "unconfigured" then Setup page accepts any string as token
- **Hook Architecture**: One file per domain (hooks/use-courses.ts, hooks/use-grades.ts, etc.); each file encapsulates useQuery/useMutation + query key factory

### Claude's Discretion
- Type codegen tooling selection (openapi-typescript recommended for lightweight + ky compatibility)
- Loading/error state pattern (per-hook return values vs Suspense + Error Boundary)
- OpenAPI spec file organization (single YAML vs split by domain)
- Query key factory pattern implementation
- Mock delay ranges and error rates
- ky client configuration details (interceptors, retry logic)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-11 | OpenAPI contract spec shared between frontend mock (Route Handlers) and backend (FastAPI) | OpenAPI 3.1 YAML spec covers all TRD section 12 endpoints; openapi-typescript generates shared types; Route Handlers implement mock responses matching the spec; FastAPI will later auto-generate from same spec |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openapi-typescript | 7.13.0 | Generate TS types from OpenAPI YAML | Zero-runtime, outputs `.d.ts` only, used by Vercel ecosystem; v7 is current stable |
| ky | 1.14.3 | HTTP client (fetch-based) | Already installed; lightweight, hooks system for auth injection, retry built-in |
| @tanstack/react-query | 5.91.2 | Server state management | Already installed; queryOptions() factory pattern, cache invalidation, loading/error states |
| zustand | 5.0.12 | Client state (auth store) | Already installed; minimal boilerplate, persist middleware for token storage |
| date-fns | 4.1.0 | Date formatting in fixtures | Already installed; tree-shakeable |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query-devtools | 5.91.2 | Debug query cache during development | Install as devDependency for DX |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| openapi-typescript | openapi-ts (hey-api) | Generates full SDK + hooks automatically, but heavier; project already has ky + TanStack Query installed, so lightweight type-only generation is more appropriate |
| openapi-typescript | orval | Generates TanStack Query hooks from OpenAPI, but locks into its patterns; we want manual control over hook architecture per CONTEXT.md decisions |
| Single YAML spec | Split-by-domain YAMLs | Split adds $ref complexity and tooling overhead; single file is simpler for a project with ~25 endpoints |

**Installation:**
```bash
cd frontend && pnpm add -D openapi-typescript @tanstack/react-query-devtools
```

**Version verification:** Verified against npm registry on 2026-03-20:
- `openapi-typescript`: 7.13.0
- `@tanstack/react-query-devtools`: 5.91.2 (match react-query version)
- `ky`: 1.14.3 (already installed)
- `@tanstack/react-query`: 5.91.2 (already installed)
- `zustand`: 5.0.12 (already installed)

## Architecture Patterns

### Recommended Project Structure

```
frontend/
├── openapi/
│   └── openapi.yaml              # Single OpenAPI 3.1 spec (source of truth)
├── lib/
│   ├── api/
│   │   ├── client.ts             # ky instance with base URL, auth hooks, error handling
│   │   └── types.gen.d.ts        # Auto-generated types (DO NOT EDIT)
│   ├── auth/
│   │   └── store.ts              # Zustand auth store (token, user, isAuthenticated)
│   └── query/
│       └── client.ts             # QueryClient configuration + provider wrapper
├── hooks/
│   ├── use-auth.ts               # Auth mutations (login, register, refresh, logout)
│   ├── use-courses.ts            # Course queries + query key factory
│   ├── use-grades.ts             # Grade queries
│   ├── use-deadlines.ts          # Deadline queries
│   ├── use-gpa.ts                # GPA queries + predict/path mutations
│   ├── use-digest.ts             # Digest queries
│   ├── use-materials.ts          # Course materials queries
│   ├── use-discussions.ts        # Discussion queries
│   ├── use-notifications.ts      # Notification/alert queries
│   ├── use-sync.ts               # Sync trigger mutation + status query
│   ├── use-search.ts             # Search query
│   └── use-user.ts               # User profile + token management
├── app/
│   ├── api/v1/                   # Next.js Route Handler mocks
│   │   ├── auth/
│   │   │   ├── register/route.ts
│   │   │   ├── login/route.ts
│   │   │   ├── refresh/route.ts
│   │   │   └── logout/route.ts
│   │   ├── users/me/
│   │   │   ├── route.ts          # GET /users/me, PATCH /users/me, DELETE /users/me
│   │   │   ├── tokens/[platform]/
│   │   │   │   ├── route.ts      # PUT, DELETE tokens
│   │   │   │   └── verify/route.ts
│   │   │   └── export/route.ts
│   │   ├── courses/
│   │   │   ├── route.ts          # GET /courses
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET /courses/:id
│   │   │       ├── grades/route.ts
│   │   │       ├── materials/route.ts
│   │   │       ├── discussions/route.ts
│   │   │       ├── deadlines/route.ts
│   │   │       └── outline/route.ts
│   │   ├── gpa/
│   │   │   ├── route.ts          # GET /gpa
│   │   │   ├── predict/route.ts  # POST /gpa/predict
│   │   │   └── path/route.ts     # POST /gpa/path
│   │   ├── deadlines/
│   │   │   ├── route.ts          # GET /deadlines
│   │   │   └── upcoming/route.ts
│   │   ├── digest/
│   │   │   ├── latest/route.ts
│   │   │   └── history/route.ts
│   │   ├── alerts/route.ts
│   │   ├── notifications/route.ts
│   │   ├── sync/
│   │   │   ├── trigger/route.ts
│   │   │   └── status/route.ts
│   │   ├── search/route.ts
│   │   └── health/route.ts
│   └── [locale]/...              # Existing page routes
└── __tests__/
    ├── api/                      # Hook tests
    │   ├── client.test.ts
    │   └── use-courses.test.ts   # Representative hook test
    └── ...
```

### Pattern 1: ky Client with Auth Token Injection

**What:** Centralized HTTP client that reads auth token from zustand store and injects it as Bearer header.
**When to use:** Every API call from hooks goes through this client.

```typescript
// frontend/lib/api/client.ts
import ky from "ky";
import { useAuthStore } from "@/lib/auth/store";

export const api = ky.create({
  prefixUrl: "/api/v1",
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401) {
          // Token expired - attempt refresh or redirect to login
          useAuthStore.getState().clearAuth();
        }
      },
    ],
  },
  retry: {
    limit: 2,
    statusCodes: [408, 429, 500, 502, 503, 504],
    methods: ["get"],
  },
  timeout: 15000,
});
```

**Key design decision:** ky.create() is used (not ky.extend()) because this is the root instance. The zustand store is accessed via `getState()` (not hooks) because this runs outside React component tree. The `prefixUrl: "/api/v1"` points to the local Route Handler mocks during development; it will switch to the real backend URL via environment variable in production.

### Pattern 2: Query Key Factory with queryOptions

**What:** Each domain hook file exports a key factory object and queryOptions functions for type-safe cache management.
**When to use:** Every TanStack Query hook in the project.

```typescript
// frontend/hooks/use-courses.ts
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

type CoursesResponse = paths["/courses"]["get"]["responses"]["200"]["content"]["application/json"];
type CourseDetailResponse = paths["/courses/{id}"]["get"]["responses"]["200"]["content"]["application/json"];

// Query key factory - hierarchical, colocated with data-fetching
export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  list: (semester?: string) => [...courseKeys.lists(), { semester }] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
};

// queryOptions factory - reusable between useQuery and queryClient methods
export const courseOptions = {
  list: (semester?: string) =>
    queryOptions({
      queryKey: courseKeys.list(semester),
      queryFn: () => api.get("courses", { searchParams: semester ? { semester } : {} }).json<CoursesResponse>(),
      staleTime: 5 * 60 * 1000, // 5 min per TRD 13.3
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: courseKeys.detail(id),
      queryFn: () => api.get(`courses/${id}`).json<CourseDetailResponse>(),
      staleTime: 5 * 60 * 1000,
    }),
};

// Exported hooks - thin wrappers around queryOptions
export function useCourses(semester?: string) {
  return useQuery(courseOptions.list(semester));
}

export function useCourseDetail(id: string) {
  return useQuery(courseOptions.detail(id));
}
```

### Pattern 3: Zustand Auth Store with Persist

**What:** Auth state management storing JWT tokens, user info, and token configuration status.
**When to use:** Auth flows, ky client token injection, middleware redirect logic.

```typescript
// frontend/lib/auth/store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; displayName: string } | null;
  isAuthenticated: boolean;
  tokenConfigured: boolean; // Canvas/Ed tokens configured
  setAuth: (tokens: { access: string; refresh: string }, user: AuthState["user"]) => void;
  setTokenConfigured: (configured: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      tokenConfigured: false,
      setAuth: (tokens, user) =>
        set({ accessToken: tokens.access, refreshToken: tokens.refresh, user, isAuthenticated: true }),
      setTokenConfigured: (configured) => set({ tokenConfigured: configured }),
      clearAuth: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false, tokenConfigured: false }),
    }),
    { name: "uniboard-auth" }
  )
);
```

### Pattern 4: Route Handler Mock with Simulated Latency/Errors

**What:** Next.js App Router route handlers returning fixture data with realistic delays and occasional errors.
**When to use:** Every mock endpoint in `app/api/v1/`.

```typescript
// frontend/app/api/v1/courses/route.ts
import { NextResponse } from "next/server";
import { courses } from "@/lib/fixtures/courses";

// Simulated latency: 100-800ms random delay
function mockDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * 700) + 100;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ~5% chance of 500 error to test frontend resilience
function shouldError(): boolean {
  return Math.random() < 0.05;
}

export async function GET(request: Request) {
  await mockDelay();

  if (shouldError()) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Mock server error" } },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const semester = url.searchParams.get("semester");

  const filtered = semester
    ? courses.filter((c) => c.semester === semester)
    : courses;

  return NextResponse.json({ data: filtered, meta: { request_id: crypto.randomUUID(), timestamp: new Date().toISOString() } });
}
```

### Pattern 5: QueryClient Provider Configuration

**What:** Central QueryClient with global defaults matching TRD caching strategy.
**When to use:** Root layout provider.

```typescript
// frontend/lib/query/client.ts
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 min default
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Anti-Patterns to Avoid
- **Inline query keys:** Never write `useQuery({ queryKey: ["courses"] })` directly in components. Always use the key factory from the hook file. Duplicated keys cause stale cache bugs.
- **ky.json() without type parameter:** Always pass the generated type: `api.get("courses").json<CoursesResponse>()`. Without it, the response is `unknown`.
- **Editing types.gen.d.ts manually:** This file is auto-generated. Changes will be overwritten. Fix the OpenAPI spec instead.
- **Mixing server/client state in zustand:** Only put auth and pure UI state in zustand. Server-fetched data belongs in TanStack Query cache.
- **Route Handler mocks with side effects on global state:** Each Route Handler should be stateless or use a simple in-memory store. Do not persist mock state to disk.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript types from API spec | Manual interface definitions | `openapi-typescript` codegen from YAML | 25+ endpoints with nested types; manual sync is error-prone and unmaintainable |
| Query cache management | Custom cache/store for server data | TanStack Query v5 | Handles stale-while-revalidate, background refetch, deduplication, garbage collection |
| HTTP retry/timeout | Custom retry wrapper | ky built-in retry config | Exponential backoff, jitter, status code filtering already built in |
| Auth token storage | Manual localStorage read/write | Zustand persist middleware | Handles serialization, hydration, and SSR edge cases |
| Response envelope unwrapping | Per-call `.data` access | ky `afterResponse` hook or helper | Consistent unwrapping prevents forgetting `.data` in some calls |

**Key insight:** This phase is glue code connecting well-established libraries. The value is in consistency and correct wiring, not custom logic.

## Common Pitfalls

### Pitfall 1: Next.js Middleware vs Route Handler Conflict
**What goes wrong:** The i18n middleware matcher `["/((?!api|_next|.*\\..*).*)"]` already excludes `/api/` routes from locale processing. But if Route Handlers are placed inside `app/[locale]/api/`, the locale segment interferes.
**Why it happens:** Developers assume all routes should be under the locale segment.
**How to avoid:** Place Route Handlers at `app/api/v1/...` (NOT `app/[locale]/api/`). The existing middleware matcher already excludes `/api/` paths from i18n processing.
**Warning signs:** 404 on API calls, or locale prefix appearing in API URLs.

### Pitfall 2: Zustand getState() Stale Closure in ky Hooks
**What goes wrong:** If auth token is captured in a closure during ky.create(), it stays stale forever.
**Why it happens:** ky hooks are defined once at module level.
**How to avoid:** Always call `useAuthStore.getState().accessToken` inside the `beforeRequest` hook function (not outside it). `getState()` reads the latest snapshot on each request.
**Warning signs:** API calls use an old token after login/refresh.

### Pitfall 3: OpenAPI 3.1 vs 3.0 Type Differences
**What goes wrong:** `openapi-typescript` v7 supports both 3.0 and 3.1, but type output differs. 3.1 uses JSON Schema fully (`type: ["string", "null"]` for nullable), while 3.0 uses `nullable: true`.
**Why it happens:** The OpenAPI spec version affects generated types.
**How to avoid:** Use OpenAPI 3.1 consistently (it aligns with JSON Schema draft 2020-12). FastAPI generates 3.1 by default since Pydantic v2.
**Warning signs:** Nullable fields generating wrong types (e.g., `string` instead of `string | null`).

### Pitfall 4: Route Handler Response Must Match OpenAPI Envelope
**What goes wrong:** Mock returns `{ courses: [...] }` but spec defines `{ data: [...], meta: {...} }`. Frontend code breaks when switching to real backend.
**Why it happens:** Rushing mock implementation without referencing the spec.
**How to avoid:** Every Route Handler response MUST match the TRD section 12.1 envelope: `{ data: ..., meta: { request_id, timestamp } }` for success, `{ error: { code, message } }` for errors. Use a shared `mockResponse()` helper.
**Warning signs:** Different response shapes between mock and spec.

### Pitfall 5: QueryClientProvider Must Be Client Component
**What goes wrong:** Adding QueryClientProvider to a Server Component causes "createContext" errors.
**Why it happens:** TanStack Query uses React Context which requires client-side rendering.
**How to avoid:** Create a separate `"use client"` wrapper component (QueryProvider) and mount it in the locale layout. The locale layout itself can remain a Server Component wrapping a Client child.
**Warning signs:** `Error: createContext only works in Client Components` at build time.

### Pitfall 6: ky prefixUrl Trailing Slash Behavior
**What goes wrong:** `ky.create({ prefixUrl: "/api/v1/" })` combined with `api.get("/courses")` produces `/api/v1//courses` (double slash).
**Why it happens:** ky does not normalize slashes between prefixUrl and the path.
**How to avoid:** Use `prefixUrl: "/api/v1"` (no trailing slash) and paths without leading slash: `api.get("courses")`.
**Warning signs:** 404 errors from double-slash paths.

### Pitfall 7: Mock Auth Token Validation
**What goes wrong:** Mock Route Handlers don't validate the Authorization header, so unauthenticated requests still get data.
**Why it happens:** Mock endpoints skip auth check for convenience.
**How to avoid:** Create a shared `requireAuth(request)` helper that checks for Bearer token presence. Return 401 `AUTH_REQUIRED` if missing. This ensures the frontend auth flow works end-to-end.
**Warning signs:** Pages display data when user should be redirected to login.

## Code Examples

### OpenAPI Spec Structure (Excerpt)

```yaml
# frontend/openapi/openapi.yaml
openapi: "3.1.0"
info:
  title: UniBoard API
  version: "1.0.0"
  description: University GPA Dashboard API
servers:
  - url: /api/v1
    description: Mock (Next.js Route Handlers)
  - url: https://api.uniboard.app/v1
    description: Production

paths:
  /courses:
    get:
      operationId: listCourses
      summary: List enrolled courses
      tags: [courses]
      parameters:
        - name: semester
          in: query
          schema:
            type: string
          example: "2026-S1"
      responses:
        "200":
          description: Course list
          content:
            application/json:
              schema:
                type: object
                required: [data, meta]
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Course"
                  meta:
                    $ref: "#/components/schemas/ResponseMeta"

components:
  schemas:
    ResponseMeta:
      type: object
      required: [request_id, timestamp]
      properties:
        request_id:
          type: string
          format: uuid
        timestamp:
          type: string
          format: date-time

    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              enum:
                - VALIDATION_ERROR
                - AUTH_REQUIRED
                - FORBIDDEN
                - NOT_FOUND
                - TOKEN_INVALID
                - RATE_LIMITED
                - UPSTREAM_ERROR
                - INTERNAL_ERROR
            message:
              type: string

    Course:
      type: object
      required: [id, name, code, semester, credit_points]
      properties:
        id:
          type: string
          example: "crs_abc123"
        name:
          type: string
          example: "Systems Programming"
        code:
          type: string
          example: "COMP2017"
        semester:
          type: string
          example: "2026-S1"
        credit_points:
          type: integer
          example: 6
        canvas_course_id:
          type: string
        ed_course_id:
          type: string
        current_mark:
          type: ["number", "null"]
          example: 82.5
        grade_letter:
          type: ["string", "null"]
          example: "D"
        completed_weight:
          type: number
          example: 0.40
        has_unit_outline:
          type: boolean
        last_sync_at:
          type: string
          format: date-time
```

### Type Generation Script

```json
// package.json scripts addition
{
  "scripts": {
    "generate:types": "openapi-typescript openapi/openapi.yaml -o lib/api/types.gen.d.ts",
    "check:types": "openapi-typescript openapi/openapi.yaml --check"
  }
}
```

### Response Envelope Helper for Route Handlers

```typescript
// frontend/lib/fixtures/helpers.ts
import { NextResponse } from "next/server";

export function mockResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      data,
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

export function mockError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function mockDelay(min = 100, max = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shouldSimulateError(rate = 0.05): boolean {
  return Math.random() < rate;
}

export function requireAuth(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return mockError("AUTH_REQUIRED", "Authentication required", 401);
  }
  return null; // Auth OK
}
```

### Middleware Extension for Auth Redirect

```typescript
// frontend/middleware.ts (extended)
import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";
import { NextResponse, type NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

// Pages that require authentication
const protectedPaths = ["/", "/courses", "/deadlines", "/predict", "/digest", "/settings", "/timetable"];
// Pages for unauthenticated users only
const authPaths = ["/auth/login", "/auth/register"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Apply i18n middleware for all other routes
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual TS interface authoring | OpenAPI codegen with openapi-typescript | Widespread since 2023 | Single source of truth for types; eliminates frontend/backend type drift |
| axios for HTTP | ky (fetch-based) | ky mature since v1.0 (2023) | Smaller bundle, native fetch, hooks system instead of interceptors |
| Custom query key strings | queryOptions() factory (TanStack v5) | TanStack Query v5 (Oct 2023) | Type-safe keys, co-located queryFn, reusable between hooks and queryClient |
| Redux/Context for server state | TanStack Query for server, zustand for client | Standard since 2022+ | Clear separation; TanStack handles caching/refetch automatically |
| MSW for API mocking | Next.js Route Handlers as mock layer | App Router stable (2023+) | No additional tooling; mocks ARE the app's API surface; zero config switch to real backend via env var |

**Deprecated/outdated:**
- `useQuery(key, fn, options)` -- v5 uses single object `useQuery({ queryKey, queryFn })`. The old overload signatures were removed.
- `cacheTime` -- renamed to `gcTime` in v5.
- openapi-typescript glob patterns -- deprecated in v7; use `redocly.yaml` for multi-file schemas (not needed for this project's single spec).

## Open Questions

1. **QueryProvider placement in layout hierarchy**
   - What we know: Must be a client component. NextIntlClientProvider is already in locale layout.
   - What's unclear: Whether QueryProvider should wrap inside or outside NextIntlClientProvider.
   - Recommendation: Place QueryProvider inside the locale layout as a sibling wrapper. Both are client providers and order does not matter since they don't depend on each other. Create a `Providers` component that composes both.

2. **Mock fixture data sourcing via MCP**
   - What we know: CONTEXT.md says use real USYD course data via MCP tools (canvas-ed-mcp).
   - What's unclear: Exact MCP tool invocation and available data shape at fixture-authoring time.
   - Recommendation: During implementation, the executor should invoke MCP tools to fetch real data, then manually shape it into TypeScript fixture files. If MCP is unavailable, use the TRD section 12 example data as baseline and augment with realistic USYD course codes.

3. **Production API URL switching**
   - What we know: Mock uses `/api/v1` (Route Handlers). Production uses `https://api.uniboard.app/v1`.
   - What's unclear: Whether to use `NEXT_PUBLIC_API_BASE_URL` env var or a different mechanism.
   - Recommendation: Use `NEXT_PUBLIC_API_BASE_URL` defaulting to `/api/v1`. ky client reads this at initialization. This is the standard Next.js pattern.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | `frontend/vitest.config.ts` (exists) |
| Quick run command | `cd frontend && pnpm test -- --run` |
| Full suite command | `cd frontend && pnpm test -- --run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-11a | OpenAPI spec generates valid TS types | unit | `cd frontend && npx openapi-typescript openapi/openapi.yaml --check` | N/A (CLI check) |
| INFRA-11b | ky client injects auth header | unit | `cd frontend && pnpm test -- --run __tests__/api/client.test.ts` | Wave 0 |
| INFRA-11c | ky client handles 401 by clearing auth | unit | `cd frontend && pnpm test -- --run __tests__/api/client.test.ts` | Wave 0 |
| INFRA-11d | useCourses hook returns typed data | unit | `cd frontend && pnpm test -- --run __tests__/hooks/use-courses.test.ts` | Wave 0 |
| INFRA-11e | Route Handler mock returns correct envelope | unit | `cd frontend && pnpm test -- --run __tests__/api/mock-routes.test.ts` | Wave 0 |
| INFRA-11f | Auth store persists and clears correctly | unit | `cd frontend && pnpm test -- --run __tests__/auth/store.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm test -- --run`
- **Per wave merge:** `cd frontend && pnpm test -- --run && pnpm typecheck && pnpm lint`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/api/client.test.ts` -- covers INFRA-11b, INFRA-11c (ky client auth injection and error handling)
- [ ] `__tests__/hooks/use-courses.test.ts` -- covers INFRA-11d (representative hook test with QueryClient wrapper)
- [ ] `__tests__/api/mock-routes.test.ts` -- covers INFRA-11e (route handler envelope format)
- [ ] `__tests__/auth/store.test.ts` -- covers INFRA-11f (zustand auth store)
- [ ] Type generation check via `openapi-typescript --check` in CI script

## Sources

### Primary (HIGH confidence)
- [openapi-typescript v7 CLI docs](https://openapi-ts.dev/cli) -- CLI flags, configuration, v7 changes
- [openapi-typescript introduction](https://openapi-ts.dev/introduction) -- Type generation architecture, paths/components structure
- [TanStack Query v5 queryOptions docs](https://tanstack.com/query/v5/docs/framework/react/guides/query-options) -- queryOptions factory pattern
- [TanStack Query v5 Query Keys docs](https://tanstack.com/query/v5/docs/react/guides/query-keys) -- Query key best practices
- [ky GitHub README](https://github.com/sindresorhus/ky) -- hooks API, create/extend, retry config
- npm registry -- Version verification for all packages (2026-03-20)
- Project TRD section 12 (`docs/UniBoard_TRD_v2.md` lines 1497-2183) -- Complete REST API specification
- Project TRD section 13 (`docs/UniBoard_TRD_v2.md` lines 2185-2389) -- Frontend architecture (state management, caching strategy)
- Project TRD section 14 (`docs/UniBoard_TRD_v2.md` lines 2391-2480) -- Error handling, error codes, retry strategy

### Secondary (MEDIUM confidence)
- [lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory) -- Query key factory library pattern (we implement the pattern manually rather than adding the library)
- [Zustand auth store patterns](https://doichevkostia.dev/blog/authentication-store-with-zustand/) -- Zustand persist middleware for auth

### Tertiary (LOW confidence)
- None -- all critical claims verified against official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already installed and version-verified against npm
- Architecture: HIGH -- Patterns derived from official docs (TanStack queryOptions, ky hooks, openapi-typescript CLI)
- Pitfalls: HIGH -- Based on known Next.js App Router behavior, ky API specifics, and verified middleware matcher

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable ecosystem; no major releases expected)
