---
phase: quick-260420-n29
verified: 2026-04-20T00:00:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
mode: retrospective
re_verification:
  previous_status: null
  previous_score: null
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Quick Task 260420-n29: Fix GPU Paint-Cost Stalls on Intel Mac — Verification Report

**Task Goal:** Fix GPU paint-cost stalls on Intel Mac — 4 subtypes across Header backdrop-blur / Sidebar bleeding shadow / Timetable skeleton shimmer / Grid entry fade (PRs #89-92), plus a supporting CSP local-Supabase allow-list fix (PR #93).
**Verified:** 2026-04-20
**Status:** passed
**Re-verification:** No — initial verification
**Mode:** Retrospective — all five commits were already on `main` before the plan was authored. Verifier's role was to cross-check `must_haves.truths` against the current working tree and confirm commit reachability.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `Header.tsx` contains no `backdrop-blur` class; sticky header uses solid `rgba(250,249,245,.97)` alpha with an inline "do not re-introduce" warning. | VERIFIED | Header.tsx L67: `"bg-[rgba(250,249,245,.97)]"`. Warning comment L58-63. Grep `className=.*backdrop-blur-\[` returns zero matches — only the cautionary comment at L58 mentions the utility, and it deliberately omits the `className=` prefix so it does not trip future negative sentinels. |
| 2 | `Sidebar.tsx` uses `border-r` for right-edge separator; no `shadow-[` box-shadow utility remains active on the `<aside>`. | VERIFIED | Sidebar.tsx L62: `"overflow-hidden border-r border-[rgba(20,20,19,.08)]"`. The only `shadow-[` occurrence in the file is on L54 inside an explanatory comment documenting the superseded utility — it is not rendered. No `"shadow-[2px_0_16px_rgba(20,20,19,.06)]"` utility string present. |
| 3 | `TimetablePage.tsx`'s 500 px grid-skeleton placeholder uses `animate-pulse` (compositor-opacity-only); the `animate-skeleton-shimmer` + `bg-[length:200%_100%]` + gradient stack is no longer applied to the `h-[500px]` block. | VERIFIED | TimetablePage.tsx L301: `<div className="bg-[#f0ede6] border-[1.5px] border-[#d0cdc4] rounded-[14px] h-[500px] animate-pulse" />`. Grep `h-[500px].*animate-skeleton-shimmer` returns zero matches. Small right-panel skeletons (L307, L310, L313) correctly retain shimmer at heights `220/180/160 px` — below the re-raster cost threshold. Narrative comment at L293-300 documents the swap. |
| 4 | `TimetableGrid` is rendered directly as a sibling of the title row's `AnimatedEntry` wrapper — it is NOT wrapped in `<AnimatedEntry delay={2}>` or any other `AnimatedEntry`, so the grid does not pay a 0.6 s opacity-fade compositor cost on mount. | VERIFIED | TimetablePage.tsx L349-360: title row's `<AnimatedEntry delay={1}>...</AnimatedEntry>` wraps `<TimetableTitleRow>` only. L361-364: `/* No AnimatedEntry here — the grid's box-shadow + ~850k px² compositor layer... */` comment. L365-374: `<TimetableGrid ...>` rendered as direct sibling, NOT wrapped. `AnimatedEntry delay={2}` appears exactly once in the file (L292, loading skeleton branch) — NOT on the main-render grid. Three `AnimatedEntry delay={1}` occurrences (loading skeleton, error state, main render title row) confirm title row still fades in. |
| 5 | `next.config.ts` computes `supabaseExtraOrigins` conditionally (non-hosted Supabase URL → appends origin + ws(s) variant) and spreads them into `connect-src`, so local `supabase start` at `127.0.0.1:54321` passes CSP without widening the production whitelist. | VERIFIED | next.config.ts L14-23: full conditional logic present. L16-17: `supabaseIsHosted` gates on `/\.supabase\.co$/i` regex against hostname. L18-23: `supabaseExtraOrigins` is `[]` when hosted, else `[supabaseOrigin, supabaseOrigin.replace(/^http(s?):/, (_, s) => (s ? "wss:" : "ws:"))]`. L29: `...supabaseExtraOrigins` spread into `connectSrc`. Production entries L27 `"https://*.supabase.co"` and L28 `"wss://*.supabase.co"` preserved unchanged. Comment L11-13 names "non-hosted Supabase origins" and `127.0.0.1:54321` explicitly. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/components/layout/Header.tsx` | Header chrome without backdrop-filter GPU stall | VERIFIED | 6,013 bytes; backdrop-blur removed; alpha raised to .97; L58 warning comment present |
| `frontend/components/layout/Sidebar.tsx` | Sidebar with border-r separator, no bleeding shadow paint ripple | VERIFIED | 5,440 bytes; L62 `border-r`; L67 `[contain:layout_paint]`; L52 `duration-[0.14s]`; no active `shadow-[` utility |
| `frontend/components/timetable/TimetablePage.tsx` | Timetable skeleton + grid entry without O(w×h) paint stalls | VERIFIED | 15,631 bytes; L301 `animate-pulse` on 500 px skeleton; L365 `<TimetableGrid>` unwrapped; L361 relocation comment |
| `frontend/next.config.ts` | CSP connect-src accepts non-hosted Supabase origins | VERIFIED | 3,165 bytes; L14-23 full conditional origin logic; L29 spread into connectSrc |

### Commit Reachability (from `main`)

| SHA | PR | Subject | `git merge-base --is-ancestor main` |
|-----|-----|---------|-------------------------------------|
| `53623a3` | #89 | fix(layout): remove header backdrop-blur — GPU stall on Intel Mac | REACHABLE |
| `38b5e68` | #90 | fix(layout): swap sidebar box-shadow for 1px border — paint ripple on timetable | REACHABLE |
| `9ba5b6d` | #91 | fix(timetable): swap grid-skeleton shimmer for opacity-pulse — gradient re-raster stall | REACHABLE |
| `e0488d3` | #92 | perf(timetable): drop slide-up entry animation on the grid card | REACHABLE |
| `c6ed6eb` | #93 | fix(csp): allow non-hosted Supabase origins in connect-src | REACHABLE |

All five commits confirmed on `main` at verification time.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Diagnostic memory file | Retrospective plan | canonical diagnostic reference | VERIFIED | `~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-UniBoard/memory/project_backdrop_filter_intel_mac.md` referenced in both PLAN.md context block and SUMMARY.md "Canonical References" section |
| `Header.tsx` | backdrop-filter diagnostic step 1 | grep sentinel | VERIFIED | L58 warning comment is grep-verifiable ("Do not re-introduce") and doubles as maintainer reminder |
| `Sidebar.tsx` | shadow-on-fixed-element diagnostic step 2 | grep sentinel | VERIFIED | L54-61 explanatory comment about paint-cheap border vs blur-shadow is grep-discoverable |
| `TimetablePage.tsx` | shimmer + entry-fade diagnostic steps 3-4 | grep sentinel | VERIFIED | L293-300 (shimmer→pulse rationale) and L361-364 ("No AnimatedEntry here") comments both grep-discoverable |

### Data-Flow Trace (Level 4)

Not applicable — this is a retrospective verification of CSS/style-level fixes. The artifacts render chrome/layout and do not flow dynamic data for rendering purposes that require tracing; data flow through `TimetablePage` was not modified by this task (the fix was purely structural: removing an `AnimatedEntry` wrapper, swapping animation classes). All four modified files compile cleanly under the existing build pipeline (evidenced by the fact that PRs #89-93 all passed CI before merge).

### Behavioral Spot-Checks

Skipped — this retrospective's scope is CSS-property-level audit. User explicitly confirmed production UAT outcome ("好了很多" after PR #92 merged). Per task instructions, production-side perf testing is out of scope for this retrospective verifier — the paint-cost improvement is user-visible and was validated by the developer at large viewport on Intel Mac before each PR merge.

### Requirements Coverage

| Requirement | Source | Description | Status | Evidence |
|-------------|--------|-------------|--------|----------|
| N29-CHROME-JANK-HEADER | PLAN frontmatter | Remove backdrop-blur from sticky Header | SATISFIED | Truth 1 VERIFIED |
| N29-CHROME-JANK-SIDEBAR | PLAN frontmatter | Replace Sidebar bleeding box-shadow with border-r | SATISFIED | Truth 2 VERIFIED |
| N29-TIMETABLE-SKELETON-SHIMMER | PLAN frontmatter | Swap 500 px grid-skeleton shimmer → animate-pulse | SATISFIED | Truth 3 VERIFIED |
| N29-TIMETABLE-GRID-ENTRY-FADE | PLAN frontmatter | Relocate `AnimatedEntry delay={2}` off `<TimetableGrid>` | SATISFIED | Truth 4 VERIFIED |
| N29-CSP-LOCAL-SUPABASE | PLAN frontmatter | Conditionally widen CSP connect-src for non-hosted Supabase | SATISFIED | Truth 5 VERIFIED |

All 5 requirements SATISFIED. No orphan requirements (REQUIREMENTS.md does not track quick-task IDs; these are local to the plan frontmatter).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | All 4 modified files scanned; no `TODO`/`FIXME`/`PLACEHOLDER` markers, no hardcoded empty-state stubs, no `console.log`-only implementations. The intentional explanatory comments (Header L58-63, Sidebar L51-66, TimetablePage L293-300 / L361-364) are documentation, not anti-patterns — they serve as grep sentinels for future maintainers. |

### Independent Sentinel Re-Check (21/21)

Verifier re-ran each of the 21 shell sentinels declared in PLAN.md against the working tree:

**Task 1 — Layout chrome (7/7):**
1. `! grep 'className=.*backdrop-blur-\[' Header.tsx` → 0 matches (PASS — negative sentinel)
2. `grep 'bg-\[rgba(250,249,245,\.97)\]' Header.tsx` → L67 (PASS)
3. `grep 'Do not re-introduce' Header.tsx` → L58 (PASS)
4. `grep 'border-r border-\[rgba(20,20,19,\.08)\]' Sidebar.tsx` → L62 (PASS)
5. `! grep '"shadow-\[2px_0_16px_rgba(20,20,19,\.06)\]"' Sidebar.tsx` → 0 matches (PASS — negative sentinel)
6. `grep '\[contain:layout_paint\]' Sidebar.tsx` → L55 (comment) + L67 (active) (PASS)
7. `grep 'duration-\[0\.14s\]' Sidebar.tsx` → L52 (PASS)

**Task 2 — Timetable fixes (8/8):**
8. `grep 'h-\[500px\]\s+animate-pulse' TimetablePage.tsx` → L301 (PASS)
9. `! grep 'h-\[500px\].*animate-skeleton-shimmer' TimetablePage.tsx` → 0 matches (PASS — negative sentinel)
10. `grep 'animates .background-position. on a' TimetablePage.tsx` → L293 (PASS)
11. `grep -cE 'h-\[(160|180|220)px\].*animate-skeleton-shimmer' | grep '3'` → count=3 (PASS)
12. `grep '^\s*<TimetableGrid' TimetablePage.tsx` → L365 (PASS)
13. `grep 'No AnimatedEntry here' TimetablePage.tsx` → L361 (PASS)
14. `grep 'AnimatedEntry delay=\{1\}' TimetablePage.tsx` → L289, L325, L349 (PASS)
15. `grep -cE 'AnimatedEntry delay=\{2\}' | grep '^1$'` → count=1 (PASS)

**Task 3 — CSP (6/6):**
16. `grep 'supabaseExtraOrigins' next.config.ts` → L18 (def), L29 (spread) (PASS)
17. `grep 'const supabaseIsHosted' next.config.ts` → L16 (PASS)
18. `grep '/\\\.supabase\\\.co\$/i' next.config.ts` → L17 (PASS)
19. `grep '"https://\*.supabase.co"' next.config.ts` → L27 (PASS)
20. `grep '"wss://\*.supabase.co"' next.config.ts` → L28 (PASS)
21. `grep 'replace\(/\^http\(s\?\):/' next.config.ts` → L22 (PASS)

All 21 sentinels confirmed PASSING against the `main` working tree. Executor's claim in SUMMARY.md (`sentinels_passed: 21`) independently corroborated.

### Human Verification Required

None — all must-haves are code-level structural invariants (CSS classes, component nesting, CSP array composition) fully verifiable through grep + file reading. The user-visible perf outcome has already been confirmed by the developer via production UAT after PR #92 ("好了很多"). Per task instructions, that production-side UAT is out of scope for this retrospective verifier.

---

## Gaps Summary

**No gaps.** All 5 truths in the plan's `must_haves` block are empirically satisfied by the current `main` checkout:

- Header backdrop-blur is gone; alpha is raised to .97; warning comment present.
- Sidebar uses `border-r`; bleeding box-shadow utility is absent from the `<aside>`.
- 500 px grid-skeleton uses `animate-pulse`; shimmer stack is restricted to the three small right-panel skeletons where it remains compositor-cheap.
- `<TimetableGrid>` is unwrapped in the main render; `AnimatedEntry delay={2}` occurs exactly once on the loading skeleton only.
- `next.config.ts` computes `supabaseExtraOrigins` conditionally and spreads them into `connect-src` alongside the unchanged production `*.supabase.co` whitelist.

All five commits (`53623a3`, `38b5e68`, `9ba5b6d`, `e0488d3`, `c6ed6eb`) are reachable from `origin/main`. The retrospective plan's `<success_criteria>` all pass: (1) all task `<done>` conditions met, (2) commit reachability confirmed, (3) SUMMARY.md exists with canonical diagnostic link.

The `<cross-task invariant>` declared in PLAN.md — "removing any single fix would partially regress the jank" — holds structurally: each fix targets an independent paint-cost path, and all four are present on `main`. User-visible confirmation from prod UAT completes the chain.

---

_Verified: 2026-04-20_
_Verifier: Claude (gsd-verifier)_
