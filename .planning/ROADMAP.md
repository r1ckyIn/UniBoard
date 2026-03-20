# Roadmap: UniBoard v2.0

## Overview

UniBoard v2.0 is a full rebuild across 4 milestones: M1 converts 10 HTML prototypes into a Next.js app with mock APIs and contract-first design; M2 builds the FastAPI backend implementing those contracts; M3 layers on Claude-powered AI features (MCP Agent, skill system, AI digest); M4 hardens for production with testing, deployment, and monitoring. Fine granularity applied — M1 gives each page its own phase, M2/M3/M4 follow natural delivery boundaries.

## Milestones

- 📋 **M1: Frontend App** — Phases 1-12 (planned)
- 📋 **M2: Backend Core** — Phases 13-17 (planned)
- 📋 **M3: AI/MCP/Skills** — Phases 18-21 (planned)
- 📋 **M4: Engineering** — Phases 22-24 (planned)

## Phases

### M1: Frontend App

- [ ] **Phase 1: Design System & Foundation** — App shell, Rough.js components, Tailwind theme, i18n scaffolding, paper texture
- [ ] **Phase 2: API Contracts & Mock Layer** — OpenAPI spec, TypeScript codegen, Route Handler mocks, TanStack Query hooks
- [ ] **Phase 3: Auth Page** — Login and register flows with form validation
- [ ] **Phase 4: Setup Page** — 3-step API token onboarding with visual guides
- [ ] **Phase 5: Dashboard Page** — Hero welcome, stats row, course grades, deadline timeline, assessment weights
- [ ] **Phase 6: Courses Page** — Card grid with grade overview and course navigation
- [ ] **Phase 7: Course Detail Page** — Assessment breakdown, materials browser, Ed posts
- [ ] **Phase 8: Deadlines Page** — Calendar view, filterable timeline, AI chat panel placeholder
- [ ] **Phase 9: Predict Page** — Slider-based What-if GPA simulator with real-time calculation
- [ ] **Phase 10: Digest Page** — Daily/weekly intelligence digest with relevance scoring UI
- [ ] **Phase 11: Timetable Page** — Weekly schedule view
- [ ] **Phase 12: Settings Page** — Token management, notifications, GPA target, profile

### M2: Backend Core

- [ ] **Phase 13: Backend Infrastructure** — FastAPI app, PostgreSQL + Alembic, ORM models, JWT auth, Docker Compose
- [ ] **Phase 14: Platform Adapters** — Canvas, Ed Discussion, Ed Lessons adapters + Unit Outline parser
- [ ] **Phase 15: Core Services & API Routes** — GPA, Deadline, Materials, Intelligence services implementing M1 contracts
- [ ] **Phase 16: Sync Engine** — APScheduler background sync (grades 15min, deadlines 1h, modules daily)
- [ ] **Phase 17: Notifications & Digest** — Tiered deadline reminders, rule-based daily digest, token expiration warnings

### M3: AI/MCP/Skills

- [ ] **Phase 18: AI Enhancement** — AI thread evaluation, AI digest scoring, quality gate with F1 monitoring
- [ ] **Phase 19: MCP Agent & Streaming** — MCP tool integration, SSE streaming, Deadline AI chat, Course Q&A
- [ ] **Phase 20: Skill System** — Auto-generated prompt templates, per-course differentiation, ~50 skills
- [ ] **Phase 21: MCP Server & ROI Analysis** — PLAT-03 MCP server for Claude Desktop, Assignment ROI analysis

### M4: Engineering

- [ ] **Phase 22: Testing Suite** — Unit tests 80%+ coverage, integration tests, E2E smoke tests
- [ ] **Phase 23: Deployment** — AWS CDK infrastructure, Docker production images, CI/CD pipeline
- [ ] **Phase 24: Operations** — Monitoring, alerting, security hardening, performance optimization

## Phase Details

### Phase 1: Design System & Foundation
**Goal**: Establish the visual foundation and app shell that all 10 pages depend on
**Depends on**: Nothing (first phase)
**Requirements**: UI-07, INFRA-10
**Success Criteria** (what must be TRUE):
  1. Three-column layout renders correctly (icon sidebar 68px→224px on hover, main content, right panel 300px sticky)
  2. Paper texture (SVG fractalNoise grain + ruled lines) and warm color palette render matching prototypes
  3. All Rough.js design system components (RoughCard, RoughDonut, RoughProgressBar, RoughTimeline, RoughNotationWrapper, HeroDoodles) render without SSR hydration errors
  4. i18n routing works — switching between English and Chinese updates all UI text
  5. Source Serif 4 (headings) + Inter (body) fonts load correctly
**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffolding, Tailwind @theme, fonts, paper texture, i18n routing
- [ ] 01-02-PLAN.md — Design system components (RoughCard, RoughNotationWrapper, HeroDoodles) and app shell layout (Sidebar, Header, RightPanel)

### Phase 2: API Contracts & Mock Layer
**Goal**: Define the complete API contract and mock implementation so all pages can be built with realistic data
**Depends on**: Phase 1
**Requirements**: INFRA-11
**Success Criteria** (what must be TRUE):
  1. OpenAPI spec covers all endpoints from TRD §12 (auth, courses, grades, deadlines, materials, digest, settings)
  2. TypeScript types are auto-generated from the OpenAPI spec
  3. Route Handler mocks return realistic fixture data for all endpoints
  4. TanStack Query hooks exist for every data domain with proper loading/error states
  5. ky HTTP client is configured with base URL, error handling, and auth token injection
**Plans**: TBD

### Phase 3: Auth Page
**Goal**: Users can register and log in through a polished auth interface
**Depends on**: Phase 2
**Requirements**: UI-09, PLAT-02
**Success Criteria** (what must be TRUE):
  1. User can switch between login and register forms
  2. Form validation shows inline errors for invalid email, weak password, password mismatch
  3. Successful login stores mock JWT and redirects to dashboard
  4. Auth page design matches prototype aesthetic (Rough.js borders, warm colors)
**Plans**: TBD

### Phase 4: Setup Page
**Goal**: New users can complete API token onboarding in 3 guided steps
**Depends on**: Phase 3
**Requirements**: UI-10, PLAT-01
**Success Criteria** (what must be TRUE):
  1. 3-step flow is visually clear: register → get tokens → paste tokens
  2. Each step includes visual guides showing where to find Canvas/Ed tokens
  3. Token paste fields validate format before accepting
  4. Completion redirects to dashboard with success confirmation
**Plans**: TBD

### Phase 5: Dashboard Page
**Goal**: Users see their complete academic overview at a glance
**Depends on**: Phase 2
**Requirements**: UI-01
**Success Criteria** (what must be TRUE):
  1. Hero section displays personalized welcome with encouragement text above the fold
  2. Stats row shows WAM, target GPA, and active alerts with Rough.js styled cards
  3. Course grades table displays all enrolled courses with grade band indicators
  4. Deadline timeline shows upcoming deadlines in chronological order
  5. Assessment weight donut chart renders per-course weight breakdown
**Plans**: TBD

### Phase 6: Courses Page
**Goal**: Users can browse all enrolled courses with grade summaries
**Depends on**: Phase 2
**Requirements**: UI-02
**Success Criteria** (what must be TRUE):
  1. Course cards display in a responsive grid with grade overview per course
  2. Each card shows course name, WAM, grade band (HD/D/CR/P/F), and percentage assessed
  3. Clicking a course card navigates to Course Detail page
  4. Rough.js card borders and hover animations match prototype
**Plans**: TBD

### Phase 7: Course Detail Page
**Goal**: Users can drill into a single course to see assessments, materials, and Ed Discussion posts
**Depends on**: Phase 6
**Requirements**: UI-11
**Success Criteria** (what must be TRUE):
  1. Assessment breakdown shows all assessments with weights, scores, and due dates
  2. Materials browser displays course folders with file listings
  3. Ed Discussion section shows recent posts with endorsed/staff badges
  4. Navigation between course detail sections (assessments, materials, posts) works smoothly
**Plans**: TBD

### Phase 8: Deadlines Page
**Goal**: Users can view and filter all upcoming deadlines with an AI chat placeholder
**Depends on**: Phase 2
**Requirements**: UI-03
**Success Criteria** (what must be TRUE):
  1. Calendar view displays deadlines with color-coded course indicators
  2. Timeline view lists all deadlines with filterable course/type dropdowns
  3. AI chat panel placeholder renders with "coming soon" state
  4. Deadline cards show assignment name, course, due date, and countdown
**Plans**: TBD

### Phase 9: Predict Page
**Goal**: Users can simulate future GPA outcomes by adjusting hypothetical scores
**Depends on**: Phase 2
**Requirements**: UI-04
**Success Criteria** (what must be TRUE):
  1. Slider controls for each pending assessment allow score input (0-100)
  2. GPA/WAM recalculates in real-time as sliders change
  3. Target GPA line displays on the visualization for comparison
  4. Rough.js styled chart updates smoothly without flickering
**Plans**: TBD

### Phase 10: Digest Page
**Goal**: Users can review their daily academic digest with AI-scored relevance
**Depends on**: Phase 2
**Requirements**: UI-05
**Success Criteria** (what must be TRUE):
  1. Digest entries display with date grouping (today, yesterday, this week)
  2. Each entry shows source (Canvas/Ed), type (deadline/grade/announcement), and relevance score
  3. Entries are expandable to show full content
  4. Filter controls allow filtering by source, type, and date range
**Plans**: TBD

### Phase 11: Timetable Page
**Goal**: Users can view their weekly class schedule
**Depends on**: Phase 2
**Requirements**: UI-08
**Success Criteria** (what must be TRUE):
  1. Weekly grid displays class sessions in correct time slots
  2. Each session shows course name, location, and type (lecture/tutorial/lab)
  3. Current day/time is highlighted
  4. Week navigation allows browsing past and future weeks
**Plans**: TBD

### Phase 12: Settings Page
**Goal**: Users can manage their API tokens, notification preferences, and GPA targets
**Depends on**: Phase 2
**Requirements**: UI-06
**Success Criteria** (what must be TRUE):
  1. Token management section shows connection status for Canvas and Ed tokens
  2. Notification preferences allow toggling deadline reminders (72h/24h/3h)
  3. GPA target input saves and persists across sessions
  4. Profile section displays user email and allows password change
**Plans**: TBD

### Phase 13: Backend Infrastructure
**Goal**: Establish the FastAPI application foundation with database, auth, and Docker environment
**Depends on**: Phase 12 (M1 complete)
**Requirements**: INFRA-01, INFRA-07, INFRA-08, INFRA-09
**Success Criteria** (what must be TRUE):
  1. FastAPI app starts and serves health check endpoint
  2. PostgreSQL database runs in Docker with all ORM models migrated via Alembic
  3. User can register, login, and receive JWT token via API
  4. Token encryption (AES-256-GCM) stores and retrieves Canvas/Ed tokens securely
  5. Docker Compose spins up PostgreSQL + backend + frontend in one command
**Plans**: TBD

### Phase 14: Platform Adapters
**Goal**: Reliable data acquisition from all external platforms with defensive parsing
**Depends on**: Phase 13
**Requirements**: INFRA-03, INFRA-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. Canvas adapter fetches courses, grades, modules, and assignments with rate limiting and pagination
  2. Ed Discussion adapter fetches threads with defensive Pydantic parsing and graceful degradation
  3. Ed Lessons adapter extracts lesson content and assignments
  4. Unit Outline parser extracts assessment weights from USYD HTML with weight-sum validation
  5. All adapters implement circuit breaker pattern for external API failures
**Plans**: TBD

### Phase 15: Core Services & API Routes
**Goal**: Business logic layer and REST API implementing the OpenAPI contracts defined in M1
**Depends on**: Phase 14
**Requirements**: GPA-01, GPA-02, GPA-03, GPA-04, GPA-05, DL-01, INTEL-01, INTEL-05, FILE-01, FILE-02
**Success Criteria** (what must be TRUE):
  1. GPA/WAM calculation returns correct values matching Canvas grade data
  2. What-if simulation accepts hypothetical scores and returns updated GPA
  3. Target GPA path planner calculates minimum required scores per assessment
  4. Deadline aggregation merges Canvas + Ed Lessons + Ed Discussion with SHA-256 deduplication
  5. All REST API responses match the OpenAPI spec from M1 (zero frontend changes needed)
**Plans**: TBD

### Phase 16: Sync Engine
**Goal**: Automated background data synchronization keeps all data fresh
**Depends on**: Phase 15
**Requirements**: INFRA-02
**Success Criteria** (what must be TRUE):
  1. Grade sync runs every 15 minutes and updates database with new scores
  2. Deadline sync runs hourly and discovers new/changed deadlines
  3. Module sync runs daily and updates course materials
  4. Unit Outline sync runs per-semester and parses assessment weights
  5. Sync status is trackable (last run time, success/failure, records updated)
**Plans**: TBD

### Phase 17: Notifications & Digest
**Goal**: Users receive timely deadline reminders and daily academic digests
**Depends on**: Phase 16
**Requirements**: DL-02, DL-03, INTEL-03, PLAT-04
**Success Criteria** (what must be TRUE):
  1. Tiered deadline reminders trigger at 72h, 24h, and 3h before due date
  2. GPA risk alert fires when grade trajectory deviates from target threshold
  3. Daily digest aggregates new deadlines, grades, announcements, and high-value Ed posts
  4. Token expiration warnings display when Canvas/Ed tokens are near expiry with re-auth guidance
**Plans**: TBD

### Phase 18: AI Enhancement
**Goal**: AI-powered thread evaluation and digest scoring with quality gate
**Depends on**: Phase 17 (M2 complete)
**Requirements**: INTEL-02, INTEL-04
**Success Criteria** (what must be TRUE):
  1. AI extracts high-value info from Ed Discussion (exam scope, assignment clarifications, rubric details)
  2. AI-enhanced digest scores entries by urgency and GPA relevance
  3. Quality gate monitors F1 score and auto-falls back to rule engine when F1 < 75%
**Plans**: TBD

### Phase 19: MCP Agent & Streaming
**Goal**: Claude Agent can research across platforms and stream answers to users
**Depends on**: Phase 18
**Requirements**: DL-04, FILE-03, FILE-04
**Success Criteria** (what must be TRUE):
  1. Deadline AI chat answers assignment questions with cross-platform context and cited sources
  2. Course material Q&A returns AI answers with source citations from synced materials
  3. AI unit review generates structured summaries (key concepts, common mistakes, exam scope)
  4. All AI responses stream via SSE with visible progress indicators
**Plans**: TBD

### Phase 20: Skill System
**Goal**: MCP Agent auto-generates and reuses prompt templates for efficient repeated operations
**Depends on**: Phase 19
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04
**Success Criteria** (what must be TRUE):
  1. After first successful API exploration, system auto-generates a prompt template skill
  2. Subsequent executions of the same operation load the generated skill instead of re-exploring
  3. Skills are per-course differentiated (different material organization patterns detected)
  4. ~50 skills exist across data collection, data processing, AI analysis, and user action categories
**Plans**: TBD

### Phase 21: MCP Server & ROI Analysis
**Goal**: Technical users can access UniBoard via Claude Desktop, and AI provides assignment ROI analysis
**Depends on**: Phase 20
**Requirements**: PLAT-03, TUTOR-03
**Success Criteria** (what must be TRUE):
  1. MCP server exposes UniBoard data as tools accessible from Claude Desktop
  2. Assignment ROI analysis identifies high-weight/low-difficulty assignments for effort optimization
  3. MCP server handles authentication and returns data in Claude-friendly format
**Plans**: TBD

### Phase 22: Testing Suite
**Goal**: Comprehensive test coverage across backend and frontend
**Depends on**: Phase 21 (M3 complete)
**Requirements**: ENG-01, ENG-02, ENG-03
**Success Criteria** (what must be TRUE):
  1. Backend pytest suite achieves 80%+ code coverage
  2. Integration tests verify all API endpoints against real database
  3. Frontend Vitest suite covers key interaction flows
  4. E2E smoke tests validate critical user journeys (login → dashboard → predict)
**Plans**: TBD

### Phase 23: Deployment
**Goal**: Production infrastructure deployed on AWS with automated CI/CD
**Depends on**: Phase 22
**Requirements**: ENG-04, ENG-05, ENG-06
**Success Criteria** (what must be TRUE):
  1. AWS CDK deploys Lambda + API Gateway + RDS infrastructure
  2. Docker production images use multi-stage builds with minimal footprint
  3. CI/CD pipeline (GitHub Actions) runs lint, test, type-check, and deploys on merge to main
  4. Environment configuration separates dev/staging/production settings
**Plans**: TBD

### Phase 24: Operations
**Goal**: Production system is monitored, secure, and performant
**Depends on**: Phase 23
**Requirements**: ENG-07, ENG-08
**Success Criteria** (what must be TRUE):
  1. Structured logging captures all API requests, errors, and sync events
  2. Error tracking alerts on anomalies (failed syncs, adapter errors, auth failures)
  3. Security hardening passes OWASP Top 10 checklist (input validation, rate limiting, CORS, CSP)
  4. Performance metrics track API latency, Rough.js render time, and sync duration
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → ... → 24
Decimal phases (if inserted) execute between their surrounding integers.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Design System & Foundation | M1 | 0/2 | Planning | - |
| 2. API Contracts & Mock Layer | M1 | 0/TBD | Not started | - |
| 3. Auth Page | M1 | 0/TBD | Not started | - |
| 4. Setup Page | M1 | 0/TBD | Not started | - |
| 5. Dashboard Page | M1 | 0/TBD | Not started | - |
| 6. Courses Page | M1 | 0/TBD | Not started | - |
| 7. Course Detail Page | M1 | 0/TBD | Not started | - |
| 8. Deadlines Page | M1 | 0/TBD | Not started | - |
| 9. Predict Page | M1 | 0/TBD | Not started | - |
| 10. Digest Page | M1 | 0/TBD | Not started | - |
| 11. Timetable Page | M1 | 0/TBD | Not started | - |
| 12. Settings Page | M1 | 0/TBD | Not started | - |
| 13. Backend Infrastructure | M2 | 0/TBD | Not started | - |
| 14. Platform Adapters | M2 | 0/TBD | Not started | - |
| 15. Core Services & API Routes | M2 | 0/TBD | Not started | - |
| 16. Sync Engine | M2 | 0/TBD | Not started | - |
| 17. Notifications & Digest | M2 | 0/TBD | Not started | - |
| 18. AI Enhancement | M3 | 0/TBD | Not started | - |
| 19. MCP Agent & Streaming | M3 | 0/TBD | Not started | - |
| 20. Skill System | M3 | 0/TBD | Not started | - |
| 21. MCP Server & ROI Analysis | M3 | 0/TBD | Not started | - |
| 22. Testing Suite | M4 | 0/TBD | Not started | - |
| 23. Deployment | M4 | 0/TBD | Not started | - |
| 24. Operations | M4 | 0/TBD | Not started | - |
