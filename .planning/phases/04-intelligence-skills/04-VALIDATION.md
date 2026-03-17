---
phase: 4
slug: intelligence-skills
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x + pytest-asyncio (backend), vitest (frontend) |
| **Config file** | `pyproject.toml` (backend), `frontend/vitest.config.ts` (frontend) |
| **Quick run command** | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/ -x -q` |
| **Full suite command** | `mypy src/ && python -m pytest tests/ && ruff check .` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest tests/ -x -q`
- **After every plan wave:** Run `mypy src/ && python -m pytest tests/ && ruff check .`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | DL-02, DL-03 | unit | `pytest tests/unit/test_notification_service.py -x` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | INTEL-03, INTEL-04 | unit | `pytest tests/unit/test_digest_service.py -x` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | DL-02 | integration | `pytest tests/integration/test_notification_routes.py -x` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | FILE-03, FILE-04 | unit | `pytest tests/unit/test_ai_service.py -x` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | INTEL-02 | unit | `pytest tests/unit/test_intelligence_ai.py -x` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 2 | FILE-03 | integration | `pytest tests/integration/test_ai_routes.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_notification_service.py` — stubs for DL-02, DL-03
- [ ] `tests/unit/test_digest_service.py` — stubs for INTEL-03, INTEL-04
- [ ] `tests/unit/test_ai_service.py` — stubs for FILE-03, FILE-04
- [ ] `tests/unit/test_intelligence_ai.py` — stubs for INTEL-02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email delivery via SES | DL-02 | Requires SES sandbox / verified email | Send test email, verify inbox receipt |
| AI citation accuracy | FILE-03 | Requires human judgment on citation quality | Ask Q&A question, verify source citations match content |
| Skill file generation | SKILL-01–04 | .claude/skills/ files, dev tooling | Verify SKILL.md files exist with correct structure |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
