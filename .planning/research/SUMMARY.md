# Research Summary: UniBoard

**Domain:** University Academic Dashboard (GPA Maximization, LMS Integration)
**Researched:** 2026-03-16
**Overall confidence:** HIGH

## Executive Summary

UniBoard is a data aggregation dashboard that pulls academic data from Canvas LMS, Ed Discussion, Ed Lessons, and USYD Unit Outline HTML pages, normalizes it into a local PostgreSQL store, and serves it through both a web dashboard (Next.js) and an MCP server (Claude Desktop). The architecture follows a well-established "sync-and-serve" pattern: background jobs periodically fetch data from upstream APIs at varying frequencies (grades every 15 min, deadlines hourly, modules daily, Unit Outlines per semester), and API requests serve from the local database rather than hitting upstream APIs in real-time.

The existing TRD v2.5 (113KB) is exceptionally thorough -- it defines abstract adapter interfaces, concrete service layer implementations, full REST API specs, data models, frontend routing, and error handling strategies. The architecture is sound and well-considered. The main research findings are: (1) the component layering and data flow patterns are correct for this domain, (2) several library versions in the TRD are outdated and need updating, (3) the build order has clear dependency chains that map naturally to GSD phases, and (4) the most dangerous pitfalls are around Canvas rate limiting, Ed API instability (undocumented), and GPA calculation accuracy.

**Critical library corrections identified by stack research:**
- **python-jose MUST be replaced with PyJWT** -- abandoned 3+ years, 8 security warnings, officially deprecated by FastAPI docs
- **Next.js 16.1+** (not "14+") -- v16 shipped Oct 2025 with stable Turbopack, React 19, and breaking changes to caching/middleware
- **Tailwind CSS 4.0+** (not "3+") -- v4 released Jan 2025, major rewrite with CSS-first config (no tailwind.config.js)
- **Recharts 3.8+** (not "2+"), **date-fns 4.1+** (not "3+"), **Alembic 1.18+** (not "1.14+"), **ruff 0.15+** (not "0.8+")
- **Recommended: httpx over aiohttp** for backend HTTP client -- better ergonomics, fewer deps, HTTP/2 support. Performance difference irrelevant at UniBoard's API call volume.

The competitive landscape has no product combining Canvas + Ed integration with GPA-focused intelligence. Atlas (800K+ users) integrates Canvas but not Ed. Better Canvas has a GPA calculator but no predictive features. UniBoard's unique differentiators are: What-if GPA simulator, three-source deadline aggregation, Ed Discussion intelligence extraction, and target GPA path planning.

## Key Findings

**Stack:** Python 3.12+/FastAPI 0.135+ + Next.js 16/React 19 + PostgreSQL 16. Critical fix: replace abandoned python-jose with PyJWT 2.10+. Update frontend deps to current versions (Tailwind v4, Recharts v3.8, date-fns v4.1). Recommended: httpx over aiohttp for HTTP client. MCP SDK v1.25+ (pin explicitly due to rapid version churn).

**Architecture:** Dual-layer sync-and-serve system with shared service layer between Web API and MCP server. Adapter abstraction pattern (LMSAdapter/DiscussionAdapter/LessonAdapter) is the right approach for testability and future extensibility. Background sync engine decouples user experience from upstream API latency.

**Critical pitfall:** python-jose is abandoned with 8 security vulnerabilities. Canvas API rate limiting (700 req/10s per token) must be handled at the adapter level from day one. Ed API has no public documentation and can break without notice -- defensive parsing is mandatory. SQLAlchemy async mode has subtle session lifecycle pitfalls (no lazy loading, single session per request).

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation & Data Models** - Database schema, ORM models, Alembic migrations, auth (JWT with PyJWT + bcrypt), project scaffolding
   - Addresses: PostgreSQL setup, User/Course/Grade/Deadline tables, token encryption
   - Avoids: Schema rewrites later (design upfront), python-jose security risk
   - Dependencies: None (pure foundation)

2. **Platform Adapters** - Canvas, Ed Discussion, Ed Lessons adapters with rate limiting and pagination
   - Addresses: Data acquisition from all external sources, Unit Outline HTML parsing
   - Avoids: Rate limiting pitfall (sliding window rate limiter), Ed API instability (defensive Pydantic validation)
   - Dependencies: Data models (Phase 1)

3. **Core Services & Sync Engine** - GPA calculation, deadline aggregation, course material unification, background sync
   - Addresses: GPA/WAM display, assessment weights, unified deadlines, high-value post extraction (rule-based)
   - Avoids: GPA calculation drift (extensive unit tests), dedup false positives (course_id in dedup key)
   - Dependencies: Adapters (Phase 2)

4. **Web API Layer** - FastAPI routes, REST endpoints for all services, error handling, degradation
   - Addresses: Frontend can start consuming data
   - Avoids: Over-coupling API to service internals, exposing docs in production
   - Dependencies: Services (Phase 3)

5. **Frontend Dashboard** - Next.js 16 app with GPA overview, deadline timeline, course details, What-if predictor, onboarding
   - Addresses: All user-facing features with Anthropic-inspired design
   - Avoids: Bundle bloat (dynamic imports), Tailwind v4 config confusion, stale data display
   - Dependencies: API endpoints (Phase 4)

6. **Intelligence & Notifications** - AI thread scoring, daily digest, risk alerts, MCP server
   - Addresses: Differentiator features (AI-enhanced filtering, proactive alerts)
   - Avoids: AI quality issues (F1 < 75% fallback to rule-based), cost overruns
   - Dependencies: All previous phases

**Phase ordering rationale:**
- Models -> Adapters -> Services is a strict dependency chain (services need adapters, adapters need models)
- API and Frontend are sequentially dependent (frontend needs API endpoints)
- Intelligence/AI is the least critical layer and has the highest uncertainty -- building it last allows the core product to ship without it
- MCP server shares the service layer, so it can be built anytime after Phase 3 (but is lower priority than the web dashboard)
- All 4 adapters (Canvas, EdDiscussion, EdLessons, UnitOutline) are independent and can be built in parallel within Phase 2

**Research flags for phases:**
- Phase 1 (Foundation): Standard patterns -- unlikely to need research. Use PyJWT not python-jose.
- Phase 2 (Adapters): HIGH risk -- Ed API is undocumented, Canvas pagination and rate limiting require careful implementation. Needs deeper research during phase planning.
- Phase 3 (Services): MEDIUM risk -- GPA calculation accuracy against USYD official WAM needs careful unit testing. Deadline dedup algorithm needs real-world validation.
- Phase 5 (Frontend): MEDIUM risk -- Next.js 16 + Tailwind v4 + shadcn/ui CLI v4 is a new combination. May encounter undocumented interactions.
- Phase 6 (Intelligence): HIGH risk -- AI quality is unpredictable. Rule-based fallback must be the default. MCP SDK version churn may require adaptation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies well-established. Version corrections verified against official release notes, PyPI, npm, and GitHub releases. python-jose -> PyJWT confirmed by FastAPI official docs. |
| Features | HIGH | BRD v2.6 + competitive analysis provides comprehensive feature landscape. Feature dependencies clearly mapped. No existing product combines Canvas + Ed integration. |
| Architecture | HIGH | TRD v2.5 architecture is sound and well-detailed. Sync-and-serve pattern is proven. Shared service layer between Web API and MCP is the right call. |
| Pitfalls | HIGH | Canvas rate limiting is well-documented. Ed API instability is based on first-hand verification. Library version issues confirmed against current releases. SQLAlchemy async pitfalls documented in official docs. |

## Gaps to Address

- **Ed API stability monitoring**: No existing mechanism to detect when Ed changes their API. Consider automated integration tests that run weekly against real Ed API endpoints.
- **Canvas-Ed course linking algorithm**: TRD stores both IDs but doesn't fully specify automatic linking during onboarding. Needs phase-specific research.
- **Tailwind v4 + shadcn/ui CLI v4 compatibility**: shadcn CLI v4 released March 2026 -- very recent. May need phase-specific testing to resolve any issues.
- **USYD WAM edge cases**: Non-standard credit point courses (12cp, 3cp), courses with no level number in code, courses spanning multiple semesters -- need manual testing with real data.
- **MCP SDK versioning**: The MCP Python SDK is rapidly evolving (v1.0 to v1.25+ in 6 months). Pin version explicitly and test on updates.
- **Unit Outline cross-year stability**: HTML parser validated against 2026-S1 pages. Need to check if older pages use the same DOM structure.
