---
phase: 5
slug: dashboard-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && pnpm vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && pnpm vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && pnpm vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | UI-01 | unit + visual | `pnpm vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for Dashboard page sections (hero, stats, grades, deadlines, donut, right panel)
- [ ] Test stubs for Header dropdown components (notification panel, avatar menu)
- [ ] Test fixtures extend existing mock data patterns from Phase 2

*Existing infrastructure covers test framework setup — vitest + testing-library already configured from prior phases.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero parallax fade on scroll | UI-01 | Scroll-driven visual effect, jsdom lacks scroll simulation | Scroll past hero, verify text fades progressively |
| Donut converge animation | UI-01 | Canvas animation timing, visual smoothness | Load dashboard, observe segments converge to center |
| Rough.js hand-drawn rendering | UI-01 | Visual quality of canvas-drawn elements | Inspect stats cards, progress bars, timeline, donut borders |
| Calendar dot color depth | UI-01 | Color intensity proportional to weight, visual judgment | Check calendar dates with varying deadline weights |
| Deadline hover micro-displacement | UI-01 | CSS translateX animation, visual effect | Hover deadline items, observe pop-up displacement |
| Staggered entrance animations | UI-01 | CSS delay timing and visual sequencing | Refresh page, observe slideUp + fadeIn staggering |

*These are visual/animation behaviors that require human verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
