---
phase: 39-design-token-foundation
plan: 02
subsystem: ui
tags: [design-tokens, typography, source-serif-4, inter, tailwind-v4, tdd]

# Dependency graph
requires:
  - phase: 01-design-system-foundation
    provides: Source Serif 4 + Inter font loading via next/font, --font-sans/--font-serif tokens, html { font-size: 15px } REM base
  - phase: 39-design-token-foundation/plan-01
    provides: Wave 1 oklch color tokens, 8-point spacing scale, --radius-sm anchor for plan-2 insertion point
provides:
  - "4-tier typography scale (--text-hero/section/body/caption) under Tailwind v4 v4-correct namespaces -> generates text-hero / text-section / text-body / text-caption utilities"
  - "Matching --leading-* (line-height) tokens for all 4 tiers"
  - "--tracking-hero/section: -0.02em (negative tracking for serif display sizes); --tracking-caption: +0.06em (uppercase rhythm)"
  - "Inline CSS annotation documenting Tailwind v4 namespace correction (RESEARCH §Q1 + Pitfall 4) and D-05 brand-guidelines font reconciliation"
  - "TYPO-USAGE.md project-internal reference doc — 20 bullets covering serif-vs-Inter mapping per D-07, Anti-pattern, Tailwind v4 note, CJK fallback, and tier reference table"
affects: [39-03-motion-sse, 40-shared-components, 40-shared-streaming, 41-states-a11y, 42-newvis, 43-dark-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Tailwind v4 @theme namespace registry — --text-* / --leading-* / --tracking-* generate text-{name} / leading-{name} / tracking-{name} utilities", "Multi-line CSS comments avoid */ embedded patterns — use --font-size-X notation in prose to dodge premature comment closure"]

key-files:
  created:
    - frontend/__tests__/styles/typography-tokens.test.ts
    - .planning/phases/39-design-token-foundation/TYPO-USAGE.md
  modified:
    - frontend/app/globals.css

key-decisions:
  - "Adopted Tailwind v4 namespaces --text-* / --leading-* / --tracking-* (RESEARCH §Q1 correction) instead of CONTEXT.md D-06's --font-size-* / --line-height-* / --letter-spacing-* — the latter compile but generate zero utilities (Pitfall 4); Phase 40 SHARED-01 needs the generated utilities"
  - "Insertion point: between --radius-sm (line 62) and plan-1's 8-point spacing block (line 64) — keeps token grouping order radius -> typography -> spacing -> layout"
  - "tracking-body intentionally omitted (browser default 'normal' per RESEARCH §Q6) — only hero/section get negative tracking and caption gets +0.06em uppercase rhythm"
  - "TYPO-USAGE.md placed at .planning/phases/39-design-token-foundation/ (NOT frontend/docs/) — GSD planning artifact for downstream agent consumption; Phase 40-43 implementers read it as reference doc"
  - "CSS comment style: avoid embedded `*/` patterns in multi-line comments — PostCSS interprets them as premature comment closure (auto-fixed Rule 1, see Deviations)"

patterns-established:
  - "TDD plan-2 RED->GREEN: 11 failing tests committed before implementation; turn green via single Task 2 commit"
  - "Tailwind v4 @theme block additive extension: tokens grouped logically (color -> radius -> typography -> spacing -> layout -> animation -> keyframes); ordering inside @theme block does not affect compilation"
  - "Token annotation pattern: inline CSS comment block citing the SSOT correction (Q1 namespace) and the cross-cutting decision (D-05 font lock) — preserves rationale in the file itself for future readers"
  - "Project-internal doc pattern: TYPO-USAGE.md uses headings + bulleted lists + code samples + reference table; references back to RESEARCH §Pattern N citations to maintain decision provenance"

requirements-completed: [TYPO-01, TYPO-02]

# Metrics
duration: 7min
completed: 2026-04-30
---

# Phase 39 Plan 02: Typography Token Layer Summary

**Added the 4-tier serif typography scale (`--text-hero`/`section`/`body`/`caption` plus matching `--leading-*` and `--tracking-*` tokens) to the existing `@theme` block in `frontend/app/globals.css` under Tailwind v4-correct namespaces, with inline annotation of the RESEARCH §Q1 namespace correction and D-05 brand-guidelines font reconciliation. Created `TYPO-USAGE.md` with 20-bullet serif-vs-Inter mapping per D-07. TDD RED -> GREEN with 11/11 tests passing; `pnpm build` confirms `.text-hero{font-size:var(--text-hero)}` utility emission.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-30T00:50:32Z
- **Completed:** 2026-04-30T00:57:44Z
- **Tasks:** 2 (TDD pair)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Tailwind v4 `@theme` block extended with 11 new typography tokens (4 `--text-*` + 4 `--leading-*` + 3 `--tracking-*`)
- All 4 tiers' size tokens emit utilities — verified `.text-hero{font-size:var(--text-hero)}` in compiled `.next/static/css/*.css`
- Inline CSS annotations document: (a) Tailwind v4 namespace correction per RESEARCH §Q1 (~7 lines), (b) D-05 brand-guidelines font reconciliation (Source Serif 4 + Inter locked at v2.0 Phase 1) (~6 lines)
- TYPO-USAGE.md provides 20-bullet serif-vs-Inter mapping per D-07, plus Anti-pattern (text-hero in `<button>` without explicit font-family), Tailwind v4 namespace note, CJK fallback, tier reference table
- All v2.0 + plan-1 invariants preserved: color tokens (oklch + hex fallback), spacing scale, shadow tokens, radius tokens, layout tokens, `--animate-*` definitions, `@keyframes`, `@theme inline` (next/font integration), `[data-theme="dark"]` reservation
- Phase 40 SHARED-01 (Card/Button/Input/Modal/Tooltip) and Phase 41 STATES (Loading/Empty/Error) can now consume `text-hero` / `text-section` / `text-body` / `text-caption` utilities to compose component typography

## Task Commits

Each task committed atomically per TDD discipline:

1. **Task 1 (RED): failing typography-tokens invariant tests** — `69e5988` (test)
2. **Task 2 (GREEN): typography scale + TYPO-USAGE.md** — `c2e42b8` (feat)

_Note: REFACTOR step was unnecessary — implementation matched final shape on first pass._

## Files Created/Modified

- `frontend/__tests__/styles/typography-tokens.test.ts` (NEW, 67 lines) — File-as-text vitest unit. Single hoisted `readFileSync` of `globals.css`; uses `it.each(TIERS)` over `["hero", "section", "body", "caption"]` for size + leading assertions; explicit asserts for tracking values (hero/section `-0.02em`, caption `+0.06em`) and exact rem values (2.8 / 1.5 / 0.95 / 0.74). Top-of-file comment cites RESEARCH §Q1 + Pitfall 4 namespace correction.
- `frontend/app/globals.css` (MODIFIED, +43 lines) — Inserted typography token block after `--radius-sm: 8px;` (line 62) and before plan-1's 8-point spacing scale (originally line 64). Block contains: 3-line section header comment, 8-line v4 namespace correction comment, 6-line D-05 font reconciliation comment, then 11 token declarations grouped by tier (hero / section / body / caption) with per-tier intent comments. No deletions or restructuring of existing tokens.
- `.planning/phases/39-design-token-foundation/TYPO-USAGE.md` (NEW, 81 lines) — Project-internal reference doc. Sections: Source Serif 4 (9 elements), Inter (9 elements), Disambiguation (2 rules), Anti-pattern (with code samples), Tailwind v4 namespace note (with code samples), CJK fallback, tier reference table.

## Tailwind Compile Evidence

`grep -oE '\.text-hero\{[^}]+\}' .next/static/css/*.css`:

```
.text-hero{font-size:var(--text-hero)}
```

`grep -E '^\.(leading|tracking)-(hero|section|body|caption)' .next/static/css/*.css`:

```
.leading-hero{line-height:var(--leading-hero)}
.tracking-hero{letter-spacing:var(--tracking-hero)}
```

(Other tier-specific utilities `.text-section`, `.text-body`, `.text-caption` etc. are tree-shaken out of the production bundle because no component currently consumes them — they will be emitted automatically when Phase 40 components reference them. The token registration is verified by the @theme output `--text-hero:2.8rem` in the same CSS file.)

## TYPO-USAGE.md Evidence

```bash
$ grep -c '^- ' .planning/phases/39-design-token-foundation/TYPO-USAGE.md
20
```

(Threshold: >= 18; actual: 20 — exceeds requirement.)

```bash
$ grep -E "Source Serif 4|Inter|Anti-pattern|Disambiguation" .planning/phases/39-design-token-foundation/TYPO-USAGE.md | wc -l
       8
```

All 4 required substrings present.

## Verification

- `pnpm exec vitest run __tests__/styles/typography-tokens.test.ts` -> **1 file / 11 tests PASS** (GREEN)
- `pnpm exec vitest run __tests__/styles/` -> **2 files / 25 tests PASS** (typography + plan-1 tokens-css both green)
- `pnpm build` -> Tailwind v4 compiled successfully; `.next/static/css/*.css` contains `--text-hero:2.8rem` and `.text-hero{font-size:var(--text-hero)}`
- `pnpm lint` -> 0 errors / 0 warnings
- `pnpm typecheck` -> 0 errors
- AC grep gates all pass: `--text-hero: 2.8rem`, `--text-section: 1.5rem`, `--text-body: 0.95rem`, `--text-caption: 0.74rem`, 4 leading tokens, hero/section `-0.02em` tracking, caption `+0.06em` tracking, namespace correction comment present, brand-guidelines reconciliation present, no `--font-size-hero`/`--line-height-hero`/`--letter-spacing-hero` (wrong D-06 names) anywhere, `@theme inline { --font-sans / --font-serif }` preserved verbatim

## Decisions Made

- **Tailwind v4 namespace correction (Q1)**: Adopted `--text-*` / `--leading-*` / `--tracking-*` instead of D-06's `--font-size-*` / `--line-height-*` / `--letter-spacing-*`. Phase 40 SHARED-01 expects `text-hero` / `leading-section` / `tracking-caption` utilities; only the v4 namespaces generate them. Annotated in inline CSS comment.
- **Insertion order**: typography lands between `--radius-sm` and plan-1's spacing block. Read-order intuition: radius (visual primitive) -> typography (text rhythm) -> spacing (layout rhythm) -> layout (concrete dimensions).
- **`tracking-body` omitted**: per RESEARCH §Q6, body text inherits browser default `letter-spacing: normal`. Only hero/section need negative tracking (display sizes); only caption needs positive tracking (uppercase rhythm).
- **Comment style avoids `*/` embedded patterns**: PostCSS rejects multi-line `/* ... */` comments containing literal `*/` mid-line (it parses as premature close). Replaced D-06 token name list `--font-size-*/--line-height-*/--letter-spacing-*` with `--font-size-X, --line-height-X, --letter-spacing-X` notation that conveys the same meaning without confusing the parser.
- **TYPO-USAGE.md location**: GSD planning artifact at `.planning/phases/39-design-token-foundation/`, NOT customer doc in `frontend/docs/`. Targets downstream agents (Phase 40-43 implementers).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PostCSS multi-line comment rejected `*/` embedded pattern**
- **Found during:** Task 2 (GREEN — `pnpm build` first run)
- **Issue:** The verbatim CSS comment from RESEARCH §Q1 + the plan's `<interfaces>` block contained a literal token-name listing `--font-size-*/--line-height-*/--letter-spacing-*` inside a `/* ... */` multi-line comment. PostCSS interpreted the first embedded `*/` as the end of the comment, causing `Syntax error: Unknown word` at line 70 column 6 — the build failed with a webpack error block ~700 lines deep.
- **Fix:** Rewrote the multi-line comment to use `--font-size-X, --line-height-X, --letter-spacing-X` notation (no embedded `*/`) instead of the literal `*` glob notation. Same intent, parses cleanly. Also flattened the 5-line block to a single 6-line `/* ... */` comment without leading `*` on each line — the leading `*` style was contributing to the parse confusion when followed by `/`.
- **Files modified:** `frontend/app/globals.css`
- **Verification:** `pnpm build` succeeds; tests still pass (test asserts on `--text-*` tokens, comment text is irrelevant to assertions).
- **Committed in:** `c2e42b8` (Task 2 GREEN commit, alongside the typography tokens themselves).

---

**Total deviations:** 1 auto-fixed (Rule 1 — PostCSS comment-syntax bug).
**Impact on plan:** Comment text simplified to avoid `*/` embedded patterns. The intent (documenting D-06's wrong namespace) is preserved. No scope creep; modification within `files_modified` (globals.css only).

## Issues Encountered

- **Pre-existing test failures unchanged**: 6 test files (course-detail / deadlines / setup / layout / etc.) fail in full vitest sweep due to missing `QueryClientProvider` / `NextIntlProvider` test wrappers. Confirmed via plan-1 SUMMARY that these were pre-existing before plan-1 even started — plan-2 introduces zero new regressions. Out of scope; logged as deferred for a future test infrastructure plan.

## TDD Gate Compliance

- **RED gate:** `69e5988` (`test(39-02): add failing typography-tokens invariant tests`) — typography-tokens.test.ts fails before implementation. Confirmed via `pnpm exec vitest run __tests__/styles/typography-tokens.test.ts` showing 11 assertion failures (all 4 size assertions fail; all 4 leading assertions fail; both tracking assertions fail; exact-rem assertion fails).
- **GREEN gate:** `c2e42b8` (`feat(39-02): add 4-tier typography scale...`) — same test passes after implementation. Confirmed via the same command showing **1 file / 11 tests passed**.
- **REFACTOR gate:** Skipped — implementation matched final shape on first pass; no separate refactor commit needed.

Sequence verified in `git log --oneline -4`:

```
c2e42b8 feat(39-02): add 4-tier typography scale (text-hero/section/body/caption) per D-06 + TYPO-USAGE.md per D-07
69e5988 test(39-02): add failing typography-tokens invariant tests
506e3d5 docs(39-01): complete Color & Spacing Token Foundation plan
c1de7c9 feat(39-01): add oklch color tokens + 8-point spacing + dark-mode reservation per D-01..D-04
```

## User Setup Required

None — no external service configuration required. All work is in-repo.

## Next Phase Readiness

Plan 39-02 unlocks:

- **Plan 39-03 (Motion + SSE)**: Will add `--motion-fast/base/slow`, `--ease-claude-out`, SSE keyframes; will run the migration sweep + add ESLint rule (D-16). Plan-2's typography tokens are independent — no shared tokens or insertion-point conflicts with plan-3's motion block (which lands after `--animate-skeleton-shimmer` line 88).
- **Phase 40 SHARED-01** (Card/Button/Input/Modal/Tooltip): Can now use `text-hero` / `text-section` / `text-body` / `text-caption` Tailwind utilities. Plus `font-serif` / `font-sans` for D-07 chrome rule application. TYPO-USAGE.md is the per-element decision reference.
- **Phase 41 STATES**: Loading/Empty/Error component states need `text-body` / `text-caption` for inline messages and labels.
- **Phase 42 NEWVIS**: Hero stats (WAM number, GPA target value) will use `text-hero font-serif tracking-hero leading-hero` per D-07 narrative voice rules.

No blockers. No concerns.

## Self-Check: PASSED

- [x] `frontend/__tests__/styles/typography-tokens.test.ts` exists (verified via `ls`)
- [x] `frontend/app/globals.css` modified (Tailwind compile succeeded; --text-* tokens present)
- [x] `.planning/phases/39-design-token-foundation/TYPO-USAGE.md` exists (20 bullets, all required headings)
- [x] Commit `69e5988` (RED) exists (`git log --oneline -4` confirms)
- [x] Commit `c2e42b8` (GREEN) exists
- [x] Targeted test passes: `pnpm exec vitest run __tests__/styles/typography-tokens.test.ts` returns `1 passed (1)` / `11 passed (11)`
- [x] Plan-1 sibling test still passes: `__tests__/styles/tokens-css.test.ts` -> 14 tests passed (no regression)
- [x] `pnpm build` succeeds; `.next/static/css/` contains `.text-hero{font-size:var(--text-hero)}` and `--text-hero:2.8rem`
- [x] `pnpm lint` returns 0 errors / 0 warnings
- [x] `pnpm typecheck` returns 0 errors
- [x] All AC grep gates pass: text/leading/tracking values, namespace correction comment, brand-guidelines reconciliation, no D-06 wrong namespace, @theme inline preserved
- [x] TYPO-USAGE.md bullet count: 20 (>= 18 required)

---
*Phase: 39-design-token-foundation*
*Plan: 02 — Typography Token Layer*
*Completed: 2026-04-30*
