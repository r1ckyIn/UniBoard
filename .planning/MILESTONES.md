# Milestones

## v2.0 — Production Foundation (Shipped: 2026-04-25)

**Scope:** 39 phases, ~140 plans across M1 Frontend, M2 Backend, M3 AI/MCP/Skills, M4 Hardening, and v3.0-bridge production hardening.
**Audit verdict:** `passed` (39/39 v2.0-scope phases complete)
**Audit:** `.planning/milestones/v2.0-MILESTONE-AUDIT.md`
**Archive:** `.planning/milestones/v2.0-ROADMAP.md`, `.planning/milestones/v2.0-REQUIREMENTS.md`
**Timeline:** 2026-03-15 → 2026-04-25 (~6 weeks)
**Stats:** 262 commits | 2,434 files changed | +257K / -41K lines | ~34K LOC source + ~1K SQL across 326 source files | 451 backend tests + ~70 frontend component tests

**Sub-milestones absorbed:**
- M1 Frontend App (Phases 1-12, 11.1 — shipped 2026-03-25)
- M2 Backend Core (Phases 13-17 — shipped 2026-03-27)
- M3 AI/MCP/Skills (Phases 18-21 — shipped 2026-03-29)
- M4 Hardening (Phases 22-28 — shipped 2026-04-04)
- Production Hardening (Phases 29, 30, 31, 31.1, 32, 32.1, 33, 34, 38, 38.1, 38.2 — shipped 2026-04-04 → 2026-04-25)

**Key accomplishments (8-12 highlights):**

1. **10-page dashboard (M1)** — 10 HTML prototypes (~7000 lines) converted to Next.js 15 with Anthropic-inspired warm design (Rough.js hand-drawn borders, Source Serif 4 + Inter, paper texture); full i18n English+Chinese; OpenAPI contract-first with 30 mock Route Handlers + 26 TanStack Query hooks
2. **Backend stack (M2)** — Supabase PostgreSQL with 15 tables + 60 RLS policies; Supabase Auth (bridge pattern preserves all 26 M1 hooks unchanged); 4 platform adapters (Canvas, Ed Discussion, Ed Lessons, USYD Unit Outline) with rate limiting + circuit breaker + defensive Pydantic; 13 REST endpoints matching M1 OpenAPI contracts (zero frontend changes); APScheduler sync engine (grades 15min, deadlines 1h, modules daily, outline per-semester); 149 backend tests
3. **AI/MCP layer (M3)** — Claude Agent with MCP tools for cross-platform research (Deadline Chat, Course QA, Unit Review); SSE streaming with Anthropic tool_use agent loop; 13 seeded skills with auto-generation from execution traces; ROI ranking; MCP server for Claude Desktop access; AI quality gate (F1 < 75% auto-fallback)
4. **Production hardening (M4)** — Multi-stage Docker + tini + non-root; fail-fast startup config validation; sync/tasks.py god module split into 7 domain modules (max 294 lines); EdRequestMixin DRY consolidation + 275 lines dead code removed; security headers (HSTS, CSP, X-Frame-Options); structured HTTP logging with request_id; slowapi rate limiting (60/min general, 10/min AI); error.tsx + global-error.tsx
5. **CI/CD + Production deploy (M4 P26 + 31.1)** — GitHub Actions split backend/frontend pipelines with path filters; Dependabot; Railway DOCKERFILE deploy + Vercel; Sentry on both stacks with release tracking, fingerprinting, tunnel route bypass, DBAPIError filtering, DB pool fix
6. **BFF proxy + E2E real data (Phase 30/31)** — All 25 mock Route Handlers converted to `proxyRequest` against Railway Python backend; Supabase JWT auto-forwarded; end-to-end user journey verified (register → token setup → first sync → real Canvas/Ed data); ANTHROPIC_API_KEY configured for Railway
7. **Sync integration fixes (Phase 32.1)** — All 5 SYNC-FIX requirements: Unit Outline weight extraction, Canvas grades current_mark/grade_letter, Ed Discussion ed_course_id matching, Canvas deadlines null-safe due_at handling, "Final Exam for:" / Concession / Supplementary shell-course filtering; Wave 0 RED-state TDD with env-gated real-data integration harness
8. **Auth hardening + Mimecast pivot (Phase 32 → 33)** — Resend custom SMTP + branded email templates shipped; Supabase email confirmation **permanently OFF** after USYD Mimecast Secure Email Gateway quarantine discovery (3-hour digest delays untenable); Google OAuth as primary auth path bypassing email entirely; USYD-aware registration banner; ResendForm 60s cooldown; recall email service with in-app-first + 14-day fallback strategy; full TRD §7.5/§16.9 documentation
9. **AI features live (Phase 34)** — AI study recommendations prioritizing assessments by weight; RAG course material QA on Ed Lessons with cited sources via numeric `[N]` citations; GPA path planner (`calculate_multi_course_path` with Decimal-precise math); APScheduler 7am AEST daily study-rec job; 30-min hot-set embedding worker
10. **First-load performance (Phase 38 + 38.1 + 38.2)** — RSC prefetch + HydrationBoundary across 6 dashboard pages eliminates skeleton flash on cached-auth revisit; Dashboard `/deadlines/upcoming → /courses/{nearest}` waterfall collapsed via `Promise.all`/`allSettled`; `createPrefetchedPage` HOF as reusable contract; static-invariant prefetch-consumer parity test prevents future drift; force-dynamic reversal + `loading.tsx` deletion (Phase 38.2 architectural correction) restored Next.js 15 router cache + 30s `staleTimes` for skeleton-free sidebar nav; Railway warmup cron
11. **ORM cascade alignment (PR #117)** — 18 FKs aligned across 15 model files to declare CASCADE matching actual Supabase schema reality; alembic migration reverted after audit found Supabase already CASCADE; SEED-002/003 planted for follow-up FK hygiene
12. **Hot-fixes shipped during v2.0** — AIEngine markdown code-fence stripping (PR #116), stale `canvas_course_id=NULL` Course row purge (PR #115), Ed Lessons due_at coercion + SAVEPOINT-isolated upsert (PR #114), Intel Mac GPU paint-cost fixes across Header backdrop-blur / Sidebar bleeding shadow / Timetable skeleton shimmer / Grid entry fade (PRs #89-92, INP 267→107 ms)

**Key Decisions:**

| Decision | Outcome |
|----------|---------|
| Full rebuild, contract-first OpenAPI mock + Supabase hybrid | ✓ Good — M1+M2 in 11 days, zero frontend changes on backend integration |
| MCP Agent for cross-platform AI research | ✓ Good — Phase 19/20/21 shipped |
| Anthropic-inspired warm design (Rough.js, paper texture) | ✓ Good — 103 prototype iterations, 10 pages consistent |
| **Supabase email confirmation: permanently OFF** | ✓ Documented (32-03 strategic resolution + 33 AUTH-HARDEN-04) — Mimecast 3-hour digest untenable for signup UX |
| **Phase 38 → 38.2 force-dynamic reversal** | ✓ Architectural correction restored router cache + skeleton-free nav |
| ORM cascade alignment with Supabase reality | ✓ Discovered FKs already CASCADE; ORM-only diff (PR #117) |

**Known Deferred Items (carried into v3.0):**

- 6 `human_needed` UAT checkpoints (Phases 11.1, 26, 31, 33, 34, 38, 38.2) — automated coverage uniformly green; awaiting human production walkthrough
- Phase 31.1-03 Gmail MCP `/check-alerts` automated monitoring pipeline — infrastructure deferred
- 2 on-branch quick-task PRs (260423-ebp purge stale Course rows, 260423-gir ON DELETE CASCADE) — held pending Ed-lessons-sync-degraded debug
- 14 open debug sessions (auth/setup UAT diagnostics) — all `diagnosed` or `investigating`
- 3 dormant seeds: SEED-001 (react-hooks v7), SEED-002 (FK parent drift), SEED-003 (passive_deletes refinement)
- 5 incomplete quick_tasks (`STATE.md` records)

**Out-of-scope phases deferred to v3.0:**
- Phase 35: Push Notifications (AIFEAT-04)
- Phase 36: UX Polish (UXPOL-01..04)
- Phase 37: Sidebar Transform Refactor (duplicate of backlog 999.1)

---

## v2.0-m2 Backend Core (Shipped: 2026-03-27)

**Scope:** Phases 13-17 (5 phases, 13 plans)
**Requirements:** 20/20 M2 requirements satisfied
**Tests:** 149 total (121 unit + 28 integration)
**Timeline:** 2 days (2026-03-26 → 2026-03-27)
**Audit:** tech_debt — no blockers, doc-level debt only

**Key accomplishments:**

1. **Supabase Foundation** — 15 tables, 60 RLS policies, Supabase Auth (email+password), FastAPI skeleton with JWT validation, AES-256-GCM token encryption, Docker Compose, frontend auth migration via bridge pattern
2. **Platform Adapters** — Canvas, Ed Discussion, Ed Lessons adapters + Unit Outline HTML parser, all with rate limiting, circuit breaker, defensive Pydantic parsing, 93 unit tests
3. **Core Services & API Routes** — GPA/WAM calculation, What-if simulation, target path planner, deadline aggregation with SHA-256 dedup, 13 REST endpoints matching M1 OpenAPI contracts, 22 integration tests
4. **Sync Engine** — APScheduler background sync (grades 15min, deadlines 1h, modules daily, outline per-semester), sync_history audit table, manual trigger endpoint
5. **Notifications & Digest** — Tiered deadline reminders (72h/24h/3h), GPA risk alerts on trajectory deviation, rule-based daily digest, token expiration health checks

**Known Tech Debt:**

- 3 integration test files import removed symbols (User, create_access_token) — will fail at import time
- REQUIREMENTS.md traceability table statuses all "Pending" — never updated
- 4 SUMMARY frontmatter missing requirements_completed fields
- Frontend API client still hits Next.js mock Route Handlers (expected M2/M3 boundary)

**Preceded by:** M1 Frontend App (Phases 1-12, 11.1)
**Next:** M3 AI/MCP/Skills (Phases 18-21)

---
