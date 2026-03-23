# Phase 8: Deadlines Page - Research

**Researched:** 2026-03-23
**Domain:** Next.js frontend page — deadline timeline with filters and AI chat placeholder
**Confidence:** HIGH

## Summary

Phase 8 builds the dedicated Deadlines page, converting the `prototype/deadline.html` prototype into a Next.js page component. The prototype shows a **timeline-only layout** (no separate calendar tab) with expandable deadline cards, related materials, AI chat per-card, and an "All / This Week" filter toggle. The success criteria also mention a "calendar view" which does NOT appear in the prototype but is listed in the ROADMAP. The recommendation is to implement the timeline view as the primary/default view matching the prototype, and provide a mode toggle that includes a calendar view reusing the MiniCalendar logic already built in Phase 5.

All backend infrastructure is already in place: the `useDeadlines` hook (with `from`/`to`/`course_id` filters), the `useUpcomingDeadlines` hook, fixture data with 10 deadlines, Route Handler mocks at `/api/v1/deadlines` and `/api/v1/deadlines/upcoming`, and the `Deadline` TypeScript type (generated from OpenAPI). The existing `DeadlineTimeline` component (dashboard right panel) and `CourseDeadlinesPanel` (course detail right panel) provide reusable urgency color mapping and badge logic but are too small/simple to reuse directly — the dedicated page requires expandable cards with materials and AI chat.

**Primary recommendation:** Build the page as a single main-content component (no right-panel portal needed) with a view mode toggle (timeline/calendar), reusing existing hooks, color utilities, and design system components (RoughCard, AnimatedEntry, AiChatPlaceholder pattern). The calendar view should be a lightweight month grid showing deadline dots — similar to MiniCalendar but full-width with clickable day cells that scroll-to or filter timeline items.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-03 | Deadlines page with full calendar view, filterable timeline, and AI chat panel | Prototype analysis confirms timeline + expandable cards + AI chat + filter toggle. Calendar view not in prototype but required by success criteria — implement as secondary view mode. All API hooks and mock data already exist from Phase 2. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x | App router, page routing | Project framework |
| @tanstack/react-query | v5 | Data fetching via `useDeadlines` hook | Already wired in Phase 2 |
| next-intl | - | i18n translations | Project convention |
| roughjs | 4.6.6 | Hand-drawn borders on cards | Design system component (RoughCard) |
| lucide-react | - | Icons (Calendar, CalendarDays, ChevronDown, Folder, MessageCircle, etc.) | Project icon library |
| date-fns | - | Date formatting and comparison | Already used in CourseDeadlinesPanel, MiniCalendar |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | v4 | Styling | All components |
| motion | - | Entry animations | AnimatedEntry wraps page sections |

### No New Dependencies Needed
This phase requires zero new npm packages. Everything needed is already installed.

## Architecture Patterns

### Recommended Component Structure
```
frontend/
├── components/deadlines/
│   ├── DeadlinesPage.tsx         # Page orchestrator (data fetching, state, layout)
│   ├── DeadlineTitleRow.tsx      # Title icon + h1 + semester badge + filter controls + view toggle
│   ├── DeadlineTimelineView.tsx  # Timeline with vertical line + expandable cards
│   ├── DeadlineCard.tsx          # Single expandable card (summary + materials + AI chat)
│   ├── DeadlineCalendarView.tsx  # Month grid calendar with deadline dots
│   └── DeadlineFilterBar.tsx     # Course + type dropdown filters (shared between views)
├── app/[locale]/(dashboard)/deadlines/
│   └── page.tsx                  # Route entry (setRequestLocale + <DeadlinesPage />)
├── messages/en.json              # Add "deadlines" namespace
├── messages/zh.json              # Add "deadlines" namespace
└── __tests__/deadlines/
    ├── DeadlinesPage.test.tsx
    ├── DeadlineCard.test.tsx
    └── DeadlineCalendarView.test.tsx
```

### Pattern 1: Page Orchestrator Pattern (CoursesPage style)
**What:** Single top-level component fetches data via hook, manages local state (view mode, filters, expanded card ID), renders loading/error/empty/content states.
**When to use:** Every page in this project follows this pattern.
**Example:**
```typescript
export default function DeadlinesPage() {
  const t = useTranslations("deadlines");
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [filters, setFilters] = useState<DeadlineFilters>({});
  const { data, isLoading, isError } = useDeadlines(filters);
  const deadlineList = data?.data ?? [];
  // ... render title row, filter bar, then timeline or calendar view
}
```

### Pattern 2: Expandable Card (from prototype)
**What:** Click on a deadline card toggles expanded state showing related materials and AI chat input. Only one card expanded at a time (accordion behavior).
**When to use:** The timeline view's main interaction.
**Implementation:** CSS `max-height` transition (0 -> 800px) with `overflow: hidden`, matching the prototype's `.dl-expanded` pattern. The expanded section has two sub-sections: "Related Materials" (links) and "Ask about this deadline" (AI chat placeholder).

### Pattern 3: Urgency Classification (reuse existing)
**What:** Deadlines are classified by urgency: `urgent` (<=3 days), `soon` (<=7 days), `later` (>7 days). Colors: orange/blue/green.
**When to use:** Badge styling, timeline dot colors, card stripe colors.
**Source:** Already defined in `DeadlineTimeline.tsx` URGENCY_COLORS and prototype's `urgencyClass()`.

### Pattern 4: Course Color Stripe (from prototype)
**What:** Each card has a left-side 5px color stripe matching the course color (from `getCourseColor()`).
**When to use:** Every deadline card in the timeline.
**Source:** Prototype `.dl-card-wrap::after` pseudo-element + `COURSE_COLORS` map.

### Pattern 5: View Mode Toggle
**What:** "Timeline / Calendar" toggle button group in title row. Prototype only has "All / This Week" but success criteria require calendar view.
**When to use:** Top of page, allowing switch between timeline and calendar views.
**Implementation:** The "All / This Week" filter from prototype becomes a separate filter (or can be combined). The view toggle switches the main content area.

### Anti-Patterns to Avoid
- **Don't build a full calendar library:** The calendar view should be a simple month grid (like MiniCalendar) with deadline dots and click-to-filter, NOT a full-featured calendar component.
- **Don't duplicate urgency logic:** Reuse the `URGENCY_COLORS` constant from DeadlineTimeline or extract to a shared utility.
- **Don't use portal-slot for this page:** Unlike Course Detail, the deadlines page has no right-panel content. It fills the main content area only.
- **Don't hand-roll date math:** Use `date-fns` functions (`differenceInCalendarDays`, `format`, `isWithinInterval`, `startOfMonth`, `getDaysInMonth`, etc.).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Urgency classification | Custom if/else chains | Extract shared `getUrgency()` utility from existing DeadlineTimeline constants | Already proven in two components |
| Course colors | Inline hex values | `getCourseColor()` from `lib/dashboard/course-colors.ts` | Single source of truth for 5 courses |
| Date formatting | Manual string manipulation | `date-fns` `format()` | Already used in CourseDeadlinesPanel |
| Calendar grid | Custom day calculation | `date-fns` `getDaysInMonth`, `startOfMonth`, `getDay` | Already proven in MiniCalendar |
| Animated entry | Custom CSS keyframes | `AnimatedEntry` component from `components/shared/` | Reusable stagger wrapper |
| AI chat placeholder | New design | Adapt `AiChatPlaceholder` pattern from course-detail | Same "Coming Soon" overlay design |
| Hand-drawn card borders | Custom SVG | `RoughCard` design system component | Project standard |
| i18n | Hardcoded strings | `useTranslations("deadlines")` with `messages/en.json` + `messages/zh.json` | Project convention |

## Common Pitfalls

### Pitfall 1: Rough.js Timeline Dots in jsdom
**What goes wrong:** Rough.js SVG rendering fails in jsdom test environment.
**Why it happens:** jsdom doesn't implement full SVG APIs; rough.js calls `createElementNS`.
**How to avoid:** Mock roughjs in tests (vi.mock("roughjs")) using the established pattern from Phase 6. Create SVG `<g>` stubs.
**Warning signs:** Tests failing with "createElementNS is not a function" or SVG-related errors.

### Pitfall 2: MiniCalendar vs Full Calendar View Scope Creep
**What goes wrong:** Building a full-featured calendar (drag, resize, multi-day events) when a simple month grid is sufficient.
**Why it happens:** Success criteria say "calendar view" which could be interpreted broadly.
**How to avoid:** The prototype has NO calendar view. Build a minimal month grid (reuse MiniCalendar logic) where clicking a day with deadlines filters/scrolls the timeline. No drag-and-drop, no event resizing.
**Warning signs:** Reaching for `@fullcalendar/react` or building >200 LOC calendar component.

### Pitfall 3: Expanded Card Overflow Clipping
**What goes wrong:** RoughCard's `overflow: hidden` inner div clips the expanded content or the AI chat section.
**Why it happens:** The prototype uses `max-height` transition which requires `overflow: hidden` on the parent, but RoughCard already has inner overflow hidden.
**How to avoid:** Use the empty padding RoughCard pattern (from Phase 7's CourseBanner) or manage expansion within the card's inner content area. The left color stripe should be on `.dl-card-wrap` not on RoughCard itself.
**Warning signs:** Content getting cut off when card expands, or animation not working.

### Pitfall 4: Static `days_remaining` in Fixture Data
**What goes wrong:** Fixture deadlines have hardcoded `days_remaining` values that become stale over time.
**Why it happens:** Mock data was created with specific relative dates in mind.
**How to avoid:** In the DeadlinesPage component, compute days remaining from `due_date` using `differenceInCalendarDays(new Date(dl.due_date), new Date())` rather than trusting the `days_remaining` field. This matches the prototype's `daysRemaining()` function approach.
**Warning signs:** Deadlines showing wrong urgency colors or "Past due" for items that should be upcoming.

### Pitfall 5: Missing i18n Namespace
**What goes wrong:** Runtime error "Missing message" when the `deadlines` namespace doesn't exist.
**Why it happens:** Forgetting to add the new namespace to both `en.json` and `zh.json` message files.
**How to avoid:** Create the `deadlines` namespace in both files as the first task. Include all keys: title, semester badge, filter labels, view mode labels, card text, AI chat text, empty state, error state.
**Warning signs:** Console warnings about missing translation keys.

### Pitfall 6: scrollTo in jsdom
**What goes wrong:** If calendar click triggers `scrollTo` on timeline items, jsdom will throw.
**Why it happens:** jsdom doesn't implement `scrollTo`, `scrollIntoView`.
**How to avoid:** Guard with `typeof element.scrollTo === "function"` check (already documented in CLAUDE.md pitfall #3).
**Warning signs:** Tests crashing with "scrollTo is not a function".

## Code Examples

### Deadline Card Structure (from prototype)
```typescript
// Structure matching prototype/deadline.html card layout
interface DeadlineCardProps {
  deadline: Deadline; // from OpenAPI Deadline schema
  isExpanded: boolean;
  onToggle: () => void;
  courseColor: { base: string; soft: string };
}

// Card layout:
// - Left 5px color stripe (course color)
// - Summary section (always visible): title, days badge, course name, due date, AI summary
// - Expand hint: "Click to expand materials & AI chat"
// - Expanded section (max-height transition):
//   - "Related Materials" with material items
//   - "Ask about this deadline" AI chat placeholder
```

### Urgency Logic (from prototype, reusable)
```typescript
// Extract to shared utility: lib/deadlines/urgency.ts
export type Urgency = "urgent" | "soon" | "later";

export function getUrgency(daysRemaining: number): Urgency {
  if (daysRemaining <= 3) return "urgent";
  if (daysRemaining <= 7) return "soon";
  return "later";
}

export const URGENCY_COLORS: Record<Urgency, { dot: string; bg: string; soft: string }> = {
  urgent: { dot: "#d97757", bg: "rgba(217,119,87,.05)", soft: "rgba(217,119,87,.11)" },
  soon: { dot: "#6a9bcc", bg: "rgba(106,155,204,.05)", soft: "rgba(106,155,204,.11)" },
  later: { dot: "#788c5d", bg: "rgba(120,140,93,.05)", soft: "rgba(120,140,93,.11)" },
};

export function urgencyLabel(days: number): string {
  if (days <= 0) return "Past due";
  if (days === 1) return "1 day";
  return `${days} days`;
}
```

### Page Route Entry (established pattern)
```typescript
// app/[locale]/(dashboard)/deadlines/page.tsx
import { setRequestLocale } from "next-intl/server";
import DeadlinesPage from "@/components/deadlines/DeadlinesPage";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DeadlinesPage />;
}
```

### Filter Implementation (matching existing hook API)
```typescript
// The useDeadlines hook already supports from/to/course_id filters
const [filters, setFilters] = useState<{ course_id?: string }>({});
const { data, isLoading } = useDeadlines(filters);

// Course filter dropdown populated from unique course_codes in deadline data
const courseOptions = useMemo(() => {
  const all = data?.data ?? [];
  const codes = [...new Set(all.map(d => d.course_code))];
  return codes.map(code => ({ value: code, label: code }));
}, [data]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom calendar library | Simple month grid from date-fns | Project convention (Phase 5) | MiniCalendar already proven, reuse logic |
| Separate expanded/collapsed components | CSS max-height transition on single component | HTML/CSS standard | Simpler DOM, smooth animation |
| Static fixture data days_remaining | Compute from due_date at render time | This phase decision | More accurate urgency display |

## Open Questions

1. **Calendar view detail level**
   - What we know: Success criteria require "calendar view with color-coded course indicators". Prototype has NO calendar view.
   - What's unclear: How detailed should the calendar be? Just dots on days (like MiniCalendar) or full event blocks?
   - Recommendation: Start with MiniCalendar-style month grid (full-width), show deadline dots color-coded by course. Clicking a day filters the timeline below. This satisfies the criteria without over-engineering.

2. **Related Materials data source**
   - What we know: Prototype shows "Related Materials" per deadline with week labels, titles, and file type badges. The `Deadline` schema does NOT include a `materials` field.
   - What's unclear: Where do related materials come from in the real app?
   - Recommendation: For M1 (mock layer), hardcode a small set of materials per deadline in the fixture data OR derive from the course materials endpoint. For the page component, show a stub materials section with placeholder data. This is visual scaffolding for M2+ when real data flows.

3. **AI Summary text source**
   - What we know: Prototype shows italic AI summary text under each deadline (e.g., "Focus on malloc/free implementations..."). The `Deadline` schema has no `summary` field.
   - What's unclear: Whether to add a summary field to fixtures or skip for M1.
   - Recommendation: Add an optional `ai_summary` field to the fixture deadlines for visual completeness. The AI chat per-card is a "Coming Soon" placeholder regardless.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest + @testing-library/react |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run __tests__/deadlines/ --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-03a | Calendar view displays deadlines with course color dots | unit | `cd frontend && npx vitest run __tests__/deadlines/DeadlineCalendarView.test.tsx -x` | Wave 0 |
| UI-03b | Timeline view lists deadlines with filterable dropdowns | unit | `cd frontend && npx vitest run __tests__/deadlines/DeadlinesPage.test.tsx -x` | Wave 0 |
| UI-03c | AI chat placeholder renders with "coming soon" state | unit | `cd frontend && npx vitest run __tests__/deadlines/DeadlineCard.test.tsx -x` | Wave 0 |
| UI-03d | Deadline cards show name, course, due date, countdown | unit | `cd frontend && npx vitest run __tests__/deadlines/DeadlineCard.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run __tests__/deadlines/ --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/deadlines/DeadlinesPage.test.tsx` -- covers UI-03b (page orchestrator, filters, view toggle)
- [ ] `__tests__/deadlines/DeadlineCard.test.tsx` -- covers UI-03c, UI-03d (card expand, materials, AI chat placeholder)
- [ ] `__tests__/deadlines/DeadlineCalendarView.test.tsx` -- covers UI-03a (calendar grid, deadline dots)

## Sources

### Primary (HIGH confidence)
- `prototype/deadline.html` -- Full source of truth for UI design: timeline layout, expandable cards, materials section, AI chat input, filter toggle, urgency classification, color scheme
- `frontend/openapi/openapi.yaml` -- Deadline schema (lines 817-882, 1419-1452): endpoints, response shapes, filter parameters
- `frontend/lib/fixtures/deadlines.ts` -- 10 fixture deadlines across 5 courses with varied urgency levels
- `frontend/hooks/use-deadlines.ts` -- Three hooks: `useDeadlines(filters)`, `useUpcomingDeadlines()`, `useCourseDeadlines(courseId)`
- `frontend/lib/api/types.gen.d.ts` -- Generated TypeScript types for Deadline and CourseDeadline schemas

### Secondary (HIGH confidence - project codebase)
- `frontend/components/dashboard/DeadlineTimeline.tsx` -- Urgency color mapping, timeline dot rendering pattern
- `frontend/components/course-detail/CourseDeadlinesPanel.tsx` -- Badge style logic, date formatting
- `frontend/components/course-detail/AiChatPlaceholder.tsx` -- "Coming Soon" AI chat pattern to reuse
- `frontend/components/dashboard/MiniCalendar.tsx` -- Calendar grid logic to reuse for calendar view
- `frontend/lib/dashboard/course-colors.ts` -- `getCourseColor()` utility with 5 course mappings
- `frontend/components/courses/CoursesPage.tsx` -- Page orchestrator pattern to follow
- `frontend/components/shared/AnimatedEntry.tsx` -- Stagger animation wrapper
- `frontend/app/[locale]/(dashboard)/courses/page.tsx` -- Route entry pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already installed, no new packages
- Architecture: HIGH -- follows established page patterns from Phases 5-7, prototype is clear
- Pitfalls: HIGH -- based on documented project-specific issues (roughjs mock, jsdom scrollTo, i18n namespace)

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable -- all dependencies locked, prototype frozen)
