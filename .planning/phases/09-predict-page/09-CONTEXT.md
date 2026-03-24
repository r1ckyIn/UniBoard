# Phase 9: Predict Page - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Predict page — a cross-course GPA simulator where users expand course cards, type hypothetical scores for ungraded assessments, and see WAM/GPA update in real-time. The right panel shows overall WAM overview, target WAM slider, required scores per course (reverse-calculated), and semester progress bars. This is a frontend-only page with client-side calculations; backend prediction API integration deferred to M2.

Requirements: UI-04

</domain>

<decisions>
## Implementation Decisions

### Component Reuse Strategy
- **New PredictCard expandable shell** wrapping reused internals: build a new expandable card component (CSS border + left color stripe, like DeadlineCard pattern from Phase 8), with card header showing course info + Current/Projected marks + grade badge + expand chevron
- **Reuse AssessmentRow and GradeSummary** from Phase 7 inside the expanded section — avoid reimplementing score input logic, weight display, and grade calculation
- **Table column difference**: Phase 7 AssessmentRow has 4 columns (including Due Date), prototype has 3 columns (Assessment/Weight/Score). Claude's discretion on whether to add a `hideDueDate` prop or build a simplified PredictRow — choose whichever is cleaner
- **Border style**: course prediction cards use CSS border + left colored stripe (not Rough.js) matching prototype; right panel cards use RoughCard with Rough.js hand-drawn borders

### Calculation & Data Flow
- **Client-side calculation**: all WAM/GPA/Projected values computed in the browser in real-time — no API calls. `useGpaPredict()` and `useGpaPath()` hooks are NOT used in M1; they'll be wired when M2 backend is ready
- **Data sources**: `useCourses()` for course list, `useCourseGrades(id)` for per-course assessment details, `useGpaReport()` for level_weight/credit_points/target_wam
- **USYD WAM formula**: `WAM = Σ(mark × cp × level_weight) / Σ(cp × level_weight)`. CRITICAL: level_weight varies by faculty:
  - Standard (most faculties): all levels = 1 (simple weighted average by credit points)
  - Engineering: 0/2/3/4 for 1000/2000/3000/4000+ level
  - Science Honours: 2/3 for 2000/3000 level
- **Faculty selector**: provide a faculty/weighting scheme selector (dropdown or segmented control) on the Predict page. Default to "Standard" (all weights = 1). Options: Standard, Engineering, Science Honours. Placed near the title row or in the right panel. User's choice persists via localStorage
- **Real-time updates**: every keystroke immediately recalculates all values (Projected per-card, WAM Overview, GPA, Required Scores). No debounce — computation is lightweight (5 courses × ~4 assessments = trivial)

### Card Interaction Design
- **Default state**: all cards collapsed on page load. Card headers show Current/Projected at a glance without expanding
- **Multi-expand**: users can expand multiple course cards simultaneously (not accordion). Good for comparing courses side by side
- **Deep-link from Dashboard**: URL search param `?course=COMP2017` — Predict page reads param, auto-expands the matching card, and scrolls it into view. Consistent with Phase 3/4 URL param pattern
- **Expand/collapse**: click card header to toggle. CSS `max-height` transition (same pattern as Phase 8 DeadlineCard)
- **Score input**: number input fields (not sliders) for ungraded assessments, clamped 0-100. Dashed underline style matching prototype and Course Detail page

### Right Panel Cards
- **Injection method**: portal-slot pattern (createPortal + #right-panel-slot) — same as Phase 5 Dashboard and Phase 7 Course Detail
- **Card 1 — WAM Overview**: displays current/predicted WAM number, grade band badge, GPA/4.0 conversion. Updates in real-time as predictions change. Shows "Fill predictions" when not all scores entered, shows actual predicted WAM when all courses have projections
- **Card 2 — Target WAM**: range slider (50-100, step 1), default from `useGpaReport().target_wam` (fixture = 85). Shows target number, grade band badge, and gap badge ("+X.X to go"). Slider drag updates Required Scores card in real-time
- **Card 3 — Required Scores**: reverse-calculated minimum average score needed per remaining assessments for each course to hit target WAM. Three-tier feasibility icons: CheckCircle (green, ≤85), AlertTriangle (orange, 85-100), XCircle (red, >100). Shows course color dot + code + required score + icon
- **Card 4 — Semester Progress**: per-course assessed percentage progress bars using RoughProgressBar component (reused from Phase 5). Shows course code + progress bar + percentage. Overall semester progress at bottom
- All 4 cards use RoughCard with Rough.js hand-drawn borders

### Title Row
- "Grade Predictor" heading with Target icon (Lucide), semester badge (e.g., "2026 S1"), credit points badge (e.g., "30 cp")
- Faculty/weighting scheme selector placed here or in right panel

### Entrance Animations
- CSS slideUp staggered delays (d1-d10) matching prototype timing pattern used across all pages

### i18n
- Full EN/ZH support for all Predict page text: title, card labels, assessment names, grade bands, right panel card titles, feasibility labels, empty states
- Add `predict` namespace to next-intl messages

### Loading & Error States
- Per-section independent loading: course cards skeleton, right panel skeleton
- Error: in-card friendly message + retry button (consistent with other pages)

### Claude's Discretion
- Exact implementation of AssessmentRow reuse vs new PredictRow (based on code complexity)
- Faculty selector UI placement and styling details
- GPA ↔ WAM conversion formula specifics (simplified 4-point scale mapping)
- Skeleton card shapes and shimmer details
- Rough.js seed values and styling for right panel cards
- Entrance animation timing fine-tuning
- Error state wording
- Empty state design (no courses, no assessments)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Specification (PRIMARY — this IS the spec)
- `prototype/predict.html` — Predict page prototype: expandable course cards, assessment tables with score inputs, WAM overview, target slider, required scores, semester progress, all CSS styles and JS calculation logic
- `prototype/DESIGN_SYSTEM.md` — Reusable CSS patterns, color vars, card styles, paper texture

### WAM Calculation Reference
- [USYD WAM official page](https://www.sydney.edu.au/students/weighted-average-mark.html) — Official formula: WAM = Σ(mark × cp × level_weight) / Σ(cp × level_weight). Level weights vary by faculty

### Technical Architecture
- `docs/UniBoard_TRD_v2.md` §12.5 — GPA endpoints (report, predict, path) — defines API contract for M2 integration
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification

### Requirements
- `.planning/REQUIREMENTS.md` — UI-04 (Predict page), GPA-02 (What-if simulation), GPA-03 (Target path planner)
- `.planning/ROADMAP.md` — Phase 9 success criteria

### Prior Phase Context
- `.planning/phases/01-design-system-foundation/01-CONTEXT.md` — Design system decisions
- `.planning/phases/02-api-contracts-mock-layer/02-CONTEXT.md` — API contracts, hooks architecture, mock data
- `.planning/phases/05-dashboard-page/05-CONTEXT.md` — Portal-slot pattern, RoughProgressBar, "predict →" link behavior
- `.planning/phases/07-course-detail-page/07-CONTEXT.md` — AssessmentSection/AssessmentRow/GradeSummary components, inline prediction decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/components/course-detail/AssessmentRow.tsx` — Per-assessment row with score input for ungraded items, weight display, graded badge. React.memo optimized
- `frontend/components/course-detail/GradeSummary.tsx` — Grade summary with currentAvg, projectedFinal (countUp animation), assessedWeight
- `frontend/components/course-detail/AssessmentSection.tsx` — Full assessment section card with table + grade summary. Contains calculation logic (useMemo) for currentAvg/projectedFinal/assessedWeight
- `frontend/components/design-system/RoughCard.tsx` — Two-layer Rough.js card with ResizeObserver redraw, hover toggle via disableHover prop
- `frontend/components/dashboard/RoughProgressBar.tsx` — Hand-drawn canvas progress bar for assessed percentage
- `frontend/components/design-system/ClientOnly.tsx` — withClientOnly() SSR safety wrapper for Rough.js components
- `frontend/hooks/use-gpa.ts` — useGpaReport() (WAM, target, per-course data), useGpaPredict(), useGpaPath()
- `frontend/hooks/use-courses.ts` — Course listing hooks
- `frontend/hooks/use-grades.ts` — useCourseGrades(courseId) for assessment details
- `frontend/lib/fixtures/gpa.ts` — GPA report fixture (5 courses with level_weight, credit_points, current_mark)
- `frontend/lib/utils/grade-band.ts` — getGradeBand() for HD/D/CR/P/F calculation
- `frontend/lib/dashboard/course-colors.ts` — getCourseColor() mapping

### Established Patterns
- Expandable card: CSS `max-height` transition for expand/collapse (Phase 8 DeadlineCard)
- Portal-slot: createPortal + #right-panel-slot for right panel content injection (Phase 5/7)
- withClientOnly() wrapper for Rough.js components (Phase 1)
- CSS slideUp staggered animations (d1-d10) for page entrance (all pages)
- URL search params for cross-page state (?course=X) (Phase 3/4)
- TanStack Query hooks: keys-factory → queryOptions-factory → thin-wrapper (Phase 2)
- next-intl i18n with namespace per page (Phase 1+)

### Integration Points
- Page route: `app/[locale]/(dashboard)/predict/page.tsx`
- Sidebar "Predict" nav item should be active on this page
- Dashboard CourseGradesTable "predict →" link navigates to `/predict?course=XXXX`
- Right panel content injected via portal-slot into #right-panel-slot in AppShell

</code_context>

<specifics>
## Specific Ideas

- **USYD WAM accuracy is important**: user specifically requested research into real USYD WAM formula. The faculty-based level_weight system must be implemented correctly, not approximated. This is a core differentiator for the product
- **Prototype's calculation logic in predict.html is the reference implementation**: the JS functions (computeCurrent, computeProjected, computeWAM, computeRequired) define the exact calculation behavior to replicate
- **Course Detail (Phase 7) has per-course prediction; Predict page has cross-course simulation**: different scope, both valuable. No conflict — they can share AssessmentRow/GradeSummary components
- **Required Scores reverse calculation**: assumes other courses maintain their current average on remaining work, then calculates what THIS course needs. Same algorithm as prototype's `computeRequired()` function

</specifics>

<deferred>
## Deferred Ideas

- **Cross-page prediction persistence**: predictions should persist across Course Detail ↔ Predict page navigation. Requires shared state (localStorage or backend). Deferred to M2 backend (Phase 15 GPA service)
- **Faculty auto-detection from Canvas enrollment**: instead of manual faculty selector, detect from Canvas course codes. Deferred to M2 (Phase 14 adapters)
- **Historical WAM trend chart**: show WAM trajectory over semesters. Out of scope for Phase 9
- **Export/share prediction results**: PDF or image export of prediction scenario. Future feature

</deferred>

---

*Phase: 09-predict-page*
*Context gathered: 2026-03-24*
