# Phase 39: Design Token Foundation - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish a complete design token layer (oklch colors with hsl fallback, 8-point spacing scale, elevation/shadow, motion timing, 4-tier serif typography) as CSS variables that all v3.0 phases (40 SHARED, 41 STATES/A11Y, 42 NEWVIS, 43 DARK) will consume. The token layer is **additive** — Tailwind v4 `@theme` block in `frontend/app/globals.css` is extended; existing v2.0 hsl/rgb values are preserved as fallback via `@supports`. No component visual changes (durations preserved, easings semantically renamed but mapped to equivalent timing where v2.0 already used Claude-style ease curves).

This phase **owns** 7 REQs:
- DESIGN-01 (oklch + light/dark variants), DESIGN-02 (spacing + shadow), DESIGN-03 (motion timing constants)
- MOTION-01 (transition migration sweep), MOTION-02 (SSE streaming-cursor + chunk-fade keyframes — primitive only; consuming components belong to Phase 40 SHARED-02)
- TYPO-01 (4-tier serif scale), TYPO-02 (serif vs Inter usage doc)

Hard constraints preserved across all v3.0 work (untouched here): Rough.js hand-drawn borders, Rough Notation highlights, paper texture (fractalNoise grain + ruled lines), 10-page main visual layout, TanStack Query hooks signatures, backend FastAPI/Supabase API, i18n en/zh.

</domain>

<decisions>
## Implementation Decisions

### Color Token Architecture (DESIGN-01)

- **D-01:** **oklch primary, hsl fallback via `@supports`.** `:root` block declares `--color-*` tokens in oklch space. A `@supports not (color: oklch(0% 0 0)) { :root { ... } }` block re-declares the same token names in hsl/rgb. Token names are single-source; downstream consumers (Tailwind classes, Phase 40 components) write `var(--color-orange)` once.
- **D-02:** **Convert v2.0 hex via culori.js / oklch.com as the source-of-truth pipeline.** Each color token has a CSS comment citing its origin hex, with annotation distinguishing brand-guidelines-sourced colors (orange/blue/green) from project-specific colors (purple/red/amber/cream/dark/card-bg etc.). Example: `--color-orange: oklch(...); /* source: anthropics/skills/brand-guidelines #d97757 (accent: primary) */`.
- **D-03:** **Dark mode: structural reservation only.** `globals.css` includes an empty `[data-theme="dark"] { /* Phase 43 fills these */ }` block plus a doc section in this CONTEXT.md and the Phase 39 PLAN naming the dark color convention (warm-deep-brown root surface `#2b2a27` per Anthropic spec; tokens prefix `--color-dark-*` for dark-only overrides). Phase 43 fills values; if Phase 43 is permanently deferred, the empty block is harmless.
- **D-04:** **Token file: continue in `globals.css` `@theme` block.** Tailwind v4's native pattern; zero migration; `@theme` extension keeps the v2.0 contract. globals.css will grow ~200 lines but stays within readable bounds.

### Typography (TYPO-01, TYPO-02)

- **D-05:** **Fonts unchanged: Source Serif 4 + Inter (v2.0 / Phase 1 decision).** brand-guidelines is the single source of truth for **colors only**. CSS comment in font block makes this explicit:
  ```css
  /* Fonts are project-level override.
     anthropics/skills/brand-guidelines specifies Poppins (headings) + Lora (body)
     for PPT/Doc artifacts. UniBoard is a web app; font decisions are locked at
     v2.0 Phase 1 after 103 prototype iterations validated Source Serif 4 + Inter
     as the visual identity. brand-guidelines colors apply unmodified. */
  ```
- **D-06:** **TYPO-01 4-tier scale, distilled from v2.0 prototype CSS:**
  | Tier | Font | Size | Weight | Line-height | Letter-spacing |
  |---|---|---|---|---|---|
  | hero | Source Serif 4 | 2.8rem (42px) | 700 | 1.15 | -0.02em |
  | section | Source Serif 4 | 1.5rem (22.5px) | 700 | 1.3 | -0.02em |
  | body | Inter | 0.95rem (14.25px) | 600 | 1.5 | — |
  | caption | Inter (uppercase) | 0.74rem (11.1px) | 600 | 1.4 | 0.06em |
  Exposed as CSS variables `--font-size-hero/section/body/caption` + matching `--line-height-*` and `--letter-spacing-*`. Tailwind v4 `@theme` registers `text-hero`, `text-section`, `text-body`, `text-caption` utility shortcuts.
- **D-07:** **TYPO-02 usage rule** (documented in Phase 39 plans + `.planning/phases/39-*/TYPO-USAGE.md`):
  - **Source Serif 4 (narrative):** hero greeting, page titles (h1/h2), card titles, WAM number, GPA target value, stat values, profile name, scroll hint italic.
  - **Inter (UI chrome / data labels):** button labels, sidebar nav labels, search placeholder, dropdown items, form input labels, calendar day numbers, stat labels (uppercase), grade badges, dropdown timestamps.
- **D-08:** **Font weights unchanged.** Source Serif 4: 400/600/700 + italic 400. Inter: 400/500/600/700. No new font-weight loads — first-load performance preserved.

### Phase 39 ↔ Phase 40 Migration Boundary (MOTION-01)

- **D-09:** **Phase 39 owns the full migration sweep.** All `transition-all duration-NNN` and `transition-colors duration-NNN` Tailwind classes in `frontend/app/` and `frontend/components/` are routed through motion tokens. Visual equivalence is preserved (durations unchanged, just token-routed). AC #2 (`grep transition: all` zero matches) verifies in Phase 39 — extended to also assert zero matches for `transition-all duration-` and `transition-colors duration-` className patterns.
- **D-10:** **Replacement mechanism: Tailwind v4 arbitrary properties.** Pattern:
  ```tsx
  // Before
  className="transition-colors duration-150 hover:bg-card-bg-hover"
  // After
  className="transition-colors [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] hover:bg-card-bg-hover"
  ```
  Zero runtime cost. Diff readable. Grep-able.
- **D-11:** **Migration verification gate (Phase 39 ship criteria):**
  1. `grep -rE 'transition-(all|colors) duration-[0-9]' frontend/{app,components}` returns zero matches.
  2. Playwright snapshot diff across 10 pages — interaction states (hover, focus, dropdown open, sidebar expand) screenshot vs v2.0 baseline; pixel-diff under 0.5% per page.
- **D-12:** **Phase 39 plan ordering:**
  - **plan-1:** Color + spacing + shadow tokens (`@theme` block extension; oklch + `@supports` hsl fallback; spacing 4/8/12/16/24/32/48/64; existing shadow tokens preserved as `--shadow-card/-hover/-dropdown`).
  - **plan-2:** Typography scale + serif/sans usage doc (`--font-size-*`, `--line-height-*`, `--letter-spacing-*`; Tailwind utility shortcuts; `TYPO-USAGE.md` reference doc).
  - **plan-3:** Motion tokens + transition className migration sweep (`--motion-fast/base/slow`, `--ease-claude-out`, SSE keyframes; codemod or manual sweep; ESLint guard rule install; verification gate).

### Motion Naming + SSE Primitive Scope (DESIGN-03 + MOTION-02)

- **D-13:** **Semantic motion duration naming** with millisecond comments:
  ```css
  --motion-fast:  150ms; /* hover/focus feedback, color/opacity micro-transitions */
  --motion-base:  250ms; /* layout shifts, dropdown drop-in, sidebar expand */
  --motion-slow:  400ms; /* page-level entries, hero animations, large layout */
  --ease-claude-out: cubic-bezier(0.165, 0.85, 0.45, 1); /* per v3.0 brand spec */
  ```
- **D-14:** **v2.0 legacy ease tokens kept as aliases.** `--ease` (0.28s cubic-bezier(.4,0,.2,1)) and `--ease-fast` (0.15s ease) remain in globals.css with a `/* v2.0 legacy — new code MUST use --ease-claude-out + --motion-fast/base/slow */` annotation. Phase 40 SHARED-01 deprecates them site-wide; Phase 39 only adds the new tokens, does not delete legacy.
- **D-15:** **SSE streaming primitives split across phases:**
  - **Phase 39 contributes:** `@keyframes streaming-cursor-blink` (1s `step-end` infinite alternate) and `@keyframes streaming-chunk-fadein` (`var(--motion-fast)` `var(--ease-claude-out)`); plus `--motion-stream-cursor-period: 1s` and `--motion-stream-chunk-fadein: var(--motion-fast)` semantic aliases.
  - **Phase 40 SHARED-02 contributes:** `useStreamingText` hook + `<StreamingText>` / `<StreamingCursor>` React components consuming the keyframes. Three SSE pages (Digest, Predict, Deadlines AI chat) migrate together in Phase 40.
- **D-16:** **MOTION-01 anti-regression: ESLint custom rule + CI gate.**
  - Add `eslint-plugin-no-raw-transition-tailwind` (or inline `no-restricted-syntax` rule) blocking string literals matching `/transition-(all|colors)\s+duration-\d+/` in JSX className attributes.
  - CI lint pipeline fails PR if rule triggers. Prevents Phase 40-42 from re-introducing raw transition utilities.

### Claude's Discretion

- Exact Tailwind v4 `@theme` registration syntax for new tokens (CSS variable to `bg-*` / `text-*` utility mapping).
- The codemod/script approach vs hand-edits for the ~15+ `transition-all/colors` className migrations (plan-3 of this phase).
- Exact culori.js conversion script form (one-shot `node scripts/hex-to-oklch.mjs` vs inline computation in PR).
- ESLint rule packaging (inline rule in `eslint.config.js` vs new local plugin).
- Specific oklch values per color (must round-trip ΔE < 1.0 to source hex per AC #1; tooling decides exact values).
- Section/body/caption line-height and letter-spacing fine-tune within the framework set in D-06.
- Whether to add a `prefers-reduced-motion` global override stub in globals.css (Phase 41 A11Y-05 will own enforcement; Phase 39 may include the empty media query for forward-compatibility).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked v3.0 Requirements
- `.planning/REQUIREMENTS.md` §"Design Tokens" — DESIGN-01..03 (oklch, spacing, motion)
- `.planning/REQUIREMENTS.md` §"Motion" — MOTION-01..02 (transition migration, SSE streaming)
- `.planning/REQUIREMENTS.md` §"Typography" — TYPO-01..02 (4-tier serif, usage rules)
- `.planning/REQUIREMENTS.md` §"Hard Constraints" — Rough.js + paper texture + 10-page layout invariants
- `.planning/REQUIREMENTS.md` §"Reference Materials In Scope" — brand-guidelines, shadcn/theme/claude, assistant-ui Claude Clone, tweakcn
- `.planning/ROADMAP.md` §"Phase 39" — goal + 5 success criteria

### Brand & Design SSOT
- `~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/brand-guidelines/SKILL.md` — **color SSOT** (orange `#d97757`, blue `#6a9bcc`, green `#788c5d`, dark `#141413`, light `#faf9f5`, mid gray `#b0aea5`, light gray `#e8e6dc`). Note: font block (Poppins/Lora) explicitly NOT applied — see D-05.
- `https://www.shadcn.io/theme/claude` — oklch conversion reference for cross-checking values.
- `https://www.assistant-ui.com/examples/claude` — SSE no-bubble flowing reply pattern (Phase 40 SHARED-02 will consume this; Phase 39 only defines motion primitives).
- `https://tweakcn.com/` — online oklch tuning tool for spike-time validation if ΔE > 1.0 occurs after culori conversion.

### v2.0 Foundation (Phase 1 — preserve, do not regress)
- `.planning/phases/01-design-system-foundation/01-CONTEXT.md` — Phase 1 boundary, prototype-fidelity rule, Source Serif 4 + Inter font decision
- `.planning/phases/01-design-system-foundation/01-UI-SPEC.md` — exhaustive design contract (extracted from prototypes); section "Color" lists 12 brand + 9 neutral tokens with hex values; section "Typography" lists 25-row prototype type scale (D-06's 4-tier scale distills these); section "Transitions & Animations" lists keyframes preserved unchanged; section "Cross-Prototype Consistency" lists what's identical across all 10 prototype files.
- `prototype/DESIGN_SYSTEM.md` — reusable CSS patterns; `:root` color/layout/spacing/radius/shadow/animation tokens; canonical hex for all colors.
- `frontend/app/globals.css` — current Tailwind v4 `@theme` block (target file for Phase 39 plan-1).

### Inspiration (context only, not code spec)
- `~/Downloads/compass_artifact_wf-69687d8e-7507-4007-8393-a96ef153519f_text_markdown.md` — Anthropic aesthetic deep-research essay (background reading; not implementation spec).

### Constraint Tracking (v2.0 Phase 1 references the prototype HTML files as source-of-truth — listed for downstream agent awareness, untouched by this phase)
- `prototype/dashboard.html`, `auth.html`, `setup.html`, `courses.html`, `course-detail.html`, `deadline.html`, `predict.html`, `digest.html`, `timetable.html`, `settings.html`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`frontend/app/globals.css` `@theme` block (lines 1-115)** — Already contains 12 brand color tokens (`--color-orange`, `--color-blue`, etc.), 9 neutral tokens, 3 shadow tokens, 2 radius tokens, 4 layout spacing tokens, 6 animation `--animate-*` definitions, 5 keyframes (`slide-up`, `fade-in`, `gentle-bob`, `drop-in`, `spin`, `skeleton-shimmer`). Phase 39 extends this block additively.
- **`@theme inline { --font-sans: var(--font-inter), ...; --font-serif: var(--font-source-serif-4), ...; }`** (globals.css line 112-115) — `next/font` integration in place. Phase 39 adds `--font-size-*`, `--line-height-*`, `--letter-spacing-*` to the same block.
- **Existing `--ease: 0.28s cubic-bezier(.4,0,.2,1)` and `--ease-fast: 0.15s ease`** — Used in 50+ places across components (per v2.0 Phase 1 UI-SPEC §"Transitions"). Phase 39 keeps these as legacy aliases (D-14); Phase 40 SHARED-01 will deprecate.
- **Existing keyframes (`slide-up`, `fade-in`, etc.)** — Already use cubic-bezier curves consistent with Claude motion philosophy. Phase 39 does not touch these; new SSE keyframes are additive.
- **`html { font-size: 15px }`** (globals.css line 119) — REM base unchanged; D-06 4-tier scale's rem values resolve to the same px values v2.0 prototype already uses.

### Established Patterns

- **Tailwind v4 inline `@theme` directive (CSS-first config)** — No `tailwind.config.ts` file exists. All design system tokens live in CSS via `@theme` block. Phase 39 follows this pattern; no JS config touches.
- **`next/font` Variable Font integration** — Source Serif 4 + Inter loaded via `next/font/google` with weight subsets per font (declared at `frontend/app/layout.tsx`). Phase 39 does not modify font loading.
- **Tailwind class `transition-all duration-150` / `transition-colors duration-150`** — Used 15+ times across `frontend/components/{settings,auth}/`. Phase 39 plan-3 migrates these to `[transition-duration:var(--motion-fast)]` form.
- **Inline arbitrary properties already used** — Components like `RegisterForm.tsx` already write `transition-[border-color,box-shadow] duration-150`; Phase 39 plan-3 keeps the property list, swaps the `duration-150` token.
- **i18n via next-intl with `[locale]` route prefix** — Phase 39 does not touch i18n; `TYPO-USAGE.md` doc may include both en/zh sample text but is not user-facing copy.

### Integration Points

- **All 10 page routes (`frontend/app/[locale]/**`)** — Token consumers; Phase 39 plan-3 migrates className uses; Phase 40-42 consume new tokens for component polish.
- **`frontend/components/ui/RoughCard.tsx`** — Untouched (Rough.js hand-drawn borders are hard constraint); but its parent containers may have `transition-all` to migrate.
- **`frontend/eslint.config.{js,ts,mjs}`** — Phase 39 plan-3 adds the `no-restricted-syntax` / custom rule for transition className guard (D-16).
- **`frontend/.github/workflows/frontend-ci.yml`** (or root `.github/workflows/`) — Existing ESLint step picks up the new rule; no workflow changes needed beyond ensuring lint runs on PR.
- **Phase 40 SHARED-01 (Card/Button/Input/Modal/Tooltip)** — Will consume `--font-size-*`, `--motion-*`, `--ease-claude-out`, padding/spacing tokens; Phase 39 must publish these before Phase 40 plan-1.
- **Phase 40 SHARED-02 (no-bubble AI reply)** — Consumes Phase 39 SSE keyframes (`streaming-cursor-blink`, `streaming-chunk-fadein`) and `--motion-stream-*` tokens.
- **Phase 41 A11Y-05 (`prefers-reduced-motion`)** — Consumes Phase 39 motion tokens; reduced-motion override either lives in a future-compat stub here (Claude's Discretion) or fully in Phase 41.
- **Phase 43 DARK-01..03** — Consumes the empty `[data-theme="dark"]` block scaffolded by D-03; only Phase 43 fills values.

</code_context>

<specifics>
## Specific Ideas

- The "additive layer, no visual changes" framing came from the Phase 39 ROADMAP wording but was actively defended in discussion — every sub-decision optimized for "v2.0 visual contract preserved while new tokens become available to v3.0 phases."
- D-09's choice (Phase 39 owns the migration sweep) explicitly trades phase-boundary purity for AC #2 verifiability. The reasoning: a `transition-all` migration is plumbing, not design; routing it through tokens preserves visual equivalence and unblocks Phase 40 from scope inflation.
- D-15 (SSE primitive split) keeps Phase 39 narrow (keyframes only) and lets Phase 40 SHARED-02 own the consuming hook+component pair — aligned with the assistant-ui Claude Clone reference (no-bubble flowing text pattern).
- The brand-guidelines font conflict (D-05) was caught and reconciled mid-discussion; CSS comment block is the persistence layer for the rationale so downstream agents reading `globals.css` understand why Source Serif 4 + Inter are kept.

</specifics>

<deferred>
## Deferred Ideas

- **Token-name TypeScript module (`tokens.ts`)** — Considered as Q4 option C for token file organization; rejected for v3.0 scope. Could revisit in v4.0 if JS code (e.g., charts, programmatic style) needs typed token access.
- **shadcn/theme/claude direct lift** — Considered as Q2 option B for oklch source values; rejected because UniBoard's hex palette doesn't 1:1 match shadcn theme; conversion from project hex preserves identity.
- **Variable Font consolidation** — Considered as Q4 option C in font loading; rejected; current `next/font` weights tree-shake fine.
- **Switch to Poppins / Lora per brand-guidelines literal** — Considered as Q1 option B; rejected because brand-guidelines targets PPT/Doc artifacts, web app font is project-locked at v2.0 Phase 1.
- **Direct overwrite of `--ease` / `--ease-fast` legacy values** — Considered as v2.0 ease handling option B; rejected to avoid silent animation rhythm shifts across 50+ call sites in v2.0 code.
- **Codemod tooling (jscodeshift)** for the transition-className migration — Phase 39 plan-3 implementer's discretion; manual sweep with grep/sed is also acceptable given ~15+ file count.

</deferred>

---

*Phase: 39-design-token-foundation*
*Context gathered: 2026-04-28*
