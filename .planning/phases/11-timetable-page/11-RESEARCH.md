# Phase 11: Timetable Page - Research

**Researched:** 2026-03-25
**Domain:** Frontend page development (React/Next.js weekly timetable grid)
**Confidence:** HIGH

## Summary

Phase 11 builds a weekly timetable page -- a 7-day time grid displaying class sessions from ICS-parsed fixture data, with deadline overlay lines, week navigation (slider + arrows + All Weeks mode), compressed evening zone, and a right panel (MiniCalendar, Upcoming Deadlines, Course Legend). This is a frontend-only page following all established patterns from Phases 1-10.

The prototype (`prototype/timetable.html`) serves as the primary visual specification and contains a fully working implementation including the overlap algorithm (`assignCols()`), time-to-pixel mapping (`tY()`), compressed evening zone logic, and all CSS styles. The real ICS file (199 VEVENTs, 5 courses, 16 event types) has been analyzed and the prototype already encodes this data in a condensed per-recurring-event format (SE array) with per-week availability arrays.

**Primary recommendation:** Parse the ICS file at build time into a static TypeScript fixture (matching the prototype's SE data structure), add two new OpenAPI endpoints (`/timetable/sessions` and `/timetable/weeks`), create Route Handler mocks + TanStack Query hooks following Phase 2 patterns, then build the grid component tree replicating the prototype's exact layout and algorithms.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **ICS-based fixture data**: Parse user's real USYD timetable ICS file to generate structured fixture JSON. 199 VEVENT entries across 5 courses, 16 event types
- **Production vision**: Users will upload ICS files directly; M1 uses pre-parsed fixture; M2 adds upload flow
- **New OpenAPI endpoints**: Add `GET /api/v1/timetable/sessions` and `GET /api/v1/timetable/weeks` to openapi.yaml
- **New Route Handler mocks + TanStack Query hooks**: Follow contract-first pattern consistent with Phase 2 architecture
- **Dual-density time axis**: 8AM-6PM at 60px/hour (normal), 7PM-11PM at 28px/hour (compressed evening zone)
- **7-day grid**: Mon-Sun columns with day headers showing weekday + date. Current day column gets subtle orange tint
- **Current time indicator**: Red horizontal line with circle dot, real-time updates, only on current week
- **Event block click**: Navigates to course detail page (`/courses/[courseId]`)
- **Overlapping events**: Side-by-side column layout using assignCols() algorithm from prototype
- **Deadline dashed lines**: Colored dashed line + diamond dot + tag label at time position, data from `useDeadlines()` hook
- **Hover tooltip**: Urgency badge, title, course, time, "View details" link
- **Overflow handling**: "N more deadline(s)" hint with breathing arrow animation when deadlines below viewport
- **Real semester week structure**: 14 weeks based on ICS data (semester start 2026-02-23, Week 7 = Mid-semester Break)
- **Week label**: "Week N" (or "Break") prominently above date range selector
- **Week slider**: Range input (1-14) with orange fill progress
- **Prev/Next arrows**: Navigate one week. Disabled at boundaries
- **All Weeks mode**: All semester events overlaid on single 7-day grid, no dates, "Semester 1, 2026"
- **Break Week**: Centered message "Mid-semester Break -- No classes this week. Enjoy!"
- **Title Row**: Calendar icon, "Timetable" heading, semester badge, slider center, nav+mode right
- **Right Panel**: Portal-slot pattern (createPortal + #right-panel-slot)
- **Card 1 -- MiniCalendar**: Reuse Dashboard MiniCalendar component (Phase 5)
- **Card 2 -- Upcoming Deadlines**: 4 nearest deadlines with left color stripe + course code + task name + time + countdown badge
- **Card 3 -- Course Legend**: Course color dot + code + name for all enrolled courses
- **All 3 cards use RoughCard** with Rough.js hand-drawn borders
- **CSS slideUp staggered animations** (d1-d10) matching prototype pattern
- **Full EN/ZH i18n**: `timetable` namespace for next-intl messages
- **Loading & Error states**: Skeleton loading for grid + right panel, error + retry, empty state

### Claude's Discretion
- ICS parsing implementation details (build-time vs runtime, library choice)
- Exact timetable session TypeScript schema design
- Skeleton card shapes and shimmer details
- Rough.js seed values and styling for right panel cards
- Entrance animation timing fine-tuning
- Error/empty state wording and illustration choice
- MiniCalendar adaptation details for timetable context
- Breathing arrow animation implementation reuse approach

### Deferred Ideas (OUT OF SCOPE)
- ICS upload functionality (deferred to M2)
- Configurable semester structure (deferred to M2)
- Event detail popover (post-M1)
- Print/export timetable (future feature)
- Room location map (out of scope)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-08 | Timetable page with weekly schedule view | All research findings directly enable this: ICS fixture generation, OpenAPI endpoints, grid layout algorithms, week navigation, deadline overlay, right panel reuse, i18n support |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App Router, Route Handlers for API mocks | Already established |
| React | 19.1.0 | Component rendering | Already established |
| TanStack Query | ^5.91.2 | Data fetching hooks | keys-factory -> queryOptions-factory -> thin-wrapper pattern (Phase 2) |
| Tailwind CSS | v4 | Styling (CSS-first config via globals.css) | Already established |
| next-intl | 4.8.3 | i18n (EN/ZH) | Namespace-per-page pattern established |
| date-fns | ^4.1.0 | Date formatting, day calculations | Already used in MiniCalendar, deadlines |
| lucide-react | (installed) | Icons (Calendar, ChevronLeft, ChevronRight, Clock, Palette) | Already established |
| roughjs | 4.6.6 | Hand-drawn card borders | Already established via RoughCard |
| motion | ^12.38.0 | Animation (optional, page uses CSS animations) | Available but CSS slideUp preferred |
| ky | ^1.14.3 | HTTP client | Already established via api client |

### No Additional Libraries Needed

This phase requires zero new npm dependencies. The ICS file should be pre-parsed into a static TypeScript fixture at development time (not runtime parsing). The prototype already contains all algorithms needed (overlap detection, time mapping, compressed zone calculation).

**Recommendation for ICS parsing (Claude's Discretion):** Parse the ICS at build-time using a simple Node.js script or manually transcribe the prototype's SE array (which already encodes all 199 events as 19 recurring-event templates with per-week availability). The prototype's format is compact and correct -- no ICS parsing library needed.

## Architecture Patterns

### Recommended Project Structure
```
frontend/
  app/[locale]/(dashboard)/timetable/
    page.tsx                          # Server component, setRequestLocale
  app/api/v1/timetable/
    sessions/route.ts                 # GET mock: returns sessions for week/all
    weeks/route.ts                    # GET mock: returns semester week structure
  components/timetable/
    TimetablePage.tsx                 # Client component orchestrator (portal, state, hooks)
    TimetableTitleRow.tsx             # Title with icon, slider, nav, mode toggle
    TimetableGrid.tsx                 # Main 7-day grid with time axis
    TimetableEvent.tsx                # Individual event block
    TimetableDeadlineOverlay.tsx      # Deadline dashed lines + tooltips
    TimetableNowLine.tsx              # Red current-time indicator
    TimetableBreakMessage.tsx         # "Mid-semester Break" centered message
    TimetableRightPanel.tsx           # Portal content (MiniCalendar, Deadlines, Legend)
    TimetableUpcomingDeadlines.tsx    # Right panel deadline list card
    TimetableCourseLegend.tsx         # Right panel course legend card
  hooks/
    use-timetable.ts                  # useTimetableSessions, useSemesterWeeks hooks
  lib/fixtures/
    timetable.ts                      # Static fixture: sessions array + weeks array
  lib/timetable/
    time-utils.ts                     # tY() pixel mapping, formatTime, date helpers
    overlap.ts                        # assignCols() overlap algorithm (port from prototype)
    types.ts                          # TimetableSession, SemesterWeek, WeekMode types
  messages/
    en.json                           # + timetable namespace
    zh.json                           # + timetable namespace
  openapi/
    openapi.yaml                      # + timetable tag, schemas, endpoints
```

### Pattern 1: Portal-Slot Right Panel Injection
**What:** TimetablePage uses `createPortal` to inject right panel cards into `#right-panel-slot`.
**When to use:** Every dashboard page with right panel content.
**Example:**
```typescript
// Established pattern from Phase 5/7/9/10
const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
useEffect(() => {
  setPortalTarget(document.getElementById("right-panel-slot"));
}, []);

return (
  <>
    {/* Main content */}
    <div className="flex flex-col gap-3">
      <TimetableTitleRow ... />
      <TimetableGrid ... />
    </div>
    {/* Right panel via portal */}
    {portalTarget && createPortal(<TimetableRightPanel ... />, portalTarget)}
  </>
);
```

### Pattern 2: Contract-First Hook Pattern
**What:** OpenAPI schema -> types.gen.d.ts -> key factory -> queryOptions factory -> thin hook wrapper.
**When to use:** Every new data endpoint.
**Example:**
```typescript
// hooks/use-timetable.ts
export const timetableKeys = {
  all: ["timetable"] as const,
  sessions: (week?: number) => [...timetableKeys.all, "sessions", week] as const,
  weeks: () => [...timetableKeys.all, "weeks"] as const,
};

export const timetableOptions = {
  sessions: (week?: number) =>
    queryOptions({
      queryKey: timetableKeys.sessions(week),
      queryFn: () =>
        week !== undefined
          ? api.get("timetable/sessions", { searchParams: { week: String(week) } })
              .json<TimetableSessionsResponse>()
          : api.get("timetable/sessions").json<TimetableSessionsResponse>(),
    }),
  weeks: () =>
    queryOptions({
      queryKey: timetableKeys.weeks(),
      queryFn: () => api.get("timetable/weeks").json<SemesterWeeksResponse>(),
    }),
};
```

### Pattern 3: Overlap Algorithm (assignCols)
**What:** Groups transitively overlapping events, assigns columns per group independently.
**When to use:** When rendering events on the same day that may have overlapping time ranges.
**Example (ported from prototype):**
```typescript
// lib/timetable/overlap.ts
interface OverlappableEvent {
  start: number;  // Start hour (e.g., 9, 14.5)
  end: number;    // End hour
  _col?: number;  // Assigned column index
  _cc?: number;   // Total columns in group
}

export function assignCols<T extends OverlappableEvent>(events: T[]): T[] {
  events.sort((a, b) => a.start - b.start || a.end - b.end);
  const groups: number[][] = [];
  const visited = new Array(events.length).fill(false);

  for (let i = 0; i < events.length; i++) {
    if (visited[i]) continue;
    const grp = [i];
    visited[i] = true;
    let maxEnd = events[i].end;
    for (let j = i + 1; j < events.length; j++) {
      if (events[j].start < maxEnd) {
        grp.push(j);
        visited[j] = true;
        if (events[j].end > maxEnd) maxEnd = events[j].end;
      }
    }
    groups.push(grp);
  }

  groups.forEach((grp) => {
    const cols: number[] = [];
    grp.forEach((idx) => {
      const ev = events[idx];
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        if (ev.start >= cols[c]) { cols[c] = ev.end; ev._col = c; placed = true; break; }
      }
      if (!placed) { ev._col = cols.length; cols.push(ev.end); }
    });
    const mx = cols.length;
    grp.forEach((idx) => { events[idx]._cc = mx; });
  });

  return events;
}
```

### Pattern 4: Dual-Density Time Axis
**What:** 8AM-6PM at 60px/hour (normal zone), 7PM-11PM at 28px/hour (compressed zone). Dashed separator at 660px.
**When to use:** Positioning events and deadline lines on the grid.
**Example (ported from prototype):**
```typescript
// lib/timetable/time-utils.ts
const NORMAL_PX_PER_HOUR = 60;   // 8AM-6PM (11 hours = 660px)
const COMPRESSED_PX_PER_HOUR = 28; // 7PM-11PM (4 hours = 112px)
const EVENING_START = 19;          // 7PM
const NORMAL_ZONE_END_PX = 660;   // (19-8) * 60

export function timeToY(hour: number): number {
  if (hour < EVENING_START) return (hour - 8) * NORMAL_PX_PER_HOUR;
  return NORMAL_ZONE_END_PX + (hour - EVENING_START) * COMPRESSED_PX_PER_HOUR;
}

// Total grid height: 660 + 4*28 = 772px (8AM to 11PM)
export const GRID_HEIGHT = NORMAL_ZONE_END_PX + 4 * COMPRESSED_PX_PER_HOUR;
```

### Pattern 5: Staggered CSS Animations
**What:** Use AnimatedEntry component with delay prop (d1-d10).
**When to use:** Page entrance animations.
**Example:**
```tsx
<AnimatedEntry delay={1}><TimetableTitleRow /></AnimatedEntry>
<AnimatedEntry delay={2}><TimetableGrid /></AnimatedEntry>
```

### Anti-Patterns to Avoid
- **Runtime ICS parsing in the browser:** Adds unnecessary complexity and library weight. The prototype already solved data extraction -- use static fixtures.
- **Rendering all 199 individual events:** The fixture should store recurring-event templates (19 entries) with week arrays, filtered at render time to the selected week. Do NOT store 199 flat events.
- **Custom scroll detection for deadline overflow:** Use IntersectionObserver to detect when deadline lines are below viewport, not scroll event listeners with manual position calculation.
- **Rough.js inside the timetable grid:** Only right panel cards use RoughCard. The grid card uses `data-hand-border` (SVG border drawn via Rough.js on the outer card), not RoughCard internally.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Manual string concat | `date-fns format()` + locale | Handles localization, edge cases |
| Calendar (right panel) | New calendar widget | Reuse MiniCalendar from Phase 5 | Already built with deadline heatmap |
| Urgency classification | Inline if/else | `getUrgency()` from `lib/deadlines/urgency.ts` | Consistent with deadlines page |
| Course colors | Hardcoded color map | `getCourseColor()` from `lib/dashboard/course-colors.ts` | Consistent across all pages |
| Hand-drawn borders | Manual Rough.js calls | `RoughCard` component + `withClientOnly()` | SSR-safe, consistent styling |
| Entrance animations | Manual CSS keyframes | `AnimatedEntry` component | Standardized delay map |
| HTTP client | Raw fetch | `ky` via `api` from `lib/api/client.ts` | Auth headers, error handling |

**Key insight:** This phase is almost entirely a visual implementation task. The data layer (hooks, fixtures, route handlers) follows fully established patterns from Phase 2. The grid rendering logic is fully specified in the prototype. The right panel reuses existing components. No novel architectural decisions required.

## Common Pitfalls

### Pitfall 1: jsdom Missing scrollTo
**What goes wrong:** Tests crash with `scrollRef.current?.scrollTo is not a function`
**Why it happens:** jsdom does not implement `scrollTo`, `scrollIntoView`, or other scroll APIs
**How to avoid:** Guard with `typeof element.scrollTo === "function"` before calling. Already documented in CLAUDE.md as a known issue.
**Warning signs:** Any component that auto-scrolls on mount (the grid scrolls to show 8AM area initially)

### Pitfall 2: Real-Time Clock Updates Without Cleanup
**What goes wrong:** Memory leak from setInterval updating current time indicator
**Why it happens:** Timer not cleaned up on unmount or week change
**How to avoid:** Use useEffect with cleanup: `return () => clearInterval(timerId)`. Only start timer when viewing current week.
**Warning signs:** Timer should update every 60 seconds (not every second -- overkill for a 2px line)

### Pitfall 3: Overlapping Event Column Calculation
**What goes wrong:** Events assigned wrong widths or positions, visual overlap
**Why it happens:** Naive pair-wise overlap check instead of transitive group-based algorithm
**How to avoid:** Use the prototype's exact `assignCols()` algorithm which handles transitive overlap correctly (A overlaps B, B overlaps C, so A/B/C share a group even if A doesn't directly overlap C)
**Warning signs:** Events that should be in 3 columns appearing in 2 columns

### Pitfall 4: Week Slider Thumb Not Visible
**What goes wrong:** Range input slider looks like a thin line with no thumb on some browsers
**Why it happens:** CSS `::-webkit-slider-thumb` requires `-webkit-appearance: none` on both the input AND the thumb
**How to avoid:** Apply the prototype's exact CSS for the range input, which handles both properties
**Warning signs:** Slider works functionally but looks broken visually

### Pitfall 5: Date Calculation Off-by-One
**What goes wrong:** Day headers show wrong dates for a given week
**Why it happens:** Using getDay() (0=Sunday) instead of Monday-based indexing, or timezone issues with Date constructor
**How to avoid:** Parse Monday date string from WEEKS fixture, add i*86400000 for each day (Mon=0...Sun=6). Use UTC-safe date construction.
**Warning signs:** Dates not matching the prototype's expected output for Week 4 (16/03 - 22/03/2026)

### Pitfall 6: Compressed Zone Y Calculation
**What goes wrong:** Events in 7PM-11PM range positioned incorrectly
**Why it happens:** Using linear 60px/hour for all hours instead of switching to 28px/hour after 7PM
**How to avoid:** Use the `timeToY()` function that checks hour < 19 for normal rate vs compressed rate
**Warning signs:** Evening events appearing too far down or too tall

### Pitfall 7: Rough.js Hydration Mismatch
**What goes wrong:** Server HTML doesn't match client Rough.js SVG, React throws hydration error
**Why it happens:** Rough.js generates random SVG paths on each render
**How to avoid:** Wrap with `withClientOnly()` from design-system. Already established pattern.
**Warning signs:** Console warnings about hydration mismatches on page load

### Pitfall 8: IntersectionObserver SSR
**What goes wrong:** `IntersectionObserver is not defined` during SSR
**Why it happens:** IntersectionObserver is browser-only API
**How to avoid:** Only create observer inside useEffect (client-side). Check `typeof IntersectionObserver !== 'undefined'` as guard.
**Warning signs:** Build errors or SSR render failures

## Code Examples

### Fixture Data Structure (from prototype analysis)
```typescript
// lib/timetable/types.ts
export interface TimetableSession {
  id: string;
  course_code: string;       // "COMP2017"
  course_name: string;       // "Systems Programming"
  type: string;              // "Lecture" | "TutorialA" | "Tutorial" | "Workshop" | etc.
  section: string;           // "01" | "02-P1" | "20" | etc.
  day: number;               // 0=Mon, 1=Tue, ..., 6=Sun
  start_hour: number;        // 9, 12, 14.5, etc. (decimal for half-hours)
  end_hour: number;          // 10, 14, 16, etc.
  location: string;          // "Eastern Ave Auditorium" or "Online"
  weeks: number[];           // Teaching weeks this session runs [1,2,3,4,5,7,8,9,10,11,12,13]
}

export interface SemesterWeek {
  position: number;          // 1-14 (slider position)
  teaching_week: number;     // 0 = break, 1-13 = teaching week
  label: string;             // "Week 1" | "Break" | "Week 7"
  monday_date: string;       // "2026-02-23" ISO date
}

export type WeekMode = "week" | "all";
```

### Semester Weeks Data (from prototype)
```typescript
// lib/fixtures/timetable.ts (weeks portion)
export const semesterWeeks: SemesterWeek[] = [
  { position: 1,  teaching_week: 1,  label: "Week 1",  monday_date: "2026-02-23" },
  { position: 2,  teaching_week: 2,  label: "Week 2",  monday_date: "2026-03-02" },
  { position: 3,  teaching_week: 3,  label: "Week 3",  monday_date: "2026-03-09" },
  { position: 4,  teaching_week: 4,  label: "Week 4",  monday_date: "2026-03-16" },
  { position: 5,  teaching_week: 5,  label: "Week 5",  monday_date: "2026-03-23" },
  { position: 6,  teaching_week: 6,  label: "Week 6",  monday_date: "2026-03-30" },
  { position: 7,  teaching_week: 0,  label: "Break",   monday_date: "2026-04-06" },
  { position: 8,  teaching_week: 7,  label: "Week 7",  monday_date: "2026-04-13" },
  { position: 9,  teaching_week: 8,  label: "Week 8",  monday_date: "2026-04-20" },
  { position: 10, teaching_week: 9,  label: "Week 9",  monday_date: "2026-04-27" },
  { position: 11, teaching_week: 10, label: "Week 10", monday_date: "2026-05-04" },
  { position: 12, teaching_week: 11, label: "Week 11", monday_date: "2026-05-11" },
  { position: 13, teaching_week: 12, label: "Week 12", monday_date: "2026-05-18" },
  { position: 14, teaching_week: 13, label: "Week 13", monday_date: "2026-05-25" },
];
```

### OpenAPI Schema Addition
```yaml
# Add to openapi.yaml under tags:
  - name: timetable
    description: Weekly timetable data

# Add to paths:
  /timetable/sessions:
    get:
      operationId: getTimetableSessions
      summary: Get class sessions
      tags: [timetable]
      parameters:
        - name: week
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 14
          description: Semester week position (omit for all weeks)
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/TimetableSession"
                  meta:
                    $ref: "#/components/schemas/ResponseMeta"

  /timetable/weeks:
    get:
      operationId: getSemesterWeeks
      summary: Get semester week structure
      tags: [timetable]
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/SemesterWeek"
                  meta:
                    $ref: "#/components/schemas/ResponseMeta"

# Add to components/schemas:
    TimetableSession:
      type: object
      required: [id, course_code, course_name, type, section, day, start_hour, end_hour, location, weeks]
      properties:
        id:
          type: string
        course_code:
          type: string
        course_name:
          type: string
        type:
          type: string
        section:
          type: string
        day:
          type: integer
          minimum: 0
          maximum: 6
        start_hour:
          type: number
        end_hour:
          type: number
        location:
          type: string
        weeks:
          type: array
          items:
            type: integer

    SemesterWeek:
      type: object
      required: [position, teaching_week, label, monday_date]
      properties:
        position:
          type: integer
        teaching_week:
          type: integer
        label:
          type: string
        monday_date:
          type: string
          format: date
```

### Route Handler Mock Pattern
```typescript
// app/api/v1/timetable/sessions/route.ts
import { NextRequest } from "next/server";
import { mockResponse, mockDelay, shouldSimulateError, mockError, requireAuth } from "@/lib/fixtures/helpers";
import { timetableSessions } from "@/lib/fixtures/timetable";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  await mockDelay();
  if (shouldSimulateError()) return mockError("INTERNAL_ERROR", "Failed to retrieve timetable", 500);

  const week = request.nextUrl.searchParams.get("week");
  if (week) {
    const weekNum = parseInt(week, 10);
    const filtered = timetableSessions.filter((s) => s.weeks.includes(weekNum));
    return mockResponse(filtered);
  }
  return mockResponse(timetableSessions);
}
```

### Grid Component Layout (key structure)
```tsx
// Simplified structure showing the grid layout
<div className="card tt-card" style={{ padding: 0, overflow: "hidden" }}>
  {/* Day headers: spacer + 7-col grid */}
  <div className="flex border-b border-divider bg-[rgba(246,245,240,.6)]">
    <div style={{ width: GUTTER_WIDTH }} className="shrink-0" />
    <div className="flex-1 grid grid-cols-7">
      {DAYS.map((day, i) => (
        <DayHeader key={i} day={day} date={dates[i]} isToday={...} />
      ))}
    </div>
  </div>
  {/* Body: gutter + grid (scrollable) */}
  <div className="flex overflow-y-auto" style={{ maxHeight: "calc(100vh - var(--header-h) - 200px)" }}>
    <TimeGutter />
    <div className="flex-1 relative" style={{ height: GRID_HEIGHT }}>
      {/* Horizontal lines */}
      {hourLines.map((line) => <div key={line.y} className="tt-hline" style={{ top: line.y }} />)}
      {/* Compressed zone separator + background */}
      <div style={{ top: NORMAL_ZONE_END_PX }} className="compressed-separator" />
      {/* 7 day columns with events */}
      <div className="grid grid-cols-7 absolute inset-0">
        {[0,1,2,3,4,5,6].map((day) => (
          <DayColumn key={day} events={eventsByDay[day]} deadlines={deadlinesByDay[day]} isToday={...} />
        ))}
      </div>
    </div>
  </div>
</div>
```

### Breathing Arrow for Deadline Overflow
```tsx
// Reuse animate-gentle-bob keyframe from globals.css (same as HeroSection scroll prompt)
<div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-1 bg-gradient-to-t from-card-bg to-transparent">
  <span className="text-[0.6rem] font-semibold text-text-3">
    {t("timetable.moreDeadlines", { count: overflowCount })}
  </span>
  <ChevronDown size={14} className="text-text-3 animate-gentle-bob" style={{ opacity: 0.5 }} />
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full ICS parser library | Pre-parsed static fixture | Phase 11 decision | No runtime dependency, faster load |
| Linear time axis | Dual-density (60px + 28px) | Prototype design | Better space usage, evening events visible |
| Simple pair overlap | Transitive group overlap | Prototype algorithm | Correct handling of 3+ event overlap chains |

**Deprecated/outdated:**
- None relevant. This phase uses only established patterns.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + jsdom |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && pnpm test -- --testPathPattern timetable --run` |
| Full suite command | `cd frontend && pnpm test -- --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-08a | Timetable grid renders sessions in correct time slots | unit | `cd frontend && pnpm test -- --testPathPattern timetable/TimetableGrid --run` | Wave 0 |
| UI-08b | Event overlap algorithm assigns correct columns | unit | `cd frontend && pnpm test -- --testPathPattern timetable/overlap --run` | Wave 0 |
| UI-08c | Week navigation changes displayed sessions | unit | `cd frontend && pnpm test -- --testPathPattern timetable/TimetablePage --run` | Wave 0 |
| UI-08d | Current time indicator shows on current week only | unit | `cd frontend && pnpm test -- --testPathPattern timetable/TimetableNowLine --run` | Wave 0 |
| UI-08e | Right panel displays MiniCalendar, deadlines, legend | unit | `cd frontend && pnpm test -- --testPathPattern timetable/TimetableRightPanel --run` | Wave 0 |
| UI-08f | Break week shows centered message | unit | `cd frontend && pnpm test -- --testPathPattern timetable/TimetableGrid --run` | Wave 0 |
| UI-08g | Route handler returns filtered sessions | unit | `cd frontend && pnpm test -- --testPathPattern timetable/route --run` | Wave 0 |
| UI-08h | Hooks follow established key/options/wrapper pattern | unit | `cd frontend && pnpm test -- --testPathPattern hooks/use-timetable --run` | Wave 0 |
| UI-08i | Full page visual/interaction validation | manual-only | User runs dev server, navigates to /timetable | N/A |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm test -- --testPathPattern timetable --run`
- **Per wave merge:** `cd frontend && pnpm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/timetable/` directory -- new test directory for all timetable tests
- [ ] `frontend/__tests__/timetable/overlap.test.ts` -- covers UI-08b (pure function, highest priority)
- [ ] `frontend/__tests__/timetable/time-utils.test.ts` -- covers time-to-Y mapping
- [ ] Framework already installed and configured -- no infrastructure gaps

## Open Questions

1. **MiniCalendar Namespace**
   - What we know: MiniCalendar currently uses `t("dashboard.calendar.days....")` translations
   - What's unclear: Whether to pass a custom `t` function or refactor MiniCalendar to accept a namespace prop
   - Recommendation: Pass `onDateClick` as no-op for timetable context (or link to deadlines page). MiniCalendar's existing dashboard namespace translations will work fine since it's a shared component -- no change needed to the component itself, just import and use it.

2. **Current Week Detection**
   - What we know: Prototype hardcodes CUR=4 (Week 4)
   - What's unclear: Whether to compute current week from system date or hardcode for fixture consistency
   - Recommendation: Compute from system date using `differenceInWeeks(now, semesterStart)` for production readiness, but keep a fallback to Week 4 if outside semester range.

## Sources

### Primary (HIGH confidence)
- `prototype/timetable.html` -- Full working prototype with exact layout, CSS, algorithms, and data
- `frontend/hooks/use-courses.ts` -- Established hook pattern (keys -> queryOptions -> thin wrapper)
- `frontend/hooks/use-deadlines.ts` -- Deadline hook for overlay data
- `frontend/lib/fixtures/helpers.ts` -- Route handler mock utilities
- `frontend/components/dashboard/MiniCalendar.tsx` -- Reusable calendar component
- `frontend/components/dashboard/HeroSection.tsx` -- Breathing arrow animation reference
- `frontend/lib/dashboard/course-colors.ts` -- getCourseColor() for consistent colors
- `frontend/components/shared/AnimatedEntry.tsx` -- Staggered entrance animation
- `frontend/app/globals.css` -- Animation keyframes (slide-up, gentle-bob)
- User's real ICS file -- 199 VEVENTs, 5 courses, verified matching prototype data

### Secondary (MEDIUM confidence)
- Prototype-to-React translation patterns observed across Phases 5-10

### Tertiary (LOW confidence)
- None. All findings based on direct codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, zero new dependencies
- Architecture: HIGH - Follows exact patterns from Phases 2, 5, 7, 9, 10 with no deviations
- Pitfalls: HIGH - Based on project's documented issues (jsdom scrollTo, Rough.js hydration) and prototype algorithm analysis
- ICS data: HIGH - Real ICS file inspected, matches prototype SE array exactly

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable -- all patterns established, no fast-moving dependencies)
