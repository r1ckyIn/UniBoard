---
phase: 18
slug: ai-enhancement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x + pytest-asyncio |
| **Config file** | `pyproject.toml` ([tool.pytest.ini_options]) |
| **Quick run command** | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/ -x -q --timeout=30` |
| **Full suite command** | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/ -v --timeout=60` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest tests/ -x -q --timeout=30`
- **After every plan wave:** Run `python -m pytest tests/ -v --timeout=60`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | INTEL-02 | unit | `pytest tests/services/test_ai_engine.py -v` | ✅ | ⬜ pending |
| 18-01-02 | 01 | 1 | INTEL-02 | unit | `pytest tests/services/test_intelligence.py -v` | ✅ | ⬜ pending |
| 18-01-03 | 01 | 1 | INTEL-02 | unit | `pytest tests/services/test_sync_engine.py -v` | ✅ | ⬜ pending |
| 18-02-01 | 02 | 1 | INTEL-02 | unit | `pytest tests/services/test_intelligence.py -v` | ✅ | ⬜ pending |
| 18-02-02 | 02 | 1 | INTEL-02 | integration | `pytest tests/web/test_intelligence_routes.py -v` | ✅ | ⬜ pending |
| 18-03-01 | 03 | 2 | INTEL-04 | unit | `pytest tests/services/test_digest.py -v` | ✅ | ⬜ pending |
| 18-03-02 | 03 | 2 | INTEL-04 | unit | `pytest tests/prompts/ -v` | ❌ W0 | ⬜ pending |
| 18-04-01 | 04 | 2 | INTEL-02, INTEL-04 | unit | `pytest tests/ -k "feedback or quality" -v` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/services/test_quality_gate.py` — stubs for F1 calculation, fallback trigger
- [ ] `tests/services/test_ai_feedback.py` — stubs for feedback collection endpoints
- [ ] `tests/prompts/test_digest_prompts.py` — stubs for i18n prompt generation

*Existing test infrastructure covers AI engine, intelligence service, digest service, and sync engine.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Feedback 👍/👎 buttons render in Course Detail & Digest | INTEL-02 | UI visual verification | Navigate to course detail, find AI-scored thread, verify thumbs up/down buttons visible |
| Urgency color labels display correctly | INTEL-04 | UI visual verification | Open digest page, verify Red/Orange/Blue/Gray color coding matches urgency scores |
| i18n summary language matches user preference | INTEL-04 | UI + language verification | Switch user language preference, refresh digest, verify summary language changes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
