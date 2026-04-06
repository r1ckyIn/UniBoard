# Phase 31: E2E Verification & AI Config - Research

**Researched:** 2026-04-06
**Domain:** End-to-end user journey verification, AI production configuration, SSE streaming
**Confidence:** HIGH

## Summary

Phase 31 is a **verification and wiring phase**, not a feature-build phase. The backend API, frontend UI, and AI services already exist from previous phases. The work is: (1) fix the setup flow to actually call the backend for token validation/storage, (2) configure ANTHROPIC_API_KEY in Railway, (3) fix the SuccessStep to show real sync results, and (4) verify the complete E2E journey works.

The most critical finding is that the **setup token flow is broken for production**: `TokenStep` only validates tokens with local regex and never calls the backend `PUT /api/v1/users/me/tokens/{platform}` endpoint. `SuccessStep` displays hardcoded `MOCK_COURSES` instead of actual sync results. Additionally, SSE streaming components (`use-ai-stream.ts`, `UnitReviewSection.tsx`) have a dual-path issue where they can bypass the BFF proxy and call the Railway backend directly from the browser based on `NEXT_PUBLIC_API_URL` value.

**Primary recommendation:** Wire the setup token step to call the real backend token configuration API, replace mock sync results with real data, ensure SSE streaming routes go through the BFF proxy consistently, and add ANTHROPIC_API_KEY to Railway environment variables.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BFF-04 | End-to-end user journey (register -> token setup -> first sync -> real data displayed) | TokenStep must call `PUT /api/v1/users/me/tokens/{platform}` for real validation; SuccessStep must poll sync status and display real courses; AuthProvider + profile trigger already handle registration |
| AICONF-01 | ANTHROPIC_API_KEY configured in Railway environment variables | `src/config.py` already reads `anthropic_api_key` from env; Railway dashboard needs the key set; app gracefully degrades when key is empty |
| AICONF-02 | AI features return real results with SSE streaming | Backend AI routes exist (`src/web/routes/ai.py`); frontend SSE client exists (`lib/api/ai-stream.ts`); BFF proxy routes exist with `stream: true`; dual-path issue needs resolution |
</phase_requirements>

## Architecture Patterns

### Current E2E Data Flow
```
Browser -> ky client (Bearer JWT) -> Next.js Route Handler -> proxyRequest() -> Railway FastAPI -> Supabase PostgreSQL
                                                                                     |
                                                                              AI: Anthropic API
                                                                              Sync: Canvas/Ed APIs
```

### Registration Flow (WORKING)
```
1. Browser: supabase.auth.signUp() via @supabase/ssr
2. Supabase Auth: creates auth.users row, issues JWT
3. PostgreSQL trigger: on_auth_user_created -> handle_new_user() -> INSERT profiles
4. AuthProvider: onAuthStateChange stores tokens in zustand
5. AuthGuard: detects isAuthenticated=true, tokenConfigured=false -> redirect /setup
```

### Token Setup Flow (BROKEN - needs fixing)
```
Current (BROKEN):
1. TokenStep: local regex validation only
2. TokenStep onSuccess -> SetupPage advances to SuccessStep
3. SuccessStep: fires sync trigger, shows MOCK_COURSES after 3s timer
4. Tokens are NEVER sent to backend, never encrypted, never stored

Required (FIX):
1. TokenStep: call PUT /api/v1/users/me/tokens/canvas with real token
2. Backend: validates token against Canvas API, encrypts (AES-256-GCM), stores
3. TokenStep: call PUT /api/v1/users/me/tokens/ed with real Ed token
4. Backend: validates against Ed API, encrypts, stores
5. SuccessStep: trigger sync, poll /api/v1/sync/status, display real courses
```

### AI Streaming Flow (WORKING but has dual-path issue)
```
Path A (BFF Proxy - preferred):
  Browser -> ky POST /api/v1/courses/{id}/qa/stream
  -> Next.js Route Handler (stream: true)
  -> proxyRequest() with stream passthrough
  -> Railway FastAPI -> SSE EventSourceResponse

Path B (Direct - current in use-ai-stream.ts and UnitReviewSection.tsx):
  Browser -> fetch(NEXT_PUBLIC_API_URL + /api/v1/courses/{id}/qa/stream)
  -> Railway FastAPI directly
  -> SSE EventSourceResponse
  (Bypasses BFF proxy, requires CORS from Railway)
```

### Pattern: Fix SSE to Use BFF Proxy Consistently
**What:** Remove `NEXT_PUBLIC_API_URL` usage from client-side SSE components; route through BFF proxy
**When to use:** All AI streaming requests from browser
**Why:** Consistent with BFF pattern established in Phase 30; avoids CORS issues; centralizes auth header handling
**Example:**
```typescript
// BEFORE (use-ai-stream.ts line 64)
const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
const url = `${apiBase}/api/v1/courses/${courseId}/qa/stream`;

// AFTER - always go through BFF proxy
const url = `/api/v1/courses/${courseId}/qa/stream`;
```

### Anti-Patterns to Avoid
- **Leaving mock data in production flow:** SuccessStep MOCK_COURSES must be replaced with real data
- **Client-side direct backend calls:** SSE components should use BFF proxy, not NEXT_PUBLIC_API_URL directly
- **Sync-and-forget:** SuccessStep fires sync but doesn't wait for results; must poll sync status
- **Token regex-only validation:** Local regex catches format issues but doesn't verify the token actually works against Canvas/Ed API

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token validation | Client-side regex only | Backend PUT /api/v1/users/me/tokens/{platform} (already exists) | Backend validates against real API, encrypts, stores |
| Sync status polling | setTimeout with mock data | useSyncStatus() hook (already exists) with polling interval | Hook already wired to GET /api/v1/sync/status |
| SSE parsing | New SSE library | Existing `lib/api/ai-stream.ts` parseSseStream (already built) | Handles POST-based SSE, abort, error events |
| AI engine initialization | New AI client | AIEngine class reads anthropic_api_key from Settings singleton | Already handles model selection, streaming, tool use |

## Common Pitfalls

### Pitfall 1: TokenStep Not Calling Backend API
**What goes wrong:** User enters tokens, local regex passes, but tokens are never sent to the backend. No encryption, no storage. Sync fails because no tokens in database.
**Why it happens:** M1 built the setup UI with mock flow (Phase 4). The actual backend token API was built in M2 (Phase 15). The two were never connected.
**How to avoid:** TokenStep must call `useConfigureToken()` mutation (already in `hooks/use-user.ts`) for each platform. Only advance to SuccessStep after both backend calls succeed.
**Warning signs:** Sync trigger returns errors, courses page shows empty, sync status shows "pending" forever.

### Pitfall 2: SuccessStep Using Hardcoded Mock Courses
**What goes wrong:** SuccessStep shows "COMP2017, COMP3221, STAT2011, EDGU1003, MATH2021" regardless of what the user's actual courses are.
**Why it happens:** The component was built during M1 with fixture data. It fires `syncTrigger.mutateAsync` (real API call) but ignores the result, using a 3-second timer and MOCK_COURSES instead.
**How to avoid:** After triggering sync, poll sync status with `useSyncStatus()`. Once sync completes, fetch courses via `useCourses()` hook to display real course names.
**Warning signs:** Every user sees the same 5 courses on the success page.

### Pitfall 3: SSE Streaming Dual-Path Confusion
**What goes wrong:** AI streaming works in dev (both paths hit localhost) but behaves differently in production based on whether `NEXT_PUBLIC_API_URL` is set or empty.
**Why it happens:** `use-ai-stream.ts` and `UnitReviewSection.tsx` construct URLs with `process.env.NEXT_PUBLIC_API_URL || ""`. Since these are `"use client"` components, `NEXT_PUBLIC_*` vars are inlined at build time. If set in Vercel, browser calls Railway directly. If empty, goes through BFF proxy.
**How to avoid:** Remove `NEXT_PUBLIC_API_URL` from client components. Always use relative paths (`/api/v1/...`) to go through the BFF proxy which already has `stream: true` support.
**Warning signs:** CORS errors in browser console; SSE streaming works locally but breaks in production.

### Pitfall 4: ANTHROPIC_API_KEY Empty String Behavior
**What goes wrong:** AI endpoints return 500 errors because `AIEngine(api_key="")` creates an Anthropic client with an empty key.
**Why it happens:** `config.py` defaults `anthropic_api_key` to `""`. Some routes create AIEngine unconditionally without checking if the key is present.
**How to avoid:** AI routes should check `settings.anthropic_api_key` before creating AIEngine. The sync engine already does this (e.g., `sync/discussions.py` line 169: `if settings.anthropic_api_key and synced_courses`). The AI REST endpoints should guard similarly.
**Warning signs:** 500 errors on AI chat, review, or Q&A endpoints.

### Pitfall 5: Supabase Email Confirmation Blocking Registration
**What goes wrong:** User signs up but can't log in because Supabase requires email confirmation, and the built-in email service may not deliver reliably.
**Why it happens:** Supabase default is to require email confirmation. Built-in email service has rate limits and reliability issues.
**How to avoid:** For Phase 31 testing, either disable email confirmation in Supabase dashboard (Settings -> Auth -> Auth Providers -> Email -> Confirm email = OFF) or have user check spam folder. Custom SMTP is Phase 32 scope.
**Warning signs:** "Email not confirmed" error after signup; user stuck on auth page.

### Pitfall 6: Sync Race Condition in SuccessStep
**What goes wrong:** SuccessStep navigates to dashboard before sync finishes, user sees empty data.
**Why it happens:** Current code has a 3s timer that always shows "complete" regardless of actual sync status. Even with the fix, sync can take 30+ seconds for a full initial sync.
**How to avoid:** Show sync progress honestly. Allow navigation to dashboard while sync continues in background. Dashboard should show loading states or partial data gracefully.
**Warning signs:** Empty courses page, missing grades, no deadlines after first login.

## Code Examples

### TokenStep Fix: Call Backend API for Token Validation
```typescript
// In TokenStep.tsx - replace local-only validation with backend call
import { useConfigureToken } from "@/hooks/use-user";

const configureToken = useConfigureToken();

const handleValidate = async () => {
  setValidating(true);
  try {
    // Step 1: Configure Canvas token via backend
    await configureToken.mutateAsync({
      platform: "canvas",
      body: { token: canvasValue.trim() },
    });
    setCanvasStatus("valid");

    // Step 2: Configure Ed token via backend
    await configureToken.mutateAsync({
      platform: "ed",
      body: { token: edValue.trim() },
    });
    setEdStatus("valid");

    onSuccess();
  } catch (err) {
    // Backend returns TokenInvalidError with platform info
    // Handle per-platform error display
  } finally {
    setValidating(false);
  }
};
```

### SuccessStep Fix: Real Sync Status and Courses
```typescript
// In SuccessStep.tsx - replace MOCK_COURSES with real data
import { useSyncStatus } from "@/hooks/use-sync";
import { useCourses } from "@/hooks/use-courses";

const { data: syncData } = useSyncStatus();
const { data: coursesData } = useCourses();

// Poll sync status every 3 seconds while syncing
const isSyncing = syncData?.data?.is_syncing ?? true;
const courses = coursesData?.data?.courses ?? [];
```

### SSE Fix: Remove Direct Backend Call
```typescript
// In use-ai-stream.ts - remove NEXT_PUBLIC_API_URL
// BEFORE:
const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
const url = `${apiBase}/api/v1/courses/${courseId}/qa/stream`;

// AFTER:
const url = `/api/v1/courses/${courseId}/qa/stream`;
```

### AI Route Guard: Check API Key Before Use
```python
# In ai.py route handlers - guard against empty API key
settings = get_settings()
if not settings.anthropic_api_key:
    raise HTTPException(
        status_code=503,
        detail="AI features are not configured. Please contact admin."
    )
engine = AIEngine(api_key=settings.anthropic_api_key)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mock fixture data in Route Handlers | proxyRequest BFF proxy | Phase 30 (2026-04-06) | All data queries now go to real backend |
| Local-only token regex validation | Backend validates against real API | Phase 15 (2026-03-27) backend built, NOT WIRED to frontend | Frontend setup flow still uses regex-only |
| Hardcoded MOCK_COURSES in setup | Should poll sync status + fetch courses | Not yet changed | SuccessStep still shows fake data |
| Direct backend SSE calls from browser | BFF proxy with stream: true | Phase 30 added proxy routes | Client components still use old direct path |

## Open Questions

1. **Supabase email confirmation settings**
   - What we know: Supabase has a built-in email service with rate limits; custom SMTP is Phase 32
   - What's unclear: Current email confirmation setting in production Supabase dashboard
   - Recommendation: Verify in Supabase dashboard; if confirmation required, document the workaround for testing

2. **VOYAGE_API_KEY for RAG embeddings**
   - What we know: `QAService` uses `voyage_api_key` from settings for RAG-based Q&A; config defaults to `""`
   - What's unclear: Whether VOYAGE_API_KEY is needed for Phase 31 scope (AICONF-02) or can be deferred
   - Recommendation: Set it in Railway if available; AI features will work without it but use direct context instead of RAG

3. **Sync duration for first-time users**
   - What we know: Full sync involves grades (15min interval), deadlines (1h), modules (daily), outline (semester)
   - What's unclear: How long initial sync takes for a user with 5 courses
   - Recommendation: SuccessStep should allow navigation to dashboard during sync; show partial data as it arrives

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Railway backend | BFF proxy, all data queries | Yes | Live at uniboard-production.up.railway.app | -- |
| Vercel frontend | UI hosting | Yes | Live at uni-board-tau.vercel.app | -- |
| Supabase PostgreSQL | Database | Yes | Sydney region (brcsgbxnflyxbmijwbte) | -- |
| Supabase Auth | User registration, JWT | Yes | Configured | -- |
| ANTHROPIC_API_KEY | AI features (AICONF-01) | Not set in Railway | -- | AI endpoints return 503; non-AI features work |
| VOYAGE_API_KEY | RAG embeddings | Not set in Railway | -- | QA falls back to direct context instead of RAG |
| Canvas API | Token validation, data sync | Yes | canvas.sydney.edu.au | -- |
| Ed Discussion API | Token validation, data sync | Yes | edstem.org | -- |

**Missing dependencies with no fallback:**
- ANTHROPIC_API_KEY must be set in Railway for AICONF-01 and AICONF-02

**Missing dependencies with fallback:**
- VOYAGE_API_KEY: AI Q&A works without it (uses direct context instead of RAG)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (backend) | pytest 8.x + pytest-asyncio |
| Framework (frontend) | vitest + jsdom |
| Config file (backend) | `pyproject.toml` [tool.pytest.ini_options] |
| Config file (frontend) | `frontend/vitest.config.ts` |
| Quick run (backend) | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && uv run pytest tests/ -x --timeout=10` |
| Quick run (frontend) | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard/frontend && pnpm vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BFF-04 | TokenStep calls backend API for validation | unit (frontend) | `pnpm vitest run __tests__/setup/TokenStep.test.tsx -x` | Exists (needs update) |
| BFF-04 | SuccessStep shows real sync results | unit (frontend) | `pnpm vitest run __tests__/setup/SuccessStep.test.tsx -x` | Wave 0 |
| BFF-04 | E2E journey register->sync->data | manual | Human verification with real accounts | N/A |
| AICONF-01 | ANTHROPIC_API_KEY accessible by backend | manual | `railway variables` or Railway dashboard check | N/A |
| AICONF-02 | AI QA stream returns real results | manual + unit | `pnpm vitest run __tests__/hooks/use-ai-stream.test.tsx -x` | Wave 0 |
| AICONF-02 | AI review stream returns real results | manual | Human verification in browser | N/A |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm vitest run --reporter=dot`
- **Per wave merge:** `cd frontend && pnpm vitest run && pnpm typecheck`
- **Phase gate:** Full frontend suite green + manual E2E verification

### Wave 0 Gaps
- [ ] `frontend/__tests__/setup/SuccessStep.test.tsx` -- test real sync polling behavior
- [ ] Update `frontend/__tests__/setup/TokenStep.test.tsx` -- test backend API calls instead of regex-only

## Detailed Analysis of Broken/Missing Wiring

### 1. TokenStep -> Backend API (CRITICAL)

**Current state:** `TokenStep.tsx` uses `validateCanvasToken()` and `validateEdToken()` from `lib/validations/token.ts` -- both are pure regex checks. The `useConfigureToken()` hook from `hooks/use-user.ts` is never imported or called.

**Backend endpoint ready:** `PUT /api/v1/users/me/tokens/{platform}` (`src/web/routes/users.py` line 103) validates the token against the real Canvas/Ed API via httpx, encrypts with AES-256-GCM, stores in profiles table, and returns courses_found count.

**BFF proxy ready:** `frontend/app/api/v1/users/me/tokens/[platform]/route.ts` already proxies PUT requests to the backend.

**Fix needed:** Import `useConfigureToken` in `TokenStep`, call it sequentially for canvas and ed, handle backend validation errors (TokenInvalidError), only proceed on success.

### 2. SuccessStep -> Real Sync Results (CRITICAL)

**Current state:** `SuccessStep.tsx` line 11: `MOCK_COURSES = ["COMP2017", "COMP3221", ...]`. The sync trigger fires but results are ignored. After a 3-second timer, mock courses are displayed.

**Fix needed:** Remove MOCK_COURSES. After sync trigger, poll `useSyncStatus()` with a refetchInterval (e.g., 3 seconds). When `is_syncing` becomes false, fetch courses with `useCourses()` and display real course codes. Handle error states (sync failure).

### 3. SSE Client-Side Direct Calls (IMPORTANT)

**Affected files:**
- `hooks/use-ai-stream.ts` line 64: `const apiBase = process.env.NEXT_PUBLIC_API_URL || "";`
- `components/course-detail/UnitReviewSection.tsx` line 56: same pattern

**Issue:** In production, `NEXT_PUBLIC_API_URL` is set to the Railway URL in Vercel env vars (it's a build-time `NEXT_PUBLIC_*` variable). This means these client components call Railway directly from the browser. However, the BFF proxy routes for `qa/stream` and `review/stream` already exist and handle SSE passthrough.

**Fix needed:** Change both files to always use relative URL (`/api/v1/courses/${courseId}/qa/stream`). This routes through the BFF proxy consistently.

### 4. AI API Key Guard (IMPORTANT)

**Current state:** `_build_qa_service()` in `ai.py` creates `AIEngine(api_key=settings.anthropic_api_key)` without checking if the key is empty. An empty key will cause Anthropic SDK errors.

**Fix needed:** Add an early check in AI route handlers. Return HTTP 503 with a user-friendly message when ANTHROPIC_API_KEY is not configured.

### 5. Railway Environment Variable Configuration (MANUAL)

**ANTHROPIC_API_KEY** must be added to Railway dashboard. The key:
- Comes from Anthropic Console
- Format: `sk-ant-api03-...`
- Read by `src/config.py` Settings class via pydantic-settings env_file
- Used by: AIEngine, QAService, DigestService, RiskAlertService, sync tasks

**VOYAGE_API_KEY** (optional for Phase 31):
- Used for RAG embeddings in QAService
- Without it, Q&A uses direct context approach (still works, just less intelligent for large material sets)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `frontend/components/setup/TokenStep.tsx` (regex-only validation, no backend call)
- Codebase analysis: `frontend/components/setup/SuccessStep.tsx` (MOCK_COURSES hardcoded)
- Codebase analysis: `frontend/hooks/use-ai-stream.ts` (direct backend SSE call)
- Codebase analysis: `src/web/routes/ai.py` (AI route handlers, SSE streaming)
- Codebase analysis: `src/web/routes/users.py` (token validation/encryption endpoint)
- Codebase analysis: `src/config.py` (anthropic_api_key from env)
- Codebase analysis: `frontend/lib/api/proxy.ts` (BFF proxy with stream support)
- Phase 30 verification: All 25 routes converted to BFF proxy

### Secondary (MEDIUM confidence)
- `docs/deployment.md` -- Railway env var documentation including ANTHROPIC_API_KEY
- Memory: `project_deployment_status.md` -- Production URLs and known gaps

## Metadata

**Confidence breakdown:**
- Setup flow gaps: HIGH -- directly observed in source code (TokenStep, SuccessStep)
- AI configuration: HIGH -- config.py and deployment docs clearly document the pattern
- SSE dual-path issue: HIGH -- directly observed in use-ai-stream.ts and UnitReviewSection.tsx
- E2E flow completeness: HIGH -- traced full data flow from registration through sync to display

**Research date:** 2026-04-06
**Valid until:** 2026-04-20 (stable codebase, no external dependency changes expected)
