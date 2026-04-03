---
phase: 22
slug: critical-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3+ with pytest-asyncio 0.25+ |
| **Config file** | `pyproject.toml` [tool.pytest.ini_options] |
| **Quick run command** | `python3 -m pytest tests/unit/ -x --timeout=30 -q` |
| **Full suite command** | `python3 -m pytest tests/ --timeout=120 -q` |
| **Estimated runtime** | ~15 seconds (unit), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `python3 -m pytest tests/unit/ -x --timeout=30 -q`
- **After every plan wave:** Run `python3 -m pytest tests/ --timeout=120 -q`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | CRIT-01 | unit | `python3 -m pytest tests/unit/test_qa_service.py -x -q` | ✅ (needs new cases) | ⬜ pending |
| 22-02-01 | 02 | 1 | CRIT-03 | unit | `python3 -m pytest tests/unit/test_config_validation.py -x -q` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 1 | SEC-01 | unit | `python3 -m pytest tests/unit/test_cors_config.py -x -q` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 2 | CRIT-04 | smoke | `docker build -f Dockerfile.production -t uniboard-prod . && docker run --rm uniboard-prod python -c "import src"` | ❌ Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_config_validation.py` — stubs for CRIT-03 (fail-fast on unsafe defaults)
- [ ] `tests/unit/test_cors_config.py` — stubs for SEC-01 (env-based CORS origins)
- [ ] New test cases in `tests/unit/test_qa_service.py` — stubs for CRIT-01 (AsyncClient usage)

*Existing pytest infrastructure covers all phase requirements. No new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker image builds and runs correctly | CRIT-04 | Requires Docker daemon | `docker build -f Dockerfile.production -t uniboard-prod . && docker run --rm uniboard-prod python -c "import src"` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
