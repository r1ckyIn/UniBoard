---
phase: 29
slug: sentry-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | pytest 8.x + pytest-asyncio |
| **Framework (Frontend)** | vitest 4.x + @testing-library/react |
| **Config file (Backend)** | `pyproject.toml` [tool.pytest.ini_options] |
| **Config file (Frontend)** | `frontend/vitest.config.ts` |
| **Quick run (Backend)** | `uv run pytest tests/unit/test_sentry_init.py -x` |
| **Quick run (Frontend)** | `cd frontend && pnpm vitest run __tests__/sentry/ --reporter=verbose` |
| **Full suite (Backend)** | `uv run pytest tests/unit/ -x` |
| **Full suite (Frontend)** | `cd frontend && pnpm test run` |
| **Estimated runtime** | ~30 seconds (backend ~5s, frontend ~25s) |

---

## Sampling Rate

- **After every task commit:** `uv run pytest tests/unit/test_sentry_init.py -x` + `cd frontend && pnpm vitest run __tests__/sentry/ -x`
- **After every plan wave:** Full backend + frontend test suites
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | OBS-02 | unit | `cd frontend && pnpm vitest run __tests__/sentry/sentry-init.test.ts -x` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | OBS-03 | unit | `cd frontend && pnpm vitest run __tests__/sentry/csp-headers.test.ts -x` | ❌ W0 | ⬜ pending |
| 29-02-01 | 02 | 1 | OBS-01 | unit | `uv run pytest tests/unit/test_sentry_init.py -x` | ✅ | ⬜ pending |
| 29-02-02 | 02 | 1 | OBS-03 | unit | `uv run pytest tests/unit/test_sentry_init.py -x` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/sentry/sentry-init.test.ts` — stubs for OBS-02 (conditional Sentry init)
- [ ] `frontend/__tests__/sentry/csp-headers.test.ts` — stubs for OBS-03 (CSP connect-src validation)
- [ ] Extend `tests/unit/test_sentry_init.py` — add test for backend CSP including Vercel domain

*Existing infrastructure covers OBS-01 backend Sentry init testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sentry project creation on sentry.io | OBS-01, OBS-02 | External SaaS — cannot automate project creation | 1. Log into sentry.io 2. Verify `uniboard-api` and `uniboard-web` projects exist under org `yuan-qin` |
| DSN env vars in Railway/Vercel | OBS-01, OBS-02 | External deployment platform | 1. Check Railway dashboard for `SENTRY_DSN` 2. Check Vercel dashboard for `NEXT_PUBLIC_SENTRY_DSN` |
| No CSP violations in browser console | OBS-03 | Requires browser + deployed app | 1. Open deployed app 2. Open DevTools Console 3. Verify no CSP violation errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
