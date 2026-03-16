---
phase: 03
slug: frontend-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | frontend/vitest.config.ts (Wave 0 installs) |
| **Quick run command** | `cd frontend && pnpm test --run` |
| **Full suite command** | `cd frontend && pnpm test --run --coverage && pnpm build && pnpm lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm test --run`
- **After every plan wave:** Run `cd frontend && pnpm test --run --coverage && pnpm build && pnpm lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | UI-07 | build | `cd frontend && pnpm build` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | UI-07 | visual | `cd frontend && pnpm test --run` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | PLAT-01 | unit | `cd frontend && pnpm test --run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | UI-01 | integration | `cd frontend && pnpm test --run` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | UI-02 | integration | `cd frontend && pnpm test --run` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | UI-03 | integration | `cd frontend && pnpm test --run` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | UI-04 | unit | `cd frontend && pnpm test --run` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | UI-05 | integration | `cd frontend && pnpm test --run` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 2 | UI-06 | integration | `cd frontend && pnpm test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/vitest.config.ts` — vitest configuration with jsdom environment
- [ ] `frontend/src/test/setup.ts` — testing-library setup, custom matchers
- [ ] `pnpm create next-app frontend` — Next.js 15 scaffolding with Tailwind v4

*Wave 0 is handled as part of Plan 03-01 scaffolding tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rough.js hand-drawn borders render correctly | UI-07 | Canvas rendering not unit-testable | Open browser, verify card borders appear hand-drawn |
| Paper texture grain visible | UI-07 | SVG filter visual check | Open browser, verify subtle grain overlay on page background |
| Rough Notation animations play on load | UI-07 | Animation timing visual check | Open browser, verify circle/underline annotations animate |
| Responsive sidebar → mobile navigation | PLAT-02 | Viewport-dependent layout | Resize browser below 768px, verify bottom nav or hamburger |

*All other behaviors have automated verification via build + test + lint.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
