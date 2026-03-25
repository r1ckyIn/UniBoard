# Phase 11: Timetable Page - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Timetable page — a weekly schedule view where students see their class sessions plotted on a 7-day time grid, with course-colored event blocks, current time indicator, deadline dashed-line overlays, week navigation (slider + arrows + All Weeks mode), and a compressed evening zone. Right panel shows MiniCalendar, Upcoming Deadlines, and Course Legend. This is a frontend-only page consuming fixture data generated from a real ICS file; ICS upload functionality deferred to M2.

Requirements: UI-08

</domain>

<decisions>
## Implementation Decisions

### Data Source & API Contract
- **ICS-based fixture data**: Parse user's real USYD timetable ICS file (`9f8f3634-a55f-453a-b686-0e576b696f5f (1).ics`) to generate structured fixture JSON. 199 VEVENT entries across 5 courses, 16 event types
- **Production vision**: Users will upload ICS files directly; system parses them into structured timetable data. M1 uses pre-parsed fixture; M2 adds upload flow
- **New OpenAPI endpoints**: Add `GET /api/v1/timetable/sessions` (class sessions for a week/all) and `GET /api/v1/timetable/weeks` (semester week structure) to openapi.yaml
- **New Route Handler mocks + TanStack Query hooks**: Follow contract-first pattern consistent with all other pages (Phase 2 architecture)
- **ICS parsing layer**: Claude's discretion on whether to parse at build time (static fixture) or implement a lightweight client-side parser

### Grid Layout & Time Axis
- **Dual-density time axis**: 8AM–6PM at 60px/hour (normal), 7PM–11PM at 28px/hour (compressed evening zone). Dashed separator line between zones. Matches prototype exactly
- **7-day grid**: Mon–Sun columns with day headers showing weekday + date. Current day column gets subtle orange tint background
- **Current time indicator**: Red horizontal line with circle dot at current position (real-time, updates while page is open). Only shown on current week view
- **Event block click**: Navigates to course detail page (`/courses/[courseId]`), consistent with Courses page card click behavior
- **Overlapping events**: Side-by-side column layout within same day column. Implement assignCols() algorithm from prototype — groups transitively overlapping events and assigns columns with auto-calculated widths

### Deadline Overlay on Grid
- **Deadline dashed lines retained**: Each deadline displays as colored dashed line + diamond dot + tag label at the corresponding time position on its day column. Data from `useDeadlines()` hook (Phase 2)
- **Hover tooltip**: Shows urgency badge, title, course, time, and "View details →" link
- **Overflow handling**: When deadlines fall below the visible scroll area (e.g., 11PM/midnight in compressed zone), show "1 more deadline" / "2 more deadlines" hint at the bottom of that day's column with a **breathing arrow** animation (reuse Dashboard HeroSection scroll prompt style). Hint disappears when user scrolls to reveal the deadline

### Week Navigation & Mode Switching
- **Real semester week structure**: 14 weeks based on ICS data (semester start 2026-02-23, Week 7 = Mid-semester Break). Fixture includes week number, label, and Monday date for each week
- **Week label**: Display "Week N" (or "Break") prominently above the date range selector, so students immediately know which week they're in
- **Week slider**: Range input (1–14) with orange fill progress, positioned in title row center. Dragging changes week view
- **Prev/Next arrows**: Navigate one week at a time. Disabled at boundaries (Week 1 / Week 14)
- **All Weeks mode**: All semester events overlaid on single 7-day grid, no dates shown, header displays "Semester 1, 2026". Week slider disabled. Gives "full semester overview" perspective
- **Current Week mode**: Shows events only for the selected week, with dates in day headers
- **Break Week**: When navigating to Break week (Week 7), display centered message "Mid-semester Break — No classes this week. Enjoy!" instead of empty grid

### Title Row
- "Timetable" heading with Calendar icon (Lucide), semester badge (e.g., "2026 S1")
- Center: week slider with "Weeks" label
- Right: prev/next arrows, week label + date range, All Weeks / Current Week toggle buttons

### Right Panel
- **Injection method**: Portal-slot pattern (createPortal + #right-panel-slot) — same as Phase 5/7/9/10
- **Card 1 — MiniCalendar**: Reuse Dashboard MiniCalendar component (Phase 5). Month navigation + deadline heatmap dots. May need minor adaptation for timetable context
- **Card 2 — Upcoming Deadlines**: Reuse + adjust from Dashboard deadline list pattern. Shows 4 nearest deadlines with left color stripe + course code + task name + time + countdown badge. Data from `useDeadlines()` hook
- **Card 3 — Course Legend**: Course color dot + code + name for all enrolled courses. Data from `useCourses()` hook. Shows "N enrolled" badge in header
- All 3 cards use RoughCard with Rough.js hand-drawn borders

### Entrance Animations
- CSS slideUp staggered delays (d1-d10) matching prototype timing pattern used across all pages

### i18n
- Full EN/ZH support: page title, day names, date formatting, week labels ("Week N" / "第N周"), "Break" / "假期", mode toggle labels, deadline tooltip text, "N more deadlines" hint, right panel card titles, empty states
- Add `timetable` namespace to next-intl messages

### Loading & Error States
- Skeleton loading for timetable grid (grey blocks in random positions)
- Skeleton loading for right panel cards
- Error: friendly message + retry button (consistent with other pages)
- Empty state: when no timetable data exists — illustration + "Upload your timetable ICS to get started" (future-proofing for M2 upload flow)

### Claude's Discretion
- ICS parsing implementation details (build-time vs runtime, library choice)
- Exact timetable session TypeScript schema design
- Skeleton card shapes and shimmer details
- Rough.js seed values and styling for right panel cards
- Entrance animation timing fine-tuning
- Error/empty state wording and illustration choice
- MiniCalendar adaptation details for timetable context
- Breathing arrow animation implementation reuse approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Specification (PRIMARY — this IS the spec)
- `prototype/timetable.html` — Timetable page prototype: 7-day time grid, event blocks with overlap handling, week slider, All Weeks / Current Week modes, deadline dashed lines with tooltips, compressed evening zone, right panel (MiniCalendar, Upcoming Deadlines, Course Legend), all CSS styles and JS rendering logic
- `prototype/DESIGN_SYSTEM.md` — Reusable CSS patterns, color vars, card styles, paper texture

### ICS Data Source
- User's real ICS file at download path — 199 VEVENTs, 5 courses (COMP2017, COMP3221, STAT2011, EDGU1003, MATH2021), USYD Sydney Timetable export format. Fields: DTSTART, DTEND, SUMMARY (course name + type), LOCATION, DESCRIPTION (course code + section + unit)

### API Contract & Data
- `frontend/openapi/openapi.yaml` — Will need new timetable schemas (TimetableSession, SemesterWeek) and endpoints
- `frontend/hooks/use-deadlines.ts` — useDeadlines() hook for deadline overlay data (already implemented)
- `frontend/hooks/use-courses.ts` — useCourses() hook for Course Legend card (already implemented)
- `frontend/lib/fixtures/deadlines.ts` — Deadline fixture data for overlay + right panel

### Technical Architecture
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification

### Requirements
- `.planning/REQUIREMENTS.md` — UI-08 (Timetable page)
- `.planning/ROADMAP.md` — Phase 11 success criteria

### Prior Phase Context
- `.planning/phases/01-design-system-foundation/01-CONTEXT.md` — Design system decisions
- `.planning/phases/02-api-contracts-mock-layer/02-CONTEXT.md` — API contracts, hooks architecture, mock data
- `.planning/phases/05-dashboard-page/05-CONTEXT.md` — Portal-slot pattern, MiniCalendar, HeroSection breathing arrow scroll prompt, RoughCard
- `.planning/phases/10-digest-page/10-CONTEXT.md` — Most recent phase patterns (portal-slot, animations, i18n)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/components/dashboard/MiniCalendar.tsx` — Month-navigable calendar with deadline heatmap dots (Phase 5, reuse for right panel)
- `frontend/components/dashboard/HeroSection.tsx` — Breathing arrow scroll prompt animation (reuse for deadline overflow hint)
- `frontend/components/design-system/RoughCard.tsx` — Two-layer Rough.js card for right panel cards
- `frontend/components/design-system/ClientOnly.tsx` — withClientOnly() SSR safety wrapper for Rough.js components
- `frontend/hooks/use-deadlines.ts` — useDeadlines() for deadline overlay and Upcoming Deadlines card
- `frontend/hooks/use-courses.ts` — useCourses() for Course Legend card
- `frontend/lib/dashboard/course-colors.ts` — getCourseColor() for consistent course color mapping
- `frontend/lib/utils/urgency.ts` — Shared urgency utility (Phase 8) for deadline countdown badges

### Established Patterns
- Portal-slot: createPortal + #right-panel-slot for right panel content injection (Phase 5/7/9/10)
- withClientOnly() wrapper for Rough.js components (Phase 1)
- CSS slideUp staggered animations (d1-d10) for page entrance (all pages)
- TanStack Query hooks: keys-factory → queryOptions-factory → thin-wrapper (Phase 2)
- next-intl i18n with namespace per page (Phase 1+)
- Client-side filtering via useMemo (Phase 8 deadlines)

### Integration Points
- Page route: `app/[locale]/(dashboard)/timetable/page.tsx`
- Sidebar "Timetable" nav item should be active on this page (Calendar icon in Sidebar.tsx)
- Right panel content injected via portal-slot into #right-panel-slot in AppShell
- Event block click navigates to Course Detail page: `/courses/[courseId]`
- Deadline overlay links navigate to Deadlines page or Course Detail

</code_context>

<specifics>
## Specific Ideas

- **Prototype is the primary visual spec**: timetable.html defines exact layout, event block styles, compressed zone mechanics, overlap algorithm, deadline overlay styling — downstream agents should match it closely
- **Real ICS data**: The fixture must be generated from the user's actual USYD timetable ICS, not fabricated. This ensures realistic event distribution, timing, and room data
- **Breathing arrow for deadline overflow**: When deadlines are below viewport (e.g., 11PM/midnight deadlines), show "N more deadline(s)" hint at bottom of that day column with the same breathing arrow animation from Dashboard's HeroSection scroll prompt. Disappears when scrolled into view
- **Week label above date selector**: Above the `16/03 — 22/03/2026` date range, prominently show "Week 4" (or "Break") so students know which teaching week they're in at a glance
- **Prototype overlap algorithm**: The assignCols() function in timetable.html implements a correct group-aware overlap detection — events that transitively overlap share a group, columns are assigned per group independently. Replicate this algorithm
- **Course color consistency**: Prototype hardcodes colors per course (orange for COMP2017, blue for COMP3221, etc.). In the app, use getCourseColor() from course-colors utility for consistency across all pages

</specifics>

<deferred>
## Deferred Ideas

- **ICS upload functionality**: Users upload ICS files in-app for real timetable data. Deferred to M2 (requires backend storage or localStorage persistence)
- **Configurable semester structure**: Let users set semester start/end dates and Break weeks in Settings. Deferred to M2
- **Event detail popover**: Show detailed popover on event click before navigating. Could be added post-M1
- **Print/export timetable**: PDF or image export of weekly schedule. Future feature
- **Room location map**: Link room codes to campus map. Out of scope

</deferred>

---

*Phase: 11-timetable-page*
*Context gathered: 2026-03-25*
