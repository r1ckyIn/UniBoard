---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Production Ready + AI Core
status: executing
stopped_at: Completed 30-02-PLAN.md
last_updated: "2026-04-06T05:07:05.830Z"
last_activity: 2026-04-06
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 5
  completed_plans: 4
  percent: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place
**Current focus:** Phase 30 — bff-proxy-conversion

## Current Position

Phase: 30 (bff-proxy-conversion) — EXECUTING
Plan: 2 of 3
Status: Ready to execute
Last activity: 2026-04-06

Progress: [█░░░░░░░░░] ~14%

## Milestones Completed

- **v2.0 UniBoard Full Stack** — Shipped 2026-04-05 (Phases 1-28, 35 plans, 451+ tests)
  - See: .planning/MILESTONES.md
  - Production: Railway + Vercel + Supabase (Sydney)

## Accumulated Context

### Decisions

- v2.0 deployed to production (Railway + Vercel + Supabase Sydney)
- Middleware removed from Next.js (Edge Runtime incompatibility on Vercel)
- Sentry org: yuan-qin (14-day Business trial started 2026-04-05)
- v3.0 roadmap: 7 phases (29-35), 18 requirements mapped
- [Phase 29]: Used instrumentation-client.ts (not deprecated sentry.client.config.ts) per Sentry SDK v10.x
- [Phase 29]: replaysSessionSampleRate: 0 + replaysOnErrorSampleRate: 1.0 for cost-effective error debugging
- [Phase 29]: Dynamic CSP connect-src reads NEXT_PUBLIC_API_URL origin at build time via new URL().origin
- [Phase 30]: Dynamic param routes use backendPath override for /api/v1/courses/${id}/... path construction
- [Phase 30]: POST routes read body via request.text() for format-agnostic forwarding to Python backend

### Roadmap Evolution

- Phase 32 (Production Email) can run in parallel with Phases 30-31 (independent dep chain)
- Phase 34 (AI Features Live) depends on Phase 31 (needs real data flow + ANTHROPIC_API_KEY)

### Pending Todos

None.

### Blockers/Concerns

- 17/29 frontend API Route Handlers return mock fixture data — Phase 30 resolves this
- ANTHROPIC_API_KEY not yet configured on Railway — Phase 31 resolves this
- Ed APIs are unofficial (reverse-engineered) — fragile, monitor during E2E verification
- Supabase built-in email has rate limits — Phase 32 resolves with Resend SMTP

## Session Continuity

Last session: 2026-04-06T05:07:05.825Z
Stopped at: Completed 30-02-PLAN.md
