---
phase: 03
slug: auth-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && pnpm vitest run --testPathPattern auth` |
| **Full suite command** | `cd frontend && pnpm vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm vitest run --testPathPattern auth`
- **After every plan wave:** Run `cd frontend && pnpm vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | UI-09 | unit | `pnpm vitest run --testPathPattern auth` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | UI-09 | unit | `pnpm vitest run --testPathPattern auth` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | UI-09, PLAT-02 | unit + integration | `pnpm vitest run --testPathPattern auth` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/auth/` — test directory for auth page components
- [ ] Auth form rendering tests — login/register form validation
- [ ] Auth guard redirect tests — authenticated/unauthenticated routing
- [ ] Form switching animation — visual regression not automated, manual verify

*Existing vitest infrastructure from Phase 1/2 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rough.js border redraw during form switch | UI-09 | Canvas rendering not testable in jsdom | Switch login↔register, verify border redraws smoothly without flicker |
| Entrance animation stagger timing | UI-09 | CSS/Motion animation timing not verifiable in jsdom | Load auth page, verify layered entrance: doodles → logo → tagline → features → form |
| Auth page visual match to prototype | UI-09 | Pixel comparison requires browser | Compare side-by-side with prototype/auth.html |
| Password strength meter real-time update | UI-09 | Visual indicator state | Type passwords of varying strength, verify bar updates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
