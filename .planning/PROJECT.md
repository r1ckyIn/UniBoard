# UniBoard v2.0

## What This Is

UniBoard is a GPA maximization dashboard for University of Sydney students. It aggregates data from Canvas LMS, Ed Discussion, Ed Lessons, and Unit Outline pages into a single interface that shows students exactly what matters for their grades — real-time GPA tracking, unified deadlines, high-value discussion highlights, and AI-powered course material research. The frontend (10 pages, Rough.js design system) and Python backend (adapters, services, sync engine, notifications) are complete. The system features an MCP Agent architecture where Claude autonomously researches across platforms using MCP tools to answer student questions with full context.

## Core Value

**Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place, eliminating the need to switch between platforms.**

## Current State

**Shipped:** M1 Frontend App + M2 Backend Core (v2.0-m2, 2026-03-27)
**Shipped:** M3 AI/MCP/Skills (v2.0-m3, 2026-03-29)
**Shipped:** M4 Phase 22-25 — Critical fixes, code quality refactor, build health green, security & observability
**In Progress:** M4 Hardening — Phase 26 (CI/CD & Production Deployment) next
**Codebase:** ~170K LOC (TypeScript + Python + SQL), 730+ files
**Tests:** 332 backend tests passing (115 DB-dependent auto-skipped when no PostgreSQL) + frontend component tests
**Tech stack:** Next.js 15 + FastAPI + Supabase (PostgreSQL + Auth) + APScheduler

## Requirements

### Validated

**M1 — Frontend App (Phases 1-12, 11.1):**
- ✓ API contracts (OpenAPI 3.1 spec with 32 endpoints) — v2.0-m1 Phase 02
- ✓ Mock API layer (30 Route Handlers with realistic fixture data) — v2.0-m1 Phase 02
- ✓ TanStack Query hooks for all 12 data domains — v2.0-m1 Phase 02
- ✓ Auth page (login + register) — v2.0-m1 Phase 03
- ✓ Setup page (3-step API token onboarding) — v2.0-m1 Phase 04
- ✓ Dashboard (hero welcome, stats row, course grades, deadline timeline, assessment weights) — v2.0-m1 Phase 05
- ✓ Courses page (card grid + grade overview) — v2.0-m1 Phase 06
- ✓ Course Detail page (assessment breakdown, materials, Ed posts) — v2.0-m1 Phase 07
- ✓ Deadlines page (calendar + filterable timeline + AI chat placeholder) — v2.0-m1 Phase 08
- ✓ Predict page (slider-based What-if GPA simulator) — v2.0-m1 Phase 09
- ✓ Digest page (daily intelligence digest with course grouping) — v2.0-m1 Phase 10
- ✓ Timetable page (weekly schedule view with dual-density grid) — v2.0-m1 Phase 11
- ✓ Settings page (token management, notifications, GPA target, profile) — v2.0-m1 Phase 12
- ✓ Anthropic-inspired design system (warm colors, paper texture, Rough.js, Source Serif 4 + Inter) — v2.0-m1 Phase 01
- ✓ i18n support (English + Chinese) — v2.0-m1 Phase 01
- ✓ Real course data integration (5 USYD courses from Obsidian) — v2.0-m1 Phase 11.1

**M2 — Backend Core (Phases 13-17):**
- ✓ Supabase PostgreSQL with 15-table schema + 60 RLS policies — v2.0-m2 Phase 13
- ✓ Supabase Auth (frontend supabase-js + Python JWT validation) — v2.0-m2 Phase 13
- ✓ Token encryption (AES-256-GCM) — v2.0-m2 Phase 13
- ✓ Docker Compose local development — v2.0-m2 Phase 13
- ✓ Canvas adapter with rate limiting, pagination, circuit breaker — v2.0-m2 Phase 14
- ✓ Ed Discussion adapter with defensive Pydantic parsing — v2.0-m2 Phase 14
- ✓ Ed Lessons adapter for lesson content and assignments — v2.0-m2 Phase 14
- ✓ Unit Outline HTML parser with weight-sum validation — v2.0-m2 Phase 14
- ✓ GPA/WAM calculation with What-if simulation and target path planner — v2.0-m2 Phase 15
- ✓ Deadline aggregation with SHA-256 deduplication (Canvas + Ed Lessons + Ed Discussion) — v2.0-m2 Phase 15
- ✓ Ed Discussion filtered by endorsed/staff-answered — v2.0-m2 Phase 15
- ✓ Course materials unified view + keyword search — v2.0-m2 Phase 15
- ✓ 13 REST API endpoints matching M1 OpenAPI contracts — v2.0-m2 Phase 15
- ✓ Background sync engine (grades 15min, deadlines 1h, modules daily, outline per-semester) — v2.0-m2 Phase 16
- ✓ Tiered deadline reminders (72h/24h/3h) — v2.0-m2 Phase 17
- ✓ GPA risk alert on trajectory deviation — v2.0-m2 Phase 17
- ✓ Daily academic digest (rule-based) — v2.0-m2 Phase 17
- ✓ Token expiration warnings — v2.0-m2 Phase 17
- ✓ Deduplication across data sources (SHA-256) — v2.0-m2 Phase 15

**M3 — AI/MCP/Skills (Phases 18-21):**
- ✓ AI-extracted high-value info from Ed Discussion — v2.0-m3 Phase 18
- ✓ AI-enhanced digest with urgency scoring — v2.0-m3 Phase 18
- ✓ Deadline AI chat (MCP Agent) — v2.0-m3 Phase 19
- ✓ AI Q&A on course materials with cited sources — v2.0-m3 Phase 19
- ✓ AI unit review summaries — v2.0-m3 Phase 19
- ✓ SSE streaming for all AI responses — v2.0-m3 Phase 19
- ✓ Language preference setting (en/zh) — v2.0-m3 Phase 19
- ✓ AI batch translation into Chinese — v2.0-m3 Phase 19
- ✓ Skill system with auto-generated prompt templates — v2.0-m3 Phase 20
- ✓ Per-course skill differentiation (~50 skills) — v2.0-m3 Phase 20
- ✓ MCP server for Claude Desktop — v2.0-m3 Phase 21
- ✓ Assignment ROI analysis — v2.0-m3 Phase 21

### Active

**M4 — Hardening:**
- ✓ Critical fixes (VoyageAI async, broken test imports, JWT secret defaults, Dockerfile) — v2.0-m4 Phase 22
- ✓ Code quality refactor (sync/tasks.py split, DRY consolidation, dead code removal) — v2.0-m4 Phase 23
- ✓ Build health green (mypy 0 errors, ruff 0 errors, tsc 0 errors, ESLint 0 warnings, pytest passes) — v2.0-m4 Phase 24
- ✓ Security & observability (security headers, HTTP access logging, error boundaries, rate limiting) — v2.0-m4 Phase 25
- [ ] Production deployment (Supabase + Railway + Vercel, Docker production image)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring and alerting

### Out of Scope

- Ed Discussion posting/replying — read-only policy, avoid polluting Ed ecosystem
- Canvas assignment submission — academic integrity risk
- Canvas quiz answering — academic integrity risk
- Homework ghostwriting / direct answers — academic integrity violation
- Social/chat features — irrelevant to GPA
- Course recommendations — out of GPA tracking scope
- Mobile-first design — desktop-first, mobile later
- Multi-university support — USYD-only
- AWS CDK / Lambda / API Gateway — replaced by Supabase + Railway + Vercel for MVP speed
- Interactive AI tutoring (TUTOR-01/02) — deferred to v2
- Personalized dashboard questionnaire — deferred to v2

## Context

- **University**: University of Sydney (USYD)
- **Target users**: USYD students across all faculties
- **3 user personas**: Emily (high-GPA business), Kevin (efficient CS), Sarah (lost freshman)
- **Data sources**: Canvas LMS API, Ed Discussion API (undocumented, ref: hschafer/edstem OSS), Ed Lessons API, USYD Unit Outline HTML
- **Existing docs**: BRD v2.6, TRD v2.5, frontend design brief, roadmap backlog
- **10 HTML prototypes**: Complete interactive prototypes in `prototype/` directory (~7000 lines, DESIGN_SYSTEM.md included)
- **Design aesthetic**: "学生书桌上最顺手的那本笔记" — stress-relief first, data second. 103 iterations refined.
- **Design libraries**: Lucide Icons, Rough.js 4.6.6, Rough Notation
- **Colors**: --dark (#141413), --cream (#faf9f5), --orange (#d97757), --blue (#6a9bcc), --green (#788c5d), --amber (#b08968), --card-bg (#f6f5f0)
- **Layout**: Three-column — icon sidebar (68px→224px on hover) | main content | right panel (300px, sticky)
- **Paper texture**: SVG fractalNoise grain overlay (opacity 0.12) + repeating ruled lines (opacity 0.02)
- **Hero design**: Data pushed below fold. First screen = greeting + encouragement + scroll prompt
- **MCP tools**: canvas-ed-mcp already configured in development environment
- **AI architecture**: MCP Agent (Opus 4.6 + MCP tools) for cross-platform research features; pre-collected data + Claude API for digest scoring
- **AiStudyMate integration**: Future partner platform (EXT-01) — Deadline AI chat serves as integration placeholder
- **v1.0 learnings**: Full rebuild preserving all requirements and key decisions from previous implementation
- **Ed API note**: No public docs; reference hschafer/edstem OSS + curl testing
- **Canvas Modules API**: Use `include[]=items` to avoid N+1 requests
- **Unit Outline source**: Scrape from USYD official HTML (not Canvas — may be incomplete)

## Constraints

- **Approach**: MVP speed priority — ship working product first, optimize in M4
- **Tech stack (backend)**: Python 3.12+, FastAPI, SQLAlchemy 2.0 async + asyncpg
- **Tech stack (frontend)**: Next.js, Tailwind CSS, TanStack Query v5, @supabase/supabase-js (auth only)
- **Tech stack (AI)**: Anthropic Claude API (Opus 4.6 for MCP Agent features, Sonnet for digest/scoring)
- **Tech stack (MCP)**: Python asyncio MCP server + canvas-ed-mcp tools
- **Tech stack (platform)**: Supabase (PostgreSQL + Auth + Realtime), Railway (Python backend), Vercel (Next.js frontend)
- **Type checking**: mypy --strict (backend)
- **Linting**: ruff (backend)
- **Testing**: pytest + pytest-asyncio (backend), key interaction tests (frontend, M1 only)
- **Package management**: uv (backend), pnpm 9+ (frontend)
- **Auth**: Supabase Auth (frontend supabase-js direct → Supabase; Python validates Supabase JWT)
- **Token storage**: AES-256-GCM encrypted in Supabase PostgreSQL
- **Architecture**: Hybrid — Supabase (DB + Auth managed layer) + Python Service (adapters, sync, MCP, AI logic layer) + Next.js (UI layer)
- **API strategy**: Contract-first — M1 defines OpenAPI contracts, Mock implements them, M2 backend implements same contracts → frontend zero-change on integration (auth flow is the only frontend change: mock JWT → Supabase session)
- **Read-only policy**: System never writes to external platforms
- **Sync frequencies**: Grades 15min, deadlines 1h, modules daily, Unit Outline per semester
- **AI quality gate**: F1 < 75% auto-fallback to rule engine
- **Desktop-first**: Mobile responsiveness deferred

## Milestone Structure

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M1: Frontend App** | 10 HTML → Next.js (Phases 1-12, 11.1) | ✅ Shipped |
| **M2: Backend Core** | Supabase + FastAPI + Adapters + Sync (Phases 13-17) | ✅ Shipped 2026-03-27 |
| **M3: AI/MCP/Skills** | Intelligence layer (Phases 18-21) | ✅ Shipped 2026-03-29 |
| **M4: Hardening** | Audit-driven fixes, build health, security, observability, deployment (Phases 22+) | 🚧 Active |

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full rebuild (delete src/ + frontend/) | v1.0 had structural issues; fresh start with prototype-first approach | ✓ Good — clean architecture, no legacy debt |
| 4-milestone structure | Frontend-first validates UX, backend implements proven contracts, AI/MCP is complex enough for own milestone, engineering last | ✓ Good — M1+M2 delivered in 11 days |
| Contract-first Mock API | M1 defines OpenAPI contracts that M2 implements — frontend zero-change on backend integration | ✓ Good — 13 endpoints matched contracts, zero frontend changes needed |
| Supabase hybrid architecture | Supabase handles DB+Auth+Realtime (saves ~40% M2 work), Python backend focuses on adapters/sync/MCP/AI, deploy to Railway+Vercel instead of AWS CDK | ✓ Good — M2 completed in 2 days with 15 tables + 60 RLS policies |
| Supabase Auth over JWT+bcrypt | Frontend uses supabase-js for auth flows (session refresh built-in), Python validates Supabase JWT for API requests — eliminates hand-rolled auth | ✓ Good — bridge pattern preserved all 26 M1 hooks unchanged |
| Frontend single API entry (no direct Supabase data queries) | All data queries go through Python API — preserves M1 hooks, unified caching/logging/error handling, avoids dual-client complexity | ✓ Good — clean separation confirmed |
| MCP Agent for AI features | Cross-platform research requires intelligent agent, not simple API+prompt — scattered data across Canvas/Ed/Lessons needs autonomous research | — Pending (M3) |
| Digest via pre-collect + Claude API | Digest doesn't need real-time MCP research; scheduled sync + Claude scoring is sufficient and cheaper | ⚠️ Revisit — rule-based digest shipped in M2, AI scoring in M3 |
| Rough.js fully preserved | Design aesthetics are a core differentiator — optimize performance later if needed | ✓ Good — 10 pages with consistent Rough.js aesthetic |
| Timetable page added | Prototype exists (timetable.html), moved from out-of-scope to active | ✓ Good — dual-density grid with overlap algorithm |
| Deadline AI chat (new) | Placeholder for AiStudyMate integration (EXT-01); currently serves as MCP Agent Q&A | — Pending (M3) |
| Desktop-first | Personal project / startup validation stage; mobile later | — Pending |
| MVP speed priority | Ship working product first, engineering polish in M4 | ✓ Good — M1+M2 in 11 days |
| Anthropic-inspired design | Warm, restrained, academic aesthetic — differentiates from typical EdTech | ✓ Good (validated through 103 prototype iterations + 10 pages) |
| Unit Outline from USYD HTML | Canvas may not have complete data | ✓ Good — CSS + positional fallback parser with weight-sum validation |
| Skill-based MCP agent | Each operation codified as reusable prompt template — per-course customization | — Pending (M3) |
| i18n English + Chinese | Target Chinese international student community at USYD | ✓ Good — all 10 pages fully bilingual |

## Current Milestone: v2.0-m4 Hardening

**Goal:** Fix all critical/high codebase audit findings, achieve green builds across all tools, and prepare for production deployment.

**Target features:**
- Critical fixes (VoyageAI blocking call, broken test imports, unsafe config defaults, Dockerfile)
- Build health green (mypy, ruff, tsc, ESLint, pytest — all zero errors)
- Security hardening (config fail-fast validation, configurable CORS, AI rate limiting)
- Observability foundation (HTTP access log, structlog context, error boundaries, health check 503)
- Code quality refactor (sync/tasks.py god module, DRY consolidation, dead code cleanup)
- Production deployment (Supabase + Railway + Vercel, Docker production image, CI/CD)

**Audit reference:** `docs/project/codebase_audit.md` (93 findings, score 5.8/10)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 — Phase 23 (Code Quality Refactor) complete. God module split into 7 domain modules, DRY consolidation via EdRequestMixin, dead code removal (~300 lines), resource leak fixes, health 503.*
