---
status: investigating
trigger: "RoughCard hand-drawn border snaps/jumps on login/register toggle instead of smooth transition"
created: 2026-03-21T00:00:00Z
updated: 2026-03-21T00:01:00Z
---

## Current Focus

hypothesis: RoughCard uses ResizeObserver + rAF to redraw rough.js SVG, but each redraw completely replaces all SVG children (clear + append), causing a visual "snap" because (1) the SVG path geometry changes entirely on each redraw (rough.js generates new random hand-drawn paths), and (2) ResizeObserver fires discretely, not on every animation frame during the CSS/motion height transition
test: Confirmed by reading RoughCard.tsx lines 30-43 and 58-62
expecting: The drawBorder function clears all SVG children and generates brand-new rough.js paths each time
next_action: Document root cause and recommended fix

## Symptoms

expected: When switching between login and register forms, the RoughCard hand-drawn border should smoothly transition its size along with the form content crossfade/height morph
actual: Form content transitions smoothly but the rough.js border snaps/jumps to the new size
errors: No errors - visual behavior issue
reproduction: Toggle between login and register on the auth page
started: Since implementation

## Eliminated

## Evidence

- timestamp: 2026-03-21T00:01:00Z
  checked: RoughCard.tsx - drawBorder function (lines 21-43)
  found: |
    1. drawBorder() clears ALL SVG children (lines 30-33: while loop removes all firstChild)
    2. Then generates a BRAND NEW rough.js rectangle with rc.rectangle() (lines 36-42)
    3. rough.js produces randomized hand-drawn paths each call (different seed = different wobble)
    4. So every resize = complete visual replacement of the border shape
  implication: Each redraw produces a visually different border (new random strokes), causing a jarring "pop"

- timestamp: 2026-03-21T00:01:00Z
  checked: RoughCard.tsx - ResizeObserver setup (lines 58-62)
  found: |
    1. ResizeObserver calls drawBorder via a single rAF (line 61)
    2. ResizeObserver coalesces size changes - it fires when the element reaches a new stable size
    3. During a motion/framer-motion layout animation, the container height transitions continuously
    4. ResizeObserver may fire multiple times during the transition but NOT on every pixel change
    5. Each firing regenerates the entire SVG with new random paths
  implication: Border updates are discrete jumps, not smooth interpolation

- timestamp: 2026-03-21T00:01:00Z
  checked: AuthFormCard.tsx - motion.div layout animation (lines 20-23)
  found: |
    1. Outer motion.div has `layout` prop with spring transition (stiffness: 300, damping: 30)
    2. This makes the container smoothly animate its dimensions
    3. BUT: RoughCard is a plain div inside this - it receives the size change
    4. The RoughCard's ResizeObserver sees discrete size snapshots, not the continuous interpolation
    5. Each snapshot triggers a full SVG redraw with new random rough.js paths
  implication: The animation system and the border rendering are decoupled - framer-motion handles smooth size, but rough.js border is re-generated from scratch at discrete intervals

## Resolution

root_cause: |
  TWO compounding issues in RoughCard.tsx:

  1. DISCRETE REDRAW: ResizeObserver + single rAF (line 61) fires discretely during the
     framer-motion layout animation, not on every animation frame. The border only updates
     at a few discrete size snapshots rather than smoothly following the container's animated dimensions.

  2. FULL PATH REGENERATION: Each drawBorder() call (lines 30-43) destroys all existing SVG
     children and generates entirely new rough.js paths via rc.rectangle(). rough.js produces
     randomized "hand-drawn" strokes, so each call produces visually different wobble/roughness.
     This means even if updates were more frequent, the border would still "jitter" because the
     path shape changes randomly on every redraw.

  The combination means: the border sits at old-size with old-shape, then suddenly jumps to
  new-size with a completely different shape. The content transitions smoothly (framer-motion
  handles that), but the rough.js SVG border cannot participate in CSS/JS transitions because
  it's procedurally generated geometry, not a CSS property.

fix:
verification:
files_changed: []
