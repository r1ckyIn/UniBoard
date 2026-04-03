---
phase: 26
slug: cicd-deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend framework** | pytest 8.3+ with pytest-asyncio |
| **Backend config** | pyproject.toml `[tool.pytest.ini_options]` |
| **Backend quick run** | `uv run pytest tests/ -x --timeout=120` |
| **Backend full suite** | `uv run ruff check . && uv run mypy --strict src/ && uv run pytest tests/ -x --timeout=120` |
| **Frontend framework** | vitest 4.1+ |
| **Frontend config** | frontend/vitest.config.ts |
| **Frontend quick run** | `cd frontend && pnpm typecheck && pnpm build` |
| **Frontend full suite** | `cd frontend && pnpm lint && pnpm typecheck && pnpm build` |
| **Estimated runtime** | ~60 seconds (backend) + ~30 seconds (frontend) |

---

## Sampling Rate

- **After every task commit:** `uv run ruff check . && uv run mypy --strict src/ && cd frontend && pnpm typecheck`
- **After every plan wave:** Full backend test suite + frontend build
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | OPS-01 | smoke | `cat .github/workflows/backend-ci.yml && cat .github/workflows/frontend-ci.yml` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | OPS-01 | smoke | `uv run ruff check . && uv run mypy --strict src/ && uv run pytest tests/ -x` | ✅ | ⬜ pending |
| 26-01-03 | 01 | 1 | OPS-01 | smoke | `cd frontend && pnpm lint && pnpm typecheck && pnpm build` | ✅ | ⬜ pending |
| 26-02-01 | 02 | 2 | OPS-02 | smoke | `docker build -f Dockerfile.production -t uniboard-test .` | ✅ | ⬜ pending |
| 26-02-02 | 02 | 2 | OPS-02 | manual | Review railway.toml and env var docs | ❌ W0 | ⬜ pending |
| 26-03-01 | 03 | 3 | OPS-03 | unit | `uv run pytest tests/ -x -k sentry` | ❌ W0 | ⬜ pending |
| 26-03-02 | 03 | 3 | OPS-03 | smoke | `cd frontend && pnpm typecheck && pnpm build` | ✅ | ⬜ pending |
| 26-03-03 | 03 | 3 | OPS-03 | unit | Check CSP contains `ingest.sentry.io` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.github/workflows/backend-ci.yml` — CI workflow file for Python backend
- [ ] `.github/workflows/frontend-ci.yml` — CI workflow file for Next.js frontend
- [ ] `railway.toml` — Railway deployment config
- [ ] `tests/test_sentry_init.py` — Verify Sentry SDK initialization
- [ ] CSP header test — Verify `ingest.sentry.io` in connect-src

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI runs on push/PR | OPS-01 | GitHub Actions requires actual push | Push to feature branch, verify workflows run in Actions tab |
| Railway deployment works | OPS-02 | Requires Railway account and linked repo | Link GitHub repo in Railway, set env vars, trigger deploy |
| Vercel deployment works | OPS-02 | Requires Vercel account and linked repo | Link GitHub repo in Vercel, set env vars, trigger deploy |
| Sentry receives events | OPS-03 | Requires Sentry account and DSN | Create Sentry project, set DSN, trigger error, check dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
