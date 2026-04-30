# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Production Foundation

**Shipped:** 2026-04-25
**Phases:** 39 | **Plans:** ~140 | **Commits:** 262 | **Files changed:** 2,434 | **Lines:** +257K / -41K
**Timeline:** 2026-03-15 → 2026-04-25 (~6 weeks)
**Audit verdict:** `passed` (39/39 v2.0-scope phases complete)

### What Was Built

- **10-page Next.js dashboard** (M1) — Auth, Setup, Dashboard, Courses, Course Detail, Deadlines, Predict, Digest, Timetable, Settings — Anthropic-inspired design with Rough.js, paper texture, Source Serif 4 + Inter; full English+Chinese i18n
- **FastAPI + Supabase backend** (M2) — 15-table schema with 60 RLS policies; 4 platform adapters (Canvas, Ed Discussion, Ed Lessons, USYD Unit Outline); APScheduler sync engine; 13 REST endpoints contract-matched to M1 OpenAPI
- **Claude AI/MCP layer** (M3) — Cross-platform MCP Agent for Deadline Chat / Course QA / Unit Review; SSE streaming; 13 seeded skills with auto-generation; ROI ranking; MCP server for Claude Desktop access
- **Production hardening** (M4 + 29-34 + 38/38.1/38.2) — Multi-stage Docker; security headers; structured logging; slowapi rate limiting; GitHub Actions CI; Railway+Vercel+Supabase deploy; Sentry on both stacks; Resend custom SMTP; Google OAuth; AI features live with real Canvas/Ed data; RSC prefetch + HydrationBoundary first-load performance with router-cache + 30s staleTimes for skeleton-free navigation

### What Worked

- **Contract-first OpenAPI from M1** — Every M2 endpoint matched M1 fixture shapes exactly; zero frontend changes on backend integration. Single best architectural decision of v2.0.
- **Supabase hybrid + bridge pattern** — Managed DB+Auth saved ~40% M2 effort; bridge pattern preserved all 26 M1 hooks unchanged when swapping mock auth for real Supabase JWT.
- **One phase = one feature branch = one PR (squash merge)** — Hook-enforced; kept main clean across 262 commits, 30+ phase PRs. No merge conflicts of consequence.
- **TDD pipeline (`workflow.tdd_mode: true`)** — Wave 0 RED-state stubs (xfail strict=False) for Phase 32.1 sync fixes prevented half-built mock rigs and gave executors clean seams to land into.
- **GSD pattern-mapper auto-spawn** — `gsd-pattern-mapper` (plan-phase 7.8) caught existing-pattern reuse opportunities throughout brownfield phases (e.g. EdRequestMixin DRY, RoughCard withClientOnly wrapping, route adapter pattern).
- **Milestone-level audit > per-phase verify for hardening** — Phase 22-28 + 29-34 sub-milestones used one terminal audit instead of 12 separate verifies; caught cross-phase integration issues better.
- **`createPrefetchedPage` HOF (Phase 38)** — Generic Higher-Order Function with `<HydrationBoundary>` wrapping standardised RSC prefetch across 6 pages with zero per-page boilerplate; static-invariant test prevents drift.
- **Atomic phase-PR cycle** — Each phase ships its own VERIFICATION.md + UAT.md + SUMMARY.md before opening next phase; the audit at v2.0 close found 38/39 phases had VERIFICATION.md (only Phase 32 strategic-resolution exempt).

### What Was Inefficient

- **Mimecast email detour (Phase 32 → 32.1 → 33)** — Spent 3 plans (32-01/02/03) implementing Resend SMTP + branded templates + signup confirmation flow before discovering USYD Mimecast Secure Email Gateway quarantines new-domain emails with 3-hour digest delays. Pivoted to "email confirmation permanently OFF + Google OAuth as primary auth path" only after end-to-end E2E testing surfaced the failure. **Lesson:** Test deliverability against the real recipient domain (USYD Mimecast) BEFORE building UX flows that depend on inbox arrival.
- **Multiple force-dynamic iterations (Phase 38 → 38.1 → 38.2)** — Phase 38 added `export const dynamic = "force-dynamic"` + `loading.tsx` to drive RSC prefetch. Phase 38.1 closed a server-prefetch ↔ client-consumer parity gap. Phase 38.2 then **reversed** force-dynamic + deleted loading.tsx after production observation revealed the directive defeats Next.js 15 router cache and the loading.tsx Suspense fallback rendered visible 2-second skeleton flash. **Lesson:** Read Next.js 15 router cache + dynamic-detection semantics BEFORE applying directives; production observation (with `[RSC_DIAG]` Sentry breadcrumbs) is essential to validate architectural claims.
- **REQUIREMENTS.md traceability stale** — M4 statuses stayed "Pending" in `.planning/milestones/v2.0-REQUIREMENTS.md` until v2.0 close; manually fixed during archival. **Lesson:** Update traceability rows when each phase ships, not retroactively.
- **ORM vs Supabase schema drift discovered late (PR #117)** — Many FKs declared NO ACTION at ORM level while Supabase had CASCADE. Aligned 18 FKs across 15 model files only at v2.0 close. SEED-002/003 planted as follow-ups. **Lesson:** Add cross-source schema audit to milestone-audit checklist.
- **Some phase numbering churn** — Phase 11.1 inserted, 31.1 inserted, 32.1 inserted, 38.1 + 38.2 inserted. Decimals worked, but indicates plan-time scope under-estimation. **Lesson:** OK as a release valve; not a process problem.

### Patterns Established

- **`createPrefetchedPage` HOF + static-invariant prefetch-consumer parity test** — Reusable RSC pattern frozen as a contract; future RSC pages plug into the HOF and the test fails CI if a `useQuery` consumer drifts away from a server `prefetchQuery`/`fetchQuery`.
- **Wave 0 RED-state TDD with env-gated real-data harness** (Phase 32.1) — `xfail(strict=False)` stubs for Wave 1+ to flip to `strict=True`; module-level `pytestmark` gating real-data integration tests via env var; minimal stub bodies to avoid contradicting downstream executors.
- **Supabase JWT direct fixture generation** — Skip auth endpoint dependency in tests by generating Supabase-compatible JWTs in pytest fixtures.
- **Naive datetimes for asyncpg TIMESTAMP WITHOUT TIME ZONE** — tz-aware datetimes raise DataError; consistent project convention.
- **Lazy-import + patch-at-source** for sync tasks — `src.adapters.canvas` (source) not consumer module.
- **Route adapter pattern** — Legacy service output → contract-aligned response shape conversion in route handlers; service layer untouched.
- **Atomic phase boundaries** — Each phase produces SUMMARY + VERIFICATION + UAT + LEARNINGS before next phase opens.
- **Strategic-resolution status for blocked-by-external-reality phases** — Phase 32 `status: resolved_strategically` documented in 32-03-SUMMARY.md when Mimecast made the original goal infeasible; resolution path forwarded to Phase 33 AUTH-HARDEN-04. Better than fake-pass or fake-fail.
- **Single-file inline-comment audit trail** for cross-cutting decisions — `supabase/config.toml` carries the email-confirmation-OFF rationale inline so anyone reading the config knows WHY without hunting through TRD.

### Key Lessons

1. **Test against the real production environment, not isolated unit tests** — Mimecast quarantine was invisible to local Resend SMTP tests + Supabase Studio dashboard. Only end-to-end "send test email to a USYD Office365 address and check Junk + Held Messages 3 hours later" surfaced the issue. Future: every email-dependent feature gets a recipient-domain deliverability test before user-facing UX is built.
2. **Production observation drives architectural correction** — Phase 38.2 reversal was triggered by `[RSC_DIAG]` Sentry breadcrumbs showing `hof_completed` with `allSuccess: true` while user observed visible skeleton — diagnostic evidence forced re-reading Next.js 15 router cache semantics. Planning-time research can't substitute for production data.
3. **Atomic phase-PR cycle scales** — 30+ phase PRs across 6 weeks with hook-enforced branch discipline produced no merge conflicts. The discipline cost (one feature branch per phase) is far less than the unblocking cost of a multi-phase trunk merge.
4. **Strategic resolution > fake completion** — When external reality (Mimecast, Next.js cache semantics, Supabase FK reality) blocks the original phase goal, document the strategic resolution path in SUMMARY.md `status` and forward to a successor phase. Don't mark "complete" on a goal you can't actually meet.
5. **Pattern-mapper is the brownfield quality multiplier** — `gsd-pattern-mapper` auto-spawn at plan-phase 7.8 catches existing-pattern reuse and prevents reinventing wheels. Never disable.
6. **Audit-driven hardening (M4) > spec-driven hardening** — Started M4 from a code audit (Sec/QUAL/CRIT/OPS reqs) rather than guessing what to harden. Result: zero "fixed thing nobody needed".
7. **Contract-first applies to ALL system interfaces** — OpenAPI for HTTP, AES-256-GCM key for storage, Supabase Auth bridge for auth, MCP tool spec for AI agents — every interface frozen before consumer implementation accelerated everything downstream.
8. **Decimal phase numbering as release valve** — 11.1, 31.1, 32.1, 38.1, 38.2 — let urgent gap-closure ship without re-numbering ROADMAP. Use sparingly but use freely when needed.

### Cost Observations

- Model mix: ~85% opus (`quality` profile globally — user preference: max quality, no token cap)
- Sessions: ~40+ (one per phase typically; some phases multi-session)
- Notable: Phase 5 (Dashboard, 11 plans) and Phase 33 (Token Lifecycle, 8 plans) were the heaviest. Phase 38.2 (architectural reversal, 2 plans) was the most insight-dense — small surface change, large semantic correction.
- v1.36+ features active throughout: TDD pipeline, plan-bounce, pattern-mapper, extract-learnings — measurable quality gain over v1.35 baseline (M1 ran on v1.32-1.34).

---

## Milestone: v2.0-m2 — Backend Core

**Shipped:** 2026-03-27
**Phases:** 5 | **Plans:** 13 | **Tests:** 149

### What Was Built
- Supabase Foundation: 15 tables, 60 RLS policies, Auth integration, FastAPI skeleton, AES-256-GCM encryption
- 4 platform adapters (Canvas, Ed Discussion, Ed Lessons, Unit Outline) with circuit breaker + rate limiting
- 5 service domains (GPA, Deadline, Materials, Intelligence, Search) with 13 REST endpoints matching M1 contracts
- APScheduler sync engine (4 intervals) with sync_history audit trail
- Notification system: tiered reminders, GPA risk alerts, daily digest, token health checks

### What Worked
- **Contract-first approach paid off**: M2 endpoints exactly matched M1 OpenAPI contracts — zero frontend changes needed
- **Supabase hybrid architecture**: DB+Auth managed by Supabase saved significant M2 effort — 15 tables + 60 RLS policies deployed in one phase
- **Bridge pattern for auth migration**: Preserved all 26 M1 hooks unchanged by syncing Supabase session to existing zustand store
- **Phase-per-PR discipline**: Each phase → feature branch → squash merge kept main clean
- **2-day M2 completion**: 5 phases in 2 days demonstrates that good M1 contracts + clear TRD make backend implementation fast

### What Was Inefficient
- **REQUIREMENTS.md traceability never updated**: All 52 statuses stayed "Pending" through entire M1+M2 — waste of traceability table
- **SUMMARY frontmatter inconsistency**: 4 plans missing requirements_completed — frontmatter was treated as optional
- **Broken test imports after User→Profile rename**: 3 integration test files still import removed symbols — should have been caught by CI or verification
- **Per-phase verify-work skipped**: Relied on milestone-level audit instead — caught same issues but later

### Patterns Established
- **Route adapter pattern**: Legacy service output → contract-aligned response shape conversion happens in route handlers, keeping service layer clean
- **JWT test auth pattern**: Generate Supabase-compatible JWT directly in test fixtures — no auth endpoint dependency
- **Lazy import + patch-at-source**: Sync tasks use lazy imports; tests patch at source module (e.g., `src.adapters.canvas`) not consumer
- **Naive datetimes for asyncpg**: TIMESTAMP WITHOUT TIME ZONE columns require tz-naive datetimes (asyncpg rejects tz-aware)

### Key Lessons
1. **Update traceability tables as you go** — retroactive updates are tedious and error-prone. Next milestone: check traceability status after each phase completion
2. **CI-equivalent checks in verification** — the User→Profile import breakage would have been caught if verification ran `pytest --collect-only` (import check without execution)
3. **Milestone-level audit > per-phase verify for small milestones** — 5 phases is small enough that one audit catches cross-phase integration issues better than 5 isolated verifications
4. **Contract-first is the right call for data-heavy apps** — M1 defining the OpenAPI contract was the single best architectural decision; M2 was essentially "implement these shapes"

### Cost Observations
- Model mix: ~80% opus (execution), ~20% sonnet (research/planning)
- Sessions: ~5 (one per phase, some phases merged)
- Notable: Phase 14 (adapters) was fastest — existing TRD adapter specs made implementation mechanical

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v2.0-m2 | 5 | 13 | First backend milestone; contract-first validation confirmed |
| v2.0 | 39 | ~140 | Full production foundation; atomic phase-PR cycle proven across 6 weeks; v1.37 spec-phase / spike / sketch adopted; v1.38 ingest-docs + plan-review-convergence available; pattern-mapper + plan-bounce + extract-learnings active throughout |

### Cumulative Quality

| Milestone | Tests | Backend Coverage | Frontend Tests |
|-----------|-------|-----------------|----------------|
| v2.0-m2 | 149 | ~60% (adapters + services) | M1 only (vitest stubs) |
| v2.0 | 451 backend + ~70 frontend | ~70% (services + sync + AI + adapters) | 6 RSC prefetch parity tests + component tests |

### Top Lessons (Verified Across Milestones)

1. Contract-first architecture eliminates integration friction between frontend and backend milestones
2. Supabase hybrid (managed DB+Auth) is the right trade-off for MVP speed — eliminates ~40% infra work
3. Atomic phase-PR cycle (one phase = one feature branch = one squash-merged PR) scales cleanly to 30+ PRs across 6 weeks
4. Production observation > planning-time research for architectural decisions involving framework cache semantics, network deliverability, third-party schema reality
5. Strategic resolution beats fake completion — document blocked-by-external-reality status in SUMMARY.md and forward to successor phase
6. Pattern-mapper is the brownfield quality multiplier — never disable
7. TDD with `xfail(strict=False)` Wave 0 stubs prevents contradictory mock rigs in multi-wave phases
8. Audit-driven hardening (review code, derive requirements) outperforms spec-driven hardening
