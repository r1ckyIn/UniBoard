---
phase: 13
slug: supabase-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3 + pytest-asyncio 0.25 (backend), vitest 4.1 (frontend) |
| **Config file** | `pyproject.toml` [tool.pytest.ini_options], `frontend/vitest.config.ts` |
| **Quick run command** | `python -m pytest tests/unit -x --timeout 30` |
| **Full suite command** | `python -m pytest tests/ --timeout 120 && cd frontend && pnpm typecheck` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest tests/unit -x --timeout 30`
- **After every plan wave:** Run `python -m pytest tests/ --timeout 120 && cd frontend && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 0 | INFRA-01 | migration | `supabase db reset && supabase db push` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 0 | INFRA-08 | unit | `python -m pytest tests/unit/test_supabase_auth.py -x` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 0 | INFRA-07 | unit | `python -m pytest tests/unit/test_encryption.py -x` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 0 | INFRA-09 | smoke | `docker compose up -d backend && curl http://localhost:8000/health` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 1 | INFRA-08 | unit | `cd frontend && pnpm test -- --run tests/hooks/use-auth.test.ts` | ❌ W0 | ⬜ pending |
| 13-03-01 | 03 | 2 | INFRA-09 | integration | `python -m pytest tests/integration/test_health.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_supabase_auth.py` — stubs for INFRA-08 (Supabase JWT validation)
- [ ] `tests/unit/test_encryption.py` — adapt existing for INFRA-07 (AES-256-GCM round-trip)
- [ ] `tests/integration/test_health.py` — stubs for INFRA-09 (health check with DB)
- [ ] `supabase/migrations/` — initial schema SQL covering INFRA-01
- [ ] Supabase CLI setup (`supabase init`, `config.toml`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase Auth email+password login via browser | INFRA-08 | End-to-end browser flow with Supabase GoTrue | 1. Navigate to localhost:3001/auth 2. Register 3. Login 4. Verify session in DevTools |
| RLS blocks cross-user data access | INFRA-01 | Requires two authenticated sessions | 1. Login as user A, insert data 2. Login as user B, query same table 3. Verify user B sees empty result |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
