# UniBoard v2.0

## What This Is

UniBoard is a GPA maximization dashboard for University of Sydney students. It aggregates data from Canvas LMS, Ed Discussion, Ed Lessons, and Unit Outline pages into a single interface that shows students exactly what matters for their grades — real-time GPA tracking, unified deadlines, high-value discussion highlights, and AI-powered course material research. The system features an MCP Agent architecture where Claude (Opus 4.6) autonomously researches across platforms using MCP tools to answer student questions with full context.

## Core Value

**Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place, eliminating the need to switch between platforms.**

## Requirements

### Validated

- [x] API contracts (OpenAPI 3.1 spec with 32 endpoints) — Validated in Phase 02: API Contracts & Mock Layer
- [x] Mock API layer (30 Route Handlers with realistic fixture data) — Validated in Phase 02: API Contracts & Mock Layer
- [x] TanStack Query hooks for all 12 data domains — Validated in Phase 02: API Contracts & Mock Layer

### Active

**GPA Core:**
- [ ] Real-time GPA/WAM tracking from Canvas grades (data delay < 15 min)
- [ ] What-if GPA simulator (adjust future scores, see GPA impact)
- [ ] Target GPA path planner (reverse-calculate required scores)
- [ ] Assessment weight visualization from Unit Outline HTML parsing
- [ ] Per-course WAM with grade band indicator (HD/D/CR/P/F) and percentage assessed

**Deadlines:**
- [ ] Unified deadline view (Canvas + Ed Lessons + Ed Discussion, SHA-256 deduplicated)
- [ ] Tiered deadline reminders at 72h, 24h, and 3h before due date
- [ ] GPA risk alert when grade trajectory deviates from target
- [ ] Deadline AI chat — MCP Agent answers assignment questions with cross-platform context (placeholder for future AiStudyMate integration)

**Intelligence:**
- [ ] Ed Discussion high-value post filtering (endorsed + staff-answered, rule-based)
- [ ] AI-extracted high-value info from Ed Discussion (exam scope, assignment clarifications, rubric details, deadline changes) — MCP Agent
- [ ] Daily academic digest (rule-based aggregation + Claude API urgency scoring)
- [ ] Deduplication across all data sources (SHA-256)

**Files & Materials:**
- [ ] Course folders with AI-generated descriptions (Canvas Modules + Ed Lessons unified)
- [ ] Keyword search across all course materials
- [ ] AI Q&A on course materials with cited sources — MCP Agent cross-platform research
- [ ] AI unit review summaries (key concepts, common mistakes, exam scope) — MCP Agent

**Platform & Onboarding:**
- [ ] 3-step onboarding (register → get tokens → paste tokens)
- [ ] Zero-install web access (browser-only)
- [ ] MCP server for Claude Desktop users (PLAT-03)
- [ ] Token expiration warnings and re-authentication guidance

**Skill System (MCP Agent):**
- [ ] Auto-generate prompt template skill after first successful API exploration
- [ ] Subsequent executions load generated skill instead of re-exploring
- [ ] Per-course skill differentiation (different material organization patterns)
- [ ] ~50 skills across data collection, data processing, AI analysis, user actions

**Frontend Pages (10 pages from HTML prototypes):**
- [x] Auth page (login + register) — Validated in Phase 03: Auth Page
- [x] Setup page (3-step API token onboarding) — Validated in Phase 04: Setup Page
- [ ] Dashboard (hero welcome, stats row, course grades, deadline timeline, assessment weights)
- [ ] Courses (card grid + grade overview)
- [ ] Course Detail (assessment breakdown, materials, Ed posts)
- [ ] Deadlines (calendar + filterable timeline + AI chat)
- [ ] Predict (slider-based What-if GPA simulator)
- [ ] Digest (daily intelligence digest)
- [ ] Timetable (weekly schedule view)
- [ ] Settings (token management, notifications, GPA target, profile)

**Design System:**
- [x] Anthropic-inspired aesthetic: warm colors, paper texture, Rough.js hand-drawn borders — Validated in Phase 01: Design System Foundation
- [x] Fonts: Source Serif 4 (headings) + Inter (body) — Validated in Phase 01: Design System Foundation
- [x] Rough Notation animated text annotations — Validated in Phase 01: Design System Foundation
- [ ] All animations, transitions, and interactions from HTML prototypes preserved pixel-perfect

**Infrastructure:**
- [ ] PostgreSQL with full schema (users, courses, grades, deadlines, Ed threads, materials, skills, encrypted tokens)
- [ ] Background sync engine (grades 15min, deadlines 1h, modules daily, Unit Outline per semester)
- [ ] Canvas adapter with rate limiting, pagination, circuit breaker
- [ ] Ed Discussion adapter with defensive Pydantic parsing
- [ ] Ed Lessons adapter for lesson content and assignments
- [ ] Unit Outline HTML parser with weight-sum validation
- [ ] Token encryption (AES-256-GCM)
- [ ] JWT + bcrypt authentication
- [ ] Docker Compose local development environment
- [x] i18n support (English + Chinese) — Validated in Phase 01: Design System Foundation

### Out of Scope

- Ed Discussion posting/replying — read-only policy, avoid polluting Ed ecosystem
- Canvas assignment submission — academic integrity risk
- Canvas quiz answering — academic integrity risk
- Homework ghostwriting / direct answers — academic integrity violation
- Social/chat features — irrelevant to GPA
- Course recommendations — out of GPA tracking scope
- Mobile-first design — desktop-first, mobile later
- Multi-university support — USYD-only
- OAuth / AWS Cognito — using simple JWT for now, migrate post-MVP
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
- **Tech stack (backend)**: Python 3.12+, FastAPI, SQLAlchemy 2.0 async + asyncpg, PostgreSQL 16 (Docker)
- **Tech stack (frontend)**: Next.js, Tailwind CSS, TanStack Query v5
- **Tech stack (AI)**: Anthropic Claude API (Opus 4.6 for MCP Agent features, Sonnet for digest/scoring)
- **Tech stack (MCP)**: Python asyncio MCP server + canvas-ed-mcp tools
- **Type checking**: mypy --strict (backend)
- **Linting**: ruff (backend)
- **Testing**: pytest + pytest-asyncio (backend), key interaction tests (frontend, M1 only)
- **Package management**: uv (backend), pnpm 9+ (frontend)
- **Auth**: Simple JWT + bcrypt
- **Token storage**: AES-256-GCM encrypted in PostgreSQL
- **Architecture**: Dual-layer — MCP Engine (data acquisition + AI research) + Web Dashboard (user interface)
- **API strategy**: Contract-first — M1 defines OpenAPI contracts, Mock implements them, M2 backend implements same contracts → frontend zero-change on integration
- **Read-only policy**: System never writes to external platforms
- **Sync frequencies**: Grades 15min, deadlines 1h, modules daily, Unit Outline per semester
- **AI quality gate**: F1 < 75% auto-fallback to rule engine
- **Desktop-first**: Mobile responsiveness deferred

## Milestone Structure

| Milestone | Scope | Description |
|-----------|-------|-------------|
| **M1: Frontend App** | 10 HTML → Next.js | Convert all prototypes to interactive app with Mock API (contract-first), i18n (EN+CN), Rough.js preserved |
| **M2: Backend Core** | From-scratch backend | FastAPI + SQLAlchemy, all adapters/services/sync, implement M1's API contracts |
| **M3: AI/MCP/Skills** | Intelligence layer | MCP Agent features (INTEL-02, FILE-03/04, Deadline AI chat), Skill system, PLAT-03 MCP Server |
| **M4: Engineering** | Production readiness | Testing (unit/integration/E2E), AWS deployment (CDK/Docker), monitoring, security, CI/CD |

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full rebuild (delete src/ + frontend/) | v1.0 had structural issues; fresh start with prototype-first approach | — Pending |
| 4-milestone structure | Frontend-first validates UX, backend implements proven contracts, AI/MCP is complex enough for own milestone, engineering last | — Pending |
| Contract-first Mock API | M1 defines OpenAPI contracts that M2 implements — frontend zero-change on backend integration | ✓ Good (OpenAPI spec + 30 route handlers + 12 hooks) |
| MCP Agent for AI features | Cross-platform research requires intelligent agent, not simple API+prompt — scattered data across Canvas/Ed/Lessons needs autonomous research | — Pending |
| Digest via pre-collect + Claude API | Digest doesn't need real-time MCP research; scheduled sync + Claude scoring is sufficient and cheaper | — Pending |
| Rough.js fully preserved | Design aesthetics are a core differentiator — optimize performance later if needed | — Pending |
| Timetable page added | Prototype exists (timetable.html), moved from out-of-scope to active | — Pending |
| Deadline AI chat (new) | Placeholder for AiStudyMate integration (EXT-01); currently serves as MCP Agent Q&A | — Pending |
| Desktop-first | Personal project / startup validation stage; mobile later | — Pending |
| MVP speed priority | Ship working product first, engineering polish in M4 | — Pending |
| Anthropic-inspired design | Warm, restrained, academic aesthetic — differentiates from typical EdTech | ✓ Good (validated through 103 prototype iterations) |
| Simple JWT over Cognito | Faster to implement; migrate post-MVP | — Pending |
| Unit Outline from USYD HTML | Canvas may not have complete data | — Pending |
| Skill-based MCP agent | Each operation codified as reusable prompt template — per-course customization | — Pending |
| i18n English + Chinese | Target Chinese international student community at USYD | — Pending |

---
*Last updated: 2026-03-22 — Phase 04 (Setup Page) complete*
