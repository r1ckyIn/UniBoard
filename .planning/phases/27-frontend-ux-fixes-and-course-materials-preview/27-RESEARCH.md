# Phase 27: Frontend UX Fixes & Course Materials Preview - Research

**Researched:** 2026-04-04
**Domain:** Next.js frontend UX enhancements (navigation, styling, scroll detection, slide-out panel)
**Confidence:** HIGH

## Summary

Phase 27 addresses five frontend improvements: making dashboard reminder cards interactive (D-01), confirming predict button navigation already works (SC2 -- no changes needed), adding solid/dashed border distinction to timetable events based on attendance/participation assessment data (D-02), adding a scroll overflow indicator to the timetable deadline list (SC4), and building an inline material preview slide-out panel on the course detail page (D-03).

All five items are strictly frontend changes. No backend API modifications are required. The existing data structures already contain all necessary information: `action_url` in Notification schema for navigation targets, `group_name` in AssessmentWeight for attendance/participation detection, and `url` in Material/MaterialItem schemas for preview targets. The project has established patterns for every technique needed: `router.push()` with query params, native `<dialog>`, ExternalLinkDialog, `withClientOnly()`, and portal-slot pattern.

**Primary recommendation:** Implement as 4-5 focused plans touching isolated component boundaries. Each success criterion maps cleanly to 1-2 files. The slide-out panel (D-03) is the only new component; everything else modifies existing components with minimal surface area.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Reminder Card Navigation):** Mixed navigation mode -- route to in-app pages when available, external links with warning dialog otherwise
  - `grade` activity -> `/courses/{courseId}` (in-app)
  - `deadline` activity -> `/deadlines?date={due_date}` (in-app, with date param)
  - `discussion` / `endorsed` activity -> external Ed link via ExternalLinkDialog (existing pattern)
- **D-02 (Timetable Event Block Styling):** Solid vs dashed border to distinguish attendance/participation courses
  - Courses with attendance/participation assessment component -> solid border
  - Courses without -> dashed border
  - Data source: Unit Outline assessment weights (UnitOutlineParser already parses weight breakdown)
  - All other existing styles (color, opacity, layout) remain unchanged
- **D-03 (Material Viewer):** Right-side slide-out panel with iframe embed for document preview
  - Click MaterialItem -> panel slides in from right side
  - Uses iframe to load document URL
  - User stays on Course Detail page during preview

### Claude's Discretion
- **Scroll indicator design:** Claude decides the visual cue for deadline list overflow on Timetable page (gradient fade, badge, arrow, or other approach)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UX-01 | Dashboard reminder cards are functional (navigate or trigger action on click) | D-01 decision fully specifies routing logic; `mapNotificationToActivity` already extracts `action_url`; `ExternalLinkDialog` reusable for external links |
| UX-02 | Dashboard course card predict button pre-selects the corresponding course on Predict page | Already working (confirmed in CONTEXT.md SC2). `CourseGradesTable.tsx:42` already calls `router.push('/predict?course=${courseId}')`. No changes needed. |
| UX-03 | Timetable lecture/tutorial blocks visually align with Allocate+ style (color-coded, time/location) | D-02 decision: solid vs dashed left border based on attendance/participation. `assessment_weights.group_name` contains "Attendance" data. Need to expose this to TimetableEvent. |
| UX-04 | Timetable page shows scroll indicator when deadline items overflow visible area | Scroll detection via `scrollHeight > clientHeight` check + visual indicator. TimetableUpcomingDeadlines wraps content in RoughCard. |
| FEAT-01 | Course detail page has inline material preview (mini-window viewer) | D-03 decision: slide-out panel with iframe. MaterialItem already has `url` prop (currently unused in click handler). New `MaterialViewerPanel` component needed. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | App framework | Already in use |
| TanStack Query v5 | 5.x | Data fetching hooks | Already in use |
| Tailwind CSS | v4 | Styling | Already in use, CSS-first config |
| next-intl | latest | i18n | Already in use |
| lucide-react | latest | Icons | Already in use |
| date-fns | latest | Date utilities | Already in use |

### Supporting
No new libraries needed. All implementations use existing project dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS scroll detection | IntersectionObserver | IntersectionObserver already polyfilled in test setup; CSS-only gradient is simpler for this use case |
| Custom slide-out panel | Headless UI Dialog | Project already uses native `<dialog>` pattern; maintaining consistency is more important |
| iframe embed | PDF.js / react-pdf | iframe handles Canvas/Ed URLs directly; PDF.js adds complexity for no benefit since we link to external viewer |

## Architecture Patterns

### Recommended Changes per Success Criteria

```
frontend/
├── components/
│   ├── dashboard/
│   │   └── RecentActivity.tsx          # Modify: add per-type onClick routing (UX-01)
│   ├── timetable/
│   │   ├── TimetableEvent.tsx          # Modify: add border-style logic (UX-03)
│   │   ├── TimetableUpcomingDeadlines.tsx  # Modify: add scroll indicator (UX-04)
│   │   └── TimetablePage.tsx           # Modify: pass attendance data to events (UX-03)
│   └── course-detail/
│       ├── MaterialsSection.tsx        # Modify: add onPreview callback (FEAT-01)
│       ├── MaterialItem.tsx            # Modify: wire click to onPreview (FEAT-01)
│       ├── MaterialViewerPanel.tsx     # NEW: slide-out iframe panel (FEAT-01)
│       └── CourseDetailPage.tsx        # Modify: manage viewer state (FEAT-01)
├── lib/
│   └── notifications/
│       └── map-to-activity.ts          # Modify: add courseId/dueDate fields (UX-01)
└── __tests__/
    ├── dashboard/
    │   └── RecentActivity.test.tsx     # Implement: currently all .todo() stubs
    ├── timetable/
    │   ├── TimetableEvent.test.tsx     # NEW: border-style logic tests
    │   └── TimetableUpcomingDeadlines.test.tsx  # NEW: scroll indicator tests
    └── course-detail/
        └── MaterialViewerPanel.test.tsx  # NEW: slide-out panel tests
```

### Pattern 1: Per-Type Navigation Routing (UX-01)

**What:** RecentActivity currently sends ALL clicks through ExternalLinkDialog. D-01 requires type-based routing: grade -> in-app, deadline -> in-app with date param, discussion/endorsed -> external link dialog.

**When to use:** When activity type determines navigation behavior.

**Implementation approach:**
```typescript
// In RecentActivity or map-to-activity, determine navigation mode per type
// Extend ActivityItem to carry routing metadata
interface ActivityItem {
  id: string;
  type: "grade" | "discussion" | "deadline" | "endorsed";
  text: string;
  strongText: string;
  time: string;
  externalUrl?: string;    // for discussion/endorsed (Ed links)
  internalPath?: string;   // for grade/deadline (in-app routes)
}
```

The key change is in `mapNotificationToActivity`: parse `action_url` to determine if it's an internal route (starts with `/`) or external URL. For `grade` notifications, the existing `action_url` already points to `/courses/{id}`. For `deadline` notifications, construct `/deadlines?date={date}` from the notification data. For `discussion`/`endorsed`, the action_url would be an external Ed URL (the ExternalLinkDialog already handles this).

**Current fixture data insight:** All notification fixtures currently use internal paths (e.g., `/courses/crs_comp3221`). In real data, `discussion_reply` and `endorsed_answer` notifications will have external Ed URLs. The implementation must handle both patterns:
- Internal paths (`/courses/...`, `/settings`, `/deadlines?date=...`) -> `router.push()`
- External URLs (`https://edstem.org/...`) -> ExternalLinkDialog

### Pattern 2: Data-Driven Border Style (UX-03)

**What:** TimetableEvent needs to know whether its course has attendance/participation assessment to render solid vs dashed border.

**When to use:** When styling depends on data not currently available in the component's props.

**Implementation approach:**
The `TimetableSession` type does NOT include assessment weight data. The attendance/participation information lives in `CourseDetail.assessment_weights[].group_name`. Options:

1. **Precompute a Set in TimetablePage** (recommended): TimetablePage already fetches courses via `useCourses()`. It can also fetch course details (or use a new lightweight endpoint). Build a `Set<string>` of course codes that have attendance/participation, pass as prop to TimetableGrid -> TimetableEvent.

2. **Use course detail data if already cached**: Course details are cached in TanStack Query. Check cache availability.

**Recommended approach:** Compute `attendanceCourses: Set<string>` in TimetablePage using course detail data. The page already fetches all courses. For the fixture/mock layer, hardcode the set based on fixture data (STAT2011 and MATH2021 have "Attendance" group_name). Pass a boolean `hasAttendance` prop to TimetableEvent.

```typescript
// TimetableEvent: add hasAttendance prop
interface TimetableEventProps {
  session: TimetableSession & { _col?: number; _cc?: number };
  top: number;
  height: number;
  hasAttendance?: boolean;  // NEW
  onClick?: () => void;
}

// In style:
borderLeft: `3px ${hasAttendance ? 'solid' : 'dashed'} ${color.base}`
```

**Data flow:** TimetablePage fetches course details (or uses cached data) -> extracts courses with `group_name` matching "Attendance" or "Participation" (case-insensitive) -> builds `attendanceCourses: Set<string>` -> passes to TimetableGrid -> TimetableEvent receives `hasAttendance` boolean.

### Pattern 3: Scroll Overflow Indicator (UX-04)

**What:** TimetableUpcomingDeadlines should show a visual cue when deadline items overflow the visible area.

**When to use:** When a fixed-height container may overflow.

**Scroll indicator recommendation (Claude's Discretion):** Use a **bottom gradient fade** that appears when content is scrollable and disappears when scrolled to bottom. This is the most established pattern in the project (the AppShell RightPanel already uses scroll-aware styling with `overflow-y-auto`).

**Implementation:**
```typescript
// Use useRef + scroll event listener
// Show gradient overlay at bottom when scrollHeight > clientHeight
// Hide when scrollTop + clientHeight >= scrollHeight - threshold
```

The TimetableUpcomingDeadlines wraps items in a RoughCard. Add a wrapper `div` with `max-height` and `overflow-y-auto` around the deadline items list, with a pseudo-element or overlay div for the gradient. Use `useState<boolean>` for `canScrollDown` state, updated via scroll event and ResizeObserver.

### Pattern 4: Slide-Out Material Viewer Panel (FEAT-01)

**What:** New `MaterialViewerPanel` component: a right-side slide-out panel containing an iframe for document preview.

**When to use:** When user clicks a MaterialItem.

**Implementation approach:**

```typescript
// MaterialViewerPanel.tsx
interface MaterialViewerPanelProps {
  url: string | null;       // null = panel closed
  title: string;
  onClose: () => void;
}
```

**Key design decisions:**
1. **Positioning:** `fixed` position, right side, full height below header. CSS transition on `transform: translateX()` for slide animation.
2. **Width:** ~50-60% of main content area, or a fixed width (e.g., 600px with max-width constraint).
3. **iframe:** Standard `<iframe src={url} />` with sandbox attributes for security.
4. **Close behavior:** Click X button, press Escape key, or click outside.
5. **State management:** Lifted to `CourseDetailPage` -- `useState<{ url: string; title: string } | null>` for selected material.

**Data flow:** CourseDetailPage manages `previewMaterial` state -> passes `onPreview` callback to MaterialsSection -> MaterialsSection passes to MaterialItem -> MaterialItem onClick calls `onPreview(url, title)` -> CourseDetailPage renders MaterialViewerPanel when state is non-null.

**Important notes:**
- Canvas file URLs may require authentication (user's Canvas session cookie). The iframe will only work if the user is logged into Canvas in the same browser. This is an inherent limitation, not a bug -- document this behavior.
- Ed Lessons URLs similarly require Ed authentication.
- For URLs that cannot be embedded (X-Frame-Options restrictions), show a fallback "Open in new tab" link.

### Anti-Patterns to Avoid
- **Do NOT use ExternalLinkDialog for in-app navigation** -- D-01 explicitly says grade/deadline use router.push(), only discussion/endorsed use the dialog.
- **Do NOT modify TimetableSession type or OpenAPI schema** -- attendance data comes from course detail, not timetable API.
- **Do NOT use `scrollTo` without `typeof` guard** -- jsdom doesn't implement it (documented pitfall in CLAUDE.md).
- **Do NOT add new npm dependencies** -- all implementations use existing project libraries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll detection | Custom scroll math from scratch | ResizeObserver + scroll event | Already polyfilled in test setup |
| Modal/Dialog | Custom modal component | Native `<dialog>` element | Project pattern since Phase 5 |
| URL detection (internal vs external) | Complex regex | Simple `startsWith('/')` check | All internal routes are relative paths |
| Slide animation | JavaScript-driven animation | CSS `transition: transform` | CSS transitions are standard for slide-out panels |
| iframe security | Custom sandbox logic | `sandbox` attribute on iframe | Browser-native iframe sandboxing |

## Common Pitfalls

### Pitfall 1: jsdom Does Not Implement scrollTo/scrollIntoView
**What goes wrong:** Tests fail with `scrollRef.current?.scrollTo is not a function`.
**Why it happens:** jsdom is a DOM emulator that doesn't implement scroll APIs.
**How to avoid:** Always guard scroll calls with `typeof element.scrollTo === "function"` check. The project already has this pattern in TimetableGrid (line 86), DeadlineAiChat (line 34), PredictPage (line 219).
**Warning signs:** Test failures mentioning "is not a function" on scroll-related methods.

### Pitfall 2: iframe Cross-Origin Embedding Restrictions
**What goes wrong:** Canvas/Ed URLs may return `X-Frame-Options: DENY` or `SAMEORIGIN`, preventing iframe embedding.
**Why it happens:** Many LMS platforms restrict iframe embedding for security.
**How to avoid:** Add an `onError` handler on the iframe. If embedding fails, show a fallback UI with "Open in new tab" button. Test with actual Canvas/Ed URLs during UAT.
**Warning signs:** Blank iframe or console errors about frame-ancestors CSP.

### Pitfall 3: Notification Type vs Activity Type Mismatch
**What goes wrong:** `mapNotificationToActivity` maps notification types to activity types. If the mapping is incomplete, items fall through to default "deadline" type.
**Why it happens:** New notification types added on backend without frontend mapping update.
**How to avoid:** The current mapping covers: `grade_published` -> grade, `discussion_reply` -> discussion, `endorsed_answer` -> endorsed, everything else -> deadline. For D-01, the navigation routing must check `activity.type`, not `notification.type`.
**Warning signs:** All activities showing the same click behavior regardless of type.

### Pitfall 4: TanStack Query Cache Miss for Course Details
**What goes wrong:** TimetablePage needs course detail data (assessment_weights) to determine attendance courses, but this data isn't fetched by default on the timetable page.
**Why it happens:** TimetablePage only fetches `useCourses()` (list), not `useCourseDetail()` (per-course details).
**How to avoid:** Use `useQueries` pattern (same as PredictPage line 64-81) to fetch all course details in parallel. Or extract attendance info into the Course list API response (requires backend change -- avoid this). Best approach: fetch course details for all enrolled courses via useQueries, then build the attendance set.
**Warning signs:** Dashed borders on all events because course detail data is undefined.

### Pitfall 5: Portal-Slot Conflicts with Slide-Out Panel
**What goes wrong:** CourseDetailPage already uses `createPortal` to inject right panel content. A slide-out panel that also uses fixed positioning could overlap with the right panel.
**Why it happens:** Both the right panel and slide-out panel occupy the right side of the screen.
**How to avoid:** The slide-out panel should be positioned as a `fixed` overlay with a higher z-index, on top of the entire layout (including the right panel). It's a temporary overlay, not a layout element.
**Warning signs:** Visual overlap or z-index conflicts between right panel and viewer panel.

## Code Examples

### Example 1: Per-Type Click Handler for RecentActivity (UX-01)
```typescript
// Source: D-01 decision + existing RecentActivity.tsx pattern
const handleItemClick = useCallback((item: ActivityItem) => {
  if (item.internalPath) {
    // In-app navigation for grade/deadline
    router.push(item.internalPath);
  } else if (item.externalUrl) {
    // External link dialog for discussion/endorsed
    setDialogUrl(item.externalUrl);
  }
}, [router]);
```

### Example 2: Attendance Detection from Assessment Weights (UX-03)
```typescript
// Source: fixture data analysis -- group_name "Attendance" in STAT2011 and MATH2021
const ATTENDANCE_KEYWORDS = ["attendance", "participation"];

function hasAttendanceComponent(assessmentWeights: AssessmentWeight[]): boolean {
  return assessmentWeights.some((aw) =>
    ATTENDANCE_KEYWORDS.some((kw) =>
      aw.group_name.toLowerCase().includes(kw)
    )
  );
}
```

### Example 3: Scroll Overflow Detection (UX-04)
```typescript
// Source: project pattern from TimetableGrid.tsx scroll handling
const listRef = useRef<HTMLDivElement>(null);
const [canScrollDown, setCanScrollDown] = useState(false);

useEffect(() => {
  const el = listRef.current;
  if (!el) return;
  const check = () => {
    setCanScrollDown(el.scrollHeight > el.clientHeight + 2 &&
      el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };
  check();
  el.addEventListener("scroll", check, { passive: true });
  return () => el.removeEventListener("scroll", check);
}, [deadlines]);
```

### Example 4: Slide-Out Panel CSS Transition (FEAT-01)
```typescript
// Source: standard CSS transition pattern
<div
  className={cn(
    "fixed top-[var(--spacing-header-h)] right-0 bottom-0 bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.08)] z-50",
    "transition-transform duration-300 ease-out",
    url ? "translate-x-0" : "translate-x-full"
  )}
  style={{ width: "min(600px, 50vw)" }}
>
  <div className="flex items-center justify-between p-4 border-b border-[#eae7e0]">
    <span className="text-[0.84rem] font-semibold truncate">{title}</span>
    <button onClick={onClose}>close</button>
  </div>
  <iframe
    src={url ?? undefined}
    className="w-full h-[calc(100%-56px)] border-none"
    sandbox="allow-same-origin allow-scripts allow-popups"
    title={title}
  />
</div>
```

### Example 5: Border Style in TimetableEvent (UX-03)
```typescript
// Source: existing TimetableEvent.tsx line 57 + D-02 decision
borderLeft: `3px ${hasAttendance ? 'solid' : 'dashed'} ${color.base}`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All reminder cards open external link dialog | Type-based routing (D-01) | Phase 27 | Grade/deadline navigate in-app |
| All timetable events have solid border | Solid/dashed based on attendance data | Phase 27 | Visual distinction for attendance courses |
| No material preview | Slide-out iframe panel | Phase 27 | Inline preview without page navigation |

## Open Questions

1. **Canvas/Ed iframe embedding compatibility**
   - What we know: Canvas and Ed URLs may have X-Frame-Options restrictions that prevent iframe embedding.
   - What's unclear: Whether specific URL patterns are embeddable (e.g., Canvas file preview URLs vs download URLs, Ed lesson URLs).
   - Recommendation: Implement with iframe + fallback "Open in new tab" button. Validate during UAT with real URLs. This is a known limitation, not a blocker.

2. **Course detail data availability on timetable page**
   - What we know: TimetablePage fetches `useCourses()` (list) but not per-course details. Assessment weights are in course detail, not course list.
   - What's unclear: Performance impact of fetching 5 course details on timetable page load.
   - Recommendation: Use `useQueries` parallel fetch (same as PredictPage pattern). 5 parallel requests is acceptable. Data is likely already cached from other pages.

3. **Notification action_url format for discussion/endorsed types**
   - What we know: Current fixture notifications only have internal paths. Real `discussion_reply` / `endorsed_answer` notifications should have external Ed URLs.
   - What's unclear: Whether the backend currently returns external URLs for these notification types.
   - Recommendation: Implement URL detection (internal vs external) based on whether it starts with `/` or `http`. This handles both cases.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest + @testing-library/react |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && pnpm vitest run --reporter=verbose` |
| Full suite command | `cd frontend && pnpm vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | Reminder card per-type navigation | unit | `cd frontend && pnpm vitest run __tests__/dashboard/RecentActivity.test.tsx -x` | Exists but all .todo() stubs -- Wave 0 |
| UX-02 | Predict button pre-selects course | unit | Already tested in CourseGradesTable.test.tsx | Exists |
| UX-03 | Timetable event solid/dashed border | unit | `cd frontend && pnpm vitest run __tests__/timetable/TimetableEvent.test.tsx -x` | Does not exist -- Wave 0 |
| UX-04 | Scroll indicator on deadline overflow | unit | `cd frontend && pnpm vitest run __tests__/timetable/TimetableUpcomingDeadlines.test.tsx -x` | Does not exist -- Wave 0 |
| FEAT-01 | Material viewer slide-out panel | unit | `cd frontend && pnpm vitest run __tests__/course-detail/MaterialViewerPanel.test.tsx -x` | Does not exist -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && pnpm vitest run && pnpm typecheck && pnpm lint`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/dashboard/RecentActivity.test.tsx` -- implement .todo() stubs for per-type navigation (UX-01)
- [ ] `__tests__/timetable/TimetableEvent.test.tsx` -- covers UX-03 (border-style logic)
- [ ] `__tests__/timetable/TimetableUpcomingDeadlines.test.tsx` -- covers UX-04 (scroll indicator)
- [ ] `__tests__/course-detail/MaterialViewerPanel.test.tsx` -- covers FEAT-01 (slide-out panel)

## Project Constraints (from CLAUDE.md)

- **Code comments:** Must be pure English, no Chinese
- **i18n:** All user-facing strings through next-intl translation files (en.json / zh.json)
- **Testing:** vitest with @testing-library/react, jsdom environment
- **Type checking:** `tsc --noEmit` must pass (strict TypeScript)
- **Linting:** `eslint --max-warnings 0` must pass
- **Build:** `next build --turbopack` must pass
- **Git:** Feature branch required, no direct commits to main
- **Commit format:** `<type>(<phase>-<plan>): <description>` (GSD project)
- **PR workflow:** `/pr-cycle` skill after phase completion
- **Design system:** Anthropic-inspired warm palette, Rough.js hand-drawn borders, Source Serif 4 + Inter fonts
- **Frontend port:** Dev server on port 3001
- **scrollTo guard:** Always check `typeof element.scrollTo === "function"` before calling
- **Native dialog:** Use `<dialog>` element for modals (not custom modals)
- **No Co-Authored-By:** Hook blocks this in commit messages
- **No new dependencies:** This phase uses only existing project libraries

## Sources

### Primary (HIGH confidence)
- Codebase analysis of all 6 target components (RecentActivity, TimetableEvent, TimetableUpcomingDeadlines, MaterialsSection, MaterialItem, ExternalLinkDialog)
- OpenAPI schema (frontend/openapi/openapi.yaml) -- Notification, Material, MaterialItem, AssessmentWeight, Course schemas
- Fixture data (courses.ts, notifications.ts, materials.ts, timetable.ts) -- real data patterns

### Secondary (MEDIUM confidence)
- CONTEXT.md D-01/D-02/D-03 decisions -- user-locked implementation choices
- Prototype HTML files (course-detail.html, timetable.html) -- design reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing project dependencies
- Architecture: HIGH -- all patterns are extensions of existing codebase patterns (portal-slot, router.push, ExternalLinkDialog)
- Pitfalls: HIGH -- jsdom scroll limitation is documented in CLAUDE.md; iframe cross-origin is well-known; all other pitfalls observed from codebase analysis
- Data availability: MEDIUM -- attendance data requires fetching course details on timetable page (not currently done, but proven pattern from PredictPage)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable -- frontend-only changes, no external API dependencies)
