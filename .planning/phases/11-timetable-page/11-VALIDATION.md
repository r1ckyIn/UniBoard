---
phase: 11
slug: timetable-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && pnpm vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && pnpm vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && pnpm vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | UI-08 | unit+integration | `pnpm vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/pages/timetable/` — test directory for timetable page tests
- [ ] Route handler mocks for `/api/v1/timetable/sessions` and `/api/v1/timetable/weeks`

*Existing test infrastructure (vitest, testing-library, MSW) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Weekly grid visual layout | UI-08 | CSS grid positioning, compressed evening zone visual | Open timetable page, verify events display in correct time slots with dual-density time axis |
| Current time indicator | UI-08 | Real-time red line position | Open page during class hours, verify red line at correct position |
| Week slider interaction | UI-08 | Drag interaction with range input | Drag slider through weeks 1-14, verify grid updates |
| Event overlap layout | UI-08 | Side-by-side column visual rendering | Navigate to day with overlapping events, verify columns render correctly |
| Deadline dashed line overlay | UI-08 | CSS dashed line positioning on grid | Verify deadline lines appear at correct time positions with tooltips |
| Breathing arrow animation | UI-08 | CSS animation visual | Scroll to bottom of day with off-screen deadline, verify hint + animation |
| All Weeks overlay mode | UI-08 | Full semester overlay visual | Toggle All Weeks, verify all events overlaid on single grid |
| Break week message | UI-08 | Centered empty state | Navigate to Week 7, verify "Mid-semester Break" message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
