---
phase: 17
slug: notifications-digest
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3 + pytest-asyncio 0.25 |
| **Config file** | `pyproject.toml` [tool.pytest.ini_options] |
| **Quick run command** | `uv run pytest tests/unit/ -x -q` |
| **Full suite command** | `uv run pytest tests/ -x -q --timeout=120` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `uv run pytest tests/unit/ -x -q`
- **After every plan wave:** Run `uv run pytest tests/ -x -q --timeout=120`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | DL-03 | unit | `uv run pytest tests/unit/test_risk_alert_service.py -x` | ✅ (broken) | ⬜ pending |
| 17-01-02 | 01 | 1 | PLAT-04 | unit | `uv run pytest tests/unit/test_token_health.py -x` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 2 | DL-02, DL-03, INTEL-03 | unit | `uv run pytest tests/unit/test_notification_service.py tests/unit/test_digest_service.py tests/unit/test_risk_alert_service.py -x` | ✅ (broken) | ⬜ pending |
| 17-02-02 | 02 | 2 | DL-02, PLAT-04 | unit | `uv run pytest tests/unit/test_deadline_reminders.py tests/unit/test_token_health.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_deadline_reminders.py` — stubs for DL-02 (check_deadline_reminders task logic)
- [ ] `tests/unit/test_token_health.py` — stubs for PLAT-04 (token expiry check and notification)
- [ ] Fix `tests/unit/test_notification_service.py` — User -> Profile migration
- [ ] Fix `tests/unit/test_digest_service.py` — User -> Profile migration
- [ ] Fix `tests/unit/test_risk_alert_service.py` — User -> Profile migration + `user` -> `profile` bug fix

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
