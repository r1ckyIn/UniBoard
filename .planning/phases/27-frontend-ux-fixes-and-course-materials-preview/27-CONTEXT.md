# Phase 27: Frontend UX Fixes & Course Materials Preview - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix Dashboard and Timetable interaction issues; add inline material preview to Course Detail page. Five success criteria:

1. Dashboard reminder cards are functional (click navigates or triggers action)
2. Dashboard course card predict button navigates to Predict page with course pre-selected (ALREADY WORKING)
3. Timetable lecture/tutorial blocks distinguish attendance/participation courses via solid/dashed border
4. Timetable page shows scroll indicator when deadline items overflow visible area
5. Course detail page has inline material viewer (slide-out panel) for previewing documents without leaving page

</domain>

<decisions>
## Implementation Decisions

### Reminder Card Navigation (D-01)
- **D-01:** Mixed navigation mode — route to in-app pages when available, external links with warning dialog otherwise
  - `grade` activity → `/courses/{courseId}` (in-app)
  - `deadline` activity → `/deadlines?date={due_date}` (in-app, with date param)
  - `discussion` / `endorsed` activity → external Ed link via ExternalLinkDialog (existing pattern)

### Timetable Event Block Styling (D-02)
- **D-02:** Solid vs dashed border to distinguish attendance/participation courses
  - Courses with attendance/participation assessment component → solid border
  - Courses without → dashed border
  - Data source: Unit Outline assessment weights (UnitOutlineParser already parses weight breakdown)
  - All other existing styles (color, opacity, layout) remain unchanged

### Material Viewer (D-03)
- **D-03:** Right-side slide-out panel with iframe embed for document preview
  - Click MaterialItem → panel slides in from right side
  - Uses iframe to load document URL
  - User stays on Course Detail page during preview

### Claude's Discretion
- **Scroll indicator design:** Claude decides the visual cue for deadline list overflow on Timetable page (gradient fade, badge, arrow, or other approach)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `docs/UniBoard_BRD_v2.md` — BRD v2.6, overall product requirements
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification

### Design
- `docs/frontend_brief.md` — Design system guidelines (Anthropic-inspired warm palette, Rough.js borders)
- `prototype/course-detail.html` — Course detail page prototype (materials section reference)
- `prototype/timetable.html` — Timetable page prototype
- `prototype/deadline.html` — Deadline page prototype

### Existing Components
- `frontend/components/dashboard/RecentActivity.tsx` — Reminder card component to modify (D-01)
- `frontend/components/dashboard/CourseGradesTable.tsx` — Predict button already working (SC2)
- `frontend/components/timetable/TimetableEvent.tsx` — Event block to modify (D-02)
- `frontend/components/timetable/TimetableUpcomingDeadlines.tsx` — Scroll indicator target (SC4)
- `frontend/components/course-detail/MaterialsSection.tsx` — Materials list to connect to viewer (D-03)
- `frontend/components/course-detail/MaterialItem.tsx` — Has `url` prop, currently unused
- `frontend/components/dashboard/ExternalLinkDialog.tsx` — Existing dialog pattern to reuse

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExternalLinkDialog` — Native `<dialog>` pattern for external link warning, reuse for discussion/endorsed activities
- `MaterialItem` — Already has `url` prop, just needs click handler connection
- Portal-slot pattern (`#right-panel-slot`) — Could inform slide-out panel implementation
- `hexToRgb` helper in TimetableEvent — Existing color utility for dynamic styling

### Established Patterns
- Native `<dialog>` for modals (Phase 5, Phase 12)
- `router.push()` with query params for cross-page state (predict `?course=`, deadlines `?date=`)
- `withClientOnly()` wrapper for SSR-safe client components
- Course color system via `getCourseColor()` returning `{ base, soft }`

### Integration Points
- `RecentActivity.tsx` — Add onClick handlers per activity type, keep ExternalLinkDialog for external links
- `TimetableEvent.tsx` — Add border-style logic based on course assessment data
- `MaterialsSection.tsx` / `MaterialItem.tsx` — Add click handler, create new slide-out panel component
- `TimetableUpcomingDeadlines.tsx` — Add scroll detection and visual indicator
- Unit Outline / assessment weight data — Need to expose attendance/participation flag to frontend

</code_context>

<specifics>
## Specific Ideas

- Allocate+ reference: The user specifically mentioned Allocate+ uses solid lines for courses with attendance/participation and dashed lines for those without. This is the specific visual distinction to implement, not a full Allocate+ style overhaul.
- SC2 (predict button navigation) confirmed already working — no changes needed.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-frontend-ux-fixes-and-course-materials-preview*
*Context gathered: 2026-04-04*
