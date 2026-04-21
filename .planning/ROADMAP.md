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
| 33. Token Lifecycle & Onboarding | v3.0 | 8/8 | Complete    | 2026-04-16 |
| 34. AI Features Live | v3.0 | 6/6 | Complete   | 2026-04-17 |
| 35. Push Notifications | v3.0 | 0/TBD | Not started | - |
| 36. UX Polish | v3.0 | 0/TBD | Not started | - |
| 38. First-Load Performance | v3.0 | 4/4 | Complete    | 2026-04-21 |
| 38.1. Prefetch ↔ Consumer Parity | v3.0 | 3/3 | Complete   | 2026-04-21 |

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
**Plans**: 8 plans

Plans:
- [x] 33-01-PLAN.md — Migration: profiles.recall_email_sent_at + handle_new_user trigger COALESCE patch (EMAIL-03, AUTH-HARDEN-01)
- [x] 33-02-PLAN.md — RecallEmailService + SES extension + check_token_health() integration (EMAIL-03)
- [x] 33-03-PLAN.md — /sync/status response: per_platform_counts schema + frontend types regen (ONBD-01)
- [x] 33-04-PLAN.md — Supabase Google OAuth config + /auth/callback Next.js route (AUTH-HARDEN-01)
- [x] 33-05-PLAN.md — Google button on LoginForm/RegisterForm + USYD banner + check-email copy fix (AUTH-HARDEN-01, AUTH-HARDEN-02)
- [x] 33-06-PLAN.md — Resend email button + 60s cooldown on ForgotPasswordForm (AUTH-HARDEN-03)
- [x] 33-07-PLAN.md — Setup edge cases: TokenStep cache + invalid/unreachable UX + SuccessStep platform rows + retry-failed (ONBD-01, ONBD-02)
- [x] 33-08-PLAN.md — Documentation: TRD §7.X + §16.X + PROJECT.md Key Decisions + supabase/config.toml comment (AUTH-HARDEN-04)

### Phase 34: AI Features Live
**Goal**: AI-powered study recommendations, course material QA with real data, and GPA path planning
**Depends on**: Phase 33
**Requirements**: AIFEAT-01, AIFEAT-02, AIFEAT-03
**Success Criteria** (what must be TRUE):
  1. AI study recommendations prioritize assessments by weight ("Focus on Final Exam, worth 50%")
  2. Course material QA uses RAG on Ed Lessons with cited sources, verified with real data
  3. GPA path planner calculates required average for remaining subjects to reach target distinction
**Plans**: 6 plans
- [x] 34-00-PLAN.md — Wave 0 RED-state test scaffolding (xfail/it.todo stubs across 11 test files)
- [x] 34-01-PLAN.md — Schema migration + ORM extensions (Profile.remaining_credit_points, Course content_hash/last_qa_access_at/embedded_at, study_recommendation_cache table + RLS) [AIFEAT-01/02/03]
- [x] 34-02-PLAN.md — StudyRecommendationService + APScheduler 7am AEST daily job + GET /ai/study-recommendations [AIFEAT-01]
- [x] 34-03-PLAN.md — GPAService.calculate_multi_course_path (Decimal-precise math) + AI advisory + POST /gpa/multi-course-path [AIFEAT-03]
- [x] 34-04-PLAN.md — Embedding worker (30-min hot-set) + content_hash trigger + SSE sources event + numeric [N] citations [AIFEAT-02]
- [x] 34-05-PLAN.md — Frontend integration: hooks + Sources/StudyRecCard/MultiCoursePathCard + Dashboard hero + Settings 4-band chips + Sources panel [AIFEAT-01/02/03]

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

### Phase 38: First-Load Performance (RSC Prefetch + HydrationBoundary)
**Goal**: First paint shows real data across 6 card-heavy pages (Dashboard, Courses, Deadlines, Predict, Digest, Timetable) — no skeleton flash on cached-auth revisit — achieved via Next.js 15 Server Component prefetch + TanStack Query `HydrationBoundary`, with dashboard waterfall collapsed and Railway cold-start behaviour characterised.
**Depends on**: Phase 34
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. All 6 target pages (Dashboard, Courses, Deadlines, Predict, Digest, Timetable) have their page.tsx as an `async` Server Component that prefetches required queries and returns a `<HydrationBoundary state={dehydrate(queryClient)}>` wrapper — verified by reading dehydrated cache on client before any `useQuery` fires
  2. On cached-auth revisit (JWT valid, warm Railway), first paint displays real data on the above pages — no `SkeletonCard` visible to the naked eye in a local dev build or Vercel preview walkthrough
  3. Dashboard deadline→courseDetail waterfall eliminated — either backend bundles assessment_weights into `/deadlines/upcoming`, or frontend parallelises via `Promise.all` in the RSC prefetch layer (no serial client-side dependency chain)
  4. Railway cold-start behaviour characterised — measured p50/p95 latency for first request after 15-min idle; if >2s, implement a warmup strategy (cron ping /healthz OR Railway always-on) and document the choice
  5. Backlog 999.2 (viewport lazy-mount) re-evaluated post-ship — marked obsolete if this phase resolves the symptom, or retained as orthogonal follow-up with a specific residual case documented
**Plans**: 4 plans

Plans:
- [x] 38-01-PLAN.md — Infra + Dashboard reference implementation (server QueryClient, createPrefetchedPage HOF, waterfall collapse) [PERF-01, PERF-02]
- [x] 38-02-PLAN.md — Remaining 5 pages conversion (Courses, Deadlines, Predict N-fanout, Digest, Timetable) [PERF-01]
- [x] 38-03-PLAN.md — Railway cold-start characterisation + conditional warmup cron [PERF-03]
- [x] 38-04-PLAN.md — Playwright pixel-diff regression suite (6 pages, zh-CN, perf-test seed account) [PERF-01]

**Context**: Rolled up from backlog 999.2 "Page mount lazy loading" (promoted 2026-04-20). Original 999.2 proposed viewport-driven progressive mount; user decision is to pursue RSC prefetch + HydrationBoundary instead — eager data delivery rather than deferred render — which eliminates the first-visit lag window at its source while preserving `AnimatedEntry` intro animations. Leverages prior debug investigation `.planning/debug/resolved/uniboard-5fps-lag-dashboard.md` (PRs #80-87 already drove INP 267→107 ms; remaining gap is the data-fetch waterfall during hydrate).

### Phase 38.1: Server-Prefetch ↔ Client-Consumer Parity (Gap Closure)
**Goal**: Close the Phase 38 HUMAN-UAT Truth #2 gap — eliminate `SkeletonCard` flash on hard-refresh of any `force-dynamic` dashboard page by aligning each page's `run()` prefetch list with the full set of client `useQuery*` consumers it renders.
**Depends on**: Phase 38
**Requirements**: PERF-01 (completion)
**Success Criteria** (what must be TRUE):
  1. Hard-refresh each of Dashboard / Courses / Deadlines / Predict / Digest / Timetable — zero `SkeletonCard` visible above the fold (naked eye, production)
  2. All `force-dynamic` `page.tsx` prefetch lists cover 100% of client-side `useQuery*` consumers of those pages (auditable)
  3. Static invariant test added — every client `useQuery` consumed by a `force-dynamic` page has a matching `prefetchQuery`/`fetchQuery` in the page's `run` body — fails CI if a future regression drifts
  4. No regression in automated tests (vitest + Playwright smoke) — sidebar navigation warm-path performance preserved
  5. Sentry tag convention preserved (`phase: "38"`, `operation: "rsc_prefetch"`, `query: <label>`) for all new prefetches
  6. Phase 38 HUMAN-UAT #1 (skeleton-flash on cached-auth revisit) flips to `passed` post-deploy
**Plans**: 3 plans

Plans:
- [x] 38.1-01-PLAN.md — Static-invariant test scaffold (RED state; Plans 02+03 flip to GREEN) [TDD]
- [x] 38.1-02-PLAN.md — Dashboard + Digest prefetch gaps (userOptions.me / notificationOptions.list / alertOptions.list / digestOptions.history)
- [x] 38.1-03-PLAN.md — Predict + Timetable prefetch gaps (hoisted userOptions.me + studyRecOptions.latest / N-fanout courseOptions.detail)
**Context**: Production UAT 2026-04-21 confirmed Phase 38's Truth #2 (`HUMAN_NEEDED` in 38-VERIFICATION.md) fails — hard-refresh flashes skeleton because server prefetch is a strict subset of client consumers. Dashboard audit: `useCurrentUser` + `useNotifications` missing; Timetable audit: `useQueries(courseOptions.detail(c.id))` N-fanout missing. Other 4 pages need identical audit. Fix reuses `createPrefetchedPage` HOF verbatim — zero architectural change. Debug trace: `.planning/debug/sidebar-nav-skeleton-stall.md`.

## Backlog

### Phase 999.1: Sidebar transform-based architecture refactor (BACKLOG)
**Goal**: [Captured for future planning] Eliminate sidebar hover lag on content-heavy pages by replacing `transition: width` with GPU-composited `transform: translateX`. Two-layer DOM: outer 68 px container always visible + inner 224 px panel absolutely positioned with `translateX(-156 px)` by default, `translateX(0)` on hover. Bypasses per-frame layout cost that `width` animation incurs (non-composited property). Expected ~50 line refactor, requires reworking icon positioning logic and careful visual verification.
**Context**: Remaining issue from the 2026-04-17/18 5fps-lag investigation (.planning/debug/uniboard-5fps-lag-dashboard.md). PRs #80-87 drove INP 267→107 ms and cleared the Rough.js hotspots, but sidebar hover on dashboard/predict/settings/timetable still feels draggy because `transition: width` physically requires main-thread layout per frame.
**Requirements**: TBD
**Plans**: 0 plans
  - [ ] TBD (promote with /gsd-review-backlog when ready)

### ~~Phase 999.2: Page mount lazy loading~~ — PROMOTED to Phase 38 on 2026-04-20
Original scope ("viewport-driven progressive mount") superseded by Phase 38's eager-prefetch approach. Symptom and debug context preserved in Phase 38's Context block above.

**Post-ship verdict (2026-04-21, pending final UAT sign-off):** retained — provisional until Phase 38 P04 baselines are captured and the 6-page pixel-diff run is green on a fresh PR. The expected verdict after that run is **obsolete** (superseded by Phase 38 RSC prefetch: all 6 pages render real data on first paint, eliminating the viewport lazy-mount symptom at its source). Rubric for closing this backlog:
- If 0 of 6 pixel-diff baselines show any `SkeletonCard` pixels → flip status to `obsolete` and strike this backlog entry entirely.
- If any baseline shows residual skeleton in a specific sub-region (e.g., below-the-fold card, a particular state transition) → keep as `retained + residual case` with the exact sub-region documented, so a future micro-phase can address it with a narrow viewport-gated remount.
- If AI study-rec hero / deadline hero flashes despite RSC hydration → treat as Phase 38 bug (Rule 1), not a Phase 999.2 scope item; file a gap-closure plan against Phase 38.
