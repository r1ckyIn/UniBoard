# Phase 1: Foundation & Data Acquisition - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema (PostgreSQL 16), JWT authentication (PyJWT + bcrypt), AES-256-GCM token encryption, and all 4 platform adapters (Canvas LMS, Ed Discussion, Ed Lessons, Unit Outline HTML parser). Docker Compose local development environment. All external data sources accessible and flowing into PostgreSQL.

Requirements: INFRA-01, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09

</domain>

<decisions>
## Implementation Decisions

### Course Cross-Platform Linking (Global Decision — applies to all phases)
- Use regex pattern `[A-Z]{4}\d{4}` to extract course codes from Canvas/Ed course names
- Course code + semester as composite unique key (e.g., COMP2017 + 2025S1)
- Auto-match Canvas courses with Ed courses by course code; unmatched courses are marked as unlinked and continue working with Canvas-only data
- User can manually link unmatched courses in Settings page (Phase 3)
- Include historical semesters (not just active enrollment) for historical GPA tracking
- Unit Outline linked by same course code extraction

### Ed Token Management (Global Decision)
- Ed Discussion and Ed Lessons share a single Ed API Token (one token covers both)
- User provides 2 tokens total: Canvas Token + Ed Token

### Token Validation (Global Decision)
- Validate tokens immediately on storage by making a test API call
- If validation fails, return error immediately — don't store invalid tokens
- This applies to both initial onboarding and token updates

### Courses Without Ed (Global Decision)
- Courses without Ed naturally degrade — show Canvas data only, Ed features absent
- No error, no warning, no prompt. Silent graceful degradation
- System doesn't require all courses to have Ed

### Adapter Error Handling — Canvas
- Production-grade resilience: sliding window rate limiter (read `X-Rate-Limit-Remaining` header) + exponential backoff retry + circuit breaker (5 consecutive failures → stop for 60s)
- Use `include[]=items` on modules endpoint to avoid N+1 requests
- Implement pagination follower (read `Link` header `rel="next"`)

### Adapter Error Handling — Ed
- Strict Pydantic validation on known fields + `model_config(extra='ignore')` for unknown fields
- Parse failure on individual items → log error + skip that item, don't crash the entire sync
- Graceful degradation: if Ed adapter fails entirely, system works with Canvas-only data

### Adapter Error Handling — Unit Outline
- Three-level fallback chain: Unit Outline HTML parse → Canvas assignment_groups API → user manual input
- Weight-sum validation: parsed weights must sum to approximately 100% (95-105% tolerance)
- Always store raw HTML for re-parsing if parser is updated

### Testing Strategy (Global Decision)
- Pure integration tests — all tests hit real APIs (Canvas, Ed) and real PostgreSQL
- No mocks — real I/O for maximum reliability
- Full layer coverage: adapters + authentication + encryption + ORM models + Alembic migrations + API endpoints
- Database: Docker temporary PostgreSQL container per test run (CI uses GitHub Actions services)
- Token storage: .env file locally, GitHub Secrets for CI
- Flaky test handling: auto-retry once on failure, mark as flaky if still fails (distinguish API downtime from code bugs)

### Logging & Observability (Global Decision)
- structlog with JSON output, detailed mode
- Log every external API call: URL, status code, duration, response data volume
- Log sync task lifecycle: start/complete/fail
- Log auth events: success/failure (never log passwords or tokens)
- Automatic sensitive data redaction: structlog processor filters fields containing token, password, secret → replaces with [REDACTED]

### Development Environment
- Docker Compose starts PostgreSQL only
- Backend runs locally with `uvicorn --reload` (faster hot-reload, easier debugging)
- Frontend runs locally with `pnpm dev` (Phase 3)
- No seed data needed — real API integration tests provide real data

### REST API Conventions (Global Decision)
- Unified response wrapper: `{"data": ..., "meta": {"timestamp": ...}}` for success
- Unified error format: `{"error": {"code": "...", "message": "...", "details": ...}}`
- RESTful plural nouns with versioned prefix: `/api/v1/courses`, `/api/v1/users`, `/api/v1/tokens`
- HTTP methods express actions (GET/POST/PUT/DELETE)

### Claude's Discretion
- Database migration strategy (one big vs incremental Alembic migrations)
- Project directory structure within src/
- pydantic-settings configuration layering (dev/test/prod)
- Environment variable naming conventions
- Exact circuit breaker implementation details
- Exact structlog processor chain configuration

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### System Architecture & Data Model
- `docs/UniBoard_TRD_v2.md` §3 — System architecture, dual-layer design
- `docs/UniBoard_TRD_v2.md` §4 — Data model, all table schemas
- `docs/UniBoard_TRD_v2.md` §12 — REST API specification

### Security & Authentication
- `docs/UniBoard_TRD_v2.md` §7 — Security implementation (token encryption, JWT auth)
- `.planning/research/PITFALLS.md` Pitfall 4 — Token encryption key management
- `.planning/research/PITFALLS.md` Pitfall 6 — python-jose → PyJWT critical fix

### Platform Adapters
- `docs/UniBoard_TRD_v2.md` §2 — MCP tool specifications (adapter interface reference)
- `docs/UniBoard_TRD_v2.md` §9 — Ed Lessons API validation results
- `docs/UniBoard_TRD_v2.md` §10 — Canvas Modules API
- `.planning/research/PITFALLS.md` Pitfalls 1-3 — Canvas rate limiting, Ed breaking changes, Unit Outline HTML fragility

### Technology Stack
- `.planning/research/STACK.md` — Corrected versions, library choices, version pinning strategy
- `.planning/research/STACK.md` "httpx vs aiohttp Decision" — httpx chosen over aiohttp
- `.planning/research/STACK.md` "Critical Library Corrections" — PyJWT, updated versions

### Local Development
- `docs/UniBoard_TRD_v2.md` §18 — Local development environment setup

### Error Handling
- `docs/UniBoard_TRD_v2.md` §14 — Error handling patterns
- `.planning/research/PITFALLS.md` Pitfall 11 — SQLAlchemy async session lifecycle

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No source code exists yet — Phase 1 is the first implementation phase
- `prototype/dashboard.html` — Frontend prototype (informational only, not relevant to Phase 1 backend)

### Established Patterns
- No patterns established yet — Phase 1 will set the conventions for all subsequent phases

### Integration Points
- Phase 2 services will import adapters and call their methods
- Phase 2 sync engine will orchestrate adapter calls on configured intervals
- Phase 3 frontend will consume REST API endpoints defined in Phase 1

</code_context>

<specifics>
## Specific Ideas

- Ed API is undocumented — reference hschafer/edstem OSS library + curl testing for endpoint discovery
- zsh may escape special characters in tokens — use .env file with pydantic-settings, not shell export
- Canvas Modules API: always use `include[]=items` parameter
- Ed field name differences from hschafer/edstem: `content` not `passage`, `number` not `lesson_number` — codify as explicit mapping constants

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-data-acquisition*
*Context gathered: 2026-03-16*
