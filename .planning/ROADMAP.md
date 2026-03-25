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
- [x] **Phase 6: Courses Page** — Card grid with grade overview and course navigation (2026-03-23)
- [ ] **Phase 7: Course Detail Page** — Assessment breakdown, materials browser, Ed posts
- [ ] **Phase 8: Deadlines Page** — Calendar view, filterable timeline, AI chat panel placeholder
- [ ] **Phase 9: Predict Page** — Slider-based What-if GPA simulator with real-time calculation
- [x] **Phase 10: Digest Page** — Daily/weekly intelligence digest with relevance scoring UI (completed 2026-03-24)
- [x] **Phase 11: Timetable Page** — Weekly schedule view (completed 2026-03-25)
- [x] **Phase 11.1: Real Data Integration & UAT Gap Closure** — Real Obsidian data, timetable fixes, RoughCard cosmetic fix (completed 2026-03-25)
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
- [x] 01-01-PLAN.md — Project scaffolding, Tailwind @theme, fonts, paper texture, i18n routing
- [x] 01-02-PLAN.md — Design system components (RoughCard, RoughNotationWrapper, HeroDoodles) and app shell layout (Sidebar, Header, RightPanel)

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
**Plans:** 4/5 plans executed

Plans:
- [ ] 02-01-PLAN.md — OpenAPI 3.1 spec, type codegen, ky client, auth store, QueryProvider, Wave 0 tests
- [ ] 02-02-PLAN.md — Fixture data files and auth/user Route Handler mocks
- [ ] 02-03-PLAN.md — Courses, GPA, and deadlines Route Handler mocks
- [ ] 02-04-PLAN.md — Intelligence, sync, search, health Route Handler mocks + mock-routes test
- [ ] 02-05-PLAN.md — TanStack Query hooks for all data domains + hooks test

### Phase 3: Auth Page
**Goal**: Users can register and log in through a polished auth interface
**Depends on**: Phase 2
**Requirements**: UI-09, PLAT-02
**Success Criteria** (what must be TRUE):
  1. User can switch between login and register forms
  2. Form validation shows inline errors for invalid email, weak password, password mismatch
  3. Successful login stores mock JWT and redirects to dashboard
  4. Auth page design matches prototype aesthetic (Rough.js borders, warm colors)
**Plans:** 4 plans

Plans:
- [x] 03-01-PLAN.md — Install deps (motion, react-hook-form, zod, sonner), validation schemas, auth guard, auth doodles, language switcher, i18n messages, auth layout
- [x] 03-02-PLAN.md — BrandPanel, LoginForm, RegisterForm, PasswordStrengthMeter, AuthFormCard (switching animation), SuccessOverlay, AuthPage orchestrator, page.tsx
- [x] 03-03-PLAN.md — ABANDONED (UAT gaps resolved in prior phases; remaining items consolidated into Phase 11.1)
- [x] 03-04-PLAN.md — ABANDONED (UAT gaps resolved in prior phases; remaining items consolidated into Phase 11.1)

### Phase 4: Setup Page
**Goal**: New users can complete API token onboarding in 3 guided steps
**Depends on**: Phase 3
**Requirements**: UI-10, PLAT-01
**Success Criteria** (what must be TRUE):
  1. 3-step flow is visually clear: register → get tokens → paste tokens
  2. Each step includes visual guides showing where to find Canvas/Ed tokens
  3. Token paste fields validate format before accepting
  4. Completion redirects to dashboard with success confirmation
**Plans**: 5 plans

Plans:
- [ ] 04-01-PLAN.md — i18n setup namespace, SetupGuard, token validation, auth layout restructure, route entry
- [ ] 04-02-PLAN.md — StepIndicator, WelcomeStep, TutorialStep, GuideCard display components
- [ ] 04-03-PLAN.md — TokenInput, TokenStep, SuccessStep, SetupPage orchestrator, route wiring
- [x] 04-04-PLAN.md — ABANDONED (UAT gaps resolved in prior phases; remaining items consolidated into Phase 11.1)
- [x] 04-05-PLAN.md — ABANDONED (UAT gaps resolved in prior phases; remaining items consolidated into Phase 11.1)

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
**Plans**: 11 plans

Plans:
- [x] 05-00-PLAN.md — Wave 0: test stubs for all 13 dashboard components and utilities
- [x] 05-01-PLAN.md — i18n dashboard namespace, encouragement provider, course-colors utility, SkeletonCard
- [x] 05-02-PLAN.md — NotificationPanel, AvatarMenu, Header refactor to data-driven dropdowns
- [x] 05-03-PLAN.md — HeroSection (Motion entrance, parallax fade), StatsRow, RoughProgressBar, CourseGradesTable
- [x] 05-04-PLAN.md — ProfileCard, MiniCalendar (month nav, deadline color-depth), RecentActivity, ExternalLinkDialog
- [x] 05-05-PLAN.md — DeadlineTimeline, AssessmentDonut (converge animation), DashboardPage orchestrator, page.tsx, RightPanel refactor
- [x] 05-06-PLAN.md — UAT gap closure: grade band calculation, encouragement i18n, skeleton shimmer, right sidebar fixes
- [x] 05-07-PLAN.md — UAT gap closure: AssessmentDonut full rewrite (smooth SVG donut matching prototype)
- [x] 05-08-PLAN.md — UAT gap closure: profile card faculty, hover effects, avatar delay, dialog centering, hero stagger, bottom row height
- [x] 05-09-PLAN.md — ABANDONED (UAT gaps resolved in prior phases; remaining items consolidated into Phase 11.1)
- [x] 05-10-PLAN.md — ABANDONED (UAT gaps resolved in prior phases; remaining items consolidated into Phase 11.1)

### Phase 6: Courses Page
**Goal**: Users can browse all enrolled courses with grade summaries
**Depends on**: Phase 2
**Requirements**: UI-02
**Success Criteria** (what must be TRUE):
  1. Course cards display in a responsive grid with grade overview per course
  2. Each card shows course name, WAM, grade band (HD/D/CR/P/F), and percentage assessed
  3. Clicking a course card navigates to Course Detail page
  4. Rough.js card borders and hover animations match prototype
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — i18n courses namespace, course-colors MATH1005 entry, Wave 0 test stubs, BannerDeco Rough.js component
- [x] 06-02-PLAN.md — CourseCard (two-layer Rough.js borders, banner, grade info), CoursesPage orchestrator, page.tsx route

### Phase 7: Course Detail Page
**Goal**: Users can drill into a single course to see assessments, materials, and Ed Discussion posts
**Depends on**: Phase 6
**Requirements**: UI-11
**Success Criteria** (what must be TRUE):
  1. Assessment breakdown shows all assessments with weights, scores, and due dates
  2. Materials browser displays course folders with file listings
  3. Ed Discussion section shows recent posts with endorsed/staff badges
  4. Navigation between course detail sections (assessments, materials, posts) works smoothly
**Plans**: 4 plans

Plans:
- [ ] 07-01-PLAN.md — i18n courseDetail namespace, useCourseDeadlines hook, page.tsx route, Wave 0 test stubs
- [ ] 07-02-PLAN.md — CourseBanner, AssessmentSection (prediction inputs + GradeSummary with countUp), MaterialsSection, AiChatPlaceholder
- [ ] 07-03-PLAN.md — QuickLinksPanel, CourseDeadlinesPanel, EdPostsPanel, CourseDetailPage orchestrator with portal-slot
- [ ] 07-04-PLAN.md — UAT gap closure: RoughCard wrapper for right-panel cards, EdPostsPanel author + locale timestamps

### Phase 8: Deadlines Page
**Goal**: Users can view and filter all upcoming deadlines with an AI chat placeholder
**Depends on**: Phase 2
**Requirements**: UI-03
**Success Criteria** (what must be TRUE):
  1. Calendar view displays deadlines with color-coded course indicators
  2. Timeline view lists all deadlines with filterable course/type dropdowns
  3. AI chat panel placeholder renders with "coming soon" state
  4. Deadline cards show assignment name, course, due date, and countdown
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — i18n deadlines namespace, shared urgency utility, route entry, Wave 0 test stubs
- [ ] 08-02-PLAN.md — DeadlineCard (expandable with materials + AI chat), DeadlineTimelineView, DeadlineTitleRow, DeadlinesPage orchestrator
- [ ] 08-03-PLAN.md — DeadlineCalendarView (full-width month grid with course-colored dots), wire into DeadlinesPage

### Phase 9: Predict Page
**Goal**: Users can simulate future GPA outcomes by adjusting hypothetical scores with faculty-aware WAM calculation
**Depends on**: Phase 2
**Requirements**: UI-04
**Success Criteria** (what must be TRUE):
  1. Number input fields for each pending assessment allow score input (0-100)
  2. WAM/GPA recalculates in real-time as inputs change
  3. Target WAM slider displays with required scores per course for comparison
  4. Rough.js styled right panel cards update smoothly without flickering
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md — WAM calculation engine (pure functions), faculty weights, WAM-to-GPA conversion, i18n predict namespace, Wave 0 test stubs
- [ ] 09-02-PLAN.md — PredictTitleRow, PredictCard expandable shell, PredictAssessmentTable (3-col), PredictGradeSummary
- [ ] 09-03-PLAN.md — Right panel cards (WAM Overview, Target Slider, Required Scores, Semester Progress), PredictPage orchestrator, route page

### Phase 10: Digest Page
**Goal**: Users can review their daily academic digest with course-grouped highlights and type filtering
**Depends on**: Phase 2
**Requirements**: UI-05
**Success Criteria** (what must be TRUE):
  1. Digest entries display grouped by course with colored left stripe and urgency-based ordering
  2. Each entry shows source (Canvas/Ed), type icon, summary, and urgency badge (critical/important/informational)
  3. All highlights fully expanded (single-line summaries, no collapse)
  4. Type filter pills allow filtering by Grade, Staff, Deadline, Announcement, Exam
  5. Right panel shows Today's Summary stats and Recent Digests history list
  6. Urgent banner displays when critical highlights exist
**Plans**: 3 plans

Plans:
- [ ] 10-01-PLAN.md — i18n digest namespace, enriched fixture data (all 6 highlight types), type config module, Wave 0 test stubs
- [ ] 10-02-PLAN.md — DigestTitleRow, DigestFilterBar, DigestUrgentBanner, CourseSectionCard, HighlightItem components
- [ ] 10-03-PLAN.md — DigestSummaryCard, DigestHistoryCard (right panel), DigestPage orchestrator, route page.tsx

### Phase 11: Timetable Page
**Goal**: Users can view their weekly class schedule with a 7-day time grid, week navigation, deadline overlays, and course legend
**Depends on**: Phase 2
**Requirements**: UI-08
**Success Criteria** (what must be TRUE):
  1. Weekly grid displays class sessions in correct time slots with dual-density axis (60px/h normal, 28px/h compressed evening)
  2. Each session shows course name, location, and type (lecture/tutorial/lab) with course-colored blocks
  3. Current day/time is highlighted with orange tint column and red now-line indicator
  4. Week navigation (slider + prev/next + All Weeks / Current Week toggle) allows browsing all 14 weeks
  5. Overlapping events display side-by-side using transitive group overlap algorithm
  6. Deadline dashed lines with hover tooltips overlay on the grid at correct time positions
  7. Right panel shows MiniCalendar, Upcoming Deadlines, and Course Legend via portal-slot
**Plans**: 3 plans

Plans:
- [ ] 11-01-PLAN.md — Types, fixture data (19 sessions from ICS), OpenAPI schema, Route Handler mocks, TanStack Query hooks, time-utils, overlap algorithm, i18n messages
- [ ] 11-02-PLAN.md — TimetableTitleRow (slider, nav, mode toggle), TimetableGrid (7-day dual-density), TimetableEvent, TimetableNowLine, TimetableDeadlineOverlay, TimetableBreakMessage
- [ ] 11-03-PLAN.md — TimetableUpcomingDeadlines, TimetableCourseLegend, TimetableRightPanel, TimetablePage orchestrator, route page.tsx

### Phase 11.1: Real Data Integration & UAT Gap Closure (INSERTED)

**Goal:** Replace mock fixture data with real courses/deadlines from Obsidian, close remaining timetable UAT gaps, and fix RoughCard two-layer cosmetic issue
**Requirements**: DATA-01, DATA-02, UAT-11.1-01, UAT-11.1-02, UAT-11.1-03, UAT-11.1-04
**Depends on:** Phase 11
**Success Criteria** (what must be TRUE):
  1. All fixture files reference exactly 5 real courses: COMP2017, COMP3221, STAT2011, EDGU1003, MATH2021
  2. Zero references to old mock courses (INFO2222, MATH1005) remain in frontend source
  3. Deadline fixture contains real deadline data from Obsidian Dashboard.md
  4. Timetable week label shows "Week N" between nav controls
  5. Deadline overlay filters by current week's Mon-Sun date range
  6. MiniCalendar in timetable shows deadline dots with weight-based opacity
  7. RoughCard has visible two-layer structure with hand-drawn border gap
**Plans:** 3/3 plans complete

Plans:
- [ ] 11.1-01-PLAN.md — Real data replacement: all fixture files, course-colors, SuccessStep, test updates
- [ ] 11.1-02-PLAN.md — Timetable UAT fixes: week label, per-week deadline filtering, MiniCalendar data
- [ ] 11.1-03-PLAN.md — RoughCard two-layer cosmetic fix + visual verification checkpoint

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
| 1. Design System & Foundation | M1 | 2/2 | Complete | 2026-03-20 |
| 2. API Contracts & Mock Layer | 4/5 | In Progress|  | - |
| 3. Auth Page | M1 | 4/4 | Complete (gaps → 11.1) | - |
| 4. Setup Page | M1 | 5/5 | Complete (gaps → 11.1) | - |
| 5. Dashboard Page | M1 | 11/11 | Complete (gaps → 11.1) | - |
| 6. Courses Page | M1 | 2/2 | Complete | 2026-03-23 |
| 7. Course Detail Page | M1 | 3/4 | UAT gap closure | - |
| 8. Deadlines Page | M1 | 3/3 | Complete | - |
| 9. Predict Page | M1 | 3/3 | Complete | - |
| 10. Digest Page | M1 | 3/3 | Complete | 2026-03-24 |
| 11. Timetable Page | M1 | 3/3 | Complete | 2026-03-25 |
| 11.1. Real Data & UAT | 3/3 | Complete    | 2026-03-25 | - |
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
