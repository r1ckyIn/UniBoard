---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
stopped_at: Plan 04-01 complete, continuing Phase 4
last_updated: "2026-03-17T03:33:00Z"
last_activity: 2026-03-17 -- Plan 04-01 executed (2 tasks, 17 backend tests + 3 frontend tests, 40 files)
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 11
  completed_plans: 9
  percent: 82
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place
**Current focus:** Phase 4 — Intelligence & Skills (IN PROGRESS)

## Current Position

Phase: 4 of 4 (Intelligence & Skills)
Plan: 1 of 3 executed in current phase
Status: Plan 04-01 complete -- Notification/digest/risk-alert system (17 backend + 3 frontend tests, 40 files)
Last activity: 2026-03-17 -- Plan 04-01 executed (2 tasks, 20 new tests, 40 files)

Progress: [████████░░] 82%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 16.3 min
- Total execution time: 2.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3/3 | 34 min | 11.3 min |
| 2 | 2/2 | 34 min | 17.0 min |
| 3 | 3/3 | 63 min | 21.0 min |
| 4 | 1/3 | 24 min | 24.0 min |

**Recent Trend:**
- Last 5 plans: 02-02 (22 min), 03-01 (14 min), 03-02 (26 min), 03-03 (23 min), 04-01 (24 min)
- Trend: Full-stack plans (backend + frontend) take ~24 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Coarse granularity — 4 phases consolidating research's 6-phase suggestion
- [Roadmap]: Adapters in Phase 1 (not separate phase) — at coarse granularity, models without adapters are unverifiable
- [Roadmap]: Services + API combined in Phase 2 — API layer is thin (FastAPI routes delegating to services)
- [Roadmap]: Intelligence + Skills + MCP combined in Phase 4 — all are "differentiator" features with highest uncertainty
- [01-01]: Lazy engine init to avoid import-time side effects and enable test fixture overrides
- [01-01]: Single initial migration (001_initial_schema) for all 11 tables
- [01-01]: DiscussionThread.search_vector uses SQLAlchemy Computed() for GENERATED ALWAYS
- [01-01]: Session-scoped event loop for pytest-asyncio stability
- [01-02]: JWT jti claim for token uniqueness
- [01-02]: OAuth2PasswordRequestForm for login (form data, not JSON)
- [01-02]: Health endpoint at root /health (not /api/v1/health) per TRD
- [01-02]: B008 ruff suppression for FastAPI Depends() pattern
- [01-03]: Explicit params instead of **kwargs for httpx mypy --strict compatibility
- [01-03]: Per-platform CircuitBreaker instances (Canvas and Ed independent)
- [01-03]: Ed adapters return empty on network failure (graceful degradation, not exceptions)
- [01-03]: Course linking uses (course_code, semester) composite key with regex extraction
- [02-01]: Decimal(str(float)) for all GPA math to avoid IEEE 754 rounding drift
- [02-01]: JSONB for WhatIfScenario.scores_json for flexible per-assessment overrides
- [02-01]: Grade unique constraint (course_id, assessment_name) added for future sync upsert
- [02-01]: Sync config settings pre-added to Settings to avoid migration conflicts with Plan 02-02
- [02-02]: token_set_ratio with threshold 95 instead of fuzz.ratio at 80 for deadline dedup
- [02-02]: Naive datetimes (datetime.utcnow) for asyncpg TIMESTAMP WITHOUT TIME ZONE compatibility
- [02-02]: UNIBOARD_DISABLE_SYNC env var in lifespan to prevent APScheduler during tests
- [02-02]: mypy overrides for untyped APScheduler/Anthropic/rapidfuzz (follow_untyped_imports=false)
- [02-02]: AI description reads cached Module.ai_description column, never calls AI inline during requests
- [03-01]: Google Fonts @import before Tailwind @import to avoid CSS ordering warning in v4
- [03-01]: ResizeObserver polyfilled in vitest setup for jsdom compatibility
- [03-01]: roughjs mocked in component tests (jsdom lacks full SVG support)
- [03-01]: QueryProvider as separate client component for server/client boundary
- [03-01]: Login uses URLSearchParams with username field (not email) per OAuth2PasswordRequestForm
- [03-02]: CalendarGrid test uses timezone-agnostic assertion (date-fns format uses local time)
- [03-02]: WeightDonut allows course selection via dropdown when multiple courses
- [03-02]: DeadlineTimeline filters out past_due, shows only upcoming 7
- [03-03]: Zustand store for predictor state -- enables real-time WAM updates without API round-trips
- [03-03]: Memoized date range in DigestFeed to avoid re-renders from new Date() on every render
- [03-03]: CourseLinking simplified -- manual linking deferred (backend API not available)
- [03-03]: Digest is Phase 3 rule-engine version (AI-enhanced urgency scoring deferred to Phase 4)
- [03-03]: Password change UI disabled with 'coming soon' (backend endpoint not yet available)
- [04-01]: Naive datetimes for PushRecord pushed_at -- consistent with asyncpg TIMESTAMP WITHOUT TIME ZONE convention
- [04-01]: pgvector extension creation wrapped in DO block for graceful fallback when container not rebuilt
- [04-01]: Digest CronTrigger uses timezone='Australia/Sydney' for DST-correct 07:00 AEST scheduling
- [04-01]: Service factories in route files (not deps.py) for clean mypy typing
- [04-01]: DigestFeed dual-mode: API digest when available, falls back to Phase 3 client-side aggregation

### Pending Todos

None yet.

### Blockers/Concerns

- Ed API is undocumented and can break without notice — defensive parsing mandatory (Phase 1)
- python-jose replaced with PyJWT in 01-02 -- RESOLVED
- Tailwind v4 + shadcn/ui CLI v4 is a very recent combination — RESOLVED (pure custom components, no shadcn/ui)
- MCP SDK version churn (v1.0 to v1.25+ in 6 months) — pin version explicitly (Phase 4)

## Session Continuity

Last session: 2026-03-17T03:33:00Z
Stopped at: Completed 04-01-PLAN.md
Resume file: .planning/phases/04-intelligence-skills/04-01-SUMMARY.md
Next action: Execute Plan 04-02 (content embedding + semantic search)
