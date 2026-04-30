# UniBoard v3.0

## What This Is

UniBoard is a GPA maximization dashboard for University of Sydney students. It aggregates data from Canvas LMS, Ed Discussion, Ed Lessons, and Unit Outline pages into a single interface that shows students exactly what matters for their grades — real-time GPA tracking, unified deadlines, high-value discussion highlights, and AI-powered course material research. The frontend (10 pages, Rough.js design system) and Python backend (adapters, services, sync engine, notifications) are complete. The system features an MCP Agent architecture where Claude autonomously researches across platforms using MCP tools to answer student questions with full context.

## Core Value

**Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place, eliminating the need to switch between platforms.**

## Current State

**Shipped:** UniBoard v2.0 — Production Foundation complete (2026-04-25)
- 39 phases / ~140 plans / 262 commits / 6 weeks (2026-03-15 → 2026-04-25)
- M1 Frontend App — Phases 1-12, 11.1 (shipped 2026-03-25)
- M2 Backend Core — Phases 13-17 (shipped 2026-03-27)
- M3 AI/MCP/Skills — Phases 18-21 (shipped 2026-03-29)
- M4 Hardening — Phases 22-28 (shipped 2026-04-04)
- Production Hardening — Phases 29, 30, 31, 31.1, 32, 32.1, 33, 34, 38, 38.1, 38.2 (shipped 2026-04-04 → 2026-04-25)
- Audit verdict: `passed` (39/39 v2.0-scope phases complete)
- Archive: `.planning/milestones/v2.0-ROADMAP.md`, `.planning/milestones/v2.0-REQUIREMENTS.md`, `.planning/milestones/v2.0-MILESTONE-AUDIT.md`

**Starting:** v3.0 — UI Polish & Cohesion (Claude 美学叠加层) — opened 2026-04-27
- See `## Current Milestone` for goal, scope, hard constraints, reference materials
- Disposition of v2.0-residual candidate phases:
  - Phase 35 Push Notifications (NOTIFY-01..03) → **deferred to v3.1** (out of UI scope)
  - Phase 36 UX Polish (UXPOL-01..04) → **subsumed** into v3.0 NEWVIS-01..04 REQs
  - Phase 37 Sidebar Transform Refactor (REFACTOR-01..02) → **subsumed** into v3.0 SHARED-03 REQ (still absorbs backlog 999.1)
**Codebase:** ~34K LOC source (TypeScript + Python) + ~1K SQL, 326 source files
**Tests:** 451 backend tests + ~70 frontend component tests
**Tech stack:** Next.js 15 + FastAPI + Supabase (PostgreSQL + Auth) + APScheduler
**Deployment:** Railway (Python) + Vercel (Next.js) + Supabase (DB + Auth) + Sentry (error tracking)
**CI/CD:** GitHub Actions (separate backend/frontend pipelines) + Dependabot

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

**M4 — Hardening (Phases 22-28):**
- ✓ Critical fixes (VoyageAI async, broken test imports, JWT secret defaults, Dockerfile) — v2.0-m4 Phase 22
- ✓ Code quality refactor (sync/tasks.py split, DRY consolidation, dead code removal) — v2.0-m4 Phase 23
- ✓ Build health green (mypy 0 errors, ruff 0 errors, tsc 0 errors, ESLint 0 warnings, pytest passes) — v2.0-m4 Phase 24
- ✓ Security & observability (security headers, HTTP access logging, error boundaries, rate limiting) — v2.0-m4 Phase 25
- ✓ CI/CD pipeline (GitHub Actions with path-filtered triggers, Dependabot) — v2.0-m4 Phase 26
- ✓ Production deployment (Railway + Vercel + Supabase, Docker production image, Sentry) — v2.0-m4 Phase 26
- ✓ Frontend UX fixes (dashboard navigation, timetable borders, materials inline viewer) — v2.0-m4 Phase 27
- ✓ Deadlines page enhancement (card redesign, pin/delete, overdue highlighting, filter modes) — v2.0-m4 Phase 28

### Active

**v3.0 — UI Polish & Cohesion (Claude 美学叠加层):**

*Design tokens & motion system:*
- [ ] **DESIGN-01**: Color tokens migrated to oklch space with light/dark variants (existing hsl values preserved as fallback)
- [ ] **DESIGN-02**: Spacing scale (4/8/12/16/24/32/48/64) and elevation/shadow tokens defined and applied across shared components
- [ ] **DESIGN-03**: Motion timing constants (`cubic-bezier(0.165, 0.85, 0.45, 1)` ease-out; 150/250/400ms duration tiers) defined as CSS variables
- [ ] **MOTION-01**: All hover/focus/active transitions use motion constants (no inline `transition: all 0.3s ease`)
- [ ] **MOTION-02**: SSE streaming components (Digest, Predict, Deadlines AI chat) unified streaming-cursor + chunk-arrival animations

*Typography polish:*
- [ ] **TYPO-01**: 4-tier serif scale (hero / section / body / caption) with consistent line-height and letter-spacing tokens
- [ ] **TYPO-02**: Serif vs Inter usage clarified — serif for narrative content, Inter for UI chrome / data labels

*Shared component polish (Rough.js outer borders preserved):*
- [ ] **SHARED-01**: Card / Button / Input / Modal / Tooltip internal padding, focus ring, disabled state unified to design tokens
- [ ] **SHARED-02**: AI reply visual style (Digest / Deadlines / Predict) adopts no-bubble Claude-style flowing text with typing cursor
- [ ] **SHARED-03**: Sidebar transform-based positioning eliminates hover lag (subsumes Phase 37 / backlog 999.1; REFACTOR-01..02 mapped here)

*State coverage:*
- [ ] **STATES-01**: Loading skeletons for 10 pages styled in Rough.js aesthetic (no off-the-shelf shimmer)
- [ ] **STATES-02**: Empty states styled with restraint-first illustration + actionable CTA
- [ ] **STATES-03**: Error states (network / 401 / 500) styled with helpful recovery actions

*Accessibility:*
- [ ] **A11Y-01**: Focus visible ring on all interactive elements
- [ ] **A11Y-02**: Color contrast AAA on text, AA on UI chrome (audit + fix)
- [ ] **A11Y-03**: Aria-label / aria-describedby on icon-only buttons and complex widgets
- [ ] **A11Y-04**: Keyboard navigation on all pages (no mouse-only paths)
- [ ] **A11Y-05**: `prefers-reduced-motion` honored

*New-feature visual coverage (subsumes Phase 36 UX Polish):*
- [ ] **NEWVIS-01**: TokenStep skip-revalidate cached state UI (← Phase 36 UXPOL-03)
- [ ] **NEWVIS-02**: SuccessStep per-domain sync progress bars (← Phase 36 UXPOL-04)
- [ ] **NEWVIS-03**: AI Chat < 3 chars client-side validation message styled per design tokens (← Phase 36 UXPOL-01)
- [ ] **NEWVIS-04**: AI request failure shows specific backend error message (← Phase 36 UXPOL-02)

*Dark mode (optional, roadmapper evaluates):*
- [ ] **DARK-01**: Dark mode root tokens (warm-deep-brown `#2b2a27` background) defined
- [ ] **DARK-02**: Rough.js stroke color adapts to dark mode
- [ ] **DARK-03**: Paper texture opacity adapts for dark backgrounds

*Carried-over residual work from v2.0 closure (tracked in STATE.md, parallel to v3.0 — not in scope):*
- [ ] 6 `human_needed` UAT checkpoints (Phases 11.1, 26, 31, 33, 34, 38, 38.2)
- [ ] /check-alerts pipeline (Gmail MCP) — Phase 31.1-03
- [ ] SEED-002, SEED-003 (FK hygiene from PR #115/#117) — v3.1 candidates
- [ ] 2 on-branch quick-task PRs (260423-ebp, 260423-gir) — held pending Ed-lessons-sync-degraded debug

**Deferred to v3.1+:**
- Phase 35 Push Notifications (NOTIFY-01..03) — out of UI scope, separate milestone
- AI study suggestions / GPA path planning / RAG (from old "v3.0 — AI Core" placeholder)

### Out of Scope

- Ed Discussion posting/replying — read-only policy, avoid polluting Ed ecosystem
- Canvas assignment submission — academic integrity risk
- Canvas quiz answering — academic integrity risk
- Homework ghostwriting / direct answers — academic integrity violation
- Social/chat features — irrelevant to GPA
- Course recommendations — out of GPA tracking scope
- Multi-university support — USYD-only, deferred to v4.0+
- Mobile app / PWA — deferred to v4.0+
- OAuth Canvas integration — manual token sufficient for now
- AWS CDK / Lambda / API Gateway — replaced by Supabase + Railway + Vercel

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
| **v2.0 — Production Foundation** | M1+M2+M3+M4 + production hardening tail (39 phases, 1-38.2) | ✅ Shipped 2026-04-25 |
| **v3.0 — UI Polish & Cohesion** | Claude 美学叠加层 — design tokens, motion, typography, shared polish, states, a11y, new-feature visual, dark mode | 🚧 Active (opened 2026-04-27) |
| **v3.1+ — Notifications & AI Differentiation** | Push notifications, AI study suggestions, RAG improvements, GPA path planning | 📋 Backlog |

**v2.0 sub-milestones (archived):**
- M1 Frontend App — 10 HTML → Next.js (Phases 1-12, 11.1) ✅ shipped 2026-03-25
- M2 Backend Core — Supabase + FastAPI + Adapters + Sync (Phases 13-17) ✅ shipped 2026-03-27
- M3 AI/MCP/Skills — Intelligence layer (Phases 18-21) ✅ shipped 2026-03-29
- M4 Hardening — Build health, security, observability, deployment (Phases 22-28) ✅ shipped 2026-04-04
- Production Hardening tail — Phases 29-34, 31.1, 32.1, 38, 38.1, 38.2 ✅ shipped 2026-04-25

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
| **Supabase email confirmation: permanently OFF** | USYD's Mimecast Secure Email Gateway quarantines `uniboard.uk` sender mail with 3-hour digest delays, making signup-time confirmation untenable. Mitigated by Google OAuth as primary auth path (AUTH-HARDEN-01), USYD-aware registration banner (AUTH-HARDEN-02), password-reset resend button with 60s cooldown (AUTH-HARDEN-03). Local dev keeps confirmations ON for parity testing (`supabase/config.toml`); production keeps them OFF in Supabase Studio. See `docs/UniBoard_TRD_v2.md` §7.5 and §16.9 for full rationale. | ✓ Decision documented (Phase 32-03 strategic resolution + Phase 33 AUTH-HARDEN-04) |
| **Phase 38.2 force-dynamic reversal** | Phase 38 added `export const dynamic = "force-dynamic"` + `loading.tsx` Suspense fallback to drive RSC prefetch. Production observation revealed: (a) force-dynamic defeats Next.js 15 router cache — every sidebar click re-runs server RSC + prefetch; (b) `loading.tsx` rendered the full-page skeleton for ~2 s during prefetch waits, turning the invisible network wait into a visible skeleton flash. Fix: remove force-dynamic from 6 dashboard pages (Next.js auto-detects dynamic via `cookies()`/`auth.getSession()`), delete `loading.tsx`, set `experimental.staleTimes.dynamic = 30` for router-cache TTL. Result: skeleton-free sidebar nav restored. | ✓ Architectural correction (Phase 38.2 supersedes Phase 38 Truth #1) |
| **ORM cascade alignment with Supabase reality** | ORM declarations diverged from actual DB: many FKs declared NO ACTION at ORM level while Supabase schema had CASCADE. Aligned 18 FKs across 15 model files (PR #117) — ORM diff only; alembic + supabase migrations reverted after audit confirmed Supabase already CASCADE. SEED-002 / SEED-003 planted for follow-up (parent-table drift on 5 user_id FKs + passive_deletes refinement). | ✓ Good — discovered Supabase reality matched intent; ORM-only diff |

## Current Milestone: v3.0 — UI Polish & Cohesion (Claude 美学叠加层)

**Opened:** 2026-04-27 (re-scoped from auto-bootstrapped UX Polish + Notifications + Sidebar to UI-focused milestone per user direction)
**Branch:** `chore/milestone-v3.0-init` (planning) → per-phase feature branches
**Phase numbering:** Continue from v2.0 last phase (38.2) → v3.0 starts at Phase 39

**Goal:** 在保留 v2.0 已验证的 Rough.js 手绘美学（边框、Rough Notation 高亮、纸张纹理、103 次原型迭代验证的"学生书桌笔记"气质）前提下，把 Anthropic/Claude 美学的其他维度（设计令牌 oklch 化、cubic-bezier 缓动、衬线层次、a11y polish、暖深棕 dark mode、新功能视觉收口）叠加上去，让整体气质从"学生笔记本"演化为"学生笔记本 × thoughtful product"。

**Hard constraints (not touched in this milestone):**
- 🚫 Rough.js 手绘边框 — preserved (差异化灵魂)
- 🚫 Rough Notation 高亮 — preserved
- 🚫 纸张纹理（fractalNoise grain + ruled lines）— preserved
- 🚫 10 页主体视觉布局 — preserved (已 UAT)
- 🚫 TanStack Query hooks 接口 — 0 变动
- 🚫 后端 API + i18n — 不在 UI scope

**8 REQ categories (full list in REQUIREMENTS.md):**

| Category | Focus |
|---|---|
| `DESIGN-01..03` | oklch 颜色、阴影、间距、缓动函数常量 |
| `MOTION-01..02` | 全局 transition 统一 (`cubic-bezier(0.165, 0.85, 0.45, 1)`) |
| `TYPO-01..02` | Source Serif 4 4-tier 层次（hero/section/body/caption） |
| `SHARED-01..03` | Card/Button/Input/Modal 内部细节统一（外壳 Rough.js 保留）+ Sidebar transform 重构 |
| `STATES-01..03` | Loading/Empty/Error 三态统一 |
| `A11Y-01..05` | Focus visible / contrast / aria / 键盘 / reduced-motion |
| `NEWVIS-01..04` | TokenStep skip-revalidate / SuccessStep progress / AI chat validation (subsumes Phase 36 UXPOL) |
| `DARK-01..03` | 暖深棕 `#2b2a27` 背景 + Rough.js 适配 (optional, roadmapper evaluates) |

**Reference materials (4 of 9 from gallery — see `~/Downloads/claude-ui-libraries.html`):**

| Tier | Resource | Role |
|---|---|---|
| 🟢 Direct adoption | `anthropics/skills/skills/brand-guidelines` | DESIGN-01..03 source of truth (一手色板字体) |
| 🟡 Strong reference | `https://www.shadcn.io/theme/claude` | hsl→oklch conversion + dark mode color values |
| 🟡 Strong reference | `assistant-ui Claude Clone` | AI no-bubble reply pattern (SHARED-02) |
| 🔵 Light reference | `tweakcn` | oklch tuning tool (spike-time only, no code import) |

**Out-of-milestone references (5 of 9 from gallery — explicitly NOT used):**
- `jnahian/vscode-claude-theme` (VS Code, irrelevant)
- `Damienchakma/Open-claude` (already have SSE chat)
- `chihebnabil/claude-ui` (Nuxt stack incompatible)
- `VoltAgent/awesome-claude-design` (no new pages = no DESIGN.md template need)
- `OpenCoworkAI/open-codesign` (no slides/PDF generation)

**External inspiration docs (Context only, not code dependencies):**
- `~/Downloads/compass_artifact_wf-69687d8e-7507-4007-8393-a96ef153519f_text_markdown.md` — Anthropic 美学深度解析
- `~/Downloads/claude-ui-libraries.html` — 9-library curated gallery (4 used / 5 unused)

**Phase 35/36/37 disposition:**
- Phase 35 Push Notifications → **deferred to v3.1** (NOTIFY-01..03 not UI-layer work)
- Phase 36 UX Polish → **subsumed** into v3.0 NEWVIS-01..04 (UXPOL-01 → NEWVIS-03, UXPOL-02 → NEWVIS-04, UXPOL-03 → NEWVIS-01, UXPOL-04 → NEWVIS-02)
- Phase 37 Sidebar Transform Refactor → **subsumed** into v3.0 SHARED-03 (still absorbs backlog 999.1)

## Next Milestone Goals

After v3.0 ships, candidate v3.1+ themes (deferred from v3.0 scope):

- **v3.1 Notifications & Lifecycle:** Push notifications (NOTIFY-01..03), token expiry auto-remind, FK hygiene seeds (SEED-002, SEED-003)
- **v3.2+ AI Differentiation:** AI agent expansion, multi-step research, additional MCP tools, RAG improvements, GPA path planning
- **v4.0+ Platform Expansion:** Mobile app / PWA, multi-university support, OAuth Canvas integration
- **Schema Evolution:** Major DB schema migrations (currently stable at v2.0)

**v2.0 deferred items carried into v3.0 (tracked in STATE.md, parallel to v3.0 — not in scope):**
- 6 `human_needed` UAT checkpoints awaiting production walkthrough (Phases 11.1, 26, 31, 33, 34, 38, 38.2)
- Phase 31.1-03 Gmail MCP `/check-alerts` automated monitoring pipeline
- 2 on-branch quick-task PRs (260423-ebp, 260423-gir) held pending Ed-lessons-sync-degraded debug
- 14 open debug sessions (auth/setup UAT diagnostics)
- 3 dormant seeds: SEED-001 (react-hooks v7), SEED-002 (FK parent drift), SEED-003 (passive_deletes refinement)

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
*Last updated: 2026-04-27 — v3.0 milestone re-scoped from auto-bootstrapped "UX Polish + Notifications + Sidebar Refactor" to **UI Polish & Cohesion (Claude 美学叠加层)** per user direction. 8 REQ categories: DESIGN/MOTION/TYPO/SHARED/STATES/A11Y/NEWVIS/DARK. Phase 36 UXPOL subsumed into NEWVIS, Phase 37 REFACTOR subsumed into SHARED-03, Phase 35 NOTIFY deferred to v3.1. Hard constraint: Rough.js handcraft aesthetic preserved (差异化灵魂). Working branch: `chore/milestone-v3.0-init`.*
