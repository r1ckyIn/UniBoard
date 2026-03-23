# Phase 7: Course Detail Page - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Course Detail page — users drill into a single course to see assessment breakdown (with inline score prediction), course materials, and Ed Discussion posts. The page includes a course banner, assessment table with live grade projection, materials browser, AI chat placeholder, and a right panel with quick links, upcoming deadlines, and high-value Ed posts. Navigation from Courses page (Phase 6) card click.

Requirements: UI-11

</domain>

<decisions>
## Implementation Decisions

### Inline Score Prediction
- **Keep both**: Course Detail has per-course inline prediction (exactly like prototype), Predict page (Phase 9) later does cross-course GPA simulation. Different scope, both valuable
- **Grade Summary merged into Assessment card**: not a separate card — placed at the bottom of the Assessment section card (prototype has it as a separate card with margin-top: -10px, we merge it inside)
- **No cross-page persistence in M1**: predictions are temporary page state, reset on navigation. M2 backend will implement persistent prediction storage
- **Input range**: clamp 0-100 for now; revisit if users report bonus marks use case
- **Input style**: follows prototype — dashed border-bottom, transparent background, Source Serif 4 font, same size as graded scores. Placeholder shows "?"
- **Graded vs ungraded visual distinction**: follows prototype — graded items show fixed score + "graded" badge (course-color background), ungraded show dashed-underline input
- **Projected Final animation**: number scrolling transition (countUp-style) when value changes as user types predictions

### Ed Discussion Posts
- **Location**: right panel (not main content area) — as a third card below Quick Links and Upcoming Deadlines
- **Content**: compact list — title, time, endorsed/staff badges
- **Filter**: only high-value posts (endorsed or staff-answered) — aligns with INTEL-01 requirement
- **Click behavior**: opens ExternalLinkDialog → new tab to Ed Discussion

### AI Chat Placeholder
- **Placeholder + Coming Soon**: preserve the UI layout from prototype (input box + send button) but disable input, show "Coming Soon" or "AI 功能即将上线" text
- **Position**: below Materials section in main content area (same as prototype)
- **Actual functionality**: deferred to Phase 19 (MCP Agent & Streaming)

### Right Panel
- **Card order**: Quick Links → Upcoming Deadlines → Ed Discussion (prototype order + Ed at bottom)
- **Quick Links click**: reuse ExternalLinkDialog confirmation dialog (consistent with Dashboard Recent Activity)
- **Content injection**: reuse portal-slot pattern (createPortal + #right-panel-slot) from Phase 5
- **Quick Links items**: Canvas Home, Ed Discussion, Ed Lessons — with colored icon backgrounds matching prototype
- **Upcoming Deadlines**: course-specific deadlines with colored stripe, days remaining badge

### Page Structure
- **Back link**: "← My Courses" at top, navigates to /courses
- **Course Banner**: colored strip with course code, name, term badge, credit points, instructor — reuse BannerDeco from Phase 6
- **Main content sections** (top to bottom): Banner → Assessment (with merged Grade Summary) → Materials → AI Chat placeholder
- **Entrance animations**: CSS slideUp with staggered delays (d1-d8) matching prototype timing

### Claude's Discretion
- Rough.js parameters for section card borders and weight progress bars
- Materials list item layout details (week badge width, icon sizing)
- AI placeholder exact disabled state styling
- Entrance animation timing fine-tuning
- Empty state designs (no assessments, no materials, no Ed posts)
- i18n message structure for course-detail namespace
- Exact countUp animation implementation for Projected Final

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Specification (PRIMARY)
- `prototype/course-detail.html` — Course Detail page prototype: banner, assessment table with inline prediction, grade summary, materials list, AI chat input, right panel (quick links, deadlines), all CSS styles and Rough.js scripts
- `prototype/DESIGN_SYSTEM.md` — Reusable CSS patterns, color vars, card styles

### Technical Architecture
- `docs/UniBoard_TRD_v2.md` §12.4 — Course endpoints (detail, grades, materials, outline)
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification

### Requirements
- `.planning/REQUIREMENTS.md` — UI-11 (Course Detail page requirement), INTEL-01 (Ed Discussion high-value filtering)
- `.planning/ROADMAP.md` — Phase 7 success criteria

### Prior Phase Context
- `.planning/phases/01-design-system-foundation/01-CONTEXT.md` — Design system decisions
- `.planning/phases/02-api-contracts-mock-layer/02-CONTEXT.md` — API contracts, hooks architecture
- `.planning/phases/05-dashboard-page/05-CONTEXT.md` — Portal-slot pattern, ExternalLinkDialog, grade-band utility, course-colors
- `.planning/phases/06-courses-page/06-CONTEXT.md` — BannerDeco component, CourseCard patterns, RoughProgressBar

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/components/design-system/RoughCard.tsx` — Two-layer Rough.js card with ResizeObserver redraw
- `frontend/components/courses/BannerDeco.tsx` — Rough.js banner decorations (5 patterns)
- `frontend/components/dashboard/RoughProgressBar.tsx` — Hand-drawn progress bar for weight display
- `frontend/components/shared/ExternalLinkDialog.tsx` — Confirmation dialog for external URLs
- `frontend/lib/utils/grade-band.ts` — `getGradeBand()` for HD/D/CR/P/F calculation
- `frontend/lib/dashboard/course-colors.ts` — `getCourseColor()` mapping
- `frontend/components/design-system/ClientOnly.tsx` — withClientOnly() SSR safety wrapper

### Established Patterns
- Two-layer RoughCard: outer div (10px padding, no bg) + inner div (bg/shadow) — Phase 4
- Portal-slot pattern: createPortal + #right-panel-slot for right panel content injection — Phase 5
- Motion spring animations for page entrances — Phase 3/4/5
- CSS slideUp staggered animations (d1-d10) — prototype pattern used in all pages
- `next-intl` i18n with `app/[locale]/` route structure — Phase 1
- TanStack Query hooks: keys-factory → queryOptions-factory → thin-wrapper — Phase 2
- withClientOnly() wrapper for Rough.js components — Phase 1

### Hooks Available
- `frontend/hooks/use-courses.ts` — `useCourseDetail(id)` for course info
- `frontend/hooks/use-grades.ts` — `useCourseGrades(courseId)` for assessment scores
- `frontend/hooks/use-materials.ts` — Course materials data
- `frontend/hooks/use-discussions.ts` — Ed Discussion threads (filterable by course)
- `frontend/hooks/use-deadlines.ts` — Deadlines data (filterable by course)

### Integration Points
- Page route: `app/[locale]/(dashboard)/courses/[id]/page.tsx`
- Sidebar "Courses" nav item should be active on this page
- Back link navigates to `/courses` (Phase 6)
- Course color from `getCourseColor()` applied as CSS variable `--course-color` for theming

</code_context>

<specifics>
## Specific Ideas

- **Grade Summary inside Assessment card**: user prefers merged layout over prototype's separate-card-with-negative-margin approach — cleaner visual hierarchy
- **Projected Final countUp animation**: when user types prediction scores, the projected percentage should animate smoothly between values (not jump instantly)
- **Ed Discussion in right panel only**: keep main content focused on assessments + materials, Ed posts are supplementary info in sidebar
- **High-value only Ed filtering**: aligns with the product's core value proposition — surface only grade-relevant information

</specifics>

<deferred>
## Deferred Ideas

- **Cross-page prediction persistence**: user wants predictions persisted (localStorage or backend) when M2 backend is ready. Course Detail and Predict page should share prediction state via backend storage
- **AI Chat actual functionality**: Phase 19 (MCP Agent & Streaming) — currently just a placeholder UI
- **Ed Discussion post detail view**: clicking an Ed post currently opens external Ed Discussion in new tab — in-app reading could be a future enhancement

</deferred>

---

*Phase: 07-course-detail-page*
*Context gathered: 2026-03-23*
