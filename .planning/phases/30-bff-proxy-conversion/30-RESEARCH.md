# Phase 30: BFF Proxy Conversion - Research

**Researched:** 2026-04-06
**Domain:** Next.js Route Handler BFF proxy pattern, backend integration
**Confidence:** HIGH

## Summary

Phase 30 converts 17 mock Next.js Route Handlers into BFF (Backend For Frontend) proxies that forward requests to the Railway-deployed Python FastAPI backend. The existing architecture already has the correct structure: the frontend `ky` client sends requests to `/api/v1/...` with Supabase JWT, Route Handlers receive these requests, and the task is to replace fixture data returns with `fetch()` calls to the Python backend. One Route Handler (`threads/{threadId}/feedback`) already implements the complete proxy pattern, serving as the canonical reference.

The codebase audit reveals that 29 total Route Handlers exist, but only **17** need conversion (as specified in requirements). The remaining routes fall into categories: 1 already proxied (feedback), 1 purely static (health), and several that have **no Python backend equivalent** (timetable/sessions, timetable/weeks, users/me/export, users/me/tokens/{platform}/verify). These backend-missing routes need special handling -- either they stay as mock/placeholder until a backend route is built, or they are explicitly noted as out-of-scope for this phase.

**Primary recommendation:** Create a shared `proxyRequest()` utility function that handles the common proxy pattern (build backend URL, forward Authorization header, forward query params, return response with error transformation), then systematically convert each mock Route Handler using this utility.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BFF-01 | Convert 17 mock Route Handlers to proxy to Railway Python backend | Full route mapping completed below; proxy pattern documented from existing `feedback` route; shared utility pattern recommended |
| BFF-02 | Frontend API requests auto-attach Supabase JWT Authorization header | Already implemented in `lib/api/client.ts` via ky `beforeRequest` hook; Route Handlers must forward this header to Python backend |
| BFF-03 | Proxy layer unified error handling (backend 4xx/5xx to frontend-friendly messages) | Python backend returns structured `{ error: { code, message } }` envelope; proxy must transform and avoid leaking raw JSON |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Code comments:** Pure English only, no Chinese
- **Tech stack:** Next.js 15.5.14, ky 1.14.3, TanStack Query v5, Supabase Auth (JWT)
- **Backend:** Python FastAPI on Railway, `NEXT_PUBLIC_API_URL` env var for backend URL
- **Auth flow:** Frontend supabase-js handles login/token refresh; Python validates Supabase JWT in `Authorization: Bearer <token>` header
- **Testing:** vitest with jsdom environment, tests in `__tests__/` directory
- **Package manager:** pnpm 9+
- **Commit convention:** `<type>(<phase>-<plan>): <description>`

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App Router + Route Handlers (BFF layer) | Already deployed |
| ky | 1.14.3 | Frontend HTTP client with JWT hook | Already configured with `/api/v1` prefix |
| sse-starlette | (backend) | SSE streaming on Python side | Already used for AI streaming routes |

### Supporting (No New Dependencies Required)

This phase requires **zero new npm packages**. The built-in `fetch` API in Next.js Route Handlers is sufficient for proxying. `ky` is only used client-side.

## Architecture Patterns

### Current Architecture (Already Working)

```
Browser → ky (Bearer JWT) → Next.js Route Handler (/api/v1/...) → [MOCK DATA]
                                                                    ↓ (Phase 30)
                                                                → fetch() → Python FastAPI (Railway)
```

### Existing Proxy Reference: `threads/{threadId}/feedback/route.ts`

```typescript
// Source: frontend/app/api/v1/threads/[threadId]/feedback/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const body = await request.json();

  const backendUrl = `${
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  }/api/v1/threads/${threadId}/feedback`;

  const resp = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: request.headers.get("Authorization") || "",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
```

### Recommended Pattern: Shared Proxy Utility

```typescript
// Source: recommended pattern based on codebase analysis
// lib/api/proxy.ts

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// User-friendly error messages by HTTP status
const ERROR_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  401: "Session expired. Please sign in again.",
  403: "You don't have permission to access this resource.",
  404: "The requested resource was not found.",
  422: "The provided data could not be processed.",
  429: "Too many requests. Please try again later.",
  500: "Something went wrong. Please try again later.",
  502: "External service temporarily unavailable.",
  503: "Service temporarily unavailable.",
};

interface ProxyOptions {
  /** Override the backend path (defaults to matching the incoming URL path) */
  backendPath?: string;
  /** HTTP method override */
  method?: string;
  /** Whether to forward the request body */
  body?: string | null;
  /** Additional headers to forward */
  extraHeaders?: Record<string, string>;
  /** Whether this is an SSE streaming response */
  stream?: boolean;
}

export async function proxyRequest(
  request: NextRequest,
  options: ProxyOptions = {},
): Promise<NextResponse | Response> {
  const { backendPath, method, body, extraHeaders, stream } = options;

  const path = backendPath ?? new URL(request.url).pathname;
  const search = new URL(request.url).search;
  const url = `${BACKEND_URL}${path}${search}`;

  const headers: Record<string, string> = {
    Authorization: request.headers.get("Authorization") || "",
    ...extraHeaders,
  };

  // Only add Content-Type for requests with bodies
  if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
  }

  const resp = await fetch(url, {
    method: method ?? request.method,
    headers,
    body: body ?? undefined,
  });

  // SSE streaming: return raw Response (not NextResponse.json)
  if (stream && resp.ok) {
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Error transformation (BFF-03)
  if (!resp.ok) {
    const status = resp.status;
    let errorBody: { error?: { code?: string; message?: string } };
    try {
      errorBody = await resp.json();
    } catch {
      errorBody = {};
    }

    const friendlyMessage =
      ERROR_MESSAGES[status] || "An unexpected error occurred.";
    const code = errorBody?.error?.code || "BACKEND_ERROR";

    return NextResponse.json(
      { error: { code, message: friendlyMessage } },
      { status },
    );
  }

  // 204 No Content
  if (resp.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
```

### Anti-Patterns to Avoid

- **Leaking backend error details to frontend:** The Python backend returns structured errors like `{ error: { code: "TOKEN_INVALID", message: "ed API token is invalid or expired" } }`. The BFF must transform these into user-friendly messages, not pass them through verbatim. The `code` field can pass through (frontend uses it for logic), but the `message` should be friendly.
- **Hardcoding backend URLs per route:** Use a shared constant/utility, not copy-pasting `process.env.NEXT_PUBLIC_API_URL` in every file.
- **Forgetting to forward query parameters:** Many routes (deadlines, discussions, search) rely on query params that must be forwarded intact.
- **Using `NEXT_PUBLIC_API_URL` at runtime on the server without fallback:** Always provide a fallback like `http://localhost:8000` for local development.

## Complete Route Mapping

### 17 Routes That MUST Be Converted (BFF-01)

These currently return mock/fixture data and have corresponding Python backend routes:

| # | Frontend Route Handler | HTTP Methods | Python Backend Path | Notes |
|---|------------------------|-------------|---------------------|-------|
| 1 | `courses/route.ts` | GET | `/api/v1/courses` | Query param: `semester` |
| 2 | `courses/[id]/route.ts` | GET | `/api/v1/courses/{course_id}` | |
| 3 | `courses/[id]/grades/route.ts` | GET | `/api/v1/courses/{course_id}/grades` | |
| 4 | `courses/[id]/deadlines/route.ts` | GET | `/api/v1/courses/{course_id}/deadlines` | |
| 5 | `courses/[id]/outline/route.ts` | GET | `/api/v1/courses/{course_id}/outline` | |
| 6 | `courses/[id]/materials/route.ts` | GET | `/api/v1/courses/{course_id}/materials` | Query param: `source` not in backend |
| 7 | `courses/[id]/discussions/route.ts` | GET | `/api/v1/courses/{course_id}/discussions` | Cursor pagination: `filter`, `cursor`, `limit` |
| 8 | `courses/[id]/qa/stream/route.ts` | POST | `/api/v1/courses/{course_id}/qa/stream` | **SSE streaming** |
| 9 | `courses/[id]/review/stream/route.ts` | GET | `/api/v1/courses/{course_id}/review/stream` | **SSE streaming** |
| 10 | `deadlines/route.ts` (GET only) | GET | `/api/v1/deadlines` | Complex: query params, exports `deadlineActions` (remove) |
| 11 | `deadlines/upcoming/route.ts` | GET | `/api/v1/deadlines/upcoming` | |
| 12 | `deadlines/[deadlineId]/actions/route.ts` | POST | `/api/v1/deadlines/{deadline_id}/actions` | |
| 13 | `deadlines/[deadlineId]/actions/[action]/route.ts` | DELETE | `/api/v1/deadlines/{deadline_id}/actions/{action}` | |
| 14 | `gpa/route.ts` | GET | `/api/v1/gpa` | |
| 15 | `gpa/predict/route.ts` | POST | `/api/v1/gpa/predict` | |
| 16 | `gpa/path/route.ts` | POST | `/api/v1/gpa/path` | |
| 17 | `users/me/route.ts` | GET, PATCH, DELETE | `/api/v1/users/me` | 3 HTTP methods in 1 file |

### Routes Already Proxied (No Changes Needed)

| Frontend Route Handler | Status |
|------------------------|--------|
| `threads/[threadId]/feedback/route.ts` | Already proxied to Python backend |

### Routes With NO Python Backend Equivalent (Keep As-Is or Flag)

| Frontend Route Handler | Why No Backend Route | Recommendation |
|------------------------|---------------------|----------------|
| `health/route.ts` | Backend health is at `/health` (root, not `/api/v1/health`); frontend health is static | **Keep static** -- no user data |
| `timetable/sessions/route.ts` | No timetable model/routes in Python backend | **Keep mock** -- out of scope |
| `timetable/weeks/route.ts` | No timetable model/routes in Python backend | **Keep mock** -- out of scope |
| `users/me/export/route.ts` | No export endpoint in Python backend | **Keep mock** -- out of scope |
| `users/me/tokens/[platform]/verify/route.ts` | No separate verify endpoint in Python backend | **Keep mock** -- out of scope |

### Routes That Need Proxy + Could Also Convert

| Frontend Route Handler | Python Backend Path | Status |
|------------------------|---------------------|--------|
| `alerts/route.ts` | `/api/v1/alerts` | **Mock but has backend** -- include in 17 if counting allows |
| `notifications/route.ts` | `/api/v1/notifications` | **Mock but has backend** -- include in 17 if counting allows |
| `digest/latest/route.ts` | `/api/v1/digest/latest` | **Mock but has backend** -- include in 17 if counting allows |
| `digest/history/route.ts` | `/api/v1/digest/history` | **Mock but has backend** -- include in 17 if counting allows |
| `search/route.ts` | `/api/v1/search` | **Mock but has backend** -- include in 17 if counting allows |
| `sync/status/route.ts` | `/api/v1/sync/status` | **Mock but has backend** -- include in 17 if counting allows |
| `sync/trigger/route.ts` | `/api/v1/sync/trigger` | **Mock but has backend** -- include in 17 if counting allows |
| `users/me/tokens/[platform]/route.ts` | `/api/v1/users/me/tokens/{platform}` | **Mock but has backend** -- PUT and DELETE methods |

### Revised Complete Count

**Total mock handlers with backend counterparts: 25**
(17 in primary table + 8 in "could also convert" table)

**Total mock handlers without backend: 5** (health, timetable x2, export, verify)

**Note:** The requirements say "17 mock Route Handlers" but the actual audit finds 25 mock handlers with backend routes. The planner should clarify: either all 25 are converted, or the original 17 count was an estimate. Recommend converting **all 25** since they all have Python backend endpoints and the proxy pattern is identical for each.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP proxying | Custom fetch wrappers per route | Shared `proxyRequest()` utility | 25 routes = massive duplication without shared utility |
| Error transformation | Per-route error handling | Centralized error mapping in proxy utility | Consistent user-facing messages, single maintenance point |
| SSE streaming proxy | Custom stream parsing/re-emission | Direct `Response(resp.body)` passthrough | Backend already sends SSE format; just pipe the ReadableStream |
| JWT forwarding | Per-route header extraction | `request.headers.get("Authorization")` in shared proxy | Already set by ky client, just forward it |

**Key insight:** The proxy pattern is nearly identical across all 25 routes. The only variations are: (1) URL path construction with dynamic params, (2) whether to forward a body, (3) whether it's SSE streaming. A shared utility handles all three.

## Common Pitfalls

### Pitfall 1: SSE Stream Proxy Corruption
**What goes wrong:** Using `NextResponse.json()` for SSE responses destroys the streaming nature. The response must be piped as a raw `Response` with `text/event-stream` content type.
**Why it happens:** Default proxy pattern parses JSON, which fails on SSE.
**How to avoid:** Detect SSE endpoints (qa/stream, review/stream) and return `new Response(resp.body, { headers: { "Content-Type": "text/event-stream" } })`.
**Warning signs:** AI chat/review features return nothing or show "failed to parse" errors.

### Pitfall 2: Query Parameter Loss
**What goes wrong:** Routes like `deadlines?course_code=INFO1110&urgency=critical` lose their query parameters when constructing the backend URL.
**Why it happens:** Constructing `backendUrl` from path only, forgetting `request.url.search`.
**How to avoid:** Always append `new URL(request.url).search` to the backend URL.
**Warning signs:** Filters/pagination stop working after conversion.

### Pitfall 3: Request Body Double-Parsing
**What goes wrong:** `request.json()` can only be called once. If you read the body for logging, then try to forward it, the second read fails.
**Why it happens:** `Request` body is a ReadableStream consumed on first read.
**How to avoid:** Read body once, store as string, use for both logging and forwarding.
**Warning signs:** POST/PATCH/PUT routes return empty bodies or "body already consumed" errors.

### Pitfall 4: `deadlines/route.ts` Exports Shared State
**What goes wrong:** `deadlines/route.ts` currently exports `deadlineActions` (a `Map`) that `deadlines/[deadlineId]/actions/route.ts` and `deadlines/[deadlineId]/actions/[action]/route.ts` import. Converting to proxy removes this shared state.
**Why it happens:** Mock layer used module-scoped state; proxy layer doesn't need it.
**How to avoid:** Convert all three deadline action routes together. Remove the `export const deadlineActions` and the imports.
**Warning signs:** TypeScript import errors after converting deadlines route.

### Pitfall 5: Backend 204 No Content Handling
**What goes wrong:** `resp.json()` throws on 204 responses (no body to parse).
**Why it happens:** DELETE endpoints often return 204 No Content.
**How to avoid:** Check `resp.status === 204` before calling `resp.json()`.
**Warning signs:** Delete operations (tokens, deadline actions) throw runtime errors.

### Pitfall 6: NEXT_PUBLIC_API_URL Not Set in Development
**What goes wrong:** Proxy calls fail with `fetch failed` errors when the env var is missing.
**Why it happens:** Developer runs frontend without configuring the backend URL.
**How to avoid:** Provide sensible fallback (`http://localhost:8000`) and log a warning.
**Warning signs:** All API calls return 500 after conversion.

### Pitfall 7: Missing CORS for Server-Side Fetch
**What goes wrong:** Next.js Route Handlers run server-side; server-to-server calls don't need CORS but Railway backend CORS config must include the Vercel domain.
**Why it happens:** CORS is already configured in Python backend via `CORS_ORIGINS` env var.
**How to avoid:** Verify `CORS_ORIGINS` on Railway includes the Vercel frontend domain. Actually, since Route Handlers make server-side fetch calls, CORS headers are not checked. But the Vercel production domain should already be in CORS_ORIGINS from Phase 29.
**Warning signs:** None expected for server-side proxy; only relevant if frontend makes direct cross-origin calls.

## Code Examples

### Example 1: Simple GET Proxy (courses list)

```typescript
// frontend/app/api/v1/courses/route.ts
import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}
```

### Example 2: GET with Dynamic Params (course detail)

```typescript
// frontend/app/api/v1/courses/[id]/route.ts
import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyRequest(request, {
    backendPath: `/api/v1/courses/${id}`,
  });
}
```

### Example 3: POST with Body (GPA predict)

```typescript
// frontend/app/api/v1/gpa/predict/route.ts
import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyRequest(request, { body });
}
```

### Example 4: SSE Streaming Proxy (QA stream)

```typescript
// frontend/app/api/v1/courses/[id]/qa/stream/route.ts
import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.text();
  return proxyRequest(request, {
    backendPath: `/api/v1/courses/${id}/qa/stream`,
    body,
    stream: true,
  });
}
```

### Example 5: Multiple HTTP Methods (users/me)

```typescript
// frontend/app/api/v1/users/me/route.ts
import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  const body = await request.text();
  return proxyRequest(request, { body });
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}
```

### Example 6: Error Transformation (BFF-03)

```typescript
// Backend returns:
// { "error": { "code": "TOKEN_INVALID", "message": "ed API token is invalid or expired" }, "meta": { ... } }

// BFF proxy transforms to:
// { "error": { "code": "TOKEN_INVALID", "message": "The provided data could not be processed." } }
// (422 status mapped to friendly message)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js Middleware proxy (rewrite) | Route Handler proxy (explicit fetch) | Next.js 13+ App Router | Middleware removed in Phase 22 due to Edge Runtime incompatibility; Route Handlers are the correct approach |
| `http-proxy-middleware` | Built-in `fetch()` | 2024+ | No need for third-party proxy library in Next.js App Router; native `fetch` with streaming support is sufficient |

**Why NOT use Next.js `rewrites`:** Rewrites in `next.config.ts` could proxy entire paths, but they don't allow: (1) error transformation per BFF-03, (2) selective header forwarding, (3) request/response logging. Route Handlers provide full control.

## Open Questions

1. **Exact count of "17 mock Route Handlers"**
   - What we know: STATE.md says "17/29 frontend API Route Handlers return mock fixture data." Audit finds 25 mock handlers with backend counterparts and 5 without.
   - What's unclear: Whether the "17" was an exact count or estimate. The difference may be that 8 routes (alerts, notifications, digest x2, search, sync x2, tokens) were counted differently.
   - Recommendation: Convert ALL mock handlers that have a Python backend equivalent (25 total). It's the same effort per route, and leaving some mock routes creates confusing partial-real/partial-mock behavior. Flag the 5 without backend routes as explicitly out-of-scope.

2. **Timetable backend routes missing**
   - What we know: Frontend has `timetable/sessions/route.ts` and `timetable/weeks/route.ts` but Python backend has no timetable routes.
   - What's unclear: Whether timetable should remain mock or is expected to be built in this phase.
   - Recommendation: Keep timetable as mock. Building backend timetable routes is a separate feature phase, not a proxy conversion task.

3. **User export endpoint missing in backend**
   - What we know: Frontend has `users/me/export/route.ts` returning a mock download URL. No Python backend export route exists.
   - Recommendation: Keep as mock; data export is a separate feature.

4. **Token verify endpoint behavior**
   - What we know: Frontend has `users/me/tokens/{platform}/verify/route.ts`. Python backend token endpoint (`PUT /users/me/tokens/{platform}`) validates AND stores in one call; there's no separate verify-only endpoint.
   - Recommendation: Keep verify as mock or remove if frontend doesn't actually use it.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 3.x with jsdom |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && pnpm test -- --run` |
| Full suite command | `cd frontend && pnpm test -- --run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BFF-01 | Proxy utility forwards requests to backend URL | unit | `cd frontend && pnpm test -- --run __tests__/api/proxy.test.ts` | Wave 0 |
| BFF-01 | Each converted route calls proxyRequest correctly | unit | `cd frontend && pnpm test -- --run __tests__/api/proxy-routes.test.ts` | Wave 0 |
| BFF-02 | Authorization header forwarded from incoming request | unit | `cd frontend && pnpm test -- --run __tests__/api/proxy.test.ts` | Wave 0 |
| BFF-03 | Backend errors transformed to friendly messages | unit | `cd frontend && pnpm test -- --run __tests__/api/proxy.test.ts` | Wave 0 |
| BFF-03 | 204 No Content handled without parsing body | unit | `cd frontend && pnpm test -- --run __tests__/api/proxy.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd frontend && pnpm test -- --run && pnpm typecheck`
- **Per wave merge:** `cd frontend && pnpm test -- --run && pnpm lint && pnpm typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `frontend/__tests__/api/proxy.test.ts` -- covers BFF-01, BFF-02, BFF-03 (proxy utility tests)
- [ ] `frontend/__tests__/api/proxy-routes.test.ts` -- covers BFF-01 (spot-check converted routes)
- [ ] Update `frontend/__tests__/api/mock-routes.test.ts` -- existing tests will break when mock helpers are removed

## Sources

### Primary (HIGH confidence)

- **Direct codebase audit** -- read all 29 Route Handler files, all Python backend route files, API client, fixture helpers
- **Existing proxy reference** -- `threads/[threadId]/feedback/route.ts` (working production pattern)
- **Python backend route registry** -- `src/web/routes/__init__.py` (complete URL mapping)
- **Next.js App Router docs** -- Route Handlers with `fetch()` and `Response` streaming

### Secondary (MEDIUM confidence)

- **Next.js 15 Route Handler API** -- `NextRequest`, `NextResponse`, `params` as Promise (Next.js 15 breaking change already handled in codebase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, verified all existing versions
- Architecture: HIGH -- existing working proxy pattern in codebase, shared utility pattern is straightforward
- Pitfalls: HIGH -- identified from direct code reading (body consumption, SSE, shared state, 204 handling)
- Route mapping: HIGH -- exhaustive audit of both frontend and backend route files

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- no moving parts, all versions locked)
