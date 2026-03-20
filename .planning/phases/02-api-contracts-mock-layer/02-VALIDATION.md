---
phase: 2
slug: api-contracts-mock-layer
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| **Config file** | `frontend/vitest.config.ts` (exists) |
| **Quick run command** | `cd frontend && pnpm test -- --run` |
| **Full suite command** | `cd frontend && pnpm test -- --run && pnpm typecheck && pnpm lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm test -- --run`
- **After every plan wave:** Run `cd frontend && pnpm test -- --run && pnpm typecheck && pnpm lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | INFRA-11a | unit | `npx openapi-typescript openapi/openapi.yaml --check` | N/A (CLI) | pending |
| 02-01-02 | 01 | 1 | INFRA-11b,c | unit | `pnpm build && pnpm typecheck` | N/A (build) | pending |
| 02-01-03 | 01 | 1 | INFRA-11b,f | unit | `pnpm test -- --run __tests__/api/client.test.ts __tests__/auth/store.test.ts` | Plan 01 Task 3 | pending |
| 02-02-01 | 02 | 2 | INFRA-11e | unit | `pnpm typecheck` | N/A (typecheck) | pending |
| 02-02-02 | 02 | 2 | INFRA-11e | unit | `pnpm build && pnpm typecheck` | N/A (build) | pending |
| 02-03-01 | 03 | 2 | INFRA-11e | unit | `pnpm build && pnpm typecheck` | N/A (build) | pending |
| 02-04-01 | 04 | 2 | INFRA-11e | unit | `pnpm build && pnpm typecheck` | N/A (build) | pending |
| 02-04-02 | 04 | 2 | INFRA-11e | unit | `pnpm test -- --run __tests__/api/mock-routes.test.ts` | Plan 04 Task 2 | pending |
| 02-05-01 | 05 | 3 | INFRA-11d | unit | `pnpm typecheck && pnpm build` | N/A (build) | pending |
| 02-05-02 | 05 | 3 | INFRA-11d | unit | `pnpm test -- --run __tests__/hooks/use-courses.test.ts` | Plan 05 Task 2 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] `frontend/__tests__/api/client.test.ts` — ky client auth injection and 401 handling (Plan 01 Task 3)
- [x] `frontend/__tests__/auth/store.test.ts` — zustand auth store persist and clear (Plan 01 Task 3)
- [x] `frontend/__tests__/api/mock-routes.test.ts` — route handler envelope format (Plan 04 Task 2)
- [x] `frontend/__tests__/hooks/use-courses.test.ts` — representative hook test with QueryClient wrapper (Plan 05 Task 2)
- [x] Type generation check via `openapi-typescript --check` in CI script (Plan 01 Task 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP data fixtures look realistic | CONTEXT decision | Fixture content quality | Review fixture files against real Canvas/Ed data |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
