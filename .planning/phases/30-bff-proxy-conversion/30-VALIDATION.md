---
phase: 30
slug: bff-proxy-conversion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x with jsdom |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && pnpm test -- --run` |
| **Full suite command** | `cd frontend && pnpm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm test -- --run && pnpm typecheck`
- **After every plan wave:** Run `cd frontend && pnpm test -- --run && pnpm lint && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | BFF-01, BFF-02, BFF-03 | unit | `cd frontend && pnpm test -- --run __tests__/api/proxy.test.ts` | ❌ W0 | ⬜ pending |
| 30-02-01 | 02 | 2 | BFF-01 | unit | `cd frontend && pnpm test -- --run` | ✅ | ⬜ pending |
| 30-03-01 | 03 | 3 | BFF-01 | unit | `cd frontend && pnpm test -- --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/api/proxy.test.ts` — covers BFF-01 (proxyRequest utility), BFF-02 (JWT forwarding), BFF-03 (error transformation)
- [ ] `frontend/__tests__/api/proxy-routes.test.ts` — spot-check converted routes call proxyRequest correctly

*Existing test infrastructure (vitest + jsdom) covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE streaming proxy displays AI responses | BFF-01 | SSE streaming requires running backend | Start backend + frontend, test QA/review stream pages |
| Real data displayed in UI after proxy conversion | BFF-01 | Requires live backend with real user tokens | Login → navigate all pages → verify data is real |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
