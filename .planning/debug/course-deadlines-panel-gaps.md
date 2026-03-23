---
status: diagnosed
trigger: "CourseDeadlinesPanel is missing day badges (e.g. 'in 3d') and hand-drawn Rough.js border, inconsistent with Dashboard right panel"
created: 2026-03-23T00:00:00+11:00
updated: 2026-03-23T00:00:00+11:00
---

## Current Focus

hypothesis: CONFIRMED — Badge format and Rough.js border both exist but differ from the claim; real gaps are badge text format ("X days" vs "in Xd") and missing RoughCard wrapper
test: Compare CourseDeadlinesPanel.tsx against Dashboard DeadlineTimeline.tsx and prototype HTML
expecting: Identify specific discrepancies
next_action: Return diagnosis

## Symptoms

expected: CourseDeadlinesPanel should show day badges like "in 3d" and a hand-drawn Rough.js border, consistent with Dashboard's DeadlineTimeline panel
actual: Panel renders badges with "{days} days" text (e.g. "63 days") and draws its own inline Rough.js border instead of using the shared RoughCard component
errors: N/A — visual design inconsistency, not a runtime error
reproduction: Navigate to any course detail page and compare the deadlines panel with Dashboard's DeadlineTimeline
started: Phase 07 implementation

## Eliminated

(none)

## Evidence

- timestamp: 2026-03-23T00:00:00+11:00
  checked: CourseDeadlinesPanel.tsx (lines 86-113, 115-200)
  found: |
    1. Badge IS rendered (line 187-192) with getBadgeStyle() returning text via i18n key "deadlines.daysRemaining" = "{days} days"
    2. Rough.js border IS drawn inline (lines 30-49, drawBorder function) with identical parameters to RoughCard
    3. Does NOT use the shared RoughCard component — draws its own SVG border manually
    4. Background is hardcoded "#f6f5f0" (line 127) instead of using RoughCard's bg-card-bg CSS class
    5. No hover elevation effect (no hover:shadow-card-hover / hover:-translate-y-px)
  implication: The gap report is partially inaccurate — both features exist. But there are real inconsistencies.

- timestamp: 2026-03-23T00:00:00+11:00
  checked: Dashboard DeadlineTimeline.tsx (lines 240-253)
  found: |
    1. Uses RoughCard wrapper (line 136) — shared component with hover, shadow, ResizeObserver burst animation
    2. Badge text uses i18n key "deadlines.days" = "{count} days" (line 252)
    3. Has urgency-based coloring (urgent/soon/later) with URGENCY_COLORS map
    4. Has interactive features: selectedDeadlineId, onDeadlineClick, onSeeDetails button on hover
    5. Has timeline SVG with vertical line and dots drawn by Rough.js
  implication: Dashboard panel is significantly more feature-rich and uses the design system properly.

- timestamp: 2026-03-23T00:00:00+11:00
  checked: Prototype course-detail.html (lines 432-454, 567-576)
  found: |
    1. Prototype uses data-hand-border attribute → JS draws Rough.js border via querySelectorAll('[data-hand-border]')
    2. Badge shows "63 days" / "TBD" — same format as current implementation
    3. Items have urgency classes (.soon, .later) that set subtle background colors
    4. Prototype does NOT use "in 3d" format — it uses "X days" format
  implication: The "in 3d" format mentioned in the gap report does not match the prototype either. The prototype and implementation are actually aligned on badge format.

- timestamp: 2026-03-23T00:00:00+11:00
  checked: RoughCard.tsx vs CourseDeadlinesPanel inline border
  found: |
    1. RoughCard has ResizeObserver with 400ms burst rAF loop for smooth animation tracking
    2. CourseDeadlinesPanel has ResizeObserver but only calls drawBorder() once per resize (no burst)
    3. RoughCard has hover:shadow-card-hover and hover:-translate-y-px
    4. CourseDeadlinesPanel has no hover effects on the card itself
    5. RoughCard uses bg-card-bg CSS variable; CourseDeadlinesPanel hardcodes #f6f5f0
  implication: The inline border implementation is a degraded copy of RoughCard, missing animation smoothness and design tokens.

## Resolution

root_cause: |
  CourseDeadlinesPanel duplicates Rough.js border drawing logic inline instead of using the shared
  RoughCard design-system component. This creates two concrete inconsistencies vs the Dashboard panel:

  1. **No RoughCard wrapper** — The panel rolls its own drawBorder + SVG + ResizeObserver instead of
     wrapping content in <RoughCard>. This means it misses RoughCard's burst-rAF animation smoothing,
     hover elevation effects (shadow + translate), and design-token-based background (bg-card-bg vs
     hardcoded #f6f5f0).

  2. **Badge text format discrepancy (minor)** — CourseDeadlinesPanel uses i18n key
     "deadlines.daysRemaining" = "{days} days" while Dashboard uses "deadlines.days" = "{count} days".
     Both produce the same visual output (e.g. "63 days"), so this is a key naming inconsistency rather
     than a visual bug.

  Note: The original gap report mentions "in 3d" badge format, but neither the Dashboard panel nor the
  HTML prototype use that format. Both show "X days". This part of the gap report is inaccurate.

fix: |
  1. Replace the inline drawBorder/SVG/ResizeObserver code (lines 26-70) with a <RoughCard> wrapper
  2. Remove svgRef, containerRef, drawBorder callback, and the useEffect that manages them
  3. Keep the inner content (title, loading, empty, deadline list) as-is
  4. Optionally: unify the i18n key to use "deadlines.days" with {count} param for consistency

verification:
files_changed: []
