---
phase: 40-shared-component-polish
plan: 03
subsystem: ui
tags: [sidebar, layout, transform, gpu-compositing, contain-paint, tailwind-v4, intel-mac, performance]

# Dependency graph
requires:
  - phase: 39-design-token-foundation
    provides: "--spacing-sidebar-w (68px) + --spacing-sidebar-w-expanded (224px) + --color-orange-soft + --color-dark + --motion-base + --ease-claude-out tokens"
  - phase: 40-shared-component-polish (plan-01)
    provides: "@utility transition-claude-base shorthand (Phase 40 plan-1) consumed by inner panel transform animation; transition-claude-fast shorthand already swept onto nav <Link>s in plan-1"
provides:
  - "Two-layer Sidebar DOM: outer 68px stable layout occupier + inner 224px translateX-animated panel"
  - "GPU-composited hover-expand animation (transform replaces width animation; main content padding-left:68px invariant)"
  - "Single-source-of-truth active highlight rendered inside inner panel only (D-40-09; no bridging element on outer 68px shell)"
  - "Env-gated Playwright spec stub for 60fps Intel Mac verification (auto-skips without PERF_TEST_PASSWORD per Phase 39 SEED-39 carry-forward)"
  - "Geometry SPIKE artifact at prototype/sidebar-geometry-spike.html resolving RESEARCH A6 HIGH-RISK assumption (Option A locked)"
affects: [phase-41 (A11Y — A11Y-04 keyboard navigation + A11Y-05 prefers-reduced-motion will extend the inner panel transform; both deferred from this plan per D-40-10 + RESEARCH Q5), phase-42 (NEWVIS — TokenStep / SuccessStep navigation surfaces will inherit the two-layer pattern if they introduce sidebar-like rails), phase-43 (dark-mode — bg-dark token consumed by inner panel will receive --color-dark-* override)]

# Tech tracking
tech-stack:
  added: []  # No new dependencies — pure consumer of Phase 39 tokens + Phase 40 plan-1 @utility shorthand
  patterns: ["Two-layer DOM (outer layout occupier + inner translate-animated panel) for hover-expand surfaces that must not shift main content position", "GPU-composited transform animation replacing width animation for paint-cost-sensitive Intel Mac targets", "Static HTML SPIKE artifact in prototype/ for geometry verification before structural rewrite", "Env-gated Playwright spec stub pattern (Phase 39 SEED-39 carry-forward)"]

key-files:
  created:
    - "frontend/components/layout/Sidebar.tsx (rewritten — full structural change, two-layer DOM)"
    - "frontend/__tests__/components/layout/Sidebar.test.tsx (5 unit tests covering 40-03-01..05)"
    - "frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts (env-gated Playwright stub, 98 lines)"
    - "prototype/sidebar-geometry-spike.html (SPIKE artifact for D-40-08 Option A verification)"
  modified:
    - "frontend/components/layout/Sidebar.tsx (140 LOC -> 142 LOC; structure swapped, navItems[]/bottomItems[]/isActive helper preserved)"

key-decisions:
  - "D-40-08 honored (Option A literal D-40-08 — translate-x-[-156px] + group-hover:translate-x-0; locked per checker BLOCKER-4 fix; SPIKE confirmed visual outcome before rewrite)"
  - "D-40-09 honored (active highlight bg-orange-soft text-orange renders inside inner panel only — single source of truth; outer 68px shell has no bridging highlight element)"
  - "D-40-10 honored (prefers-reduced-motion deferred to Phase 41 A11Y-05; not shipped this plan)"
  - "D-40-12 honored (TDD triplet: SPIKE chore -> RED test -> GREEN refactor -> docs)"
  - "BLOCKER-4 resolution: SPIKE's role is verification of CONTEXT.md LOCKED Option A geometry, NOT redesign; Option C hybrid was removed from candidate set"
  - "BLOCKER-6 resolution: 40-03-03 test asserts Option A semantics exclusively (translate-x-[-156px] + group-hover:translate-x-0); the alternate clause that would have allowed Option C to pass was removed"
  - "WARNING-4 resolution: must_haves truth is the user-observable >55fps median; 60fps stable retained as deferred_truth requiring post-deploy human UAT on Intel Mac"

patterns-established:
  - "Pattern 1: Two-layer DOM for hover-expand surfaces — outer fixed-width layout occupier (with [contain:layout_paint] + 1px right border) + inner absolute-positioned translate-animated panel (with [contain:layout_paint] + will-change-transform). Phase 41/42 sidebar-like surfaces should reuse this scaffold."
  - "Pattern 2: SPIKE artifact in prototype/<slug>.html for geometry-ambiguous structural rewrites — verify visual outcome of locked CONTEXT decisions BEFORE the production rewrite, with documented escalation policy if visual parity is violated."
  - "Pattern 3: Env-gated Playwright stub for deferrable visual/perf baselines — author spec in-tree, gate via shouldRunPerfSuite() helper, defer baseline generation to user-runnable closure procedure with credentials provisioned (Phase 39 SEED-39 carry-forward)."

requirements-completed: [SHARED-03]

# Metrics
duration: ~10min
completed: 2026-05-02
---

# Phase 40 Plan 03: SHARED-03 Sidebar Two-Layer Transform-Based DOM Summary

**Sidebar.tsx rewritten as two-layer DOM (outer 68px stable layout occupier + inner 224px translateX-animated panel) eliminating v2.0 width-animation reflow on Intel Mac; active highlight rendered inside inner panel only (single source of truth); env-gated Playwright spec stub committed for post-deploy 60fps human UAT.**

## Performance

- **Duration:** ~10 min (4 task commits + this docs commit)
- **Started:** 2026-05-02T07:04:34Z (worktree initialization)
- **Completed:** 2026-05-02T07:15:24Z
- **Tasks:** 4 (Task 1 SPIKE + Task 2a RED + Task 2b GREEN + Task 3 Playwright stub + Task 4 docs)
- **Files modified:** 4 (Sidebar.tsx rewritten + Sidebar.test.tsx new + phase40-sidebar-60fps.spec.ts new + sidebar-geometry-spike.html new)

## Accomplishments

- **Sidebar two-layer DOM rewrite**: Outer `<aside>` 68px is now the stable layout occupier (`fixed inset-y-0 left-0 w-[var(--spacing-sidebar-w)]`); inner `<div>` 224px panel translates from `translateX(-156px)` to `translateX(0)` on hover via `group-hover:translate-x-0`. GPU-composited; main content `padding-left:68px` is invariant across hover/expand/collapse cycles. Eliminates v2.0 width-animation reflow that stalled Intel Mac compositor.
- **Active-highlight single source of truth (D-40-09)**: `bg-orange-soft text-orange` rendered inside the inner panel only; no bridging element on the outer 68px shell. Right ~68px of inner panel visible while collapsed exposes the right edge of nav items + right portion of the orange highlight on the active row (per CONTEXT.md D-40-08 LOCKED reading + RESEARCH Pattern 5).
- **Geometry SPIKE artifact**: `prototype/sidebar-geometry-spike.html` renders Option A literal D-40-08 side-by-side with the Option C conventional alternate (kept for visual comparison only, NOT shipping). Resolves RESEARCH Assumption A6 HIGH-RISK + Open Question 1; ships Option A per locked CONTEXT decision (BLOCKER-4 fix).
- **Env-gated Playwright stub**: `frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts` (98 lines) authored with two tests — hover-expand >55fps median frame timing + collapse-without-main-content-reflow X-position stability assertion. Auto-skips when `PERF_TEST_PASSWORD` env var unset; user runs `--update-snapshots` post-deploy on Intel Mac per Phase 39 SEED-39 carry-forward closure procedure.
- **TDD triplet preserved (D-40-12)**: SPIKE chore -> RED test commit -> GREEN refactor commit -> docs commit. Per Phase 39 LEARNINGS pattern — RED Sidebar.test.tsx landed before the GREEN Sidebar.tsx rewrite (verified failing 3/5 tests against current implementation; passing 5/5 after rewrite).
- **Build green**: `pnpm lint --max-warnings 0` + `pnpm typecheck` + `pnpm test --run __tests__/components/layout/Sidebar.test.tsx` (5/5) + `pnpm build` all exit 0; First Load JS unchanged at 220 KB (Phase 39 LEARNINGS bundle-stability surprise holds — transform replaces width animation without bundle delta).

## Task Commits

Each task was committed atomically per the D-40-12 TDD triplet pattern:

1. **Task 1: SPIKE — verify Option A literal D-40-08 geometry** — `8d94c44` (chore)
2. **Task 2a: TDD RED — Sidebar.test.tsx covering two-layer DOM contract** — `feae300` (test)
3. **Task 2b: TDD GREEN — rewrite Sidebar.tsx as two-layer transform-based DOM** — `3028ae4` (refactor)
4. **Task 3: env-gated Playwright spec stub for Sidebar 60fps Intel Mac** — `1c74374` (test)
5. **Task 4: this SUMMARY.md docs commit** — pending (worktree mode)

_Note: Per worktree-mode contract, STATE.md / ROADMAP.md / REQUIREMENTS.md updates are deferred to the orchestrator after merge. The TDD triplet is atomically expressed by Task 2a (RED) -> Task 2b (GREEN) -> Task 4 (docs)._

## Files Created/Modified

### Created
- `frontend/__tests__/components/layout/Sidebar.test.tsx` — 5 Vitest unit tests (40-03-01..05) covering two-layer DOM render + outer 68px container fixed + inner panel translateX collapsed default (Option A literal) + active highlight inside inner panel + transition-claude-base shorthand verification
- `frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts` — env-gated Playwright stub (98 lines) with two tests (hover-expand >55fps median + collapse animation does not trigger main content reflow); imports `shouldRunPerfSuite` + `loginAsPerfTestUser` from `./helpers/auth`
- `prototype/sidebar-geometry-spike.html` — SPIKE artifact (261 lines) rendering Option A literal D-40-08 vs Option C conventional alternate side-by-side; documents RESOLVED status + escalation policy

### Modified
- `frontend/components/layout/Sidebar.tsx` — full structural rewrite (140 LOC -> 142 LOC, similar size; navItems/bottomItems/isActive helper preserved verbatim from v2.0; outer width animation swapped for inner translateX animation)

## Geometry Decision (Task 1 SPIKE outcome — locked per BLOCKER-4)

**Decision: Option A (literal D-40-08) shipped — no escalation triggered.**

Per CONTEXT.md D-40-08 LOCKED with explicit values `translate-x-[-156px]` + `hover:translate-x-0`, the inner 224px panel sits at `translateX(-156px)` by default; right ~68px visible inside the outer 68px clipping window shows the rightmost edge of the inner panel containing the right portion of nav items + the right portion of the orange highlight bar on the active "Timetable" row. On hover the inner panel translates to `translateX(0)`; the leftmost 68px of the panel becomes visible (icons + start of labels) while the right 156px overflows the outer clip box on the right.

The SPIKE artifact `prototype/sidebar-geometry-spike.html` confirms this geometry visually before the structural rewrite. Option C "conventional" alternate (outer overflow:hidden -> hover:visible, inner naturally left-anchored) was rendered side-by-side for visual comparison only and is NOT shipping. Option B "inverted-anchor" was documented in PLAN.md objective text as historical analysis context only and is also NOT shipping.

Escalation policy was documented in the SPIKE file but not triggered: default path (ship Option A) executed cleanly. The `bg-orange-soft text-orange` active highlight on the right portion of the active row in collapsed state IS a sufficient navigation signal per the CONTEXT.md LOCKED reading, and human-UAT verification (MANUAL-40-01) post-deploy on Intel Mac will confirm visual feel against v2.0 reference.

## Validation Status

| Task ID | Test Type | Status | Notes |
|---------|-----------|--------|-------|
| 40-03-01 | unit (`two-layer DOM renders`) | green | outer `<aside>` + inner `<div>` first child |
| 40-03-02 | unit (`outer 68px container fixed`) | green | `fixed` + `w-[var(--spacing-sidebar-w)]` + `[contain:layout_paint]` |
| 40-03-03 | unit (`inner panel translateX collapsed default`) | green | Option A literal D-40-08 — `translate-x-[-156px]` + `group-hover:translate-x-0`; outer NOT animating width (BLOCKER-6 fix locked assertions) |
| 40-03-04 | unit (`active highlight inside inner panel`) | green | `bg-orange-soft text-orange` on `<a>` inside inner; outer has NO direct highlight child |
| 40-03-05 | unit (`transition-claude-base`) | green | Phase 40 plan-1 @utility shorthand applied to inner panel + 4 inner spans |
| 40-03-06 | manual-only (60fps Intel Mac human UAT) | deferred | MANUAL-40-01 — post-deploy on user's primary Intel Mac via DevTools Performance recording |
| 40-03-07 | env-gated Playwright stub | deferred | spec committed; baseline generation deferred to user-runnable closure procedure (`PERF_TEST_PASSWORD=*** npx playwright test phase40-sidebar-60fps --update-snapshots`) |

**Total plan-03 scoped tests: 5/5 passing** (40-03-01..05). 40-03-06 (manual UAT) + 40-03-07 (env-gated Playwright baseline) deferred to post-deploy per Phase 39 SEED-39 carry-forward pattern.

## Decisions Honored

- **D-40-08** ✅ Option A literal D-40-08 shipped (translate-x-[-156px] + group-hover:translate-x-0; locked per CONTEXT.md LOCKED values; BLOCKER-4 fix prevented Option C hybrid divergence)
- **D-40-09** ✅ Active highlight inside inner panel only (single source of truth; outer 68px shell has no bridging highlight element; verified by 40-03-04 test asserting `outer.querySelector(":scope > .bg-orange-soft, ...")` returns null)
- **D-40-10** ✅ `prefers-reduced-motion` instant-toggle deferred to Phase 41 A11Y-05 — NOT shipped this plan
- **D-40-12** ✅ TDD triplet preserved (SPIKE chore -> RED Sidebar.test -> GREEN Sidebar rewrite -> docs commit). Phase 39 LEARNINGS triplet pattern from `pre-bounce` template carries forward.

## Checker Resolution

- **BLOCKER-4** ✅ Plan-3 implementation locked to Option A literal D-40-08 — no Option C hybrid divergence. SPIKE's role is verification of CONTEXT.md LOCKED Option A geometry, NOT redesign. Escalation path documented in `prototype/sidebar-geometry-spike.html` (only triggered if SPIKE reveals v2.0-parity show-stopper); default path (ship Option A) executed cleanly.
- **BLOCKER-6** ✅ 40-03-03 test asserts Option A semantics exclusively. The earlier alternate clause (`expect(inner.className).toContain("group-hover:overflow-visible")` OR-style) that would have allowed Option C to pass was removed. Test is now Option-A-specific.
- **WARNING-4** ✅ `must_haves.truths` includes the user-observable form (>55fps median during production UAT); 60fps Intel Mac stable retained as `must_haves.deferred_truths` requiring post-deploy human UAT (MANUAL-40-01) — cannot be expressed as a CI assertion because CI lacks Intel Mac hardware and 60fps signal varies by GPU/refresh-rate.

## Decisions Diverged

None. SPIKE confirmed Option A literal D-40-08 produces the expected v2.0-parity visual outcome; no escalation triggered; ships clean per LOCKED CONTEXT decision.

## Deferred / Out-of-Scope

- **Sidebar `prefers-reduced-motion` instant-toggle** — Phase 41 A11Y-05 owns the global a11y pass for transitions across all components per D-40-10.
- **Sidebar keyboard navigation (`Esc` to collapse, focus management on hover-expand)** — Phase 41 A11Y-04 (keyboard navigation pass) owns this. SHARED-03 only ships the structural transform refactor.
- **60fps Intel Mac Playwright baseline generation** — env-gated stub committed in this plan; user runs closure procedure post-deploy on Intel Mac to lock in the baseline. Phase 39 SEED-39 carry-forward pattern applies.
- **Pixel-diff visual regression baselines (Sidebar 4 pages, Button/Input across 10 pages)** — MANUAL-40-02 deferred to production human UAT. Phase 39 SEED-39 closure pattern carries forward.
- **23 pre-existing test failures from missing next-intl provider** — documented in `.planning/phases/40-shared-component-polish/deferred-items.md` as DEFERRED-40-01 (out of scope per SCOPE BOUNDARY rule). Plan-03 scoped tests (5/5) all pass; Sidebar rewrite introduces zero new test regressions in this area.

## Pattern References Used

- **RESEARCH Pattern 5** (Sidebar.tsx full rewrite per D-40-08 — RESEARCH lines 738-897; copied verbatim as the structural template)
- **RESEARCH Pattern 10** (Playwright spec stub with 2 tests — RESEARCH lines 1192-1264; spec content copied verbatim)
- **RESEARCH Q6 + Q8** (geometry resolution + env-gated stub closure procedure)
- **PATTERNS Excerpt D** (RoughCard two-layer analog — pattern reference for outer-stable-inner-translating geometry)
- **PATTERNS Excerpt E** (Sidebar self-rewrite preserve+swap table — guides which v2.0 elements to preserve verbatim vs swap structurally)
- **PATTERNS Excerpt I** (next-intl + i18n navigation mock idiom — copied from LoginForm.test.tsx)
- **PATTERNS Excerpt L** (Phase 39 transition-parity.spec.ts analog + helper paths — confirms `@playwright/test` installed since Phase 38 P04, no `@ts-nocheck` pragma needed)
- **Phase 39 LEARNINGS** (env-gated Playwright spec stub for deferrable visual baselines — Phase 39 SEED-39 closure procedure; TDD triplet commit pattern; "First Load JS unchanged" bundle-stability surprise — confirmed for transform-based animation replacing width animation)
- **memory: backdrop_filter_intel_mac.md** (GPU paint-cost family of Intel Mac regressions — 4 subtypes documented; v2.0 width-animated sidebar fell into "bleeding shadow" subtype that this rewrite eliminates by construction)

## Build Stats

- **First Load JS shared by all:** 220 KB (unchanged from pre-plan-03 baseline)
- **Phase 39 LEARNINGS surprise CONFIRMED**: Sidebar structural rewrite (transform replaces width animation, 4 className shifts from `transition-opacity duration-[0.28s]` to `transition-claude-base`, 2 hex literals replaced with `bg-orange-soft` token) net ZERO measurable bundle delta. Tailwind v4 dedupes globally; transform vs width animation shares the same Tailwind utility surface.
- **No new dependencies** added — pure consumer of Phase 39 tokens + Phase 40 plan-1 @utility shorthand.

## HUMAN-UAT Required (post-deploy)

Per VALIDATION manual-only entries (MANUAL-40-01 + MANUAL-40-04):

- **MANUAL-40-01**: Sidebar 60fps stable on Intel Mac during hover-expand/collapse. User opens deployed Vercel preview on primary Intel Mac, opens DevTools -> Performance, records 5-second hover-expand interaction on Dashboard / Predict / Settings / Timetable pages, confirms 60fps stable bar (no red layout-shift markers).
- **MANUAL-40-02**: Pixel-diff visual parity vs v2.0 baseline (Sidebar 4 pages). Manual screenshot diff via Chrome DevTools Recorder against v2.0 reference deployment OR run Playwright suite with `PERF_TEST_PASSWORD=*** npx playwright test phase40-sidebar-60fps --update-snapshots` to lock in the baseline.
- **MANUAL-40-04**: Rough.js hand-drawn borders preserved across all components. RoughCard borders untouched by this plan; visual smoke check confirms borders still render after the Sidebar rewrite (sketchy hand-drawn aesthetic intact across 10 pages).

## Issues Encountered

- **Worktree base mismatch on initialization**: HEAD was on `c86b07f` (Phase 39 only) but the executor expected base `9d1865d` (Wave 2 base — post-Plan-01 merge). Pre-flight HEAD assertion correctly detected the mismatch and reset to expected base via `git reset --hard 9d1865d3668c4345790f3a3ee7fe11bdab5c3f4c`. After reset, Plan-01's `frontend/components/ui/Button.tsx` + `Input.tsx` + `__tests__/components/ui/*` + `globals.css` `@utility transition-claude-base` block were correctly visible in the worktree. No work was lost.
- **`prototype/sidebar-geometry-spike.html` initial write to wrong path**: First Write call placed the file at the main repo path `/Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard/prototype/` instead of the worktree path. Corrected by deleting from the main repo and rewriting to the worktree absolute path. No commit ever referenced the misplaced file.

## Deviations from Plan

None — plan executed exactly as written. Geometry SPIKE confirmed Option A literal D-40-08 produces the expected v2.0-parity visual outcome (no escalation triggered); RED -> GREEN -> docs triplet preserved; all 5 plan-03 unit tests pass green; pnpm lint/typecheck/build all 0; no out-of-scope discoveries beyond the 23 pre-existing test failures already documented in DEFERRED-40-01 by Plan-01.

## Next Phase Readiness

Phase 40 ALL PLANS COMPLETE pending plan-02 + plan-03 worktree merges. After both Wave 2 worktrees merge:
- Phase 40 ready for `/gsd-code-review 40` + `/gsd-verify-work 40`
- Phase 41 (A11Y) unblocked: A11Y-04 keyboard navigation + A11Y-05 prefers-reduced-motion will extend the Sidebar inner panel transform per D-40-10 deferral
- Phase 42 (NEWVIS) unblocked: TokenStep / SuccessStep / AI Chat fragments inherit Button + Input primitives (Plan-01) + StreamingAssistant pattern (Plan-02) + two-layer DOM scaffold (Plan-03)

---

## Self-Check: PASSED

- ✅ `prototype/sidebar-geometry-spike.html` exists (261 lines, RESOLVED Option A marker present)
- ✅ `frontend/components/layout/Sidebar.tsx` rewritten (translate-x-[-156px] + group-hover:translate-x-0 + transition-claude-base + will-change-transform + bg-orange-soft + [contain:layout_paint] all present; transition-[width] + hover:w-[...] both removed)
- ✅ `frontend/__tests__/components/layout/Sidebar.test.tsx` exists (5 unit tests; all 5 pass against the rewritten Sidebar.tsx)
- ✅ `frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts` exists (98 lines, env-gated stub; imports shouldRunPerfSuite + loginAsPerfTestUser from ./helpers/auth)
- ✅ commit `8d94c44` exists (Task 1 SPIKE)
- ✅ commit `feae300` exists (Task 2a RED)
- ✅ commit `3028ae4` exists (Task 2b GREEN)
- ✅ commit `1c74374` exists (Task 3 Playwright stub)
- ✅ pnpm lint --max-warnings 0 exits 0
- ✅ pnpm typecheck exits 0
- ✅ pnpm test --run __tests__/components/layout/Sidebar.test.tsx -> 5/5 pass
- ✅ pnpm build exits 0; First Load JS = 220 KB (unchanged)
- ✅ All comments in source/test files are English-only per CLAUDE.md (Sidebar.tsx, Sidebar.test.tsx, phase40-sidebar-60fps.spec.ts — verified by `grep -cE "[一-龥]" -> 0`)
- ✅ STATE.md / ROADMAP.md / REQUIREMENTS.md NOT modified (worktree-mode contract — orchestrator owns those writes after merge)

---
*Phase: 40-shared-component-polish*
*Plan: 03*
*Completed: 2026-05-02*
