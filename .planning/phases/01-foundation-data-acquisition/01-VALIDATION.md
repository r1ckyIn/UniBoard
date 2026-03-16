# Phase 1: Foundation & Data Acquisition - Validation Strategy

**Created:** 2026-03-16
**Phase:** 01 — Foundation & Data Acquisition
**Strategy:** Nyquist validation — test at every integration boundary

## Validation Philosophy

Phase 1 is 100% backend infrastructure with real external API dependencies. The CONTEXT.md mandates **pure integration tests — no mocks**. Every test hits real APIs (Canvas, Ed) and real PostgreSQL. This means:

- Tests require real API tokens (from .env locally, GitHub Secrets in CI)
- Tests require a running PostgreSQL instance (Docker container)
- Flaky handling: auto-retry once, mark as flaky if still fails
- Test isolation: each test function gets a fresh database transaction (rollback after)

## Requirement → Validation Matrix

| Requirement | What to Validate | Test Type | Acceptance Criteria |
|-------------|-----------------|-----------|---------------------|
| INFRA-01 | PostgreSQL schema, all ORM models, indexes, Alembic migrations | Integration (DB) | `alembic upgrade head` succeeds, all 11 tables exist, CRUD operations pass for every model, indexes verified via `pg_indexes` |
| INFRA-03 | Canvas adapter: courses, grades, modules, assignments, pagination, rate limiting, circuit breaker | Integration (API) | Real Canvas API returns valid data for test course IDs (69855, 69874), pagination follows Link header, rate limiter reads X-Rate-Limit-Remaining |
| INFRA-04 | Ed Discussion adapter: threads, search, Pydantic strict parsing, graceful degradation | Integration (API) | Real Ed API returns threads for test course (31567), Pydantic parses with extra='ignore', malformed items are skipped (not crash) |
| INFRA-05 | Ed Lessons adapter: lessons list, lesson detail with slides, XML content | Integration (API) | Real Ed API returns lessons, slides have `content` field (not `passage`), `number` field (not `lesson_number`) |
| INFRA-06 | Unit Outline parser: HTML fetch, assessment extraction, weight-sum validation, fallback chain | Integration (HTTP) | Real USYD HTML page parses successfully, weights sum to 95-105%, raw HTML stored, known course produces expected assessment count |
| INFRA-07 | AES-256-GCM encryption: encrypt/decrypt cycle, canary check, bad key handling | Integration (Crypto) | Encrypt → decrypt round-trip preserves plaintext, canary check passes on startup, wrong key raises error |
| INFRA-08 | JWT auth: register, login, token validation, protected endpoint access | Integration (API) | Register creates user in DB, login returns valid JWT, JWT authenticates subsequent requests, expired/invalid JWT returns 401 |
| INFRA-09 | Docker Compose: PostgreSQL startup, connectivity, health check | Integration (Infra) | `docker compose up -d` starts PostgreSQL, connection string works, health check passes |

## Success Criteria Validation

From ROADMAP.md — each must be demonstrably TRUE after Phase 1 execution:

| # | Success Criterion | How to Validate |
|---|-------------------|----------------|
| SC-1 | Developer can run `docker compose up` and have PostgreSQL + backend running locally with all tables created via Alembic migration | Test: `docker compose up -d && alembic upgrade head && curl localhost:8000/health` returns 200 |
| SC-2 | A user can register with email/password and receive a JWT token; the token authenticates subsequent API requests | Test: POST /auth/register → POST /auth/login → GET /users/me with Bearer token → 200 |
| SC-3 | Canvas adapter can fetch courses, grades, assignments, and modules for a real Canvas token (with rate limiting and pagination) | Test: CanvasAdapter.get_courses() returns ≥1 course, get_grades(69855) returns enrollment data, get_modules(69855) returns modules with items |
| SC-4 | Ed Discussion and Ed Lessons adapters can fetch threads, posts, and lesson content for a real Ed token (with defensive Pydantic parsing) | Test: EdDiscussionAdapter.get_threads(31567) returns threads, EdLessonsAdapter.get_lessons(31567) returns lessons with slide data |
| SC-5 | Unit Outline parser can extract assessment weights from a USYD Unit Outline HTML page with weight-sum validation | Test: UnitOutlineParser.parse(url) returns assessments where sum(weights) is 95-105%, raw_html is non-empty |

## Test Architecture

### Test Categories

```
tests/
├── conftest.py                    # Shared fixtures
│   ├── async_engine fixture       # Creates test DB, runs alembic upgrade
│   ├── async_session fixture      # Per-test transactional session (rollback)
│   ├── test_client fixture        # httpx.AsyncClient with FastAPI app
│   ├── canvas_token fixture       # From env var CANVAS_API_TOKEN
│   ├── ed_token fixture           # From env var ED_API_TOKEN
│   └── encryption fixture         # TokenEncryption with test key
├── integration/
│   ├── test_models.py             # ORM CRUD for all 11 models
│   ├── test_migrations.py         # alembic upgrade/downgrade cycle
│   ├── test_auth.py               # Register → login → protected endpoint
│   ├── test_encryption.py         # Encrypt/decrypt, canary, bad key
│   ├── test_canvas.py             # Real Canvas API (courses, grades, modules)
│   ├── test_ed_discussion.py      # Real Ed API (threads, search)
│   ├── test_ed_lessons.py         # Real Ed API (lessons, slides)
│   └── test_outline_parser.py     # Real USYD HTML fetch and parse
```

### Fixture Strategy

```python
# conftest.py pattern (conceptual)

@pytest.fixture(scope="session")
async def async_engine():
    """Session-scoped: create test database, run migrations."""
    engine = create_async_engine(TEST_DATABASE_URL)
    # Run alembic upgrade head programmatically
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def session(async_engine):
    """Function-scoped: transactional isolation per test."""
    async with async_session_factory() as session:
        async with session.begin():
            yield session
            await session.rollback()  # Clean slate per test

@pytest.fixture
def canvas_token():
    """Real Canvas API token from environment."""
    token = os.environ.get("CANVAS_API_TOKEN")
    if not token:
        pytest.skip("CANVAS_API_TOKEN not set")
    return token
```

### Flaky Test Handling

Per CONTEXT.md decision:
- Auto-retry once on failure (via pytest-rerunfailures or custom marker)
- If still fails after retry, mark as flaky (distinguish API downtime from code bugs)
- CI reports flaky tests separately from real failures

### Coverage Targets

| Module | Target | Rationale |
|--------|--------|-----------|
| models/ | >90% | Core data layer, must be bulletproof |
| security/ | >90% | Auth + encryption, security-critical |
| adapters/ | >80% | Real API tests cover happy paths + key error paths |
| parsers/ | >80% | Unit Outline parsing with validation |
| web/routes/ | >80% | API endpoints with auth middleware |
| Overall | >70% | Phase 1 baseline |

## Verification Commands

```bash
# Full validation chain (must all pass before commit)
mypy src/ && pytest && ruff check .

# Run with coverage
pytest --cov=src --cov-report=term-missing

# Run specific test category
pytest tests/integration/test_canvas.py -v
pytest tests/integration/test_auth.py -v

# Type checking (strict mode)
mypy src/ --strict
```

## Risk Mitigations in Testing

| Risk | Mitigation |
|------|-----------|
| Canvas API rate limiting during tests | Sequential test execution (not parallel), respect X-Rate-Limit-Remaining |
| Ed API silent breaking change | Pydantic strict validation catches field changes immediately |
| USYD HTML structure change | Store raw HTML in test fixtures for regression, compare with live fetch |
| PostgreSQL version mismatch | Docker Compose pins postgres:16-alpine (same as production target) |
| Token exposure in CI | GitHub Secrets for CANVAS_API_TOKEN, ED_API_TOKEN; never in logs |
| Encryption key management | Test key hardcoded in conftest.py (not production key) |

---

*Phase: 01-foundation-data-acquisition*
*Validation strategy created: 2026-03-16*
