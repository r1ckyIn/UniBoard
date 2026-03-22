# Phase 5: Dashboard Page - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Dashboard page — the first page that uses AppShell (Sidebar + Header + RightPanel). Users see their complete academic overview at a glance: hero welcome section (full-viewport), stats row (WAM/Target/Alerts), course grades table, upcoming deadlines timeline, assessment weight donut chart, and right panel (profile card, mini calendar, recent activity). This is the main landing page after login/setup.

Requirements: UI-01

</domain>

<decisions>
## Implementation Decisions

### Hero Section
- **Data-driven greeting**: time-of-day (Good morning/afternoon/evening) + user's first name from auth store
- **Date line**: real weekday + semester week number, Rough Notation underline annotations on weekday and week number (matching prototype)
- **Encouragement text**: references recent mock data (e.g., "The COMP2017 lab is done"). **Must expose an interface/abstraction layer** — user will maintain a curated encouragement text catalog that switches based on the student's completed deadlines/tasks count over the past 3-7 days. Rough Notation highlight on the emotional key phrase
- **Scroll prompt**: "your dashboard" text + down arrow with gentle bobbing animation. Rough Notation annotation on the text
- **Scroll behavior**: smooth scroll to Stats Row on click. **Hero text auto-fades out** (parallax effect) as user scrolls down, letting data cards take visual priority
- **Hero entrance**: Motion (framer-motion) spring animations — staggered sequence: doodles fadeIn → greeting → date → encouragement → scroll prompt

### Stats Row
- 3 stat cards: WAM (orange), GPA Target (blue), Alerts (amber) — all with Rough.js borders
- **Display-only, not clickable** — no navigation on click
- **No countUp animation** — values display immediately
- Data from `useGpaReport()` hook (WAM, target) and computed alerts count

### Course Grades Table
- Displays all enrolled courses with: course code, course name, assessed % (Rough.js canvas progress bar), earned %, target badge, grade band indicator
- **Row hover**: shows "predict →" link (opacity transition from prototype)
- **"predict →" click**: navigates to Predict page (Phase 9) and opens the clicked course's card
- **Row click**: navigates to Course Detail page (Phase 7)
- **Rough.js progress bar**: replicate prototype's canvas-based hand-drawn progress bar for assessed %
- Data from `useCourses()` and grade-related hooks

### Upcoming Deadlines & Assessment Weights (Linked Cards)
- **Bottom row**: 2-column grid — Deadlines (left) + Assessment Weights donut (right)
- **Default donut course**: shows the course that owns the nearest upcoming deadline
- **Empty state**: if no deadlines, donut shows placeholder text
- **Deadline card 3 interaction modes**:
  1. **Hover without click**: micro-displacement pop-up animation (same as prototype `translateX(4px)`)
  2. **Hover + click**: switches Assessment Weights donut view to show clicked deadline's course weights. The weight segment containing the clicked deadline's assessment type is **highlighted**
  3. **"see details" button**: positioned left of the remaining-days badge (e.g., "3 days"), navigates to the deadline's detail page
- **Rough.js timeline**: hand-drawn vertical line + colored dots (urgent=orange, soon=blue, later=green), replicate prototype
- **Donut entry animation**: segments start separated/exploded, then all converge toward center to form the complete donut. Must be smooth and fluid
- Data from `useDeadlines()` hook + course outline data for weights

### Right Panel

#### Profile Card
- Data from auth store (name, email) + user profile hook (faculty/program) + courses hook (course count, credit points)
- **Show faculty/program name** (e.g., "Bachelor of Science"), NOT major (e.g., NOT "Computer Science")
- Faculty determined from Canvas Courses module — the portal course name indicates the student's program
- Avatar with gradient (orange), user initials

#### Mini Calendar
- **Navigable**: left/right arrows to switch months
- **Deadline dot markers**: dates with deadlines show orange dots
- **Dot color depth scales** with the cumulative weight of that day's deadlines — more deadlines / higher total weight % → deeper orange color. Threshold-based color deepening
- **Today highlighted** with solid orange
- **Date click**: navigates to Deadlines page (Phase 8)
- Data from `useDeadlines()` hook + course outline weight data

#### Recent Activity
- Shows latest 4-5 activity items (new grades, staff replies, deadline reminders, endorsed answers)
- Data from `useNotifications()` hook
- **Click behavior**: clicking any activity shows a **confirmation dialog** asking "Navigate to external link?" — if user confirms, opens the external URL (e.g., Ed Discussion post, Canvas grade page) in a new tab
- Activity icons: grade (green), discussion (blue), deadline (orange) — matching prototype

### Header Dropdowns (Full Implementation)
- **Notification panel**: data from `useNotifications()` hook, shows unread dot, notification items with icons/timestamps, "View all notifications" footer link, dropIn animation
- **Avatar menu**: user name/email from auth store, menu items (Profile, Settings, API Tokens → navigate to respective pages, Logout → call auth hook). Arrow notch on dropdown
- **Click-outside-to-close** behavior for both dropdowns

### Entrance Animations
- **Hero area**: Motion (framer-motion) spring animations — staggered layers with springy feel, consistent with Phase 3/4 animation style
- **Content area** (Stats, Grades, Deadlines, Donut, Right Panel): CSS-based staggered slideUp + fadeIn — d1-d10 with delays from ~40ms to ~720ms, matching prototype timing
- **Donut**: custom converge animation (segments separated → merge to center)

### Loading & Error States
- **Loading**: skeleton animations matching card shapes — maintain UniBoard paper-texture aesthetic (warm colors, not generic grey)
- **Error**: in-card friendly error message + retry button. No full-page error screens
- Per-section independent loading (hero loads first, stats/grades/deadlines can load independently)

### i18n
- Full EN/ZH support for all Dashboard text (hero greeting, stats labels, table headers, card titles, button text, error messages)
- Add `dashboard` namespace to next-intl messages

### Claude's Discretion
- Exact Motion spring parameters for Hero entrance
- CSS animation timing details for content staggered entrance
- Skeleton design specifics (shape, shimmer style)
- Rough.js seed values and styling parameters for donut, progress bars, timeline
- Encouragement text placeholder content for mock (the interface must be extensible)
- Error message wording and retry UX details
- Exact Donut converge animation implementation (CSS vs Motion vs requestAnimationFrame)
- Calendar weight-to-color-depth mapping function (thresholds)
- External link confirmation dialog design

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Specification (PRIMARY — this IS the spec)
- `prototype/dashboard.html` — Dashboard page prototype: hero, stats row, course grades table, deadline timeline, donut chart, right panel (profile/calendar/activity), header dropdowns, all animations and interactions
- `prototype/DESIGN_SYSTEM.md` — Reusable CSS patterns, color vars, card styles, paper texture, Rough.js usage patterns

### Design Philosophy (reference only)
- `docs/frontend_brief.md` — Aesthetic direction, color system rationale

### Technical Architecture
- `docs/UniBoard_TRD_v2.md` §12.4 — Course endpoints (grades, materials, outline)
- `docs/UniBoard_TRD_v2.md` §12.5 — GPA endpoints (report, predict, path)
- `docs/UniBoard_TRD_v2.md` §12.6 — Deadline endpoints (timeline, upcoming)
- `docs/UniBoard_TRD_v2.md` §12.7 — Intelligence & notification endpoints
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification

### Requirements
- `.planning/REQUIREMENTS.md` — UI-01 (Dashboard page requirement)
- `.planning/ROADMAP.md` — Phase 5 success criteria

### Prior Phase Context
- `.planning/phases/01-design-system-foundation/01-CONTEXT.md` — Design system decisions (prototype fidelity, Rough.js components, responsive strategy)
- `.planning/phases/02-api-contracts-mock-layer/02-CONTEXT.md` — API contracts, hooks architecture, mock data content decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/components/design-system/RoughCard.tsx` — Rough.js card with ResizeObserver border redraw, hover effect
- `frontend/components/design-system/HeroDoodles.tsx` — Full-screen colorful Rough.js doodles (stars, dots, sparkles, waves)
- `frontend/components/design-system/RoughNotationWrapper.tsx` — Rough Notation text annotation wrapper
- `frontend/components/design-system/ClientOnly.tsx` — Client-only wrapper for Rough.js SSR safety
- `frontend/components/layout/AppShell.tsx` — Three-column layout (Sidebar + main + RightPanel)
- `frontend/components/layout/Header.tsx` — Header with search bar, notification/avatar buttons (extend with dropdown functionality)
- `frontend/components/layout/RightPanel.tsx` — Right panel shell (needs dashboard content)
- `frontend/components/layout/Sidebar.tsx` — Sidebar with navigation items
- `frontend/hooks/use-gpa.ts` — useGpaReport(), useGpaPredict(), useGpaPath() hooks
- `frontend/hooks/use-grades.ts` — useCourseGrades(courseId) hook
- `frontend/hooks/use-courses.ts` — Course listing hooks
- `frontend/hooks/use-deadlines.ts` — Deadline hooks
- `frontend/hooks/use-notifications.ts` — Notification hooks
- `frontend/hooks/use-user.ts` — User profile hooks
- `frontend/lib/auth/store.ts` — zustand auth store (user info, tokenConfigured)
- `frontend/lib/fixtures/` — All fixture data (courses, grades, deadlines, gpa, notifications, etc.)

### Established Patterns
- `withClientOnly()` wrapper for Rough.js components (Phase 1)
- Motion (framer-motion) for entrance animations — AnimatePresence, spring configs (Phase 3/4)
- `next-intl` for i18n with `app/[locale]/` route structure (Phase 1)
- `(dashboard)` route group with AppShell layout (Phase 1)
- URL search params for cross-page state (Phase 3/4)
- `ky` HTTP client with auth token injection (Phase 2)
- TanStack Query hooks: keys-factory → queryOptions-factory → thin-wrapper pattern (Phase 2)

### Integration Points
- Dashboard is `app/[locale]/(dashboard)/page.tsx` — already exists as placeholder
- `(dashboard)/layout.tsx` wraps AppShell — Dashboard inherits Sidebar + Header + RightPanel
- Header component needs extension for notification panel and avatar menu dropdowns
- RightPanel component needs dashboard-specific content (profile, calendar, activity)
- Sidebar "Dashboard" nav item should be active when on this page
- Navigation targets: Predict page (Phase 9), Course Detail (Phase 7), Deadlines (Phase 8) — pages may not exist yet, use route paths that will be created later

</code_context>

<specifics>
## Specific Ideas

- **Encouragement text interface**: Must be designed as a pluggable system — a function/hook that accepts recent activity data (completed deadlines count in past 3-7 days) and returns the appropriate encouragement text. User will maintain a curated catalog of messages later
- **Deadlines ↔ Donut linkage**: The two bottom-row cards are tightly coupled — clicking a deadline item in the left card changes the donut in the right card. This cross-card state should be managed cleanly (local state or shared context)
- **Calendar color depth**: The orange dot intensity on calendar dates is proportional to the cumulative assessment weight of deadlines on that day. This requires combining deadline data with course outline weight data
- **Profile Card faculty detection**: The program name (e.g., "Bachelor of Science") comes from Canvas Courses — there's typically a "portal" course that indicates the student's degree. Mock fixture should include this
- **External link confirmation**: Recent Activity click opens a dialog (not browser confirm) asking permission before opening external Ed/Canvas URLs. Consistent with UniBoard's aesthetic
- **Hero parallax fade**: As user scrolls past the hero section, the hero text fades out progressively. This creates a natural transition from the welcome area to the data-dense dashboard content

</specifics>

<deferred>
## Deferred Ideas

- Predict page (Phase 9) — "predict →" link navigates there but page doesn't exist yet
- Course Detail page (Phase 7) — row click navigates there but page doesn't exist yet
- Deadlines page (Phase 8) — calendar date click and "see details" navigate there but page doesn't exist yet
- Real-time data refresh / WebSocket updates — M2+ backend feature
- Dashboard widget customization / drag-and-drop — v2 personalization
- Mobile responsive layout — MOBILE-01 (v2)

</deferred>

---

*Phase: 05-dashboard-page*
*Context gathered: 2026-03-22*
