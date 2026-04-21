---
quick_task: 260420-n29
quick_task_name: "fix GPU paint-cost stalls on Intel Mac — 4 subtypes across Header backdrop-blur / Sidebar bleeding shadow / Timetable skeleton shimmer / Grid entry fade (PRs #89-92)"
project: "UniBoard"
generated: "2026-04-20"
counts:
  decisions: 6
  lessons: 6
  patterns: 5
  surprises: 6
missing_artifacts:
  - "UAT.md (not produced — user confirmed perf via production UAT conversationally, no formal UAT artifact)"
source_artifacts:
  - ".planning/quick/260420-n29-fix-gpu-paint-cost-stalls-on-intel-mac-4/260420-n29-PLAN.md"
  - ".planning/quick/260420-n29-fix-gpu-paint-cost-stalls-on-intel-mac-4/260420-n29-SUMMARY.md"
  - ".planning/quick/260420-n29-fix-gpu-paint-cost-stalls-on-intel-mac-4/260420-n29-VERIFICATION.md"
  - "Memory: ~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-UniBoard/memory/project_backdrop_filter_intel_mac.md"
related_artifacts:
  - "Phase 37 (rolled back, branch deleted) — the architectural anti-pattern this work disproved"
  - "new-sight PR #95 — sister-project fix that established the diagnostic playbook"
commits:
  - "53623a3 — fix(layout): remove header backdrop-blur (#89)"
  - "38b5e68 — fix(layout): swap sidebar box-shadow for 1px border (#90)"
  - "9ba5b6d — fix(timetable): swap grid-skeleton shimmer for opacity-pulse (#91)"
  - "e0488d3 — perf(timetable): drop slide-up entry animation on the grid card (#92)"
  - "c6ed6eb — fix(csp): allow non-hosted Supabase origins in connect-src (#93)"
---

# Quick Task 260420-n29 Learnings: Intel-Mac GPU paint-cost fixes

## Decisions

### D1 — Drop `backdrop-filter: blur(18px)`, raise bg alpha to approximate frosted glass

Header's full-viewport sticky bar switched from `bg-[rgba(250,249,245,.82)] backdrop-blur-[18px]` to `bg-[rgba(250,249,245,.97)]`. No blur; the near-opaque alpha preserves the frosted-glass visual approximation without GPU raster work.

**Rationale:** `backdrop-filter` cost is O(w × h) on the raster pipeline. Any paint invalidation under the sticky header (sidebar hover, route transitions, modal opens) forced re-compositing the fullscreen blur. On Intel Mac the stall is enough to drop visible FPS to 2-5 while rAF still ticks at 60 Hz — classic "paint-area = GPU bottleneck" signature.
**Source:** 260420-n29-PLAN.md Task 1, commit 53623a3

---

### D2 — Replace Sidebar `box-shadow` with `border-r`

Sidebar's `shadow-[2px_0_16px_rgba(20,20,19,.06)]` (16 px blur extending ~18 px into main content) replaced by `border-r border-[rgba(20,20,19,.08)]`.

**Rationale:** `[contain:layout_paint]` isolates only INTERNAL paint — the shadow bleeding outside the contain boundary was NOT isolated. As the sidebar's width animated 68→224 px during hover, the shadow tracked with it and the browser re-rasterised everything underneath every frame. A border paints inside the contain box at zero per-frame cost.
**Source:** 260420-n29-PLAN.md Task 1, commit 38b5e68

---

### D3 — `animate-pulse` on the large skeleton, keep `animate-skeleton-shimmer` on small ones

Timetable's `h-[500px]` loading skeleton switched from `animate-skeleton-shimmer` + `bg-gradient-to-r` + `bg-[length:200%_100%]` to `animate-pulse` on solid `bg-[#f0ede6]`. Smaller skeletons (~120-220 px) retained shimmer.

**Rationale:** Animating `background-position` on a gradient cannot composite — the renderer re-rasterises the whole gradient every frame at 60 Hz. Cost scales O(w × h). A 500 px × viewport-width element is 4-10× the pixel budget of the ~120 px card banners and is past the threshold where re-raster becomes visible jank on Intel Mac. Opacity pulse is a pure compositor op.
**Source:** 260420-n29-PLAN.md Task 2, commit 9ba5b6d

---

### D4 — Remove `<AnimatedEntry delay={2}>` wrapper from `<TimetableGrid>`, not from the skeleton

`<TimetableGrid>` now renders as a direct sibling of the title row's closing `</AnimatedEntry>`. The wrapper itself was NOT deleted — it survives around the 500 px loading-state skeleton, where the fade cost is only paid briefly during loading.

**Rationale:** `slide-up` animates `opacity 0→1` over 0.6 s. On `<TimetableGrid>` (card + 14 px shadow → ~850 k px² compositor layer) the alpha blending is paint-visible on Intel Mac. Small cards have ~10-20× less layer area so the cost is invisible. Scope-match the animation to element size.
**Source:** 260420-n29-PLAN.md Task 2, commit e0488d3

---

### D5 — Roll back Phase 37 (two-layer DOM + transform sidebar rewrite)

Phase 37 attempted to replace `transition: width` with `transform: translateX` on a two-layer DOM (outer 68 px shell + inner 156 px panel). Rolled back (commit `9bab743` on a now-deleted branch).

**Rationale:** The Phase 37 thesis was that sidebar's width transition was the jank source. Evidence: automated rAF / LoAF measurements showed no paint cost. Reality: the synthetic benchmarks miss compositor-side bugs, AND the actual culprit was on a different component (Header `backdrop-filter`, then secondarily Sidebar's bleeding shadow). An architectural refactor cannot fix a single-CSS-property GPU cost. Scope bug fixes to CSS changes FIRST; architecture last.
**Source:** 260420-n29-SUMMARY.md (narrative), anti-pattern cited in memory file

---

### D6 — CSP: conditional non-hosted Supabase origins (local-dev only)

`next.config.ts` CSP `connect-src` now appends `NEXT_PUBLIC_SUPABASE_URL`'s origin + its ws(s) variant when the hostname does NOT match `*.supabase.co`.

**Rationale:** Local dev against `supabase start` (http://127.0.0.1:54321) was blocked by CSP. The conditional short-circuits to zero additions in production, so prod behaviour is unchanged. Shipped as a supporting fix in the same session because the session exposed the gap.
**Source:** 260420-n29-PLAN.md Task 3, commit c6ed6eb

---

## Lessons

### L1 — Synthetic rAF / LoAF benchmarks can't detect compositor-side GPU stalls

`requestAnimationFrame` keeps firing at 60 Hz even when the GPU is stalled and visible FPS drops to 2-5. Long Animation Frames PerformanceObserver reads the same JS clock and reports no issue. This is why Phase 37's `measureHoverLayoutWork` helper produced no usable signal.

**Context:** Built an LoAF helper expecting it to produce the diagnostic data for Phase 37; the data came back clean while the user still reported jank. The gap between "measurement says fine" and "user says janky" is exactly where compositor-side costs hide.
**Source:** 260420-n29-PLAN.md `<context>` narrative, Phase 37 deferred-items record

---

### L2 — "窗口越小越流畅" is the decisive Intel-Mac paint-cost clue

When a user says jank disappears at smaller viewport, paint cost is O(w × h) somewhere. This single user observation shortcircuits hours of automated-perf investigation.

**Context:** The clue was repeated verbatim by the user twice in the session (once for Header, once for Timetable). Both times it redirected investigation from "is this a React render cost?" to "what CSS property is doing fullscreen raster work?" and produced a fix in minutes.
**Source:** 260420-n29-SUMMARY.md user-clue section

---

### L3 — `[contain:layout paint]` only isolates INTERNAL paint; bleeding effects still ripple out

Sidebar had `[contain:layout_paint]` — yet its `box-shadow` extending 18 px into main content caused paint-ripple on timetable during width animation.

**Context:** The assumption that contain handles "everything inside the element" is wrong — it only isolates what's geometrically inside the contain box. Shadows, backdrop-filters, and any effect that paints outside the border-box are unaffected. Rule of thumb: if the CSS property can paint outside `width × height`, contain doesn't save you.
**Source:** 260420-n29-PLAN.md Task 1 `<action>`, 260420-n29-SUMMARY.md

---

### L4 — `will-change: <property>` only creates a compositor layer for `transform` and `opacity`

Sidebar had `will-change: width`. An old code comment claimed this "promoted the subtree to a dedicated compositor layer". It did not — non-transform/opacity `will-change` hints are browser-optional and typically only pre-warm style recalc, not layer creation.

**Context:** Discovered when reviewing why the box-shadow still caused per-frame raster despite `will-change: width`. Removed the hint in PR #90 and added a comment explaining the misconception so it doesn't get reintroduced.
**Source:** 260420-n29-PLAN.md Task 1 `<action>` (inline comment correction)

---

### L5 — `opacity` animation on a large shadow-bearing element forces layer promotion + per-frame alpha blending

The `slide-up` keyframe (opacity 0→1 + translateY 18→0) on `<TimetableGrid>` produced a compositor layer at ~850 k px² (card + 14 px shadow spread). Per-frame alpha blending of that layer size over 0.6 s was paint-visible on Intel Mac.

**Context:** Small cards (title row, right-panel blocks) have ~10-20× less layer area and are imperceptible. The lesson is not "never use fade-in" — it's "scope-match the animation to element size, and don't layer-promote anything with a large shadow".
**Source:** 260420-n29-PLAN.md Task 2 `<action>`, commit e0488d3

---

### L6 — Architectural refactors can't fix single-CSS-property GPU cost

Phase 37 burned ~1 dev-day on a two-layer DOM sidebar rewrite, which couldn't have fixed the bug because the bug was on a DIFFERENT component (Header). Sister-project new-sight burned 3 reverted PRs (#92, #93, #94) targeting JS / CSS-in-JS cost paths before PR #95 found the AntD modal-mask `backdrop-filter`. Same anti-pattern class.

**Context:** Both projects had the same failure mode: automated perf tooling says fine, so investigation moved up the stack. The fix was always one CSS property. The cost of not knowing this upfront was a day per project.
**Source:** memory/project_backdrop_filter_intel_mac.md (cross-project synthesis)

---

## Patterns

### P1 — "Smaller viewport = smoother" diagnostic playbook (4-step grep order)

When user reports jank that disappears at smaller viewport, run greps in this order BEFORE any architectural work:
1. `rg 'backdrop-filter|backdrop-blur' frontend/` → audit each usage's paint area; fix full-viewport ones first
2. `rg 'shadow-\[' frontend/` with `position: fixed|sticky` → audit any shadow with blur ≥ 8 px on an element whose size/width animates; swap for border
3. `rg 'animate-skeleton-shimmer|animate-.*shimmer' frontend/` → any skeleton ≥ ~300 px tall × full-width; swap for `animate-pulse`
4. `rg 'AnimatedEntry|opacity-0.*animate-' frontend/` → any opacity fade on element with box-shadow spreading a layer > ~500 k px²; drop the fade on that specific element

Each fix is 1-line CSS. If you finish the 4 steps and user still reports jank, THEN consider architecture.

**When to use:** User reports jank + says "窗口越小越流畅" / "smaller viewport smoother" / "放大卡" / "full screen laggy". Also any perf complaint on known Intel-Mac GPU.
**Source:** memory/project_backdrop_filter_intel_mac.md

---

### P2 — CSS swap, not architecture rewrite

Every GPU paint-cost fix shipped this session was a 1-line CSS change to a compositor-cheap equivalent: blur → solid-alpha, shadow → border, gradient animation → opacity pulse, opacity fade → no fade. Total diff across 4 PRs: ~20 lines. The rolled-back Phase 37 was 250+ line architectural change that didn't fix the underlying bug.

**When to use:** GPU paint-cost / compositor stall bugs on Intel Mac (and likely any integrated GPU). Architectural changes ONLY after P1's playbook comes up empty.
**Source:** 260420-n29-PLAN.md `<context>` narrative

---

### P3 — Scope-matched skeleton animation

Use `animate-pulse` (opacity cycle, compositor-only) for large skeletons (≥ 500 px tall × full-width). Use `animate-skeleton-shimmer` (background-position gradient) ONLY for small skeletons (≤ 220 px). The shimmer is visually nicer but only affordable on small paint areas.

**When to use:** Any loading skeleton. Threshold: if skeleton layer area > ~200 k px², prefer `animate-pulse`.
**Source:** 260420-n29-PLAN.md Task 2, commit 9ba5b6d

---

### P4 — Retrospective quick-task with verify-sentinels

For work that's already shipped but needs GSD documentation, use `/gsd-quick "..." --validate` with planner explicitly instructed to produce a past-tense PLAN whose `<verify>` blocks are grep sentinels against the live `main` codebase. Executor in retrospective mode runs the sentinels instead of doing code work. Verifier cross-checks must_haves.truths. This produces PLAN + SUMMARY + VERIFICATION artifacts without re-executing shipped work.

**When to use:** Session shipped code first (bug fix urgency), GSD documentation retroactively. The 260420-n29 directory is the canonical example.
**Source:** 260420-n29-PLAN.md (self-referential example)

---

### P5 — Grep sentinels that don't self-fail

Plan-checker caught 4 retrospective sentinels that matched their own explanatory comments or spanned multiple lines. Rules for sentinels:
- Narrow negative-match patterns to CSS utility syntax (e.g. `backdrop-blur-\[`, not bare `backdrop-blur`) so explanatory `"Do not re-introduce backdrop-blur"` comments don't false-positive
- Require surrounding delimiters for string literals (e.g. `"shadow-\[...` with the leading quote)
- Split multi-line assertions into 2 independent positive sentinels (e.g. `const X` on line N AND `/regex/` on line N+1 → two greps, not one `X.*regex`)
- In ERE with shell-quoted patterns: `$` end-anchor needs `\$` (one backslash), NOT `\\\$` (three)

**When to use:** Writing `<verify>` blocks in any GSD plan where greps self-check end state against the live codebase.
**Source:** 260420-n29-PLAN.md plan-checker iteration 1/2 findings

---

## Surprises

### S1 — Header's `backdrop-blur` was the sidebar-hover jank trigger — not Sidebar itself

Phase 37 spent an entire planning cycle on Sidebar architecture (two-layer DOM, transform-based animation). The actual culprit was `backdrop-blur-[18px]` on the Header, which had nothing to do with Sidebar's internals. User's sidebar-hover triggered paint invalidation under the header, which forced GPU to re-rasterize the fullscreen blur.

**Impact:** Redirected an entire architectural effort. The fix was a 1-line change to a file Phase 37 never touched. Taught that "the component that LOOKS like it's lagging" can be entirely downstream from the actual cost.
**Source:** 260420-n29-SUMMARY.md narrative, Phase 37 rollback (commit 9bab743 on deleted branch)

---

### S2 — Sidebar's subtle `.06`-alpha shadow caused jank ONLY on timetable

Sidebar's `shadow-[2px_0_16px_rgba(20,20,19,.06)]` was visually barely there (6% alpha, 16 px blur). On dashboard/courses/predict/settings it caused no perceptible issue. On timetable it produced visible jank because the shadow's 18 px right-edge strip overlapped the time gutter + first day column — ~30 absolute-positioned grid lines, hour labels, and event blocks. Paint cost scales with layer density under the shadow, not just shadow opacity.

**Impact:** Revealed that "minor" CSS effects can be page-specific performance cliffs. A border-right that looks identical fixes it for zero cost.
**Source:** 260420-n29-PLAN.md Task 1 `<action>`, user's observation that only timetable was still laggy after PR #89

---

### S3 — The biggest single win was swapping one skeleton's `animate-skeleton-shimmer` for `animate-pulse`

After Header + Sidebar fixes, user still reported initial-second jank on timetable. Expected: more subtle residual cost. Actual: a single 500 px × full-width skeleton with gradient-position animation was re-rasterising the entire gradient at 60 Hz for the ~500 ms it was visible. One `className=` change eliminated it.

**Impact:** Reinforced P3 (scope-matched skeleton). Also: the "entry-moment jank" wasn't a React render cost or hydration issue — it was pure GPU raster work during the loading state.
**Source:** 260420-n29-SUMMARY.md per-PR narrative, commit 9ba5b6d

---

### S4 — Plan-checker caught 4 real self-failing grep sentinels on the first retrospective plan

Expected the planner to nail the verify sentinels on first pass since the source files were unambiguous. Actual: 4/19 sentinels would have returned the wrong exit code because they matched their own explanatory comments (added by the SAME fix) or assumed tokens on a single line when they spanned two.

**Impact:** Plan-bounce + plan-checker saved a "VERIFICATION FAILED 4/19" false negative. Taught that retrospective sentinels need narrower patterns than forward-work sentinels (because the fix's own documentation is now in the file).
**Source:** 260420-n29-PLAN.md plan-checker iteration 1 issues, iteration 2 remaining S2b over-escape

---

### S5 — `grep -nE '...\$/i'` shell-quoting trap on the CSP sentinel

Planner wrote `grep -nE '/\\\.supabase\\\.co\\\$/i'` (three backslashes before `$`). Intent: ERE `$` end-anchor. Actual result: pattern demanded literal `\$` in the source, which isn't there. Required 1 fewer backslash: `\$`.

**Impact:** Single-character fix, but reinforced that cross-layer quoting (shell single-quotes → ERE regex) has non-obvious escape counts. In ERE `$` needs `\$` (one backslash to escape the metachar); in single-quoted shell that's pass-through; so the whole thing is `'\$'` with one visible backslash.
**Source:** 260420-n29-PLAN.md line 322, plan-checker iteration 2 finding

---

### S6 — Chrome CDP background-tab throttling blocks automated perf measurement

During Phase 37's LoAF verification attempt via Playwright MCP / agent-browser, backgrounded tabs had `rAF` throttled to 0 Hz and `setTimeout` to 1 Hz. Multiple workarounds failed: Promise eval, sessionStorage persistence, `Object.defineProperty(document, "visibilityState", ...)`, `osascript activate`.

**Impact:** Concluded automated LoAF verification in a CDP-controlled tab is infeasible in this harness. Combined with L1 (synthetic benchmarks miss compositor-side bugs anyway), this locked in a pragmatic rule: **user's visible-FPS report is authoritative for this class of bug**, not any automated metric. Manual DevTools Performance trace is the only reliable tool for compositor-side investigation, if ever needed.
**Source:** Phase 37 deferred-items record, referenced in 260420-n29-SUMMARY.md
