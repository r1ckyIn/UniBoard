# Phase 40: Shared Component Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 40-shared-component-polish
**Mode:** discuss (with `--analyze` flag — trade-off tables surfaced before each question)
**Areas discussed:** SHARED-01 primitive extraction scope, SHARED-01 deprecation strategy, SHARED-02 AI no-bubble migration, SHARED-03 Sidebar refactor

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| SHARED-01 原语提取范围 | No `frontend/components/ui/` exists; 277 raw `<button>`/`<input>` JSX usages. Decide: (A) abstract 5 primitives + migrate all callers, (B) token-route inline only, (C) abstract Button + Input only, (D) C + SEED-40 motion utility refactor | ✓ |
| SHARED-01 deprecation 策略 | D-14 named Phase 40 to deprecate v2.0 legacy `--ease`/`--ease-fast` (50+ callers). Decide: (A) full sweep this phase, (B) ESLint-gate new + retain alias, (C) defer entirely | ✓ |
| SHARED-02 AI 无气泡迁移路径 | AiChatBubble.tsx (44 LOC) is dual-role bubble component; 3 callers consume it. Decide: (A) replace entire component with StreamingAssistant + UserMessage, (B) add mode prop to AiChatBubble, (C) dual-track coexistence. Plus cursor behavior: end-inline vs independent line | ✓ |
| SHARED-03 Sidebar 重构方案 | Current `transition-[width]` + `[contain:layout_paint]` + 1px border (v2.0 micro-fix). Decide: (A) two-layer DOM transform-based (REQUIREMENTS recommended), (B) single-layer + will-change/content-visibility, (C) full rewrite with prefers-reduced-motion instant-toggle. Plus active highlight placement + reduced-motion handling sub-decisions | ✓ |

**User's choice:** All four selected (multiSelect).

---

## SHARED-01 — Primitive Extraction Scope

| Option | Description | Selected |
|--------|-------------|----------|
| A. 全量原语化 5 个 | Abstract `ui/{Button,Input,Modal,Tooltip,CardSection}.tsx`; migrate 277 callers; ~3 plans of work; high blast radius for visual regressions | |
| B. 仅令牌化（不抽原语） | Keep 277 inline `<button>`/`<input>` usages; unify padding/focus-ring/disabled className strings only; A11Y-01 Phase 41 picks up focus-ring | |
| C. 仅抽 Button + Input | Abstract Button + Input primitives only; Modal stays native `<dialog>` (2 callers); Tooltip not extracted; Card untouched (RoughCard hard constraint) | |
| **D. C + SEED-40 fold** | C + Tailwind v4 `@utility transition-claude-fast/base/slow` blocks; reverse-sweep 56 verbose-form occurrences across 36 files; ESLint rule extension | ✓ |

**User's choice:** D — Button+Input primitives + SEED-40 motion utility refactor folded in
**Rationale captured:** Avoids duplicate className sweeps in two phases (Button/Input migration + SEED-40 reverse-sweep both touch the same 36+ files). SEED-40's effort estimate (~1.5h) is small enough to fold here; the seed's own trigger conditions named Phase 40 SHARED-01 as the natural fit.

---

## SHARED-01 — API Style

| Option | Description | Selected |
|--------|-------------|----------|
| **极简 + cva** | `<Button variant size loading iconOnly?>` + `<Input variant leftIcon? rightIcon? error?>`; class-variance-authority (~1.5kb, type-safe variant binding); no Radix; AI-agent / human-written className override-friendly via `cn()` | ✓ |
| 手写 union types | `'primary'\|'secondary'\|...` switch inside component; zero deps; switch logic balloons when size+variant combinations grow | |
| shadcn 全套（cva + Radix） | asChild + Slot polymorphism; Radix peer-dep cascade; underutilized if Modal/Tooltip aren't extracted | |
| Hook-based useButtonStyles | Caller writes raw `<button>` + applies hook className; minimal disruption; doesn't actually extract a primitive | |

**User's choice:** 极简 + cva
**Rationale captured:** Primitive extraction without ecosystem entanglement; cva variants compose with `cn()` at call site for additional className overrides.

---

## SHARED-01 — Deprecation Strategy (v2.0 legacy --ease / --ease-fast)

| Option | Description | Selected |
|--------|-------------|----------|
| **B. ESLint 拦截 + alias 保留** | `no-restricted-syntax` blocks new `var(--ease)` / `var(--ease-fast)` occurrences; existing 50+ callers swept naturally as SHARED-02/03 touches files; Phase 41 a11y pass picks up tail; alias retention in globals.css | ✓ |
| A. 本 phase 全量 sweep | 50+ occurrences of `var(--ease)` / `var(--ease-fast)` swept to `var(--motion-base)` + `var(--ease-claude-out)`; alias removed from globals.css; one-shot resolution but introduces 30ms cumulative duration shifts × 50 sites → potential perceptible visual regression | |
| D. sweep + alias retain | A's sweep with alias kept as fallback; same workload as A with extra safety net | |
| C. 完全延后 | v2.0 alias permanent retention; deprecation indefinitely deferred | |

**User's choice:** B — ESLint-gate new occurrences, retain alias, sweep opportunistically
**Rationale captured:** Mirrors Phase 39's conservative D-14 stance ("lock new debt at the rule layer, retire old debt opportunistically when phases touch the file anyway"). Avoids visual regression risk from cumulative 30ms shifts across 50 callers.

---

## SHARED-02 — AI No-Bubble Migration Path

| Option | Description | Selected |
|--------|-------------|----------|
| **A. 替换 AiChatBubble** | Delete `shared/AiChatBubble.tsx` (44 LOC); new `shared/StreamingAssistant.tsx` (no-bubble, left-aligned, Source Serif 4) + `shared/UserMessage.tsx` (right-aligned, orange bubble retained) + `hooks/useStreamingText.ts`; 3 callers migrate atomically | ✓ |
| B. AiChatBubble + variant prop | `<AiChatBubble variant="bubble"\|"flowing">`; assistant role defaults to flowing; lowest migration cost; cons: internal mode-branching couples user-bubble + assistant-flowing into one component with non-orthogonal variant matrix | |
| C. 双轨并存 | Keep AiChatBubble for user role; new `<StreamingAssistant>` independent; callers compose `<UserBubble>` + `<StreamingAssistant>` themselves; flexible but caller wiring is per-page bespoke | |
| Cursor 行为补充 | (Not a separate selection; default end-inline trailing cursor unless user provides Other override) — terminal-style trailing block per assistant-ui Claude Clone reference | (default) |

**User's choice:** A — replace AiChatBubble entirely
**Rationale captured:** Clean API; avoids long-term internal mode branching in AiChatBubble; user/assistant visual asymmetry (user bubble + assistant flowing) is deliberately preserved per assistant-ui Claude Clone reference. Cursor is end-inline per default — terminal-style, matches Claude.ai web behavior.

---

## SHARED-03 — Sidebar Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| **A. 双层 transform; Active 在内层; reduced-motion 交 Phase 41** | REQUIREMENTS-recommended approach. Outer 68px layout occupier; inner 224px panel `translateX(-156px)` ↔ `translateX(0)` on hover. Active highlight on inner panel nav items (collapsed state shows right ~half of highlight). Phase 41 A11Y-05 owns reduced-motion globally | ✓ |
| A + 外层横贯 Active | Active highlight rendered as full-width band on outer 68px collapsed strip; hover-expand reveals inner panel highlight on top; double-source-of-truth maintenance | |
| A + reduced-motion 本 phase 含 | Two-layer transform + Phase 40 includes `@media (prefers-reduced-motion: reduce)` block setting transition-duration to 0s; pulls Phase 41 A11Y-05 sidebar fragment forward; +0.3 plan | |
| B. 单层 transform | Keep single `<aside>` but switch to `transform: translateX()` + negative margin; smaller diff; cons: main content + sidebar negative offset × hover-toggle z-index logic less clean than two-layer; deviates from backlog 999.1 recommended approach | |

**User's choice:** A — two-layer DOM, active on inner panel, reduced-motion deferred to Phase 41
**Rationale captured:** REQUIREMENTS.md SHARED-03 explicitly recommended this architecture. Single inner-panel highlight rendering keeps visual contract uniform across collapsed/expanded states. Phase 41 already owns A11Y-05 (`prefers-reduced-motion` honored — global pass); pulling Sidebar's reduced-motion override forward fragments the a11y work.

---

## Final Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| **写 CONTEXT 并提交** | Decisions complete; generate 40-CONTEXT.md + 40-DISCUSSION-LOG.md; commit; route to /gsd-plan-phase 40 | ✓ |
| 探讨更多灰色地带 | Plan ordering / wave parallelism, test strategy (visual regression vs RTL unit), 60fps verification approach, cross-phase patterns extraction, UI-SPEC.md generation timing | |
| 深挖其中一个已论区域 | SHARED-01 migration mechanism / SHARED-02 cursor interaction / SHARED-03 active highlight detail | |

**User's choice:** 写 CONTEXT 并提交

---

## Claude's Discretion

Items where the user explicitly deferred or where decisions are mechanical implementation details:

- 277-callers + 56-callers className sweep tooling (sed playbook, jscodeshift, manual per-file) — Phase 39 LEARNINGS established sed sufficiency; planner picks per task scope.
- Specific cva variants enum and class-string per variant — token-bound but exact final strings are planner-time fine-tuning.
- `useStreamingText` internal state machine — `useDeferredValue` vs incremental `useState` setter vs reducer; planner picks based on test ergonomics.
- Sidebar inner panel z-index, exact absolute-positioning anchor (`inset-y-0 left-0` vs `top-0 bottom-0 left-0`), and overflow-x handling.
- Whether to bundle SEED-39 closure procedure (Playwright baseline generation) into plan-3 visual regression task or keep independent.
- Whether `disabled` state on Button uses `aria-disabled` (focusable, screen-reader announced) vs HTML `disabled` (excluded from tab order) — planner picks; A11Y-03 (Phase 41) is canonical owner.

---

## Deferred Ideas

Ideas raised during discussion that were noted for future phases:

- Modal / Tooltip primitive extraction — only 2 modal callers; no existing tooltip implementation; defer to Phase 42 NEWVIS or future v3.x.
- Card-section sub-primitive (CardHeader/CardBody/CardFooter) — defer to v3.1 if pattern stabilizes.
- shadcn CLI ecosystem adoption — rejected for Phase 40 (D-40-13); revisit in v4.0+ if mobile/PWA migration introduces complexity benefiting from shadcn's primitive coverage.
- `useStreamingText` migration to React Server Components / Suspense — v4.x consideration.
- Sidebar keyboard navigation (Esc to collapse, focus management on hover-expand) — Phase 41 A11Y-04.
- `prefers-reduced-motion` instant-toggle for Sidebar — Phase 41 A11Y-05.
- Visual regression Playwright baseline generation — same env-gated stub pattern as Phase 39 SEED-39; production visual UAT closes baseline gap.
- shadcn/theme/claude direct theme adoption — Phase 39 confirmed palette divergence; UniBoard's own oklch tokens preserved.
- TypeScript-typed token module (`tokens.ts`) — continue deferring to v4.0+.
