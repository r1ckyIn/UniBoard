---
status: diagnosed
trigger: "Auth page form card animation not smooth, hover 3D tilt should be removed, entire page should feel like book opening"
created: 2026-03-21T16:30:00Z
updated: 2026-03-21T16:50:00Z
---

## Current Focus

hypothesis: Three separate issues — (1) form card animation jank from spring layout + RoughCard hover, (2) unwanted hover float effect in RoughCard, (3) missing book-opening entrance animation
test: Code analysis of all animation layers
expecting: Identify exact lines causing each issue
next_action: Return diagnosis with specific fix recommendations

## Symptoms

expected: Smooth entrance animation for both panels, plain card (no hover float), entire page feels like a "book opening" with 3D page-flip entrance
actual: Brand panel smooth but form card not smooth; form card has hover 3D tilt/float; no book-opening metaphor
errors: N/A (visual/UX issue, not error)
reproduction: Visit http://localhost:3001/en/auth and observe entrance animation + hover on form card
started: Initial implementation (Phase 03)

## Eliminated

(none — first investigation)

## Evidence

- timestamp: 2026-03-21T16:35:00Z
  checked: AuthFormCard.tsx — form card animation layers
  found: motion.div with `layout` prop + spring transition (stiffness:300, damping:30) wraps RoughCard. This causes jank because layout animation recalculates position/size on every render, and the spring physics conflicts with the parent staggered slide-up animation.
  implication: The `layout` prop on AuthFormCard's outer motion.div is designed for login/register switch height animation, but it also interferes with the entrance animation making it janky.

- timestamp: 2026-03-21T16:37:00Z
  checked: RoughCard.tsx lines 77-78
  found: `hover:shadow-card-hover hover:-translate-y-px` — this creates the "float" hover effect. The shadow deepens + card lifts 1px on hover.
  implication: This is the unwanted 3D tilt/float that user wants removed from the auth form card.

- timestamp: 2026-03-21T16:40:00Z
  checked: AuthPage.tsx — entrance animation
  found: Uses containerVariants with staggerChildren:0.08 and itemVariants with opacity+translateY(18px) slide-up. Both panels get the same simple fade+slide-up. No 3D transforms, no perspective, no rotateY — no book metaphor at all.
  implication: Current entrance is a generic staggered slide-up. Needs complete replacement with CSS 3D book-opening animation.

- timestamp: 2026-03-21T16:45:00Z
  checked: globals.css — animation definitions
  found: Only basic keyframes defined: slide-up, fade-in, gentle-bob, drop-in, spin. No 3D-related animations. No perspective property anywhere.
  implication: Book-opening animation infrastructure does not exist yet. Must be built from scratch.

- timestamp: 2026-03-21T16:48:00Z
  checked: Research on CSS 3D book-opening animations
  found: Key technique uses: (1) parent container with `perspective: 1000-1200px`, (2) two child panels with `transform-style: preserve-3d`, (3) left panel rotateY from -90deg→0deg (pivoting on right edge via transform-origin: right center), (4) right panel rotateY from 90deg→0deg (pivoting on left edge via transform-origin: left center), (5) staggered timing so left page opens first then right follows. Framer Motion supports rotateY and perspective as style/animate props natively.
  implication: Achievable with existing Framer Motion + CSS. No extra library needed.

## Resolution

root_cause: |
  Three distinct issues:

  1. **Form card entrance animation not smooth**: AuthFormCard.tsx has a `layout` prop on its outer motion.div with spring physics (stiffness:300, damping:30). This `layout` prop causes Framer Motion to track and animate layout changes, which interferes with the parent's staggered slide-up entrance animation, creating jank. The spring type also creates a bouncy feel that conflicts with the smooth easing used on the brand panel.

  2. **Unwanted hover float effect**: RoughCard.tsx line 77 applies `hover:shadow-card-hover hover:-translate-y-px` to ALL RoughCard instances. This lifts the card 1px and deepens shadow on hover — creating the "3D tilt/float" the user wants removed. Since RoughCard is a shared component, the fix should either add an opt-out prop or remove hover effects specifically for the auth card.

  3. **No book-opening animation**: AuthPage.tsx uses a simple containerVariants/itemVariants pattern with opacity+translateY slide-up. There is zero 3D transform infrastructure — no perspective, no rotateY, no transform-style:preserve-3d. The "book opening" effect requires a fundamentally different approach using CSS 3D transforms.

fix: ""
verification: ""
files_changed: []
