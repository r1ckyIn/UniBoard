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
- [x] **Phase 26: CI/CD & Production Deployment** — GitHub Actions pipeline, Railway+Vercel deployment, Sentry error tracking (completed 2026-04-04)
- [ ] **Phase 27: Frontend UX Fixes & Course Materials Preview** — Dashboard/timetable interaction fixes, course materials inline viewer
- [x] **Phase 28: Deadlines Page Enhancement** — Card redesign, delete/pin actions, all/week modes, overdue highlighting, user preference persistence (completed 2026-04-04)

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
- [x] 26-02-PLAN.md — Railway + Vercel deployment config & env var docs (OPS-02)
- [x] 26-03-PLAN.md — Sentry integration for Python + Next.js (OPS-03)

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
| 26. CI/CD & Production Deployment | M4 | 3/3 | Complete   | 2026-04-04 |
| 27. Frontend UX Fixes & Materials Preview | M4 | 0/TBD | Not started | - |
| 28. Deadlines Page Enhancement | M4 | 3/3 | Complete    | 2026-04-04 |
| 30. BFF Proxy Conversion | v3.0 | 1/3 | Complete    | 2026-04-06 |
| 31. E2E Verification & AI Config | v3.0 | 3/3 | Complete    | 2026-04-13 |
| 32. Production Email | v3.0 | 3/3 | Complete (32-03 strategically resolved — confirmation OFF; recipient placement deferred to Phase 33 AUTH-HARDEN) | 2026-04-14 |
| 32.1. Sync Integration Fixes | v3.0 | 6/6 | Complete | 2026-04-14 |
| 33. Token Lifecycle & Onboarding | v3.0 | 0/TBD | Not started | - |
| 34. AI Features Live | v3.0 | 0/TBD | Not started | - |
| 35. Push Notifications | v3.0 | 0/TBD | Not started | - |
| 36. UX Polish | v3.0 | 0/TBD | Not started | - |

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
- [x] TBD (run /gsd:plan-phase 28 to break down) (completed 2026-04-04)

### Phase 30: BFF Proxy Conversion
**Goal**: All Next.js Route Handlers proxy requests to Railway Python backend instead of returning mock fixtures
**Depends on**: Phase 29
**Requirements**: BFF-01, BFF-02, BFF-03
**Success Criteria** (what must be TRUE):
  1. All 25 Route Handlers use proxyRequest() to forward to Railway backend
  2. Frontend API requests include Supabase JWT Authorization header
  3. Proxy layer has unified error handling for backend 4xx/5xx responses
**Plans**: 1/3 complete (completed 2026-04-06)

### Phase 31: E2E Verification & AI Config
**Goal**: End-to-end user journey works with real data and AI features are configured for production
**Depends on**: Phase 30
**Requirements**: BFF-04, AICONF-01, AICONF-02
**Success Criteria** (what must be TRUE):
  1. A user can register, configure API tokens, trigger first sync, and see real Canvas/Ed data displayed in the frontend
  2. ANTHROPIC_API_KEY is configured in Railway environment variables and accessible by AI services
  3. AI features (Deadline Chat, Course QA, Unit Review) return real AI-generated results with streaming via SSE
**Plans**: 2 plans

Plans:
- [x] 31-01-PLAN.md — Wire setup flow to real backend APIs (BFF-04)
- [x] 31-02-PLAN.md — Fix SSE dual-path, AI key guard, Railway config (AICONF-01, AICONF-02)

### Phase 31.1: Observability Pipeline & Sentry Hardening
**Goal**: Fix DB connection error spam, implement Sentry/Vercel best practices, set up automated monitoring pipeline
**Depends on**: Phase 31
**Requirements**: OBS-01, OBS-02, OBS-03
**Success Criteria** (what must be TRUE):
  1. Transient DB connection errors (DBAPIError) are retried with backoff and suppressed in Sentry
  2. Sentry uses release tracking (git SHA), fingerprinting, and noise filtering for both backend and frontend
  3. Sentry tunnel route bypasses ad blockers for client-side error reporting
  4. Automated `/check-alerts` skill queries Sentry API + Gmail for triage
**Plans**: 3 plans
Plans:
- [x] 31.1-01 — Fix DBAPIError root cause (pool limits, startup jitter, before_send filter)
- [x] 31.1-02 — Sentry/Vercel best practices (release tracking, tunnel, fingerprinting)
- [ ] 31.1-03 — Automated monitoring pipeline (Gmail MCP, /check-alerts skill)

### Phase 32: Production Email
**Goal**: Replace Supabase built-in email with custom SMTP (Resend) and branded email templates for signup confirmation and password reset
**Depends on**: Phase 31
**Requirements**: EMAIL-01, EMAIL-02
**Success Criteria** (what must be TRUE):
  1. Supabase Auth sends emails via custom SMTP (Resend) instead of built-in service
  2. Signup confirmation email uses branded HTML template with UniBoard logo, styling, and clear CTA button
  3. Password reset email uses branded HTML template with secure reset link and expiry notice
  4. Email deliverability verified end-to-end on the sender side: SPF/DKIM/DMARC all pass; Resend dashboard shows 100% Delivered for non-bounced addresses. Recipient-side mailbox placement (inbox vs Junk vs Mimecast quarantine) is governed by recipient policy and is NOT a Phase 32 acceptance criterion — handled by Phase 33 AUTH-HARDEN strategy (Google OAuth + permanent confirmation OFF).
**Plans**: 3 plans

Plans:
- [x] 32-01-PLAN.md — Email templates, config.toml, auth/confirm route (EMAIL-01, EMAIL-02)
- [x] 32-02-PLAN.md — Frontend auth flow changes: ForgotPassword, UpdatePassword, RegisterForm update (EMAIL-02)
- [x] 32-03-PLAN.md — Manual Resend/Supabase Dashboard config + E2E verification (EMAIL-01, EMAIL-02) — strategically resolved: Resend SMTP live and 100% Delivered; Supabase email confirmation permanently OFF because Mimecast quarantines new-domain emails for USYD recipients with a 3-hour digest delay (untenable signup UX). Recipient placement issue handed to Phase 33 AUTH-HARDEN (Google OAuth bypass + USYD-aware UI). See 32-03-SUMMARY.md "Strategy shift 2026-04-14".

### Phase 32.1: Sync Integration Fixes
**Goal**: All platform data syncs correctly — Unit Outline scraping, grades, Ed matching, Canvas deadlines, and Canvas course filtering all produce real data
**Depends on**: Phase 32
**Requirements**: SYNC-FIX-01, SYNC-FIX-02, SYNC-FIX-03, SYNC-FIX-04, SYNC-FIX-05
**Success Criteria** (what must be TRUE):
  1. Unit Outline scraping successfully extracts assessment weights from USYD official site for all real courses (has_unit_outline=true)
  2. Canvas grades sync populates current_mark and grade_letter for graded assessments
  3. Ed Discussion course matching correctly links ed_course_id for each Canvas course
  4. Canvas assignments/deadlines sync captures all due items (not just 1 per course)
  5. Canvas "Final Exam for: X" concession-shell courses are filtered out of the courses list
  6. Dashboard shows assessment weights donut chart with real data (no empty states after full sync)
**Plans**: 6 plans

Plans:
- [x] 32.1-00-PLAN.md — Wave 0 test infrastructure: unit test stubs + Canvas/Ed/USYD fixtures + real-data env gate
- [x] 32.1-01-PLAN.md — SYNC-FIX-05: Filter "Final Exam for:" / Concession / Supplementary shell courses
- [x] 32.1-02-PLAN.md — SYNC-FIX-01: Wire Canvas tabs -> external_tool URL resolution + USYD parser positional fallbacks
- [x] 32.1-03-PLAN.md — SYNC-FIX-02: Canvas grades sync passes include=[submission] for populated score data
- [x] 32.1-04-PLAN.md — SYNC-FIX-04: Null-safe due_at handling in DeadlineService.aggregate_and_dedup
- [x] 32.1-05-PLAN.md — SYNC-FIX-03: Ed single-candidate semester fallback + real-data integration harness

### Phase 33: Token Lifecycle & Onboarding (with Auth Hardening)
**Goal**: Automated token expiry handling, polished onboarding, and auth UX hardening to bypass Mimecast email-quarantine for USYD users
**Depends on**: Phase 32
**Requirements**: EMAIL-03, AUTH-HARDEN-01, AUTH-HARDEN-02, AUTH-HARDEN-03, AUTH-HARDEN-04, ONBD-01, ONBD-02
**Success Criteria** (what must be TRUE):
  1. Token expiry uses in-app first strategy: in-app notification + Settings/Dashboard banner immediately on expiry; backup recall email only fires when the user has been absent (>= 14 days) — no dependence on email reaching the inbox
  2. First-login onboarding flow is polished with clear guidance, per-domain sync progress indicator, and consistent tone
  3. Setup page handles edge cases gracefully (invalid token, API unreachable, sync failure, TokenStep skip re-validate)
  4. Sign in with Google OAuth (USYD Google Workspace) works end-to-end as the primary auth path — bypasses email entirely
  5. RegisterForm check-email state has a "Resend email" button with 60s cooldown to prevent reputation-damaging duplicate sends
  6. Registration page surfaces a USYD-specific notice explaining Junk/Held Messages and recommending Google OAuth
  7. Supabase email confirmation is permanently OFF (documented decision; Phase 32-03 strategically resolved)
**Plans**: TBD

### Phase 34: AI Features Live
**Goal**: AI-powered study recommendations, course material QA with real data, and GPA path planning
**Depends on**: Phase 33
**Requirements**: AIFEAT-01, AIFEAT-02, AIFEAT-03
**Success Criteria** (what must be TRUE):
  1. AI study recommendations prioritize assessments by weight ("Focus on Final Exam, worth 50%")
  2. Course material QA uses RAG on Ed Lessons with cited sources, verified with real data
  3. GPA path planner calculates required average for remaining subjects to reach target distinction
**Plans**: TBD

### Phase 35: Push Notifications
**Goal**: Browser push notifications or email notifications for deadline reminders
**Depends on**: Phase 34
**Requirements**: AIFEAT-04
**Success Criteria** (what must be TRUE):
  1. Users can opt-in to deadline reminder notifications via browser Push API or email
  2. Notifications fire at configurable intervals before deadline (24h, 6h, 1h)
  3. Notification preferences persist across sessions and sync cycles
**Plans**: TBD

### Phase 36: UX Polish
**Goal**: Fix all accumulated UX rough edges across AI chat, setup flow, and error handling
**Depends on**: Phase 31
**Requirements**: UXPOL-01, UXPOL-02, UXPOL-03, UXPOL-04
**Success Criteria** (what must be TRUE):
  1. AI Chat shows client-side validation message when input < 3 chars (no raw 422 error)
  2. AI request failures display specific backend error message (not generic "AI request failed")
  3. Setup TokenStep skips re-validation for tokens that already passed validation on retry
  4. Setup SuccessStep shows per-domain sync progress bars (Canvas sync, Ed sync, etc.) instead of single spinner
**Plans**: TBD
