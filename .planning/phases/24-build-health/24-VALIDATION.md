---
phase: 24
slug: build-health
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-04-01
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3+ with pytest-asyncio (backend), tsc + ESLint (frontend) |
| **Config file** | `pyproject.toml` (backend), `tsconfig.json` + `.eslintrc.json` (frontend) |
| **Quick run command** | `uv run python -m ruff check src/ tests/ && uv run python -m mypy --strict src/` |
| **Full suite command** | `uv run python -m ruff check src/ tests/ && uv run python -m mypy --strict src/ && uv run python -m pytest tests/ -q && cd frontend && npx tsc --noEmit && npx next lint --max-warnings 0` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the specific tool being fixed (e.g., `ruff check` after ruff fixes)
- **After every plan wave:** All 5 tools in sequence
- **Before `/gsd:verify-work`:** Full suite must report zero errors/warnings
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | CRIT-02 | lint | `uv run python -m ruff check src/ tests/` | N/A (tool) | ⬜ pending |
| 24-01-02 | 01 | 1 | CRIT-02 | type-check | `uv run python -m mypy --strict src/` | N/A (tool) | ⬜ pending |
| 24-02-01 | 02 | 1 | CRIT-02 | test | `uv run python -m pytest tests/ -q` | tests/ exists | ⬜ pending |
| 24-03-01 | 03 | 1 | CRIT-02 | type-check | `cd frontend && npx tsc --noEmit` | N/A (tool) | ⬜ pending |
| 24-03-02 | 03 | 1 | CRIT-02 | lint | `cd frontend && npx next lint --max-warnings 0` | N/A (tool) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All tools and test infrastructure already exist. No Wave 0 setup needed.

- [x] ruff installed and configured in pyproject.toml
- [x] mypy installed and configured in pyproject.toml
- [x] pytest installed with pytest-asyncio
- [x] TypeScript configured in frontend/tsconfig.json
- [x] ESLint configured in frontend
