# UniBoard

## What This Is

UniBoard is a GPA maximization dashboard for University of Sydney students. It aggregates data from Canvas LMS, Ed Discussion, Ed Lessons, and Unit Outline pages into a single interface that shows students exactly what matters for their grades — real-time GPA tracking, unified deadlines, high-value discussion highlights, and AI-powered course material navigation. It runs as both an MCP server (for Claude Desktop power users) and a web dashboard (for everyone).

## Core Value

**Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place, eliminating the need to switch between platforms.**

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Real-time GPA/WAM tracking from Canvas grades
- [ ] What-if GPA simulator (adjust future scores, see GPA impact)
- [ ] Target GPA path planner (reverse-calculate required scores)
- [ ] Assessment weight visualization from Unit Outline HTML parsing
- [ ] Unified deadline view (Canvas + Ed Lessons + Ed Discussion, deduplicated)
- [ ] Course file/folder AI classification and navigation (Canvas Modules + Ed Lessons)
- [ ] Ed Discussion high-value post extraction (endorsed + staff-answered, rule-based)
- [ ] AI-powered high-value post extraction (exam tips, rubric info, deadline changes)
- [ ] Daily/weekly academic digest (rule-based aggregation of new deadlines, grades, posts)
- [ ] AI-enhanced digest with urgency scoring and GPA relevance
- [ ] Deadline reminder notifications (72h / 24h / 3h tiered)
- [ ] Deduplication across all data sources (SHA-256 based)
- [ ] GPA risk alert when trajectory deviates from target
- [ ] AI Q&A based on synced course materials (cite sources, no hallucination)
- [ ] Unit review: AI-generated structured review summary + community cheatsheet integration
- [ ] File search across all course materials
- [ ] 3-step onboarding (register → get tokens → paste tokens)
- [ ] Zero-install web access (browser-only, no extensions)
- [ ] MCP server entry point for Claude Desktop users

### Out of Scope

- Ed Discussion posting/replying — read-only policy, avoid polluting Ed ecosystem
- Canvas assignment submission — academic integrity risk
- Canvas quiz answering — academic integrity risk
- Homework ghostwriting / direct answers — academic integrity violation
- Social/chat features — irrelevant to GPA
- Course recommendations — out of GPA tracking scope for v1
- Interactive AI tutoring (Phase 4+) — deferred to post-v1
- AI homework coaching (Phase 4+) — deferred to post-v1
- Assignment ROI analysis (Phase 4+) — deferred to post-v1
- Personalized dashboard onboarding questionnaire (Phase 4+) — deferred to post-v1
- Cloud deployment — MVP runs locally only
- OAuth / AWS Cognito — using simple JWT + bcrypt for MVP

## Context

- **University**: University of Sydney (USYD)
- **Target users**: USYD students across all faculties — from anxious high-achievers to confused freshmen
- **3 user personas defined**: Emily (high-GPA business student), Kevin (efficient CS student), Sarah (lost freshman)
- **Data sources**: Canvas LMS API, Ed Discussion API (undocumented, reference hschafer/edstem OSS), Ed Lessons API, USYD Unit Outline HTML pages
- **Existing docs**: BRD v2.6 (32KB), TRD v2.5 (113KB), frontend design brief, roadmap backlog
- **API tokens**: Both Canvas and Ed tokens available for development/testing
- **Design aesthetic**: Anthropic/Claude-inspired — warm, paper-textured, restrained. Colors: dark near-black (#141413), cream (#faf9f5), warm orange (#d97757), soft blue (#6a9bcc), olive green (#788c5d)
- **Layout**: Three-column — narrow icon sidebar | main content | personal status panel
- **Competitive gap**: No existing product combines Canvas + Ed integration with GPA-focused information filtering
- **Ed API note**: No public documentation; reference hschafer/edstem OSS library + curl testing. zsh export may escape special characters in tokens.
- **Canvas Modules API**: Use `include[]=items` parameter to avoid N+1 requests
- **Unit Outline source**: Scrape from USYD official website HTML (not Canvas API — Canvas may be incomplete)
- **Three-source deadline aggregation**: Canvas + Ed Lessons + Ed Discussion, SHA-256 deduplication
- **AI quality gate**: F1 < 75% auto-fallback to rule engine (is_endorsed + is_staff_answered)
- **Sync frequencies**: Grades 15min, deadlines 1h, modules daily, Unit Outline once per semester
- **Read-only policy**: System never writes to external platforms

## Constraints

- **Timeline**: 2 weeks — aggressive, accept rough edges to ship all P0+P1+P2 features
- **Tech stack (backend)**: Python 3.12+, FastAPI, SQLAlchemy 2.0 async + asyncpg, PostgreSQL 16 (Docker)
- **Tech stack (frontend)**: Next.js, TanStack Query v5, Tailwind CSS
- **Tech stack (MCP)**: Python asyncio MCP server
- **Type checking**: mypy --strict
- **Linting**: ruff
- **Testing**: pytest + pytest-asyncio
- **Package management**: uv (backend), pnpm 9+ (frontend)
- **Auth**: Simple JWT + bcrypt (not Cognito) — migrate to Cognito post-MVP
- **Deployment**: Local only (Docker Compose) — no cloud deployment for MVP
- **Token storage**: AES-256-GCM encrypted in PostgreSQL (not Secrets Manager, cost reasons)
- **Architecture**: Dual-layer — MCP Engine (data acquisition) + Web Dashboard (user interface), sharing same service layer

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| P0+P1+P2 all in v1 | User wants complete feature set even with rough edges | — Pending |
| MCP + Web together | MCP serves as data layer, Web calls same services — avoids duplicate logic | — Pending |
| Local-only deployment | MVP validation before investing in cloud infrastructure | — Pending |
| Simple JWT auth over Cognito | Faster to implement, migrate to Cognito post-MVP | — Pending |
| Unit Outline from USYD HTML | Canvas may not have complete Unit Outline data | — Pending |
| Rule-based + AI fallback for Ed posts | AI quality gate (F1 < 75% → fallback to rule engine) ensures reliability | — Pending |
| Anthropic-inspired design | Warm, restrained, academic aesthetic — differentiates from typical EdTech | — Pending |

---
*Last updated: 2026-03-16 after initialization*
