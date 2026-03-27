# Milestones

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
