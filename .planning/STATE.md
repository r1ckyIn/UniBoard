---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: — UI Polish & Cohesion (Claude 美学叠加层)
status: executing
stopped_at: Phase 40 all plans complete; ready for /gsd-code-review 40 + /gsd-verify-work 40
last_updated: "2026-05-02T07:22:49.000Z"
last_activity: 2026-05-02 -- Phase 40 execution started
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 7
  completed_plans: 3
  percent: 71
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-27)

**Core value:** Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place
**Current focus:** Phase 40 — shared-component-polish

## Current Position

Phase: 40 (shared-component-polish) — EXECUTING
Plan: 1 of 3
Status: Executing Phase 40
Last activity: 2026-05-02 -- Phase 40 execution started

## Milestones Completed

- **v2.0 — Production Foundation** — Shipped 2026-04-25 (39 phases, ~140 plans, 262 commits)
  - See: .planning/MILESTONES.md
  - Archive: .planning/milestones/v2.0-ROADMAP.md, .planning/milestones/v2.0-REQUIREMENTS.md, .planning/milestones/v2.0-MILESTONE-AUDIT.md
- **v2.0-m2 Backend Core** — Shipped 2026-03-27 (Phases 13-17, 13 plans, 149 tests) — sub-milestone within v2.0
  - See: .planning/MILESTONES.md
  - Archive: .planning/milestones/v2.0-m2-ROADMAP.md

## Deferred Items

Items acknowledged and deferred at v2.0 milestone close on 2026-04-27 (audit-open scan: 41 items):

### Debug sessions (12)

| Slug | Status | Notes |
|------|--------|-------|
| auth-animation-book-opening | diagnosed | spring layout + RoughCard hover |
| auth-blur-validation | diagnosed | react-hook-form mode confirmed |
| auth-lang-switch-resets-form | investigating | locale route remount |
| auth-scrollbar-shift | investigating | overflow-y rule |
| course-deadlines-panel-gaps | diagnosed | badge format + Rough.js border |
| edpostspanel-missing-features | diagnosed | author info omission |
| phase12-settings-uat-gaps | diagnosed | 5 root causes documented |
| roughcard-border-not-sketchy | investigating | rough.js gap geometry |
| roughcard-border-snap | investigating | ResizeObserver redraw |
| setup-lang-switch-reset | diagnosed | locale-route remount confirmed |
| setup-success-step-bugs | diagnosed | 3 root causes confirmed |
| setup-token-input-bugs | diagnosed | 2 independent bugs confirmed |

### UAT gaps (14 phases — 11 fully resolved 0 pending; 3 with pending scenarios)

| Phase | File | Status | Pending |
|-------|------|--------|---------|
| 03 | 03-UAT.md | diagnosed | 0 |
| 04 | 04-UAT.md | diagnosed | 0 |
| 07 | 07-UAT.md | resolved | 0 |
| 09 | 09-UAT.md | resolved | 0 |
| 10 | 10-UAT.md | diagnosed | 0 |
| 12 | 12-UAT.md | diagnosed | 0 |
| 19 | 19-UAT.md | resolved | 0 |
| 26 | 26-HUMAN-UAT.md | partial | 3 |
| 28 | 28-HUMAN-UAT.md | partial | 0 |
| 28 | 28-UAT.md | passed | 0 |
| 31 | 31-HUMAN-UAT.md | resolved | 1 |
| 31 | 31-UAT.md | resolved | 0 |
| 33 | 33-HUMAN-UAT.md | partial | 7 |
| 38 | 38-HUMAN-UAT.md | partial | 1 |

### Verification gaps (7 — all `human_needed`)

| Phase | File | Status |
|-------|------|--------|
| 11.1 | 11.1-VERIFICATION.md | human_needed |
| 26 | 26-VERIFICATION.md | human_needed |
| 31 | 31-VERIFICATION.md | human_needed |
| 33 | 33-VERIFICATION.md | human_needed |
| 34 | 34-VERIFICATION.md | human_needed |
| 38 | 38-VERIFICATION.md | human_needed |
| 38.2 | 38.2-VERIFICATION.md | human_needed |

### Quick tasks (5 missing)

| Slug | Status |
|------|--------|
| platform-errors-post-domain (20260417) | missing |
| 260420-n29-fix-gpu-paint-cost-stalls-on-intel-mac-4 | missing |
| 260423-ebp-purge-null-canvas-courses | missing (on branch — not merged) |
| 260423-gir-add-on-delete-cascade-to-all-course-prof | missing (on branch — not merged) |
| 260423-i5k-strip-markdown-code-fences-in-ai-engine- | missing |

### Seeds (3 dormant)

| Seed ID | Status | Title |
|---------|--------|-------|
| SEED-001-react-hooks-v7-cleanup | dormant | react-hooks v7 strict-rule cleanup |
| SEED-002-fk-parent-drift-auth-users-vs-profiles | dormant | Resolve ORM-vs-DB parent-table drift on 5 user_id FKs |
| SEED-003-passive-deletes-cleanup-selectinload | dormant | passive_deletes=True + remove _CASCADE_LOAD_OPTIONS selectinload |

**Disposition:** All 41 items intentionally deferred — automated coverage was uniformly green for v2.0 must-have requirements, and these are tracked human checkpoints / parked ideas / on-branch fixes awaiting other gates. The v3.0 milestone (next) should review SEED-002/003 promotion and decide on the 2 on-branch PRs.

## Performance Metrics

**Velocity:**

- Total plans completed: 10
- Average duration: 6.3min
- Total execution time: 0.63 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 2/2 | 15min | 7.5min |
| 38 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: 01-02 (7min), 02-01 (7min), 02-03 (6min), 02-04 (8min), 02-05 (4min)
- Trend: stable

*Updated after each plan completion*
| Phase 02 P01 | 7min | 3 tasks | 9 files |
| Phase 02 P03 | 6min | 1 task | 12 files |
| Phase 02 P04 | 8min | 2 tasks | 9 files |
| Phase 02 P02 | 9min | 2 tasks | 23 files |
| Phase 02 P05 | 4min | 2 tasks | 13 files |
| Phase 03 P01 | 6min | 2 tasks | 11 files |
| Phase 03 P02 | 5min | 2 tasks | 13 files |
| Phase 03 P03 | 4min | 2 tasks | 8 files |
| Phase 04 P01 | 6min | 2 tasks | 9 files |
| Phase 04 P02 | 4min | 2 tasks | 6 files |
| Phase 04 P03 | 7min | 2 tasks | 7 files |
| Phase 04 P04 | 3min | 2 tasks | 9 files |
| Phase 04 P05 | 5min | 2 tasks | 4 files |
| Phase 05 P00 | 3min | 2 tasks | 13 files |
| Phase 05 P01 | 5min | 2 tasks | 6 files |
| Phase 05 P02 | 6min | 2 tasks | 4 files |
| Phase 05 P04 | 3min | 2 tasks | 4 files |
| Phase 05 P03 | 3min | 3 tasks | 4 files |
| Phase 05 P05 | 5min | 2 tasks | 5 files |
| Phase 05 P07 | 2min | 1 tasks | 1 files |
| Phase 05 P06 | 3min | 2 tasks | 9 files |
| Phase 05 P08 | 2min | 2 tasks | 10 files |
| Phase 05 P09 | 5min | 2 tasks | 7 files |
| Phase 05 P10 | 3min | 2 tasks | 6 files |
| Phase 06 P01 | 3min | 2 tasks | 7 files |
| Phase 06 P02 | 5min | 2 tasks | 5 files |
| Phase 07 P01 | 3min | 2 tasks | 10 files |
| Phase 07 P02 | 5min | 2 tasks | 10 files |
| Phase 07 P03 | 5min | 2 tasks | 7 files |
| Phase 07 P04 | 6min | 2 tasks | 10 files |
| Phase 08 P01 | 3min | 2 tasks | 8 files |
| Phase 08 P02 | 10min | 2 tasks | 6 files |
| Phase 08 P03 | 11min | 2 tasks | 4 files |
| Phase 09 P01 | 4min | 2 tasks | 9 files |
| Phase 09 P01 | 4 | 2 tasks | 9 files |
| Phase 09 P02 | 4min | 2 tasks | 5 files |
| Phase 09 P03 | 10min | 2 tasks | 8 files |
| Phase 10 P01 | 4min | 2 tasks | 8 files |
| Phase 10 P02 | 2min | 2 tasks | 5 files |
| Phase 10 P03 | 4min | 2 tasks | 4 files |
| Phase 11 P01 | 7min | 2 tasks | 13 files |
| Phase 11 P02 | 5min | 2 tasks | 6 files |
| Phase 11 P03 | 4min | 2 tasks | 5 files |
| Phase 11.1 P02 | 10min | 2 tasks | 8 files |
| Phase 11.1 P01 | 13min | 2 tasks | 15 files |
| Phase 12 P01 | 4min | 2 tasks | 12 files |
| Phase 12 P02 | 5min | 2 tasks | 7 files |
| Phase 12 P03 | 9min | 2 tasks | 10 files |
| Phase 13 P01 | 15min | 2 tasks | 6 files |
| Phase 13 P03 | 11min | 4 tasks | 14 files |
| Phase 13 P02 | 14min | 3 tasks | 35 files |
| Phase 14 P01 | 3min | 2 tasks | 4 files |
| Phase 14 P02 | 3min | 2 tasks | 2 files |
| Phase 14 P03 | 3min | 2 tasks | 4 files |
| Phase 15 P01 | 6min | 3 tasks | 6 files |
| Phase 15 P02 | 7min | 3 tasks | 7 files |
| Phase 15 P03 | 9min | 2 tasks | 8 files |
| Phase 16 P02 | 7min | 2 tasks | 2 files |
| Phase 17 P01 | 3min | 2 tasks | 3 files |
| Phase 17 P02 | 8min | 2 tasks | 8 files |
| Phase 18 P02 | 6min | 2 tasks | 12 files |
| Phase 18 P03 | 4min | 2 tasks | 10 files |
| Phase 19 P02 | 3min | 2 tasks | 4 files |
| Phase 19 P04 | 5min | 2 tasks | 8 files |
| Phase 20 P01 | 3min | 2 tasks | 5 files |
| Phase 20 P02 | 5min | 2 tasks | 4 files |
| Phase 20 P03 | 5min | 2 tasks | 3 files |
| Phase 21 P02 | 5min | 2 tasks | 6 files |
| Phase 21 P03 | 4min | 2 tasks | 5 files |
| Phase 23 P02 | 6min | 2 tasks | 13 files |
| Phase 23 P03 | 2min | 2 tasks | 6 files |
| Phase 24 P01 | 11min | 2 tasks | 27 files |
| Phase 24 P02 | 7min | 2 tasks | 10 files |
| Phase 24 P03 | 6min | 2 tasks | 12 files |
| Phase 25 P02 | 7min | 1 task | 7 files |
| Phase 26 P01 | 2min | 2 tasks | 3 files |
| Phase 26 P02 | 3min | 2 tasks | 3 files |
| Phase 26 P03 | 6min | 2 tasks | 13 files |
| Phase 30 P03 | 5min | 2 tasks | 13 files |
| Phase 31 P01 | 5min | 2 tasks | 3 files |
| Phase 32 P02 | 11min | 2 tasks | 14 files |
| Phase 32.1 P00 | 4min | 2 tasks | 17 files |
| Phase 32.1 P01 | 3min | 2 tasks | 4 files |
| Phase 32.1 P02 | 8min | 2 tasks | 4 files |
| Phase 32.1 P03 | 6min | 2 tasks | 4 files |
| Phase 32.1 P04 | 4min | 1 tasks | 2 files |
| Phase 32.1 P05 | 6min | 3 tasks | 5 files |
| Phase 33 P01 | 2min | 2 tasks | 2 files |
| Phase 33 P08 | 2 | 2 tasks | 3 files |
| Phase 33 P03 | 6min | 2 tasks | 5 files |
| Phase 33 P06 | 7min | 1 tasks | 4 files |
| Phase 33 P02 | 15min | 3 tasks | 8 files |
| Phase 33 P05 | 9min | 3 tasks | 11 files |
| Phase 33 P07 | 25min | 3 tasks | 11 files |
| Phase 39 P01 | 15min | 2 tasks (TDD RED+GREEN) | 6 files |
| Phase 39 P02 | 7min | 2 tasks (TDD RED+GREEN) tasks | 3 files files |
| Phase 39 P03 | 8min | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v3.0 Roadmap]: 5 phases (39-43) derived from 25 REQs. Phase 39 owns 7 REQs (DESIGN/MOTION/TYPO together) since they all share the same dependency profile (foundation token layer) and downstream consumers depend on them as a single bundle.
- [v3.0 Roadmap]: Phase 40 absorbs Phase 37 sidebar transform refactor via SHARED-03; backlog 999.1 fully consolidated into SHARED-03 (no longer a separate backlog item).
- [v3.0 Roadmap]: Phase 42 absorbs auto-bootstrapped Phase 36 UX Polish via NEWVIS-01..04. Mapping: UXPOL-01→NEWVIS-03, UXPOL-02→NEWVIS-04, UXPOL-03→NEWVIS-01, UXPOL-04→NEWVIS-02.
- [v3.0 Roadmap]: Phase 35 Push Notifications (NOTIFY-01..03) deferred to v3.1 — out of UI scope. Not duplicated, not subsumed. Carried in REQUIREMENTS.md "Future Requirements (Deferred)" section.
- [v3.0 Roadmap]: Phase 43 Dark Mode marked optional with cost-benefit gate before kickoff. Rough.js dynamic stroke generation (DARK-02) may be expensive; if implementation cost > 2 plans, defer entire phase to v3.1.
- [v3.0 Roadmap]: All 5 phases tagged with `**UI hint**: yes` since the entire milestone is UI-scoped. `/gsd-ui-phase` should fire on every phase plan.
- [Phase 39 plan-1]: Adopted culori@4.0.2 + @types/culori@4.0.1 as the canonical hex→oklch pipeline; round-trip ΔE measured via mode-aware `differenceEuclidean('oklch')` (Pitfall 5).
- [Phase 39 plan-1]: scripts/hex-to-oklch.mjs structured as library+CLI hybrid (`if (import.meta.url === \`file://${process.argv[1]}\`)` guard) so unit tests dynamic-import `convert()` instead of duplicating math. Pattern reusable for future build-time CSS generators.
- [Phase 39 plan-1]: `@supports not (color: oklch(0% 0 0))` is the canonical feature-query test value (Pitfall 3) — `oklch(0)` parses as a number and fails on browsers that need the fallback.
- [Phase 39 plan-1]: Brand SSOT (orange/blue/green) hex values cite anthropics/skills/brand-guidelines; project palette cites prototype/DESIGN_SYSTEM.md. Inline `/* source: ... */` comments preserve provenance in CSS itself per D-02.
- [Phase 39 plan-1]: Empty `[data-theme="dark"] { }` block reserved for Phase 43 (warm-deep-brown #2b2a27); structural reservation keeps Phase 43 changes additive.

(For v2.0 decisions log — 200+ entries — see archive at `.planning/milestones/v2.0-STATE.md` if extracted, otherwise consult PROJECT.md Key Decisions table.)

- [Phase 39 plan-2]: Adopted Tailwind v4 namespaces --text-* / --leading-* / --tracking-* (RESEARCH §Q1) instead of D-06 names; D-06 names compile but generate zero utilities (Pitfall 4). Phase 40 needs the generated utilities.
- [Phase 39 plan-2]: tracking-body intentionally omitted (browser default 'normal' per RESEARCH §Q6) — only hero/section get negative tracking and caption gets +0.06em uppercase rhythm.
- [Phase 39 plan-2]: Multi-line CSS comments must avoid embedded literal */ patterns — PostCSS parses them as premature comment closure. Use --font-size-X notation in prose instead of --font-size-* glob to dodge build errors.
- Q7-corrected SSE cursor pattern: --animate-streaming-cursor-blink uses 'step-end infinite' (NOT alternate) per RESEARCH §Q7 — D-15 'alternate' would create 2s perceived period; codified in CSS comment + sse-keyframes.test.ts negative regex
- D-14 v2.0 legacy --ease/--ease-fast aliases re-installed in plan-3 motion block (plan-1 had not preserved them); deprecation comment added; Phase 40 SHARED-01 will deprecate site-wide
- ESLint rule installed via inline no-restricted-syntax (no plugin); two selectors (Literal + TemplateElement) cover both static className strings and template-literal interpolations; createRequire rooted on eslint-config-next walks pnpm strict symlinks for parser

### Roadmap Evolution

- Phase 11.1 inserted after Phase 11: Real data integration and UAT gap closure (URGENT)
- Phase 27 added: Frontend UX Fixes & Course Materials Preview (dashboard/timetable fixes, materials viewer)
- Phase 28 added: Deadlines Page Enhancement (card redesign, delete/pin, all/week modes, persistence)
- v3.0 milestone bootstrap (2026-04-27): auto-bootstrapped Phases 35/36/37 superseded during re-scope
- v3.0 re-scope (2026-04-27): 25 REQs across 8 categories defined; roadmapper derived Phases 39-43

### Pending Todos

None.

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260420-n29 | fix GPU paint-cost stalls on Intel Mac — 4 subtypes across Header backdrop-blur / Sidebar bleeding shadow / Timetable skeleton shimmer / Grid entry fade (PRs #89-92) | 2026-04-20 | c6ed6eb | Verified | [260420-n29-fix-gpu-paint-cost-stalls-on-intel-mac-4](./quick/260420-n29-fix-gpu-paint-cost-stalls-on-intel-mac-4/) |
| 260423-ebp | purge stale canvas_course_id=NULL Course rows at end of `_upsert_courses` (branch `fix/purge-stale-null-canvas-courses`; ship deferred until parallel `ed-lessons-sync-degraded` debug finishes — cascade would delete lessons) | 2026-04-23 | ffc7f2d | On branch — not merged | [260423-ebp-purge-null-canvas-courses](./quick/260423-ebp-purge-null-canvas-courses/) |
| 260423-gir | add ON DELETE CASCADE to all Course/Profile/Module/Lesson child FKs (18 FKs, 15 model files) (ORM diff only — migration reverted after Supabase schema audit) (branch `fix/add-on-delete-cascade-fks`, PR #117) | 2026-04-23 | 29e07fa | On branch — not merged | [260423-gir-add-on-delete-cascade-to-all-course-prof](./quick/260423-gir-add-on-delete-cascade-to-all-course-prof/) |

## Session Continuity

Last session: --stopped-at
Stopped at: Phase 40 context gathered

**Planned Phase:** 40 (Shared Component Polish) — 3 plans — 2026-04-30T07:33:09.003Z
