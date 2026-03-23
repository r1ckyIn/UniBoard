# Phase 6: Courses Page - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Courses page — a card grid showing all enrolled courses with grade overview. Each card displays course name, code, current mark, grade band (HD/D/CR/P/F), and assessed progress. Clicking a card navigates to Course Detail page (Phase 7). This is a relatively straightforward page with clear prototype specification.

Requirements: UI-02

</domain>

<decisions>
## Implementation Decisions

### Card Layout
- 3-column responsive grid (3 cols default, 2 cols at 1400px, 1 col at 900px) — from prototype
- Two-layer RoughCard structure (outer gap + inner bg) — established in Phase 4
- Colored banner per card with course code + name overlay
- Info section: term, grade percentage + grade band badge, Rough.js progress bar for assessed %

### Banner Decorations
- 5 unique Rough.js doodle patterns on banners (circle+sparkle, wave, star, dots cluster, zigzag) — from prototype
- Each card gets a different white semi-transparent deco on the colored banner

### Grade Display
- Grade percentage colored with course color
- Grade band badge (HD/D/CR/P/F) — reuse `getGradeBand()` from Phase 5
- Progress bar showing assessed % — reuse `RoughProgressBar` pattern or Rough.js canvas approach from prototype

### Card Interactions
- Hover: translateY(-3px) lift effect — from prototype
- Click: navigate to Course Detail page `/courses/{id}` (Phase 7, route placeholder)

### Title Row
- "My Courses" heading with BookOpen icon + semester badge ("2026 S1")
- "N Published" filter badge on the right

### Claude's Discretion
- Banner doodle assignment strategy (by index vs hash)
- Grade badge color scheme (course color vs grade-based)
- Empty state design (no courses)
- Loading skeleton card design
- Entrance animation approach (CSS slideUp vs Motion springs)
- Right panel content (empty or reused)
- Exact Rough.js parameters for progress bars and borders
- i18n message structure for courses namespace

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Specification (PRIMARY)
- `prototype/courses.html` — Courses page prototype: card grid, banner deco, grade display, progress bars, all CSS styles and Rough.js scripts
- `prototype/DESIGN_SYSTEM.md` — Reusable CSS patterns, color vars, card styles

### Technical Architecture
- `docs/UniBoard_TRD_v2.md` §12.4 — Course endpoints
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification

### Requirements
- `.planning/REQUIREMENTS.md` — UI-02 (Courses page requirement)
- `.planning/ROADMAP.md` — Phase 6 success criteria

### Prior Phase Context
- `.planning/phases/01-design-system-foundation/01-CONTEXT.md` — Design system decisions
- `.planning/phases/02-api-contracts-mock-layer/02-CONTEXT.md` — API contracts, hooks architecture
- `.planning/phases/05-dashboard-page/05-CONTEXT.md` — Dashboard patterns (RoughProgressBar, grade-band, course-colors, animations)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/components/design-system/RoughCard.tsx` — Two-layer Rough.js card with hover, ResizeObserver redraw
- `frontend/components/dashboard/RoughProgressBar.tsx` — Hand-drawn progress bar (may need adaptation)
- `frontend/lib/utils/grade-band.ts` — `getGradeBand()` for HD/D/CR/P/F calculation
- `frontend/lib/dashboard/course-colors.ts` — `getCourseColor()` mapping (4 courses, needs 5th)
- `frontend/hooks/use-courses.ts` — `useCourses()` and `useCourseDetail()` hooks
- `frontend/lib/fixtures/courses.ts` — 5 courses with grade data
- `frontend/components/design-system/ClientOnly.tsx` — SSR safety for Rough.js

### Established Patterns
- Two-layer RoughCard: outer div (10px padding, no bg) + inner div (bg/shadow) — Phase 4
- Motion spring animations for page entrances — Phase 3/4/5
- `next-intl` i18n with `app/[locale]/` route structure — Phase 1
- `(dashboard)` route group with AppShell layout — Phase 1
- TanStack Query hooks: keys-factory -> queryOptions-factory -> thin-wrapper — Phase 2

### Integration Points
- Page route: `app/[locale]/(dashboard)/courses/page.tsx`
- Sidebar "Courses" nav item should be active on this page
- Card click navigates to `/courses/{id}` (Phase 7 — page won't exist yet)
- Course colors utility needs MATH1005 purple (#9b7bb8) added

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user chose to skip discussion and proceed directly to planning. All implementation details at Claude's discretion within prototype specification.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-courses-page*
*Context gathered: 2026-03-23*
