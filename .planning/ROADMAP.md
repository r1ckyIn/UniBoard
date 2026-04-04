# Roadmap: UniBoard v2.0

## Overview

UniBoard v2.0 is a full rebuild across 4 milestones: M1 converts 10 HTML prototypes into a Next.js app with mock APIs and contract-first design; M2 builds the FastAPI backend implementing those contracts; M3 layers on Claude-powered AI features (MCP Agent, skill system, AI digest); M4 hardens for production with critical fixes, code quality refactoring, security hardening, observability, and deployment. Fine granularity applied — M1 gives each page its own phase, M2/M3/M4 follow natural delivery boundaries.

## Milestones

- ✅ **M1: Frontend App** — Phases 1-12, 11.1 (shipped 2026-03-25) [archive](milestones/v2.0-m2-ROADMAP.md)
- ✅ **M2: Backend Core** — Phases 13-17 (shipped 2026-03-27) [archive](milestones/v2.0-m2-ROADMAP.md)
- ✅ **M3: AI/MCP/Skills** — Phases 18-21 (shipped 2026-03-29)
- 🚧 **M4: Hardening & Polish** — Phases 22-28 (active)

## Phases

<details>
<summary>✅ M1: Frontend App (Phases 1-12, 11.1) — SHIPPED 2026-03-25</summary>

- [x] Phase 1: Design System & Foundation (2/2 plans) — completed 2026-03-20
- [x] Phase 2: API Contracts & Mock Layer (5/5 plans) — completed 2026-03-20
- [x] Phase 3: Auth Page (4/4 plans) — completed 2026-03-21
- [x] Phase 4: Setup Page (5/5 plans) — completed 2026-03-21
- [x] Phase 5: Dashboard Page (11/11 plans) — completed 2026-03-22
- [x] Phase 6: Courses Page (2/2 plans) — completed 2026-03-23
- [x] Phase 7: Course Detail Page (4/4 plans) — completed 2026-03-23
- [x] Phase 8: Deadlines Page (3/3 plans) — completed 2026-03-23
- [x] Phase 9: Predict Page (3/3 plans) — completed 2026-03-24
- [x] Phase 10: Digest Page (3/3 plans) — completed 2026-03-24
- [x] Phase 11: Timetable Page (3/3 plans) — completed 2026-03-25
- [x] Phase 11.1: Real Data & UAT Gap Closure (3/3 plans) — completed 2026-03-25
- [x] Phase 12: Settings Page (4/4 plans) — completed 2026-03-25

</details>

<details>
<summary>✅ M2: Backend Core (Phases 13-17) — SHIPPED 2026-03-27</summary>

- [x] Phase 13: Supabase Foundation (3/3 plans) — completed 2026-03-26
- [x] Phase 14: Platform Adapters (3/3 plans) — completed 2026-03-26
- [x] Phase 15: Core Services & API Routes (3/3 plans) — completed 2026-03-27
- [x] Phase 16: Sync Engine (2/2 plans) — completed 2026-03-27
- [x] Phase 17: Notifications & Digest (2/2 plans) — completed 2026-03-27

</details>

<details>
<summary>✅ M3: AI/MCP/Skills (Phases 18-21) — SHIPPED 2026-03-29</summary>

- [x] Phase 18: AI Enhancement (3/3 plans) — completed 2026-03-28
- [x] Phase 19: MCP Agent & Streaming (5/5 plans) — completed 2026-03-28
- [x] Phase 20: Skill System (3/3 plans) — completed 2026-03-29
- [x] Phase 21: MCP Server & ROI Analysis (3/3 plans) — completed 2026-03-29

</details>

### 🚧 M4: Hardening (Active)

- [x] **Phase 22: Critical Fixes & Config Hardening** — Fix async blocker, unsafe config defaults, production Dockerfile, CORS configurability (completed 2026-04-01)
- [x] **Phase 23: Code Quality Refactor** — Split god module, DRY consolidation, dead code removal, resource leak fixes (completed 2026-04-01)
- [x] **Phase 24: Build Health Green** — All 5 build tools pass with zero errors after refactoring (completed 2026-04-01)
- [x] **Phase 25: Security & Observability** — Security headers, HTTP access logging, error boundaries, API rate limiting (completed 2026-04-03)
- [ ] **Phase 26: CI/CD & Production Deployment** — GitHub Actions pipeline, Railway+Vercel deployment, Sentry error tracking
- [ ] **Phase 27: Frontend UX Fixes & Course Materials Preview** — Dashboard/timetable interaction fixes, course materials inline viewer
- [ ] **Phase 28: Deadlines Page Enhancement** — Card redesign, delete/pin actions, all/week modes, overdue highlighting, user preference persistence

## Phase Details

### Phase 18: AI Enhancement
**Goal**: AI-powered thread evaluation and digest scoring with quality gate
**Depends on**: Phase 17 (M2 complete)
**Requirements**: INTEL-02, INTEL-04
**Success Criteria** (what must be TRUE):
  1. AI extracts high-value info from Ed Discussion (exam scope, assignment clarifications, rubric details)
  2. AI-enhanced digest scores entries by urgency and GPA relevance
  3. Quality gate monitors F1 score and auto-falls back to rule engine when F1 < 75%
**Plans**: 3/3 complete

### Phase 19: MCP Agent & Streaming
**Goal**: Claude Agent can research across platforms and stream answers to users; users can set language preference
**Depends on**: Phase 18
**Requirements**: DL-04, FILE-03, FILE-04, SET-LANG
**Success Criteria** (what must be TRUE):
  1. Deadline AI chat answers assignment questions with cross-platform context and cited sources
  2. Course material Q&A returns AI answers with source citations from synced materials
  3. AI unit review generates structured summaries (key concepts, common mistakes, exam scope)
  4. All AI responses stream via SSE with visible progress indicators
  5. Settings page allows user to select language (en/zh), preference persisted in Profile and used by digest/AI responses
**Plans**: 5/5 complete

### Phase 20: Skill System
**Goal**: MCP Agent auto-generates and reuses prompt templates for efficient repeated operations
**Depends on**: Phase 19
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04
**Success Criteria** (what must be TRUE):
  1. After first successful API exploration, system auto-generates a prompt template skill
  2. Subsequent executions of the same operation load the generated skill instead of re-exploring
  3. Skills are per-course differentiated (different material organization patterns detected)
  4. ~50 skills exist across data collection, data processing, AI analysis, and user action categories
**Plans**: 3/3 complete

### Phase 21: MCP Server & ROI Analysis
**Goal**: Technical users can access UniBoard via Claude Desktop, and AI provides assignment ROI analysis
**Depends on**: Phase 20
**Requirements**: PLAT-03, TUTOR-03
**Success Criteria** (what must be TRUE):
  1. MCP server exposes UniBoard data as tools accessible from Claude Desktop
  2. Assignment ROI analysis identifies high-weight/low-difficulty assignments for effort optimization
  3. MCP server handles authentication and returns data in Claude-friendly format
**Plans**: 3/3 complete

### Phase 22: Critical Fixes & Config Hardening
**Goal**: Application has no blocking bugs and fails safely on misconfiguration
**Depends on**: Phase 21 (M3 complete)
**Requirements**: CRIT-01, CRIT-03, CRIT-04, SEC-01
**Success Criteria** (what must be TRUE):
  1. VoyageAI embedding calls run in a thread pool and do not block the async event loop (verified by concurrent request test)
  2. Application refuses to start when JWT secret, encryption key, or database URL is missing or uses a known default value
  3. Docker image uses multi-stage build, tini init, non-root user, excludes dev dependencies, and does not use --reload
  4. CORS origins are read from an environment variable, defaulting to localhost:3001 for development
**Plans**: 3 plans
Plans:
- [x] 22-01-PLAN.md — VoyageAI AsyncClient migration (CRIT-01)
- [x] 22-02-PLAN.md — Config validation & CORS env var (CRIT-03, SEC-01)
- [x] 22-03-PLAN.md — Production Dockerfile (CRIT-04)

### Phase 23: Code Quality Refactor
**Goal**: Codebase is modular, DRY, and free of dead code and resource leaks
**Depends on**: Phase 22
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. sync/tasks.py is split into domain-specific modules (grade, deadline, module, outline, discussion) with no single file exceeding 300 lines
  2. Grade calculation logic, adapter _request() patterns, and UserResponse construction each have a single source of truth (auth.py language_preference bug fixed)
  3. At least 300 lines of verified dead code removed (unused schemas, hooks, dependencies uninstalled)
  4. EdLessonsAdapter properly closes its HTTP session, DB engines are disposed on shutdown, and health endpoint returns 503 when a dependency is degraded
**Plans**: 3 plans
Plans:
- [x] 23-01-PLAN.md — Split sync/tasks.py into domain modules (QUAL-01)
- [x] 23-02-PLAN.md — DRY consolidation & dead code removal (QUAL-02, QUAL-03)
- [x] 23-03-PLAN.md — Resource leak fixes & health 503 (QUAL-04)

### Phase 24: Build Health Green
**Goal**: All build and quality tools pass with zero errors, confirming refactored code is sound
**Depends on**: Phase 23
**Requirements**: CRIT-02
**Success Criteria** (what must be TRUE):
  1. `mypy --strict` reports zero errors across all Python source files
  2. `ruff check` reports zero violations
  3. `tsc --noEmit` reports zero TypeScript errors in the frontend
  4. `ESLint --max-warnings 0` reports zero warnings in the frontend
  5. `pytest` runs all tests to completion with zero failures
**Plans**: 3 plans
Plans:
- [ ] 24-01-PLAN.md — Python lint & type fixes (ruff + mypy)
- [x] 24-02-PLAN.md — Python test fixes (pytest)
- [ ] 24-03-PLAN.md — Frontend fixes (tsc + ESLint)

### Phase 25: Security & Observability
**Goal**: Application has defense-in-depth security headers, structured request logging, error containment, and abuse protection
**Depends on**: Phase 24
**Requirements**: SEC-02, SEC-03, SEC-04, OPS-04
**Success Criteria** (what must be TRUE):
  1. Both Next.js and FastAPI responses include HSTS, X-Frame-Options, X-Content-Type-Options, and CSP headers (verifiable via curl)
  2. Every HTTP request to FastAPI is logged with method, path, status_code, duration_ms, and a request_id propagated through structlog contextvars
  3. Frontend has error.tsx and global-error.tsx boundaries that catch rendering errors and display a fallback UI with console logging
  4. AI endpoints are rate-limited to 10 req/user/min and general endpoints to 60 req/user/min, returning 429 when exceeded
**Plans**: 2/3 complete
**UI hint**: yes

### Phase 26: CI/CD & Production Deployment
**Goal**: Application is deployed to production with automated CI and error tracking
**Depends on**: Phase 25
**Requirements**: OPS-01, OPS-02, OPS-03
**Success Criteria** (what must be TRUE):
  1. GitHub Actions runs separate backend (mypy+ruff+pytest) and frontend (tsc+eslint+build) workflows on every push and PR
  2. Backend is deployed to Railway and frontend to Vercel, both accessible via production URLs with correct environment variables
  3. Sentry captures and reports errors from both Python backend and Next.js frontend with performance monitoring enabled
**Plans**: 3 plans
Plans:
- [x] 26-01-PLAN.md — GitHub Actions CI pipelines + Dependabot (OPS-01)
- [ ] 26-02-PLAN.md — Railway + Vercel deployment config & env var docs (OPS-02)
- [ ] 26-03-PLAN.md — Sentry integration for Python + Next.js (OPS-03)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → ... → 28
Decimal phases (if inserted) execute between their surrounding integers.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Design System & Foundation | M1 | 2/2 | Complete | 2026-03-20 |
| 2. API Contracts & Mock Layer | M1 | 5/5 | Complete | 2026-03-20 |
| 3. Auth Page | M1 | 4/4 | Complete | 2026-03-21 |
| 4. Setup Page | M1 | 5/5 | Complete | 2026-03-21 |
| 5. Dashboard Page | M1 | 11/11 | Complete | 2026-03-22 |
| 6. Courses Page | M1 | 2/2 | Complete | 2026-03-23 |
| 7. Course Detail Page | M1 | 4/4 | Complete | 2026-03-23 |
| 8. Deadlines Page | M1 | 3/3 | Complete | 2026-03-23 |
| 9. Predict Page | M1 | 3/3 | Complete | 2026-03-24 |
| 10. Digest Page | M1 | 3/3 | Complete | 2026-03-24 |
| 11. Timetable Page | M1 | 3/3 | Complete | 2026-03-25 |
| 11.1. Real Data & UAT | M1 | 3/3 | Complete | 2026-03-25 |
| 12. Settings Page | M1 | 4/4 | Complete | 2026-03-25 |
| 13. Supabase Foundation | M2 | 3/3 | Complete | 2026-03-26 |
| 14. Platform Adapters | M2 | 3/3 | Complete | 2026-03-26 |
| 15. Core Services & API Routes | M2 | 3/3 | Complete | 2026-03-27 |
| 16. Sync Engine | M2 | 2/2 | Complete | 2026-03-27 |
| 17. Notifications & Digest | M2 | 2/2 | Complete | 2026-03-27 |
| 18. AI Enhancement | M3 | 3/3 | Complete | 2026-03-28 |
| 19. MCP Agent & Streaming | M3 | 5/5 | Complete | 2026-03-28 |
| 20. Skill System | M3 | 3/3 | Complete | 2026-03-29 |
| 21. MCP Server & ROI Analysis | M3 | 3/3 | Complete | 2026-03-29 |
| 22. Critical Fixes & Config Hardening | M4 | 3/3 | Complete | 2026-04-01 |
| 23. Code Quality Refactor | M4 | 3/3 | Complete    | 2026-04-01 |
| 24. Build Health Green | M4 | 1/3 | Complete    | 2026-04-01 |
| 25. Security & Observability | M4 | 0/TBD | Complete    | 2026-04-03 |
| 26. CI/CD & Production Deployment | M4 | 1/3 | In Progress|  |
| 27. Frontend UX Fixes & Materials Preview | M4 | 0/TBD | Not started | - |
| 28. Deadlines Page Enhancement | M4 | 0/TBD | Not started | - |

### Phase 27: Frontend UX Fixes & Course Materials Preview
**Goal**: Dashboard and timetable interactions work correctly; course materials have inline preview capability
**Depends on**: Phase 24
**Requirements**: UX-01, UX-02, UX-03, UX-04, FEAT-01
**Success Criteria** (what must be TRUE):
  1. Dashboard reminder cards are functional (clicking navigates to relevant page or triggers action)
  2. Dashboard course card predict button navigates to Predict page with corresponding course pre-selected/expanded
  3. Timetable lecture/tutorial blocks visually match Allocate+ layout style (color-coded, time/location visible)
  4. Timetable page shows scroll indicator when deadline items overflow the visible area
  5. Course detail page has inline material viewer (mini-window) for previewing documents without leaving the page
**Plans**: TBD

### Phase 28: Deadlines Page Enhancement
**Goal**: Deadlines page supports delete/pin actions, all/week filtering modes, overdue highlighting, and persisted user preferences
**Depends on**: Phase 27
**Requirements**: DL-UX-01, DL-UX-02, DL-UX-03, DL-UX-04, DL-UX-05
**Success Criteria** (what must be TRUE):
  1. Each deadline card shows due time on far right with enlarged font; three-dot menu offers delete and pin actions
  2. Pinned deadlines are highlighted and appear with priority in notification panel
  3. "All" mode shows only incomplete + overdue-but-submittable deadlines; "This Week" mode shows all statuses
  4. Overdue deadlines (past due but submittable) display with red border highlight
  5. User actions (delete/pin) persist across page refreshes and sync cycles (stored in database, not reset by sync)
**Plans**: TBD

Plans:
- [ ] TBD (run /gsd:plan-phase 28 to break down)
