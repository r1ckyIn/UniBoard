---
phase: 25
slug: security-observability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x + pytest-asyncio (backend), vitest 4.x (frontend) |
| **Config file** | `pyproject.toml [tool.pytest.ini_options]` (backend), `vitest.config.ts` (frontend) |
| **Quick run command** | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/unit/ -x -q` |
| **Full suite command** | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/ -x -q` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest tests/unit/ -x -q && ruff check src/ && mypy src/`
- **After every plan wave:** Run `python -m pytest tests/ -x -q`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | SEC-02 | unit | `pytest tests/unit/test_security_headers.py -x` | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 1 | SEC-02 | manual | `curl -I http://localhost:3001 \| grep -i strict` | N/A | ⬜ pending |
| 25-02-01 | 02 | 1 | SEC-03 | unit | `pytest tests/unit/test_access_logging.py -x` | ❌ W0 | ⬜ pending |
| 25-03-01 | 03 | 1 | SEC-04 | manual | Visual verification in browser | N/A | ⬜ pending |
| 25-04-01 | 04 | 1 | OPS-04 | unit | `pytest tests/unit/test_rate_limiting.py::test_general_rate_limit -x` | ❌ W0 | ⬜ pending |
| 25-04-02 | 04 | 1 | OPS-04 | unit | `pytest tests/unit/test_rate_limiting.py::test_ai_rate_limit -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_security_headers.py` — stubs for SEC-02 (FastAPI security headers)
- [ ] `tests/unit/test_access_logging.py` — stubs for SEC-03 (request logging with request_id)
- [ ] `tests/unit/test_rate_limiting.py` — stubs for OPS-04 (rate limiting 60/min general, 10/min AI)

*Existing pytest infrastructure covers framework needs. Only test files are missing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Next.js security headers in response | SEC-02 | Requires running Next.js dev server | `curl -I http://localhost:3001` and verify HSTS, X-Frame-Options, X-Content-Type-Options, CSP |
| error.tsx renders fallback UI | SEC-04 | Requires triggering React error in browser | Navigate to page, trigger error via React DevTools, verify fallback UI renders |
| global-error.tsx renders fallback UI | SEC-04 | Requires triggering root layout error | Temporarily break root layout, verify global error page renders with inline styles |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
