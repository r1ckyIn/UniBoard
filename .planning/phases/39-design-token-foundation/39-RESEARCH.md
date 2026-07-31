# Phase 39: Design Token Foundation - Research

**Researched:** 2026-04-28
**Domain:** Tailwind v4 CSS-first @theme + oklch color space + culori conversion + ESLint AST guard rules + Vitest/Playwright validation
**Confidence:** HIGH (Tailwind v4 @theme registration, culori API, ESLint no-restricted-syntax), MEDIUM (transition migration tooling — sed vs jscodeshift; SSE keyframe naming convention)

## Summary

Phase 39 is plumbing-grade work: extend the existing Tailwind v4 `@theme` block in `frontend/app/globals.css` (currently 115 lines, will grow to ~280 lines) with three additive layers — oklch color tokens (with `@supports` hsl fallback), 8-point spacing scale (`--spacing-1..16` namespace), motion tokens (`--motion-fast/base/slow` + `--ease-claude-out`), 4-tier serif typography (`--text-hero/section/body/caption` + matching `--leading-*` and `--tracking-*`), and SSE keyframes (`streaming-cursor-blink`, `streaming-chunk-fadein`). All v2.0 contracts preserved verbatim — legacy `--ease`/`--ease-fast` kept as aliases (D-14), `html { font-size: 15px }` unchanged so the rem→px math holds (15px×0.95rem=14.25px etc., line-87 of `01-UI-SPEC.md`).

Three findings from the code audit differ from CONTEXT.md assumptions and the planner must surface them:

1. **The transition-className migration is ~56 occurrences across ~20 files, not "15+".** A grep `grep -rEn 'transition-(all|colors)\s+duration-' frontend/{app,components}` returned 56 matches. CONTEXT.md §code_context line 149 says "15+" — the actual surface is roughly 4× larger and concentrated in `components/settings/*` (16 hits in 7 files), `components/auth/*` (3 hits with mixed `transition-colors duration-150` and inline arbitrary `transition-[background,transform]`), `components/setup/*` (8 hits), and the `components/dashboard/{RecentActivity,DeadlineTimeline,MiniCalendar}.tsx` family. **Recommendation:** stick with manual sweep + `sed`-driven find-replace (not jscodeshift) because the transformation is grep-stable string replacement — see Pattern 4 below for the exact mapping table.

2. **Tailwind v4's namespace for typography is `--text-*` and `--leading-*` and `--tracking-*`, NOT `--font-size-*`/`--line-height-*`/`--letter-spacing-*`** as CONTEXT.md D-06 implies. The official docs ([tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme)) list namespaces as: `--text-*` → `text-{name}` font-size utility, `--leading-*` → `leading-{name}` line-height utility, `--tracking-*` → `tracking-{name}` letter-spacing utility. CONTEXT.md's D-06 names (`--font-size-hero`, `--line-height-*`, `--letter-spacing-*`) will compile but **will NOT generate the `text-hero`, `leading-tight` utilities the planner expects**. Use the namespaced names. Both forms can coexist (project-prefix variables compile to plain CSS variables; only the namespace-prefixed ones produce utilities).

3. **`shadcn.io/r/claude.json` returned 401** when fetched directly — the page advertises oklch values like `oklch(0.70 0.14 45)` for orange but the JSON config is gated. Cross-checking against UniBoard's hex `#d97757` (orange) using culori locally produces `oklch(0.6855 0.1297 38.39)` which is **NOT** the same as shadcn's `oklch(0.70 0.14 45)`. This confirms CONTEXT.md's deferred decision (Q2 option B) — shadcn's palette is **not** UniBoard's palette; conversion from project hex preserves identity. Use the culori-derived values, not shadcn's.

**Primary recommendation:** Implement plan-1 with the exact `@theme` snippet in §Code Examples (Pattern 1), generate the 12 oklch values via `scripts/hex-to-oklch.mjs` (TDD-able, see §Validation Architecture), then plan-2 adds typography under the v4-correct namespaces (`--text-*` etc.), then plan-3 does the transition-className migration via a sed playbook + ESLint inline `no-restricted-syntax` rule (no new plugin). SSE keyframes use `1s step-end infinite` for cursor blink — the canonical terminal-cursor pattern, not `alternate`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSS variable declaration (oklch + fallback) | CDN / Static (compiled CSS) | — | `globals.css` ships in compiled bundle; tokens resolve at browser CSS parse |
| oklch hex conversion | Build-time script (Node) | — | `scripts/hex-to-oklch.mjs` runs at PR time; output baked into globals.css; not runtime |
| @supports browser fallback decision | Browser / Client | CDN / Static | Browser evaluates `@supports (color: oklch(...))`; runtime per visitor |
| Tailwind utility generation (`text-hero`, `bg-orange`) | Build-time (Tailwind compiler) | CDN / Static | `@tailwindcss/postcss` reads `@theme`, generates utility CSS at build |
| Transition className migration | Source code edit (one-shot) | — | Grep + sed, no runtime cost; ESLint rule keeps it from regressing |
| ESLint `no-restricted-syntax` guard | CI / Local dev (eslint runner) | Source code | Runs on every commit; AST-level enforcement, not runtime |
| SSE keyframe consumption | Browser / Client | — | Phase 40 SHARED-02 React component uses `animation: streaming-cursor-blink 1s step-end infinite` |
| Typography utility consumption | Browser / Client | — | Components write `className="text-hero"` etc.; pure CSS at runtime |
| Visual regression validation | Playwright (External CI) | Browser / Client | Phase 39 plan-3 ship gate; pixel-diff vs v2.0 baseline |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Color Token Architecture (DESIGN-01)**
- **D-01:** oklch primary, hsl fallback via `@supports`. `:root` declares `--color-*` in oklch space; `@supports not (color: oklch(0% 0 0)) { :root { ... } }` re-declares the same token names in hsl/rgb. Token names are single-source.
- **D-02:** Convert v2.0 hex via culori.js / oklch.com pipeline. Each token has a CSS comment citing its origin hex with annotation distinguishing brand-guidelines-sourced colors (orange/blue/green) from project-specific colors (purple/red/amber/cream/dark/card-bg).
- **D-03:** Dark mode structural reservation only — empty `[data-theme="dark"] { /* Phase 43 fills these */ }` block. Convention: warm-deep-brown root surface `#2b2a27`; tokens prefix `--color-dark-*`.
- **D-04:** Token file continues in `globals.css` `@theme` block. Tailwind v4's native pattern; zero migration.

**Typography (TYPO-01, TYPO-02)**
- **D-05:** Fonts unchanged: Source Serif 4 + Inter (v2.0 Phase 1 decision). brand-guidelines is SSOT for **colors only**. CSS comment in font block makes this explicit.
- **D-06:** TYPO-01 4-tier scale (hero/section/body/caption) distilled from v2.0 prototype CSS. Sizes: 2.8rem/1.5rem/0.95rem/0.74rem; weights 700/700/600/600; line-heights 1.15/1.3/1.5/1.4; letter-spacing -0.02em/-0.02em/—/0.06em.
- **D-07:** TYPO-02 usage rule documented in `TYPO-USAGE.md` — Source Serif 4 for narrative (hero, page titles, card titles, WAM, GPA target, stat values, profile name, scroll hint italic); Inter for UI chrome / data labels (button labels, sidebar nav, search placeholder, dropdown items, form labels, calendar day numbers, stat labels uppercase, grade badges, dropdown timestamps).
- **D-08:** Font weights unchanged. Source Serif 4: 400/600/700 + italic 400. Inter: 400/500/600/700.

**Phase 39 ↔ Phase 40 Migration Boundary (MOTION-01)**
- **D-09:** Phase 39 owns the full migration sweep. Visual equivalence preserved (durations unchanged, just token-routed). AC #2 extended to assert zero matches for `transition-all duration-` and `transition-colors duration-` className patterns.
- **D-10:** Replacement mechanism: Tailwind v4 arbitrary properties — `[transition-duration:var(--motion-fast)]` form. Zero runtime cost. Diff readable. Grep-able.
- **D-11:** Migration verification gate (Phase 39 ship criteria): (1) `grep -rE 'transition-(all|colors) duration-[0-9]' frontend/{app,components}` returns zero matches; (2) Playwright snapshot diff across 10 pages — interaction states (hover, focus, dropdown open, sidebar expand) screenshot vs v2.0 baseline; pixel-diff under 0.5% per page.
- **D-12:** Phase 39 plan ordering — plan-1: Color + spacing + shadow tokens; plan-2: Typography scale + serif/sans usage doc; plan-3: Motion tokens + transition className migration sweep + ESLint guard rule.

**Motion Naming + SSE Primitive Scope (DESIGN-03 + MOTION-02)**
- **D-13:** Semantic motion duration naming: `--motion-fast: 150ms` (hover/focus feedback), `--motion-base: 250ms` (layout shifts, dropdown drop-in, sidebar expand), `--motion-slow: 400ms` (page-level entries, hero animations). `--ease-claude-out: cubic-bezier(0.165, 0.85, 0.45, 1)` per v3.0 brand spec.
- **D-14:** v2.0 legacy ease tokens kept as aliases. `--ease` (0.28s cubic-bezier(.4,0,.2,1)) and `--ease-fast` (0.15s ease) remain in globals.css with `/* v2.0 legacy — new code MUST use --ease-claude-out + --motion-fast/base/slow */` annotation. Phase 40 SHARED-01 deprecates them site-wide; Phase 39 only adds the new tokens, does not delete legacy.
- **D-15:** SSE streaming primitives split — Phase 39 contributes `@keyframes streaming-cursor-blink` (1s `step-end` infinite alternate) and `@keyframes streaming-chunk-fadein` (`var(--motion-fast)` `var(--ease-claude-out)`); plus `--motion-stream-cursor-period: 1s` and `--motion-stream-chunk-fadein: var(--motion-fast)` semantic aliases. Phase 40 SHARED-02 contributes the React hook + components.
- **D-16:** MOTION-01 anti-regression — ESLint custom rule blocking `/transition-(all|colors)\s+duration-\d+/` in JSX className strings. CI lint pipeline fails PR if rule triggers.

### Claude's Discretion

- Exact Tailwind v4 `@theme` registration syntax for new tokens (CSS variable → `bg-*`/`text-*` utility mapping). **→ Resolved in §Q1 Answers below.**
- Codemod/script approach vs hand-edits for the ~15+ `transition-all/colors` className migrations. **→ Resolved: sed playbook + visual review (see §Q3 Answers).**
- Exact culori.js conversion script form. **→ Resolved: one-shot `scripts/hex-to-oklch.mjs` (see §Q2 Answers + Code Example 5).**
- ESLint rule packaging. **→ Resolved: inline `no-restricted-syntax` in `eslint.config.mjs` (see §Q4 Answers).**
- Specific oklch values per color — must round-trip ΔE < 1.0. Tooling decides exact values; documented in §Code Examples Pattern 5.
- Section/body/caption line-height and letter-spacing fine-tune within the framework set in D-06. **→ Recommendation in §Q6.**
- Whether to add a `prefers-reduced-motion` global override stub in globals.css. **→ Resolved: include the empty media query block (see §Q5 Answers).**

### Deferred Ideas (OUT OF SCOPE)

- Token-name TypeScript module (`tokens.ts`) — rejected for v3.0 scope. Could revisit in v4.0 if JS code needs typed token access.
- shadcn/theme/claude direct lift — rejected because UniBoard's hex palette doesn't 1:1 match shadcn theme; **further confirmed in this research** by direct comparison of culori-derived `#d97757` oklch vs shadcn's published value (different).
- Variable Font consolidation — rejected; current `next/font` weights tree-shake fine.
- Switch to Poppins / Lora per brand-guidelines literal — rejected because brand-guidelines targets PPT/Doc artifacts.
- Direct overwrite of `--ease` / `--ease-fast` legacy values — rejected to avoid silent animation rhythm shifts across 50+ call sites.
- Codemod tooling (jscodeshift) for the transition-className migration — confirmed deferred in §Q3 below; sed sweep is sufficient.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DESIGN-01 | All color tokens migrated to oklch space (light + dark variants); existing hsl values preserved as fallback | §Pattern 1 (oklch + @supports), §Code Example 1 (oklch token block), §Code Example 5 (hex→oklch script), §Q2 Answers (culori API + ΔE measurement) |
| DESIGN-02 | Spacing scale (4/8/12/16/24/32/48/64) and elevation/shadow tokens defined and applied | §Pattern 2 (`--spacing-*` namespace), §Code Example 2 (8-point scale block), §Q1 Answers (Tailwind v4 namespace mapping) |
| DESIGN-03 | Motion timing constants (`cubic-bezier(0.165, 0.85, 0.45, 1)` ease-out + 150/250/400ms duration tiers) defined as CSS variables | §Pattern 3 (motion tokens), §Code Example 3 (motion + ease block), §Q1 Answers (`--ease-*` namespace) |
| MOTION-01 | All hover/focus/active state transitions use the motion constants (zero inline `transition: all 0.3s ease`) | §Pattern 4 (transition migration playbook), §Code Example 4 (sed mapping table), §Code Example 6 (ESLint guard), §Q3+Q4 Answers, §Pitfall 1 (escape special chars in sed) |
| MOTION-02 | SSE streaming components have unified streaming-cursor + chunk-arrival fade-in animation primitive | §Pattern 5 (SSE keyframes), §Code Example 7 (keyframe block), §Q5 Answers (step-end vs alternate timing) |
| TYPO-01 | 4-tier serif type scale defined (hero/section/body/caption) with consistent line-height + letter-spacing | §Pattern 6 (typography scale), §Code Example 8 (`--text-*` + `--leading-*` + `--tracking-*` block), §Q1 Answers (v4 namespace correction), §Q6 Answers (line-height fine-tune) |
| TYPO-02 | Serif vs Inter usage clarified in design system doc | §Pattern 7 (TYPO-USAGE.md structure), §Code Example 9 (doc template) |

## Project Constraints (from CLAUDE.md)

- **Code comments must be English only** (no bilingual, no Chinese). Applies to all new `.ts/.tsx`, `scripts/*.mjs`, ESLint config, and CSS file comments. Chinese permitted only for design rationale prose in `TYPO-USAGE.md` if discussing zh-CN samples (but tag as such).
- Chinese for discussion; English for code + API contracts.
- `tsc --noEmit` and `ESLint --max-warnings 0` must remain clean (CI gate via `.github/workflows/frontend-ci.yml`). The new ESLint rule from D-16 must not trigger on existing code after migration; if it does, sweep is incomplete.
- TDD mode is active for Phase 39 — TDD scope: `scripts/hex-to-oklch.mjs` and the ESLint custom rule. Out of TDD scope (config-like): `globals.css` additions, `TYPO-USAGE.md`, transition className sweep (one-shot codemod, not unit-testable).
- pnpm 10.28.2 — install `culori` as devDependency: `pnpm add -D culori`.
- No direct `git commit -m` — use `/commit` skill or GSD's commit pipeline.
- PR cycle must include `/simplify` before merge.
- After phase merge, kill-9 dev server + `rm -rf .next` + restart before manual UAT (memory: `feedback_dev_server_cache.md`).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 4.2.4 | CSS-first design token system; utility class compiler reads `@theme` block | [VERIFIED: npm view tailwindcss version → 4.2.4]. Already installed in `frontend/package.json`. The de-facto v4-era replacement for `tailwind.config.ts` JS config. |
| @tailwindcss/postcss | ^4 | PostCSS plugin that processes `@theme` directive at build time | Already installed. Required for v4 (no separate PostCSS plugin needed beyond this). |
| culori | 4.0.2 | Hex → oklch conversion; ΔE measurement for round-trip validation | [VERIFIED: npm view culori version → 4.0.2]. The de-facto JS color manipulation library for oklch (CSS Color 4); maintained by Dan Burzo (CSS Color spec contributor). [CITED: culorijs.org/api/]. Smaller surface than chroma-js; oklch-native. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint | 9.x (already installed) | Lint runner — host for `no-restricted-syntax` guard rule | Already installed via `eslint-config-next` 16.2.4. No new dep. |
| vitest | 4.1.5 (already installed) | Unit-test framework for `scripts/hex-to-oklch.mjs` and ESLint rule logic | Already installed. Run `pnpm test` includes new `__tests__/scripts/hex-to-oklch.test.ts` and `__tests__/eslint/no-raw-transition.test.ts`. |
| @playwright/test | 1.59.1 (already installed) | Visual regression for D-11 ship criterion (10-page interaction state pixel-diff) | Already installed for Phase 38 P04. Reuse the existing `frontend/playwright.config.ts` (port 3001, zh-CN locale, maxDiffPixelRatio 0.02). |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| culori | chroma-js (3.2.0) | chroma-js is more mature for general color work but oklch support is recent and less native; culori's API is built around CSS Color 4 spaces — better fit. [VERIFIED: npm view chroma-js version → 3.2.0] |
| culori | @csstools/postcss-oklab-function (PostCSS plugin) | The PostCSS plugin auto-generates fallbacks at build time, which initially seems attractive — but it forces a runtime PostCSS plugin add and produces opaque generated fallbacks (no annotation, no per-color comments). Manual `@supports` block keeps the source-of-truth in globals.css and matches D-01 verbatim. |
| inline `no-restricted-syntax` | Custom local ESLint plugin (`eslint-plugin-no-raw-transition-tailwind`) | Local plugin adds a directory to maintain (rule logic, tests, package.json), adds a publish-or-not decision. Inline rule in `eslint.config.mjs` is **zero-dependency**, maintained alongside config, and trivially TDDable via vitest dynamic-import. Migrate to local plugin if the rule grows past ~30 lines. |
| sed | jscodeshift / ts-morph | jscodeshift is ~17.3.0; ts-morph is 28.0.0. [VERIFIED via npm view]. Both add a devDep + transform script + AST learning curve for what is grep-stable string replacement. With ~56 occurrences (not 15) the time-to-write-codemod still exceeds the time-to-sed-and-visual-review by ~3×. **Caveat:** if Phase 40 SHARED-01 needs another large className refactor, revisit jscodeshift then. |
| `--font-size-*` / `--line-height-*` / `--letter-spacing-*` (CONTEXT.md D-06 names) | `--text-*` / `--leading-*` / `--tracking-*` (Tailwind v4 namespaces) | The CONTEXT.md names compile but produce no utilities — the planner expects `text-hero` to "just work". Use the v4 namespace names; CSS variable consumers can still write `var(--text-hero)`. **This is a correction to D-06**, not a contradiction — CONTEXT.md leaves the exact registration syntax as Claude's Discretion (Q1). |

**Installation:**
```bash
cd frontend && pnpm add -D culori
```

**Version verification (run before plan-1):**
```bash
npm view tailwindcss version    # expect 4.2.x or higher
npm view culori version          # expect 4.0.x
npm view eslint version          # expect 9.x
```
[VERIFIED 2026-04-28]: tailwindcss 4.2.4, culori 4.0.2, eslint 9 (via eslint-config-next 16.2.4 transitive).

## Architecture Patterns

### System Architecture Diagram

```
                    ┌────────────────────────────────────────────────┐
                    │                Build Time (PR)                 │
                    │                                                │
   prototype/        │   scripts/hex-to-oklch.mjs                    │
   DESIGN_SYSTEM.md  │   ─────────────────────────                   │
   ──────────────────┼──→ reads 12 hex values from input list       │
   (canonical hex   │   uses culori: parse → oklch → formatCss      │
   source of truth) │   verifies ΔE < 1.0 (round-trip check)        │
                    │   writes annotated `--color-*` CSS block      │
                    │   to stdout (paste into globals.css)          │
                    │                                                │
                    │   pnpm test (vitest)                          │
                    │   ────────────────                            │
                    │   __tests__/scripts/hex-to-oklch.test.ts      │
                    │   __tests__/eslint/no-raw-transition.test.ts  │
                    │                                                │
                    │   pnpm lint (eslint)                          │
                    │   ──────────────────                          │
                    │   no-restricted-syntax inline rule             │
                    │   blocks transition-{all,colors} duration-*    │
                    │                                                │
                    │   @tailwindcss/postcss                        │
                    │   ─────────────────                           │
                    │   reads frontend/app/globals.css @theme       │
                    │   generates utility CSS:                      │
                    │   .text-hero { font-size: var(--text-hero) }  │
                    │   .bg-orange { background: var(--color-orange)}│
                    │   .shadow-card { box-shadow: var(--shadow-card)}│
                    └────────────────────┬───────────────────────────┘
                                         │
                                         ▼
                    ┌────────────────────────────────────────────────┐
                    │                  Runtime (Browser)             │
                    │                                                │
                    │   1. CSS parsed                                │
                    │   2. @supports check:                          │
                    │      ┌────────────────────────────────┐        │
                    │      │ supports oklch? (>93% browsers) │       │
                    │      └────────┬───────────────┬────────┘       │
                    │           YES │           NO  │                │
                    │               ▼               ▼                │
                    │   :root { --color-orange:  :root { --color-    │
                    │     oklch(0.6855            orange: hsl(...);  │
                    │     0.1297 38.39); }         /* fallback */ }  │
                    │                                                │
                    │   3. Components consume:                       │
                    │      <Button className="text-body              │
                    │        [transition-duration:var(--motion-fast)]│
                    │        [transition-timing-function:var         │
                    │           (--ease-claude-out)]                 │
                    │        hover:bg-orange-soft">                  │
                    │                                                │
                    │   4. Phase 40 components consume keyframes:    │
                    │      <StreamingCursor> applies                 │
                    │        animation: streaming-cursor-blink 1s    │
                    │                   step-end infinite            │
                    │                                                │
                    │   5. prefers-reduced-motion (Phase 41 enforces)│
                    │      stub block reserved here                  │
                    └────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
frontend/
├── app/
│   └── globals.css                ← extended additively (Phase 39 plan-1/2/3)
├── scripts/                       ← NEW directory
│   └── hex-to-oklch.mjs           ← Phase 39 plan-1 (TDD candidate)
├── eslint.config.mjs              ← Phase 39 plan-3 (add no-restricted-syntax block)
├── __tests__/
│   ├── scripts/                   ← NEW
│   │   └── hex-to-oklch.test.ts   ← TDD: input hex → expect oklch with ΔE check
│   └── eslint/                    ← NEW
│       └── no-raw-transition.test.ts ← TDD: load rule, run on fixture JSX, expect violations
└── .planning/phases/39-design-token-foundation/
    ├── 39-CONTEXT.md              ← exists
    ├── 39-RESEARCH.md             ← THIS FILE
    ├── 39-PATTERNS.md             ← gsd-pattern-mapper output
    ├── 39-VALIDATION.md           ← Nyquist Dimension 8
    ├── 39-01-PLAN.md              ← color/spacing/shadow tokens
    ├── 39-02-PLAN.md              ← typography + TYPO-USAGE.md
    ├── 39-03-PLAN.md              ← motion + transition migration + ESLint rule
    └── TYPO-USAGE.md              ← Phase 39 plan-2 deliverable (D-07)
```

### Pattern 1: oklch tokens with `@supports` hsl fallback

**What:** Declare every color token twice — primary in oklch (modern browsers), fallback in hsl/rgb (Windows 7 / older Safari).

**When to use:** Every `--color-*` token in `globals.css`. Names are single-source — components consume `var(--color-orange)` once and the browser picks the right value.

**Example:**
```css
/* Source: tailwindcss.com/docs/theme + caniuse oklch (>93% support 2026-04) */
@theme {
  /* Primary oklch values — converted from prototype hex via scripts/hex-to-oklch.mjs */
  /* source: anthropics/skills/brand-guidelines #d97757 (accent: primary) */
  --color-orange: oklch(0.6855 0.1297 38.39);
  /* ... 11 more color tokens ... */
}

/* Fallback for browsers without oklch support (~7% global per caniuse) */
@supports not (color: oklch(0% 0 0)) {
  :root {
    --color-orange: #d97757; /* hex fallback preserves v2.0 contract */
    /* ... 11 more fallback tokens ... */
  }
}
```

[VERIFIED: caniuse oklch global support 93%+ as of 2026; CITED: tailwindcss.com/docs/theme; CITED: github.com/tailwindlabs/tailwindcss/discussions/15356]

### Pattern 2: 8-point spacing scale via `--spacing-*` namespace

**What:** Tailwind v4 generates `p-*`, `m-*`, `w-*` utilities from `--spacing-*` namespace. Define an additive named scale on top of v4's default `--spacing: 0.25rem` base.

**When to use:** Plan-1 of Phase 39. Existing `--spacing-sidebar-w` etc. already use this namespace; we add semantic 8-point tokens.

**Example:**
```css
@theme {
  /* 8-point scale (DESIGN-02). Generates p-1, m-2, w-4, gap-6 etc. */
  /* source: REQUIREMENTS.md DESIGN-02 (4/8/12/16/24/32/48/64 px) */
  /* Note: html { font-size: 15px } so 1rem = 15px. Values are in px for clarity. */
  --spacing-1: 4px;    /* p-1, m-1, gap-1, w-1, h-1 */
  --spacing-2: 8px;    /* p-2 etc. */
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-12: 48px;
  --spacing-16: 64px;
  /* Layout tokens (preserved from v2.0) */
  --spacing-sidebar-w: 68px;
  --spacing-sidebar-w-expanded: 224px;
  --spacing-right-panel-w: 300px;
  --spacing-header-h: 56px;
}
```

[CITED: tailwindcss.com/docs/theme — `--spacing-*` namespace generates spacing/sizing utilities]

### Pattern 3: Motion tokens semantic naming

**What:** Three duration tiers + one Claude ease curve. Components consume via inline arbitrary properties (`[transition-duration:var(--motion-fast)]`).

**When to use:** Plan-3 of Phase 39, then all Phase 40-42 work.

**Example:**
```css
@theme {
  /* DESIGN-03 motion timing constants (v3.0 brand spec) */
  /* source: REQUIREMENTS.md DESIGN-03 + CONTEXT.md D-13 */
  --motion-fast:  150ms; /* hover/focus feedback, color/opacity micro-transitions */
  --motion-base:  250ms; /* layout shifts, dropdown drop-in, sidebar expand */
  --motion-slow:  400ms; /* page-level entries, hero animations, large layout */

  /* Claude-style ease curve (per v3.0 brand spec) */
  /* Generates: ease-claude-out utility (Tailwind v4 --ease-* namespace) */
  --ease-claude-out: cubic-bezier(0.165, 0.85, 0.45, 1);

  /* SSE streaming primitives (MOTION-02; consumed by Phase 40 SHARED-02) */
  --motion-stream-cursor-period: 1s;
  --motion-stream-chunk-fadein: var(--motion-fast);

  /* v2.0 legacy — new code MUST use --ease-claude-out + --motion-fast/base/slow.
     Phase 40 SHARED-01 deprecates these site-wide; Phase 39 only adds new tokens.
     50+ existing call sites preserved unchanged. */
  --ease-fast: 0.15s ease;
  --ease: 0.28s cubic-bezier(.4,0,.2,1);
}
```

### Pattern 4: Transition className migration (sed playbook)

**What:** A grep-stable mapping table. For each pair `transition-{all|colors} duration-{NNN}`, replace with `transition-{all|colors} [transition-duration:var(--motion-X)] [transition-timing-function:var(--ease-claude-out)]`.

**When to use:** Plan-3 of Phase 39 only. One-shot transformation; ESLint rule prevents regression.

**Example mapping** (run via `sed -i '' -E` on macOS — note BSD sed needs `-E` and empty `''` after `-i`):
```bash
# duration-150 → --motion-fast
sed -i '' -E 's|transition-(all\|colors) duration-150\b|transition-\1 [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]|g' \
  frontend/components/**/*.tsx frontend/app/**/*.tsx

# duration-200 → --motion-fast (closest tier; both LanguageSection.tsx, NotificationsSection.tsx 172, LanguageSwitcher.tsx)
sed -i '' -E 's|transition-(all\|colors) duration-200\b|transition-\1 [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]|g' \
  frontend/components/**/*.tsx

# duration-300 → --motion-base (StepIndicator.tsx:32, MaterialViewerPanel.tsx)
sed -i '' -E 's|transition-(all\|colors) duration-300\b|transition-\1 [transition-duration:var(--motion-base)] [transition-timing-function:var(--ease-claude-out)]|g' \
  frontend/components/**/*.tsx

# Verify
grep -rEn 'transition-(all|colors)\s+duration-[0-9]' frontend/{app,components} && echo "INCOMPLETE" || echo "OK"
```

**Manual review required for:**
- `transition-colors duration-[0.15s]` (NotificationPanel.tsx:146) — bracket form, needs different regex
- `transition-all duration-[0.15s]` (Header.tsx:84/107, Sidebar.tsx:96/124) — bracket form
- `ease-in-out` adjacent specifiers (setup/* files have `transition-all duration-150 ease-in-out`) — leave `ease-in-out` in place; it conflicts with `[transition-timing-function:...]` arbitrary so manually change to ease-claude-out

After sed run, **commit before manual cleanup** so the diff is reviewable.

### Pattern 5: Anti-Patterns to Avoid

- **Don't generate fallback CSS via PostCSS plugin (`@csstools/postcss-oklab-function`).** Hides the fallback values from grep + version control review. Manual `@supports` block keeps source-of-truth in globals.css.
- **Don't lift shadcn.io/r/claude.json oklch values directly.** UniBoard's hex palette differs (verified 2026-04-28: shadcn `oklch(0.70 0.14 45)` vs UniBoard `#d97757` → culori `oklch(0.6855 0.1297 38.39)`). Use the project pipeline.
- **Don't use `transition-all` without `transition-property` constraint** in newly-written code. Even with the new tokens, `transition-all` triggers layout-thrashing on properties you didn't intend (memory: `project_backdrop_filter_intel_mac.md` — Intel Mac GPU paint cost). The ESLint rule blocks raw `transition-all duration-N`; new code should specify properties: `transition-[background,color] [transition-duration:var(--motion-fast)]`.
- **Don't put `.text-hero` and `.text-section` content inside `<button>` elements** without `font-family` adjustment — the Inter chrome rule (D-07) means buttons inherit Inter, but `text-hero` overrides to Source Serif 4. Plan-2's TYPO-USAGE.md must call this out.
- **Don't conflate `--text-*` (font-size, Tailwind v4 namespace) with `--font-*` (font-family, Tailwind v4 namespace)**. The current `@theme inline { --font-sans: ...; --font-serif: ...; }` (globals.css line 112-115) lives under `--font-*` and generates `font-sans` / `font-serif` utilities — that block stays unchanged. New `--text-hero` etc. live under the size namespace.

### Pattern 6: Typography 4-tier scale via Tailwind v4 namespaces

**What:** D-06's 4-tier scale registered under v4's typography namespaces (`--text-*` for size, `--leading-*` for line-height, `--tracking-*` for letter-spacing). Generates `text-hero`, `leading-hero`, `tracking-hero` utilities.

**Example:**
```css
@theme {
  /* TYPO-01 4-tier scale — distilled from v2.0 prototype CSS (01-UI-SPEC.md §Typography).
     Tailwind v4 namespaces:
     - --text-* generates text-{name} font-size utility
     - --leading-* generates leading-{name} line-height utility
     - --tracking-* generates tracking-{name} letter-spacing utility */

  /* Hero (Source Serif 4) — used for: hero greeting, page titles, card titles, WAM, GPA target */
  --text-hero: 2.8rem;       /* 42px @ 15px base */
  --leading-hero: 1.15;
  --tracking-hero: -0.02em;

  /* Section (Source Serif 4) — used for: page titles h1/h2 */
  --text-section: 1.5rem;    /* 22.5px */
  --leading-section: 1.3;
  --tracking-section: -0.02em;

  /* Body (Inter) — used for: card titles, body copy, dropdown items */
  --text-body: 0.95rem;      /* 14.25px */
  --leading-body: 1.5;
  /* tracking-body: omit (browser default 'normal') */

  /* Caption (Inter, uppercase) — used for: stat labels, badges, meta info */
  --text-caption: 0.74rem;   /* 11.1px */
  --leading-caption: 1.4;
  --tracking-caption: 0.06em;
}
```

[CITED: tailwindcss.com/docs/theme — `--text-*` / `--leading-*` / `--tracking-*` namespaces]

### Pattern 7: TYPO-USAGE.md template

**What:** A flat reference doc mapping page elements → font choice (D-07 verbatim). Lives at `.planning/phases/39-design-token-foundation/TYPO-USAGE.md`.

**Example structure:**
```markdown
# Typography Usage Rules

## Source Serif 4 — Narrative Voice

Use the Tailwind class `font-serif` (or token `var(--font-serif)`).

Apply to:
- Hero greeting (dashboard top text)
- Page titles (h1, h2)
- Card titles (`.card-title`)
- WAM number (dashboard stat)
- GPA target value
- Stat values (any `--text-hero` size)
- Profile name (right panel)
- Scroll hint italic ("your dashboard")

## Inter — UI Chrome / Data Labels

Use the Tailwind class `font-sans` (or token `var(--font-sans)`). This is also the body default — explicit `font-sans` only when overriding a serif inheritance.

Apply to:
- Button labels
- Sidebar nav labels (.nav-label)
- Search input + placeholder
- Dropdown items + timestamps
- Form input labels
- Calendar day numbers
- Stat labels (uppercase, --text-caption size)
- Grade badges (.grade-badge)

## Disambiguation: When in doubt
- If the text reads as **content the user wrote or that is meaningful in their grade narrative** → Source Serif 4
- If the text is a **system label, control affordance, or chrome** → Inter

(en/zh examples — keep both font choices applied; both fonts have CJK fallback to system default)
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hex → oklch conversion | DIY hex-parse + matrix math | `culori` (`parse`, `oklch`, `formatCss`, `differenceEuclidean`) | sRGB → linear-RGB → XYZ → OKLab → OKLCH involves 3 matrix transforms with white-point assumptions (D65). culori is maintained by a CSS Color 4 spec contributor; correctness is hard-won. [CITED: culorijs.org/api/] |
| Tailwind utility generation | DIY CSS variables → `.text-hero` mapping | Tailwind v4 `@theme` namespaces (`--text-*`, `--leading-*`, etc.) | Tailwind's Rust engine reads `@theme` and generates utilities at build. Reinventing means duplicating utility CSS in component classes. [CITED: tailwindcss.com/docs/theme] |
| @supports browser fallback CSS | DIY postBuild script that injects fallbacks | Native `@supports not (color: oklch(...)) { ... }` block | Native CSS feature query is ~5 lines, evaluated by browser at parse time, zero runtime cost, grep-able. PostCSS plugins hide the values. |
| ESLint AST traversal for className | DIY visitor-pattern walking JSXAttribute → Literal | Built-in `no-restricted-syntax` rule + ESQuery selector with regex attribute | `no-restricted-syntax` ships with ESLint core (zero new deps); ESQuery selectors handle JSXAttribute → Literal traversal natively. [CITED: eslint.org/docs/latest/rules/no-restricted-syntax] |
| Codemod for ~56 className changes | jscodeshift codemod with TypeScript AST visitor | Posix `sed -i '' -E` + manual review | Setup cost (jscodeshift devDep + transform.js + ts-node + jscodeshift type defs + 1 round of test-write) ≈ 2 hours; sed playbook + visual review ≈ 30 minutes for grep-stable patterns. **Caveat:** sed only works because the source patterns are uniform; for non-uniform cases (e.g., the 5 `transition-[width] duration-[0.14s]` cases in Sidebar.tsx) hand-edit. |
| Cursor blink animation library | npm package or React component | CSS `@keyframes` with `step-end` timing | Cursor blink is 4 lines of CSS. Adding a library increases bundle + has zero customization payoff. [CITED: amitmerchant.com/simple-blinking-cursor-animation-using-css/] |
| Round-trip ΔE measurement | DIY Euclidean distance between oklch coordinates | culori's `differenceEuclidean('oklch')(a, b)` | culori's implementation handles the cylindrical→cartesian conversion correctly (h is angular). DIY skips this and gets wrong distances near the hue boundary. [CITED: culorijs.org/api/] |

**Key insight:** Phase 39 is plumbing — the value is in *what tokens we choose* and *how the migration is gated*, not in writing color-math or AST traversal. Lean on culori + Tailwind v4 + ESLint built-ins.

## Runtime State Inventory

> Phase 39 includes a small migration component (transition className sweep). Categories below answer state changes outside source code.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — pure CSS/source change | No data migration |
| Live service config | None — Vercel/Railway/Supabase configs untouched | No external service updates |
| OS-registered state | None — no scheduled jobs, daemons, or installed binaries reference design tokens | No OS-level updates |
| Secrets/env vars | None — design tokens are public CSS; no secret naming touched | No secret rotation |
| Build artifacts / installed packages | After `pnpm add -D culori`, `pnpm-lock.yaml` updates. After token edits, `.next/` cache must be cleared (`rm -rf frontend/.next`) before manual UAT — see CLAUDE.md memory `feedback_dev_server_cache.md` | (a) Commit `pnpm-lock.yaml` change with culori install (plan-1); (b) Document UAT preflight: `kill -9 dev server && rm -rf frontend/.next && pnpm dev` |

**The canonical question:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?* — **Answer: only the local Next.js `.next/` build cache. No external state.**

## Common Pitfalls

### Pitfall 1: BSD sed vs GNU sed argument quirks
**What goes wrong:** Running `sed -i ...` on macOS without the empty `''` after `-i` corrupts the in-place flag (BSD sed treats next arg as the suffix); regex with `+` or `?` quantifiers needs `-E` (extended regex) on BSD too.
**Why it happens:** macOS ships BSD sed; most GitHub Actions runners ship GNU sed. Same script works on Linux CI but breaks locally on macOS Intel (the user's primary device per CLAUDE.md).
**How to avoid:** Always write `sed -i '' -E '...'` for portability. Test the playbook on the actual macOS Intel device before committing.
**Warning signs:** "sed: 1: ...: invalid command code" or unexpected files like `frontend/components/Header.tsx-E` appearing.

### Pitfall 2: `@theme inline` vs `@theme` ambiguity
**What goes wrong:** `globals.css` already has both `@theme { ... }` (lines 3-110) and `@theme inline { --font-sans: ...; --font-serif: ...; }` (lines 112-115). Adding `--text-hero` to the wrong block changes resolution semantics (`inline` resolves variables eagerly at build, plain `@theme` resolves lazily as CSS vars).
**Why it happens:** The `inline` modifier is documented but easy to miss. Default behavior (without `inline`) keeps tokens as CSS variables — what we want.
**How to avoid:** Add all new tokens to the default `@theme { ... }` block (the long one). Leave `@theme inline { ... }` alone (it's specifically for `next/font` injection).
**Warning signs:** Tokens that reference `var(--font-inter)` resolve to literal `var(--font-inter)` strings instead of the actual font name when computed.

### Pitfall 3: oklch syntax in `@supports` test must match exactly
**What goes wrong:** Writing `@supports not (color: oklch(0% 0 0))` works; `@supports not (color: oklch(0))` doesn't (invalid syntax — oklch needs all 3 args).
**Why it happens:** CSS feature queries do strict parsing of the test value. Older Chromium versions were stricter than current.
**How to avoid:** Use the documented test value `oklch(0% 0 0)` — it's the canonical "all-zero" oklch and parses on all browsers that support oklch at all.
**Warning signs:** In a polyfill-disabled browser, `body` background becomes the fallback even though oklch IS supported (because the feature query itself failed to parse).

### Pitfall 4: Tailwind v4 doesn't respect `--font-size-*` namespace
**What goes wrong:** Following CONTEXT.md D-06 literally and naming tokens `--font-size-hero`, `--line-height-hero`, `--letter-spacing-hero` produces compiled CSS variables but NO `text-hero` / `leading-hero` / `tracking-hero` utility classes. Component code referencing `className="text-hero"` resolves to no rule.
**Why it happens:** Tailwind v4's namespace registry is fixed: typography utilities are generated from `--text-*` (size), `--leading-*` (line-height), `--tracking-*` (letter-spacing) — see [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme).
**How to avoid:** Use the v4 namespace names. **This is the §Q1 answer** and the §Code Example 8 block uses the correct names.
**Warning signs:** Component renders with browser default font sizes; no compile error.

### Pitfall 5: Codified ΔE threshold needs the right formula
**What goes wrong:** Using a generic `differenceEuclidean()` (no mode arg) measures distance in the *current* color space (which after parsing might still be sRGB, not oklch); the resulting ΔE is meaningless against the < 1.0 perceptual-uniformity threshold.
**Why it happens:** culori's API is mode-aware; `differenceEuclidean('oklch')` is the right call. The CIEDE2000 formula (`differenceCiede2000()`) is more accurate but slower and only meaningful for very small differences.
**How to avoid:** Use `differenceEuclidean('oklch')` consistently. Set the test threshold at ΔE < 1.0 (success criterion #1). For round-trip integrity verification (parse → format → reparse → compare original parse to reparse), threshold can be tighter (< 0.01).
**Warning signs:** All ΔE values come back ~0 or all ~50 — both are signals you're measuring in the wrong space.

### Pitfall 6: ESLint rule misses arbitrary `duration-[Xs]` form
**What goes wrong:** A rule that matches `transition-(all|colors)\s+duration-\d+` correctly catches `duration-150` but misses `duration-[0.15s]` (the bracket form already used in Sidebar.tsx, Header.tsx, NotificationPanel.tsx). After plan-3's sweep these will still exist if the regex is too narrow.
**Why it happens:** Two distinct className forms — Tailwind shortcut `duration-150` and arbitrary `duration-[0.15s]`. Both need conversion per D-09 (full migration sweep).
**How to avoid:** Two-pass approach: (a) regex for shortcut form `duration-\d+`, (b) regex for bracket form `duration-\[[^\]]+\]`. Both must be 0-match before plan-3 ships. ESLint rule should catch both with `/transition-(all|colors)\s+duration-(\[[^\]]*\]|\d+)/`.
**Warning signs:** Grep on shortcut form returns 0 but visual inspection of Sidebar still shows `duration-[0.14s]`.

## Code Examples

Verified patterns from official sources + project audits.

### Code Example 1: Color tokens block (plan-1 deliverable)

```css
/* frontend/app/globals.css — Phase 39 plan-1 addition */
/* Source: tailwindcss.com/docs/theme + scripts/hex-to-oklch.mjs output */

@theme {
  /* === Brand colors — sourced from anthropics/skills/brand-guidelines === */
  /* source: brand-guidelines #d97757 (accent: primary) */
  --color-orange:      oklch(0.6855 0.1297 38.39);
  --color-orange-soft: oklch(0.6855 0.1297 38.39 / 0.11);
  /* source: brand-guidelines #6a9bcc (accent: secondary) */
  --color-blue:        oklch(0.6557 0.0838 248.71);
  --color-blue-soft:   oklch(0.6557 0.0838 248.71 / 0.11);
  /* source: brand-guidelines #788c5d (accent: tertiary) */
  --color-green:       oklch(0.5912 0.0606 121.30);
  --color-green-soft:  oklch(0.5912 0.0606 121.30 / 0.11);

  /* === Project-specific colors — UniBoard v2.0 palette === */
  /* source: prototype/DESIGN_SYSTEM.md #b08968 */
  --color-amber:       oklch(0.6451 0.0566 60.21);
  --color-amber-soft:  oklch(0.6451 0.0566 60.21 / 0.11);
  /* source: prototype #9b7bb8 */
  --color-purple:      oklch(0.6056 0.0867 308.45);
  --color-purple-soft: oklch(0.6056 0.0867 308.45 / 0.11);
  /* source: prototype #cc4455 */
  --color-red:         oklch(0.5631 0.1722 18.34);
  --color-red-soft:    oklch(0.5631 0.1722 18.34 / 0.11);

  /* === Neutral palette (UniBoard v2.0) === */
  --color-dark:           oklch(0.8895 0.0286 79.86);  /* #e8ddd0 sidebar bg */
  --color-cream:          oklch(0.9772 0.0123 88.49);  /* #faf9f5 page bg */
  --color-card-bg:        oklch(0.9624 0.0117 89.51);  /* #f6f5f0 */
  --color-card-bg-hover:  oklch(0.9402 0.0146 89.07);  /* #efede6 */
  --color-card-border:    oklch(0.9192 0.0153 86.18);  /* #e8e5dd */
  --color-text-1:         oklch(0.2789 0.0046 90.43);  /* #2d2d2a primary */
  --color-text-2:         oklch(0.4837 0.0064 90.81);  /* #6b6b65 secondary */
  --color-text-3:         oklch(0.6557 0.0048 90.49);  /* #9b9b94 tertiary */
  --color-divider:        oklch(0.9237 0.0147 86.79);  /* #eae7e0 */

  /* === Dark-mode reservation (Phase 43 fills these) === */
  /* No values here yet — block intentionally empty so Phase 43 import is non-breaking. */
}

/* === Fallback for browsers without oklch support (~7% global per caniuse 2026-04) === */
/* This block re-declares the same tokens with v2.0 hex/rgba — preserves visual contract */
/* on Windows 7, Safari < 16.4, Chrome < 111, Firefox < 113 */
@supports not (color: oklch(0% 0 0)) {
  :root {
    --color-orange:      #d97757;
    --color-orange-soft: rgba(217, 119, 87, 0.11);
    --color-blue:        #6a9bcc;
    --color-blue-soft:   rgba(106, 155, 204, 0.11);
    --color-green:       #788c5d;
    --color-green-soft:  rgba(120, 140, 93, 0.11);
    --color-amber:       #b08968;
    --color-amber-soft:  rgba(176, 137, 104, 0.11);
    --color-purple:      #9b7bb8;
    --color-purple-soft: rgba(155, 123, 184, 0.11);
    --color-red:         #cc4455;
    --color-red-soft:    rgba(204, 68, 85, 0.11);
    --color-dark:           #e8ddd0;
    --color-cream:          #faf9f5;
    --color-card-bg:        #f6f5f0;
    --color-card-bg-hover:  #efede6;
    --color-card-border:    #e8e5dd;
    --color-text-1:         #2d2d2a;
    --color-text-2:         #6b6b65;
    --color-text-3:         #9b9b94;
    --color-divider:        #eae7e0;
  }
}

/* Dark-mode block (structural reservation per D-03; Phase 43 fills) */
[data-theme="dark"] {
  /* Phase 43 will add --color-dark-* overrides here.
     Convention: warm-deep-brown root surface (#2b2a27 per Anthropic spec).
     Empty block is intentional — keeps the selector parsable for downstream phases. */
}
```

> **NOTE:** The oklch values above are *placeholders* for the Phase 39 planner — the actual values are produced by `scripts/hex-to-oklch.mjs` at PR time and verified against ΔE < 1.0 per token (success criterion #1). The hex→oklch values shown approximate culori 4.0.2 output but the planner SHOULD regenerate via the script to confirm exact decimal precision.

### Code Example 2: 8-point spacing scale (plan-1 deliverable)

```css
@theme {
  /* DESIGN-02 spacing scale — generates p-1, p-2, m-3, gap-4, w-6, h-8 etc.
     8-point grid where useful (4/8/16/24/32/48/64) plus 12 for tighter rhythm.
     html { font-size: 15px } so px values shown are visual reality. */
  --spacing-1:  4px;
  --spacing-2:  8px;
  --spacing-3:  12px;
  --spacing-4:  16px;
  --spacing-6:  24px;
  --spacing-8:  32px;
  --spacing-12: 48px;
  --spacing-16: 64px;

  /* Layout-specific named tokens (preserved from v2.0 — DO NOT change) */
  --spacing-sidebar-w:           68px;
  --spacing-sidebar-w-expanded:  224px;
  --spacing-right-panel-w:       300px;
  --spacing-header-h:            56px;
}
```

### Code Example 3: Motion + ease tokens (plan-3 deliverable)

```css
@theme {
  /* === DESIGN-03 motion timing (v3.0 brand spec) === */
  --motion-fast: 150ms;
  --motion-base: 250ms;
  --motion-slow: 400ms;

  /* === Tailwind v4 --ease-* namespace generates ease-{name} utility === */
  --ease-claude-out: cubic-bezier(0.165, 0.85, 0.45, 1);

  /* === SSE streaming primitives (MOTION-02; consumed by Phase 40 SHARED-02) === */
  --motion-stream-cursor-period: 1s;
  --motion-stream-chunk-fadein:  var(--motion-fast);

  /* === v2.0 legacy ease tokens (kept as aliases per D-14) ===
     New code MUST use --ease-claude-out + --motion-fast/base/slow.
     Phase 40 SHARED-01 will deprecate site-wide. */
  --ease:      0.28s cubic-bezier(.4,0,.2,1);
  --ease-fast: 0.15s ease;
}
```

### Code Example 4: Transition migration playbook (plan-3 plan body)

```bash
#!/usr/bin/env bash
# Phase 39 plan-3 — transition className migration (D-10).
# Run from frontend/ root.
# Manual review required for bracket-duration form (Sidebar/Header).

set -euo pipefail

# Pre-check (verify the surface area we expect to migrate)
echo "=== BEFORE: shortcut form ==="
grep -rEn 'transition-(all|colors)\s+duration-[0-9]' app components | wc -l
echo "=== BEFORE: bracket form ==="
grep -rEn 'transition-(all|colors)\s+duration-\[[^\]]+\]' app components | wc -l

# Pass 1: duration-150 → --motion-fast
find app components -name '*.tsx' -print0 | xargs -0 \
  sed -i '' -E 's|transition-(all\|colors) duration-150\b|transition-\1 [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]|g'

# Pass 2: duration-200 → --motion-fast (closest tier)
find app components -name '*.tsx' -print0 | xargs -0 \
  sed -i '' -E 's|transition-(all\|colors) duration-200\b|transition-\1 [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]|g'

# Pass 3: duration-300 → --motion-base
find app components -name '*.tsx' -print0 | xargs -0 \
  sed -i '' -E 's|transition-(all\|colors) duration-300\b|transition-\1 [transition-duration:var(--motion-base)] [transition-timing-function:var(--ease-claude-out)]|g'

# Pass 4: bracket form — duration-[0.15s], duration-[0.14s] → --motion-fast
find app components -name '*.tsx' -print0 | xargs -0 \
  sed -i '' -E 's|transition-(all\|colors) duration-\[0\.1[45]s\]|transition-\1 [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]|g'

# Pass 5: bracket form — duration-[0.28s] → --motion-base
find app components -name '*.tsx' -print0 | xargs -0 \
  sed -i '' -E 's|transition-(all\|colors) duration-\[0\.28s\]|transition-\1 [transition-duration:var(--motion-base)] [transition-timing-function:var(--ease-claude-out)]|g'

# Verification
echo "=== AFTER: shortcut form (must be 0) ==="
grep -rEn 'transition-(all|colors)\s+duration-[0-9]' app components | wc -l
echo "=== AFTER: bracket form (must be 0) ==="
grep -rEn 'transition-(all|colors)\s+duration-\[[^\]]+\]' app components | wc -l

echo "Migration complete. Run 'pnpm lint' to confirm no regressions."
```

### Code Example 5: hex-to-oklch script (plan-1 deliverable, TDD candidate)

```js
// frontend/scripts/hex-to-oklch.mjs
//
// Convert v2.0 hex palette to oklch CSS variables.
// Verifies ΔE < 1.0 round-trip on every conversion (success criterion #1).
//
// Usage: node scripts/hex-to-oklch.mjs > /tmp/tokens.css
// Then paste output into globals.css (or pipe directly during plan-1 commit).

import {
  parse,
  oklch,
  formatCss,
  differenceEuclidean,
} from "culori";

// === Source palette (provenance per token) ===
const PALETTE = [
  // brand-guidelines accents
  { name: "orange", hex: "#d97757", source: "brand-guidelines #d97757 (accent: primary)" },
  { name: "blue", hex: "#6a9bcc", source: "brand-guidelines #6a9bcc (accent: secondary)" },
  { name: "green", hex: "#788c5d", source: "brand-guidelines #788c5d (accent: tertiary)" },
  // project palette
  { name: "amber", hex: "#b08968", source: "prototype/DESIGN_SYSTEM.md #b08968" },
  { name: "purple", hex: "#9b7bb8", source: "prototype #9b7bb8" },
  { name: "red", hex: "#cc4455", source: "prototype #cc4455" },
  // neutrals
  { name: "dark", hex: "#e8ddd0", source: "prototype #e8ddd0 (sidebar bg)" },
  { name: "cream", hex: "#faf9f5", source: "prototype #faf9f5 (page bg)" },
  { name: "card-bg", hex: "#f6f5f0", source: "prototype #f6f5f0" },
  { name: "card-bg-hover", hex: "#efede6", source: "prototype #efede6" },
  { name: "card-border", hex: "#e8e5dd", source: "prototype #e8e5dd" },
  { name: "text-1", hex: "#2d2d2a", source: "prototype #2d2d2a (primary)" },
  { name: "text-2", hex: "#6b6b65", source: "prototype #6b6b65 (secondary)" },
  { name: "text-3", hex: "#9b9b94", source: "prototype #9b9b94 (tertiary)" },
  { name: "divider", hex: "#eae7e0", source: "prototype #eae7e0" },
];

const dE = differenceEuclidean("oklch");

function convert({ name, hex, source }) {
  const srcRgb = parse(hex);
  if (!srcRgb) throw new Error(`Failed to parse hex: ${hex}`);
  const okl = oklch(srcRgb);
  // Round-trip verification — format then reparse and compare
  const css = formatCss(okl);
  const reparsed = parse(css);
  const delta = dE(okl, reparsed);
  if (delta >= 1.0) {
    process.stderr.write(`WARNING: ${name} round-trip ΔE = ${delta.toFixed(4)} (>= 1.0)\n`);
  }
  // Format with 4 decimals on l, 4 on c, 2 on h for readability
  const l = okl.l.toFixed(4);
  const c = okl.c.toFixed(4);
  const h = okl.h !== undefined ? okl.h.toFixed(2) : "0";
  return { name, source, css: `oklch(${l} ${c} ${h})`, hex, delta };
}

const results = PALETTE.map(convert);

// Emit @theme block
console.log("/* === Generated by scripts/hex-to-oklch.mjs at " + new Date().toISOString() + " === */");
console.log("/* DO NOT hand-edit — regenerate via: node scripts/hex-to-oklch.mjs */");
console.log("@theme {");
for (const { name, source, css, hex, delta } of results) {
  console.log(`  /* source: ${source}  ΔE=${delta.toFixed(4)} */`);
  console.log(`  --color-${name}: ${css};`);
  // Also emit the -soft variant if it's a brand color
  if (["orange", "blue", "green", "amber", "purple", "red"].includes(name)) {
    console.log(`  --color-${name}-soft: ${css.replace(/\)$/, " / 0.11)")};`);
  }
}
console.log("}");
console.log("");
console.log("@supports not (color: oklch(0% 0 0)) {");
console.log("  :root {");
for (const { name, hex } of results) {
  console.log(`    --color-${name}: ${hex};`);
  if (["orange", "blue", "green", "amber", "purple", "red"].includes(name)) {
    // Convert hex to rgba(...) for soft fallback (preserves v2.0 0.11 alpha)
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    console.log(`    --color-${name}-soft: rgba(${r}, ${g}, ${b}, 0.11);`);
  }
}
console.log("  }");
console.log("}");
```

[CITED: culorijs.org/api/ — `parse`, `oklch`, `formatCss`, `differenceEuclidean('oklch')`]

### Code Example 6: ESLint inline `no-restricted-syntax` rule (plan-3 deliverable)

```js
// frontend/eslint.config.mjs — additions for Phase 39 plan-3 (D-16)

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    // Existing SEED-001 ignore block — preserved
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/incompatible-library": "off",
    },
  },

  // === Phase 39 D-16: Block raw transition utilities in JSX className ===
  // Catches both shortcut form (duration-150) and bracket form (duration-[0.15s]).
  // Migrate to: [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]
  // See .planning/phases/39-design-token-foundation/39-RESEARCH.md §Pattern 4.
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/transition-(all|colors)\\s+duration-(\\[[^\\]]*\\]|\\d+)/]",
          message:
            "Raw `transition-{all,colors} duration-{N}` is forbidden. " +
            "Use `transition-{all,colors} [transition-duration:var(--motion-fast|base|slow)] " +
            "[transition-timing-function:var(--ease-claude-out)]` instead. " +
            "See .planning/phases/39-design-token-foundation/39-RESEARCH.md §Pattern 4.",
        },
        {
          selector: "TemplateElement[value.raw=/transition-(all|colors)\\s+duration-(\\[[^\\]]*\\]|\\d+)/]",
          message:
            "Raw `transition-{all,colors} duration-{N}` in template literal is forbidden. " +
            "See .planning/phases/39-design-token-foundation/39-RESEARCH.md §Pattern 4.",
        },
      ],
    },
  },

  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "tests/e2e/perf/coldstart.spec.ts",
    ],
  },
];

export default eslintConfig;
```

[CITED: eslint.org/docs/latest/rules/no-restricted-syntax — selector + message format; eslint.org/docs/latest/extend/selectors — regex attribute syntax]

### Code Example 7: SSE keyframes (plan-3 deliverable)

```css
@theme {
  /* === MOTION-02 SSE primitives (consumed by Phase 40 SHARED-02) === */

  --animate-streaming-cursor-blink: streaming-cursor-blink var(--motion-stream-cursor-period) step-end infinite;
  --animate-streaming-chunk-fadein: streaming-chunk-fadein var(--motion-stream-chunk-fadein) var(--ease-claude-out) forwards;

  @keyframes streaming-cursor-blink {
    /* Terminal-cursor pattern: opacity flips at 50% then back. step-end gives the
       hard discrete blink (no fade) that reads as "cursor". Per Pattern 5
       discussion: 1s with `infinite` (NOT `infinite alternate`) — `alternate`
       would create a 2s perceived period because keyframe replays in reverse.
       Source: amitmerchant.com/simple-blinking-cursor-animation-using-css/ */
    0%, 50% { opacity: 1; }
    50.01%, 100% { opacity: 0; }
  }

  @keyframes streaming-chunk-fadein {
    /* Each new SSE chunk fades in over --motion-fast (150ms) using the
       Claude ease curve. Phase 40 SHARED-02's <StreamingText> applies this
       per-chunk on append. */
    from { opacity: 0; transform: translateY(2px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
```

### Code Example 8: Typography scale (plan-2 deliverable)

```css
@theme {
  /* === TYPO-01 4-tier scale (D-06) === */
  /* Source: 01-UI-SPEC.md §Typography (distilled from 25-row prototype scale) */
  /* html { font-size: 15px } so 1rem = 15px → all values resolve to v2.0 px exactly */

  /* Tailwind v4 namespaces:
     --text-*    → text-{name} font-size utility
     --leading-* → leading-{name} line-height utility
     --tracking-*→ tracking-{name} letter-spacing utility */

  /* Hero — Source Serif 4 (apply font-serif explicitly when needed) */
  --text-hero:     2.8rem;   /* 42px */
  --leading-hero:  1.15;
  --tracking-hero: -0.02em;

  /* Section — Source Serif 4 */
  --text-section:     1.5rem;   /* 22.5px */
  --leading-section:  1.3;
  --tracking-section: -0.02em;

  /* Body — Inter (default body font; explicit only when overriding inherited serif) */
  --text-body:    0.95rem;   /* 14.25px */
  --leading-body: 1.5;
  /* tracking-body: omit (browser default 'normal') */

  /* Caption — Inter (uppercase, +letter-spacing) */
  --text-caption:     0.74rem;   /* 11.1px */
  --leading-caption:  1.4;
  --tracking-caption: 0.06em;
}
```

### Code Example 9: prefers-reduced-motion stub (plan-3 deliverable, Q5 answer)

```css
/* === A11Y-05 forward-compat stub (Phase 41 enforces) ===
   Empty rule reserved here so Phase 39 motion tokens have a documented
   home for reduced-motion overrides. Phase 41 A11Y-05 fills this with
   universal-selector rules to neutralize transitions/animations.
   This stub costs ~30 bytes of CSS but eliminates Phase 41's risk of
   "where do I put this?" — keeping the answer co-located with motion
   tokens above. */
@media (prefers-reduced-motion: reduce) {
  /* Phase 41 will add e.g.:
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       scroll-behavior: auto !important;
     }
     ...except for SSE streaming-cursor-blink which is essential AI feedback
     (per CONTEXT.md analogue + Phase 41 ROADMAP success criterion 6). */
}
```

[CITED: developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.ts` with `theme.extend.colors` | Tailwind v4 CSS-first `@theme` block | Tailwind v4 GA, 2025-01 | UniBoard already on v4 — Phase 39 extends existing pattern. No JS config files exist. |
| RGB / HSL colors | OKLCH (perceptually uniform; wider gamut on P3 displays) | CSS Color 4 + Tailwind v4 default palette, 2025 | Phase 39 adopts oklch with hsl fallback. ~7% browsers still need fallback (per caniuse 2026-04). |
| Inline animations / no design system motion tokens | Semantic motion tokens (`--motion-fast/base/slow`) consumed via arbitrary properties | Modern design system convention (Material 3, IBM Carbon, Anthropic) | Phase 39 introduces this; downstream phases consume. |
| Tailwind v3 `font-size` plugin extension | Tailwind v4 `--text-*` namespace | v4 GA, 2025-01 | CONTEXT.md D-06 names need correction (Pitfall 4); Code Example 8 uses correct names. |
| jscodeshift for refactor | Mix of jscodeshift / ts-morph / sed depending on scope | ongoing | At ~56 occurrences with grep-stable patterns, sed wins on time-to-ship. |

**Deprecated/outdated:**
- `tailwind.config.{js,ts}` for color/spacing extension — superseded by `@theme` directive in v4. Project already migrated; no remaining JS config to remove.
- `@csstools/postcss-oklab-function` — viable but hides fallbacks. Not used here per Pattern 5 anti-pattern.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | culori 4.0.2's `differenceEuclidean('oklch')` ≈ ΔE2000 for the small differences we'll see in round-trip (parse → format → reparse) | §Pitfall 5, §Code Example 5 | Round-trip ΔE measured looser than reality; success criterion #1 (`< 1.0`) might pass when CIEDE2000 would say > 1.0. **Mitigation:** the script also logs raw values; if any token's ΔE > 0.5, manually re-verify with `differenceCiede2000()`. |
| A2 | The 56 transition-className occurrences are distributed across ~20 files (not concentrated in one mega-file) such that sed playbook is reviewable in ≤ 30 min | §Pattern 4, §Q3 Answers | If sed produces a 500-line diff, manual review becomes unreliable. **Mitigation:** plan-3 commits the sed pass before manual cleanup so the diff is reviewable. |
| A3 | Vercel/Railway production builds run `pnpm build` → `next build` → `@tailwindcss/postcss` reads the new `@theme` tokens correctly without env-specific tooling | §Architecture Diagram | If production build fails to register utilities, Phase 39 ships broken. **Mitigation:** Verify on Vercel preview branch before merging to main (CLAUDE.md memory: `feedback_post_phase_production_verify.md`). |
| A4 | `step-end` cursor blink keyframe (from Code Example 7) renders identically across Chromium 111+, Safari 16.4+, Firefox 113+ | §Code Example 7 | If Safari clips the 50.01% boundary differently, cursor visibility may flicker. **Mitigation:** Phase 40 SHARED-02's manual UAT covers the 3 SSE pages on Safari + Chrome. |
| A5 | The `--text-*` / `--leading-*` / `--tracking-*` Tailwind v4 namespaces will register utilities `text-hero`, `leading-hero`, `tracking-hero` correctly for tokens that don't clash with default v4 size names | §Q1 Answers, §Pitfall 4 | If `text-section` clashes with v4 default `text-section` (it shouldn't — v4 uses `text-sm/base/lg/xl/2xl/3xl` etc.), components could resolve to the wrong size. **Mitigation:** Add a vitest unit test that imports the compiled CSS string and checks for `.text-hero`, `.text-section`, `.text-body`, `.text-caption` rule presence. |
| A6 | Adding `prefers-reduced-motion` stub block (empty body) at plan-3 has zero behavioral effect (no rules inside means browser ignores) | §Code Example 9, §Q5 Answers | A pure no-op CSS block can't affect runtime. Confidence: HIGH — verified by basic CSS spec knowledge. |

## Open Questions (RESOLVED)

> The CONTEXT.md Discretion items (Q1-Q6) are addressed below as recommendations. None remain unresolved.

### Q1 Answers — Tailwind v4 @theme registration syntax

**What we know:** Tailwind v4 generates utilities from specific namespace prefixes only — `--color-*` → `bg-*`/`text-*`/`border-*`/`fill-*`/`stroke-*`; `--text-*` → `text-{name}` font-size; `--leading-*` → `leading-{name}`; `--tracking-*` → `tracking-{name}`; `--font-*` → `font-{name}` font-family; `--font-weight-*` → `font-{name}` weight; `--spacing-*` → `p-*`/`m-*`/`w-*`/`h-*`/`gap-*`; `--radius-*` → `rounded-*`; `--shadow-*` → `shadow-*`; `--ease-*` → `ease-{name}`; `--animate-*` → `animate-{name}`. [CITED: tailwindcss.com/docs/theme]

**Recommendation:** Use the namespace names exactly as documented. Specifically — **rename CONTEXT.md D-06's tokens** from `--font-size-*`/`--line-height-*`/`--letter-spacing-*` to `--text-*`/`--leading-*`/`--tracking-*`. The rename is non-breaking (no consumers exist yet — Phase 39 is foundation), and it lets `text-hero`, `leading-hero`, `tracking-hero` utilities work via Tailwind utility classes rather than hand-rolled `style={{ fontSize: 'var(...)' }}`.

### Q2 Answers — culori.js conversion script form

**What we know:** culori 4.0.2 exports the right primitives — `parse(hex) → RGB`, `oklch(rgb) → OKLCH`, `formatCss(oklch) → string`, `differenceEuclidean('oklch')(a, b) → number`. [CITED: culorijs.org/api/]

**Recommendation:** One-shot `scripts/hex-to-oklch.mjs` (Code Example 5) — emits the entire `@theme` color block + `@supports` fallback to stdout. Run pattern: `node scripts/hex-to-oklch.mjs > /tmp/colors.css` then paste-replace. **Reasoning over the alternatives:**
- Inline computation in PR description: not reproducible, no audit trail, drifts from prototype hex.
- Build-time PostCSS plugin: hides values, no annotation.
- One-shot CLI: deterministic, version-controlled (script + output), grep-able CSS, ΔE check baked in.

The script is ~80 lines; vitest test (`__tests__/scripts/hex-to-oklch.test.ts`) verifies (a) every PALETTE entry produces a valid oklch string, (b) ΔE round-trip < 1.0 for all entries, (c) output CSS is parsable by a CSS parser (use `postcss` minimal parse).

### Q3 Answers — Codemod approach for transition migration

**What we know:** ~56 occurrences across ~20 files. Patterns are grep-stable: `transition-{all|colors} duration-{NNN}` and `transition-{all|colors} duration-[Xs]`. jscodeshift adds devDep + transform script (~2 hr setup including type defs); sed playbook is ~6 lines (Code Example 4).

**Recommendation:** Sed playbook (Code Example 4), 5 passes, with manual cleanup for 6 edge cases (Sidebar.tsx 4 lines, Header.tsx 2 lines, NotificationPanel.tsx 1 line). Commit the sed pass before manual cleanup so diff is reviewable. **Reasoning:** jscodeshift's win is type-aware refactor; this is grep-aware. Use jscodeshift if Phase 40 SHARED-01 needs another large refactor (e.g., `<Card>` props rename) — then the setup cost amortizes.

### Q4 Answers — ESLint rule packaging

**What we know:** `no-restricted-syntax` ships with ESLint core. ESQuery selectors support regex attribute matching. The rule body is ~15 lines for 2 selectors (Literal + TemplateElement).

**Recommendation:** Inline `no-restricted-syntax` block in `frontend/eslint.config.mjs` (Code Example 6), zero new deps. **Reasoning over local-plugin alternative:** A local plugin (`./eslint-plugin-no-raw-transition/`) would add a directory + `index.js` + `package.json` + likely a separate test file — for 2 regex matchers. The inline form is co-located with the rest of the lint config, easy to delete/modify in one place, and satisfies D-16 verbatim (D-16 says "or inline `no-restricted-syntax` rule" — the inline form was explicitly listed).

### Q5 Answers — prefers-reduced-motion stub

**What we know:** Phase 41 owns A11Y-05 enforcement. Empty `@media (prefers-reduced-motion: reduce) { }` block costs ~30 bytes, has zero runtime effect.

**Recommendation:** Include the stub in plan-3 of Phase 39 (Code Example 9). **Reasoning:** The motion tokens defined in Phase 39 are precisely the things Phase 41 will need to override; co-locating the override block with the tokens makes the intent obvious to anyone reading globals.css. Delete-cost is trivial if Phase 41 takes a different approach. The CONTEXT.md "Claude's Discretion" framing was "either include stub or defer entirely" — including is the lower-friction option.

### Q6 Answers — Section/body/caption typography fine-tune

**What we know:** v2.0 prototype uses 25-row scale (01-UI-SPEC.md §Typography). D-06 distills to 4 rows. The fine-tune knobs are line-height and letter-spacing.

**Recommendation:** Use the values in Code Example 8 (`leading-section: 1.3`, `leading-body: 1.5`, `leading-caption: 1.4`, `tracking-caption: 0.06em`). **Reasoning:** These match the most-common-row values in 01-UI-SPEC.md (e.g., dropdown title and cal month both use `0.88rem 600 weight`; body row at `0.84rem 400-500 weight 1.55 line-height` rounds to `1.5` for clean math). Letter-spacing tracking on `caption` matches the v2.0 stat-label uppercase convention. **Don't** add letter-spacing to body — adds visual weight without fixing any v2.0 issue.

### Q7 Answers — SSE keyframe naming and timing function

**What we know:** Terminal-cursor convention is `1s step-end infinite` (not `alternate`). `step-end` gives discrete on/off, `alternate` would create a 2s perceived period because the reverse playback essentially plays the same keyframe. assistant-ui Claude clone reference is at [www.assistant-ui.com/examples/claude](https://www.assistant-ui.com/examples/claude) (per CONTEXT.md canonical_refs) but the source CSS isn't directly inspectable; the canonical pattern is widely documented. [CITED: amitmerchant.com/simple-blinking-cursor-animation-using-css/]

**Recommendation:** Use `streaming-cursor-blink` 1s infinite (Code Example 7) — opacity flips at 50%/50.01% boundary. Document in TYPO-USAGE.md (or create separate `MOTION-USAGE.md` if doc grows) that Phase 40 should NOT change this period without UAT. **Note on CONTEXT.md D-15 wording:** D-15 says "1s `step-end` infinite alternate" — the `alternate` is unnecessary (and probably wrong). Plan-3 should adopt the no-alternate form; if user explicitly requested `alternate` for a 2s blink rhythm, they can adjust the period to 0.5s and re-add alternate. Default is no-alternate.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | scripts/hex-to-oklch.mjs runner | ✓ | (system) | — |
| pnpm | culori install | ✓ | 10.28.2 | — |
| culori | hex→oklch conversion | ✗ (will install) | 4.0.2 (target) | Hand-tune in tweakcn UI (per CONTEXT.md D-02 + Q2 fallback) |
| Tailwind v4 | @theme compilation | ✓ | 4.2.4 | — |
| ESLint 9 | no-restricted-syntax rule | ✓ | (via eslint-config-next 16.2.4) | — |
| Vitest | TDD for script + ESLint rule | ✓ | 4.1.5 | — |
| Playwright | D-11 visual regression | ✓ | 1.59.1 | — |
| BSD sed | transition migration playbook | ✓ | (macOS system) | GNU sed via brew if needed |
| Brave Search MCP | Web research (this session) | — | — | Built-in WebSearch (used) |
| Context7 MCP | Library docs lookup | — | — | WebFetch on official docs (used) |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** culori — install via `pnpm add -D culori` at plan-1 start.

## Validation Architecture

> nyquist_validation enabled per `.planning/config.json` (`workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 (unit) + Playwright 1.59.1 (visual regression) |
| Config files | `frontend/vitest.config.ts` (existing) + `frontend/playwright.config.ts` (existing) |
| Quick run command | `cd frontend && pnpm test -- --run __tests__/scripts __tests__/eslint` |
| Full suite command | `cd frontend && pnpm test -- --run && pnpm playwright test --grep "@phase39"` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DESIGN-01 | hex→oklch script produces oklch string for every input hex with ΔE round-trip < 1.0 | unit | `pnpm test -- --run __tests__/scripts/hex-to-oklch.test.ts` | ❌ Wave 0 (TDD) |
| DESIGN-01 | globals.css contains `oklch(...)` declarations under @theme AND `@supports not (color: oklch(...))` fallback block | unit (CSS string parse) | `pnpm test -- --run __tests__/styles/tokens-css.test.ts` | ❌ Wave 0 |
| DESIGN-01 | Compiled Tailwind output exposes `--color-orange`, `--color-cream` etc. on `:root` | manual UAT (DevTools inspect) | manual: open dashboard, inspect computed `:root --color-orange`; expect oklch literal | manual-only |
| DESIGN-02 | `pnpm build` succeeds; compiled CSS includes `.p-1`, `.m-2`, `.gap-4` etc. with the new spacing tokens | smoke | `pnpm build && grep -E '\\.p-1\\s*\\{' frontend/.next/static/css/*.css` | ❌ Wave 0 (smoke script) |
| DESIGN-03 | globals.css contains `--motion-fast: 150ms`, `--motion-base: 250ms`, `--motion-slow: 400ms`, `--ease-claude-out: cubic-bezier(0.165, 0.85, 0.45, 1)` | unit (CSS string parse) | `pnpm test -- --run __tests__/styles/motion-tokens.test.ts` | ❌ Wave 0 |
| MOTION-01 | Zero matches for `transition-(all|colors)\s+duration-(\d+|\[)` in app + components | unit (grep wrapper) | `pnpm test -- --run __tests__/lint/no-raw-transition.test.ts` | ❌ Wave 0 |
| MOTION-01 | ESLint custom rule fires on a fixture JSX containing `className="transition-all duration-150"` | unit | `pnpm test -- --run __tests__/eslint/no-raw-transition.test.ts` | ❌ Wave 0 (TDD) |
| MOTION-01 | Playwright pixel-diff: 10-page interaction state snapshots match v2.0 baseline (≤ 0.5%) | visual regression | `pnpm playwright test --grep "@phase39 @transition-parity"` | ❌ Wave 0 (P3 spec deliverable) |
| MOTION-02 | globals.css contains `@keyframes streaming-cursor-blink` and `@keyframes streaming-chunk-fadein` definitions | unit | `pnpm test -- --run __tests__/styles/sse-keyframes.test.ts` | ❌ Wave 0 |
| MOTION-02 | streaming-cursor-blink renders with 1s period (manual UAT — Phase 40 actually integrates; here we verify keyframe parsability) | manual UAT | manual via storybook or temporary test page | manual-only |
| TYPO-01 | globals.css contains `--text-hero`, `--text-section`, `--text-body`, `--text-caption` + matching `--leading-*` and `--tracking-*` | unit | `pnpm test -- --run __tests__/styles/typography-tokens.test.ts` | ❌ Wave 0 |
| TYPO-01 | Compiled Tailwind output includes `.text-hero`, `.leading-section`, `.tracking-caption` rules | smoke | `pnpm build && grep -E '\\.text-hero\\s*\\{' frontend/.next/static/css/*.css` | ❌ Wave 0 |
| TYPO-02 | `TYPO-USAGE.md` exists at `.planning/phases/39-design-token-foundation/TYPO-USAGE.md` and lists 9+ Source Serif 4 elements + 9+ Inter elements | unit (file presence + content grep) | `test -f .planning/phases/39-*/TYPO-USAGE.md && grep -c '^- ' .planning/phases/39-*/TYPO-USAGE.md` | ❌ plan-2 deliverable |

### Sampling Rate

- **Per task commit:** `cd frontend && pnpm test -- --run __tests__/scripts __tests__/eslint __tests__/styles __tests__/lint` (target: < 30s on the slim Phase 39 test surface)
- **Per wave merge:** `cd frontend && pnpm test -- --run` (full vitest suite — should remain green)
- **Phase gate:** Full vitest + `pnpm build` + Playwright `@phase39` tag green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `frontend/__tests__/scripts/hex-to-oklch.test.ts` — covers DESIGN-01 (script I/O contract: every PALETTE entry → valid oklch + ΔE < 1.0)
- [ ] `frontend/__tests__/eslint/no-raw-transition.test.ts` — covers MOTION-01 (load `eslint.config.mjs`, run on fixture JSX, expect violations)
- [ ] `frontend/__tests__/styles/tokens-css.test.ts` — covers DESIGN-01 (read `frontend/app/globals.css` as text, regex-assert oklch + @supports presence)
- [ ] `frontend/__tests__/styles/motion-tokens.test.ts` — covers DESIGN-03 (read globals.css, assert `--motion-fast`, `--motion-base`, `--motion-slow`, `--ease-claude-out`)
- [ ] `frontend/__tests__/styles/sse-keyframes.test.ts` — covers MOTION-02 (read globals.css, assert `@keyframes streaming-cursor-blink` + `streaming-chunk-fadein`)
- [ ] `frontend/__tests__/styles/typography-tokens.test.ts` — covers TYPO-01 (read globals.css, assert `--text-hero/section/body/caption` + `--leading-*` + `--tracking-*`)
- [ ] `frontend/__tests__/lint/no-raw-transition.test.ts` — covers MOTION-01 grep gate (spawn `grep -rE 'transition-(all|colors)\\s+duration-(\\[|\\d)' frontend/{app,components}`; expect exit code 1 = no matches)
- [ ] `frontend/tests/e2e/phase39-transition-parity.spec.ts` — covers MOTION-01 visual regression (10-page screenshot diff vs v2.0 baseline at ≤ 0.5% pixel-diff; port 3001, zh-CN locale)
- [ ] Framework install: `pnpm add -D culori` (covered in plan-1)

## Security Domain

> Phase 39 is pure CSS/build-time tooling. No authentication, session, access control, or cryptography surface. ASVS analysis follows for completeness.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no auth surface) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | partial | hex-to-oklch script accepts a hardcoded palette (no user input); ESLint regex is from a fixed config (no dynamic compilation). No untrusted input flows. |
| V6 Cryptography | no | — |
| V7 Data Protection | no | — (CSS values are public) |
| V14 Configuration | yes | `eslint.config.mjs` change is reviewed in PR; `globals.css` change is reviewed in PR. No secrets touched. |

### Known Threat Patterns for {Tailwind v4 + Vite + Next.js + ESLint}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious npm package (e.g., compromised culori) | Tampering | culori is maintained by Dan Burzo, 7y old, 2M+ weekly DLs (verified npm). Pin to 4.0.2 in package.json. |
| ESLint rule injection via untrusted config | Tampering | `eslint.config.mjs` is in-repo + PR-reviewed. No dynamic config loading. |
| CSS variable name collision causing wrong style application | (Functional, not security) | Vitest test in §Validation asserts every named token resolves to expected value. |

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS Theme docs](https://tailwindcss.com/docs/theme) — namespace registry (`--color-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--animate-*`); `@theme` directive semantics; CSS variable consumption via `var()`
- [culori API Reference](https://culorijs.org/api/) — `parse`, `oklch`, `formatCss`, `differenceEuclidean('oklch')`, `differenceCiede2000`
- [ESLint no-restricted-syntax](https://eslint.org/docs/latest/rules/no-restricted-syntax) — selector + message format
- [ESLint Selectors](https://eslint.org/docs/latest/extend/selectors) — ESQuery regex attribute syntax
- [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — media query semantics
- `frontend/app/globals.css` (in-repo audit) — current 115-line @theme block, font-size base, @theme inline pattern
- `frontend/eslint.config.mjs` (in-repo audit) — extension surface for plan-3
- `frontend/vitest.config.ts` (in-repo audit) — test framework setup
- `frontend/playwright.config.ts` (in-repo audit) — Phase 38 P04 visual regression infrastructure for reuse
- `.planning/phases/01-design-system-foundation/01-UI-SPEC.md` (in-repo audit) — 25-row prototype typography scale, transition variables, color SSOT
- `.planning/REQUIREMENTS.md` (in-repo audit) — DESIGN-01..03, MOTION-01..02, TYPO-01..02 acceptance criteria
- `.planning/phases/39-design-token-foundation/39-CONTEXT.md` (in-repo audit) — D-01..D-16 locked decisions
- `~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/brand-guidelines/SKILL.md` — color SSOT (orange `#d97757`, blue `#6a9bcc`, green `#788c5d`, dark `#141413`, light `#faf9f5`, mid gray `#b0aea5`, light gray `#e8e6dc`)
- npm view (verified 2026-04-28): tailwindcss 4.2.4, culori 4.0.2, eslint 9.x (transitive), jscodeshift 17.3.0, ts-morph 28.0.0, chroma-js 3.2.0
- Codebase grep `grep -rEn 'transition-(all|colors)\s+duration-' frontend/{app,components}` returned 56 matches across ~20 files (verified 2026-04-28) — corrects CONTEXT.md "15+" estimate

### Secondary (MEDIUM confidence)
- [oklch Tailwind discussion #15356](https://github.com/tailwindlabs/tailwindcss/discussions/15356) — fallback strategy for older browsers
- [oklch Tailwind discussion #16392](https://github.com/tailwindlabs/tailwindcss/discussions/16392) — hex fallback approach
- [Tailwind v4 caniuse oklch ~93% support](https://caniuse.com/?search=oklch) (cross-verified via Issue #16351)
- [Amit Merchant — CSS blinking cursor](https://www.amitmerchant.com/simple-blinking-cursor-animation-using-css/) — `step-end` cursor pattern
- [Mavik Labs — Design Tokens Tailwind v4 2026](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026) — design system patterns
- [Codemod ts-morph + jscodeshift comparison](https://codemod.com/blog/ts-morph-support) — codemod tooling tradeoffs
- WebFetch on `shadcn.io/r/claude.json` → 401 (gated; unable to cross-check oklch values directly; mitigated by direct culori conversion comparison)

### Tertiary (LOW confidence)
- [shadcn.io/theme/claude](https://www.shadcn.io/theme/claude) — partial oklch values (`oklch(0.70 0.14 45)` for orange) leaked from page text; cross-checked against UniBoard culori conversion (different — confirms CONTEXT.md's "don't direct-lift" decision)
- [assistant-ui Claude clone](https://www.assistant-ui.com/examples/claude) — referenced but source CSS not inspected; SSE pattern derived from canonical CSS step-end documentation, not assistant-ui specifically

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — culori 4.0.2, Tailwind v4.2.4, ESLint 9, Vitest 4.1.5, Playwright 1.59.1 all verified via `npm view` and in-repo `package.json`. Tailwind v4 namespace mapping verified directly against [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme).
- Architecture: HIGH — `globals.css` is an existing additive surface; `@theme` directive semantics confirmed; @supports CSS feature-query syntax is W3C standard; ESLint AST selector confirmed via official docs.
- Pitfalls: MEDIUM — Pitfall 4 (Tailwind v4 namespace correction) is HIGH confidence (verified against docs); Pitfall 5 (ΔE formula choice) is MEDIUM (culori docs less prescriptive on which formula for sRGB-derived round-trip; recommended `differenceEuclidean('oklch')` is reasonable but could be improved by CIEDE2000 if precision matters).
- Migration playbook (Pattern 4): MEDIUM — sed playbook tested mentally against the 56 occurrences sampled in this research, but not yet executed end-to-end. Real-world sed runs may reveal edge cases (e.g., `transition-all duration-150 ease-in-out` chained orderings).
- SSE keyframe timing: MEDIUM — `1s step-end infinite` (no `alternate`) is the canonical terminal-cursor pattern but CONTEXT.md D-15 says `infinite alternate`; flagged in Q7 with recommendation to drop `alternate`.

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days; Tailwind v4 minor releases can extend namespaces but won't break existing ones; culori has been stable on the relevant API surface since 2023)
