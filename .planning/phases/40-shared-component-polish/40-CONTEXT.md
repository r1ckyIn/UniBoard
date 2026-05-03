# Phase 40: Shared Component Polish - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire Phase 39's design tokens into the three shared layers that every page touches: (1) component primitives (Button + Input), (2) AI reply visual pattern (no-bubble Claude-style flowing text + typing cursor), and (3) Sidebar architecture (transform-based two-layer DOM for 60fps Intel Mac).

The Rough.js outer shell (RoughCard borders, paper texture, 10-page main layout), TanStack Query hooks signatures, FastAPI/Supabase backend contracts, and i18n en/zh translations are **untouched**. This phase consumes the Phase 39 token layer; it does not redefine or extend tokens. v3.0 visual contract evolves from "tokens exist but nothing consumes them" to "shared components uniformly read tokens".

This phase **owns** 3 REQs:
- SHARED-01 (Card / Button / Input / Modal / Tooltip internal padding, focus ring, disabled state unified to design tokens — scope clarified during this discussion: extract Button + Input only)
- SHARED-02 (AI reply no-bubble Claude-style flowing text + typing cursor across Digest / Deadlines / Predict)
- SHARED-03 (Sidebar transform-based positioning to eliminate hover lag, achieve 60fps Intel Mac; subsumes REFACTOR-01 + REFACTOR-02 + backlog 999.1)

Hard constraints preserved (untouched here): Rough.js hand-drawn borders, Rough Notation highlights, paper texture (fractalNoise grain + ruled lines), 10-page main visual layout, TanStack Query hooks signatures, backend FastAPI/Supabase API, i18n en/zh.

</domain>

<decisions>
## Implementation Decisions

### SHARED-01 — Primitive Extraction Scope

- **D-40-01:** **Extract Button + Input primitives only.** New files: `frontend/components/ui/Button.tsx` + `frontend/components/ui/Input.tsx`. Modal stays as native `<dialog>` (only 2 callers: `DangerZoneSection.tsx`, `ExternalLinkDialog.tsx` — abstraction not justified). Tooltip is not extracted (no existing implementation; future-Phase 41/42 introduces if needed). Card is not touched (`design-system/RoughCard.tsx` is the Rough.js hand-drawn primitive — hard constraint).

  **Rationale:** Codebase scout found 277 raw `<button>`/`<input>` JSX usages across `frontend/components/`, with Button-like uses dominating (~5 repeating styles: primary orange, secondary outline, ghost, icon-only, danger red); Input-like uses mostly text/email/password/search (2 main shapes). Extracting these two captures ~80% of the SHARED-01 token-routing pain at acceptable blast radius. Modal/Tooltip/Card primitives would add scope without material per-caller payoff.

- **D-40-02:** **API style is cva-based with semantic variants — not Radix, not shadcn full.**
  - `<Button variant="primary"|"secondary"|"ghost"|"danger" size="sm"|"md" iconOnly? loading?>`
  - `<Input variant="default"|"search" leftIcon? rightIcon? error?>`
  - Use `class-variance-authority` (~1.5kb, type-safe variant binding to tokens). Do NOT introduce Radix UI primitives (Modal stays native, Tooltip not extracted — the dependency is unjustified).
  - Loading state: spinner glyph + opacity ramp via `--motion-fast` + `--ease-claude-out`; `disabled:opacity-50 disabled:cursor-not-allowed` baseline.
  - Focus ring: standard `focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2 focus-visible:outline-none` token-routed; this also lays groundwork for A11Y-01 in Phase 41 (current codebase has 0 files using `focus-visible:`).

- **D-40-03:** **SEED-40 motion utility DRY refactor folded INTO this phase.** New `@utility transition-claude-fast` / `transition-claude-base` / `transition-claude-slow` blocks added to `frontend/app/globals.css`. After authoring the utilities, sweep all 56 verbose `transition-{all|colors} [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]` occurrences across 36 files back to the shorthand (`transition-claude-fast` etc.). Update Phase 39's ESLint `no-restricted-syntax` rule to also flag the verbose form (encourage shorthand).

  **Rationale:** Doing the 277-caller sweep for Button/Input + the 56-caller verbose-form sweep in two separate phases would mean two near-identical PRs touching the same files. SEED-40's effort estimate (~1.5h) is small enough to fold here. SEED-40 closure procedure flips `dormant` → `closed`.

- **D-40-04:** **v2.0 legacy `--ease` / `--ease-fast` deprecation — ESLint-gated, no full sweep.** Add `var(--ease)` and `var(--ease-fast)` to the existing `eslint.config.mjs` `no-restricted-syntax` rule (block new occurrences). Existing 50+ callers stay until SHARED-02 / SHARED-03 sweep them naturally en route, with Phase 41 a11y pass picking up any tail. Do NOT delete the alias declarations in `globals.css` this phase.

  **Rationale:** Phase 39 LEARNINGS demonstrated the sed-sweep pattern is viable, but a full --ease sweep adds 50+ file diff with cosmetic 30ms duration shifts (0.28s legacy → 0.25s `--motion-base`) that could surface as imperceptible-but-cumulative visual regression. Phase 39 chose conservatism (alias retention, Phase 40 opt-in deprecation). Phase 40 honors that and chooses the same conservatism for the subsequent layer: ESLint blocks new debt, sweeps only happen when a phase touches the file anyway.

### SHARED-02 — AI No-Bubble Claude-Style Reply

- **D-40-05:** **Replace `shared/AiChatBubble.tsx` with three new files.** Delete the existing 44-line component. New:
  - `frontend/components/shared/StreamingAssistant.tsx` — assistant role; no bubble; left-aligned; uses Source Serif 4 body text (`text-body` Phase 39 utility); inline trailing cursor.
  - `frontend/components/shared/UserMessage.tsx` — user role; preserves bubble (right-aligned, orange `bg-orange text-white rounded-br-[4px]`).
  - `frontend/hooks/useStreamingText.ts` — hook consuming SSE chunks, exposes `{ text, isStreaming }`, applies `streaming-chunk-fadein` keyframe per chunk arrival.

  **Rationale:** A `mode` prop on AiChatBubble (option B in discussion) would couple user-bubble + assistant-flowing into one component with internal branching — not a natural API for "user vs assistant have fundamentally different visual treatment". The double-component split is cleaner long-term. 3 callers (`DeadlineAiChat.tsx`, `AiCourseChat.tsx`, Predict-side consumer if any) migrate together — diff size acceptable.

- **D-40-06:** **Consume Phase 39 SSE keyframes verbatim.** `streaming-cursor-blink` (1s `step-end` infinite — never `alternate`, codified in Phase 39 LEARNINGS) drives the trailing cursor; `streaming-chunk-fadein` (`var(--motion-fast)` `var(--ease-claude-out)`) fades in each chunk as it arrives. New tokens are NOT introduced — Phase 39 published the primitives, Phase 40 is a pure consumer.

- **D-40-07:** **Cursor is inline at end of streamed text** (terminal-style trailing block, not floating). When stream completes (`isStreaming === false`), cursor unmounts; when stream is active and content is empty, cursor renders alone (placeholder). This matches Claude.ai web behavior and assistant-ui Claude Clone reference. All 3 callers migrate in a single plan to keep the rollout atomic.

### SHARED-03 — Sidebar Transform-Based Refactor

- **D-40-08:** **Two-layer DOM with `translateX` toggle.** Refactor `frontend/components/layout/Sidebar.tsx` to:
  ```tsx
  <aside class="fixed inset-y-0 left-0 w-[68px] z-[100] overflow-hidden">
    <div class="absolute inset-y-0 left-0 w-[224px]
                bg-dark
                translate-x-[-156px]
                transition-claude-base
                hover:translate-x-0
                [contain:layout_paint]">
      {/* logo + nav items + bottom items inside the 224px panel */}
    </div>
  </aside>
  ```
  Width animation is replaced with `transform: translateX()` — pure GPU compositing, zero layout reflow. Outer 68px container always occupies layout space; main content position is stable across hover state (no longer pushed). The seed v2.0 fix (`[contain:layout_paint]` + 1px right border for paint isolation) carries over to the inner panel.

  **Rationale:** REQUIREMENTS.md SHARED-03 explicitly recommended this approach ("Two-layer DOM (outer 68 px container always visible + inner 224 px panel absolutely positioned). Default `translateX(-156px)`, `translateX(0)` on hover. GPU-composited."). Phase 39 LEARNINGS surfaced that v2.0 already micro-fixed Sidebar's `[contain:layout_paint]` and shadow→border — this is the natural next architectural step rather than another patch on the width-animation foundation.

- **D-40-09:** **Active state highlight renders inside the inner 224px panel** (on the nav item itself). In collapsed state (default `translateX(-156px)`), users see the right ~68px of the inner panel — including the right portion of the active nav item's orange highlight bar. The hover-expand reveals the full nav-item width with continuous highlight. No bridging element on the outer 68px shell.

  **Rationale:** A second highlight bar on the outer 68px would create double-source-of-truth (collapsed and expanded states have different active markers); single inner-panel rendering keeps the visual contract uniform. The "right half of highlight visible while collapsed" is the established pattern in assistant-ui Claude Clone references and similar layout-aware sidebars.

- **D-40-10:** **`prefers-reduced-motion` instant-toggle is deferred to Phase 41 A11Y-05.** SHARED-03 ships the architectural transform refactor; the `@media (prefers-reduced-motion: reduce) { transition-duration: 0s }` override lives in the Phase 41 a11y pass. Sidebar's reduced-motion handling is not special — Phase 41 covers the global pass for transitions across all components.

  **Rationale:** Phase 41 already owns A11Y-05 (`prefers-reduced-motion` honored — global pass). Pulling Sidebar's reduced-motion override forward to Phase 40 fragments the a11y work and complicates Phase 41's audit. Keep phase boundaries clean.

### Cross-Cutting

- **D-40-11:** **Phase 40 wave / plan ordering — planner's call.** Recommend three plans:
  - **plan-1: SHARED-01** — `ui/Button.tsx` + `ui/Input.tsx` (cva primitives) + SEED-40 `@utility` blocks + 277 + 56 callers className sweep + ESLint legacy `--ease`/`--ease-fast` block rule
  - **plan-2: SHARED-02** — `useStreamingText` hook + `StreamingAssistant` + `UserMessage` components + 3 callers migration + delete `AiChatBubble.tsx`
  - **plan-3: SHARED-03** — Sidebar two-layer DOM + `translateX` + 60fps Intel Mac visual regression baseline (defer Playwright assertion to production UAT per Phase 39 SEED-39 pattern)

  Plan-1 and plan-3 both touch `Sidebar.tsx` (plan-1 sweeps the verbose-form `transition-*` className → shorthand; plan-3 rewrites the structural JSX). Wave-parallelism is therefore likely sequential plan-1 → plan-3 with plan-2 free to overlay either; planner determines via wave assignment.

- **D-40-12:** **TDD triplet preserved from Phase 39** (per LEARNINGS pattern). Each plan ships RED test commit → GREEN implementation commit → docs commit (SUMMARY + STATE + REQUIREMENTS update). Visual regression: Phase 39's env-gated Playwright spec pattern carries forward — author specs in-tree, baseline generation deferred to production UAT to avoid local credential setup.

- **D-40-13:** **No new dependencies beyond `class-variance-authority`.** Specifically NOT introducing Radix UI, Tailwind plugins, or shadcn CLI. cva is leaf-level only (no peer-dep cascade).

### Claude's Discretion

- Exact 277-callers + 56-callers sweep tooling (sed playbook, jscodeshift, manual per-file) — Phase 39 LEARNINGS established sed is sufficient for grep-stable string replacements; planner picks per task scope.
- Specific cva variants enum and class-string per variant — token-bound but exact final strings are planner-time fine-tuning (e.g., `bg-orange hover:bg-orange/90` vs `bg-orange hover:brightness-110`).
- `useStreamingText` internal state machine — `useDeferredValue` vs incremental `useState` setter vs reducer; planner picks based on test ergonomics.
- Sidebar inner panel z-index, exact absolute-positioning anchor (`inset-y-0 left-0` vs explicit `top-0 bottom-0 left-0`), and overflow-x handling on the inner panel — planner-time mechanical decisions.
- Whether to bundle SEED-39 closure procedure (Playwright baseline generation) into plan-3's visual regression task or keep it independent — depends on whether `PERF_TEST_PASSWORD` is provisioned in this phase.
- Whether `disabled` state on Button uses `aria-disabled` (allows focus, screen-reader announcement) vs `disabled` HTML attribute (excludes from tab order) — planner picks based on a11y philosophy; A11Y-03 (Phase 41) is the canonical owner.

### Folded Todos

(No backlog todos folded — all relevant Phase 36 / Phase 37 / backlog 999.1 items already absorbed into SHARED-01/02/03 REQs at v3.0 milestone re-scope on 2026-04-27.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked v3.0 Requirements
- `.planning/REQUIREMENTS.md` §"Shared Components Polish" — SHARED-01..03 (primitives, AI no-bubble, Sidebar transform)
- `.planning/REQUIREMENTS.md` §"Hard Constraints" — Rough.js + paper texture + 10-page layout invariants
- `.planning/REQUIREMENTS.md` §"Reference Materials In Scope" — assistant-ui Claude Clone (SHARED-02 reference)
- `.planning/ROADMAP.md` §"Phase 40" — goal + 5 success criteria

### Phase 39 Foundation (consumed verbatim — no changes)
- `.planning/phases/39-design-token-foundation/39-CONTEXT.md` — D-13 motion tokens, D-14 legacy alias retention strategy, D-15 SSE primitive scope split (Phase 39 keyframes / Phase 40 hook+components)
- `.planning/phases/39-design-token-foundation/39-LEARNINGS.md` — sed playbook for className sweep, ESLint regex modifier-prefix handling, TDD triplet commit pattern, env-gated Playwright spec deferral pattern
- `.planning/phases/39-design-token-foundation/39-RESEARCH.md` §Q1 (Tailwind v4 `@theme` namespacing), §Q3 (sed vs jscodeshift recommendation)
- `frontend/app/globals.css` — current `@theme` block (Phase 39 published `--motion-fast/base/slow`, `--ease-claude-out`, SSE keyframes; Phase 40 adds `@utility transition-claude-*`)

### v2.0 Foundation (preserve, do not regress)
- `.planning/phases/01-design-system-foundation/01-CONTEXT.md` — Phase 1 boundary, prototype-fidelity rule
- `.planning/phases/01-design-system-foundation/01-UI-SPEC.md` — exhaustive design contract; "Color", "Typography", "Transitions & Animations" sections relevant to verifying SHARED-01 visual equivalence
- `prototype/DESIGN_SYSTEM.md` — current Sidebar (§4), Header (§5), Right Panel (§6), Animation Classes (§7); Phase 40 must preserve these visual contracts while migrating internals
- `frontend/components/layout/Sidebar.tsx` — current width-transition implementation; target file for SHARED-03 two-layer rewrite
- `frontend/components/shared/AiChatBubble.tsx` — current 44-line bubble component; target file for SHARED-02 deletion

### Backlog & Seeds
- `.planning/seeds/SEED-40-motion-utility-dry-refactor.md` — folded into SHARED-01 (D-40-03); seed flips `dormant` → `closed` after this phase ships
- `.planning/seeds/SEED-39-playwright-baselines.md` — visual regression baseline pattern; SHARED-03 60fps Intel Mac verification follows the same env-gated stub approach

### External References (context only, not implementation spec)
- `https://www.assistant-ui.com/examples/claude` — SHARED-02 no-bubble flowing reply pattern reference (assistant left-flow, user right-bubble, inline trailing cursor)
- `~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/brand-guidelines/SKILL.md` — color SSOT (already consumed in Phase 39, Phase 40 is downstream)
- Tailwind v4 docs — `@utility` directive (https://tailwindcss.com/docs/adding-custom-styles#adding-custom-utilities)
- class-variance-authority docs (https://cva.style/docs) — cva API for D-40-02

### Hard Constraint Files (untouched by Phase 40)
- `frontend/components/design-system/RoughCard.tsx` — Rough.js hand-drawn card primitive; Phase 40 does NOT modify
- `frontend/components/design-system/RoughNotationWrapper.tsx` — Rough Notation highlights; Phase 40 does NOT modify
- `frontend/components/design-system/HeroDoodles.tsx` — paper-texture-adjacent decoration; Phase 40 does NOT modify
- 10 page route files in `frontend/app/[locale]/**` — main visual layout; Phase 40 only touches className strings via the SHARED-01 sweep, not structural JSX

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`class-variance-authority` ecosystem** — Lightweight (~1.5kb), no peer-dep cascade, mature TypeScript types. Drop-in for cva-style variants on Button + Input.
- **Phase 39 `@theme` block in `globals.css`** — Already publishes 12+ color tokens, spacing scale, motion tokens, SSE keyframes. Phase 40 adds `@utility transition-claude-*` blocks here; consumes everything else verbatim.
- **`shared/AnimatedEntry.tsx`** — Existing slide-up wrapper using v2.0 ease tokens. SHARED-01 callers may incidentally use this; not in this phase's modification surface.
- **`design-system/ClientOnly.tsx`** — Hydration-safe wrapper. SHARED-02 `StreamingAssistant` may need ClientOnly wrapping if SSE state initializes during SSR.
- **Phase 39 ESLint `no-restricted-syntax` rule in `eslint.config.mjs`** — Already blocks raw `transition-(all|colors) duration-N` patterns with modifier-prefix support. Phase 40 extends to also block (a) verbose tokenized form (encourage SEED-40 shorthand), (b) `var(--ease)` / `var(--ease-fast)` (legacy alias deprecation).

### Established Patterns

- **TDD triplet commits per plan** (Phase 39 LEARNINGS) — RED test commit → GREEN impl commit → docs commit. Phase 40 plans inherit this. Visual regression specs are env-gated stubs (Playwright `shouldRunPerfSuite` helper).
- **Tailwind v4 CSS-first config** — All design system tokens live in `globals.css` `@theme`. No JS config exists. Phase 40 follows this pattern; new `@utility` blocks live alongside `@theme`.
- **`next/font` Variable Font integration** — Source Serif 4 + Inter loaded via `next/font/google`. SHARED-02 `StreamingAssistant` consumes `text-body` + Source Serif 4 via existing utility classes; no font-loading changes.
- **Native `<dialog>` for modals** — `DangerZoneSection`, `ExternalLinkDialog` use native `<dialog>` for built-in focus trap and Escape handling. Phase 40 keeps this pattern; does not abstract to `Modal` primitive.
- **i18n via next-intl with `[locale]` route prefix** — Phase 40 component primitives accept i18n strings as props from callers; no direct `useTranslations()` inside Button/Input.
- **`cn` utility from `lib/utils/cn.ts`** — Standard className merging helper. cva variants compose with `cn()` at caller site for additional className overrides.

### Integration Points

- **`frontend/components/ui/`** — NEW directory created by SHARED-01 plan-1. Houses `Button.tsx` and `Input.tsx`.
- **`frontend/hooks/`** — Existing directory. SHARED-02 plan-2 adds `useStreamingText.ts`.
- **`frontend/components/shared/`** — Existing directory. SHARED-02 plan-2 deletes `AiChatBubble.tsx` and adds `StreamingAssistant.tsx` + `UserMessage.tsx`.
- **`frontend/components/layout/Sidebar.tsx`** — Target of SHARED-03 plan-3 two-layer refactor; also incidentally swept by SHARED-01 plan-1 for verbose-form className → shorthand.
- **`frontend/components/deadlines/DeadlineAiChat.tsx`** — SHARED-02 caller; switches from AiChatBubble to StreamingAssistant + UserMessage.
- **`frontend/components/course-detail/AiCourseChat.tsx`** — SHARED-02 caller; same migration as DeadlineAiChat.
- **`frontend/components/predict/*`** — Possible SHARED-02 caller (Predict's AI summary surface); planner verifies via grep `AiChatBubble` import map.
- **`frontend/components/digest/*`** — Possible SHARED-02 caller per ROADMAP wording ("Digest, Deadlines, Predict"); planner verifies actual imports.
- **`frontend/eslint.config.mjs`** — Phase 40 plan-1 extends `no-restricted-syntax` rule to block (a) verbose tokenized transition form, (b) `var(--ease)` / `var(--ease-fast)` legacy patterns.
- **277 raw `<button>` / `<input>` JSX usages across `frontend/components/`** — SHARED-01 plan-1 migration surface. ~5 distinct Button styles + ~2 distinct Input styles dominate. cva variant taxonomy in D-40-02 should cover ≥90% with `Other`-style edges sweeping into `iconOnly` size or per-caller className overrides.
- **56 verbose-form `transition-*` occurrences across 36 files** — SHARED-01 plan-1 secondary sweep target (SEED-40 closure).
- **Phase 41 A11Y-01..05** — Downstream consumer of Phase 40 primitives. Button/Input focus-visible ring established in D-40-02 lays groundwork; Phase 41 audits and tightens.
- **Phase 42 NEWVIS-01..04** — Downstream consumer; TokenStep / SuccessStep / AI Chat fragments use Button + Input primitives + StreamingAssistant pattern.

</code_context>

<specifics>
## Specific Ideas

- The "additive consumption, not redefinition" framing came from Phase 39's `--motion-fast/base/slow` already being published — Phase 40 explicitly does NOT introduce new tokens; every D-40-* decision either consumes Phase 39 tokens, extends ESLint rules over Phase 39 rules, or creates abstractions that bind Phase 39 tokens to higher-level utilities (cva variants, `@utility` shorthands).
- The user/assistant visual asymmetry in D-40-05 (user keeps bubble, assistant goes flowing) is deliberate — assistant-ui Claude Clone reference establishes that AI replies as continuous narrative read more naturally without container framing, while user messages benefit from delineation. Replicating that asymmetry rather than removing both bubbles preserves conversational legibility.
- D-40-08's outer-stable-inner-translating geometry was actively defended over single-layer alternatives — main content position must NOT shift when sidebar expands (any layout reflow in main content reproduces the original Intel Mac stall). The two-layer DOM is the only architecture that keeps main content at exactly `padding-left: 68px` from page load through hover-expand-collapse.
- D-40-04's ESLint-gate-no-sweep deprecation choice for `--ease`/`--ease-fast` deliberately mirrors Phase 39's own conservative D-14 — the project pattern is "lock new debt at the rule layer, retire old debt opportunistically when phases touch the file anyway".
- D-40-03's SEED-40 fold-in is opportunistic — the seed itself flagged Phase 40 SHARED-01 as the natural trigger ("Phase 40 SHARED-01 (shared component polish) kickoff — natural place to introduce @utility helpers alongside other shared abstractions"). Acting on it now is alignment with the seed's own trigger.
- D-40-13's "no Radix" stance is principled — abstraction debt for primitives we are NOT extracting (Modal, Tooltip) should not bleed into the bundle. cva alone handles the Button/Input variant binding; Radix's value is in Modal/Tooltip primitives we're explicitly punting.

</specifics>

<deferred>
## Deferred Ideas

- **Modal / Tooltip primitive extraction** — Modal has only 2 callers (DangerZoneSection, ExternalLinkDialog) using native `<dialog>` which already provides focus trap + Escape handling; Tooltip has no existing implementation. Defer to Phase 42 NEWVIS or a future v3.x milestone if a third caller emerges with shared styling needs.
- **Card-section sub-primitive** (e.g., CardHeader, CardBody, CardFooter inside RoughCard) — not extracted; current per-page card composition is minor variation around RoughCard. Defer to v3.1 if pattern stabilizes.
- **shadcn CLI ecosystem adoption** — explicitly rejected for Phase 40 (D-40-13). Could revisit in v4.0+ if mobile/PWA migration introduces React Native Web complexity that benefits from shadcn's primitive coverage.
- **`useStreamingText` migration to React Server Components / Suspense** — Phase 40 implements as client hook with SSE consumption; RSC streaming patterns (`use server` + Suspense boundaries) are a v4.x consideration, not in scope.
- **Sidebar keyboard navigation (`Esc` to collapse, focus management on hover-expand)** — Deferred to Phase 41 A11Y-04 (keyboard navigation pass). SHARED-03 only owns the structural transform refactor.
- **`prefers-reduced-motion` instant-toggle for Sidebar** — Deferred to Phase 41 A11Y-05 per D-40-10. Phase 41 owns the global a11y pass for transitions across all components.
- **Visual regression Playwright baseline generation** — Phase 39 SEED-39 pattern carries forward: spec authored in-tree but env-gated; baseline generation deferred to production visual UAT. SHARED-03 60fps Intel Mac verification specifically needs to be checked on user's primary device — will manifest as a HUMAN-UAT checkpoint after deploy, not a CI gate.
- **shadcn/theme/claude direct theme adoption** — Phase 39 confirmed UniBoard's hex palette doesn't 1:1 match shadcn theme (culori-derived oklch values differ from shadcn's published values). Phase 40 honors this; primitive variants reference UniBoard's own oklch tokens, not shadcn's.
- **TypeScript-typed token module (`tokens.ts`)** — Considered in Phase 39 (deferred); no JS code path in Phase 40 needs typed token access. Continue deferring to v4.0+.

</deferred>

---

*Phase: 40-shared-component-polish*
*Context gathered: 2026-04-30*
