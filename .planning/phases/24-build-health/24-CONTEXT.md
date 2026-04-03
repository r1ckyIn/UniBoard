# Phase 24: Build Health Green - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Source:** Auto-generated from ROADMAP success criteria + research

<domain>
## Phase Boundary

Make all 5 build/quality tools pass with zero errors, confirming the codebase (after Phase 22-23 refactoring) is sound. This is a pure code-fix phase with no new features.

**In scope:** Fixing all errors reported by ruff, mypy, tsc, ESLint, and pytest.
**Out of scope:** New features, architecture changes, CI/CD setup (Phase 26), security hardening (Phase 25).

</domain>

<decisions>
## Implementation Decisions

### Build Tools & Thresholds
- ruff check: zero violations (current: 54 errors, 37 auto-fixable)
- mypy --strict: zero errors (current: 20 errors in 5 files)
- tsc --noEmit: zero TypeScript errors (current: 8 errors in 2 files)
- ESLint --max-warnings 0: zero warnings (current: 23 warnings in 9 files)
- pytest: all tests pass with zero failures (current: 26 DB-connection errors + 3 import errors)

### Test Architecture Decision
- DB-dependent "unit" tests (26 tests in 5 files) should be moved to integration/ and marked with `@pytest.mark.db`
- Add conftest auto-skip when no DB is available, so pytest passes without PostgreSQL
- Stale integration tests with removed imports: update or delete as appropriate

### Claude's Discretion
- Specific line-wrapping strategies for ruff E501 fixes
- Whether to use `useMemo` or callback restructuring for ESLint exhaustive-deps
- Exact type narrowing approach for mypy fixes (guards vs casts vs wider types)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Research
- `.planning/phases/24-build-health/24-RESEARCH.md` — Full error inventory with counts, categories, and fix strategies

### Project Configuration
- `pyproject.toml` — ruff/mypy/pytest configuration
- `frontend/tsconfig.json` — TypeScript strict mode config
- `frontend/.eslintrc.json` or `next.config.ts` — ESLint configuration

</canonical_refs>

<specifics>
## Specific Ideas

- Run `ruff check --fix` first to auto-resolve 37/54 errors (biggest quick win)
- All 7 tsc errors in DeadlineCard.test.tsx share one root cause: missing `course_id` field
- All 10 mypy `unused-ignore` errors are stale `# type: ignore` comments that can simply be removed
- ESLint exhaustive-deps: wrap logical expressions in `useMemo()` with stable TanStack Query data as dependency

</specifics>

<deferred>
## Deferred Ideas

- CI/CD pipeline to enforce these checks automatically (Phase 26)
- Performance profiling of useMemo additions (not needed for correctness)

</deferred>

---

*Phase: 24-build-health*
*Context gathered: 2026-04-01 from ROADMAP + research data*
