# Architecture Patterns

**Domain:** GPA Maximization Dashboard (University EdTech SaaS)
**Researched:** 2026-03-20
**Confidence:** HIGH (existing v1 codebase validated patterns, TRD v2.5 provides detailed specs)

---

## Recommended Architecture

UniBoard v2.0 uses a **dual-layer architecture** with four milestone-aligned component groups:

```
                   ┌─────────────────────────────────┐
                   │         User Interface           │
                   │  Next.js App Router + Tailwind   │
                   │  Rough.js canvas + i18n (EN/CN)  │
                   │  TanStack Query + Zustand        │
                   └───────────┬─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   API Contract Layer │
                    │ OpenAPI spec (shared)│
                    │ MSW mocks (M1)      │
                    │ FastAPI real (M2+)   │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────▼─────────────────────┐
         │              Application Layer             │
         │  FastAPI + SQLAlchemy 2.0 async            │
         │  ┌───────┐ ┌──────────┐ ┌──────────────┐  │
         │  │Service│ │  Sync    │ │ AI Engine    │  │
         │  │ Layer │ │  Engine  │ │ (Anthropic)  │  │
         │  └───┬───┘ └────┬─────┘ └──────┬───────┘  │
         │      └──────────┼──────────────┘           │
         │                 │                          │
         │  ┌──────────────▼──────────────────────┐   │
         │  │     Platform Adapter Layer           │   │
         │  │  Canvas │ Ed Discussion │ Ed Lessons │   │
         │  │  Unit Outline Parser                 │   │
         │  └──────────────┬──────────────────────┘   │
         └─────────────────┼──────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │       Data Layer        │
              │  PostgreSQL 16 (Docker) │
              │  AES-256-GCM tokens     │
              │  APScheduler sync jobs  │
              └─────────────────────────┘
```

### Four Milestone Component Map

| Milestone | Components | Dependencies |
|-----------|-----------|--------------|
| **M1: Frontend** | Next.js app, design system, MSW mock API, i18n, OpenAPI spec | None (standalone) |
| **M2: Backend** | FastAPI, adapters, services, sync engine, DB models, migrations | M1's OpenAPI spec (implements contracts) |
| **M3: AI/MCP** | MCP Agent (Opus 4.6), Skill system, streaming SSE, Claude API integration | M2 backend (data access) |
| **M4: Engineering** | Testing suite, AWS CDK, CI/CD, monitoring, security hardening | M1 + M2 + M3 stable |

---

## Component Boundaries

### Frontend Layer (M1)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **AppShell** | Three-column layout: Sidebar (68px→224px) + Header + Main + RightPanel (300px) | All page components |
| **Design System** (`components/design-system/`) | RoughCard, RoughDonut, RoughProgressBar, RoughTimeline, RoughNotationWrapper, HeroDoodles — all Rough.js canvas rendering | Page components via composition |
| **Page Components** (10 pages) | Dashboard, Courses, CourseDetail, Deadlines, Predict, Digest, Timetable, Settings, Auth (login/register), Setup (onboarding) | API layer via TanStack Query hooks |
| **API Client** (`lib/api/`) | ky-based HTTP client with JWT auth, response unwrapping, typed endpoints | Backend API (real or MSW mock) |
| **Hooks** (`lib/hooks/`) | TanStack Query wrappers: useGPA, useCourses, useDeadlines, usePredict, useDigest, useAI, useNotifications, useSync, useAuth, useUser | API client |
| **Stores** (`lib/stores/`) | Zustand: UIStore (sidebar state), PredictorStore (what-if scores), NotificationStore | Page components |
| **i18n** (`lib/i18n/` + `messages/`) | next-intl with `[locale]` dynamic routing, EN + CN JSON message files | All components via `useTranslations()` |
| **Mock API** (MSW handlers) | Request interceptors implementing OpenAPI contracts with realistic fixture data | ky client (network level interception) |

**Key boundary rule:** Rough.js components are always `"use client"` — they use `useRef`, `useEffect`, and browser canvas APIs. Keep them in `components/design-system/` and compose into page-level Server Components where needed.

### Backend Layer (M2)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **FastAPI App** (`src/web/main.py`) | Application factory, CORS, error handlers, request ID middleware | Routes, middleware |
| **Routes** (`src/web/routes/`) | HTTP endpoints: auth, users, gpa, deadlines, materials, intelligence, digest, ai, sync, notifications, alerts, health | Services via dependency injection |
| **Services** (`src/services/`) | Business logic: GPAService, DeadlineService, IntelligenceService, DigestService, MaterialsService, AIEngine, NotificationService, RiskAlertService, CourseLinkingService, QAService | Adapters, Models |
| **Adapters** (`src/adapters/`) | Platform abstraction: CanvasAdapter (LMSAdapter), EdDiscussionAdapter (DiscussionAdapter), EdLessonsAdapter (LessonAdapter) | External APIs (Canvas, Ed) |
| **Parsers** (`src/parsers/`) | Unit Outline HTML parser (BeautifulSoup4, deterministic) | USYD website HTML |
| **Models** (`src/models/`) | SQLAlchemy 2.0 ORM: User, Course, Grade, Module, ModuleItem, Lesson, Slide, DiscussionThread, UnifiedDeadline, UnitOutline, PushRecord, Notification, Digest, Embedding | Database |
| **Schemas** (`src/schemas/`) | Pydantic v2 request/response schemas mirroring frontend TypeScript types | Routes, Services |
| **Sync Engine** (`src/sync/`) | APScheduler 3.11 with configurable intervals: grades 15min, deadlines 1h, modules daily, Unit Outline per semester | Adapters, Models |
| **Security** (`src/security/`) | JWT auth, bcrypt password hashing, AES-256-GCM token encryption | Routes, Models |

**Key boundary rule:** Services never call external APIs directly — always through Adapters. This enables testing with mock adapters and future platform extensibility (Moodle, Blackboard).

### AI/MCP Layer (M3)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **AIEngine** (`src/services/ai_engine.py`) | Anthropic API wrapper: thread evaluation, digest generation, Q&A, unit review. Uses Sonnet for routine tasks, Opus for deep analysis | Anthropic API |
| **MCP Agent** (new in M3) | Opus 4.6 with MCP tools for cross-platform research. Spawns agent sessions to autonomously research across Canvas + Ed | MCP tools, Anthropic API |
| **MCP Tools** (canvas-ed-mcp) | Already configured in dev environment. Tools for Canvas/Ed data access | Canvas API, Ed API |
| **Skill System** (new in M3) | Auto-generated prompt templates (~50 skills). Per-course differentiation. Categories: data-collection, data-processing, ai-analysis, user-actions | MCP Agent, prompt storage |
| **Streaming SSE** (new in M3) | FastAPI `StreamingResponse` with SSE for real-time AI output. Frontend `EventSource` or `fetch` with `ReadableStream` | FastAPI → Frontend |

**Key boundary rule:** MCP Agent is invoked via backend API routes (not directly from frontend). The backend spawns Claude sessions with MCP tools, streams results via SSE. The frontend never holds Anthropic API keys.

---

## Data Flow

### 1. Contract-First Flow (M1 → M2 Integration)

```
[M1] Define OpenAPI spec (YAML/JSON)
  ↓
[M1] Generate TypeScript types from spec → lib/api/types.ts
  ↓
[M1] Write MSW handlers matching spec → mocks/handlers.ts
  ↓
[M1] Frontend dev against MSW mocks (full functionality)
  ↓
[M2] Implement FastAPI routes matching SAME spec
  ↓
[M2] Generate Pydantic schemas from spec (or manually match)
  ↓
[Integration] Swap MSW → real backend (NEXT_PUBLIC_API_URL change)
  ↓
[Verification] Frontend works with zero changes
```

**Implementation strategy:** Use a shared `openapi.yaml` at project root. M1 uses `openapi-typescript` to generate types. MSW handlers are written to match the spec exactly. M2 FastAPI routes are validated against the same spec via `openapi-spec-validator` or manual matching.

Existing `frontend/lib/api/endpoints.ts` already defines all endpoint paths. Existing `frontend/lib/api/types.ts` already mirrors backend Pydantic schemas. This contract surface is already well-defined.

### 2. Sync Data Flow (Background)

```
APScheduler cron/interval triggers
  ↓
sync_all_grades() / sync_all_deadlines() / sync_all_modules() / ...
  ↓
For each user with valid tokens:
  ↓
  Adapter.get_*(decrypt_token(user.canvas_token))
    ↓
  Canvas/Ed API → raw data
    ↓
  Transform → ORM model instances
    ↓
  Upsert to PostgreSQL (ON CONFLICT UPDATE)
    ↓
  Detect changes → create Notifications
```

### 3. AI Agent Flow (M3)

```
User asks question in Deadline AI Chat or Course Q&A
  ↓
Frontend POST /courses/{id}/qa (or /deadlines/{id}/chat)
  ↓
Backend creates Anthropic Messages request with MCP tools:
  - claude-opus-4-6 model
  - tools: [canvas_list_assignments, ed_list_threads, ed_get_lesson, ...]
  - system: Skill template (auto-generated or manual)
  ↓
Claude Opus autonomously calls MCP tools:
  Tool call: canvas_list_assignments(course_id=69855)
  Tool call: ed_search_threads(course_id=31567, query="assignment 2")
  → Agent gathers cross-platform context
  ↓
Claude synthesizes answer with citations
  ↓
Backend streams response via SSE:
  event: text_delta
  data: {"content": "Based on..."}
  ↓
Frontend renders streaming text in chat UI
```

### 4. Page-Level Data Flow (Example: Dashboard)

```
User navigates to /en/dashboard
  ↓
Layout: AppShell wraps with Sidebar + Header + RightPanel
  ↓
Page component mounts, TanStack Query hooks fire:
  useGPA() → GET /gpa/summary (staleTime: 5min)
  useCourses() → GET /courses
  useDeadlines({ range: '7d' }) → GET /deadlines?to=...
  useNotifications({ unread: true }) → GET /notifications/unread-count
  ↓
Parallel API calls → MSW handlers respond with fixtures (M1)
                   → FastAPI routes respond with DB data (M2+)
  ↓
Components render: HeroSection → StatsRow → CourseGradesTable → DeadlineTimeline → WeightDonut
  ↓
RoughCard wraps each card section (useEffect draws SVG borders)
```

---

## Patterns to Follow

### Pattern 1: Design System Components as Client Islands

**What:** All Rough.js canvas components are `"use client"` islands wrapped in server-rendered page layouts.

**When:** Any component that uses `rough.svg()`, `useRef`, `ResizeObserver`, or canvas APIs.

**Why:** Next.js App Router defaults to Server Components. Rough.js requires browser DOM access. The "client island" pattern keeps the server-rendering benefits for data-heavy pages while isolating client-side interactivity.

**Example (already implemented):**
```typescript
// components/design-system/RoughCard.tsx
"use client";
import rough from "roughjs";
// ... uses useRef, useEffect, ResizeObserver

// app/[locale]/(dashboard)/page.tsx — Server Component
import RoughCard from "@/components/design-system/RoughCard";
export default function Dashboard() {
  return <RoughCard>...</RoughCard>; // Client island in server page
}
```

### Pattern 2: Contract-First API with MSW

**What:** Define OpenAPI spec first, generate types, write MSW handlers, build frontend, then implement backend against same spec.

**When:** M1 frontend development before M2 backend exists.

**Why:** Frontend never changes when backend arrives. Types are shared truth. MSW intercepts at network level, so `ky` client works identically with mocks and real API.

**Implementation:**
```
openapi.yaml (source of truth)
  → npx openapi-typescript openapi.yaml -o lib/api/generated-types.ts
  → MSW handlers in mocks/handlers/ per domain
  → setupWorker(handlers) for browser dev
  → setupServer(handlers) for vitest
```

### Pattern 3: Adapter Abstraction for External APIs

**What:** All external API access goes through abstract adapter interfaces. Services depend on abstractions, not concrete implementations.

**When:** Any code that calls Canvas, Ed Discussion, or Ed Lessons APIs.

**Why:** Testability (mock adapters in tests), extensibility (add Moodle/Blackboard later), and single responsibility (adapter handles auth, pagination, rate limiting; service handles business logic).

**Already implemented:** `LMSAdapter`, `DiscussionAdapter`, `LessonAdapter` abstract base classes in `src/adapters/`.

### Pattern 4: SSE Streaming for AI Responses

**What:** Backend uses FastAPI `StreamingResponse` with SSE format. Frontend consumes via `EventSource` or fetch + ReadableStream.

**When:** Any AI-generated response that takes >2 seconds (Q&A, unit review, digest generation, MCP Agent research).

**Why:** Users see progressive output immediately instead of waiting for full response. Matches Claude API's native streaming capability.

**Implementation:**
```python
# Backend: FastAPI SSE endpoint
@router.post("/courses/{course_id}/qa", response_class=StreamingResponse)
async def course_qa(course_id: str, body: QARequest):
    async def generate():
        async with anthropic.messages.stream(...) as stream:
            async for text in stream.text_stream:
                yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")
```

```typescript
// Frontend: consume SSE
const response = await fetch(`/api/v1/courses/${id}/qa`, { method: 'POST', body });
const reader = response.body!.getReader();
// ... read chunks, parse SSE events, update state
```

### Pattern 5: Sync Engine with Idempotent Upserts

**What:** Background sync jobs use SHA-256 fingerprints for deduplication and ON CONFLICT UPDATE for idempotent upserts.

**When:** All scheduled data sync (grades, deadlines, modules, discussions).

**Why:** Network failures, duplicate runs, and overlapping schedules are common. Idempotent operations make the system resilient without complex state tracking.

**Already implemented:** `src/sync/engine.py` with APScheduler, `src/sync/tasks.py` with sync functions.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Rough.js in Server Components

**What:** Importing `roughjs` in a file without `"use client"` directive.

**Why bad:** Rough.js depends on browser DOM (`document.createElementNS`). Server-side rendering will crash with `ReferenceError: document is not defined`.

**Instead:** Always mark Rough.js components as `"use client"`. Wrap them in `dynamic(() => import(...), { ssr: false })` if needed for lazy loading.

### Anti-Pattern 2: Frontend Holding API Keys

**What:** Putting Anthropic API key, Canvas token, or Ed token in frontend environment variables or client-side code.

**Why bad:** Exposes credentials to users via browser DevTools. Violates security model.

**Instead:** All external API calls (Anthropic, Canvas, Ed) go through backend. Frontend only holds JWT for UniBoard's own API. User platform tokens are encrypted in PostgreSQL, decrypted only server-side.

### Anti-Pattern 3: Services Calling External APIs Directly

**What:** A service class making HTTP requests to Canvas/Ed without going through the adapter layer.

**Why bad:** Breaks testability (can't mock in tests), breaks extensibility (can't swap implementations), mixes concerns (rate limiting, auth, pagination mixed with business logic).

**Instead:** Service depends on adapter interface. Tests inject mock adapter. Real adapter handles all HTTP concerns.

### Anti-Pattern 4: Shared Mutable State in Sync Jobs

**What:** Using module-level variables or global state across sync job executions.

**Why bad:** APScheduler runs jobs concurrently. Shared mutable state causes race conditions and data corruption.

**Instead:** Each sync job creates its own database session, adapter instances, and local state. The scheduler instance itself is the only module-level object (read-only after initialization).

### Anti-Pattern 5: Blocking AI Calls in Request Handlers

**What:** Waiting for Claude to complete a full response before sending any data to the frontend.

**Why bad:** Claude responses can take 5-30 seconds for complex analysis. Users see a spinner with no feedback. Feels broken.

**Instead:** Stream all AI responses via SSE. Show partial output as it arrives. Use `StreamingResponse` on backend, `ReadableStream` on frontend.

---

## Scalability Considerations

| Concern | At 1-10 users (MVP) | At 100 users | At 1,000+ users |
|---------|---------------------|--------------|-----------------|
| **Database** | Docker PostgreSQL on dev machine | Single RDS t3.micro (Free Tier) | RDS t3.small + read replica |
| **Sync load** | Sequential per-user sync | APScheduler with concurrency limits, stagger user sync start times | Celery workers + Redis broker, distributed job queue |
| **API rate limits** | Canvas 70 req/10s per token — plenty for 1 user | Per-user tokens mean independent rate limits — scales linearly | Same — each user's token has its own rate limit budget |
| **AI costs** | Direct Anthropic API calls per request | Response caching (identical questions within staleTime), Sonnet for routine tasks | Prompt caching, batch API for non-urgent tasks, cost alerting |
| **Frontend** | Next.js dev server | Static export to S3 + CloudFront | Same — static assets scale infinitely on CDN |
| **Authentication** | Simple JWT + bcrypt | Same | Migrate to AWS Cognito (50K MAU free) |

**MVP priority note:** At 1-10 users, avoid over-engineering. Docker PostgreSQL, single-process FastAPI with APScheduler, direct Anthropic API calls. The adapter abstraction and OpenAPI contracts are the only "architecture tax" worth paying upfront — they pay back immediately in testability and M1→M2 integration smoothness.

---

## Suggested Build Order

### M1: Frontend App (No backend dependency)

```
Phase 1: Foundation
  ├── Next.js project setup (App Router, Tailwind, pnpm)
  ├── Design system: CSS variables, paper texture, fonts
  ├── Layout: AppShell, Sidebar, Header, RightPanel
  └── i18n: next-intl setup, [locale] routing, EN+CN messages

Phase 2: OpenAPI + Mock Layer
  ├── OpenAPI spec (all endpoints from TRD §12)
  ├── Generate TypeScript types
  ├── MSW handlers with realistic fixtures
  └── ky client + TanStack Query hooks

Phase 3: Core Pages (depends on Phase 1+2)
  ├── Dashboard (hero, stats, course table, deadline timeline, weight donut)
  ├── Courses (card grid) + Course Detail (tabs: grades, materials, discussions)
  ├── Deadlines (calendar + filterable list + AI chat placeholder)
  └── Predict (slider-based what-if + target path)

Phase 4: Secondary Pages (depends on Phase 1+2)
  ├── Digest (daily intelligence feed)
  ├── Timetable (weekly schedule)
  ├── Settings (tokens, notifications, GPA target, profile)
  └── Auth (login, register) + Setup (3-step onboarding)
```

### M2: Backend Core (Implements M1's contracts)

```
Phase 1: Infrastructure
  ├── FastAPI app factory, middleware, error handlers
  ├── PostgreSQL + Alembic migrations
  ├── SQLAlchemy models (all 15+ tables from TRD §4)
  └── Auth routes (register, login, refresh, JWT)

Phase 2: Platform Adapters
  ├── CanvasAdapter (courses, grades, modules, assignments, tabs)
  ├── EdDiscussionAdapter (threads, search)
  ├── EdLessonsAdapter (lessons, slides)
  └── Unit Outline parser (BeautifulSoup4)

Phase 3: Core Services
  ├── GPAService (WAM calculation, what-if, target path)
  ├── DeadlineService (3-source aggregation, deduplication)
  ├── MaterialsService (Canvas Modules + Ed Lessons unified)
  └── IntelligenceService (high-value filtering, rule-based)

Phase 4: Sync + Notifications
  ├── APScheduler engine (grades 15min, deadlines 1h, modules daily)
  ├── NotificationService (tiered reminders)
  ├── DigestService (daily aggregation)
  └── Sync status tracking
```

### M3: AI/MCP/Skills (Extends M2)

```
Phase 1: AI Enhancement
  ├── AI thread evaluation (Sonnet, structured output)
  ├── AI digest scoring (replace rule-based urgency)
  └── AI quality gate (F1 monitoring, fallback)

Phase 2: MCP Agent
  ├── MCP tool integration (canvas-ed-mcp tools)
  ├── Agent session management (spawn Opus with tools)
  ├── Streaming SSE endpoints
  └── Deadline AI chat + Course Q&A

Phase 3: Skill System
  ├── Skill template schema and storage
  ├── Auto-generation after first successful exploration
  ├── Per-course skill differentiation
  └── ~50 skills across categories
```

### M4: Engineering (Hardens everything)

```
Phase 1: Testing
  ├── Unit tests (pytest, 80% coverage on services)
  ├── Integration tests (real DB, adapter mocks)
  ├── Frontend tests (vitest + RTL)
  └── E2E smoke tests

Phase 2: Deployment
  ├── AWS CDK infrastructure
  ├── Docker production images
  ├── CI/CD pipeline
  └── Environment configuration

Phase 3: Operations
  ├── Monitoring + alerting
  ├── Security audit
  └── Performance optimization
```

---

## Key Architecture Decisions

### Decision 1: MSW over Next.js API Routes for Mocking

**Chose:** MSW (Mock Service Worker) for M1 contract-first development.

**Over:** Next.js API routes (`app/api/`) as mock backend.

**Why:** MSW intercepts at network level — the ky client, TanStack Query hooks, and error handling all work identically with mocks and real API. Next.js API routes would create a second backend that doesn't match FastAPI's behavior (different error formats, no middleware). When M2 launches, switching from MSW to real backend is a single environment variable change (`NEXT_PUBLIC_API_URL`).

### Decision 2: next-intl over next-translate or react-intl

**Chose:** next-intl for i18n.

**Already implemented:** `middleware.ts` with `createMiddleware(routing)`, `[locale]` dynamic routes, `lib/i18n/routing.ts`.

**Why:** Native App Router support, type-safe message keys, static rendering compatible via `setRequestLocale()`, built-in locale negotiation middleware.

### Decision 3: ky over Axios or native fetch

**Chose:** ky as HTTP client.

**Already implemented:** `lib/api/client.ts` with JWT auth hooks, retry logic, response unwrapping.

**Why:** Tiny bundle size (~3KB), built on native fetch (no polyfills needed), hooks API for auth injection, automatic JSON parsing, cleaner API than raw fetch.

### Decision 4: APScheduler over Celery for Sync

**Chose:** APScheduler (in-process) for background sync.

**Already implemented:** `src/sync/engine.py` with AsyncIOScheduler.

**Why:** At MVP scale (1-10 users), a separate Celery + Redis setup is over-engineering. APScheduler runs in the same FastAPI process, shares the event loop, and handles 10 users' sync jobs comfortably. Migrate to Celery at 100+ users if needed.

### Decision 5: Anthropic Messages API with MCP tools (not MCP Server for Agent)

**Chose:** Backend spawns Claude agent sessions using Anthropic Messages API with `tools` parameter pointing to local MCP tool implementations.

**Over:** Running a separate MCP Server that Claude Desktop connects to.

**Why:** For the web dashboard, users interact via browser — they don't have Claude Desktop. The backend acts as both the "host" and "client" in MCP terminology, creating Anthropic API calls with tool definitions that mirror the MCP tool specs. For Claude Desktop users (PLAT-03), a separate stdio MCP server is provided — but the web agent path goes through the backend API.

---

## Sources

- TRD v2.5: System architecture (§3), data models (§4), REST API spec (§12), frontend architecture (§13)
- BRD v2.6: User stories and feature requirements
- Existing codebase: `src/` (Python backend), `frontend/` (Next.js app), `prototype/` (10 HTML prototypes)
- [MSW with Next.js App Router](https://dev.to/mehakb7/mock-service-worker-msw-in-nextjs-a-guide-for-api-mocking-and-testing-e9m) — MSW integration patterns
- [next-intl App Router setup](https://next-intl.dev/docs/getting-started/app-router) — i18n configuration
- [Anthropic MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25) — MCP protocol and transport mechanisms
- [Streaming AI with SSE](https://platform.claude.com/docs/en/build-with-claude/streaming) — Anthropic streaming API patterns
- [MSW keeping mocks in sync](https://mswjs.io/docs/recipes/keeping-mocks-in-sync/) — Contract-first mock maintenance
