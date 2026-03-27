# Phase 14: Platform Adapters - Research

**Researched:** 2026-03-26
**Domain:** External API integration (Canvas LMS, Ed Discussion, Ed Lessons, USYD HTML scraping)
**Confidence:** HIGH

## Summary

Phase 14 is a **hardening and testing** phase, not a greenfield build. Approximately ~1,290 lines of adapter code already exist across 7 files (`src/adapters/base.py`, `canvas.py`, `ed_discussion.py`, `ed_lessons.py`, `resilience.py`, `src/parsers/usyd_outline.py`, `ed_document.py`). The existing implementations cover all four adapters (Canvas, Ed Discussion, Ed Lessons, Unit Outline) with circuit breaker, rate limiting, retry logic, and Pydantic defensive parsing already in place.

The primary work is: (1) adding the missing `get_assignment_groups` method to the Canvas adapter (needed as Unit Outline fallback per TRD SS3.4), (2) writing comprehensive unit tests with httpx mock transport for all adapters, (3) addressing edge cases identified during code review (e.g., Ed Discussion missing 401/403 handling, Ed adapters missing `TokenInvalidError` raises), and (4) creating HTML snapshot tests for `UnitOutlineParser`. Integration tests against real APIs already exist and pass.

**Primary recommendation:** Focus on unit tests (mock transport, no real API calls) and defensive hardening of existing code. Do NOT rewrite -- the adapters are well-structured and follow consistent patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Adapters receive already-decrypted API tokens via constructor injection (`__init__(self, api_token: str, ...)`)
- Service layer (Phase 15) handles token retrieval and AES-256-GCM decryption
- Adapters have zero knowledge of the database or encryption -- pure HTTP clients
- Adapters return structured data: `list[dict]` or Pydantic models; do NOT write to Supabase
- Existing abstract base classes (`LMSAdapter`, `DiscussionAdapter`, `LessonAdapter`) define the return contract
- All adapters use existing `CircuitBreaker` (5 failures -> open, 60s cooldown)
- Canvas: `CanvasRateLimiter` driven by `X-Rate-Limit-Remaining` header (throttle at 50 remaining)
- Ed APIs: `RetryConfig` (3 attempts, exponential backoff, retryable on 429/5xx)
- Token invalid (401/403) -> raise `TokenInvalidError`
- Rate limited (429) -> honour `Retry-After` header, then exponential backoff
- Circuit open -> raise `UpstreamUnavailableError`
- Parsing failure -> log warning, return partial data (graceful degradation, never crash)
- Unit Outline: USYD official HTML source (not Canvas)
- Weight-sum validation: flag but still return data if not 100%
- Canvas `assignment_groups` API as secondary source if HTML parsing fails completely
- Unit tests with `httpx` mock transport (no real API calls)
- No VCR/cassette recording -- too brittle for undocumented APIs
- Pydantic model fixtures matching real API response shapes
- Ed Discussion: test `extra="ignore"` behaviour with undocumented fields
- UnitOutlineParser: test with saved HTML snapshots from real USYD pages

### Claude's Discretion
- Internal method decomposition and helper functions
- Logging verbosity and structured log field names
- Exact Pydantic model field naming for Ed Lessons (undocumented API)
- Whether to add Ed Discussion XML content parsing in this phase or defer to Phase 15

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-03 | Canvas adapter with rate limiting (sliding window), pagination, and circuit breaker | Existing `CanvasAdapter` (~237 lines) already implements all three. Needs `get_assignment_groups` addition and comprehensive unit tests. |
| INFRA-04 | Ed Discussion adapter with defensive Pydantic parsing, graceful degradation when API changes | Existing `EdDiscussionAdapter` (~200 lines) with `EdThreadResponse` model using `extra="ignore"`. Needs hardening (401/403 handling) and unit tests. |
| INFRA-05 | Ed Lessons adapter for lesson content and assignment extraction | Existing `EdLessonsAdapter` (~201 lines) with TRD SS9.4 field corrections. Needs unit tests and verification against Pydantic model edge cases. |
| INFRA-06 | Unit Outline HTML parser with weight-sum validation and Canvas assignment_groups fallback | Existing `UnitOutlineParser` (~240 lines) with `validate_weights()`. Needs HTML snapshot fixtures, `get_assignment_groups` in Canvas adapter for fallback, and additional edge case tests. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | 0.28.1 | Async HTTP client for all adapters | Already in use; supports mock transport for testing |
| pydantic | 2.12.4 | Response validation for Ed APIs | `ConfigDict(extra="ignore")` for undocumented API resilience |
| structlog | 25.5.0 | Structured logging across all adapters | Consistent with project patterns |
| beautifulsoup4 | 4.14.3 | HTML parsing for Unit Outline | With lxml parser backend |
| lxml | 5.4.0 | HTML/XML parser backend | Fast C-based parser for BeautifulSoup |
| pytest | 8.4.2 | Test framework | With pytest-asyncio 0.26.0 for async tests |
| pytest-asyncio | 0.26.0 | Async test support | `asyncio_mode = "auto"` in pyproject.toml |

### Testing Support (Already Available)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| httpx (MockTransport) | 0.28.1 | Mock HTTP responses for unit tests | All adapter unit tests -- NO real API calls |
| pytest-cov | 6.3.0 | Coverage reporting | Final coverage verification |
| pytest-timeout | 2.4.0 | Test timeout enforcement | Prevent hanging tests (120s default) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| httpx MockTransport | respx | MockTransport is built-in, zero dependency; respx adds more ergonomic API but extra dep |
| httpx MockTransport | VCR.py / cassettes | Locked decision: VCR too brittle for undocumented Ed APIs |
| BeautifulSoup4 + lxml | selectolax / parsel | BS4 already working and well-tested; no reason to change |

**Installation:** No new packages needed -- all dependencies already in `pyproject.toml`.

## Architecture Patterns

### Existing Project Structure (DO NOT CHANGE)

```
src/
├── adapters/
│   ├── __init__.py          # Public exports
│   ├── base.py              # Abstract interfaces (LMSAdapter, DiscussionAdapter, LessonAdapter)
│   ├── canvas.py            # CanvasAdapter (rate limit, pagination, circuit breaker)
│   ├── ed_discussion.py     # EdDiscussionAdapter (Pydantic parsing, graceful degradation)
│   ├── ed_lessons.py        # EdLessonsAdapter (TRD SS9.4 field corrections)
│   └── resilience.py        # CircuitBreaker, CanvasRateLimiter, RetryConfig, execute_with_retry
├── parsers/
│   ├── usyd_outline.py      # UnitOutlineParser (HTML scraping, weight validation)
│   └── ed_document.py       # Ed XML document parser (shared by Discussion + Lessons)
├── schemas/
│   └── common.py            # Error hierarchy (TokenInvalidError, UpstreamAPIError, etc.)
└── models/                  # SQLAlchemy ORM models (adapters DON'T touch these)
tests/
├── unit/                    # Unit tests (mock transport, no DB, no real API)
│   └── (NEW) test_adapters/ # Phase 14 unit tests go here
└── integration/
    ├── test_canvas.py       # EXISTING -- real API tests (skip if no token)
    ├── test_ed_discussion.py # EXISTING -- real API tests
    ├── test_ed_lessons.py   # EXISTING -- real API tests
    └── test_outline_parser.py # EXISTING -- HTML fixture + real URL tests
```

### Pattern 1: Adapter Constructor Injection

**What:** All adapters receive a decrypted API token and optional base_url via `__init__`.
**When to use:** Every adapter instantiation.
**Example:**
```python
# Source: src/adapters/canvas.py (existing pattern)
class CanvasAdapter(LMSAdapter):
    def __init__(
        self,
        api_token: str,
        base_url: str = "https://canvas.sydney.edu.au/api/v1",
    ) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_token}"},
            timeout=30.0,
        )
        self._rate_limiter = CanvasRateLimiter()
        self._circuit = CircuitBreaker()
        self._retry = RetryConfig()
```

### Pattern 2: Per-Item Defensive Parsing (Ed Adapters)

**What:** Parse each API response item individually, skip failures, return partial data.
**When to use:** All Ed Discussion/Lessons response parsing.
**Example:**
```python
# Source: src/adapters/ed_discussion.py (existing pattern)
def _parse_threads(self, items: list[dict[str, object]]) -> list[dict[str, object]]:
    parsed: list[dict[str, object]] = []
    for item in items:
        try:
            thread = EdThreadResponse.model_validate(item)
            parsed.append(thread.model_dump())
        except ValidationError:
            thread_id = item.get("id", "unknown")
            logger.warning("ed_thread_parse_error", thread_id=thread_id)
    return parsed
```

### Pattern 3: httpx MockTransport for Unit Tests

**What:** Use httpx's built-in MockTransport to simulate API responses without network calls.
**When to use:** All unit tests for adapters.
**Example:**
```python
# Verified pattern from httpx docs
import httpx

def mock_canvas_transport(request: httpx.Request) -> httpx.Response:
    if "/courses" in str(request.url):
        return httpx.Response(
            200,
            json=[{"id": 69855, "name": "COMP2017"}],
            headers={"x-rate-limit-remaining": "500"},
        )
    return httpx.Response(404)

async def test_get_courses():
    client = httpx.AsyncClient(transport=httpx.MockTransport(mock_canvas_transport))
    adapter = CanvasAdapter.__new__(CanvasAdapter)
    adapter._client = client
    adapter._rate_limiter = CanvasRateLimiter()
    adapter._circuit = CircuitBreaker()
    adapter._retry = RetryConfig()
    courses = await adapter.get_courses()
    assert len(courses) == 1
```

### Pattern 4: Circuit Breaker + Rate Limiter Composition

**What:** Each adapter composes `CircuitBreaker` + `RetryConfig` (+ `CanvasRateLimiter` for Canvas).
**When to use:** All external API calls.
**Already implemented in:** `_request()` method of each adapter.

### Anti-Patterns to Avoid

- **Writing to database from adapters:** Adapters ONLY return data. Phase 15 services handle persistence.
- **Using VCR cassettes:** Locked decision -- Ed APIs are undocumented, cassettes would be brittle.
- **Hardcoding API response structures:** Use Pydantic models with `extra="ignore"` for forward compatibility.
- **Catching all exceptions silently:** Always log warnings with structured context before returning partial data.
- **Creating separate httpx clients per request:** Reuse the adapter's `_client` instance (connection pooling).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP mock transport | Custom request interceptor | `httpx.MockTransport` | Built into httpx, type-safe, zero overhead |
| Retry with backoff | Custom retry loop | Existing `RetryConfig` + `_request()` pattern | Already battle-tested in the codebase |
| Circuit breaker | Custom state machine | Existing `CircuitBreaker` dataclass | Already implemented per TRD SS14.7 |
| Rate limiting | Token bucket / fixed window | Existing `CanvasRateLimiter` (header-driven) | Canvas-specific, header-driven is more accurate |
| HTML table parsing | Regex extraction | BeautifulSoup + lxml | Robust against malformed HTML |
| XML content extraction | Regex / manual parsing | Existing `parse_ed_document()` | Already handles Ed XML dialect |

**Key insight:** Almost everything is already built. This phase adds tests and hardens edge cases, not new infrastructure.

## Common Pitfalls

### Pitfall 1: Ed Adapters Missing 401/403 -> TokenInvalidError

**What goes wrong:** Current Ed Discussion and Ed Lessons adapters do NOT raise `TokenInvalidError` on 401/403 responses. They return empty lists silently, making it impossible for the service layer to trigger re-auth flow.
**Why it happens:** Canvas adapter was hardened first; Ed adapters were written later and missed this pattern.
**How to avoid:** Add 401/403 checks in both Ed adapter `_request()` methods, matching the Canvas pattern.
**Warning signs:** `validate_token()` returns False but `get_threads()` returns `[]` instead of raising.

### Pitfall 2: Canvas Pagination with Absolute URLs

**What goes wrong:** Canvas Link header contains absolute URLs. If you use `self._client.request()` with an absolute URL as `path`, httpx will combine it with `base_url` incorrectly.
**Why it happens:** httpx treats path arguments as relative to base_url.
**How to avoid:** Already handled correctly via `self._client.send(self._client.build_request("GET", next_url))` pattern. Unit tests should verify this.
**Warning signs:** Second page returns 404 or wrong data.

### Pitfall 3: UnitOutlineParser HTML Structure Changes

**What goes wrong:** USYD periodically changes their Unit Outline HTML template, breaking CSS class selectors.
**Why it happens:** Web scraping is inherently fragile.
**How to avoid:** Dual strategy: CSS class selectors first (`assessment-type`, `assessment-weight`), positional fallback second. Weight regex `(\d+(?:\.\d+)?)\s*%` as last resort.
**Warning signs:** `_parse_soup` returns empty list but HTML has a visible table.

### Pitfall 4: Pydantic strict=False with int/str Coercion

**What goes wrong:** Ed API returns `id` as string sometimes, int other times. With `strict=True`, parsing would fail.
**Why it happens:** Undocumented APIs have inconsistent types across endpoints.
**How to avoid:** Already using `ConfigDict(strict=False)` -- unit tests should include fixtures with mixed types.
**Warning signs:** `ValidationError` on `id` field in production logs.

### Pitfall 5: httpx MockTransport and Base URL

**What goes wrong:** When using MockTransport, `base_url` is still applied. Mock handler must match the full URL including base_url prefix.
**Why it happens:** MockTransport processes the request after URL resolution.
**How to avoid:** In mock handlers, match on the full URL or use path patterns.
**Warning signs:** All mock tests return 404.

### Pitfall 6: Missing `get_assignment_groups` for Weight Fallback

**What goes wrong:** `GpaService` references `weight_source = "canvas_assignment_groups"` but no adapter method exists to fetch assignment groups from Canvas.
**Why it happens:** The TRD spec (SS3.4) defines the fallback but the adapter was scaffolded without this endpoint.
**How to avoid:** Add `get_assignment_groups(course_id)` to `CanvasAdapter` (endpoint: `GET /courses/{id}/assignment_groups`).
**Warning signs:** `weight_source` always shows "unknown" for courses without Unit Outline.

### Pitfall 7: Ed Discussion `get_thread` Wraps Response Differently

**What goes wrong:** `get_threads` extracts from `data["threads"]` list, but `get_thread` extracts from `data["thread"]` (singular). Different unwrapping logic.
**Why it happens:** Ed API uses different envelope shapes for list vs detail endpoints.
**How to avoid:** Already handled correctly in existing code. Unit tests should cover both response shapes.
**Warning signs:** `get_thread()` returns empty dict even for valid thread IDs.

## Code Examples

### Example 1: Adding `get_assignment_groups` to CanvasAdapter

```python
# New method for src/adapters/canvas.py
async def get_assignment_groups(self, course_id: str) -> list[dict[str, object]]:
    """Fetch assignment groups with weight info for a course.

    Canvas endpoint: GET /courses/:id/assignment_groups
    Used as fallback when Unit Outline parsing fails (TRD SS3.4).
    """
    return await self._paginate(
        f"/courses/{course_id}/assignment_groups",
        params={"per_page": 100},
    )
```

### Example 2: Hardening Ed `_request` with TokenInvalidError

```python
# Pattern to add to ed_discussion.py and ed_lessons.py _request() methods
from src.schemas.common import TokenInvalidError

# After getting response, before retry check:
if response.status_code in (401, 403):
    self._circuit.record_failure()
    raise TokenInvalidError("Ed Discussion")
```

### Example 3: Unit Test with httpx MockTransport

```python
# tests/unit/test_canvas_adapter.py
import httpx
import pytest
from src.adapters.canvas import CanvasAdapter
from src.adapters.resilience import CanvasRateLimiter, CircuitBreaker, RetryConfig


def _make_adapter(handler) -> CanvasAdapter:
    """Create a CanvasAdapter with mock transport."""
    adapter = CanvasAdapter.__new__(CanvasAdapter)
    adapter._base_url = "https://canvas.sydney.edu.au/api/v1"
    adapter._client = httpx.AsyncClient(
        base_url=adapter._base_url,
        transport=httpx.MockTransport(handler),
        headers={"Authorization": "Bearer fake-token"},
    )
    adapter._rate_limiter = CanvasRateLimiter()
    adapter._circuit = CircuitBreaker()
    adapter._retry = RetryConfig()
    return adapter


async def test_get_courses_success():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json=[{"id": 69855, "name": "COMP2017", "enrollment_term_id": 1}],
            headers={"x-rate-limit-remaining": "500"},
        )

    adapter = _make_adapter(handler)
    try:
        courses = await adapter.get_courses()
        assert len(courses) == 1
        assert courses[0]["name"] == "COMP2017"
    finally:
        await adapter.close()


async def test_token_invalid_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401)

    adapter = _make_adapter(handler)
    with pytest.raises(TokenInvalidError):
        await adapter.get_courses()
    await adapter.close()
```

### Example 4: HTML Snapshot Test for UnitOutlineParser

```python
# tests/unit/test_unit_outline_parser.py
from src.parsers.usyd_outline import UnitOutlineParser

# Snapshot saved from real USYD page (stripped to assessment table only)
COMP2017_SNAPSHOT = """
<html><body>
<table id="assessment-table" class="table table-striped table-bordered">
  <thead><tr><th>Assessment</th><th>Weight</th><th>Due</th></tr></thead>
  <tbody>
    <tr>
      <td class="assessment-type">Assignment 1: Bit Manipulation</td>
      <td class="assessment-weight">15%</td>
      <td class="assessment-due">Week 4</td>
    </tr>
    <tr>
      <td class="assessment-type">Assignment 2: Memory Allocator</td>
      <td class="assessment-weight">20%</td>
      <td class="assessment-due">Week 8</td>
    </tr>
    <tr>
      <td class="assessment-type">Assignment 3: Shell</td>
      <td class="assessment-weight">25%</td>
      <td class="assessment-due">Week 12</td>
    </tr>
    <tr>
      <td class="assessment-type">Final Exam</td>
      <td class="assessment-weight">40%</td>
      <td class="assessment-due">Exam period</td>
    </tr>
  </tbody>
</table>
</body></html>
"""

def test_parse_comp2017_snapshot():
    parser = UnitOutlineParser()
    items = parser.parse(COMP2017_SNAPSHOT)
    assert len(items) == 4
    assert parser.validate_weights(items) is True
    total = sum(i.weight for i in items)
    assert abs(total - 1.0) < 0.01
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| requests (sync) | httpx (async) | Already done | Async throughout; MockTransport for testing |
| Manual JSON parsing | Pydantic model_validate | Already done | Type-safe, `extra="ignore"` for resilience |
| No error hierarchy | UniboardError hierarchy | Phase 13 | Structured error handling with status codes |
| No circuit breaker | CircuitBreaker dataclass | Phase 13 | Prevents cascading failures |

**Deprecated/outdated:**
- `aiohttp`: TRD mentions aiohttp for Unit Outline fetch but codebase uses httpx. Use httpx consistently.
- `hschafer/edstem` field names: Use corrected field names per TRD SS9.4 (content not passage, number not lesson_number, user_id not creator_id).

## Open Questions

1. **Ed Discussion XML content parsing scope**
   - What we know: `parse_ed_document()` in `src/parsers/ed_document.py` already exists and works
   - What's unclear: Should this phase integrate XML parsing into `EdDiscussionAdapter.get_thread()` return value, or leave it for Phase 15 services?
   - Recommendation: Claude's discretion per CONTEXT.md. Recommend **deferring** to Phase 15 -- adapters should return raw data, services transform it.

2. **Canvas announcements endpoint**
   - What we know: TRD SS2.1 lists `canvas_list_announcements` as implemented, but `CanvasAdapter` has no `get_announcements()` method
   - What's unclear: Whether announcements are needed in this phase or Phase 15
   - Recommendation: Out of scope for Phase 14 -- only INFRA-03 through INFRA-06 requirements are in scope. Announcements can be added when needed.

3. **Real USYD HTML snapshot freshness**
   - What we know: Integration test uses `OUTLINE_URL = "https://www.sydney.edu.au/units/COMP2017/2026-S1C-ND-CC"` which may change
   - What's unclear: How often USYD changes their HTML structure
   - Recommendation: Save a real HTML snapshot file (e.g., `tests/fixtures/usyd_comp2017_2026s1.html`) for deterministic unit tests. Keep integration test for regression.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.4.2 + pytest-asyncio 0.26.0 |
| Config file | `pyproject.toml` [tool.pytest.ini_options] |
| Quick run command | `uv run pytest tests/unit/ -x -q --timeout=30` |
| Full suite command | `uv run pytest tests/ -x -q --timeout=120` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-03 | Canvas adapter: courses, grades, modules, assignments, assignment_groups, pagination, rate limit, circuit breaker, 401/403, 429, 5xx | unit | `uv run pytest tests/unit/test_canvas_adapter.py -x` | Wave 0 |
| INFRA-04 | Ed Discussion adapter: threads, search, Pydantic parsing, extra="ignore", graceful degradation, 401/403, circuit open | unit | `uv run pytest tests/unit/test_ed_discussion_adapter.py -x` | Wave 0 |
| INFRA-05 | Ed Lessons adapter: lessons, lesson detail, slides, Pydantic parsing, field name corrections, 401/403 | unit | `uv run pytest tests/unit/test_ed_lessons_adapter.py -x` | Wave 0 |
| INFRA-06 | Unit Outline parser: HTML snapshots, weight validation, CSS class fallback, positional fallback, malformed HTML, description/outcomes extraction | unit | `uv run pytest tests/unit/test_unit_outline_parser.py -x` | Wave 0 |
| INFRA-06 | Resilience utilities: CircuitBreaker state transitions, CanvasRateLimiter, RetryConfig, execute_with_retry | unit | `uv run pytest tests/unit/test_resilience.py -x` | Wave 0 |
| ALL | Ed XML document parser | unit | `uv run pytest tests/unit/test_ed_document_parser.py -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/unit/ -x -q --timeout=30`
- **Per wave merge:** `uv run pytest tests/ -x -q --timeout=120` + `uv run mypy src/adapters src/parsers --strict` + `uv run ruff check src/adapters src/parsers`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_canvas_adapter.py` -- covers INFRA-03
- [ ] `tests/unit/test_ed_discussion_adapter.py` -- covers INFRA-04
- [ ] `tests/unit/test_ed_lessons_adapter.py` -- covers INFRA-05
- [ ] `tests/unit/test_unit_outline_parser.py` -- covers INFRA-06 (HTML parsing)
- [ ] `tests/unit/test_resilience.py` -- covers circuit breaker, rate limiter, retry
- [ ] `tests/unit/test_ed_document_parser.py` -- covers Ed XML parsing
- [ ] `tests/fixtures/` directory -- HTML snapshots for UnitOutlineParser

## Existing Code Gap Analysis

### CanvasAdapter Gaps
| Gap | Severity | Details |
|-----|----------|---------|
| Missing `get_assignment_groups()` | HIGH | TRD SS3.4 fallback requires this endpoint; GpaService references it |
| No unit tests | HIGH | Only integration tests exist (require real token) |
| Pagination retry on 429/5xx | LOW | `_paginate()` raises immediately on errors instead of retrying individual pages |

### EdDiscussionAdapter Gaps
| Gap | Severity | Details |
|-----|----------|---------|
| No `TokenInvalidError` on 401/403 | HIGH | Returns empty list instead of raising; breaks service re-auth flow |
| No unit tests | HIGH | Only integration tests exist |
| `_request()` missing timing logs | LOW | Canvas adapter logs duration; Ed adapters don't |

### EdLessonsAdapter Gaps
| Gap | Severity | Details |
|-----|----------|---------|
| No `TokenInvalidError` on 401/403 | HIGH | Same issue as Ed Discussion |
| No unit tests | HIGH | Only integration tests exist |
| `_request()` missing timing logs | LOW | Same as Ed Discussion |

### UnitOutlineParser Gaps
| Gap | Severity | Details |
|-----|----------|---------|
| No real HTML snapshot fixtures | MEDIUM | Integration test fetches live URL which may change |
| No test for positional fallback | MEDIUM | Only CSS class selector path tested |
| `fetch_and_parse` creates new httpx client per call | LOW | Fine for per-semester frequency |

### Resilience Module Gaps
| Gap | Severity | Details |
|-----|----------|---------|
| No unit tests for CircuitBreaker state transitions | HIGH | State machine logic untested |
| No unit tests for CanvasRateLimiter | MEDIUM | Header parsing and throttle logic untested |
| No unit tests for execute_with_retry | MEDIUM | Retry-After parsing untested |

## Sources

### Primary (HIGH confidence)
- `src/adapters/*.py` -- existing adapter implementations (1,290+ lines reviewed)
- `src/parsers/*.py` -- existing parser implementations (363 lines reviewed)
- `src/schemas/common.py` -- error hierarchy (154 lines reviewed)
- `src/models/*.py` -- ORM models defining target data shapes
- `tests/integration/test_canvas.py` -- existing integration tests (97 lines)
- `tests/integration/test_ed_discussion.py` -- existing integration tests (75 lines)
- `tests/integration/test_ed_lessons.py` -- existing integration tests (94 lines)
- `tests/integration/test_outline_parser.py` -- existing integration tests (131 lines)
- `docs/UniBoard_TRD_v2.md` SS2, SS3, SS9, SS10, SS11, SS14 -- API specs, field corrections, error handling
- `pyproject.toml` -- dependency versions and test configuration

### Secondary (MEDIUM confidence)
- httpx MockTransport documentation (verified via installed version 0.28.1)
- Pydantic v2 `ConfigDict(extra="ignore")` behavior (verified via installed version 2.12.4)

### Tertiary (LOW confidence)
- None -- all findings based on direct code inspection and installed package verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and verified via `uv pip list`
- Architecture: HIGH -- 1,290+ lines of existing code reviewed, patterns well-established
- Pitfalls: HIGH -- identified from direct code comparison (Canvas vs Ed adapter inconsistencies)
- Validation: HIGH -- existing integration tests provide baseline; gap analysis based on code review

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable -- external API contracts unlikely to change within 30 days)
