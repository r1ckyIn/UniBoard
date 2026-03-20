# Project Research Summary

**Project:** UniBoard v2.0 — GPA Maximization Dashboard
**Domain:** University EdTech SaaS (Canvas + Ed Discussion aggregator)
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

UniBoard v2.0 is a university-focused GPA maximization dashboard that aggregates data from Canvas LMS, Ed Discussion, and Ed Lessons into a unified "notebook on your desk" interface built with Rough.js hand-drawn aesthetics. The recommended approach follows a **four-milestone contract-first architecture**: M1 builds the complete Next.js frontend against mock APIs (Route Handlers implementing an OpenAPI spec), M2 implements the FastAPI backend to fulfill the same contracts with zero frontend changes, M3 layers on Claude-powered AI features (MCP Agent, digest scoring, skill system), and M4 handles deployment hardening. This milestone separation is the single most important architectural decision — it allows the 10 HTML prototypes (6,930 lines of hand-tuned CSS/JS) to be converted to React with full fidelity before any backend complexity is introduced.

The stack is almost entirely pre-installed: Next.js 15.5, React 19, Tailwind CSS 4, TanStack Query v5, Zustand 5, Rough.js 4.6.6, next-intl 4.8, ky 1.14 on the frontend; Python 3.12+, FastAPI, SQLAlchemy 2.0 async, asyncpg, APScheduler on the backend. The key technology decisions are already settled — the research confirms they are well-suited and no pivots are needed. The only notable decision point is M1 mock API strategy: **Next.js Route Handlers** are recommended over MSW for simplicity (zero extra dependencies, same URL structure as production), though the ARCHITECTURE research notes MSW's advantages for testing contexts.

The three highest risks are: **(1) Rough.js SSR hydration mismatches** — all Rough.js components must be client-only with `ssr: false` dynamic imports and fixed seeds for deterministic output; **(2) prototype animation fidelity loss** — the 103-iteration prototypes contain micro-interactions (staggered entrance delays, double-RAF Rough borders, slider-based WAM recalculation) that are easy to lose during React conversion; **(3) MCP Agent cost explosion** — Opus 4.6 at $5/$25 per million tokens with multi-tool queries can cost $0.25-$1.38 per question, requiring tiered model routing, pre-computed answers, and strict token budgets.

## Key Findings

### Recommended Stack

The frontend stack is fully installed and configured: Next.js 15.5 (App Router + Turbopack), React 19, TypeScript 5, Tailwind CSS 4, TanStack Query v5, Zustand 5, ky (HTTP client), lucide-react (icons), next-intl 4.8 (i18n), date-fns 4.1, Vitest + Testing Library. Six Rough.js design system components are already implemented (RoughCard, RoughDonut, RoughProgressBar, RoughTimeline, RoughNotationWrapper, HeroDoodles). No additional frontend dependencies are needed for M1.

The backend stack targets Python 3.12+ with FastAPI, SQLAlchemy 2.0 async + asyncpg, Alembic, Pydantic v2, httpx, APScheduler 3.11, and cryptography (AES-256-GCM). For M3 AI features: anthropic SDK, claude-agent-sdk (agent runtime), and mcp (MCP Python SDK with Streamable HTTP transport).

**Core technologies:**
- **Next.js 15.5 (App Router)** — SSR/RSC framework with Turbopack, already configured
- **Rough.js 4.6.6** — hand-drawn SVG/Canvas borders, core visual differentiator, client-only
- **TanStack Query v5** — server state management with SSR hydration via prefetchQuery + dehydrate
- **next-intl 4.8** — i18n with `[locale]` routing, EN + CN, already configured
- **FastAPI + SQLAlchemy 2.0 async** — async-first backend with 3-5x throughput vs sync
- **APScheduler 3.11** — in-process background sync (grades 15min, deadlines 1h, modules daily)
- **claude-agent-sdk** — MCP Agent runtime for multi-tool AI queries (M3)

### Expected Features

**Must have (table stakes):**
- Real-time GPA/WAM display with per-course grade breakdown
- Assessment weight visualization (Unit Outline HTML parsing — more accurate than Canvas-only)
- Unified deadline view with three-source aggregation (Canvas + Ed Lessons + Ed Discussion)
- Deadline reminders/notifications with tiered alerts (72h/24h/3h)
- 3-step onboarding flow with token paste guides
- Search across course materials
- User auth (JWT + register/login), settings, token management
- Responsive three-column layout, paper texture, staggered animations

**Should have (differentiators — UniBoard's moat):**
- What-if GPA simulator with per-assessment sliders and real-time WAM recalculation
- Canvas + Ed dual-platform integration (no competitor touches Ed ecosystem)
- Rough.js hand-drawn aesthetic (instant visual recognition, reduces academic stress)
- AI-powered daily digest with urgency scoring
- Ed Discussion high-value post filtering (endorsed + staff posts)
- AI-generated folder descriptions for course materials
- Target GPA path planner (reverse-calculate required scores)
- MCP Agent cross-platform research with streaming chat

**Defer (v2+):**
- Mobile-first / native mobile app
- Multi-university support
- Interactive AI tutoring (real-time Q&A mode)
- Grade history / semester comparison
- Personalized dashboard questionnaire
- OAuth / AWS Cognito (use simple JWT for MVP)

### Architecture Approach

The architecture follows a **dual-layer model**: the User Interface (Next.js) communicates with the Application Layer (FastAPI) through a shared OpenAPI contract. The Application Layer contains three sub-layers: Services (business logic), Platform Adapters (Canvas/Ed/UnitOutline abstraction), and Data (PostgreSQL + APScheduler sync). A strict boundary rule separates concerns: services never call external APIs directly (always through adapters), Rough.js components are always client-only islands, and the frontend never holds external API keys (all Canvas/Ed/Anthropic calls go through the backend).

**Major components:**
1. **Frontend App Shell** — three-column layout (Sidebar 68→224px + Header + Main + RightPanel 300px) with 10 page components
2. **Design System** — Rough.js canvas rendering (RoughCard, RoughDonut, RoughProgressBar, RoughTimeline, etc.) as client islands
3. **API Contract Layer** — OpenAPI spec shared between Route Handler mocks (M1) and FastAPI real endpoints (M2)
4. **Service Layer** — GPAService, DeadlineService, IntelligenceService, DigestService, MaterialsService, AIEngine
5. **Platform Adapters** — CanvasAdapter, EdDiscussionAdapter, EdLessonsAdapter, UnitOutlineParser with abstract base classes
6. **Sync Engine** — APScheduler with idempotent upserts (SHA-256 fingerprints, ON CONFLICT UPDATE)
7. **AI/MCP Layer** — Claude Agent SDK with MCP tools for cross-platform research, SSE streaming

### Critical Pitfalls

1. **Rough.js SSR hydration mismatch** — Rough.js uses `Math.random()` for hand-drawn paths; server/client produce different output. **Fix:** All Rough.js components must use `"use client"` + `dynamic(() => import(...), { ssr: false })` + fixed `seed` option for deterministic rendering.

2. **Contract drift between M1 mocks and M2 backend** — 67% of developers report production bugs from mismatched API contracts. **Fix:** Single-source OpenAPI spec with type generation (`openapi-typescript`), contract tests in CI (`schemathesis`), automated drift detection (`oasdiff`).

3. **MCP Agent cost explosion** — A single complex query can cost $0.25-$1.38 with Opus 4.6. **Fix:** Tiered model routing (Sonnet for routine, Opus for deep analysis), pre-computed answers from background sync, token budget per query (max 5 tool calls), prompt caching (10% input cost on cache hit).

4. **Prototype animation fidelity loss** — 6,930 lines of hand-tuned CSS/JS contain micro-interactions that are easy to lose in React conversion. **Fix:** Animation inventory document before conversion, side-by-side visual regression, page-by-page conversion (not component-by-component), preserve double-RAF pattern for Rough.js borders.

5. **Rough.js performance degradation** — Dashboard renders 50-80 Rough.js elements; re-renders cause SVG path regeneration and visible flickering. **Fix:** Memoize output with fixed seeds, `React.memo` with dimension-only comparators, canvas mode for non-interactive elements, IntersectionObserver for virtualization.

## Implications for Roadmap

Based on combined research, the project naturally divides into **4 milestones with 14-16 phases total**. The milestone boundaries are the strongest architectural seams — crossing them requires the prior milestone's contracts to be stable.

### Milestone 1: Frontend App (M1) — 4 Phases

#### Phase 1: Foundation & Design System
**Rationale:** Everything depends on the design system (Rough.js components, CSS variables, layout, i18n). This must come first because all 10 pages use the three-column layout, paper texture, and Rough.js card borders. Setting up i18n early avoids costly retrofitting.
**Delivers:** AppShell layout, design system components (RoughCard, RoughDonut, etc.), Tailwind theme, CSS variables, next/font setup, i18n scaffolding with EN+CN message files.
**Addresses:** Table stakes (responsive layout, paper texture, animations), differentiator (Rough.js aesthetic).
**Avoids:** Pitfall #1 (hydration — solved with client-only pattern from day 1), Pitfall #5 (performance — memoization built into initial design), Pitfall #8 (over-componentizing — layout-first, three-page rule).

#### Phase 2: API Contracts & Mock Layer
**Rationale:** All pages need data. Defining the OpenAPI contract before building pages ensures type-safe development and prevents contract drift later. Route Handler mocks allow full frontend functionality without backend dependency.
**Delivers:** OpenAPI spec (all endpoints from TRD §12), TypeScript type generation, Route Handler mock implementations with realistic fixtures, ky client configuration, TanStack Query hooks for all data domains.
**Addresses:** Table stakes (all data-driven features need API layer).
**Avoids:** Pitfall #2 (contract drift — single-source spec + codegen pipeline established here).

#### Phase 3: Core Pages
**Rationale:** Dashboard, Courses, Course Detail, Deadlines, and Predict are the highest-value pages — they deliver the primary GPA tracking and what-if simulation features that define the product.
**Delivers:** 5 complex pages with full animation fidelity, Rough.js integration, TanStack Query data flow.
**Addresses:** Table stakes (GPA display, grade breakdown, deadline view), differentiators (what-if simulator, assessment weights, dual-platform deadlines).
**Avoids:** Pitfall #4 (animation loss — side-by-side verification per page), Pitfall #6 (i18n in SVG — integrated from start).

#### Phase 4: Secondary Pages & Polish
**Rationale:** Digest, Timetable, Settings, Auth, and Setup are important but depend on patterns established in Phase 3. Converting them after core pages lets shared patterns emerge naturally.
**Delivers:** 5 remaining pages, auth flow with mock JWT, onboarding flow, notification system UI.
**Addresses:** Table stakes (auth, onboarding, settings), differentiators (digest UI, timetable).

### Milestone 2: Backend Core (M2) — 4 Phases

#### Phase 5: Backend Infrastructure
**Rationale:** FastAPI app factory, database models, and auth must exist before adapters or services can be built. Implements the auth contract from M1 first to enable end-to-end login flow.
**Delivers:** FastAPI app, PostgreSQL + Alembic migrations, all ORM models (15+ tables), JWT auth routes, CORS configuration.
**Addresses:** Table stakes (user auth, data persistence).

#### Phase 6: Platform Adapters
**Rationale:** Services depend on adapters. Building adapters first with comprehensive defensive parsing ensures the data layer is reliable before business logic is added.
**Delivers:** CanvasAdapter (courses, grades, modules, assignments), EdDiscussionAdapter (threads, search), EdLessonsAdapter (lessons, slides), UnitOutlineParser (BeautifulSoup4 with weight-sum validation).
**Avoids:** Pitfall #7 (Ed API instability — defensive Pydantic, circuit breakers), Pitfall #10 (HTML parser fragility — multiple strategies, weight-sum validation), Pitfall #11 (token special chars — encrypted storage).

#### Phase 7: Core Services & API Routes
**Rationale:** With adapters in place, services implement business logic and API routes fulfill the OpenAPI contract defined in M1. This is where frontend-backend integration happens.
**Delivers:** GPAService, DeadlineService, MaterialsService, IntelligenceService (rule-based), all REST API routes matching OpenAPI spec.
**Addresses:** Differentiators (3-source deadline aggregation, assessment weight display, high-value Ed filtering).
**Avoids:** Pitfall #2 (contract drift — validate responses against OpenAPI spec).

#### Phase 8: Sync Engine & Notifications
**Rationale:** Background sync is the last M2 component because it depends on all adapters and services being stable. Running it on unstable adapters wastes debugging time.
**Delivers:** APScheduler engine (grades 15min, deadlines 1h, modules daily, Unit Outline per semester), NotificationService (tiered reminders), DigestService (rule-based daily aggregation), sync status tracking.
**Avoids:** Pitfall #13 (race conditions — token pre-validation, atomic transactions, per-type timestamps).

### Milestone 3: AI/MCP (M3) — 3 Phases

#### Phase 9: AI Enhancement
**Rationale:** Start with lower-cost AI features (Sonnet for thread evaluation and digest scoring) before tackling the expensive MCP Agent. Establishes the AI quality gate (F1 monitoring, rule-based fallback).
**Delivers:** AI thread evaluation, AI digest scoring (replaces rule-based), AI quality gate with automatic fallback.
**Avoids:** Pitfall #3 (cost — Sonnet for routine tasks, not Opus).

#### Phase 10: MCP Agent & Streaming
**Rationale:** The highest-complexity AI feature. Requires stable backend (M2) and AI infrastructure (Phase 9). Streaming SSE is critical for UX — blocking AI calls ruin the experience.
**Delivers:** MCP tool integration, Claude Agent session management, SSE streaming endpoints, Deadline AI chat, Course Q&A.
**Avoids:** Pitfall #3 (cost — tiered routing, token budgets, caching), Pitfall #9 (latency — streaming, progress indicators, pre-computed answers).

#### Phase 11: Skill System
**Rationale:** Depends on MCP Agent being stable. Auto-generates reusable prompt templates from successful agent interactions.
**Delivers:** Skill template schema and storage, auto-generation pipeline, per-course skill differentiation, ~50 skills across categories.

### Milestone 4: Engineering (M4) — 3 Phases

#### Phase 12: Testing Suite
**Delivers:** Unit tests (pytest 80% coverage), integration tests, frontend tests (Vitest + RTL), E2E smoke tests.

#### Phase 13: Deployment (AWS CDK)
**Delivers:** AWS CDK infrastructure, Docker production images, CI/CD pipeline, environment configuration.

#### Phase 14: Operations
**Delivers:** Monitoring + alerting, security audit, performance optimization.

### Phase Ordering Rationale

- **M1 before M2:** Contract-first development. Frontend defines the API contract; backend implements it. This order is critical — reversing it causes the "build API, then discover frontend needs different shapes" problem.
- **Design system before pages:** Every page uses RoughCard, paper texture, and animations. Building pages without the design system means retrofitting later.
- **Core pages before secondary:** Dashboard + Predict + Deadlines deliver 80% of user value. Shipping these first enables early feedback.
- **Adapters before services:** Services depend on adapter data. Building services without reliable adapters means testing against assumptions.
- **Sync engine last in M2:** Sync orchestrates adapters and services. It should be built on stable foundations, not shifting ones.
- **AI enhancement before MCP Agent:** Establishes cost patterns, model routing, and quality gates before tackling the most expensive feature.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (API Contracts):** Need to finalize OpenAPI spec structure, decide on response envelope format, and set up type generation pipeline. Worth running `/gsd:research-phase` to evaluate `openapi-typescript` vs `openapi-ts` (hey-api) vs `orval`.
- **Phase 6 (Platform Adapters):** Ed Discussion API is undocumented and unstable. Need fresh API exploration to confirm endpoint availability and response schemas. Existing hschafer/edstem OSS library may have drifted.
- **Phase 10 (MCP Agent):** claude-agent-sdk is relatively new (v0.1.48+). Production patterns for agent session management, error handling, and cost control need investigation.

Phases with standard patterns (skip research):
- **Phase 1 (Foundation):** Well-documented Next.js App Router + Tailwind + next-intl setup. Existing Rough.js components provide patterns.
- **Phase 5 (Backend Infrastructure):** Standard FastAPI + SQLAlchemy + Alembic setup. Already partially built in v1.0.
- **Phase 7 (Core Services):** Business logic implementation with clear contracts from M1. Standard CRUD + aggregation patterns.
- **Phase 8 (Sync Engine):** APScheduler patterns already proven in v1.0. Existing `src/sync/` code provides foundation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All frontend packages already installed and configured. Backend stack well-documented with official sources. No experimental dependencies. |
| Features | HIGH | Comprehensive competitive analysis against Better Canvas (1.5M users), Atlas (800K users). Table stakes clearly identified. Differentiators validated by 103 prototype iterations. |
| Architecture | HIGH | Existing v1.0 codebase validates patterns (adapters, sync engine, services). TRD v2.5 provides detailed specs. Dual-layer architecture is industry standard for SaaS. |
| Pitfalls | HIGH | 5 critical + 4 moderate + 4 minor pitfalls identified with specific prevention strategies. Rough.js SSR and contract drift are well-documented across industry. MCP Agent costs verified against Anthropic pricing. |

**Overall confidence:** HIGH

### Gaps to Address

- **MSW vs Route Handlers decision conflict:** STACK.md recommends Route Handlers for M1 mock API (zero dependencies, simplicity), while ARCHITECTURE.md assumes MSW (network-level interception, better testing). **Resolution needed in Phase 2 planning.** Recommendation: Route Handlers for development mocking, MSW for test suites — they serve different purposes and can coexist.
- **Ed Discussion API current state:** Research references the hschafer/edstem OSS library, but Ed API endpoints may have changed since v1.0. Fresh API exploration needed before Phase 6 adapter implementation.
- **claude-agent-sdk maturity:** SDK is at v0.1.48+ — pre-1.0 software. API surface may change. Need to evaluate stability before committing to it in Phase 10. Fallback: use raw `anthropic` SDK with manual tool-use loop.
- **Unit Outline HTML variability:** Parser tested against limited course set in v1.0. Need to collect 20+ faculty-diverse HTML samples for regression testing before Phase 6.
- **ky vs Axios:** ky is already installed and works. But ky has a smaller community than Axios — verify that TanStack Query integration is smooth with ky's Promise-based API during Phase 2.

## Sources

### Primary (HIGH confidence)
- [Next.js App Router Guides](https://nextjs.org/docs/app/guides) — rendering, streaming, data fetching
- [TanStack Query SSR Guide](https://tanstack.com/query/latest/docs/framework/react/guides/ssr) — hydration patterns
- [Rough.js Documentation](https://roughjs.com/) — SVG/Canvas API
- [next-intl App Router Setup](https://next-intl.dev/docs/getting-started/app-router) — i18n configuration
- [Anthropic API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — cost modeling
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python) — agent runtime
- [Anthropic MCP SDK](https://pypi.org/project/mcp/) — MCP protocol
- [Next.js Hydration Error Docs](https://nextjs.org/docs/messages/react-hydration-error) — SSR pitfalls
- UniBoard TRD v2.5 — system architecture (§3), data models (§4), REST API (§12), frontend (§13)
- UniBoard BRD v2.6 — user stories and feature requirements

### Secondary (MEDIUM confidence)
- [FastAPI + Async SQLAlchemy 2.0](https://leapcell.io/blog/building-high-performance-async-apis-with-fastapi-sqlalchemy-2-0-and-asyncpg) — async patterns
- [Evil Martians: API Contracts](https://evilmartians.com/chronicles/api-contracts-and-everything-i-wish-i-knew-a-frontend-survival-guide) — contract drift analysis
- [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts) — OpenAPI to TypeScript codegen
- [AI Agent UX Patterns (Smashing Magazine)](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/) — streaming UX
- UniBoard v1.0 CLAUDE.md — project-specific learnings
- UniBoard prototype source code analysis — 6,930 lines across 10 files

### Tertiary (LOW confidence)
- [react-rough-fiber](https://bowencodes.com/post/react-rough-fiber) — evaluated and rejected (React 19 compatibility unverified)
- [@turahe/react-rough-notation](https://www.npmjs.com/package/@turahe/react-rough-notation) — SSR-ready claim needs verification
- [claude-agent-sdk stability](https://platform.claude.com/docs/en/agent-sdk/overview) — pre-1.0 SDK, API surface may change

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
