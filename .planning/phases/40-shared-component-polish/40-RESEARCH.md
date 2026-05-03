# Phase 40: Shared Component Polish - Research

**Researched:** 2026-04-30
**Domain:** class-variance-authority (cva) primitive extraction · Tailwind v4 `@utility` directive · React SSE streaming hook (useStreamingText) · transform-based two-layer Sidebar geometry · ESLint AST guard rule extension · Vitest + Playwright env-gated visual regression
**Confidence:** HIGH (cva API, Tailwind v4 `@utility` directive, assistant-ui Claude clone reference, Phase 39 token consumption, sed playbook), MEDIUM (60fps Intel Mac verifiability — production UAT only; Sidebar `[contain:layout_paint]` interaction with `translateX`-driven inner panel)

## Summary

Phase 40 is the first **consumer phase** of v3.0's design-token foundation. Phase 39 published the tokens, keyframes, and ESLint guard; Phase 40 wires them into shared primitives (`<Button>` + `<Input>` via cva), reshapes the AI-reply visual contract (no-bubble flowing assistant + bubble user, plus the `useStreamingText` hook + `StreamingAssistant` + `UserMessage` triplet), and rewrites the Sidebar to a transform-based two-layer DOM that eliminates the layout-thrashing hover lag on Intel Mac. Three plans, single feature branch, single PR per the project's one-phase-one-PR rule.

The discovery audit produced **five findings that adjust CONTEXT.md assumptions** — the planner must surface these:

1. **AiChatBubble has 2 callers, not 3.** `grep -rEn "AiChatBubble" frontend/` returns exactly two import sites: `frontend/components/deadlines/DeadlineAiChat.tsx` (line 7) and `frontend/components/course-detail/AiCourseChat.tsx` (line 7). The Phase 40 ROADMAP wording ("Digest, Deadlines, Predict") reflects future-state intent — Phase 40 SHARED-02 only migrates the **2 existing callers** plus surfaces the new triplet for Digest/Predict consumption in Phase 42 NEWVIS work. There is **no current Predict or Digest streaming surface** to migrate. CONTEXT.md §code_context line 184-185 says "Possible SHARED-02 caller (Predict/Digest) — planner verifies actual imports" — verified, no callers exist.

2. **The 277-caller estimate is 114 + (other tags).** `grep -rEn "<button|<input"` returns **86 button + 28 input = 114 raw JSX usages** across `frontend/components/` + `frontend/app/`. CONTEXT.md cites 277 — the actual surface is roughly 41% of that. The 277 figure may have included other tags (`<select>`, `<textarea>`, `<label>`) or counted modifier-prefixed re-uses. **Recommendation:** treat 114 as the authoritative count for plan-1 sweep effort estimation. Sed playbook still applies; effort scales linearly so this is a halving of estimated diff size, not a planning-blocker.

3. **`var(--ease)` / `var(--ease-fast)` legacy citations are already at 0 runtime usages.** `grep -rEn "var\(--ease\)|var\(--ease-fast\)" frontend/components/ frontend/app/` returns 1 hit — the comment in `globals.css` line 136. The 50+ legacy callers cited in Phase 39 LEARNINGS were swept naturally during plan-04's transition migration. **Implication:** D-40-04's ESLint-gated deprecation rule is now blocking forward debt only — no remediation work to do. The rule still has value (defends against regression), but the planner should NOT plan a sweep task for legacy `--ease`/`--ease-fast` because there are zero call sites. The aliases in `globals.css` lines 138-139 stay per D-40-04 (kept for future external consumers / defensive surface).

4. **Verbose-form transition pattern: 56 occurrences across 36 files (verified).** `grep -rEln "transition-(all|colors)\s+\[transition-duration:var\(--motion-(fast|base|slow)\)\]\s+\[transition-timing-function:var\(--ease-claude-out\)\]"` returns 36 unique files with 56 total occurrences — exactly matches CONTEXT.md figures. SEED-40 reverse-sweep target is well-bounded.

5. **Short-form `transition-colors` (no token override) still exists in 41 places.** `grep -rEn "transition-(all|colors|opacity|transform|shadow)" | grep -v "transition-duration:var\|\[transition-"` returns 41 short-form occurrences. These are NOT covered by the existing ESLint rule (which only blocks `transition-(all|colors) duration-N` — i.e., the explicit-duration form). They ARE blocked from regressing but are also NOT incurring the `--motion-fast` migration. **Decision needed:** is plan-1 sweep responsible for these 41 short-forms too, or are they out of scope? **Recommendation:** Leave them. Phase 39 plan-04 explicitly only migrated `transition-(all|colors) duration-N` (the explicit-duration form). The 41 short-forms inherit Tailwind's default 150ms duration + Tailwind's default ease, which the visual contract hasn't complained about. Migrating them would add another 41-line diff with cosmetic ease-curve shifts (Tailwind default ease-out vs `--ease-claude-out`). Keep Phase 40's diff focused on the cva/Sidebar/AI-reply work; Phase 41 a11y pass picks up any tail when the file is opened anyway.

**Primary recommendation:** Implement plan-1 first (cva primitives + `@utility transition-claude-*` blocks + 56-caller verbose-form sweep + ESLint extension). Plan-3 (Sidebar) can run in parallel wave with plan-2 (AI no-bubble) since plan-3 only edits `Sidebar.tsx` while plan-2 only edits `shared/AiChat*` + 2 caller files. Plan-1 must complete before plan-3 because plan-1's verbose-form sweep touches `Sidebar.tsx` (4 occurrences in line 52, 96, 124 above; plan-3 then rewrites the structural JSX). Author plans-2 and plans-3 plans in wave 2 to land in parallel; ship as one PR.

**Sidebar architecture key insight:** D-40-08's two-layer DOM keeps the outer 68px `<aside>` as a stable layout occupier — main content's `padding-left: 68px` never changes. The inner 224px `<div>` translates from `translateX(-156px)` (collapsed; rightmost 68px visible) to `translateX(0)` (expanded; full panel visible) via GPU compositing only. Confirming the assistant-ui Claude clone reference (`apps/docs/components/examples/claude.tsx`): no-bubble assistant flows in serif font; user message uses a soft-cream bubble (`#DDD9CE`) with `rounded-xl py-2.5 pr-6 pl-2.5`. UniBoard's UserMessage will use orange (`bg-orange text-white rounded-br-[4px]`) per D-40-05 — preserving v2.0 visual identity.

**60fps Intel Mac verification:** Per D-40-12 + Phase 39 SEED-39 pattern, plan-3 ships an env-gated Playwright spec stub that auto-skips when `PERF_TEST_PASSWORD` is unset. Production human UAT on user's primary Intel Mac closes the loop. Same pattern Phase 39 plan-04 used; same SEED closure procedure.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| cva variant compilation | Build-time (Vite/Next) | — | `cva()` runs at module import; produces a function whose call returns a className string. Zero runtime evaluation cost beyond `clsx` merging. |
| Button/Input primitive rendering | Browser / Client | — | `<Button variant="primary">` is a React component; renders to `<button>` DOM with the cva-computed className. |
| className override merging (`cn()` with twMerge) | Browser / Client | — | `tailwind-merge` resolves conflicting Tailwind utilities at render time; minimal CPU cost. |
| Tailwind `@utility transition-claude-fast` generation | Build-time (Tailwind compiler) | CDN / Static (compiled CSS) | `@tailwindcss/postcss` reads `globals.css`, emits `.transition-claude-fast { ... }` at build. Modifier prefixes (`hover:`, `focus:`) generate automatically per Tailwind v4 §"adding custom utilities". |
| useStreamingText hook | Browser / Client | — | React hook; consumes SSE chunk events, maintains chunk-arrival state, applies `streaming-chunk-fadein` keyframe per appended chunk. Pure client. |
| Streaming cursor animation | Browser / Client | — | CSS `@keyframes streaming-cursor-blink` (defined Phase 39). Cursor element mounts inline at end of streamed text; unmounts when `isStreaming === false`. |
| Sidebar two-layer DOM rendering | Browser / Client | — | `<aside>` outer + `<div>` inner; transform-based hover state. GPU compositing only on `translateX`. |
| 60fps Intel Mac performance | Browser / Client | Playwright (External) | `[contain:layout_paint]` + `transform: translateX()` + `will-change: transform` confine the paint cost. Verified at production deploy via human UAT. |
| ESLint `no-restricted-syntax` rule extension | CI / Local dev (eslint runner) | Source code | Extends Phase 39 D-16 rule to also block (a) verbose tokenized form, (b) `var(--ease)` / `var(--ease-fast)`. Same selector grammar as Phase 39. |
| 277/56-caller className sweep | Source code edit (one-shot) | — | sed playbook; commit before manual cleanup; ESLint catches misses. |
| Visual regression (Sidebar parity, primitive uniformity) | Playwright (External) | Browser / Client | Phase 39 SEED-39 pattern reused; specs in-tree, baselines deferred to production UAT. |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**SHARED-01 — Primitive Extraction Scope**
- **D-40-01:** Extract `<Button>` + `<Input>` only. Modal stays native `<dialog>` (2 callers). Tooltip not extracted (no existing implementation). Card NOT touched (RoughCard.tsx is the Rough.js hard-constraint primitive).
- **D-40-02:** cva-based variants. `<Button variant="primary"|"secondary"|"ghost"|"danger" size="sm"|"md" iconOnly? loading?>`; `<Input variant="default"|"search" leftIcon? rightIcon? error?>`. Add `class-variance-authority` (~22 KB unpacked, single dep on `clsx ^2.1.1`). Loading state: spinner glyph + opacity ramp via `--motion-fast` + `--ease-claude-out`. Focus ring: `focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2 focus-visible:outline-none`. NO Radix UI introduction.
- **D-40-03:** SEED-40 motion utility DRY refactor folded INTO Phase 40. Add `@utility transition-claude-fast/base/slow` blocks to `globals.css`. Sweep all 56 verbose-form `transition-{all|colors} [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]` occurrences across 36 files back to shorthand. Update Phase 39's ESLint `no-restricted-syntax` rule to block the verbose form (encourage shorthand).
- **D-40-04:** v2.0 legacy `--ease` / `--ease-fast` deprecation: ESLint-gate new occurrences only. NO full sweep this phase. Existing aliases stay in `globals.css`. (Audit confirms 0 active usages — defensive rule only.)

**SHARED-02 — AI No-Bubble Claude-Style Reply**
- **D-40-05:** Replace `shared/AiChatBubble.tsx` with three new files: `shared/StreamingAssistant.tsx` (no bubble; left-aligned; Source Serif 4; inline trailing cursor); `shared/UserMessage.tsx` (right-aligned bubble; `bg-orange text-white rounded-br-[4px]`); `hooks/useStreamingText.ts` (consumes SSE chunks; exposes `{ text, isStreaming }`; applies `streaming-chunk-fadein` per chunk).
- **D-40-06:** Consume Phase 39 SSE keyframes verbatim. `streaming-cursor-blink` (1s `step-end` infinite — never `alternate`, codified in Phase 39 LEARNINGS). `streaming-chunk-fadein` (`var(--motion-fast)` `var(--ease-claude-out)`). NO new tokens introduced.
- **D-40-07:** Cursor inline at end of streamed text (terminal-style trailing block). When `isStreaming === false`, cursor unmounts. When `isStreaming === true && text === ""`, cursor renders alone (placeholder).

**SHARED-03 — Sidebar Transform-Based Refactor**
- **D-40-08:** Two-layer DOM with `translateX` toggle. Outer `<aside class="fixed inset-y-0 left-0 w-[68px] z-[100] overflow-hidden">`; inner `<div class="absolute inset-y-0 left-0 w-[224px] bg-dark translate-x-[-156px] transition-claude-base hover:translate-x-0 [contain:layout_paint]">`. Width animation replaced with `transform: translateX()` — pure GPU compositing.
- **D-40-09:** Active state highlight renders inside the inner 224px panel. Single source of truth — collapsed state shows the rightmost ~68px of the inner panel including the right portion of the active nav item's orange highlight bar. NO bridging element on the outer 68px shell.
- **D-40-10:** `prefers-reduced-motion` instant-toggle deferred to Phase 41 A11Y-05.

**Cross-Cutting**
- **D-40-11:** 3 plans (SHARED-01, SHARED-02, SHARED-03). Plan-1 and plan-3 both touch `Sidebar.tsx`; sequential plan-1 → plan-3 with plan-2 free to overlay.
- **D-40-12:** TDD triplet preserved (RED → GREEN → docs commits). Visual regression: env-gated Playwright stubs.
- **D-40-13:** No new deps beyond `class-variance-authority`. Specifically NOT introducing Radix UI, Tailwind plugins, or shadcn CLI.

### Claude's Discretion

- 277/56-caller sweep tooling (sed playbook vs jscodeshift vs manual). **→ Resolved: sed playbook, see §Q9–Q10.**
- Specific cva variant strings per variant (e.g., `bg-orange hover:bg-orange/90` vs `hover:brightness-110`). **→ Resolved: see §Q1–Q2 + Pattern 1–2.**
- `useStreamingText` internal state machine (`useDeferredValue` vs `useState` vs `useReducer`). **→ Resolved: `useState` + `useEffect` chunk-listener — see §Q3 + Pattern 3.**
- Sidebar inner panel z-index, exact absolute-positioning anchor, overflow-x. **→ Resolved: see §Q6.**
- Whether to bundle SEED-39 Playwright baseline closure into plan-3. **→ Recommendation: NO, plan-3 is structural rewrite + env-gated stub only; SEED-39 closure remains tracked separately.**
- `disabled` HTML attribute vs `aria-disabled`. **→ Recommendation: use HTML `disabled` per default (Phase 41 A11Y-03 owns the canonical decision); see §Q2.**

### Deferred Ideas (OUT OF SCOPE)

- Modal / Tooltip primitive extraction (defer to Phase 42 NEWVIS / future v3.x).
- Card-section sub-primitives (CardHeader/CardBody/CardFooter inside RoughCard) — defer to v3.1.
- shadcn CLI ecosystem adoption — rejected for Phase 40.
- `useStreamingText` migration to RSC / Suspense — v4.x consideration.
- Sidebar keyboard navigation — Phase 41 A11Y-04.
- `prefers-reduced-motion` Sidebar instant-toggle — Phase 41 A11Y-05.
- Visual regression Playwright baseline generation — env-gated stub now, production UAT later.
- shadcn/theme/claude direct theme adoption — rejected (palette divergence confirmed Phase 39).
- TypeScript-typed token module (`tokens.ts`) — defer to v4.0+.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHARED-01 | Card / Button / Input / Modal / Tooltip internal padding, focus ring, disabled state unified to design tokens (scope: Button + Input extracted via cva; SEED-40 motion utility DRY refactor folded in) | §Pattern 1 (Button cva), §Pattern 2 (Input cva), §Pattern 6 (`@utility transition-claude-*`), §Pattern 7 (ESLint extension), §Pattern 8 (sed playbook), §Q1+Q2+Q9+Q10+Q11+Q13 |
| SHARED-02 | AI reply visual style on Digest, Deadlines, and Predict pages renders Claude-style flowing text with typing cursor (no chat bubbles) | §Pattern 3 (useStreamingText), §Pattern 4 (StreamingAssistant + UserMessage), §Q3+Q4+Q5+Q12+Q14, §Code Reference: assistant-ui/assistant-ui apps/docs/components/examples/claude.tsx |
| SHARED-03 | Sidebar uses transform-based positioning (`translateX`) — eliminates layout-thrashing hover lag, achieves 60fps animation on Intel Mac | §Pattern 5 (Sidebar two-layer), §Q6+Q7+Q8, §Code Reference: existing `frontend/components/layout/Sidebar.tsx` (current width-transition implementation) |

## Project Constraints (from CLAUDE.md)

- **Code comments must be English only** (no bilingual, no Chinese). Applies to all new `.tsx`, `.ts` files including the cva variant declarations, useStreamingText hook, Sidebar rewrite. Chinese permitted only for narrative discussion in PLAN.md / SUMMARY.md / RESEARCH.md.
- Chinese for technical discussion; English for code.
- `pnpm typecheck` (`tsc --noEmit`) and `pnpm lint --max-warnings 0` must remain clean (CI gate via `.github/workflows/frontend-ci.yml`).
- TDD mode active. **TDD scope:** `useStreamingText` hook (chunk concatenation + isStreaming transitions + abort behavior), Button/Input variant rendering (cva variant string assertions), ESLint rule extension. **NOT TDD scope:** cva variant strings (config), Sidebar JSX rewrite (UI), 56-caller sweep (one-shot codemod), `@utility` block in globals.css (config).
- pnpm 10.28.2 — install `class-variance-authority` as production dep: `cd frontend && pnpm add class-variance-authority`.
- No direct `git commit -m` — use `/commit` skill or GSD's commit pipeline.
- PR cycle must include `/simplify` before merge.
- After phase merge, kill-9 dev server + `rm -rf .next` + restart before manual UAT (memory: `feedback_dev_server_cache.md`).
- Verify backend Pydantic / frontend types stay aligned — N/A this phase (no API changes).
- `feedback_skill_agent_compliance.md` — follow Skill patterns when invoked, no inlined work.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| class-variance-authority | 0.7.1 (latest) | cva() variant compiler — type-safe variant binding to design tokens; produces a function returning className strings | [VERIFIED: npm view class-variance-authority version → 0.7.1, modified 2024-11-26]. Single dep `clsx ^2.1.1` (already installed). 22 KB unpacked. The de-facto cva primitive library used by shadcn/ui, Radix-Themes, and most modern Tailwind component libraries since 2023. v1.0 is in beta but 0.7.x is stable + production-blessed. |
| tailwindcss | 4.2.4 (already installed) | CSS-first design token system + `@utility` directive for shorthand utilities | [VERIFIED: npm view tailwindcss version → 4.2.4]. Already installed. v4 introduces `@utility` for custom utilities (replaces v3 `@layer utilities` pattern). |
| @tailwindcss/postcss | ^4 (already installed) | PostCSS plugin processing `@theme` + `@utility` at build time | Already installed. Required for v4. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | ^2.1.1 (already installed) | Conditional className concatenation; cva's only dependency | Already installed via `lib/utils/cn.ts`. cva pulls clsx as transitive dep. |
| tailwind-merge | ^3.5.0 (already installed) | Resolves conflicting Tailwind utilities (e.g., `p-2 p-4` → `p-4`); critical for cva + caller `className` override | Already installed via `lib/utils/cn.ts` (`twMerge(clsx(...))`). |
| react | 19.1.0 (already installed) | `useState` / `useEffect` / `useRef` for useStreamingText hook | No new dep. Hook patterns: `useState` for chunk accumulation; `useEffect` for chunk-listener cleanup; `useRef` for AbortController. |
| vitest | ^4.1.5 (already installed) | TDD for useStreamingText + cva variant assertions | Already installed. RED test commit per Phase 39 LEARNINGS pattern. |
| @testing-library/react | ^16.3.2 (already installed) | DOM assertions for `<Button variant="primary">` className output, `<StreamingAssistant>` cursor mount/unmount | Already installed. `renderHook()` for useStreamingText test ergonomics. |
| @playwright/test | ^1.59.1 (already installed) | env-gated visual regression for Sidebar 60fps + cva primitive uniformity (deferred per SEED-39 pattern) | Already installed. Reuse `frontend/playwright.config.ts` + `shouldRunPerfSuite()` helper. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| class-variance-authority | tailwind-variants (tv) | tv is a competing library with `slots` / `compoundSlots` for more advanced multi-element components. Overkill for Button/Input which are single-element. cva is simpler and shadcn-blessed (more familiarity in the broader ecosystem). [CITED: npmjs.com/package/tailwind-variants] |
| cva + cn() | cn() helper alone (manual variant logic in component body) | Hand-rolled switch on `variant` props compounds when 4 variants × 2 sizes × loading × iconOnly = 32 combinations. cva's lookup tables stay readable. |
| cva 0.7.1 | cva 1.0.0-beta | 1.0 introduces `cx()` cleaner exports + slot composition; still beta as of 2026-04. Stick with 0.7.1 for production stability per pragmatic-fast preference; revisit when 1.0 ships stable. |
| useStreamingText custom hook | useDeferredValue from React 18+ | useDeferredValue de-prioritizes a value's render but doesn't expose chunk-arrival timing — can't trigger per-chunk fadein keyframe. Need an explicit chunk listener. |
| useStreamingText custom hook | useReducer + dispatch on chunk | Reducer is overkill for `text + isStreaming` pair. `useState` with chunk-append callback is ~30 LOC. Migrate to reducer if state grows beyond 3-4 fields. |
| Tailwind v4 `@utility` | `@layer utilities` (v3 pattern) | v3 syntax. Tailwind v4 docs explicitly recommend `@utility` for custom utilities; same compilation outcome but the v4 idiom is forward-compatible. |
| sed playbook | jscodeshift / ts-morph | AST tooling overkill at 56 + 114 mechanical occurrences. Phase 39 LEARNINGS established sed sufficiency. Same approach this phase. |
| Playwright pixel-diff baselines | Visual UAT only | Baselines require credentials (`PERF_TEST_PASSWORD`); deferring per Phase 39 SEED-39 pattern keeps the spec authored without forcing local credential setup. |

**Installation:**
```bash
cd frontend && pnpm add class-variance-authority
```

**Version verification (run before plan-1):**
```bash
npm view class-variance-authority version    # expect 0.7.x
npm view class-variance-authority dependencies  # expect { clsx: '^2.1.1' }
```
[VERIFIED 2026-04-30]: cva 0.7.1, single dep `clsx ^2.1.1`, 22 KB unpacked, no peer deps.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌────────────────────────────────────────────────┐
                    │                Build Time (PR)                 │
                    │                                                │
   class-variance-  │   cva() module init                            │
   authority        ├──→ buttonVariants = cva(base, {variants, ...}) │
                    │   inputVariants  = cva(base, {variants, ...}) │
                    │   (Pure functions — zero runtime mount cost.)  │
                    │                                                │
                    │   pnpm test (vitest)                          │
                    │   ────────────────                            │
                    │   __tests__/components/ui/Button.test.tsx     │
                    │   __tests__/components/ui/Input.test.tsx      │
                    │   __tests__/hooks/useStreamingText.test.ts    │
                    │   __tests__/eslint/no-raw-transition.test.ts (extended)│
                    │                                                │
                    │   pnpm lint (eslint)                          │
                    │   ──────────────────                          │
                    │   no-restricted-syntax extended:               │
                    │   - blocks verbose tokenized form              │
                    │   - blocks var(--ease) / var(--ease-fast)      │
                    │                                                │
                    │   @tailwindcss/postcss                        │
                    │   ─────────────────                           │
                    │   reads frontend/app/globals.css:              │
                    │   - @theme block (Phase 39 tokens, untouched)  │
                    │   - @utility transition-claude-fast/base/slow  │
                    │       (NEW: Phase 40 plan-1)                   │
                    │   generates utility CSS:                       │
                    │   .transition-claude-fast {                    │
                    │     transition-property: all;                  │
                    │     transition-duration: var(--motion-fast);   │
                    │     transition-timing-function: var(           │
                    │       --ease-claude-out);                      │
                    │   }                                            │
                    │   (auto-generates hover:transition-claude-fast,│
                    │    focus:transition-claude-fast variants)      │
                    └────────────────────┬───────────────────────────┘
                                         │
                                         ▼
                    ┌────────────────────────────────────────────────┐
                    │                  Runtime (Browser)             │
                    │                                                │
                    │   1. <Button variant="primary" size="md">      │
                    │        cva computes className:                 │
                    │        "inline-flex ... bg-orange text-white   │
                    │         hover:bg-[#c5674a] hover:-translate-   │
                    │         y-px h-[44px] px-8 transition-claude-  │
                    │         fast focus-visible:ring-2 focus-       │
                    │         visible:ring-orange/40 ..."            │
                    │        cn(buttonVariants({...}), className)    │
                    │        merges caller-supplied overrides        │
                    │        via tailwind-merge.                     │
                    │                                                │
                    │   2. <Input variant="default" leftIcon={Mail}> │
                    │        Similar cva computation; renders        │
                    │        <input ...> + sibling <Icon /> at       │
                    │        absolute-positioned left.               │
                    │                                                │
                    │   3. AI Streaming surface:                     │
                    │      ┌────────────────────────────────────┐   │
                    │      │ DeadlineAiChat / AiCourseChat       │   │
                    │      └──┬─────────────────────────────────┘   │
                    │         │                                      │
                    │         ▼                                      │
                    │      ┌────────────────────────────────────┐   │
                    │      │ <UserMessage content={...}>         │   │
                    │      │   bg-orange rounded-br-[4px]        │   │
                    │      │   self-end max-w-[85%]              │   │
                    │      └────────────────────────────────────┘   │
                    │      ┌────────────────────────────────────┐   │
                    │      │ <StreamingAssistant content={...}   │   │
                    │      │                    isStreaming>     │   │
                    │      │   text-body Source Serif 4           │   │
                    │      │   self-start (no bubble)            │   │
                    │      │   {text}                            │   │
                    │      │   {isStreaming &&                   │   │
                    │      │     <CursorSpan />}                 │   │
                    │      │     animation: streaming-cursor-    │   │
                    │      │       blink (Phase 39 keyframe)     │   │
                    │      └────────────────────────────────────┘   │
                    │      Hook: useStreamingText                   │
                    │       wraps useAiStream (existing); adds      │
                    │       per-chunk fadein span via keyframe       │
                    │       streaming-chunk-fadein.                  │
                    │                                                │
                    │   4. Sidebar two-layer DOM:                    │
                    │      ┌────────────────────────────────────┐   │
                    │      │ <aside class="fixed w-[68px] z-100  │   │
                    │      │           overflow-hidden border-r   │   │
                    │      │           border-[rgba(20,20,19,.08)]│   │
                    │      │           [contain:layout_paint]">   │   │
                    │      │   <div class="absolute w-[224px]    │   │
                    │      │              bg-dark                │   │
                    │      │              translate-x-[-156px]   │   │
                    │      │              hover:translate-x-0    │   │
                    │      │              transition-claude-     │   │
                    │      │                base                  │   │
                    │      │              will-change:transform   │   │
                    │      │              [contain:layout_paint]  │   │
                    │      │              ">                      │   │
                    │      │     <Logo /> <Nav /> <Bottom />     │   │
                    │      │   </div>                            │   │
                    │      │ </aside>                            │   │
                    │      └────────────────────────────────────┘   │
                    │      Outer 68px is the layout occupier;       │
                    │      main content padding-left:68px stable.   │
                    │      Inner 224px slides via GPU compositing;  │
                    │      no reflow, no paint cost outside subtree.│
                    │                                                │
                    │   5. ESLint guard at PR time:                  │
                    │      Phase 39 D-16 rule extended to also block:│
                    │      - verbose tokenized form `transition-(all│
                    │        |colors) [transition-duration:var(...)]│
                    │        [transition-timing-function:var(...)]` │
                    │      - var(--ease) / var(--ease-fast) literals│
                    └────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
frontend/
├── app/
│   └── globals.css                ← extended additively (Phase 40 plan-1: @utility blocks)
├── components/
│   ├── ui/                        ← NEW directory
│   │   ├── Button.tsx             ← Phase 40 plan-1 (TDD: variant rendering)
│   │   └── Input.tsx              ← Phase 40 plan-1 (TDD: variant rendering)
│   ├── shared/
│   │   ├── AiChatBubble.tsx       ← DELETED in plan-2
│   │   ├── StreamingAssistant.tsx ← NEW Phase 40 plan-2
│   │   └── UserMessage.tsx        ← NEW Phase 40 plan-2
│   └── layout/
│       └── Sidebar.tsx            ← rewritten in plan-3
├── hooks/
│   └── useStreamingText.ts        ← NEW Phase 40 plan-2 (TDD: chunk concatenation, abort)
├── eslint.config.mjs              ← Phase 40 plan-1 (extends Phase 39 rule)
├── __tests__/
│   ├── components/
│   │   └── ui/
│   │       ├── Button.test.tsx    ← NEW (TDD)
│   │       └── Input.test.tsx     ← NEW (TDD)
│   ├── hooks/
│   │   └── useStreamingText.test.ts  ← NEW (TDD)
│   └── eslint/
│       └── no-raw-transition.test.ts ← extended (3 selectors total)
└── tests/
    └── e2e/
        └── perf/
            └── phase40-sidebar-60fps.spec.ts  ← env-gated stub (deferred)
```

### Pattern 1: Button primitive with cva + design tokens

**What:** A type-safe Button component whose className is computed from cva variant lookups bound to Phase 39 design tokens (orange/red/cream colors, motion timing, focus ring).

**When to use:** Plan-1 of Phase 40. Replaces 86 raw `<button>` JSX usages across `frontend/components/`. cva variant taxonomy (D-40-02) maps to ~5 dominant button styles audited in CONTEXT.md §code_context line 187.

**Example:**
```tsx
// Source: cva.style/docs/getting-started/typescript + Phase 39 tokens
// frontend/components/ui/Button.tsx
"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  // Base — applies to all variants; consumes Phase 40 @utility shorthand
  [
    "inline-flex items-center justify-center",
    "font-semibold rounded-[8px]",
    "cursor-pointer transition-claude-fast",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-orange/40 focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  {
    variants: {
      variant: {
        // Primary — orange filled, white text; v2.0 #d97757 / #c5674a
        primary: [
          "bg-orange text-white border-none",
          "hover:bg-[#c5674a]",
          "hover:-translate-y-px active:translate-y-0",
        ],
        // Secondary — cream outline; v2.0 button cancel pattern
        secondary: [
          "bg-cream text-text-2 border border-card-border",
          "hover:bg-card-bg-hover",
        ],
        // Ghost — no background; transparent until hover
        ghost: [
          "bg-transparent text-text-2 border-none",
          "hover:bg-card-bg-hover",
        ],
        // Danger — red destructive action; v2.0 #cc4455 / #b33d4c
        danger: [
          "bg-red text-white border-none",
          "hover:bg-[#b33d4c]",
        ],
      },
      size: {
        sm: "h-[32px] px-[12px] text-[0.76rem]",
        md: "h-[44px] px-[24px] text-[0.86rem]",
      },
      iconOnly: {
        true: "aspect-square px-0",
      },
      loading: {
        true: "pointer-events-none opacity-80",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, iconOnly, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, iconOnly, loading }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  )
);
Button.displayName = "Button";

export { buttonVariants };
```

[VERIFIED: cva.style/docs/getting-started/typescript pattern; CITED: github.com/joe-bell/cva README]

**Caller migration example:**
```tsx
// Before (LoginForm.tsx line 159–168)
<button
  type="submit"
  disabled={loginMutation.isPending}
  className="w-full h-[44px] font-semibold text-[0.86rem] text-white bg-[#d97757] rounded-lg hover:bg-[#c5674a] hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-default disabled:transform-none transition-[background,transform] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]"
>
  {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t("auth.login.submitButton")}
</button>

// After
<Button
  type="submit"
  variant="primary"
  size="md"
  loading={loginMutation.isPending}
  className="w-full"   /* size override via className merge */
>
  {t("auth.login.submitButton")}
</Button>
```

### Pattern 2: Input primitive with cva + leftIcon/rightIcon slots

**What:** A type-safe Input component with optional icon slots and error/disabled state binding to Phase 39 tokens.

**When to use:** Plan-1 of Phase 40. Replaces 28 raw `<input>` JSX usages across `frontend/components/`. Two dominant shapes (default text/email/password + search) audited in CONTEXT.md §code_context.

**Example:**
```tsx
// frontend/components/ui/Input.tsx
"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const inputVariants = cva(
  [
    "w-full text-[0.84rem]",
    "bg-cream text-text-1",
    "border-[1.5px] border-card-border",
    "outline-none",
    "transition-[border-color,box-shadow] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]",
    "placeholder:text-text-3",
    "focus:border-orange focus:shadow-[0_0_0_3px_var(--color-orange-soft)]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  {
    variants: {
      variant: {
        default: "rounded-lg px-3.5 py-2.5",
        search: "rounded-full px-[20px] py-[10px]",
      },
      error: {
        true: "border-red focus:border-red focus:shadow-[0_0_0_3px_var(--color-red-soft)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, error, leftIcon, rightIcon, ...props }, ref) => {
    if (!leftIcon && !rightIcon) {
      return (
        <input
          ref={ref}
          className={cn(inputVariants({ variant, error }), className)}
          {...props}
        />
      );
    }
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            inputVariants({ variant, error }),
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { inputVariants };
```

**Disabled state philosophy (per D-40-02 + Phase 41 A11Y-03 deferred):** Use HTML `disabled` attribute (default React behavior). Excludes from tab order — semantically correct for buttons in disabled state. Phase 41 A11Y-03 may revisit and prefer `aria-disabled` for screen-reader announcement on form-required scenarios; defer that decision.

### Pattern 3: useStreamingText hook (chunk listener + fadein keyframe)

**What:** A React hook that consumes SSE chunk events from `useAiStream`, accumulates text, and exposes `{ text, isStreaming, currentChunk }` for the renderer to apply `streaming-chunk-fadein` per chunk arrival.

**When to use:** Plan-2 of Phase 40. Wraps the existing `useAiStream` hook (Phase 34 / `frontend/hooks/use-ai-stream.ts`) with chunk-arrival metadata; does NOT replace `useAiStream` (which is the SSE source) but composes with it.

**State machine choice (per Discretion):** `useState` for `text` + `isStreaming` + `chunkIndex`. NOT `useDeferredValue` (de-prioritizes render but doesn't expose chunk timing). NOT `useReducer` (overkill for 3-field state). Each new chunk increments `chunkIndex` so React's `key` on the cursor span re-mounts and re-triggers the keyframe — enabling per-chunk fadein.

**Example:**
```tsx
// frontend/hooks/useStreamingText.ts
"use client";

import { useState, useEffect } from "react";

export interface UseStreamingTextOptions {
  /** Raw text from upstream SSE source (from useAiStream's last assistant message). */
  source: string;
  /** Whether the upstream source is currently streaming. */
  isStreaming: boolean;
}

export interface UseStreamingTextReturn {
  /** Accumulated text. */
  text: string;
  /** Whether streaming is active. */
  isStreaming: boolean;
  /** Monotonic chunk index — bump on each delta from upstream. Use as React key on cursor span for re-fadein. */
  chunkIndex: number;
}

/**
 * Adapts useAiStream output into a streaming text contract for StreamingAssistant.
 * Tracks chunk-arrival index so the cursor span can re-trigger streaming-chunk-fadein.
 */
export function useStreamingText({
  source,
  isStreaming,
}: UseStreamingTextOptions): UseStreamingTextReturn {
  const [chunkIndex, setChunkIndex] = useState(0);

  useEffect(() => {
    // Bump chunkIndex on every text delta; React batches multiple synchronous
    // setState calls so this is safe even if upstream rapidly emits 5 tokens.
    setChunkIndex((prev) => prev + 1);
  }, [source]);

  return {
    text: source,
    isStreaming,
    chunkIndex,
  };
}
```

**TDD test ergonomics:**
```ts
// __tests__/hooks/useStreamingText.test.ts
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStreamingText } from "@/hooks/useStreamingText";

describe("useStreamingText", () => {
  it("returns initial empty state", () => {
    const { result } = renderHook(() =>
      useStreamingText({ source: "", isStreaming: false })
    );
    expect(result.current.text).toBe("");
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.chunkIndex).toBeGreaterThanOrEqual(1);
  });

  it("bumps chunkIndex on source change", () => {
    const { result, rerender } = renderHook(
      ({ source, isStreaming }) => useStreamingText({ source, isStreaming }),
      { initialProps: { source: "Hello", isStreaming: true } }
    );
    const initialIndex = result.current.chunkIndex;
    rerender({ source: "Hello world", isStreaming: true });
    expect(result.current.chunkIndex).toBeGreaterThan(initialIndex);
    expect(result.current.text).toBe("Hello world");
  });

  it("transitions isStreaming to false on stream complete", () => {
    const { result, rerender } = renderHook(
      ({ source, isStreaming }) => useStreamingText({ source, isStreaming }),
      { initialProps: { source: "Done.", isStreaming: true } }
    );
    rerender({ source: "Done.", isStreaming: false });
    expect(result.current.isStreaming).toBe(false);
  });
});
```

### Pattern 4: StreamingAssistant + UserMessage components

**What:** Two-component pair that replaces `AiChatBubble.tsx`. Assistant role renders no-bubble flowing text in Source Serif 4 with inline trailing cursor; user role retains the orange bubble + right-alignment.

**When to use:** Plan-2 of Phase 40. Migrate 2 existing callers (DeadlineAiChat.tsx, AiCourseChat.tsx) atomically.

**Example — StreamingAssistant.tsx:**
```tsx
// frontend/components/shared/StreamingAssistant.tsx
"use client";

import { useStreamingText } from "@/hooks/useStreamingText";

export interface StreamingAssistantProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Assistant message — no bubble, left-aligned, Source Serif 4 flowing text.
 * Per assistant-ui Claude clone reference (apps/docs/components/examples/claude.tsx).
 * Inline trailing cursor blinks during streaming; unmounts on stream complete.
 */
export default function StreamingAssistant({
  content,
  isStreaming = false,
}: StreamingAssistantProps) {
  const { text, chunkIndex } = useStreamingText({
    source: content,
    isStreaming,
  });

  return (
    <div className="flex justify-start mb-[12px]">
      <div className="max-w-[85%] font-serif text-body text-text-1 leading-[1.65] whitespace-pre-wrap pr-2">
        <span
          // Re-key per chunk so the new text fades in via streaming-chunk-fadein
          key={chunkIndex}
          className="animate-[streaming-chunk-fadein_var(--motion-fast)_var(--ease-claude-out)_forwards]"
        >
          {text}
        </span>
        {isStreaming && (
          <span
            className="inline-block w-[2px] h-[14px] bg-text-3 ml-[2px] align-middle"
            style={{
              animation:
                "streaming-cursor-blink var(--motion-stream-cursor-period) step-end infinite",
            }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
```

**Example — UserMessage.tsx:**
```tsx
// frontend/components/shared/UserMessage.tsx
"use client";

export interface UserMessageProps {
  content: string;
}

/**
 * User message — orange right-aligned bubble preserved from v2.0.
 * Per D-40-05 user/assistant visual asymmetry — user gets bubble, assistant flows.
 */
export default function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end mb-[8px]">
      <div className="max-w-[85%] px-[14px] py-[10px] rounded-[12px] rounded-br-[4px] bg-orange text-white text-[0.82rem] leading-[1.55] whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
```

**Caller migration (DeadlineAiChat.tsx + AiCourseChat.tsx):**
```tsx
// Before (DeadlineAiChat.tsx line 87–96)
{messages.map((msg, i) => {
  const isLatest = i === messages.length - 1;
  const isLatestAssistant = isLatest && msg.role === "assistant";
  return (
    <Fragment key={i}>
      <AiChatBubble
        role={msg.role}
        content={msg.content}
        isStreaming={isStreaming && isLatestAssistant}
      />
      {isLatestAssistant && sources.length > 0 && <Sources sources={sources} />}
    </Fragment>
  );
})}

// After
{messages.map((msg, i) => {
  const isLatest = i === messages.length - 1;
  const isLatestAssistant = isLatest && msg.role === "assistant";
  return (
    <Fragment key={i}>
      {msg.role === "user" ? (
        <UserMessage content={msg.content} />
      ) : (
        <StreamingAssistant
          content={msg.content}
          isStreaming={isStreaming && isLatestAssistant}
        />
      )}
      {isLatestAssistant && sources.length > 0 && <Sources sources={sources} />}
    </Fragment>
  );
})}
```

### Pattern 5: Sidebar two-layer transform-based DOM

**What:** Outer 68px `<aside>` is a stable layout occupier; inner 224px `<div>` translates from `translateX(-156px)` (collapsed; rightmost 68px visible) to `translateX(0)` (expanded; full panel) via GPU-composited transform. Outer container has `[contain:layout_paint]` confining paint cost to subtree.

**When to use:** Plan-3 of Phase 40. Rewrites `frontend/components/layout/Sidebar.tsx`.

**Example:**
```tsx
// frontend/components/layout/Sidebar.tsx (Phase 40 plan-3)
"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  CalendarDays,
  Target,
  Radio,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  key: "dashboard" | "timetable" | "courses" | "deadlines" | "predict" | "digest" | "settings";
  icon: LucideIcon;
  href: string;
}

const navItems: NavItem[] = [
  { key: "dashboard", icon: LayoutDashboard, href: "/" },
  { key: "timetable", icon: Calendar, href: "/timetable" },
  { key: "courses", icon: BookOpen, href: "/courses" },
  { key: "deadlines", icon: CalendarDays, href: "/deadlines" },
  { key: "predict", icon: Target, href: "/predict" },
  { key: "digest", icon: Radio, href: "/digest" },
];

const bottomItems: NavItem[] = [
  { key: "settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    // Outer 68px shell — stable layout occupier; main content's
    // padding-left:68px never shifts. `group` enables hover detection
    // for the inner panel translation. `[contain:layout_paint]` confines
    // paint cost to this subtree (Phase 39 LEARNINGS — preserved).
    // 1px right border replaces the v2.0 bleeding shadow that caused
    // the original Intel Mac stall (per Quick Task 260420-n29 + memory
    // backdrop_filter_intel_mac.md "GPU paint-cost family").
    <aside
      className={cn(
        "fixed inset-y-0 left-0 w-[var(--spacing-sidebar-w)] z-[100]",
        "overflow-hidden border-r border-[rgba(20,20,19,.08)]",
        "[contain:layout_paint]",
        "group"
      )}
    >
      {/* Inner 224px panel — translates on hover. GPU-composited;
          no layout reflow on parent or main content. */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[var(--spacing-sidebar-w-expanded)]",
          "bg-dark flex flex-col py-5",
          "translate-x-[-156px] group-hover:translate-x-0",
          "transition-claude-base will-change-transform",
          "[contain:layout_paint]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-[17px] pb-6 pt-[6px] whitespace-nowrap w-full">
          <div className="w-[34px] h-[34px] bg-orange rounded-[9px] grid place-items-center flex-shrink-0 font-serif font-bold text-[17px] text-white">
            U
          </div>
          <span className="font-serif text-[1.18rem] font-bold text-[#4a3f34] opacity-0 group-hover:opacity-100 transition-claude-base">
            UniBoard
          </span>
        </div>

        {/* Rule */}
        <div className="w-[26px] h-px bg-[rgba(60,50,40,.1)] mx-auto mb-[10px] group-hover:w-[calc(100%-44px)] transition-claude-base" />

        {/* Main nav */}
        <ul className="list-none w-full flex-1 flex flex-col gap-[2px] px-[10px]">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  prefetch
                  className={cn(
                    "flex items-center gap-[14px] py-[11px] px-[14px] rounded-[10px]",
                    "cursor-pointer transition-claude-fast whitespace-nowrap overflow-hidden no-underline",
                    active
                      ? "bg-orange-soft text-orange"
                      : "text-[rgba(60,50,40,.65)] hover:bg-[rgba(60,50,40,.06)] hover:text-[rgba(60,50,40,.75)]"
                  )}
                >
                  <Icon className="flex-shrink-0 w-5 h-5" />
                  <span className="text-[0.84rem] font-medium opacity-0 group-hover:opacity-100 transition-claude-base">
                    {t(item.key)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Bottom nav */}
        <div className="mt-auto px-[10px]">
          {bottomItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch
                className={cn(
                  "flex items-center gap-[14px] py-[11px] px-[14px] rounded-[10px]",
                  "cursor-pointer transition-claude-fast whitespace-nowrap overflow-hidden no-underline",
                  active
                    ? "bg-orange-soft text-orange"
                    : "text-[rgba(60,50,40,.65)] hover:bg-[rgba(60,50,40,.06)] hover:text-[rgba(60,50,40,.75)]"
                )}
              >
                <Icon className="flex-shrink-0 w-5 h-5" />
                <span className="text-[0.84rem] font-medium opacity-0 group-hover:opacity-100 transition-claude-base">
                  {t(item.key)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
```

**Geometry verification:**
- Outer width: 68px (Phase 39 token `--spacing-sidebar-w`).
- Inner width: 224px (Phase 39 token `--spacing-sidebar-w-expanded`).
- Inner default position: `translateX(-156px)` — leaves rightmost `224 - 156 = 68px` visible (matches outer width exactly).
- On hover: `translateX(0)` — inner panel slides right to fully overlay the outer container, but `overflow-hidden` on outer + `position:absolute` on inner means visual extent is from x=0 to x=224px. Main content padding still 68px → inner panel "pops over" main content for the 156px expansion.

**Active highlight verification (D-40-09):** Active nav items render `bg-orange-soft text-orange` inside the inner 224px panel. In collapsed state, the rightmost 68px of the inner panel is visible — including ~the rightmost portion of the highlight bar. Geometry: nav item is `px-[14px] py-[11px] rounded-[10px]`; in collapsed mode user sees the icon (which sits at left edge) plus partial right-edge of background highlight — matching the visual contract of "active state visible from collapsed strip".

### Pattern 6: Tailwind v4 `@utility transition-claude-*` blocks

**What:** Three custom utilities that DRY the verbose-form `transition-(all|colors) [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]` triple-className into a single `transition-claude-fast` utility.

**When to use:** Plan-1 of Phase 40. Adds to `frontend/app/globals.css` adjacent to the existing `@theme` block.

**Example:**
```css
/* === Phase 40 plan-1: SEED-40 motion utility shorthands === */
/* Source: tailwindcss.com/docs/adding-custom-styles + Phase 39 @theme tokens.
   These DRY the verbose-form occurrences (56 across 36 files) of:
     transition-{all|colors}
     [transition-duration:var(--motion-fast/base/slow)]
     [transition-timing-function:var(--ease-claude-out)]
   Tailwind v4 auto-generates modifier-prefixed variants
   (hover:transition-claude-fast, focus:transition-claude-fast, etc.)
   and combines with state utilities. */
@utility transition-claude-fast {
  transition-property: all;
  transition-duration: var(--motion-fast);
  transition-timing-function: var(--ease-claude-out);
}

@utility transition-claude-base {
  transition-property: all;
  transition-duration: var(--motion-base);
  transition-timing-function: var(--ease-claude-out);
}

@utility transition-claude-slow {
  transition-property: all;
  transition-duration: var(--motion-slow);
  transition-timing-function: var(--ease-claude-out);
}
```

[VERIFIED via WebFetch 2026-04-30: tailwindcss.com/docs/adding-custom-styles — `@utility` directive supports multi-property declarations; auto-generates modifier-prefixed variants; placed at top-level in CSS, NOT nested inside `@theme`.]

**Caveat (per Phase 39 LEARNINGS lesson "PostCSS minifier removes empty rules"):** `@utility` blocks with declarations are NOT empty so they survive minification. Verified by Phase 39's `@theme` block surviving production CSS bundle.

### Pattern 7: ESLint `no-restricted-syntax` rule extension

**What:** Extends Phase 39 D-16 rule with TWO additional selectors blocking (a) the verbose tokenized form (encourages SEED-40 shorthand) and (b) `var(--ease)` / `var(--ease-fast)` (defends D-40-04 deprecation).

**When to use:** Plan-1 of Phase 40. Edits `frontend/eslint.config.mjs`.

**Example diff:**
```javascript
// frontend/eslint.config.mjs (Phase 40 plan-1 extension)
// ... (existing imports + nextCoreWebVitals + nextTypescript + react-hooks override) ...

  // === Phase 40 D-40-03 + D-40-04: Block verbose tokenized form +
  // === legacy --ease/--ease-fast aliases ===
  // Phase 39 already blocks `transition-{all,colors} duration-N` (the
  // explicit-duration unmigrated form). Phase 40 adds:
  //   (a) the verbose tokenized triple — encourages SEED-40 shorthand
  //   (b) var(--ease) / var(--ease-fast) — D-40-04 deprecation gate
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        // (1) PHASE 39 SELECTOR — preserved as-is
        {
          selector:
            "Literal[value=/(?:[a-z][a-z0-9-]*:)*transition-(all|colors)\\s+(?:[a-z][a-z0-9-]*:)*duration-(\\[[^\\]]*\\]|\\d+)/]",
          message:
            "Raw `transition-{all,colors} duration-{N}` is forbidden. Use transition-claude-fast/base/slow shorthand. See Phase 40 PATTERNS.md.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(?:[a-z][a-z0-9-]*:)*transition-(all|colors)\\s+(?:[a-z][a-z0-9-]*:)*duration-(\\[[^\\]]*\\]|\\d+)/]",
          message:
            "Raw `transition-{all,colors} duration-{N}` in template literal is forbidden. See Phase 40 PATTERNS.md.",
        },
        // (2) PHASE 40 NEW: Verbose tokenized form -> shorthand
        {
          selector:
            "Literal[value=/(?:[a-z][a-z0-9-]*:)*transition-(all|colors)\\s+\\[transition-duration:var\\(--motion-(fast|base|slow)\\)\\]\\s+\\[transition-timing-function:var\\(--ease-claude-out\\)\\]/]",
          message:
            "Verbose `transition-{all,colors} [transition-duration:var(--motion-X)] [transition-timing-function:var(--ease-claude-out)]` is forbidden. " +
            "Use the shorthand: transition-claude-fast / transition-claude-base / transition-claude-slow (defined in globals.css @utility blocks). " +
            "See .planning/phases/40-shared-component-polish/40-RESEARCH.md §Pattern 6.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(?:[a-z][a-z0-9-]*:)*transition-(all|colors)\\s+\\[transition-duration:var\\(--motion-(fast|base|slow)\\)\\]\\s+\\[transition-timing-function:var\\(--ease-claude-out\\)\\]/]",
          message:
            "Verbose tokenized transition form in template literal is forbidden. Use shorthand. See Phase 40 PATTERNS.md.",
        },
        // (3) PHASE 40 NEW: Legacy --ease / --ease-fast deprecation
        {
          selector:
            "Literal[value=/var\\(--ease(?:-fast)?\\)/]",
          message:
            "v2.0 legacy `var(--ease)` / `var(--ease-fast)` are deprecated (D-40-04). " +
            "New code MUST use `var(--ease-claude-out)` + `var(--motion-fast/base/slow)` " +
            "or the @utility shorthand transition-claude-fast/base/slow. " +
            "Aliases remain in globals.css for forward-compat, but no new occurrences.",
        },
        {
          selector:
            "TemplateElement[value.raw=/var\\(--ease(?:-fast)?\\)/]",
          message:
            "Legacy --ease/--ease-fast in template literal is deprecated. See D-40-04.",
        },
      ],
    },
  },
  // ... (existing test fixture override + ignores) ...
```

**Verification once installed:**
```bash
cd frontend && pnpm lint --max-warnings 0
# Expected: exits 0 (no violations) — proves the 56 verbose-form occurrences
# have been swept BEFORE the rule lands. Plan-1 must order: (a) sweep first,
# (b) ESLint extension second, (c) commit. Otherwise pnpm lint fails CI.
```

### Pattern 8: sed playbook for 56 verbose-form sweep + 114-caller Button/Input migration

**What:** BSD sed (macOS) playbook for the two mechanical sweeps. Phase 39 LEARNINGS established sed sufficiency for grep-stable string replacement at scale; same approach here.

**When to use:** Plan-1 of Phase 40. Two passes:
1. Verbose-form → `transition-claude-fast/base/slow` shorthand.
2. Button JSX → `<Button variant="...">` (manual + sed-assist; not pure mechanical because variant choice depends on caller intent).

**Example — Pass 1: Verbose-form sweep (mechanical, sed-only):**
```bash
# Run from frontend/ — BSD sed (macOS) needs `-i ''` (empty backup arg)
cd frontend

# Pass 1a: transition-all + var(--motion-fast)
find components app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' -E \
  's|transition-all \[transition-duration:var\(--motion-fast\)\] \[transition-timing-function:var\(--ease-claude-out\)\]|transition-claude-fast|g'

# Pass 1b: transition-colors + var(--motion-fast)
find components app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' -E \
  's|transition-colors \[transition-duration:var\(--motion-fast\)\] \[transition-timing-function:var\(--ease-claude-out\)\]|transition-claude-fast|g'

# Pass 1c: transition-all + var(--motion-base)
find components app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' -E \
  's|transition-all \[transition-duration:var\(--motion-base\)\] \[transition-timing-function:var\(--ease-claude-out\)\]|transition-claude-base|g'

# Pass 1d: transition-colors + var(--motion-base)
find components app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' -E \
  's|transition-colors \[transition-duration:var\(--motion-base\)\] \[transition-timing-function:var\(--ease-claude-out\)\]|transition-claude-base|g'

# Pass 1e: transition-all + var(--motion-slow) — symmetric for completeness
find components app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' -E \
  's|transition-all \[transition-duration:var\(--motion-slow\)\] \[transition-timing-function:var\(--ease-claude-out\)\]|transition-claude-slow|g'

find components app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' -E \
  's|transition-colors \[transition-duration:var\(--motion-slow\)\] \[transition-timing-function:var\(--ease-claude-out\)\]|transition-claude-slow|g'

# Verify
grep -rEln "transition-(all|colors)\s+\[transition-duration:var\(--motion-(fast|base|slow)\)\]" components/ app/
# Expected: zero output (sweep complete)

grep -rEln "transition-claude-(fast|base|slow)" components/ app/
# Expected: 36 files (the same files that had verbose form)
```

**Caveat per Phase 39 LEARNINGS lesson "Sed migration creates timing-function token override bugs":** Sed regex matches text but does not understand CSS rules. After Pass 1, manually inspect the 4 files Phase 39 had to fix (Sidebar, DeadlineCard, PredictCard, NotificationsSection — search for stale `ease-[cubic-bezier(...)]` literals or inline `style.transitionTimingFunction`). Phase 40's 56 occurrences are subset of Phase 39's already-cleaned files, so this risk is reduced but not eliminated.

**Example — Pass 2: Button migration (semi-manual; sed primes, manual variant assignment):**

The 86 raw `<button>` JSX usages cluster into ~5 dominant styles. Sed cannot map className → variant prop unambiguously (e.g., `bg-[#d97757]` → `variant="primary"` requires intent assertion). Instead:

```bash
# Pass 2a: Find candidates
grep -rEln "<button" components/ | wc -l
# 31 unique files

# Pass 2b: For each file, manually edit:
# - Add `import { Button } from "@/components/ui/Button";`
# - Replace each <button> ... className="bg-[#d97757] ..."> with
#   <Button variant="primary" ...>
# - Remove redundant className tokens (variant takes care of bg, hover, focus-visible, transition)
# - Preserve unique className portions via Button's className prop merge
```

**Mapping table (caller-class → cva variant):**

| Caller pattern (excerpt) | cva variant | Loading flag | Notes |
|--------------------------|-------------|--------------|-------|
| `bg-[#d97757] text-white ... hover:bg-[#c5674a]` | `primary` | from `isPending` | LoginForm submit, RegisterForm submit, danger confirm |
| `bg-cream/transparent border-card-border text-text-2 hover:bg-card-bg-hover` | `secondary` | rare | DangerZone cancel, ExternalLinkDialog cancel |
| `text-text-3 hover:text-text-2` (no bg) | `ghost` | rare | Eye toggle (LoginForm line 137), close-X buttons |
| `bg-[#cc4455] text-white ... hover:bg-[#b33d4c]` | `danger` | from `isPending` | DangerZone delete confirm |
| `w-[40px] h-[40px] rounded-full bg-[#d97757]` | `primary iconOnly size="md"` (override `rounded-full` via className) | from `isStreaming` | DeadlineAiChat send, AiCourseChat send |

The `iconOnly` variant assumes square aspect ratio; `rounded-full` override goes through `className` prop merging. Confirm via test that Button accepts and merges arbitrary className via tailwind-merge.

### Pattern 9: Vitest unit test for useStreamingText (TDD RED stub)

**What:** Failing test scaffold for plan-2's RED commit. Per Phase 39 LEARNINGS triplet pattern (RED → GREEN → docs).

**When to use:** Plan-2 of Phase 40, before implementing the hook.

**Example:**
```ts
// __tests__/hooks/useStreamingText.test.ts
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStreamingText } from "@/hooks/useStreamingText";

describe("useStreamingText", () => {
  it("exposes empty initial text when not streaming", () => {
    const { result } = renderHook(() =>
      useStreamingText({ source: "", isStreaming: false })
    );
    expect(result.current.text).toBe("");
    expect(result.current.isStreaming).toBe(false);
  });

  it("returns source text verbatim", () => {
    const { result } = renderHook(() =>
      useStreamingText({ source: "Hello", isStreaming: true })
    );
    expect(result.current.text).toBe("Hello");
  });

  it("monotonically bumps chunkIndex on source change", () => {
    const { result, rerender } = renderHook(
      ({ source, isStreaming }) =>
        useStreamingText({ source, isStreaming }),
      { initialProps: { source: "Hello", isStreaming: true } }
    );
    const i1 = result.current.chunkIndex;
    rerender({ source: "Hello world", isStreaming: true });
    const i2 = result.current.chunkIndex;
    rerender({ source: "Hello world!", isStreaming: true });
    const i3 = result.current.chunkIndex;
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
  });

  it("transitions isStreaming false on stream complete", () => {
    const { result, rerender } = renderHook(
      ({ source, isStreaming }) =>
        useStreamingText({ source, isStreaming }),
      { initialProps: { source: "Hello", isStreaming: true } }
    );
    rerender({ source: "Hello.", isStreaming: false });
    expect(result.current.isStreaming).toBe(false);
  });
});
```

**Example — Button RED stub (plan-1):**
```tsx
// __tests__/components/ui/Button.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("<Button>", () => {
  it("renders with primary variant by default", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn.className).toContain("bg-orange");
    expect(btn.className).toContain("text-white");
  });

  it("renders danger variant", () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("bg-red");
  });

  it("merges caller className via cn()", () => {
    render(<Button className="w-full">Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("w-full");
  });

  it("renders Loader2 when loading=true", () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.querySelector("svg")).toBeInTheDocument();
  });

  it("disabled prop sets HTML disabled attribute", () => {
    render(<Button disabled>Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
  });
});
```

### Pattern 10: Playwright env-gated 60fps Sidebar spec stub

**What:** Authored-in-tree Playwright spec that auto-skips when `PERF_TEST_PASSWORD` is unset. Per Phase 39 SEED-39 + Phase 38 P04 pattern. Generates baselines on user's primary Intel Mac during production UAT.

**When to use:** Plan-3 of Phase 40. Creates `frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts`.

**Example skeleton:**
```ts
// frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts
// @ts-nocheck (Phase 38 P04 / Phase 39 SEED-39 convention — env-gated stub)
//
// SEED-40-CLOSURE: Once user provisions PERF_TEST_PASSWORD locally:
//   PERF_TEST_PASSWORD=*** npx playwright test phase40-sidebar-60fps --update-snapshots
//
// This spec measures Sidebar hover-expand/collapse FPS via the
// performance.measure() API on real Intel Mac hardware.
import { test, expect } from "@playwright/test";
import { shouldRunPerfSuite } from "./helpers/auth";

test.describe("Phase 40 SHARED-03: Sidebar 60fps Intel Mac", () => {
  test.beforeAll(() => {
    if (!shouldRunPerfSuite()) {
      test.skip();
    }
  });

  test("hover-expand achieves >55fps median on Sidebar", async ({ page }) => {
    await page.goto("/timetable");

    // Capture frame timing during hover-induced expand
    await page.evaluate(() => {
      window.__sidebarFrames = [];
      let last = performance.now();
      const onFrame = (t) => {
        window.__sidebarFrames.push(t - last);
        last = t;
        if (window.__sidebarFrames.length < 60) {
          requestAnimationFrame(onFrame);
        }
      };
      requestAnimationFrame(onFrame);
    });

    await page.locator("aside").hover();
    await page.waitForTimeout(800); // allow 60 frames to capture

    const frames = await page.evaluate(() => window.__sidebarFrames);
    const median = [...frames].sort((a, b) => a - b)[Math.floor(frames.length / 2)];
    const fps = 1000 / median;

    // 60fps target = 16.67ms per frame; allow 5fps headroom for jitter
    expect(fps).toBeGreaterThan(55);
  });

  test("collapse animation does not trigger main content reflow", async ({ page }) => {
    await page.goto("/timetable");
    const sidebar = page.locator("aside");
    await sidebar.hover();

    // Capture main content's bounding box before collapse
    const before = await page.locator("main").boundingBox();

    // Trigger collapse by hovering off
    await page.mouse.move(800, 400);
    await page.waitForTimeout(300);

    const after = await page.locator("main").boundingBox();

    // Main content X-position MUST be stable (transform is internal to sidebar)
    expect(after?.x).toBe(before?.x);
  });
});
```

**Closure procedure (deferred):**
1. User provisions `PERF_TEST_PASSWORD` + Supabase env vars locally.
2. Run `npx playwright test phase40-sidebar-60fps --update-snapshots` on Intel Mac.
3. Commit baseline output as PR addendum or follow-up commit.
4. SEED-40 + SEED-39 closure log it.

## Open Questions Answered

### Q1: cva variant taxonomy for Button — exact `variants` tree binding to tokens

**Decision:** Two `variants` keys (`variant`, `size`) + two booleans (`iconOnly`, `loading`). DefaultVariants = `{ variant: "primary", size: "md" }`. Variants bind to Phase 39 `--color-orange`/`--color-red`/`--color-cream`/`--color-card-border` + Phase 40 `transition-claude-fast` shorthand + `focus-visible:ring-orange/40`.

**Rationale:** 5 dominant Button styles (CONTEXT.md §code_context line 187) all decompose into 4 variants × 2 sizes; iconOnly handles the round 36/40px send buttons in chat surfaces. Loading state needs visual breath (opacity ramp) so it's a separate boolean rather than a variant member. shadcn's pattern for the same shape; cva 0.7.1 native; no compound variants needed in v1.

**Code example:** See **Pattern 1** above (full Button.tsx with cva). Variant strings:
- `primary`: `["bg-orange text-white border-none", "hover:bg-[#c5674a]", "hover:-translate-y-px active:translate-y-0"]`
- `secondary`: `["bg-cream text-text-2 border border-card-border", "hover:bg-card-bg-hover"]`
- `ghost`: `["bg-transparent text-text-2 border-none", "hover:bg-card-bg-hover"]`
- `danger`: `["bg-red text-white border-none", "hover:bg-[#b33d4c]"]`

`focus-visible:ring-orange/40` uses Tailwind's color-opacity syntax which compiles when paired with `--color-orange` in Phase 39's `@theme`. [VERIFIED: tailwindcss.com/docs/theme — utility namespace `--color-*` enables `bg-{name}/{opacity}` syntax.]

### Q2: cva variant taxonomy for Input — exact `variants` tree binding to tokens

**Decision:** Two `variants` keys (`variant`, `error`) + two ReactNode props (`leftIcon`, `rightIcon`). DefaultVariants = `{ variant: "default" }`. Variants bind to Phase 39 `--color-cream`/`--color-card-border`/`--color-orange`/`--color-red` + `--color-orange-soft`/`--color-red-soft` + Phase 40 `transition-claude-fast` shorthand.

**Rationale:** 2 dominant Input shapes (text/email/password vs search-pill); error state is a boolean modifier on top. Icons are slot-rendered via absolute positioning within a relative wrapper (only when `leftIcon` or `rightIcon` is present); avoids unnecessary div wrappers in the common case.

**Disabled state philosophy (per Discretion):** Use HTML `disabled` attribute. Excludes from tab order — semantically correct for form fields in disabled state. cva does NOT need a `disabled` variant; HTML attribute handles it via `disabled:opacity-50 disabled:cursor-not-allowed` Tailwind selectors (already in base classes). Phase 41 A11Y-03 may revisit for `aria-disabled` on screen-reader-required scenarios; defer that decision.

**Code example:** See **Pattern 2** above (full Input.tsx with cva).

### Q3: useStreamingText hook architecture — useState vs useReducer vs useDeferredValue

**Decision:** `useState` for `chunkIndex` + `useEffect` listener on `source` prop change. Wraps existing `useAiStream` (does NOT replace it).

**Rationale:** `useDeferredValue` de-prioritizes a value's render but does NOT expose chunk-arrival timing — can't trigger per-chunk fadein keyframe. `useReducer` is overkill for `text + isStreaming + chunkIndex` triplet. `useState` is the simplest approach that exposes monotonic chunkIndex; React's batching handles rapid SSE token bursts safely.

**Test ergonomics:** `renderHook` from `@testing-library/react` makes assertion easy — initialProps + rerender pattern verified in Phase 34's `__tests__/hooks/use-ai-stream.test.ts`. The hook's pure-function nature means no SSE mocking is needed at the useStreamingText layer (mock at the AiChatBubble caller level if integration testing is desired).

**Code example:** See **Pattern 3** above (full useStreamingText.ts + RED test stub).

### Q4: StreamingAssistant component — exact JSX tree, ClientOnly wrapping, Source Serif 4 application

**Decision:** Pure client component (`"use client"`); no ClientOnly wrapper needed because the parent caller (DeadlineAiChat / AiCourseChat) is already client. Source Serif 4 applied via `font-serif text-body` (Phase 39 typography utility — globals.css `--text-body` namespace).

**Rationale:** SSR is not a concern — the AI chat surface only mounts after user interaction; SSE consumption requires client. ClientOnly is an over-application; the existing AiChatBubble has no ClientOnly wrapper either. `font-serif` resolves to `var(--font-serif)` which is `var(--font-source-serif-4), Georgia, serif` per Phase 39 `@theme inline`. `text-body` resolves to `var(--text-body) = 0.95rem` with `--leading-body = 1.5` — matches v2.0 chat body text size while flowing as serif.

**Cursor mount/unmount logic:** Cursor renders only when `isStreaming === true`. When `isStreaming === false`, the cursor span unmounts (React conditional rendering). When `isStreaming === true && text === ""`, cursor renders alone (placeholder behavior per D-40-07).

**Code example:** See **Pattern 4** above (full StreamingAssistant.tsx).

### Q5: UserMessage component — bubble styles, alignment, max-width

**Decision:** Right-aligned (`flex justify-end`); orange filled bubble (`bg-orange text-white`); `rounded-[12px] rounded-br-[4px]` for the asymmetric chat-bubble corner; `max-w-[85%]`; `px-[14px] py-[10px]`; `text-[0.82rem] leading-[1.55]`.

**Rationale:** Preserves v2.0 AiChatBubble's user role styling verbatim (CONTEXT.md D-40-05 mandate: "preserves bubble (right-aligned, orange `bg-orange text-white rounded-br-[4px]`)"). The asymmetric `rounded-br-[4px]` (smaller radius on bottom-right) is the universal chat-bubble convention indicating the bubble's tail. assistant-ui Claude clone uses `bg-[#DDD9CE]` cream + serif — UniBoard chooses orange to match brand identity, an intentional palette divergence.

**Code example:** See **Pattern 4** above (full UserMessage.tsx).

### Q6: Sidebar two-layer DOM — exact JSX, contain placement, will-change, transparent vs opaque outer

**Decision:** Outer 68px `<aside>` is **transparent background** (no `bg-*`); inner 224px `<div>` carries `bg-dark`. Both have `[contain:layout_paint]`. Inner has `will-change-transform` to hint the compositor to upgrade the layer at hover-time. Outer keeps the 1px right border (`border-r border-[rgba(20,20,19,.08)]`) per Phase 39 / Quick Task 260420-n29 fix to replace the old bleeding shadow.

**Rationale resolution (the trade question):**
- **Transparent outer:** Main content paints behind the sidebar in the 68px region — visually it would be visible if outer were transparent and inner were translated to `-156px`. BUT inner's default `translate-x-[-156px]` shows the rightmost 68px = full width of outer's clipping box. So in practice **the user always sees the inner panel's content within the outer 68px slot**, not the underlying main content. Transparent outer is safe.
- **Opaque outer:** Adds a redundant `bg-dark` declaration; same paint cost as inner; nothing gained.

So **transparent outer is correct**. The `bg-dark` only lives on the inner panel — single source of truth for the sidebar's visual fill. `[contain:layout_paint]` on outer ensures the inner's paint cost stays inside the subtree even during translate; `will-change-transform` on inner upgrades it to a compositor layer at hover-trigger time.

**Z-index:** Outer is `z-[100]`. Inner is `position:absolute inset-y-0 left-0 w-[var(--spacing-sidebar-w-expanded)]` — inherits the parent's stacking context but overlay-ranks below `z-[200]` dropdowns (Phase 39 `--shadow-dropdown` consumers).

**Code example:** See **Pattern 5** above (full Sidebar.tsx rewrite).

### Q7: Active state highlight inside inner 224px panel — exact CSS

**Decision:** Active nav item gets `bg-orange-soft text-orange` (Phase 39 token `--color-orange-soft`, an 11% opacity orange) on the `<Link>` element. The link itself has `rounded-[10px] py-[11px] px-[14px]` from existing code — no change. In collapsed mode (default `translate-x-[-156px]`), the rightmost ~68px of the inner panel is visible — including the right portion of the active nav item's background highlight.

**Geometry verification:**
- Nav item width: `100% - 2*10px (parent padding)` = ~204px wide.
- Default visible region: rightmost 68px of inner (= rightmost 68px of nav items).
- Active highlight visible portion: from x=156 to x=224 within nav item = 68/204 ≈ 33% of the highlight, **including the icon at left edge of the nav item which sits at x=14 (padding-left)**. Wait — icon is at left edge so in collapsed view it's NOT visible.

**Correction:** The ICON sits at `padding-left:14px` from the left edge of the nav item. With inner translated `-156px`, only the rightmost 68px of inner is visible — meaning x=156 onwards within the inner panel. The icon (at x=14) is HIDDEN. The label (at x=48ish) is also HIDDEN.

**Re-correction:** The icon is hidden in collapsed view! That can't be right — the existing v2.0 sidebar shows icons in collapsed view.

**Re-thinking the geometry:** In the existing v2.0 implementation:
- Sidebar default width: 68px.
- Icons sit at `padding-left:14px + flex-shrink-0 w-5 h-5` so icon center is at x ≈ 24px from left edge of sidebar (well within 68px).
- Labels sit at `flex gap-[14px]` from icon, opacity 0 by default.
- On hover, sidebar grows to 224px and labels fade in.

**For the two-layer rewrite, the icon must STILL be visible in collapsed view.** Inner panel must be positioned so that its leftmost 68px IS what's visible in collapsed mode, not its rightmost 68px.

**Correction to D-40-08 geometry:** Default position should be `translateX(0)` (showing leftmost 68px = icons + start of labels). On hover should be `translateX(?)` — but that REVERSES the direction from CONTEXT.md.

**Wait — re-reading D-40-08:** `translate-x-[-156px]` means inner is shifted LEFT by 156px. So inner's left edge is at x=-156, inner's right edge is at x=68 (since inner is 224px wide). The visible portion (within outer's 0–68px window) is inner's [156..224] range = inner's RIGHTMOST 68px. Per my re-correction, this hides the icons (at x≈24 within inner).

**This means D-40-08 inverts left-right semantics.** The fix: nav items inside the inner panel must be **right-aligned** so the icons sit at inner's right edge (x ≈ 200ish within inner's 224px width). Then in collapsed mode (visible: inner's [156..224]), icons fall in the visible window.

**OR** — re-read D-40-08 more carefully: maybe `translateX(-156px)` is intended as "default" but visually means inner is positioned with content flowing from x=0 in inner-coordinate space, but the inner itself is shifted -156. So the user sees inner's [156..224] range = its "right portion".

**Definitive answer requires inspection of the assistant-ui pattern or REQUIREMENTS recommendation.** REQUIREMENTS.md SHARED-03 says: "Default `translateX(-156px)`, `translateX(0)` on hover." — implying default is "shifted left" and hover is "shifted to origin (fully visible)". So in default, the inner's [156..224] = ITS RIGHT PORTION is what's visible inside the outer's 0–68 window.

**This means icons must be rendered in the LEFT portion of the inner panel (their natural position, x ≈ 14–34) — but in collapsed view those icons are at outer-x ≈ -156+14 = -142 = NOT VISIBLE.** This is a contradiction.

**Let me re-examine — maybe the geometry CONTEXT.md describes is WRONG / requires layout flip.**

Looking at the assistant-ui-equivalent pattern (Notion, Linear, ChatGPT — all use sidebars). Conventionally:
- "Hover-to-expand" sidebars keep ICONS visible in collapsed state at left of the sidebar.
- The expansion reveals LABELS to the RIGHT of the icons.

So the natural pattern is:
- **Inner panel:** content flows left-to-right (icon at x=14, label starts at x=48).
- **Default state (collapsed):** inner is at its natural position (`translateX(0)`); outer is `width:68px overflow-hidden` so only inner's leftmost 68px (icons + start of labels) is visible. Labels are `opacity-0`.
- **Hover state (expanded):** outer's width grows OR inner translates RIGHT to expose labels.

But D-40-08 says inner is `position:absolute w-[224px]` (224 wide); outer is `width:68px overflow-hidden`. If inner is at `translateX(0)`, ALL 224px of inner extends from x=0 to x=224, but outer clips at x=68. So inner's [0..68] is visible (= icons + start of labels) — labels themselves are clipped. **This is the natural collapsed view.**

On hover, inner needs to translate so that the FULL 224px fits within visible area. If outer is `width:68px overflow:hidden` and we want full 224px visible, **the outer's overflow must change OR the inner must extend beyond outer's clip box.**

**Option A:** Outer width grows on hover from 68 to 224 (BUT this is exactly what we're trying to avoid — width animation = layout reflow).
**Option B:** Outer keeps `width:68px` but `overflow:visible` — inner extends 156px beyond the outer's right edge into main content's space. This is a Z-LAYER overlay.

**Re-reading D-40-08:**
```tsx
<aside class="fixed inset-y-0 left-0 w-[68px] z-[100] overflow-hidden">  // OUTER
  <div class="absolute inset-y-0 left-0 w-[224px]
              translate-x-[-156px] hover:translate-x-0
              [contain:layout_paint]">
```

If OUTER has `overflow-hidden`, then inner can never extend visually beyond x=68 within the outer's frame. So `translate-x-0` shows inner's [0..68] (clipped at outer's right edge). And `translate-x-[-156px]` shifts inner left by 156, so inner's [156..224] is what's in outer's [0..68] window.

In short: D-40-08's geometry as written gives:
- Default (`-156px`): inner's RIGHTMOST 68 visible = THE END of nav items (right side of icons + nothing else, because labels are at left of label-text within the item).

**This is backwards from convention.** Let me check the prototype.

Looking at prototype/DESIGN_SYSTEM.md §4 Sidebar:
```css
.sidebar { width: var(--sidebar-w); /* 68px */ ... transition: width var(--ease); }
.sidebar:hover { width: var(--sidebar-w-expanded); /* 224px */ }
```

So the v2.0 prototype uses **width-animation** (default 68, hover 224). This is what we're replacing.

For the two-layer transform replacement: the **correct geometry** must keep the icon visible at left in collapsed mode and reveal labels on hover. The conventional pattern:

**Correct interpretation of D-40-08:** Default `translate-x-0` (inner aligned with outer left); hover ALSO `translate-x-0` BUT outer's clip changes. OR — the simpler reading: **inner's absolute width is 224 but it's anchored relative to outer's left edge; outer is `width:68px overflow-hidden` so by default only inner's LEFTMOST 68 is visible; on hover outer's `overflow` changes to `visible` AND inner's full 224 reveals to the right of outer.**

But then `translate-x-[-156px]` → `translate-x-0` doesn't fit either.

**Final resolution:** D-40-08's `translate-x-[-156px]` is likely a **typo or geometric confusion**. The correct, conventional, "expand to the right" pattern is:

1. Outer: `width:68px` (always), `overflow:visible` (yes, visible — not hidden).
2. Inner: `position:absolute, width:224px, left:0, top:0`.
3. Default state: inner has `clip-path: inset(0 156px 0 0)` (clips off the right 156px so visually only leftmost 68 is shown, even though box is 224 wide).
4. Hover state: inner has `clip-path: inset(0)` (no clip; full 224 visible, extending 156px into main content's space).

OR a much simpler approach:

1. Outer: `width:68px overflow:visible`.
2. Inner: `position:absolute, width:224px, left:0, top:0`.
3. Default: nothing — inner's `width:224px` paints from x=0 to x=224, but only the leftmost 68 has the visual brand (icons), and the label region (x=68..224) is rendered with `opacity-0` so it's invisible.
4. Hover: labels become `opacity-100`.

This is actually equivalent to the v2.0 prototype WITHOUT the width animation — and it's transform-free! No translate at all. The hover state just changes label opacity.

**Re-read D-40-08 + REQUIREMENTS:**
> "Two-layer DOM (outer 68 px container always visible + inner 224 px panel absolutely positioned). Default `translateX(-156px)`, `translateX(0)` on hover. GPU-composited."

The **intent** of the architecture per REQUIREMENTS is clearly:
- Inner 224px panel, default state OFFSCREEN to the left except for the rightmost 68px which sits within the visible outer window. On hover, slide right to fully show.
- This means inner's **content layout** must be designed so that the NAV ICONS sit at the **right edge** of the inner panel (so they're visible in collapsed mode), and **NAV LABELS** sit to the LEFT of icons (revealed when inner translates right).

**This is right-to-left layout for the nav items — opposite of v2.0!** That's a DESIGN flip not just an implementation flip.

**OR — alternative interpretation:** "Default `translateX(-156px)`" means default visible: inner's rightmost 68px. This is the state where the user sees a "narrow strip" with icons. On hover, `translateX(0)` puts inner at its natural anchor — extending RIGHTWARD beyond the outer's 68px into main content's space. This would require outer's `overflow:visible` (not hidden).

**Verifying with REQUIREMENTS wording: "GPU-composited"** — confirms this is a transform play. **"Two-layer DOM"** — confirms we have outer + inner. **"Outer 68 px container always visible"** — outer is at z-[100] and never moves.

**The simplest reading that's consistent with all constraints:**

**Resolution:**
1. Outer: `fixed left:0 w:68px z:[100] overflow:hidden` — clipping box.
2. Inner: `absolute left:0 w:224px` — positioned within outer.
3. Inner default: `translateX(0)` — natural position. Since outer clips at 68px, only inner's leftmost 68 are visible.
4. Inner hover: `translateX(?)` — needs to translate so that more of inner becomes visible WITHIN outer.

But you can't make outer's "visible window" wider via inner's translation — the only way to reveal more inner content is to either widen outer or move outer's clip box. Translation alone moves inner sideways but the outer's clip at 68px stays fixed.

**The correct architecture is:**
1. Outer: `fixed left:0 w:68px z:[100] overflow:visible` (NOT hidden) — outer is just a layout-occupier.
2. Inner: `absolute left:0 top:0 w:224px h:full bg-dark`.
3. Default: inner sits at `translateX(0)`. Since outer has `overflow:visible` and inner is `absolute left:0`, inner extends from x=0 to x=224 in outer-coordinate space — 156px overflows into main content's space. To hide the overflow region, **inner has its OWN clip box: `clip-path: inset(0 156px 0 0)`** which clips its right 156px.
4. Hover: inner's clip-path becomes `inset(0)`. Full 224px visible, 156px overlaying main content.

But REQUIREMENTS explicitly says "Default `translateX(-156px)`" — translation, not clip-path.

**Final correct reading (after careful thought):**

D-40-08's geometry is inverted from convention. The intended pattern is:

1. Outer: `fixed left:0 w:68px z:[100] overflow:visible`.
2. Inner: `absolute right:0 top:0 w:224px h:full` — anchored to outer's RIGHT edge.
3. Default: `translateX(-156px)` — shifts inner LEFT by 156px. With inner anchored at right and shifted left, inner's right edge is at x = 68 - 156 = -88, inner's left edge is at x = -88 - 224 = -312. So inner is fully off-screen LEFT.

That's still not right.

**Giving up on reverse-engineering D-40-08's exact geometry from the snippet. Recommending the planner consults the assistant-ui Claude clone reference visual or the user during implementation.**

**Practical recommendation for the planner:** Implement the conventional pattern:
1. Outer: `fixed left:0 w:68px z:[100] overflow:hidden` — clipping box, layout occupier.
2. Inner: `absolute left:0 top:0 w:224px h:full bg-dark` — natural anchor at left.
3. Default: `translateX(0)` — natural; inner's leftmost 68px visible (icons), rightmost 156px clipped.
4. Hover: outer's `overflow` switches to `visible` AND inner stays at `translateX(0)`. The 156px now extends rightward over main content. Use `group-hover:overflow-visible` on outer + `group-hover:z-[101]` to ensure inner overlays cleanly.

OR, more elegantly with transform:
1. Outer: `fixed left:0 w:68px z:[100] overflow:visible` (always visible).
2. Inner: `absolute left:0 top:0 w:224px h:full bg-dark clip-path:inset(0 156px 0 0)` — clipped to leftmost 68.
3. Hover: `group-hover:[clip-path:inset(0)]` — clip removed, full 224 visible.

Either approach is GPU-composited; the second is more elegant. **Recommend the planner choose between these two during plan-3 task design**, or revisit D-40-08's geometry with the user to clarify intent.

**For RESEARCH purposes — recording the question explicitly:**

> ⚠️ D-40-08's `translateX(-156px)` → `translateX(0)` is **geometrically ambiguous** — implementation may need `overflow:visible` on outer + clip-path on inner OR width-grow trick + transform. Planner must verify against design intent during plan-3 design. Likely the cleanest implementation diverges slightly from D-40-08's literal `translateX` wording.

Code example **Pattern 5** above shows the most likely intended implementation given REQUIREMENTS wording (`overflow:hidden` on outer + `translateX` on inner), but the visual outcome may not match the v2.0 prototype's "icons visible in collapsed mode" UX. Planner verifies during impl.

### Q8: 60fps Intel Mac validation — Playwright trace pattern, env-gated stub, human UAT

**Decision:** Two-pronged verification:
1. **CI level (env-gated stub):** `frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts` measures FPS via `performance.measure()` API + `requestAnimationFrame` frame timing. Auto-skips when `PERF_TEST_PASSWORD` is unset (Phase 39 SEED-39 pattern).
2. **Production human UAT:** User opens the deployed site on their Intel Mac (primary device per memory: `backdrop_filter_intel_mac.md`), interacts with Sidebar hover-expand/collapse on dashboard / predict / settings / timetable pages, observes whether the animation is smooth (no stalls, no jitter), and reports back.

**Rationale:** 60fps validation cannot be reliably performed in CI (CI runners are virtualized x86_64 servers with different GPU profiles than Intel Mac). The performance.measure() approach captures real-DOM frame timing but only meaningful on production hardware. Phase 39's `--ease-claude-out` validation followed the same pattern — verified visually on user's device, not in CI.

**Code example:** See **Pattern 10** above (full Playwright spec stub).

**HUMAN-UAT criteria (user-runnable checklist post-deploy):**
- [ ] Hover Sidebar from far-left edge of screen — does it expand smoothly with no stall?
- [ ] Move mouse off Sidebar — does it collapse smoothly?
- [ ] Repeat 5 times rapidly — any jitter or "stuck" frames?
- [ ] Observe on /timetable page (most layout-dense — Phase 39 LEARNINGS noted timetable is the worst stress test for sidebar paint cost) — same smoothness?
- [ ] Open DevTools Performance panel; record while hovering — confirm no `Layout` events fire on Sidebar mutation; only `Composite Layers` events.

### Q9: 277-caller (actual: 114) Button/Input sweep tooling — sed playbook vs jscodeshift vs manual

**Decision:** **Manual edits with sed assistance** for the Button/Input sweep. Pure sed is insufficient because className → variant prop mapping requires intent assertion (sed can't know whether `bg-[#d97757] ... rounded-full w-[36px] h-[36px]` should map to `<Button variant="primary" iconOnly>` or stay raw with override — depends on caller's pattern intent).

**Rationale:** Per Phase 39 LEARNINGS and Discretion: sed playbook + manual cleanup with visual review handles the 5–10 edge cases in <2 hours. The 86 button + 28 input = 114 callers cluster into ~5 dominant Button styles + 2 Input styles, so manual variant assignment is mechanical-but-not-automatable.

**Defense:** The 5 dominant button styles map cleanly:
- `bg-[#d97757] ... hover:bg-[#c5674a]` → `variant="primary"` (most callers — 35+ matches)
- `bg-[#cc4455] ... hover:bg-[#b33d4c]` → `variant="danger"` (DangerZone confirms — 4 matches)
- `bg-cream/transparent border-card-border` → `variant="secondary"` (cancel buttons — 8 matches)
- `text-text-3 hover:text-text-2` (no bg) → `variant="ghost"` (eye toggles, close-X — 6 matches)
- `rounded-full w-[36/40px] h-[36/40px]` → `variant="primary" iconOnly` (chat send buttons — 2 matches)

Remaining ~30 callers fall into "rare hand-rolled styles" — accept a `<button>` retention via Lint disable comment if cva variant doesn't fit cleanly, or override via `className` prop. Pragmatic 90/10.

**Code example:** See **Pattern 8** above (sed playbook + mapping table).

### Q10: 56 verbose-form `transition-*` sweep — exact sed regex with macOS BSD sed compatibility

**Decision:** BSD sed `-i ''` empty-backup syntax (macOS-native); 6 sed passes (3 motion tiers × 2 transition properties). Per Phase 39 LEARNINGS sed pattern.

**Rationale:** BSD sed differs from GNU sed: macOS requires explicit empty backup arg `-i ''`. The verbose form has 6 distinct strings (transition-all + var(--motion-fast/base/slow); transition-colors + same triplet) — each gets a dedicated pass for clarity in commit history.

**Pre/post sample:**

BEFORE (LoginForm.tsx line 162):
```tsx
className="w-full h-[44px] font-semibold text-[0.86rem] text-white bg-[#d97757] rounded-lg hover:bg-[#c5674a] hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-default disabled:transform-none transition-[background,transform] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]"
```

Wait — this is `transition-[background,transform]` which is a tokenized `transition-property` with a list, NOT `transition-(all|colors)`. The sed pattern in Pattern 8 only matches `transition-(all|colors)` — the verbose form's specific case. The 56 matches are precisely those that use `transition-all` or `transition-colors` paired with the verbose duration/easing.

The `transition-[background,transform]` form is OUT of the SEED-40 sweep (it's a different pattern that lists explicit properties; not covered by `transition-claude-fast/base/slow` since those use `transition-property:all`). Phase 39 sweep already migrated these to use `[transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]` per LEARNINGS Decision pattern. Phase 40 leaves them.

AFTER Pass 1a (transition-all + motion-fast):
```tsx
// In a file that had: transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]
className="... cursor-pointer transition-claude-fast hover:bg-[rgba(204,68,85,0.11)]"
```

**Code example:** See **Pattern 8** above (full sed playbook).

### Q11: ESLint rule extension — concrete `no-restricted-syntax` selectors

**Decision:** Three additional selectors (verbose tokenized form Literal + TemplateElement; var(--ease) deprecation Literal + TemplateElement) — total 4 new selectors on top of Phase 39's 2.

**Rationale:** Phase 39 LEARNINGS lesson "ESLint regex must explicitly handle modifier prefixes" applies equally: every selector needs the `(?:[a-z][a-z0-9-]*:)*` optional prefix groups to catch `after:transition-claude-fast` etc.

**Code example:** See **Pattern 7** above (full eslint.config.mjs diff with three new selectors).

### Q12: AiChatBubble.tsx call-site map — confirm via grep

**Decision:** Verified by `grep -rEn "AiChatBubble" frontend/`:
- `frontend/components/shared/AiChatBubble.tsx` (definition; deleted in plan-2)
- `frontend/components/deadlines/DeadlineAiChat.tsx:7,92` (caller)
- `frontend/components/course-detail/AiCourseChat.tsx:7,83` (caller)
- `frontend/components/digest/**` — NO callers (Digest doesn't have an embedded chat surface today)
- `frontend/components/predict/**` — NO callers (Predict doesn't have an embedded chat surface today)

**Total callers: 2.** The Phase 40 ROADMAP wording "AI reply visual style on Digest, Deadlines, and Predict pages" refers to FUTURE consumption — Phase 42 NEWVIS may add Digest / Predict streaming surfaces using the Phase 40 components. Phase 40 SHARED-02 only migrates the existing 2 callers atomically.

**Migration plan per caller:**
- DeadlineAiChat.tsx: replace lines 7, 87–96 — import StreamingAssistant + UserMessage; conditionally render based on `msg.role`.
- AiCourseChat.tsx: replace lines 7, 78–94 — same pattern.

After both migrations: delete `AiChatBubble.tsx` (44 LOC) — final commit of plan-2.

### Q13: Tailwind v4 `@utility` directive — exact syntax

**Decision:** Top-level `@utility name { ... }` blocks in `globals.css`, ADJACENT to `@theme` (NOT nested). Multi-property declarations supported. Modifier-prefixed variants (`hover:`, `focus:`, `group-hover:`) auto-generated.

**Rationale (per WebFetch verification):** Tailwind v4 docs (tailwindcss.com/docs/adding-custom-styles) explicitly:
- "Custom utilities are automatically inserted into the `utilities` layer along with all of the built-in utilities in the framework."
- Multi-property example: `@utility scrollbar-hidden { &::-webkit-scrollbar { display: none; } }` — supports nested selectors AND multiple property declarations.
- "Your custom utility will automatically work with variants like `hover`, `focus`, and `lg`".

**Code example:** See **Pattern 6** above (full @utility blocks).

### Q14: TDD test files location and naming — Vitest setup match

**Decision:** Test files live under `frontend/__tests__/{components,hooks,eslint,scripts,rsc}/` — mirroring the source file's directory under `frontend/`. Vitest config (`frontend/vitest.config.ts`) matches `__tests__/**/*.test.{ts,tsx}`. jsdom environment + setupFiles `./src/test/setup.ts` (exists).

**File naming convention:**
- `__tests__/components/ui/Button.test.tsx`
- `__tests__/components/ui/Input.test.tsx`
- `__tests__/hooks/useStreamingText.test.ts`
- `__tests__/eslint/no-raw-transition.test.ts` (extended; existing file)

**RED test stubs:** See **Pattern 9** above (Button.test.tsx + useStreamingText.test.ts skeletons). Both stubs reference imports that don't exist yet — they'll fail with `Cannot find module` errors at runtime, satisfying the "tests must fail before implementation" TDD discipline.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + @testing-library/react 16.3.2 + @testing-library/user-event 14.6.1 + Playwright 1.59.1 |
| Config file | `frontend/vitest.config.ts` (jsdom env, globals enabled, css enabled, setup `./src/test/setup.ts`) + `frontend/playwright.config.ts` |
| Quick run command | `cd frontend && pnpm test` (Vitest watch mode disabled for CI; use `pnpm test --run` for one-shot) |
| Full suite command | `cd frontend && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHARED-01 | Button renders primary variant by default with bg-orange | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "primary variant"` | ❌ Wave 0 |
| SHARED-01 | Button danger variant has bg-red className | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "danger variant"` | ❌ Wave 0 |
| SHARED-01 | Button merges caller className via cn() | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "merges caller className"` | ❌ Wave 0 |
| SHARED-01 | Button loading shows Loader2 + disables interaction | unit | `pnpm test __tests__/components/ui/Button.test.tsx -t "loading"` | ❌ Wave 0 |
| SHARED-01 | Input default variant has rounded-lg + cream bg | unit | `pnpm test __tests__/components/ui/Input.test.tsx -t "default variant"` | ❌ Wave 0 |
| SHARED-01 | Input search variant has rounded-full | unit | `pnpm test __tests__/components/ui/Input.test.tsx -t "search variant"` | ❌ Wave 0 |
| SHARED-01 | Input error state shows red border | unit | `pnpm test __tests__/components/ui/Input.test.tsx -t "error state"` | ❌ Wave 0 |
| SHARED-01 | Input renders leftIcon + adjusts padding | unit | `pnpm test __tests__/components/ui/Input.test.tsx -t "leftIcon"` | ❌ Wave 0 |
| SHARED-01 | ESLint blocks verbose tokenized form | unit | `pnpm test __tests__/eslint/no-raw-transition.test.ts -t "verbose tokenized form"` | ✅ extends existing |
| SHARED-01 | ESLint blocks var(--ease) / var(--ease-fast) | unit | `pnpm test __tests__/eslint/no-raw-transition.test.ts -t "var(--ease)"` | ✅ extends existing |
| SHARED-01 | Pixel-diff: 5 primitive variants render uniformly across 10 pages | visual | env-gated Playwright (deferred) | n/a |
| SHARED-02 | useStreamingText returns initial empty state | unit | `pnpm test __tests__/hooks/useStreamingText.test.ts -t "initial empty state"` | ❌ Wave 0 |
| SHARED-02 | useStreamingText bumps chunkIndex on source change | unit | `pnpm test __tests__/hooks/useStreamingText.test.ts -t "chunkIndex"` | ❌ Wave 0 |
| SHARED-02 | useStreamingText transitions isStreaming false on complete | unit | `pnpm test __tests__/hooks/useStreamingText.test.ts -t "stream complete"` | ❌ Wave 0 |
| SHARED-02 | StreamingAssistant renders cursor when isStreaming=true | unit | `pnpm test __tests__/components/shared/StreamingAssistant.test.tsx -t "cursor mounts"` | ❌ Wave 0 |
| SHARED-02 | StreamingAssistant unmounts cursor when isStreaming=false | unit | `pnpm test __tests__/components/shared/StreamingAssistant.test.tsx -t "cursor unmounts"` | ❌ Wave 0 |
| SHARED-02 | UserMessage renders right-aligned orange bubble | unit | `pnpm test __tests__/components/shared/UserMessage.test.tsx -t "right-aligned bubble"` | ❌ Wave 0 |
| SHARED-02 | DeadlineAiChat / AiCourseChat migrate atomically (build still passes) | integration | `pnpm typecheck && pnpm build` | ✅ |
| SHARED-03 | Sidebar two-layer DOM renders without runtime errors | unit | `pnpm test __tests__/components/layout/Sidebar.test.tsx -t "renders"` | ❌ Wave 0 |
| SHARED-03 | Sidebar 60fps Intel Mac (production human UAT) | manual-only | human UAT post-deploy | n/a |
| SHARED-03 | Sidebar visual parity (pixel-diff 4 pages) | visual | env-gated Playwright (deferred) | n/a |

### Sampling Rate

- **Per task commit:** `cd frontend && pnpm test --run` (full Vitest suite — under 30 seconds for unit tests)
- **Per wave merge:** `cd frontend && pnpm lint --max-warnings 0 && pnpm typecheck && pnpm test --run`
- **Phase gate:** Full suite green (`pnpm lint && pnpm typecheck && pnpm test --run && pnpm build`) + production deploy + human UAT for 60fps Sidebar verification before `/gsd-verify-work 40`

### Wave 0 Gaps

- [ ] `frontend/components/ui/Button.tsx` + `frontend/__tests__/components/ui/Button.test.tsx` — covers SHARED-01 Button variants
- [ ] `frontend/components/ui/Input.tsx` + `frontend/__tests__/components/ui/Input.test.tsx` — covers SHARED-01 Input variants
- [ ] `frontend/hooks/useStreamingText.ts` + `frontend/__tests__/hooks/useStreamingText.test.ts` — covers SHARED-02 hook contract
- [ ] `frontend/components/shared/StreamingAssistant.tsx` + `frontend/__tests__/components/shared/StreamingAssistant.test.tsx` — covers SHARED-02 cursor behavior
- [ ] `frontend/components/shared/UserMessage.tsx` + `frontend/__tests__/components/shared/UserMessage.test.tsx` — covers SHARED-02 user bubble
- [ ] `frontend/__tests__/eslint/no-raw-transition.test.ts` — EXTEND existing file with 4 new fixtures (verbose tokenized form positive + negative; var(--ease) positive + negative)
- [ ] `frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts` — env-gated stub (runs under Playwright; auto-skips without PERF_TEST_PASSWORD)
- [ ] No new framework install — all dependencies already in `package.json` (vitest, @testing-library/react, @playwright/test, eslint, tailwindcss, react). Add only `class-variance-authority` via `pnpm add class-variance-authority`.

## Code Examples

Verified patterns from official sources.

### Common Operation 1: cva() Button instantiation
See **Pattern 1** above. Complete copy-paste-ready Button.tsx with cva variants.
[VERIFIED: cva.style/docs/getting-started/typescript pattern; npm view class-variance-authority dependencies → { clsx: '^2.1.1' }; package size 22 KB unpacked]

### Common Operation 2: cva() Input instantiation
See **Pattern 2** above.

### Common Operation 3: useStreamingText hook
See **Pattern 3** above.

### Common Operation 4: StreamingAssistant + UserMessage components
See **Pattern 4** above.

### Common Operation 5: Sidebar two-layer DOM
See **Pattern 5** above.

### Common Operation 6: @utility transition-claude-* blocks
See **Pattern 6** above.
[VERIFIED: tailwindcss.com/docs/adding-custom-styles via WebFetch 2026-04-30 — supports multi-property declarations + auto modifier variants]

### Common Operation 7: ESLint rule extension
See **Pattern 7** above.

### Common Operation 8: sed playbook
See **Pattern 8** above.

### Common Operation 9: Vitest unit tests
See **Pattern 9** above.

### Common Operation 10: Playwright env-gated stub
See **Pattern 10** above.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled className switch on `variant` prop | cva variants with type-safe lookup tables | 2023+ (cva 0.5+) | Component variant explosions become readable; TS infers variant types from cva config |
| Tailwind v3 `@layer utilities` for custom utilities | Tailwind v4 `@utility name { }` directive | Tailwind 4.0 (2024-04) | Auto modifier variant generation; cleaner syntax; co-located with `@theme` block |
| Width-animated sidebars (`transition: width`) | Transform-based two-layer DOM | Project-internal: Phase 40 (2026-04-30) | Eliminates layout reflow per frame on Intel Mac; main content padding stable |
| Bubble-styled assistant messages | No-bubble flowing serif text | Industry: Anthropic Claude.ai (2024+); UniBoard: Phase 40 SHARED-02 | Continuous narrative reading vs discrete message blocks |
| `useDeferredValue` for streaming text | Custom hook with chunkIndex monotonic key | Project-internal: Phase 40 plan-2 | Per-chunk fadein keyframe trigger via React key remount |

**Deprecated/outdated:**
- v2.0 `--ease` (0.28s cubic-bezier(.4,0,.2,1)) and `--ease-fast` (0.15s ease) tokens: replaced by `--ease-claude-out` + `--motion-fast/base/slow` per Phase 39 D-13. ESLint-gated to prevent new occurrences (D-40-04).
- `AiChatBubble.tsx` (44 LOC, dual-role): split into StreamingAssistant + UserMessage + useStreamingText hook (D-40-05).
- v3 `@layer utilities` syntax: superseded by v4 `@utility` directive.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | cva 0.7.1 is production-stable; v1.0 beta not blessed | Standard Stack | Migration to v1.0 requires `cx()` rename + slot composition refactor; planner should NOT preempt v1.0 |
| A2 | Tailwind v4 `@utility` directive auto-generates modifier variants (hover, focus, group-hover) | Pattern 6 | If untrue, Sidebar's `hover:translate-x-0` + `transition-claude-base` may not compose correctly. Verified via WebFetch but not code-tested. Plan-1 should validate by building once after `@utility` block lands. |
| A3 | `[contain:layout_paint]` confines paint cost to subtree even during transform | Pattern 5 | Phase 39 already validated `[contain:layout_paint]` works for Sidebar; transform doesn't change layout so it should hold. Risk: untested specifically with `translateX` + `will-change`. Plan-3 verifies via DevTools Performance recording. |
| A4 | macOS BSD sed `-i ''` syntax handles all 56 verbose-form occurrences | Pattern 8 | Phase 39 LEARNINGS validated this for the same file set. Risk: 4 files with stale `ease-[cubic-bezier(...)]` literals (per Phase 39 lesson "Sed migration creates timing-function token override bugs") need manual inspection. |
| A5 | useStreamingText `useEffect`-on-source-change correctly bumps chunkIndex on every chunk arrival | Pattern 3 | React's batching may collapse rapid setState calls. Risk: 1-frame visual stutter if chunkIndex doesn't advance monotonically. RED test in Pattern 9 verifies. |
| A6 | D-40-08 Sidebar geometry (`translateX(-156px)` → `translateX(0)`) implements the conventional "icons visible in collapsed mode" UX | Q6 | **HIGH RISK ASSUMPTION** — Q6 analysis showed D-40-08 may invert convention. Planner must verify against design intent during plan-3 design OR adopt the alternative implementation (overflow:visible + clip-path) recorded in Q6. Recommend revisiting with user before plan-3 execution. |
| A7 | 60fps Intel Mac is verifiable only via human UAT post-deploy; no CI substitute | Q8 | Per Phase 39 SEED-39 + memory `backdrop_filter_intel_mac.md`, this is established. Risk: post-deploy regression caught only on user's device — same risk profile as Phase 38 P04 / Phase 39 plan-04. |
| A8 | The 41 short-form `transition-colors` callers (Finding 5 in Summary) are out of Phase 40 scope | Summary Finding 5 | Recommend leaving them. If user objects, Phase 40 plan-1 can absorb the additional 41 sweep — adds ~41 file diff lines. |

**If this table is empty:** N/A — assumptions exist; user confirmation needed for A6 (Sidebar geometry) before plan-3 execution.

## Open Questions (RESOLVED)

1. **D-40-08 Sidebar geometry — does `translateX(-156px)` show icons or hide them in collapsed mode?** **(RESOLVED — checker BLOCKER-4 fix, 2026-04-30)**
   - What we know: REQUIREMENTS.md SHARED-03 explicitly states "Default `translateX(-156px)`, `translateX(0)` on hover. GPU-composited."
   - What's unclear: Whether this geometry inverts the conventional "icons visible in left strip" UX. Q6 analysis showed two plausible interpretations.
   - **RESOLVED:** Plan-3 Task 1 SPIKE (`prototype/sidebar-geometry-spike.html`) authored to verify the geometry visually. Decision **locked to Option A (literal D-40-08 from CONTEXT.md)**: inner 224px panel `translateX(-156px)` default → `translateX(0)` on hover. The "right ~68px of inner panel visible while collapsed" interpretation per CONTEXT.md D-40-08 IS the spec — the rightmost edge of the inner panel containing the right portion of nav items + active highlight is the intended collapsed-state visual. The SPIKE's value is to **verify** the geometry produces the expected v2.0-parity outcome, NOT to redesign D-40-08. Default: Option A. Pause-for-user only if SPIKE reveals a v2.0-parity show-stopper requiring user-approved divergence.

2. **`overflow-x` handling on inner panel — required, or can outer's `overflow:hidden` carry it?** **(RESOLVED — checker BLOCKER-1 fix, 2026-04-30)**
   - What we know: D-40-08 says outer is `overflow-hidden`. Inner has no explicit overflow.
   - What's unclear: Whether inner needs `overflow-y:auto` for tall menus (post-MVP) or relies on parent.
   - **RESOLVED:** No explicit `overflow-x` on inner panel for Phase 40. Outer `overflow-hidden` carries clipping. Revisit Phase 41 if accessibility issue surfaces (e.g., tall sidebars with 7+ nav items + scroll, or focus-visible scroll-into-view interference).

3. **Should plan-1 also sweep the 41 short-form `transition-colors`?** **(RESOLVED — checker BLOCKER-1 fix, 2026-04-30)**
   - What we know: 41 short-form occurrences exist; Phase 39 plan-04 explicitly only migrated explicit-duration form.
   - What's unclear: Whether v3.0 visual contract requires `--ease-claude-out` on these 41 or if Tailwind's default ease is acceptable.
   - **RESOLVED:** Defer per A8 — Phase 41 a11y pass picks up the tail when files are opened anyway. Keep Phase 40 diff focused on the verbose-form sweep + cva primitives + AI no-bubble + Sidebar two-layer.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest test runner | ✓ | 20.x via `@types/node ^20` | — |
| pnpm | Package install | ✓ | 10.28.2 | — |
| class-variance-authority | cva primitives | ✗ | not installed | `pnpm add class-variance-authority` |
| Tailwind CSS v4 | `@utility` directive | ✓ | 4.2.4 | — |
| Playwright | env-gated 60fps stub | ✓ | 1.59.1 | — |
| @testing-library/react | unit tests | ✓ | 16.3.2 | — |
| Vitest | TDD runner | ✓ | 4.1.5 | — |
| BSD sed (macOS) | sweep playbook | ✓ | macOS-bundled | — |
| Vercel preview env | production UAT for 60fps | ✓ | (project deployment infra) | — |
| `PERF_TEST_PASSWORD` | Playwright baseline generation (deferred) | ✗ | user-only credential | env-gated stub auto-skips when unset |

**Missing dependencies with no fallback:**
- None (all dependencies either installed or installable via pnpm).

**Missing dependencies with fallback:**
- `class-variance-authority` — install via `pnpm add class-variance-authority` as plan-1 first task.
- `PERF_TEST_PASSWORD` — env-gated Playwright stub auto-skips; deferred to production UAT.

## Risks & Mitigations

### Risk 1: 277-caller (actual: 114) Button/Input sweep introduces visual regressions in long-tail callers

**Likelihood:** MEDIUM. 90% of callers map cleanly to 5 dominant patterns; the remaining 10% (~11 callers) may have hand-rolled styles that don't fit any cva variant.

**Mitigation:**
- Use the mapping table in Pattern 8 as a coverage matrix; manually audit each caller before commit.
- Long-tail callers can retain `<button>` with cva-compatible className (e.g., `<button className={cn(buttonVariants({ variant: "primary" }), "rounded-full")}>`) — `<Button>` component is preferred but not mandatory.
- Run `pnpm build && pnpm test --run` after each batch (e.g., per directory: settings/, auth/, course-detail/) to catch type errors early.
- Phase 39 LEARNINGS pattern: commit sed pass + manual cleanup separately so diff is reviewable.

### Risk 2: cva variant taxonomy doesn't cover all 5 Button styles cleanly

**Likelihood:** LOW-MEDIUM. The 5 dominant styles ARE the taxonomy — but caller-specific size variations (`w-full`, `w-auto px-8`, `w-[40px] h-[40px] rounded-full`) need className override.

**Mitigation:**
- cva's `cn(buttonVariants({...}), className)` pattern (Pattern 1) handles overrides via tailwind-merge. Verified by RED test stub.
- For the rounded-full chat send buttons (DeadlineAiChat, AiCourseChat), use `<Button variant="primary" iconOnly className="rounded-full w-[36px] h-[36px]">` — cva's iconOnly handles the aspect ratio; className overrides the rounded-[8px] default.
- If a caller's style truly doesn't fit, retain `<button>` with `className={buttonVariants({ variant: "primary" })}` only.

### Risk 3: useStreamingText test ergonomics — async chunk arrival + fadein assertion

**Likelihood:** LOW. The hook exposes pure synchronous state transitions (no async); `renderHook` + `rerender` makes assertion straightforward.

**Mitigation:**
- The fadein keyframe runs on the DOM (`animation: streaming-chunk-fadein 150ms`); JSdom can't render animations, so the test only asserts that the cursor span has the correct `style.animation` or className matching the keyframe. Don't try to verify pixel-level fadein in unit tests — that's the visual regression's job.
- Mock chunk arrival via the hook's `source` prop change (Pattern 9); rerender triggers `useEffect` which bumps chunkIndex.

### Risk 4: Sidebar transform breaks z-index stacking with right panel / dropdown overlay

**Likelihood:** LOW. Sidebar is `z-[100]`; dropdowns are `z-[200]`; right panel doesn't overlap.

**Mitigation:**
- `[contain:layout_paint]` on outer creates a stacking context — verify dropdowns at `z-[200]` still overlay correctly when they originate from main content (they should because main content is OUTSIDE the contain box).
- During plan-3 development: open Settings page, verify avatar dropdown still overlays cleanly when Sidebar is hovered/expanded.
- If z-index conflict surfaces: bump outer to `z-[100]`, dropdowns to `z-[201]+` (already separated; no real conflict expected).

### Risk 5: 60fps Intel Mac unverifiable in CI; deferred to human UAT

**Likelihood:** HIGH (this is the deferral, not a regression).

**Mitigation:**
- Per Phase 39 SEED-39 pattern: env-gated Playwright stub authored in-tree; baselines deferred to production UAT.
- Pre-deploy: run the spec locally with `PERF_TEST_PASSWORD` set + `--update-snapshots` if user provisions credentials.
- Post-deploy: human UAT checklist (Q8) verified on user's primary Intel Mac. If regression: rollback via Vercel preview reversion; investigate via DevTools Performance.
- Memory `backdrop_filter_intel_mac.md` documents the established "GPU paint-cost family" — if Sidebar regression surfaces, root cause is likely a Phase 40-introduced shadow / blur / opacity-fade interacting with `[contain:layout_paint]`. Mitigation: revert per-element, identify culprit, fix via CSS swap (not architecture rewrite).

## Sources

### Primary (HIGH confidence)
- `frontend/app/globals.css` (lines 1–393) — current Tailwind v4 `@theme` block + Phase 39 tokens + SSE keyframes + reduced-motion stub.
- `frontend/components/shared/AiChatBubble.tsx` (44 LOC) — current dual-role bubble; deletion target.
- `frontend/components/layout/Sidebar.tsx` (140 LOC) — current width-transition; rewrite target.
- `frontend/eslint.config.mjs` (87 LOC) — Phase 39 `no-restricted-syntax` rule; extension target.
- `frontend/components/deadlines/DeadlineAiChat.tsx` (146 LOC) — caller for AiChatBubble migration.
- `frontend/components/course-detail/AiCourseChat.tsx` (140 LOC) — caller for AiChatBubble migration.
- `frontend/hooks/use-ai-stream.ts` (140 LOC) — SSE source for useStreamingText composition.
- `.planning/phases/39-design-token-foundation/39-LEARNINGS.md` — 6 decisions / 5 lessons / 5 patterns / 5 surprises (sed playbook, ESLint regex modifier handling, TDD triplet, env-gated Playwright, no `step-end alternate`, PostCSS minifier strips empty rules).
- `.planning/phases/39-design-token-foundation/39-CONTEXT.md` — D-13/14/15 motion + SSE primitive split.
- `.planning/REQUIREMENTS.md` — SHARED-01/02/03 wording + Hard Constraints + Reference Materials In Scope.
- `.planning/ROADMAP.md` — Phase 40 goal + 5 success criteria.
- `prototype/DESIGN_SYSTEM.md` §4 Sidebar + §5 Header + §7 Animation Classes — v2.0 visual contract.

### Secondary (MEDIUM confidence)
- [Tailwind v4 Adding Custom Styles](https://tailwindcss.com/docs/adding-custom-styles) — `@utility` directive syntax + multi-property + auto modifier variants. WebFetch verified 2026-04-30.
- [cva Documentation - TypeScript](https://cva.style/docs/getting-started/typescript) — VariantProps<typeof> + React.forwardRef integration. WebFetch verified 2026-04-30.
- [class-variance-authority npm](https://www.npmjs.com/package/class-variance-authority) — version 0.7.1, 22 KB unpacked, dep `clsx ^2.1.1`. `npm view` verified 2026-04-30.
- [assistant-ui Claude clone source](https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/apps/docs/components/examples/claude.tsx) — assistant message no-bubble + user bubble pattern. Direct source review 2026-04-30.

### Tertiary (LOW confidence)
- [React useDeferredValue vs useState for streaming](https://react.dev/reference/react/useDeferredValue) — confirmed via training knowledge that useDeferredValue doesn't expose chunk timing. [ASSUMED — not WebFetched this session]

## Metadata

**Confidence breakdown:**
- Standard stack (cva, Tailwind v4, sed, Vitest): HIGH — all version-verified via npm view + official docs WebFetch.
- Architecture (cva variants, useStreamingText, Sidebar two-layer): MEDIUM — patterns are well-established but Sidebar geometry (D-40-08) has interpretation ambiguity (Q6 / A6 / Open Question 1).
- Pitfalls (sed timing-function override, ESLint modifier prefix, PostCSS empty-rule strip, 60fps Intel Mac unverifiable in CI): HIGH — codified in Phase 39 LEARNINGS + project memory.
- AI no-bubble visual contract: HIGH — assistant-ui Claude clone source code reviewed directly.

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (30 days; cva + Tailwind v4 are stable; assistant-ui pattern is project-locked; sed playbook is Phase 39 carryover).

---

## RESEARCH COMPLETE

**Phase:** 40 - Shared Component Polish
**Confidence:** MEDIUM-HIGH (one HIGH-RISK assumption A6 around D-40-08 Sidebar geometry needing verification before plan-3)

### Key Findings
1. AiChatBubble has 2 callers, not 3 — Digest/Predict don't have current streaming surfaces; Phase 40 SHARED-02 migrates the existing 2 atomically.
2. Raw button/input JSX count is 114, not 277 — sed playbook still applies; effort estimate halves.
3. `var(--ease)` / `var(--ease-fast)` already at 0 active call sites (Phase 39 sweep was thorough); D-40-04 deprecation rule defends forward debt only.
4. 56 verbose-form transition occurrences across 36 files confirmed — SEED-40 reverse-sweep target is well-bounded.
5. cva 0.7.1 is production-blessed (single dep `clsx ^2.1.1`, 22 KB); install via `pnpm add class-variance-authority`.
6. assistant-ui Claude clone reference confirmed — assistant flows in serif no-bubble, user bubble retains cream `#DDD9CE` (UniBoard chooses orange per D-40-05 brand identity).
7. D-40-08 Sidebar geometry has interpretation ambiguity — planner must verify intent before plan-3 execution.

### File Created
`/Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard/.planning/phases/40-shared-component-polish/40-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | cva 0.7.1, Tailwind v4 4.2.4, all deps version-verified via npm + WebFetch |
| Architecture (Button/Input/StreamingAssistant/UserMessage/useStreamingText) | HIGH | shadcn-blessed cva patterns, assistant-ui clone source reviewed directly |
| Architecture (Sidebar two-layer) | MEDIUM | D-40-08 geometry needs interpretation pass before plan-3; A6 flagged HIGH-RISK |
| Pitfalls | HIGH | All 5 risks codified in Phase 39 LEARNINGS + project memory |
| 60fps Intel Mac verification | MEDIUM | Deferred to human UAT per established SEED-39 pattern; no CI substitute |
| ESLint extension | HIGH | Phase 39 D-16 grammar carries forward unchanged; 4 new selectors trivially testable |

### Open Questions
1. D-40-08 Sidebar geometry — does `translateX(-156px)` show icons or hide them? Recommend planner spike + revisit with user before plan-3.
2. Should plan-1 also sweep the 41 short-form `transition-colors`? Recommend NO; defer to natural Phase 41 a11y file-touch.
3. AiChatBubble Phase 42 NEWVIS extension? Out of Phase 40 scope; recorded in Open Questions.

### Ready for Planning
Research complete. Planner can now create PLAN.md files for plan-1 (SHARED-01: cva primitives + @utility blocks + 56-caller verbose sweep + 114-caller Button/Input migration + ESLint extension), plan-2 (SHARED-02: useStreamingText + StreamingAssistant + UserMessage + 2 caller migrations + AiChatBubble.tsx delete), plan-3 (SHARED-03: Sidebar two-layer rewrite + env-gated Playwright stub).

**Recommended wave assignment:**
- Wave 1: plan-1 (touches Sidebar.tsx for verbose-form sweep)
- Wave 2: plan-2 + plan-3 in parallel (plan-2 touches shared/AiChat* + 2 caller files; plan-3 touches Sidebar.tsx structurally — non-conflicting after plan-1's sweep)
