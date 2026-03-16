# Roadmap: UniBoard

## Overview

UniBoard delivers a GPA maximization dashboard in 4 coarse phases across 2 weeks. Phase 1 builds the data foundation (database, auth, all platform adapters). Phase 2 composes adapters into user-facing services (GPA calculation, deadline aggregation, course materials) and exposes them via REST API. Phase 3 implements the full Next.js frontend with 7 pages following the Anthropic-inspired design system (prototype exists). Phase 4 adds intelligence features (AI extraction, digests, risk alerts), the MCP skill system, and the MCP server entry point.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Data Acquisition** - Database schema, auth, all 4 platform adapters, Docker environment (completed 2026-03-16)
- [ ] **Phase 2: Core Services & API** - GPA engine, deadline aggregation, course materials, sync engine, REST API
- [ ] **Phase 3: Frontend Dashboard** - All 7 UI pages with Anthropic-inspired design, onboarding flow
- [ ] **Phase 4: Intelligence, Skills & MCP** - AI extraction, digests, notifications, skill system, MCP server

## Phase Details

### Phase 1: Foundation & Data Acquisition
**Goal**: All external data sources are accessible and data flows into a local PostgreSQL database with proper schema, authentication, and encryption
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09
**Success Criteria** (what must be TRUE):
  1. Developer can run `docker compose up` and have PostgreSQL + backend running locally with all tables created via Alembic migration
  2. A user can register with email/password and receive a JWT token; the token authenticates subsequent API requests
  3. Canvas adapter can fetch courses, grades, assignments, and modules for a real Canvas token (with rate limiting and pagination)
  4. Ed Discussion and Ed Lessons adapters can fetch threads, posts, and lesson content for a real Ed token (with defensive Pydantic parsing)
  5. Unit Outline parser can extract assessment weights from a USYD Unit Outline HTML page with weight-sum validation
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Database schema, ORM models, Alembic migrations, Docker Compose, token encryption
- [x] 01-02-PLAN.md — JWT auth (PyJWT + bcrypt) and user registration endpoint
- [x] 01-03-PLAN.md — Platform adapters (Canvas, Ed Discussion, Ed Lessons, Unit Outline), resilience utilities, course linking, integration tests

### Phase 2: Core Services & API
**Goal**: Users can retrieve real-time GPA data, unified deadlines, and course materials through REST API endpoints
**Depends on**: Phase 1
**Requirements**: GPA-01, GPA-02, GPA-03, GPA-04, GPA-05, DL-01, INTEL-01, INTEL-05, FILE-01, FILE-02, INFRA-02, PLAT-04
**Success Criteria** (what must be TRUE):
  1. API returns current GPA/WAM calculated from synced Canvas grades, with per-course breakdown showing grade band (HD/D/CR/P/F) and percentage assessed
  2. API returns What-if simulation results when given hypothetical scores, and returns minimum required scores for a target GPA
  3. API returns a deduplicated unified deadline list from Canvas + Ed Lessons + Ed Discussion, with no duplicates (SHA-256 dedup verified)
  4. API returns course materials with AI-generated folder descriptions, and keyword search returns matching files with content snippets
  5. Background sync engine runs on configured intervals (grades 15min, deadlines 1h, modules daily) and token expiration warnings are surfaced
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — GPA/WAM service (Decimal calculation, What-if simulator, target path planner) + Pydantic schemas + 6 REST endpoints + Hypothesis property tests
- [ ] 02-02-PLAN.md — Deadline aggregation (SHA-256 dedup + rapidfuzz), course materials (AI descriptions + tsvector search), Ed intelligence (rule-based), APScheduler sync engine + REST endpoints

### Phase 3: Frontend Dashboard
**Goal**: Students can access the complete UniBoard experience through a browser with all 7 pages following the Anthropic-inspired design system
**Depends on**: Phase 2
**Requirements**: PLAT-01, PLAT-02, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07
**Success Criteria** (what must be TRUE):
  1. User can complete 3-step onboarding (register, get token instructions, paste tokens) and land on a working dashboard
  2. Dashboard page shows hero welcome, WAM stats, course grades table, deadline timeline, and assessment weight donut chart matching the prototype aesthetic
  3. User can navigate to Courses, Deadlines, Predict, Digest, and Settings pages — each is functional and displays real data from the API
  4. Predict page allows slider-based What-if GPA simulation with real-time calculation updates
  5. All pages use paper texture, Rough.js hand-drawn borders, Source Serif 4 + Inter fonts, and warm color palette consistent with the design system
**Plans**: TBD

Plans:
- [ ] 03-01: Next.js scaffolding, design system (Tailwind v4, Rough.js, fonts, textures), shared layout (sidebar, right panel), onboarding flow
- [ ] 03-02: Dashboard, Courses, Deadlines pages with data integration
- [ ] 03-03: Predict, Digest, Settings pages with data integration

### Phase 4: Intelligence, Skills & MCP
**Goal**: UniBoard delivers proactive intelligence (AI-enhanced digests, risk alerts, notifications), AI-powered course material Q&A, and operates as an MCP server with a self-improving skill system
**Depends on**: Phase 2 (services), Phase 3 (frontend pages to display intelligence)
**Requirements**: DL-02, DL-03, INTEL-02, INTEL-03, INTEL-04, FILE-03, FILE-04, PLAT-03, SKILL-01, SKILL-02, SKILL-03, SKILL-04
**Success Criteria** (what must be TRUE):
  1. User receives deadline reminders at 72h/24h/3h tiers, and sees a risk alert when their grade trajectory deviates from their target GPA
  2. User receives daily digest aggregating new deadlines, grades, and Ed posts — with AI-enhanced urgency scoring and GPA relevance ranking
  3. User can ask AI questions about synced course materials and receive cited answers; user can view AI-generated unit review summaries
  4. MCP server exposes UniBoard data to Claude Desktop; after first successful API exploration, system auto-generates a reusable skill template per operation
  5. Skills are per-course differentiated and subsequent executions load generated skills instead of re-exploring
**Plans**: TBD

Plans:
- [ ] 04-01: Notifications (deadline reminders, GPA risk alerts), daily/weekly digest (rule-based + AI-enhanced)
- [ ] 04-02: AI course material Q&A (cited answers), AI unit review summaries, AI high-value Ed post extraction
- [ ] 04-03: MCP server entry point, skill auto-generation engine, per-course skill differentiation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Data Acquisition | 3/3 | Complete   | 2026-03-16 |
| 2. Core Services & API | 0/2 | Not started | - |
| 3. Frontend Dashboard | 0/3 | Not started | - |
| 4. Intelligence, Skills & MCP | 0/3 | Not started | - |
