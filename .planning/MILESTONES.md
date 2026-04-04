# Milestones

## v2.0 UniBoard Full Stack (Shipped: 2026-04-04)

**Phases completed:** 11 phases, 35 plans, 63 tasks

**Key accomplishments:**

- Ed Discussion thread sync task with post-sync AI batch evaluation, 20-thread batch limit, daily counter reset, and intelligence route refactored to read pre-computed scores
- Feedback endpoint with UPSERT, quality gate F1 auto-fallback at 75%, and bilingual action-oriented digest prompts with urgency sorting
- Shared FeedbackButton with thumbs up/down on digest highlights and Ed posts, plus SCORE_URGENCY_MAP for 1-5 score-to-color urgency display per D-12
- SSE streaming AIEngine with Anthropic tool_use agent loop, QAService MCP fallback, bilingual prompts, and DB migration for language/translation columns
- Batch AI translation service translating course names, module names, lesson/deadline titles into Chinese via Claude API, integrated into sync pipeline for non-English users
- SSE client utility with POST/GET async generators, useAiStream hook, DeadlineAiChat/AiCourseChat/UnitReviewSection streaming components replacing Coming Soon placeholders
- LanguageSection component with English/Chinese toggle that persists language_preference to backend and auto-switches next-intl locale
- RoughCard hand-drawn borders on 3 AI chat components + page-level auto-scroll for streaming unit review
- Skill + SkillExecution ORM models with JSONB workflow columns, lifecycle enums, and Alembic migration 007
- ToolExecutor routing 3 MCP tools to Canvas/Ed adapters with graceful error handling, plus SkillService managing two-phase lookup, trace recording, auto-generation from similar traces, lifecycle transitions, and 13 seeded skills
- ToolExecutor + SkillService wired into QAService replacing placeholder with real adapter calls, traced execution recording, and auto-generation checks on every agent_stream workflow
- ROI service ranking assignments by weight/difficulty ratio with historical grade scoring and AI fallback, exposed via REST API
- ROI ranking card in Predict page right panel with TanStack Query hook, priority indicators, and bilingual i18n
- Migrated VoyageAI embed() from blocking synchronous Client to native AsyncClient in both QAService call sites, verified by 2 new tests
- Fail-fast startup validation rejects known-insecure JWT/encryption/DB defaults in production mode; CORS origins configurable via CORS_ORIGINS env var
- Multi-stage Docker build with tini init, non-root user, and Railway PORT support for production deployment
- Split 1147-line sync/tasks.py god module into 7 domain modules (max 294 lines), all 20 unit tests passing
- EdRequestMixin extracts shared Ed adapter _request() logic; 275+ lines of dead code removed across 4 files, 4 imports, and 4 dependencies, fixing language_preference bug
- EdLessonsAdapter finally cleanup, dual engine disposal on shutdown, and health endpoint 503 for degraded state
- Zero ruff violations (55 fixed) and zero mypy --strict errors (18 fixed) with StrEnum migration and type-safe tool executor
- Zero-failure pytest suite via stale import fixes, Supabase Auth alignment, and DB-dependent test auto-skip infrastructure
- Fixed 8 TypeScript errors (missing course_id + beforeEach import) and 23 ESLint warnings (10 unused vars + 13 exhaustive-deps) across 12 frontend files
- Defense-in-depth security headers (HSTS, CSP, X-Frame-Options) and structured HTTP access logging with request_id propagation via structlog contextvars
- slowapi-based per-user rate limiting with JWT key extraction: 60 req/min general, 10 req/min AI endpoints, structured 429 ErrorResponse
- global-error.tsx
- Backend and frontend CI pipelines with path-filtered triggers, uv/pnpm caching, and Dependabot for automated dependency updates
- Railway DOCKERFILE deployment config with health checks, updated frontend .env.example, and bilingual deployment guide documenting all env vars for Railway + Vercel + Supabase
- Sentry error tracking integrated into both Python FastAPI backend and Next.js frontend with conditional initialization, CSP updates, and 4 unit tests
- 1. [Rule 1 - Bug] Fixed deadline type classification check
- Problem:
- Inline material viewer with right-side slide-out iframe panel, Escape/close dismissal, and Open-in-new-tab fallback on Course Detail page
- Deadline pin/delete persistence layer with Supabase migration, RLS policies, service methods, and two REST endpoints
- urgency.ts

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
