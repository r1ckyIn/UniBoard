# Typography Usage Rules

> Phase 39 plan-2 deliverable. Reference doc for Phase 40-43 component implementations.
> Per D-07 + RESEARCH §Pattern 7. English-only technical guidance.

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
- Section headings inside narrative content (h3 within an article body)

## Inter — UI Chrome / Data Labels

Use the Tailwind class `font-sans` (or token `var(--font-sans)`). This is also the body default — apply `font-sans` explicitly only when overriding a serif inheritance.

Apply to:

- Button labels
- Sidebar nav labels (`.nav-label`)
- Search input + placeholder
- Dropdown items + timestamps
- Form input labels
- Calendar day numbers
- Stat labels (uppercase, `--text-caption` size)
- Grade badges (`.grade-badge`)
- Toast messages and inline error text

## Disambiguation

- If the text reads as **content the user wrote or that is meaningful in their grade narrative** -> Source Serif 4
- If the text is a **system label, control affordance, or chrome** -> Inter

## Anti-pattern

Per RESEARCH §Pattern 5 — DO NOT put `.text-hero` content inside a `<button>` element without an explicit `font-family` adjustment. Buttons inherit Inter (D-07 chrome rule), but the `text-hero` utility sets only font-size; if the surrounding rule applies Source Serif 4 the button text will render in the wrong family. Always pair `text-hero` with explicit `font-serif` (or `font-sans` if the button context truly wants Inter at hero size).

```tsx
// Wrong — inherits surrounding font-family which may be Inter
<button className="text-hero">42</button>

// Right — explicit font-serif pairs the hero size with the narrative font
<button className="text-hero font-serif">42</button>

// Also right — caption inherits Inter as button default
<button className="text-caption">CONTINUE</button>
```

## Tailwind v4 namespace note

Per RESEARCH §Q1 (corrects CONTEXT.md D-06): the tokens are registered under Tailwind v4's `--text-*` / `--leading-*` / `--tracking-*` namespaces (NOT `--font-size-*` / `--line-height-*` / `--letter-spacing-*` as D-06 implied). Component code should use the generated utilities `text-hero` / `text-section` / `text-body` / `text-caption` plus `leading-hero` / `tracking-caption` etc. Direct `var(--text-hero)` consumption also works.

```tsx
// Preferred — Tailwind utilities generated from --text-*/--leading-*/--tracking-* tokens
<h1 className="text-hero leading-hero tracking-hero font-serif">
  Welcome back, Ricky
</h1>

// Also valid — direct CSS var consumption (rare; prefer utilities)
<h1 style={{ fontSize: "var(--text-hero)", lineHeight: "var(--leading-hero)" }}>
  Welcome back, Ricky
</h1>
```

## CJK fallback

Both Source Serif 4 and Inter fall back to system fonts for CJK glyphs (per `frontend/app/globals.css` `--font-sans` / `--font-serif` definitions in the `@theme inline` block). zh-CN content renders correctly without font-loading changes; per D-08, no new font weights are loaded.

## Tier reference (D-06 specifications)

| Tier | Font | --text-X | --leading-X | --tracking-X | Weight | Use |
|------|------|----------|-------------|--------------|--------|-----|
| hero | Source Serif 4 | 2.8rem (42px) | 1.15 | -0.02em | 700 | Hero greeting, WAM number, GPA target |
| section | Source Serif 4 | 1.5rem (22.5px) | 1.3 | -0.02em | 700 | Page titles, card titles, h2 |
| body | Inter | 0.95rem (14.25px) | 1.5 | (browser default) | 600 | Default body text, form labels |
| caption | Inter | 0.74rem (11.1px) | 1.4 | +0.06em | 600 | Stat labels (uppercase), grade badges |

Sizes resolve to v2.0 prototype px values exactly because `html { font-size: 15px }` (1rem = 15px). Reduced font-size weights (D-08) preserve first-load performance — no new weight loads.

---

*Phase: 39-design-token-foundation*
*Plan: 02 — Typography Token Layer*
*Generated: 2026-04-30*
