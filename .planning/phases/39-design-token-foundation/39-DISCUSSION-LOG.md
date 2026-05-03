# Phase 39: Design Token Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 39-design-token-foundation
**Areas discussed:** Color token architecture; brand-guidelines font SSOT tension; Phase 39 vs 40 migration boundary; Motion naming + SSE primitive scope
**Mode:** `--analyze` (trade-off tables presented before each question)

---

## Area 1 — Color token architecture

### Q1.1 oklch ↔ hsl fallback mechanism

| Option | Description | Selected |
|---|---|---|
| A. `@supports` branch | `:root` sets oklch; `@supports not (color: oklch())` block sets hsl with same names. Browser native fallback, zero build deps. | ✓ |
| B. Dual-name tokens | `--color-orange` = oklch, `--color-orange-fallback` = hsl. Downstream needs explicit fallback ordering. | |
| C. All-token dual values | Each call site writes `oklch(...) hsl(...)`. CSS not natively supported, Tailwind v4 doesn't parse. | |

**User's choice:** A.
**Notes:** Zero downstream awareness — token name single-source.

### Q1.2 Source of oklch values

| Option | Description | Selected |
|---|---|---|
| A. Hex convert + comment source | culori.js / oklch.com from v2.0 hex; CSS comments cite source. | ✓ |
| B. shadcn/theme/claude lift | Direct copy. Risk: ΔE > 1.0 vs UniBoard hex. | |
| C. Manual ΔE < 1.0 tweak | Highest fidelity but human-intensive. | |

**User's choice:** A.

### Q1.3 Dark mode reservation depth

| Option | Description | Selected |
|---|---|---|
| A. Empty selector + naming convention doc | Empty `[data-theme="dark"] {}` + doc; Phase 43 fills values. | ✓ |
| B. A + 1 sample token | Adds one example for Phase 43 reference. | |
| C. No reservation | Phase 43 starts from scratch — refactoring overhead. | |

**User's choice:** A.

### Q1.4 Token file organization

| Option | Description | Selected |
|---|---|---|
| A. globals.css `@theme` block | v2.0 pattern, zero migration. | ✓ |
| B. Separate tokens.css | Concerns separated; needs Tailwind v4 import verification. | |
| C. tokens.ts + sync | Type-safe; multi-system overhead. | |

**User's choice:** A.

---

## Area 2 — brand-guidelines font SSOT tension

### Q2.1 Font SSOT conflict resolution

| Option | Description | Selected |
|---|---|---|
| A. Keep v2.0 fonts; brand color-only SSOT | Source Serif 4 + Inter unchanged; CSS comment notes brand-guidelines is for PPT/Doc. | ✓ (after clarification) |
| B. Switch to Poppins / Lora | Faithful to brand-guidelines literal; overturns Phase 1 + 103 prototype iterations. | (initially picked, reverted) |
| C. Compromise: Source Serif 4 + Lora | Lora is serif, can't replace Inter's UI sans role. | |

**User's choice:** A (after clarification — initial Q2.1=B conflicted with Q2.3=A and Q2.4=A; clarification round confirmed user wanted A across the board).
**Notes:** Q2.1 mis-click was caught and reconciled via single follow-up question. CSS comment block is the persistence layer for this rationale.

### Q2.2 TYPO-01 4-tier scale concrete values

| Option | Description | Selected |
|---|---|---|
| A. Distill from v2.0 prototype + fill missing layers | hero=2.8rem/700/1.15/-0.02em; section=1.5rem/700/1.3/-0.02em; body=0.95rem/600/1.5; caption=0.74rem/600/1.4/0.06em uppercase. | ✓ |
| B. Reset to clean 8-pt-style scale | hero=2rem, section=1.5rem, body=1rem, caption=0.75rem. Visual change, violates Phase Goal. | |
| C. Token names only; values in Phase 40 | TYPO-01 AC requires multi-page consistency check — incomplete in Phase 39. | |

**User's choice:** A.

### Q2.3 TYPO-02 serif vs Inter usage boundary

| Option | Description | Selected |
|---|---|---|
| A. Narrative → Source Serif 4; UI chrome → Inter | Documented usage table for Phase 40-42. | ✓ |
| B. Size-based split (≥8pt serif, < Inter) | Conflicts: caption-size serif, stat-label is UI not narrative. | |
| C. Component-by-component | No global rule; defeats v3.0 unification goal. | |

**User's choice:** A.

### Q2.4 Font file loading adjustment

| Option | Description | Selected |
|---|---|---|
| A. Keep current weights | Source Serif 4 400/600/700+italic 400, Inter 400/500/600/700. | ✓ |
| B. Add Inter italic 400 | If hero encourage / scroll text fall back to synthetic italic. | |
| C. Variable Font consolidation | Risks first-load perf. | |

**User's choice:** A.

---

## Area 3 — Phase 39 vs 40 migration boundary

### Q3.1 Phase 39 migration scope

| Option | Description | Selected |
|---|---|---|
| A. Phase 39 owns full sweep | Token def + all `transition-all/transition-colors` className migration; AC #2 satisfied this phase. | ✓ |
| B. Phase 39 token-only; sweep in Phase 40 SHARED-01 | Cleaner phase boundary; AC #2 incomplete in 39. | |
| C. Migrate hottest only; rest in 40 | Subjective threshold; AC #2 still incomplete. | |

**User's choice:** A.

### Q3.2 Tailwind className replacement mechanism

| Option | Description | Selected |
|---|---|---|
| A. Tailwind v4 arbitrary properties | `[transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]`. Native, zero runtime cost. | ✓ |
| B. Custom utility classes | `.transition-fast` defined in globals.css; departs from Tailwind ecosystem. | |
| C. JS classname helpers | `motionFast` constant; adds import surface. | |

**User's choice:** A.

### Q3.3 Migration verification gate

| Option | Description | Selected |
|---|---|---|
| A. grep + Playwright snapshot | Mechanical class check + visual regression on 10 pages. | ✓ |
| B. grep only | Misses motion duration inversion bugs. | |
| C. Manual spot check | Subjective, error-prone. | |

**User's choice:** A.

### Q3.4 Migration plan placement

| Option | Description | Selected |
|---|---|---|
| A. plan-1 tokens / plan-2 typography / plan-3 motion + sweep | Dependency-ordered; sweep operates on completed token layer. | ✓ |
| B. All in last plan | Last plan over-large; gsd-executor context risk. | |
| C. One plan per surface | Plan count explosion; defeats scope-of-plan principle. | |

**User's choice:** A.

---

## Area 4 — Motion naming + SSE primitive scope

### Q4.1 Motion duration token naming

| Option | Description | Selected |
|---|---|---|
| A. Semantic `--motion-fast/base/slow` + ms comment | Reading the name reveals the intent. | ✓ |
| B. Literal `--motion-150/250/400` | Zero ambiguity; loses semantic. | |
| C. Both (alias) | Documentation overhead; downstream pick is arbitrary. | |

**User's choice:** A.

### Q4.2 v2.0 legacy `--ease` / `--ease-fast` handling

| Option | Description | Selected |
|---|---|---|
| A. Keep as legacy aliases; new code uses `--ease-claude-out` | Zero v2.0 risk; Phase 40 SHARED-01 will deprecate site-wide. | ✓ |
| B. Overwrite legacy values | Silent rhythm shift across 50+ call sites. | |
| C. Delete + sweep all | Out-of-scope migration. | |

**User's choice:** A.

### Q4.3 SSE streaming primitive scope

| Option | Description | Selected |
|---|---|---|
| A. Phase 39 = motion tokens + 2 keyframes; Phase 40 SHARED-02 = hook + components | Clear phase boundary. | ✓ |
| B. Phase 39 = full hook + components | Phase 39 over-scope; collides with SHARED-02 no-bubble pattern. | |
| C. Phase 39 = motion tokens only; keyframes in Phase 40 | Risk of per-page keyframe duplication. | |

**User's choice:** A.

### Q4.4 MOTION-01 anti-regression mechanism

| Option | Description | Selected |
|---|---|---|
| A. ESLint custom rule + CI | Mechanical, blocks PRs; cumulative for Phase 40-42. | ✓ |
| B. CI grep step only | Lighter but worse DX (error pinpoint). | |
| C. Code review only | Not mechanical, regression-prone. | |

**User's choice:** A.

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` section under "### Claude's Discretion". Summary:
- Tailwind v4 `@theme` registration syntax for new tokens.
- Codemod vs hand-edit for plan-3 transition migration.
- culori.js conversion script form.
- ESLint rule packaging form.
- Specific oklch values per color (must round-trip ΔE < 1.0).
- Section/body/caption typography fine-tune within D-06 framework.
- `prefers-reduced-motion` global stub (forward-compat for Phase 41).

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section. Summary:
- TypeScript token module (`tokens.ts`) — possible v4.0 revisit.
- shadcn/theme/claude direct lift — rejected; conversion preferred.
- Variable Font consolidation — rejected; current `next/font` is fine.
- Poppins / Lora switch — rejected; brand-guidelines fonts target non-web artifacts.
- Direct overwrite of legacy `--ease` — rejected; preserved as alias.
- Codemod tooling — implementer's discretion in plan-3.
