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
- [ ] Skill-based agent system: auto-generate prompt template "skills" after first successful API exploration
- [ ] Per-course skill differentiation (different courses organize materials differently)
- [ ] Skill auto-generation: AI explores → succeeds → summarizes optimal steps into reusable skill file
- [ ] ~50 skills covering data collection, data processing, AI analysis, and user actions

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
- **Layout**: Three-column — narrow icon sidebar (68px→224px on hover) | main content | right panel (300px, sticky)
- **Prototype**: `prototype/dashboard.html` — fully implemented dashboard page with Rough.js hand-drawn borders, paper grain texture, ruled lines background
- **Design libraries**: Lucide Icons, Rough.js 4.6.6 (hand-drawn card borders), Rough Notation (hand-drawn text annotations like circle/underline)
- **Fonts**: Inter (body/UI), Source Serif 4 (headings/display — serif, academic feel)
- **CSS Variables**: --dark (#e8ddd0 sidebar bg), --cream (#faf9f5 page bg), --orange (#d97757), --blue (#6a9bcc), --green (#788c5d), --amber (#b08968), --card-bg (#f6f5f0), --radius (14px), --radius-sm (8px)
- **Paper texture**: SVG fractalNoise grain overlay (opacity 0.12) + repeating ruled lines (opacity 0.02)
- **7 pages defined by sidebar nav**: Dashboard (done), Timetable, Courses, Deadlines, Predict, Digest, Settings
- **Dashboard components**: Hero welcome (greeting + date + encouragement), Stats row (WAM/Target/Alerts), Course Grades table, Deadline timeline (with urgency colors), Assessment weights donut chart, Right panel (Profile card, Calendar with deadline dots, Recent Activity feed)
- **Design philosophy (103 iterations)**: "学生书桌上最顺手的那本笔记" — stress-relief first, data second. Hero welcome occupies 100vh first screen (students shouldn't face a wall of data). Encouragement tone: casual friend, not slogan ("The COMP2017 lab and the stats quiz are done and behind you now.")
- **Rough.js usage**: Hand-drawn card borders, progress bars (roughCanvas.rectangle), donut chart (pure arc), timeline line, background doodles (stars, waves, dots — fixed layer, low opacity, notebook-margin-doodle feel)
- **Rough Notation usage**: Animated text annotations — underline weekday, circle "Week 3", highlight encouragement text, circle WAM number on hover. Staggered playback sequence.
- **Hero design decision**: Data pushed below fold. First screen = greeting + date + warm encouragement + "your dashboard ↓" scroll prompt with breathing text animation + bracket wrap + arrow bounce
- **Course Grades table**: 4 columns (Course | Assessed progress bar + % | Earned weighted % | Target grade badge). Hover: Rough Notation circles the grade + fade-in "see predicted grade →" link
- **Sidebar behavior**: Logo stays fixed position even when sidebar expands. Active item: orange-tinted background. Labels: opacity 0→1 on hover
- **Right panel**: Sticky, doesn't scroll with main content. Current WAM with hand-drawn circle annotation. Mini calendar with deadline dot indicators (orange-soft background on deadline days)
- **Competitive gap**: No existing product combines Canvas + Ed integration with GPA-focused information filtering
- **Ed API note**: No public documentation; reference hschafer/edstem OSS library + curl testing. zsh export may escape special characters in tokens.
- **Canvas Modules API**: Use `include[]=items` parameter to avoid N+1 requests
- **Unit Outline source**: Scrape from USYD official website HTML (not Canvas API — Canvas may be incomplete)
- **Three-source deadline aggregation**: Canvas + Ed Lessons + Ed Discussion, SHA-256 deduplication
- **AI quality gate**: F1 < 75% auto-fallback to rule engine (is_endorsed + is_staff_answered)
- **Sync frequencies**: Grades 15min, deadlines 1h, modules daily, Unit Outline once per semester
- **Read-only policy**: System never writes to external platforms
- **Skill system**: MCP server uses a skill-based agent pattern. Each "skill" is a prompt template that captures the optimal API call sequence for a specific operation (e.g., "collect deadlines for COMP2123"). Skills are auto-generated after the AI's first successful exploration of an operation, then reused deterministically. Different courses may need different skills because professors organize materials differently (Canvas Modules vs Ed Lessons, naming conventions, folder structures). ~50 skills expected across 4 dimensions: data collection, data processing, AI analysis, user actions.

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
| Skill-based MCP agent | Each MCP operation codified as a reusable prompt template after first exploration — avoids repeated trial-and-error, per-course customization | — Pending |

---
*Last updated: 2026-03-16 after initialization + skill system architecture decision*
