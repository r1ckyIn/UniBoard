# Phase 14: Platform Adapters - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Reliable data acquisition from all external platforms: Canvas LMS, Ed Discussion, Ed Lessons, and USYD Unit Outline HTML. Each adapter implements defensive parsing, circuit breaker, and rate limiting. Adapters return structured data to the service layer — they do NOT write to the database directly.

Requirements: INFRA-03, INFRA-04, INFRA-05, INFRA-06

</domain>

<decisions>
## Implementation Decisions

### Token Retrieval & Injection
- Adapters receive already-decrypted API tokens via constructor injection (`__init__(self, api_token: str, ...)`)
- Service layer (Phase 15) handles token retrieval from `profiles` table and AES-256-GCM decryption
- Adapters have zero knowledge of the database or encryption — pure HTTP clients
- This matches existing `CanvasAdapter.__init__(self, api_token: str, ...)` pattern

### Data Flow (Adapter → Service)
- Adapters return structured data: `list[dict]` or Pydantic models
- Adapters do NOT write to Supabase — that's the Service layer's job (Phase 15)
- Existing abstract base classes (`LMSAdapter`, `DiscussionAdapter`, `LessonAdapter`) define the return contract
- UnitOutlineParser returns parsed assessment weights as structured dict

### Resilience Strategy
- All adapters use existing `CircuitBreaker` (5 failures → open, 60s cooldown)
- Canvas: `CanvasRateLimiter` driven by `X-Rate-Limit-Remaining` header (throttle at 50 remaining)
- Ed APIs: `RetryConfig` (3 attempts, exponential backoff, retryable on 429/5xx)
- `execute_with_retry()` utility composes retry + circuit breaker

### Error Handling
- Token invalid (401/403) → raise `TokenInvalidError` (caller handles re-auth flow)
- Rate limited (429) → honour `Retry-After` header, then exponential backoff
- Circuit open → raise `UpstreamUnavailableError` (caller shows "service temporarily unavailable")
- Parsing failure → log warning, return partial data (graceful degradation, never crash)

### Unit Outline HTML Scraping
- Source: USYD official HTML (not Canvas — may be incomplete there)
- Graceful degradation: if HTML structure changes, return partial data + log structured warning
- Weight-sum validation: if extracted weights don't sum to 100%, flag but still return data
- Fallback: Canvas `assignment_groups` API as secondary source if HTML parsing fails completely

### Testing Strategy
- Unit tests with `httpx` mock transport (no real API calls)
- Pydantic model fixtures matching real API response shapes
- Ed Discussion: test `extra="ignore"` behaviour with undocumented fields
- UnitOutlineParser: test with saved HTML snapshots from real USYD pages
- No VCR/cassette recording — too brittle for undocumented APIs

### Claude's Discretion
- Internal method decomposition and helper functions
- Logging verbosity and structured log field names
- Exact Pydantic model field naming for Ed Lessons (undocumented API)
- Whether to add Ed Discussion XML content parsing in this phase or defer to Phase 15

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Adapter Code (MUST read — substantial implementation exists)
- `src/adapters/base.py` — Abstract interfaces: LMSAdapter, DiscussionAdapter, LessonAdapter
- `src/adapters/canvas.py` — Canvas adapter with rate limiting, pagination, circuit breaker (~236 lines)
- `src/adapters/ed_discussion.py` — Ed Discussion adapter with Pydantic parsing (~200 lines)
- `src/adapters/ed_lessons.py` — Ed Lessons adapter (~201 lines)
- `src/adapters/resilience.py` — CircuitBreaker, CanvasRateLimiter, RetryConfig, execute_with_retry (~171 lines)
- `src/parsers/usyd_outline.py` — Unit Outline HTML parser (~240 lines)
- `src/parsers/ed_document.py` — Ed Discussion XML content parser (~123 lines)

### TRD Specifications
- `docs/UniBoard_TRD_v2.md` §2 — MCP tool specifications (API contracts adapters must fulfil)
- `docs/UniBoard_TRD_v2.md` §3 — System architecture (adapter layer position)
- `docs/UniBoard_TRD_v2.md` §9 — Ed Lessons API verification results (actual response shapes)
- `docs/UniBoard_TRD_v2.md` §10 — Canvas Modules API (`include[]=items` to avoid N+1)
- `docs/UniBoard_TRD_v2.md` §11 — Test course data (course IDs for development)
- `docs/UniBoard_TRD_v2.md` §14 — Error handling patterns (retry, circuit breaker, degradation)

### Schema Reference
- `supabase/migrations/00000000000001_initial_schema.sql` — Target table schemas adapters must map to
- `src/models/` — SQLAlchemy models defining the data shapes services will persist

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CircuitBreaker`: Ready to use, per-platform instances
- `CanvasRateLimiter`: Sliding window driven by Canvas response headers
- `RetryConfig` + `execute_with_retry()`: Composable retry with circuit breaker
- `EdThreadResponse` Pydantic model: Defensive parsing with `extra="ignore"`
- Error types: `TokenInvalidError`, `UpstreamAPIError`, `UpstreamUnavailableError`, `RateLimitedError`

### Established Patterns
- httpx AsyncClient with per-adapter instances
- Canvas pagination via Link header parsing (`_LINK_NEXT_RE`)
- Structured logging via structlog with operation-specific fields
- Pydantic `ConfigDict(extra="ignore", strict=False)` for undocumented API resilience

### Integration Points
- Adapters instantiated by Service layer with decrypted tokens (Phase 15)
- Adapter return types feed into SQLAlchemy model creation (Phase 15)
- Sync Engine (Phase 16) calls adapters on schedule

### Key Assessment
- Existing code is **substantial** (~1290 lines) — this phase is about completing, testing, and hardening, not building from scratch
- Canvas adapter has pagination + rate limiting but may need `include[]=items` for modules
- Ed adapters may need additional endpoints per TRD §9 verification
- UnitOutlineParser needs real HTML snapshot testing

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard backend adapter patterns apply. Follow existing code conventions and TRD specifications.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-platform-adapters*
*Context gathered: 2026-03-26*
