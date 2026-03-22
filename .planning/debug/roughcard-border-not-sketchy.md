---
status: investigating
trigger: "RoughCard component in setup page doesn't show hand-drawn border style - looks like normal straight-line border"
created: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:00:00Z
---

## Current Focus

hypothesis: RoughCard draws the rough.js rectangle flush with the card background edge (no gap), AND the card has rounded-card (14px border-radius), causing the hand-drawn border to visually merge with the rounded background edge and look like a normal CSS border
test: Compare prototype setup.html structure (two-layer with 10px padding gap) vs React RoughCard (single-layer, SVG at inset-0)
expecting: Prototype has outer padding creating gap between rough border and content background; React version lacks this gap
next_action: Document root cause and suggest fix

## Symptoms

expected: Hand-drawn/sketchy border around the setup card (like the prototype setup.html)
actual: Border looks like a normal straight-line border, not hand-drawn
errors: None (visual/design issue)
reproduction: Visit /setup page, observe card border
started: Since implementation

## Eliminated

## Evidence

- timestamp: 2026-03-22T00:01:00Z
  checked: RoughCard.tsx implementation
  found: SVG is positioned absolute inset-0, draws rough rectangle at (0,0,w,h). Container has bg-card-bg, rounded-card (14px), shadow-card. Single-layer structure.
  implication: Rough.js border sits exactly at the edge of the card background

- timestamp: 2026-03-22T00:02:00Z
  checked: Prototype setup.html structure
  found: TWO-LAYER structure. Outer .setup-card has padding:10px, NO background, NO border-radius. Inner .setup-card-inner has background and padding. Rough SVG border is on the OUTER element.
  implication: In prototype, there's a 10px gap between the rough border and the content background, making hand-drawn wobble clearly visible against the cream page background

- timestamp: 2026-03-22T00:03:00Z
  checked: AuthFormCard.tsx RoughCard usage
  found: Auth page passes className="overflow-hidden" which clips SVG at rounded corners. Setup page does NOT pass this. Both use same RoughCard component with same rough.js parameters.
  implication: The overflow difference is not the root cause; the structural mismatch with the prototype is

- timestamp: 2026-03-22T00:04:00Z
  checked: rough.js parameters
  found: stroke:#d0cdc4, strokeWidth:0.8, roughness:1.0, bowing:1, seed:42. Same params in prototype.
  implication: Parameters are identical; issue is structural (card background covering/blending with rough border)

## Resolution

root_cause: RoughCard uses a single-layer structure where the rough.js SVG border is drawn flush at the edge of the card background (inset-0). The prototype uses a two-layer structure with 10px padding between the outer rough border and the inner background. In the React version, the bg-card-bg (#f6f5f0) fills right up to the edge where the rough.js lines are drawn, and combined with rounded-card (14px border-radius), the hand-drawn wobble becomes invisible because it's sandwiched between the card background and the card's rounded edge — it looks like a normal border rather than a sketchy hand-drawn one.
fix:
verification:
files_changed: []
