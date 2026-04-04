# Requirements: UniBoard v2.0

**Defined:** 2026-03-20
**Core Value:** Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place

## v1 Requirements

Requirements for full release across 4 milestones.

### GPA Core

- [x] **GPA-01**: User can view real-time GPA/WAM for current semester, calculated from Canvas grades (data delay < 15 min)
- [x] **GPA-02**: User can perform What-if simulation by inputting hypothetical future assessment scores and seeing updated GPA in real-time
- [x] **GPA-03**: User can set a target GPA and see the minimum scores needed per remaining assessment to reach it
- [x] **GPA-04**: User can view assessment weight breakdown per course, parsed from Unit Outline HTML with visual donut chart
- [x] **GPA-05**: User can see per-course WAM with grade band indicator (HD/D/CR/P/F) and percentage of course assessed

### Deadlines

- [x] **DL-01**: User can view all upcoming deadlines in a unified timeline, aggregated from Canvas + Ed Lessons + Ed Discussion (SHA-256 deduplicated)
- [x] **DL-02**: User receives tiered deadline reminders at 72h, 24h, and 3h before due date
- [x] **DL-03**: User receives risk alert when grade trajectory deviates from target GPA threshold
- [x] **DL-04**: User can ask AI about assignment details in Deadline page chat — MCP Agent researches across Canvas announcements, modules, Ed threads, and Ed Lessons to provide contextual answers with cited sources (AiStudyMate integration placeholder)

### Intelligence

- [x] **INTEL-01**: User can view Ed Discussion posts filtered by endorsed and staff-answered status (rule-based extraction)
- [x] **INTEL-02**: User can view AI-extracted high-value information from Ed Discussion: exam scope hints, assignment clarifications, rubric details, deadline changes (MCP Agent)
- [x] **INTEL-03**: User receives daily academic digest aggregating new deadlines, grades, announcements, and high-value Ed posts (rule-based)
- [x] **INTEL-04**: User receives AI-enhanced digest with urgency scoring and GPA relevance ranking (pre-collected data + Claude API)
- [x] **INTEL-05**: Deduplication across all data sources ensures no repeated information in digests or views

### Files & Materials

- [x] **FILE-01**: User can view all course folders with AI-generated one-sentence descriptions (Canvas Modules + Ed Lessons unified)
- [x] **FILE-02**: User can search across all course materials by keyword, returning matching file names, locations, and content snippets
- [x] **FILE-03**: User can ask AI questions about synced course materials and receive answers with cited sources — MCP Agent cross-platform research
- [x] **FILE-04**: User can select a course unit and view AI-generated structured review summary (key concepts, common mistakes, exam scope) — MCP Agent

### Platform & Onboarding

- [x] **PLAT-01**: User can complete registration and API token connection in 3 steps with visual guides
- [x] **PLAT-02**: User can access the full dashboard via web browser without installing anything
- [x] **PLAT-03**: Technical users can access UniBoard data via MCP server through Claude Desktop
- [x] **PLAT-04**: System displays token expiration warnings and guides re-authentication when Canvas/Ed tokens expire

### Settings Enhancement

- [x] **SET-LANG**: User can select preferred language (en/zh) in Settings page, preference persisted in Profile and applied to digest summaries and AI responses

### Skill System (MCP Agent)

- [x] **SKILL-01**: After first successful API exploration for an operation, system auto-generates a prompt template skill capturing the optimal steps
- [x] **SKILL-02**: Subsequent executions of the same operation load and follow the generated skill instead of re-exploring
- [x] **SKILL-03**: Skills are per-course differentiated (different courses may have different material organization patterns)
- [x] **SKILL-04**: ~13 seeded skills covering data collection, data processing, AI analysis, and user action dimensions, with auto-generation expanding the library over time

### AI Tutoring (promoted from v2)

- [x] **TUTOR-03**: Assignment ROI analysis — MCP Agent identifies high-weight/low-difficulty assignments for effort optimization

### Frontend Pages

- [x] **UI-01**: Dashboard page with hero welcome, stats row (WAM/Target/Alerts), course grades table, deadline timeline, assessment weight chart
- [x] **UI-02**: Courses page showing all enrolled courses with grade overview, assessment breakdown, and file navigation
- [x] **UI-03**: Deadlines page with full calendar view, filterable timeline, and AI chat panel
- [x] **UI-04**: Predict page with interactive What-if GPA simulator (slider-based score input, real-time calculation)
- [x] **UI-05**: Digest page showing daily/weekly intelligence digest with AI-scored relevance
- [x] **UI-06**: Settings page for API token management, notification preferences, and GPA target configuration
- [x] **UI-07**: All pages follow Anthropic-inspired design system: warm colors, paper texture, Rough.js hand-drawn borders, Source Serif 4 + Inter fonts
- [x] **UI-08**: Timetable page with weekly schedule view
- [x] **UI-09**: Auth page with login and register flows
- [x] **UI-10**: Setup page with 3-step API token onboarding flow
- [x] **UI-11**: Course Detail page with assessment breakdown, materials browser, and Ed posts

### Infrastructure

- [x] **INFRA-01**: PostgreSQL database with schema for users, courses, grades, deadlines, Ed threads, course materials, skills, and encrypted tokens
- [x] **INFRA-02**: Background sync engine: grades every 15 min, deadlines hourly, modules daily, Unit Outline per semester
- [x] **INFRA-03**: Canvas adapter with rate limiting (sliding window), pagination, and circuit breaker
- [x] **INFRA-04**: Ed Discussion adapter with defensive Pydantic parsing, graceful degradation when API changes
- [x] **INFRA-05**: Ed Lessons adapter for lesson content and assignment extraction
- [x] **INFRA-06**: Unit Outline HTML parser with weight-sum validation and Canvas assignment_groups fallback
- [x] **INFRA-07**: Token encryption (AES-256-GCM) with key stored in environment variable
- [x] **INFRA-08**: Simple JWT + bcrypt authentication (not Cognito for MVP)
- [x] **INFRA-09**: Docker Compose for local PostgreSQL + backend + frontend development environment
- [x] **INFRA-10**: i18n support (English + Chinese) with next-intl
- [x] **INFRA-11**: OpenAPI contract spec shared between frontend mock (Route Handlers) and backend (FastAPI)

### Critical Fixes (M4)

- [ ] **CRIT-01**: VoyageAI embed() calls wrapped in asyncio.to_thread() so they do not block the async event loop
- [x] **CRIT-02**: All build tools pass with zero errors (mypy --strict, ruff, tsc --noEmit, ESLint --max-warnings 0, pytest)
- [ ] **CRIT-03**: Application fails fast on startup when production-critical config is missing (JWT secret, encryption key, database URL)
- [ ] **CRIT-04**: Dockerfile uses multi-stage build, tini init system, non-root user, no --reload, no dev dependencies

### Security & Observability (M4)

- [ ] **SEC-01**: CORS origins configurable via environment variable, defaulting to localhost:3001 for development
- [x] **SEC-02**: Next.js and FastAPI return security response headers (HSTS, X-Frame-Options, X-Content-Type-Options, CSP)
- [ ] **SEC-03**: Every HTTP request logged with method, path, status_code, duration_ms; request_id bound to structlog contextvars for downstream correlation
- [x] **SEC-04**: Frontend has error.tsx and global-error.tsx error boundaries with basic error logging to console

### Code Quality (M4)

- [ ] **QUAL-01**: sync/tasks.py (1146 lines) split into domain-specific modules (grade, deadline, module, outline, discussion tasks)
- [ ] **QUAL-02**: Grade calculation, adapter _request(), and UserResponse construction unified to single source of truth (includes auth.py language_preference bug fix)
- [ ] **QUAL-03**: ~360 lines of dead code removed (unused schemas, unused hooks, unused dependencies passlib/bcrypt/jinja2/react-rough-notation)
- [x] **QUAL-04**: Resource leaks fixed (EdLessonsAdapter close, DB engines disposed on shutdown, health check returns 503 when degraded)

### DevOps (M4)

- [ ] **OPS-01**: GitHub Actions CI pipeline with separate backend (mypy+ruff+pytest) and frontend (tsc+eslint+build) workflows
- [x] **OPS-02**: Railway and Vercel deployment config (railway.toml, vercel.json, env var documentation), deployed to production
- [ ] **OPS-03**: Sentry integrated for both Python backend (sentry-sdk) and Next.js frontend (@sentry/nextjs) with error tracking and performance monitoring
- [x] **OPS-04**: API rate limiting via slowapi (60 req/user/min general, 10 req/user/min for AI endpoints)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI Tutoring

- **TUTOR-01**: Interactive AI review Q&A — AI asks questions based on course materials, evaluates student answers
- **TUTOR-02**: AI homework coaching — guidance based on assignment outline, rubric, and Ed Discussion context

### Personalization

- **PERS-01**: Onboarding questionnaire to customize dashboard layout and notification frequency
- **PERS-02**: Dynamic module weighting based on usage patterns

### External Integration

- **EXT-01**: AiStudyMate platform integration — connect to classmate's multimodal learning platform for assignment guidance (DL-04 serves as placeholder)

### Deployment Enhancement

- **DEPLOY-02**: AWS Cognito authentication migration

### UX Polish

- **UX-01**: Dashboard reminder cards are functional (navigate or trigger action on click)
- **UX-02**: Dashboard course card predict button pre-selects the corresponding course on Predict page
- **UX-03**: Timetable lecture/tutorial blocks visually align with Allocate+ style (color-coded, time/location)
- **UX-04**: Timetable page shows scroll indicator when deadline items overflow visible area
- **FEAT-01**: Course detail page has inline material preview (mini-window viewer)

### Deadlines UX

- **DL-UX-01**: Deadline card redesign — due time on far right with enlarged font; three-dot menu with delete/pin actions
- **DL-UX-02**: Pinned deadlines highlighted and prioritized in notification panel
- **DL-UX-03**: All/This Week toggle — "All" shows incomplete + overdue-submittable only; "This Week" shows all statuses
- **DL-UX-04**: Overdue-but-submittable deadlines display with red border highlight
- **DL-UX-05**: User actions (delete/pin) persisted in database, survive sync cycles and page refreshes

### Mobile

- **MOBILE-01**: Responsive mobile layout
- **MOBILE-02**: Native mobile app (React Native / PWA)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Ed Discussion posting/replying | Read-only policy — avoid polluting Ed ecosystem |
| Canvas assignment submission | Academic integrity risk |
| Canvas quiz answering | Academic integrity risk |
| Homework ghostwriting / direct answers | Academic integrity violation |
| Social/chat features | Irrelevant to GPA |
| Course recommendations | Out of GPA tracking scope |
| Multi-university support | USYD-only for current release |
| Real-time chat/messaging | High complexity, not core value |

## Traceability

Which milestones/phases cover which requirements. Updated during roadmap creation.

| Requirement | Milestone | Phase | Status |
|-------------|-----------|-------|--------|
| GPA-01 | M2 | Phase 15 | ✅ Complete |
| GPA-02 | M2 | Phase 15 | ✅ Complete |
| GPA-03 | M2 | Phase 15 | ✅ Complete |
| GPA-04 | M2 | Phase 15 | ✅ Complete |
| GPA-05 | M2 | Phase 15 | ✅ Complete |
| DL-01 | M2 | Phase 15 | ✅ Complete |
| DL-02 | M2 | Phase 17 | ✅ Complete |
| DL-03 | M2 | Phase 17 | ✅ Complete |
| DL-04 | M3 | Phase 19 | ✅ Complete |
| INTEL-01 | M2 | Phase 15 | ✅ Complete |
| INTEL-02 | M3 | Phase 18 | ✅ Complete |
| INTEL-03 | M2 | Phase 17 | ✅ Complete |
| INTEL-04 | M3 | Phase 18 | ✅ Complete |
| INTEL-05 | M2 | Phase 15 | ✅ Complete |
| FILE-01 | M2 | Phase 15 | ✅ Complete |
| FILE-02 | M2 | Phase 15 | ✅ Complete |
| FILE-03 | M3 | Phase 19 | ✅ Complete |
| FILE-04 | M3 | Phase 19 | ✅ Complete |
| PLAT-01 | M1 | Phase 4 | ✅ Complete |
| PLAT-02 | M1 | Phase 3 | ✅ Complete |
| PLAT-03 | M3 | Phase 21 | ✅ Complete |
| PLAT-04 | M2 | Phase 17 | ✅ Complete |
| SET-LANG | M3 | Phase 19 | ✅ Complete |
| SKILL-01 | M3 | Phase 20 | ✅ Complete |
| SKILL-02 | M3 | Phase 20 | ✅ Complete |
| SKILL-03 | M3 | Phase 20 | ✅ Complete |
| SKILL-04 | M3 | Phase 20 | ✅ Complete |
| TUTOR-03 | M3 | Phase 21 | ✅ Complete |
| UI-01 | M1 | Phase 5 | ✅ Complete |
| UI-02 | M1 | Phase 6 | ✅ Complete |
| UI-03 | M1 | Phase 8 | ✅ Complete |
| UI-04 | M1 | Phase 9 | ✅ Complete |
| UI-05 | M1 | Phase 10 | ✅ Complete |
| UI-06 | M1 | Phase 12 | ✅ Complete |
| UI-07 | M1 | Phase 1 | ✅ Complete |
| UI-08 | M1 | Phase 11 | ✅ Complete |
| UI-09 | M1 | Phase 3 | ✅ Complete |
| UI-10 | M1 | Phase 4 | ✅ Complete |
| UI-11 | M1 | Phase 7 | ✅ Complete |
| INFRA-01 | M2 | Phase 13 | ✅ Complete |
| INFRA-02 | M2 | Phase 16 | ✅ Complete |
| INFRA-03 | M2 | Phase 14 | ✅ Complete |
| INFRA-04 | M2 | Phase 14 | ✅ Complete |
| INFRA-05 | M2 | Phase 14 | ✅ Complete |
| INFRA-06 | M2 | Phase 14 | ✅ Complete |
| INFRA-07 | M2 | Phase 13 | ✅ Complete |
| INFRA-08 | M2 | Phase 13 | ✅ Complete |
| INFRA-09 | M2 | Phase 13 | ✅ Complete |
| INFRA-10 | M1 | Phase 1 | ✅ Complete |
| INFRA-11 | M1 | Phase 2 | ✅ Complete |
| CRIT-01 | M4 | Phase 22 | Pending |
| CRIT-02 | M4 | Phase 24 | Pending |
| CRIT-03 | M4 | Phase 22 | Pending |
| CRIT-04 | M4 | Phase 22 | Pending |
| SEC-01 | M4 | Phase 22 | Pending |
| SEC-02 | M4 | Phase 25 | Pending |
| SEC-03 | M4 | Phase 25 | Pending |
| SEC-04 | M4 | Phase 25 | Pending |
| QUAL-01 | M4 | Phase 23 | Pending |
| QUAL-02 | M4 | Phase 23 | Pending |
| QUAL-03 | M4 | Phase 23 | Pending |
| QUAL-04 | M4 | Phase 23 | Pending |
| OPS-01 | M4 | Phase 26 | Pending |
| OPS-02 | M4 | Phase 26 | Pending |
| OPS-03 | M4 | Phase 26 | Pending |
| OPS-04 | M4 | Phase 25 | Pending |
| UX-01 | M4 | Phase 27 | Pending |
| UX-02 | M4 | Phase 27 | Pending |
| UX-03 | M4 | Phase 27 | Pending |
| UX-04 | M4 | Phase 27 | Pending |
| FEAT-01 | M4 | Phase 27 | Pending |
| DL-UX-01 | M4 | Phase 28 | Pending |
| DL-UX-02 | M4 | Phase 28 | Pending |
| DL-UX-03 | M4 | Phase 28 | Pending |
| DL-UX-04 | M4 | Phase 28 | Pending |
| DL-UX-05 | M4 | Phase 28 | Pending |

**Coverage:**
- v1 requirements: 78 total (51 M1-M3 + 27 M4)
- Mapped to phases: 78
- Unmapped: 0
- M1+M2 complete: 36/78
- M3 complete: 15/78
- M4 pending: 27/78

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-04-01 — Added UX-01..04, FEAT-01, DL-UX-01..05 for Phases 27-28*
