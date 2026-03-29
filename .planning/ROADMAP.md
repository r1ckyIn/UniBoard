# Roadmap: UniBoard v2.0

## Overview

UniBoard v2.0 is a full rebuild across 4 milestones: M1 converts 10 HTML prototypes into a Next.js app with mock APIs and contract-first design; M2 builds the FastAPI backend implementing those contracts; M3 layers on Claude-powered AI features (MCP Agent, skill system, AI digest); M4 hardens for production with testing, deployment, and monitoring. Fine granularity applied — M1 gives each page its own phase, M2/M3/M4 follow natural delivery boundaries.

## Milestones

- ✅ **M1: Frontend App** — Phases 1-12, 11.1 (shipped 2026-03-25) [archive](milestones/v2.0-m2-ROADMAP.md)
- ✅ **M2: Backend Core** — Phases 13-17 (shipped 2026-03-27) [archive](milestones/v2.0-m2-ROADMAP.md)
- 🚧 **M3: AI/MCP/Skills** — Phases 18-21 (next)
- 📋 **M4: Engineering** — Phases 22-24 (planned)

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

### 🚧 M3: AI/MCP/Skills (Next)

- [x] **Phase 18: AI Enhancement** — AI thread evaluation, AI digest scoring, quality gate with F1 monitoring (completed 2026-03-28)
- [x] **Phase 19: MCP Agent & Streaming** (4/5 plans) — MCP tool integration, SSE streaming, Deadline AI chat, Course Q&A, language preference setting (completed 2026-03-28)
- [x] **Phase 20: Skill System** — Auto-generated prompt templates, per-course differentiation, ~50 skills (completed 2026-03-29)
- [x] **Phase 21: MCP Server & ROI Analysis** (3 plans) — PLAT-03 MCP server for Claude Desktop, Assignment ROI analysis (completed 2026-03-29)

### 📋 M4: Engineering (Planned)

- [ ] **Phase 22: Testing Suite** — Unit tests 80%+ coverage, integration tests, E2E smoke tests
- [ ] **Phase 23: Deployment** — Supabase+Railway+Vercel infrastructure, Docker production images, CI/CD pipeline
- [ ] **Phase 24: Operations** — Monitoring, alerting, security hardening, performance optimization

## Phase Details

### Phase 18: AI Enhancement
**Goal**: AI-powered thread evaluation and digest scoring with quality gate
**Depends on**: Phase 17 (M2 complete)
**Requirements**: INTEL-02, INTEL-04
**Success Criteria** (what must be TRUE):
  1. AI extracts high-value info from Ed Discussion (exam scope, assignment clarifications, rubric details)
  2. AI-enhanced digest scores entries by urgency and GPA relevance
  3. Quality gate monitors F1 score and auto-falls back to rule engine when F1 < 75%
**Plans**: 3 total (2 complete, 1 remaining)

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
**Plans**: 5 total (4 complete, 1 gap closure)
Plans:
- [x] 19-01-PLAN.md — Backend streaming & agent loop
- [x] 19-02-PLAN.md — Language preference & translation
- [x] 19-03-PLAN.md — Frontend streaming UI components
- [x] 19-04-PLAN.md — Settings language section & sync integration
- [x] 19-05-PLAN.md — Rough.js borders & auto-scroll gap closure

### Phase 20: Skill System
**Goal**: MCP Agent auto-generates and reuses prompt templates for efficient repeated operations
**Depends on**: Phase 19
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04
**Success Criteria** (what must be TRUE):
  1. After first successful API exploration, system auto-generates a prompt template skill
  2. Subsequent executions of the same operation load the generated skill instead of re-exploring
  3. Skills are per-course differentiated (different material organization patterns detected)
  4. ~50 skills exist across data collection, data processing, AI analysis, and user action categories
**Plans**: 3 plans
Plans:
- [x] 20-01-PLAN.md — ORM models, schemas, Alembic migration
- [x] 20-02-PLAN.md — ToolExecutor + SkillService
- [x] 20-03-PLAN.md — QAService integration + wiring

### Phase 21: MCP Server & ROI Analysis
**Goal**: Technical users can access UniBoard via Claude Desktop, and AI provides assignment ROI analysis
**Depends on**: Phase 20
**Requirements**: PLAT-03, TUTOR-03
**Success Criteria** (what must be TRUE):
  1. MCP server exposes UniBoard data as tools accessible from Claude Desktop
  2. Assignment ROI analysis identifies high-weight/low-difficulty assignments for effort optimization
  3. MCP server handles authentication and returns data in Claude-friendly format
**Plans**: 3 total
Plans:
- [x] 21-01-PLAN.md — Standalone MCP server package (Canvas + Ed + Unit Outline, 17 tools)
- [x] 21-02-PLAN.md — ROI backend service + REST endpoint
- [x] 21-03-PLAN.md — ROI frontend (Predict page integration)

### Phase 22: Testing Suite
**Goal**: Comprehensive test coverage across backend and frontend
**Depends on**: Phase 21 (M3 complete)
**Requirements**: ENG-01, ENG-02, ENG-03
**Plans**: TBD

### Phase 23: Deployment
**Goal**: Production infrastructure deployed with automated CI/CD
**Depends on**: Phase 22
**Requirements**: ENG-04, ENG-05, ENG-06
**Plans**: TBD

### Phase 24: Operations
**Goal**: Production system is monitored, secure, and performant
**Depends on**: Phase 23
**Requirements**: ENG-07, ENG-08
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → ... → 24
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
| 18. AI Enhancement | M3 | 3/3 | Complete    | 2026-03-28 |
| 19. MCP Agent & Streaming | M3 | 5/5 | Complete   | 2026-03-28 |
| 20. Skill System | M3 | 3/3 | Complete    | 2026-03-29 |
| 21. MCP Server & ROI Analysis | M3 | 3/3 | Complete   | 2026-03-29 |
| 22. Testing Suite | M4 | 0/TBD | Not started | - |
| 23. Deployment | M4 | 0/TBD | Not started | - |
| 24. Operations | M4 | 0/TBD | Not started | - |
