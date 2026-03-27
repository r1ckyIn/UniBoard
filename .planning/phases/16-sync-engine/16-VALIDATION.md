---
phase: 16
slug: sync-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3+ with pytest-asyncio 0.25+ |
| **Config file** | `pyproject.toml` [tool.pytest.ini_options] |
| **Quick run command** | `uv run pytest tests/unit/test_sync_tasks.py -x --timeout=30` |
| **Full suite command** | `uv run pytest tests/ -x --timeout=120` |
| **Estimated runtime** | ~30 seconds (unit), ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `uv run pytest tests/unit/ -x --timeout=30`
- **After every plan wave:** Run `uv run pytest tests/ -x --timeout=120`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | INFRA-02e | migration | `uv run pytest tests/unit/test_sync_tasks.py -x -k "history"` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | INFRA-02e | unit | `uv run pytest tests/unit/test_sync_tasks.py -x -k "history"` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | INFRA-02b | unit | `uv run pytest tests/unit/test_sync_tasks.py -x -k "deadline"` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 1 | INFRA-02d | unit | `uv run pytest tests/unit/test_sync_tasks.py -x -k "outline"` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 2 | INFRA-02a-e | integration | `uv run pytest tests/integration/test_sync_engine.py -x` | Partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/models/sync_history.py` — SyncHistory ORM model
- [ ] `supabase/migrations/00000000000003_sync_history.sql` — sync_history table migration
- [ ] `tests/unit/test_sync_tasks.py` — unit test stubs for sync task wiring
- [ ] Fix `tests/integration/test_sync_engine.py` — update User→Profile, password→JWT auth

*Existing infrastructure (conftest.py, pytest-asyncio, test DB) covers most needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scheduler triggers at correct intervals | INFRA-02 | APScheduler cron timing requires real clock | Start app, verify via logs that jobs fire at expected intervals |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
