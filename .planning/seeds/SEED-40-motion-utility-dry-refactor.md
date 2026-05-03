---
seed_id: SEED-40-motion-utility-dry-refactor
status: dormant
captured: 2026-04-30
captured_during: Phase 39 /simplify pass
trigger:
  - "Phase 40 SHARED-01 (shared component polish) kickoff — natural place to introduce @utility helpers alongside other shared abstractions"
  - "Future motion-token tweak that would otherwise require touching 36+ files"
phase_target: Phase 40
effort_estimate: ~1.5 hours (declare @utility, sed sweep, lint, visual sanity)
references:
  - .planning/phases/39-design-token-foundation/39-REVIEW.md
  - Tailwind v4 docs — @utility directive
---

# SEED-40 — Motion-Token DRY Refactor via Tailwind v4 `@utility`

## Context

Phase 39 sed-migrated 56 raw `transition-{all|colors} duration-{N}` occurrences across 36 .tsx files to the verbose tokenized form:

```
transition-{all|colors} [transition-duration:var(--motion-{fast|base|slow})] [transition-timing-function:var(--ease-claude-out)]
```

The migration is functionally correct and verified (lint + build + 4 review-fix commits clean). However, the **102-character pattern repeats verbatim across 56 sites** — making future changes (e.g., Phase 41 reduced-motion adjustments) require another full sed sweep.

The `/simplify` pass for Phase 39 flagged this as a DRY violation but did NOT block ship — the verbose form is mechanical and uniform; the refactor is structural improvement, not a fix.

## Proposal

Introduce Tailwind v4 `@utility` directive in `frontend/app/globals.css` to expose semantic shorthand classes:

```css
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

@utility transition-claude-fast-colors {
  transition-property: color, background-color, border-color, fill, stroke;
  transition-duration: var(--motion-fast);
  transition-timing-function: var(--ease-claude-out);
}
/* … one per (motion-tier × all|colors) combo, ~6 utilities total */
```

Then sweep all 56 verbose call-sites back to the shorthand:

```diff
- "transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]"
+ "transition-claude-fast"
```

## Effort

- **30 min** — author 6 `@utility` blocks in globals.css (one per motion-tier × property-class)
- **30 min** — sed sweep with verification grep
- **15 min** — update ESLint `no-restricted-syntax` rule to also flag the verbose form (encourage shorthand)
- **15 min** — pnpm lint + build + visual smoke

## Triggers

Convert to phase work when **any** of:
1. Phase 40 SHARED-01 starts — natural fit, shared abstractions are the focus
2. A motion-token tweak would otherwise require editing > 5 files
3. ESLint cumulative complaints (e.g., contributor PR includes the verbose form because they copied it)

## Why deferred (not done in Phase 39)

- Phase 39's must_haves are met (sweep complete, lint enforces, build green)
- Adding @utility refactor on top would re-touch 36 files — Phase 39 already touched 36 files for the sweep, so back-to-back changes pollute reviewable diff
- Tailwind v4 `@utility` is a **new pattern** for this codebase — better to introduce alongside other Phase 40 shared-component abstractions for cohesion
- User explicitly chose to ship Phase 39 to prod for visual UAT; refactor at this stage would expand scope past the minimal viable token foundation

## Closure procedure

1. Open Phase 40 (or successor) PLAN with this SEED listed in `<context>`
2. Add `@utility` declarations to `globals.css` under `@theme` (Tailwind v4 idiom)
3. Author a 1-pass sed sweep:
   ```bash
   find frontend/{app,components} -name '*.tsx' -print0 | xargs -0 \
     sed -i '' -E 's|transition-all \[transition-duration:var\(--motion-fast\)\] \[transition-timing-function:var\(--ease-claude-out\)\]|transition-claude-fast|g'
   # … one pass per motion-tier × property combo
   ```
4. Verify zero verbose forms remain via grep
5. Update ESLint rule with deprecation message pointing at shorthand
6. Run `pnpm lint && pnpm build && pnpm exec vitest run __tests__/styles`
7. Commit as separate atomic commits per refactoring step

## Out of scope for this seed

- Reduced-motion variant utilities — Phase 41 A11Y-05 owns
- Dark-mode motion variants — Phase 43 owns (likely no different from light)
- Animation utilities (`@keyframes` references) — Phase 40 SHARED-02 may extend this seed
