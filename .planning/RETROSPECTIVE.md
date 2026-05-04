# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

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

### Cumulative Quality

| Milestone | Tests | Backend Coverage | Frontend Tests |
|-----------|-------|-----------------|----------------|
| v2.0-m2 | 149 | ~60% (adapters + services) | M1 only (vitest stubs) |

### Top Lessons (Verified Across Milestones)

1. Contract-first architecture eliminates integration friction between frontend and backend milestones
2. Supabase hybrid (managed DB+Auth) is the right trade-off for MVP speed — eliminates ~40% infra work
