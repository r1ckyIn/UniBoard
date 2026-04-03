---
phase: 23
slug: code-quality
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x + pytest-asyncio |
| **Config file** | `pyproject.toml` (pytest section) |
| **Quick run command** | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/ -x -q --timeout=30` |
| **Full suite command** | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/ -v --timeout=60` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest tests/ -x -q --timeout=30`
- **After every plan wave:** Run `python -m pytest tests/ -v --timeout=60`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | QUAL-01 | unit | `python -m pytest tests/unit/sync/ -x -q` | ⬜ W0 | ⬜ pending |
| 23-01-02 | 01 | 1 | QUAL-01 | integration | `python -c "from src.sync.grades import sync_all_grades"` | ⬜ W0 | ⬜ pending |
| 23-02-01 | 02 | 1 | QUAL-02 | unit | `python -m pytest tests/ -k "request" -x -q` | ✅ | ⬜ pending |
| 23-02-02 | 02 | 1 | QUAL-02 | unit | `python -m pytest tests/ -k "auth or user" -x -q` | ✅ | ⬜ pending |
| 23-03-01 | 03 | 2 | QUAL-03 | lint | `ruff check src/ --select F401` | ✅ | ⬜ pending |
| 23-03-02 | 03 | 2 | QUAL-03 | type | `mypy --strict src/` | ✅ | ⬜ pending |
| 23-04-01 | 04 | 2 | QUAL-04 | unit | `python -m pytest tests/ -k "health" -x -q` | ⬜ W0 | ⬜ pending |
| 23-04-02 | 04 | 2 | QUAL-04 | unit | `python -m pytest tests/ -k "shutdown or dispose" -x -q` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing test suite passes before any refactoring begins
- [ ] `python -m pytest tests/ -x -q` returns 0

*Existing infrastructure covers most phase requirements. New tests needed only for resource lifecycle (QUAL-04).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `wc -l` on split sync modules | QUAL-01 | Line count verification | `wc -l src/sync/*.py` — no file > 300 lines |
| Dead code line count | QUAL-03 | Cumulative deletion tracking | `git diff --stat` shows ≥300 lines removed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
