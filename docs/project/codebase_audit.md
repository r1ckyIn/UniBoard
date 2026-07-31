# UniBoard Codebase Audit Report

**Date:** 2026-04-01  
**Branch:** `feature/gsd-22-testing-suite`  
**Auditor:** 9-worker parallel audit (ln-621 through ln-629)  
**Scope:** Full codebase — Python backend (`src/`, 98 files, ~11.5K LOC) + Next.js frontend (`frontend/`, 281 files)

---

## Executive Summary

UniBoard demonstrates **solid security foundations** (proper JWT validation, AES-256-GCM encryption, parameterized SQL, no XSS vectors) and **well-structured async architecture** (proper session scoping, separate connection pools for web/sync). However, the audit reveals **2 CRITICAL issues**, significant build health failures (all 5 checks fail), and systemic observability gaps that must be addressed before production deployment.

**Overall Score: 5.8 / 10**

### Severity Distribution

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 20 |
| MEDIUM | 43 |
| LOW | 28 |
| **Total** | **93** |

### Top 5 Must-Fix Items

| # | Severity | Category | Finding | File |
|---|----------|----------|---------|------|
| 1 | CRITICAL | Concurrency | `voyageai.Client.embed()` blocks async event loop | `src/services/qa.py:171,387` |
| 2 | CRITICAL | Build | Test suite blocked by import error (`get_current_user` vs `get_current_user_id`) | `tests/integration/test_ai_routes.py:13` |
| 3 | HIGH | Security | `supabase_jwt_secret` has well-known hardcoded default | `src/config.py:22-24` |
| 4 | HIGH | Lifecycle | `--reload` flag in production Dockerfile | `Dockerfile:23` |
| 5 | HIGH | Principles (Bug) | `auth.py /me` missing `language_preference` field | `src/web/routes/auth.py:42-53` |

---

## Category Scores

| # | Category | Worker | Score | CRITICAL | HIGH | MEDIUM | LOW |
|---|----------|--------|-------|----------|------|--------|-----|
| 1 | Security | ln-621 | 7.0 | 0 | 2 | 4 | 3 |
| 2 | Build Health | ln-622 | 3.0 | 1 | 14 | 18 | 0 |
| 3 | Code Principles | ln-623 | 5.0 | 0 | 5 | 11 | 6 |
| 4 | Code Quality | ln-624 | 5.5 | 0 | 13 | 22 | 5 |
| 5 | Dependencies | ln-625 | 7.0 | 0 | 3 | 2 | 3 |
| 6 | Dead Code | ln-626 | 8.0 | 0 | 0 | 11 | 6 |
| 7 | Observability | ln-627 | 4.0 | 0 | 5 | 11 | 6 |
| 8 | Concurrency | ln-628 | 6.0 | 1 | 0 | 5 | 2 |
| 9 | Lifecycle | ln-629 | 5.5 | 0 | 2 | 5 | 6 |

---

## Strengths

1. **JWT validation (STRONG)** — HS256 signature, audience claim, expiration, missing `sub` all correctly validated (`src/security/auth.py`)
2. **AES-256-GCM encryption (STRONG)** — Fresh 12-byte nonce per encryption, proper key validation, canary check (`src/security/encryption.py`)
3. **SQL injection prevention (STRONG)** — All queries use SQLAlchemy ORM parameterized queries. 3 raw SQL usages all use proper `text()` binding
4. **XSS prevention (STRONG)** — Zero instances of React unsafe HTML rendering across 281 frontend files
5. **User isolation (STRONG)** — Every data route filters by `Course.user_id == current_user_id`
6. **Async session management (STRONG)** — Request-scoped sessions via `async with`, separate sync engine pool
7. **APScheduler safety (STRONG)** — `max_instances=1` on all jobs, async coroutines, independent session factory
8. **Sensitive data redaction (STRONG)** — structlog processor redacts `token`, `password`, `secret`, `api_key`, `authorization`
9. **No dead commented-out code** — Clean codebase with no commented-out code blocks
10. **Frontend hooks well-structured** — TanStack Query `queryOptions()` pattern consistently used

---

## 1. Security (Score: 7.0/10)

### Findings

| # | Severity | File:Line | Description |
|---|----------|-----------|-------------|
| S-1 | HIGH | `src/config.py:74` | `debug: bool = True` — SQL echo enabled by default, leaks queries in production if env var missing |
| S-2 | HIGH | `src/config.py:22-24` | `supabase_jwt_secret` has well-known default — attacker can forge auth tokens if env var missing |
| S-3 | MEDIUM | `src/config.py:16-18` | `database_url` contains default `postgres:postgres` credentials |
| S-4 | MEDIUM | `src/web/main.py:31-38` | CORS origins hardcoded to `localhost:3001` — production frontend will be blocked |
| S-5 | MEDIUM | `src/web/routes/notifications.py:42` | `limit` parameter has no upper bound — DoS via `?limit=999999999` |
| S-6 | MEDIUM | `src/web/routes/ai.py` | No per-user rate limiting on AI endpoints (billing attack vector) |
| S-7 | LOW | `src/parsers/usyd_outline.py:40` | No URL domain validation on `fetch_and_parse()` (SSRF, low risk — system-controlled URLs) |
| S-8 | LOW | `src/web/routes/health.py:14-35` | Health endpoint exposes DB status without auth |
| S-9 | LOW | `frontend/lib/auth/store.ts:25` | Auth tokens in localStorage (standard SPA pattern, acceptable) |

### Recommendations

- **S-1**: Change default to `debug: bool = False`
- **S-2**: Remove default value; add startup validation rejecting empty/known-default secrets
- **S-4**: Make CORS origins configurable via `ALLOWED_ORIGINS` env var
- **S-5**: Add `Query(default, ge=1, le=100)` to all `limit` parameters (pattern exists in `intelligence.py`)

---

## 2. Build Health (Score: 3.0/10)

All 5 build checks FAIL:

| Check | Status | Issues |
|-------|--------|--------|
| Backend mypy --strict | FAIL | 18 type errors in 4 files |
| Backend ruff | FAIL | 17 lint issues (9 auto-fixable) |
| Frontend tsc --noEmit | FAIL | 8 type errors in 2 test files |
| Frontend ESLint --max-warnings 0 | FAIL | 1 error + 37 warnings |
| Backend pytest | FAIL | Import error blocks all test collection |

### Critical Findings

| # | Severity | File:Line | Description |
|---|----------|-----------|-------------|
| B-1 | CRITICAL | `tests/integration/test_ai_routes.py:13` | ImportError: `get_current_user` does not exist (should be `get_current_user_id`) — blocks entire test suite |
| B-2 | HIGH | `src/services/tool_executor.py:44,86,87,121,155` | 5 real type errors (call-overload, call-arg, arg-type, assignment) |
| B-3 | HIGH | `src/services/skill.py:265-266` | Missing type annotations for `trace_a`, `trace_b` |
| B-4 | HIGH | `src/services/skill.py` + `src/services/ai_engine.py` | 10 stale `type: ignore` comments |
| B-5 | HIGH | `__tests__/deadlines/DeadlineCard.test.tsx` | 7 test fixtures missing required `course_id` property |
| B-6 | HIGH | `src/services/notification.py:15` | Unused import: `Profile` |
| B-7 | HIGH | `src/web/routes/courses.py:4` | Unused import: `datetime.UTC` |
| B-8 | HIGH | `src/web/routes/gpa.py:10` | Unused import: `selectinload` |

### Quick Fixes

```bash
# Fix 9 auto-fixable lint issues
.venv/bin/python -m ruff check src/ --fix

# Fix test import
# Change get_current_user to get_current_user_id in test_ai_routes.py
```

---

## 3. Code Principles (Score: 5.0/10)

### DRY Violations

| # | Severity | File(s) | Description |
|---|----------|---------|-------------|
| P-1 | HIGH | `adapters/*.py` | `_request()` method duplicated across 3 adapters (~49 lines each). `execute_with_retry()` in `resilience.py` exists but is never used |
| P-2 | HIGH | `routes/courses.py`, `services/gpa.py` | Grade WAM computation duplicated 3x (route uses `float`, service uses `Decimal`) |
| P-3 | HIGH | `routes/courses.py:30`, `services/gpa.py:61` | Grade letter thresholds (HD/D/CR/P/F) duplicated with different types |
| P-4 | HIGH+Bug | `routes/auth.py:37-53`, `routes/users.py:30-48` | `UserResponse` construction duplicated — **auth.py missing `language_preference` field** |
| P-5 | MEDIUM | `routes/intelligence.py`, `services/intelligence.py` | `_derive_relevance_category()` duplicated |
| P-6 | MEDIUM | `sync/tasks.py` | Retry/history boilerplate duplicated 4x (~30 lines each) |
| P-7 | MEDIUM | `services/deadline.py:213-360` | Deadline upsert logic duplicated across 3 phases |

### KISS Violations

| # | Severity | File:Line | Description |
|---|----------|-----------|-------------|
| P-8 | HIGH | `sync/tasks.py:234-401` | `sync_all_deadlines()` — 168 lines, nesting depth 9 |
| P-9 | MEDIUM | `services/deadline.py:213-360` | `aggregate_and_dedup()` — 148 lines, 3 similar phases |
| P-10 | MEDIUM | `routes/gpa.py:183-289` | Route reimplements `GPAService.calculate_target_path()` |

### Error Handling

| # | Severity | File:Line | Description |
|---|----------|-----------|-------------|
| P-11 | HIGH | `routes/health.py:27-28` | `except Exception: pass` — silent error swallowing |
| P-12 | MEDIUM | `security/encryption.py:48-49` | `except Exception` returns `False` without logging |
| P-13 | MEDIUM | `sync/tasks.py` (5 locations) | `except Exception` blocks missing `exc_info=True` |

### DI Issues

| # | Severity | File | Description |
|---|----------|------|-------------|
| P-14 | MEDIUM | `routes/ai.py:68-82` | Manual service construction instead of `Depends()` |
| P-15 | LOW | `routes/gpa.py:102` | Route calls private `_` methods of `GPAService` |

---

## 4. Code Quality (Score: 5.5/10)

### Complex / Long Functions

| # | Severity | File | Function | Lines | Notes |
|---|----------|------|----------|-------|-------|
| Q-1 | HIGH | `sync/tasks.py` | `sync_all_deadlines()` | 168 | Nesting depth 9 |
| Q-2 | HIGH | `sync/tasks.py` | `sync_ed_discussions()` | 147 | Deeply nested |
| Q-3 | HIGH | `sync/tasks.py` | `sync_all_outlines()` | 106 | |
| Q-4 | HIGH | `sync/tasks.py` | `sync_all_grades()` | 89 | |
| Q-5 | HIGH | `sync/tasks.py` | `sync_all_modules()` | 87 | |
| Q-6 | MEDIUM | `services/deadline.py` | `aggregate_and_dedup()` | 148 | |
| Q-7 | MEDIUM | `services/gpa.py` | `calculate_target_path()` | 117 | |
| Q-8 | MEDIUM | `services/qa.py` | `stream_answer_question()` | 108 | |

### God Module

| # | Severity | File | Lines | Description |
|---|----------|------|-------|-------------|
| Q-9 | HIGH | `src/sync/tasks.py` | 1146 | 7 sync functions + 5 helpers — grades, deadlines, modules, outlines, discussions, digests, reminders |

**Recommendation:** Split into `sync/grade_tasks.py`, `sync/deadline_tasks.py`, `sync/module_tasks.py`, `sync/outline_tasks.py`, `sync/discussion_tasks.py`.

### N+1 Patterns

| # | Severity | File:Line | Description |
|---|----------|-----------|-------------|
| Q-10 | HIGH | `sync/tasks.py:787` | Ed Lessons: individual `get_lesson()` API call per lesson with slides (N+1 external API) |
| Q-11 | HIGH | `sync/tasks.py:276-366` | Triple nested API calls per course in deadline sync |
| Q-12 | MEDIUM | `services/intelligence.py:218-254` | Sequential AI calls per thread (up to 20 per batch) |

### Magic Numbers / Strings

| # | Severity | Description |
|---|----------|-------------|
| Q-13 | HIGH | Grade band thresholds (85/75/65/50) duplicated in `services/gpa.py:39` and `routes/courses.py:30` with different types |
| Q-14 | MEDIUM | 62 status string literals across 13 files without enums |
| Q-15 | MEDIUM | Truncation lengths (`[:200]`, `[:500]`, `[:100]`, `[:1000]`) scattered without constants |
| Q-16 | MEDIUM | Difficulty thresholds in `routes/gpa.py:263-270` hardcoded inline |

### Type Safety

| # | Severity | File | Description |
|---|----------|------|-------------|
| Q-17 | MEDIUM | `services/intelligence.py:183`, `services/digest.py:32` | `ai_engine: object` duck typing — should use Protocol |
| Q-18 | MEDIUM | codebase-wide | 33 `# type: ignore` comments (some justified, some stale) |

---

## 5. Dependencies (Score: 7.0/10)

### Unused Dependencies

| # | Severity | Package | File | Notes |
|---|----------|---------|------|-------|
| D-1 | HIGH | `passlib[bcrypt]` + `bcrypt` | `pyproject.toml:12-13` | Zero imports — auth handled by Supabase |
| D-2 | HIGH | `jinja2` | `pyproject.toml:25` | Zero imports — templates use f-strings |
| D-3 | MEDIUM | `react-rough-notation` | `package.json:30` | Never imported — custom wrapper uses `rough-notation` directly |

### Security Vulnerabilities

| # | Severity | Description |
|---|----------|-------------|
| D-4 | HIGH | 7 npm vulnerabilities (2 high picomatch ReDoS, 5 moderate) via vitest/eslint transitive deps |

### Other Issues

| # | Severity | Description |
|---|----------|-------------|
| D-5 | MEDIUM | Dev dependencies duplicated in both `[project.optional-dependencies]` and `[dependency-groups]` |
| D-6 | MEDIUM | `cryptography` at 43.x, latest is 46.x (security-critical library) |
| D-7 | LOW | `structlog>=24.0,<27.0` range spans 3 major versions |

---

## 6. Dead Code (Score: 8.0/10)

### Findings

| # | Severity | File | Description | Est. Lines |
|---|----------|------|-------------|------------|
| DC-1 | MEDIUM | `src/schemas/auth.py` (entire file) | 4 dead schema classes — auth moved to Supabase frontend SDK | ~50 |
| DC-2 | MEDIUM | `src/services/course_linking.py` (entire file) | Never imported by production code, only tests | ~144 |
| DC-3 | MEDIUM | `src/adapters/resilience.py:109` | `execute_with_retry()` — 63 lines, never called | ~63 |
| DC-4 | MEDIUM | `frontend/hooks/use-grades.ts` | `useCourseGrades` — never imported | ~29 |
| DC-5 | MEDIUM | `frontend/hooks/use-search.ts` | `useSearch` — never imported | ~55 |
| DC-6 | MEDIUM | `frontend/hooks/use-discussions.ts` | `useCourseDiscussions` — only in test mock | ~51 |
| DC-7 | LOW | `src/schemas/notification.py:28` | `MarkReadRequest` — unused | ~10 |
| DC-8 | LOW | `src/schemas/ai.py:64` | `ChatMessage` — unused | ~5 |
| DC-9 | LOW | `src/adapters/ed_lessons.py:20-24` | `ED_FIELD_MAP` constant — unused | ~5 |
| DC-10 | LOW | 3 unused imports | See Build section | ~3 |
| DC-11 | LOW | 2 unused variables | `routes/courses.py:254,309` | ~2 |

**Total estimated dead code: ~360 lines** (clean — no commented-out code blocks found)

---

## 7. Observability (Score: 4.0/10)

### Findings

| # | Severity | File:Line | Description |
|---|----------|-----------|-------------|
| O-1 | HIGH | `web/main.py:40-47` | No HTTP request/response logging (method, path, status, duration) |
| O-2 | HIGH | `web/main.py:40-47` | `request_id` not bound to structlog contextvars — downstream logs have no correlation |
| O-3 | HIGH | `routes/health.py:15-35` | Health check always returns HTTP 200 even when DB is down — load balancer can't detect failure |
| O-4 | HIGH | `frontend/app/` | No `error.tsx` / `global-error.tsx` error boundaries — render errors cause white screen |
| O-5 | HIGH | `frontend/` global | Zero frontend error logging — API failures and JS errors completely unobservable |
| O-6 | MEDIUM | `logging.py:44` | Log level hardcoded to DEBUG (0), ignoring `settings.log_level` config |
| O-7 | MEDIUM | `routes/ai.py:4,25` | Uses stdlib `logging` instead of structlog — bypasses JSON formatting and redaction |
| O-8 | MEDIUM | `web/main.py:49-59` | Custom exception handler has no logging for 4xx errors |
| O-9 | MEDIUM | `frontend/lib/api/client.ts` | Frontend doesn't read/propagate `X-Request-ID` for correlation |
| O-10 | MEDIUM | `frontend/lib/api/ai-stream.ts:37` | `catch {}` silently swallows SSE JSON parse errors |
| O-11 | MEDIUM | global | No Prometheus/metrics endpoint — duration_ms only in logs |
| O-12 | LOW | `routes/` global | Most route handlers have zero log statements |
| O-13 | LOW | `logging.py:8` | Sensitive keys list missing `access_token`, `jwt`, `credentials` variants |

---

## 8. Concurrency (Score: 6.0/10)

### Findings

| # | Severity | File:Line | Description |
|---|----------|-----------|-------------|
| C-1 | CRITICAL | `services/qa.py:171,387` | `voyageai.Client.embed()` is synchronous HTTP — blocks entire event loop during embedding |
| C-2 | MEDIUM | `intelligence.py`, `digest.py`, `risk_alert.py`, `materials.py` | AI daily counter TOCTOU — missing `SELECT ... FOR UPDATE` (QAService does it correctly) |
| C-3 | MEDIUM | `services/notification.py:50-80` | Notification dedup TOCTOU — race between check and insert |
| C-4 | MEDIUM | `sync/engine.py:143-159` | 5 initial sync jobs fire simultaneously — pool contention on startup |
| C-5 | MEDIUM | `adapters/resilience.py` | Circuit breakers per-instance, not shared — reduced effectiveness |
| C-6 | MEDIUM | `parsers/usyd_outline.py:51` | BeautifulSoup CPU-blocking in async context (low frequency, acceptable) |
| C-7 | LOW | `web/routes/sync.py:52-69` | Manual sync throttle minor TOCTOU |

### Passes

- Database sessions correctly scoped per-request
- Separate connection pools for web/sync
- `max_instances=1` on all APScheduler jobs
- No `asyncio.run()` in async context, no `time.sleep()`
- No global mutable caches

---

## 9. Lifecycle (Score: 5.5/10)

### Findings

| # | Severity | File:Line | Description |
|---|----------|-----------|-------------|
| L-1 | HIGH | `Dockerfile:23` | `--reload` flag in production CMD — wastes CPU, breaks signal handling, disables graceful shutdown |
| L-2 | HIGH | `sync/tasks.py:765-833` | `_sync_ed_lessons()` never closes `EdLessonsAdapter` — httpx client leak on every run |
| L-3 | MEDIUM | `sync/engine.py:164` | `scheduler.shutdown(wait=False)` drops in-flight sync jobs |
| L-4 | MEDIUM | `database.py`, `sync/tasks.py` | Neither database engine disposed on shutdown — connection pool abandoned |
| L-5 | MEDIUM | `config.py:6-76` | No fail-fast validation for critical config in production mode |
| L-6 | MEDIUM | `routes/health.py` | Health check always returns 200 (also in Observability) |
| L-7 | MEDIUM | `Dockerfile:23` | No init system (tini/dumb-init) — PID 1 problem, zombie process risk |
| L-8 | LOW | `database.py:18-31` | DB engine lazily initialized, no startup connectivity check |
| L-9 | LOW | `routes/health.py` | No liveness vs readiness probe separation |
| L-10 | LOW | `routes/health.py` | Health check doesn't report APScheduler status |
| L-11 | LOW | `docker-compose.yml` | No `stop_grace_period` configured |

---

## Prioritized Action Plan

### P0 — Fix Immediately (CRITICAL + Production Blockers)

1. **C-1**: Wrap `voyageai.Client.embed()` in `asyncio.to_thread()` — one-line fix per call site (`qa.py:171,387`)
2. **B-1**: Fix test import `get_current_user` -> `get_current_user_id` (`test_ai_routes.py:13`)
3. **S-2**: Remove default value for `supabase_jwt_secret`, add startup validation
4. **L-1**: Remove `--reload` from Dockerfile CMD

### P1 — Fix Before Production (HIGH)

5. **P-4**: Fix `auth.py /me` missing `language_preference` — use `_build_user_response()` from `users.py`
6. **L-2**: Add `finally: await adapter.close()` to `_sync_ed_lessons()`
7. **S-1**: Change `debug: bool = True` -> `debug: bool = False`
8. **S-4**: Make CORS origins configurable via environment variable
9. **O-1/O-2**: Add HTTP access logging + bind `request_id` to structlog contextvars
10. **O-3**: Return HTTP 503 when health check detects DB down
11. **O-4/O-5**: Add `error.tsx` / `global-error.tsx` + basic frontend error logging
12. **D-4**: Update vitest/eslint to fix 7 npm vulnerabilities
13. **B-2/B-3**: Fix `tool_executor.py` type errors + `skill.py` missing annotations

### P2 — Improve Quality (MEDIUM)

14. **Q-9**: Split `sync/tasks.py` (1146 lines) into domain-specific modules
15. **P-1**: Extract shared adapter `_request()` — resolve with `execute_with_retry()` or base class
16. **P-2/P-3**: Consolidate grade calculation + letter thresholds into `GPAService`
17. **C-2/C-3**: Add `SELECT ... FOR UPDATE` to AI counter and notification dedup
18. **L-3/L-4**: `scheduler.shutdown(wait=True)` + dispose both engines on shutdown
19. **D-1/D-2**: Remove unused `passlib`, `bcrypt`, `jinja2` dependencies
20. **DC-1/DC-2**: Remove dead schemas (`auth.py`) and evaluate `course_linking.py`
21. **Q-14**: Replace status string literals with enums

### P3 — Nice to Have (LOW)

22. Add URL domain validation for Unit Outline fetcher
23. Add liveness vs readiness probe separation
24. Add tini/dumb-init to Dockerfile
25. Remove unused frontend hooks (`use-grades`, `use-search`, `use-discussions`)
26. Add Prometheus/metrics endpoint
27. Stagger initial sync jobs at startup

---

## Methodology

9 specialized audit agents ran in parallel, each focused on one domain:

| Worker | Domain | Duration |
|--------|--------|----------|
| ln-621 | Security | ~4.5 min |
| ln-622 | Build Health | ~2.2 min |
| ln-623 | Code Principles (DRY/KISS/YAGNI/Error/DI) | ~5.0 min |
| ln-624 | Code Quality (complexity, N+1, types) | ~3.6 min |
| ln-625 | Dependencies | ~3.6 min |
| ln-626 | Dead Code | ~9.0 min |
| ln-627 | Observability | ~4.0 min |
| ln-628 | Concurrency | ~3.2 min |
| ln-629 | Lifecycle | ~3.8 min |

Each worker read actual source files and ran real build/lint/test commands. Findings were aggregated, deduplicated, and scored.
