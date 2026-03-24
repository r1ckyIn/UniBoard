# Phase 10: Digest Page - Research

**Researched:** 2026-03-24
**Domain:** Next.js frontend page (React, TanStack Query, next-intl, Rough.js)
**Confidence:** HIGH

## Summary

Phase 10 builds the Digest page — a course-grouped daily intelligence feed displaying AI-scored highlights with urgency badges, type filtering, and right panel summary/history cards. This is a frontend-only page consuming existing mock API endpoints. All hooks (`useDigestLatest`, `useDigestHistory`), mock Route Handlers, and fixture data already exist from Phase 2.

The page follows established patterns from Phases 5-9: portal-slot right panel injection, AnimatedEntry staggered CSS animations, RoughCard for panel cards, CSS border + left color stripe for course sections, and `useMemo`-based client-side filtering. The primary implementation work is building page-specific components (DigestPage, CourseSectionCard, HighlightItem, DigestSummaryCard, DigestHistoryCard) and enriching fixture data to cover all 6 highlight types.

**Primary recommendation:** Follow the PredictPage/DeadlinesPage component architecture exactly — single orchestrator component (DigestPage) that manages state, renders section cards, and injects right panel content via createPortal. Use `useMemo` for client-side type filtering (same pattern as Phase 8 course filtering).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Group by course (matching prototype), NOT by date. Each course gets a section with colored left stripe, course code + name header, and update count badge
- Course section ordering: highest urgency first (critical > important > informational), then highlight count descending
- Highlight ordering within section: urgency priority first, then time descending within same urgency
- Urgent Banner: red alert banner below title row when any critical urgency highlights exist
- All highlights fully expanded by default. No collapse/expand
- 6 highlight types with distinct icon + background color: new_grade (green/check-circle), staff_post (blue/message-circle), deadline_change (purple/calendar-clock), endorsed_post (amber/star), new_announcement (orange/megaphone), exam_info (red/graduation-cap)
- Source badge: Canvas/Ed inferred from highlight type since API has no explicit source field
- Thread link: highlights with source_thread_id show "View thread ->" navigating to /courses/[courseId]?tab=posts
- Time display: relative time from generated_at
- Urgency badges: critical (red-soft), important (orange-soft), informational (green-soft)
- Type filter only for M1. Pill buttons: All | Grade | Staff | Deadline | Announcement | Exam
- Client-side filtering via useMemo
- Title row: "Daily Digest" heading with Radio icon, date badge, "Generated X ago" italic, Refresh button
- Refresh button invalidates TanStack Query cache
- Right panel Card 1: Today's Summary (2x2 grid: Updates/Courses/Grades/Urgent). RoughCard
- Right panel Card 2: Recent Digests (date + count + chevron). Click loads that day's digest. RoughCard
- Portal-slot pattern (createPortal + #right-panel-slot) for right panel
- Course sections use CSS border + left stripe, NOT RoughCard
- CSS slideUp staggered delays (d1-d10)
- Full EN/ZH i18n support with digest namespace
- Skeleton loading for course sections and right panel cards
- Error and empty states

### Claude's Discretion
- Filter pill button exact styling (pill vs chip vs segmented)
- Skeleton card shapes and shimmer details
- Rough.js seed values and styling for right panel cards
- Entrance animation timing fine-tuning
- Error/empty state wording and illustration choice
- Source badge inference mapping (type -> Canvas/Ed)
- Responsive breakpoints for course section grid

### Deferred Ideas (OUT OF SCOPE)
- Source filter (Canvas/Ed) — M2 Phase 17
- Date range filter — M2
- Urgent Deadlines right panel card
- Weekly digest view toggle
- Digest notification badge on sidebar
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-05 | Digest page showing daily/weekly intelligence digest with AI-scored relevance | Full page implementation with course-grouped highlights, urgency badges, type filtering, right panel summary/history. Daily only for M1 (weekly deferred). AI-scored relevance displayed via urgency levels (critical/important/informational) |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | App router, page routing | Project framework |
| React | 19.x | UI components | Project framework |
| @tanstack/react-query | v5 | Data fetching (useDigestLatest, useDigestHistory) | Already used across all pages |
| next-intl | 4.8.3 | i18n (EN/ZH translations) | Already used across all pages |
| roughjs | 4.6.6 | Hand-drawn borders for right panel cards | Design system requirement |
| lucide-react | latest | Icons (Radio, CheckCircle, MessageCircle, etc.) | Already used across all pages |
| date-fns | ^4.1.0 | Relative time formatting (formatDistanceToNow) | Already used in NotificationPanel, EdPostsPanel |

### Supporting (No New Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | `formatDistanceToNow` for "Generated X ago" and relative time display | Time display on title row and individual highlights |

**No new dependencies required.** All needed libraries are already installed.

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── app/[locale]/(dashboard)/digest/
│   └── page.tsx                    # Server component wrapper (setRequestLocale)
├── components/digest/
│   ├── DigestPage.tsx              # Client orchestrator (state, filtering, portal)
│   ├── DigestTitleRow.tsx          # Title, date badge, "Generated X ago", refresh button
│   ├── DigestFilterBar.tsx         # Type filter pills (All|Grade|Staff|...)
│   ├── DigestUrgentBanner.tsx      # Red alert banner for critical items
│   ├── CourseSectionCard.tsx       # Course section with left stripe + highlights
│   ├── HighlightItem.tsx           # Single highlight row (icon, type, summary, urgency badge)
│   ├── DigestSummaryCard.tsx       # Right panel: Today's Summary (2x2 stats grid)
│   └── DigestHistoryCard.tsx       # Right panel: Recent Digests list
├── lib/digest/
│   └── types.ts                    # DigestFilterType, highlight type config maps
└── __tests__/digest/
    ├── DigestPage.test.tsx         # Page orchestrator tests
    ├── CourseSectionCard.test.tsx   # Course section rendering tests
    └── HighlightItem.test.tsx      # Highlight rendering + link tests
```

### Pattern 1: Page Orchestrator (DigestPage.tsx)
**What:** Single client component managing all page state and rendering
**When to use:** Every page in UniBoard follows this pattern
**Example:**
```typescript
// Follows PredictPage.tsx / DeadlinesPage.tsx pattern
"use client";
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useDigestLatest, useDigestHistory, digestKeys } from "@/hooks/use-digest";
import { useQueryClient } from "@tanstack/react-query";

export default function DigestPage() {
  const t = useTranslations("digest");
  const { data, isLoading, isError } = useDigestLatest();
  const historyQuery = useDigestHistory();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<DigestFilterType>("all");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("right-panel-slot"));
  }, []);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: digestKeys.latest() });
  };

  // Client-side filtering
  const filteredCourses = useMemo(() => { /* filter logic */ }, [data, activeFilter]);

  return (
    <>
      {/* Main content */}
      {portalTarget && createPortal(<>{/* right panel cards */}</>, portalTarget)}
    </>
  );
}
```

### Pattern 2: Course Section with Left Stripe (CSS border, not RoughCard)
**What:** Course sections use 1.5px solid border + 5px colored left stripe via ::after pseudo-element
**When to use:** For the main digest course sections (matching DeadlineCard/PredictCard patterns)
**Example:**
```typescript
// Matches prototype .course-section-wrap
<div
  className="bg-card-bg border-[1.5px] border-[#d0cdc4] rounded-card shadow-card overflow-hidden relative"
  style={{ '--stripe-color': courseColor } as React.CSSProperties}
>
  {/* Left stripe via absolute positioning */}
  <div
    className="absolute left-0 top-0 bottom-0 w-[5px] z-[3]"
    style={{ backgroundColor: courseColor }}
  />
  {/* Course header + highlights */}
</div>
```

### Pattern 3: Portal-slot Right Panel Injection
**What:** Use createPortal to inject digest-specific right panel content into #right-panel-slot
**When to use:** For DigestSummaryCard and DigestHistoryCard
**Already implemented in:** DashboardPage, CourseDetailPage, PredictPage

### Pattern 4: Client-side Type Filtering via useMemo
**What:** Filter highlights across all course sections, hiding courses with 0 matches
**When to use:** Type pill filter interaction
**Example:**
```typescript
const filteredCourses = useMemo(() => {
  if (activeFilter === "all") return digestCourses;
  const typeMap: Record<string, string[]> = {
    grade: ["new_grade", "grade_published", "grade_alert"],
    staff: ["staff_post"],
    deadline: ["deadline_change", "deadline_approaching"],
    announcement: ["new_announcement"],
    exam: ["exam_info"],
  };
  const allowedTypes = typeMap[activeFilter] ?? [];
  return digestCourses
    .map(course => ({
      ...course,
      highlights: course.highlights.filter(h => allowedTypes.includes(h.type)),
    }))
    .filter(course => course.highlights.length > 0);
}, [digestCourses, activeFilter]);
```

### Pattern 5: Source Badge Inference
**What:** Infer Canvas/Ed source from highlight type since API has no source field
**Mapping:**
```typescript
const SOURCE_MAP: Record<string, "Canvas" | "Ed"> = {
  new_grade: "Canvas",
  grade_published: "Canvas",
  grade_alert: "Canvas",
  staff_post: "Ed",
  endorsed_post: "Ed",
  deadline_change: "Canvas", // deadline extensions come from Canvas
  deadline_approaching: "Canvas",
  new_announcement: "Canvas",
  exam_info: "Ed", // exam hints typically from Ed Discussion
};
```

### Anti-Patterns to Avoid
- **Don't use RoughCard for course sections:** CONTEXT.md explicitly says course sections use CSS border + left stripe, not Rough.js. Only right panel cards use RoughCard.
- **Don't implement collapse/expand on highlights:** User explicitly decided all highlights are fully expanded. Current API returns single-line summaries.
- **Don't add date grouping:** User chose course grouping (matching prototype), not date grouping despite ROADMAP SC mentioning dates.
- **Don't build source or date range filters:** Explicitly deferred to M2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time display | Custom time-ago logic | `formatDistanceToNow` from date-fns | Handles locale, edge cases, i18n |
| API data fetching | Custom fetch + state | `useDigestLatest()` / `useDigestHistory()` (already exists) | Phase 2 hooks ready to use |
| Query cache invalidation | Manual refetch logic | `queryClient.invalidateQueries({ queryKey: digestKeys.latest() })` | TanStack Query standard pattern |
| Right panel injection | Custom layout prop drilling | createPortal + #right-panel-slot | Established portal-slot pattern |
| Hand-drawn borders | Custom SVG code | RoughCard component | Already implemented, handles resize |
| Skeleton loading | Custom loading UI | SkeletonCard + inline shimmer patterns | Established design system |
| Animation delays | Manual CSS keyframes | AnimatedEntry component with delay prop | Already handles slideUp + stagger |

**Key insight:** Phase 10 has zero novel technical challenges. Every pattern needed (portal-slot, filtering, course sections with color stripes, RoughCard, AnimatedEntry, i18n) has been implemented in at least one prior phase.

## Common Pitfalls

### Pitfall 1: Fixture Data Gaps
**What goes wrong:** Current fixture (`digest.ts`) only has 3 courses with limited highlight types (grade_published, staff_post, grade_alert, deadline_approaching). Missing: `new_grade`, `deadline_change`, `endorsed_post`, `new_announcement`, `exam_info`.
**Why it happens:** Phase 2 created minimal fixtures. Prototype has 5 courses with all 6 types.
**How to avoid:** Enrich fixture data to include all 6 highlight types, add `source_thread_id` to some entries, add course names (prototype has them but current fixture schema only has `code`).
**Warning signs:** Filter pills showing empty results for some types.

### Pitfall 2: DigestCourseEntry Schema Missing `name` Field
**What goes wrong:** The OpenAPI `DigestCourseEntry` schema only has `code` and `highlights` — no `name` field. But the prototype displays course names (e.g., "COMP2017 — Systems Programming").
**Why it happens:** API schema was designed minimally.
**How to avoid:** Two options: (a) add `name` to the fixture data directly (loose typing), or (b) create a code-to-name mapping utility from the courses fixture. Option (a) is simpler — the fixture already has the data, just needs a `name` field added to each entry. The mock Route Handler returns whatever fixture provides.
**Warning signs:** Course sections showing only code without name.

### Pitfall 3: Course Color Mapping for Prototype Courses
**What goes wrong:** Prototype has 5 courses (COMP2017, COMP3221, STAT2011, EDGU1003, MATH2021) but `COURSE_COLORS` map only has COMP2017, COMP3221, STAT2011, INFO2222, MATH1005. Missing EDGU1003 and MATH2021.
**Why it happens:** Prototype and fixture data use different course sets.
**How to avoid:** The fixture data only has COMP2017, COMP3221, STAT2011 (3 courses). Use `getCourseColor()` which returns a default gray for unknown codes. When enriching fixtures to add more courses, add corresponding entries to COURSE_COLORS or accept the default.
**Warning signs:** Some course sections showing gray instead of colored stripes.

### Pitfall 4: Relative Time Calculation Base
**What goes wrong:** Showing "Generated X ago" based on `digest.generated_at` vs individual highlight times.
**Why it happens:** Prototype shows both "Generated 2 hours ago" on the title row AND individual timestamps per highlight. But the API schema's `DigestHighlight` has no timestamp field — only `type`, `summary`, `urgency`, `source_thread_id`.
**How to avoid:** Use `generated_at` from the DigestLatest response for the title row "Generated X ago" text. For individual highlight times, since the API has no per-highlight timestamp, omit per-highlight time display (or use the digest's `generated_at` uniformly). The prototype shows individual times because it uses mock data with explicit time fields — but the real schema doesn't have them.
**Warning signs:** Attempting to access a non-existent timestamp field on highlights.

### Pitfall 5: Digest History Click Navigation
**What goes wrong:** CONTEXT.md says clicking a history entry "loads and displays that day's digest" but there's no API endpoint to fetch a specific digest by ID.
**Why it happens:** The `/digest/history` endpoint returns `DigestSummary[]` (just ID, date, count), and `/digest/latest` returns only the latest. No `/digest/{id}` endpoint exists.
**How to avoid:** For M1, clicking a history item can highlight it visually and show the current digest (since mock data is static anyway). OR add a mock Route Handler `/api/v1/digest/[id]/route.ts` that returns the same digestLatest fixture regardless of ID. The simpler approach: track `selectedDigestId` in state, visually highlight the selected entry, but always display the same data (mock limitation).
**Warning signs:** 404 errors when trying to fetch historical digests.

### Pitfall 6: jsdom scrollTo Missing
**What goes wrong:** If any component uses `scrollTo` or `scrollIntoView`, tests fail in jsdom.
**Why it happens:** jsdom doesn't implement scroll APIs (documented in project CLAUDE.md).
**How to avoid:** Guard with `typeof element.scrollTo === "function"` checks. Already a known pattern in this project.

## Code Examples

### Course Section Ordering (Urgency-based)
```typescript
// Source: CONTEXT.md decisions — sort courses by highest urgency, then count
type UrgencyLevel = "critical" | "important" | "informational";
const URGENCY_PRIORITY: Record<UrgencyLevel, number> = {
  critical: 0,
  important: 1,
  informational: 2,
};

function sortCourses(courses: DigestCourseEntry[]): DigestCourseEntry[] {
  return [...courses].sort((a, b) => {
    const aMaxUrgency = Math.min(...a.highlights.map(h => URGENCY_PRIORITY[h.urgency as UrgencyLevel] ?? 2));
    const bMaxUrgency = Math.min(...b.highlights.map(h => URGENCY_PRIORITY[h.urgency as UrgencyLevel] ?? 2));
    if (aMaxUrgency !== bMaxUrgency) return aMaxUrgency - bMaxUrgency;
    return b.highlights.length - a.highlights.length;
  });
}
```

### Highlight Type Configuration Map
```typescript
// Source: Prototype digest.html — icon and color mappings
import {
  CheckCircle, MessageCircle, CalendarClock,
  Star, Megaphone, GraduationCap,
} from "lucide-react";

export const HIGHLIGHT_CONFIG = {
  new_grade:         { icon: CheckCircle,    iconClass: "grade",           color: "green",  label: "New Grade" },
  grade_published:   { icon: CheckCircle,    iconClass: "grade",           color: "green",  label: "Grade Published" },
  grade_alert:       { icon: CheckCircle,    iconClass: "grade",           color: "green",  label: "Grade Alert" },
  staff_post:        { icon: MessageCircle,  iconClass: "staff",           color: "blue",   label: "Staff Post" },
  deadline_change:   { icon: CalendarClock,  iconClass: "deadline-change", color: "purple", label: "Deadline Change" },
  deadline_approaching: { icon: CalendarClock, iconClass: "deadline-change", color: "purple", label: "Deadline" },
  endorsed_post:     { icon: Star,           iconClass: "endorsed",        color: "amber",  label: "Endorsed Post" },
  new_announcement:  { icon: Megaphone,      iconClass: "announcement",    color: "orange", label: "Announcement" },
  exam_info:         { icon: GraduationCap,  iconClass: "exam",            color: "red",    label: "Exam Info" },
} as const;

// Icon background + text color classes (matching prototype CSS)
export const COLOR_CLASSES = {
  green:  { bg: "bg-[rgba(120,140,93,0.11)]",   text: "text-[#788c5d]" },
  blue:   { bg: "bg-[rgba(106,155,204,0.11)]",   text: "text-[#6a9bcc]" },
  purple: { bg: "bg-[rgba(155,123,184,0.11)]",   text: "text-[#9b7bb8]" },
  amber:  { bg: "bg-[rgba(176,137,104,0.11)]",   text: "text-[#b08968]" },
  orange: { bg: "bg-[rgba(217,119,87,0.11)]",    text: "text-[#d97757]" },
  red:    { bg: "bg-[rgba(204,68,85,0.11)]",     text: "text-[#cc4455]" },
} as const;
```

### Urgency Badge Styles
```typescript
// Source: Prototype digest.html CSS .hl-urgency
export const URGENCY_STYLES = {
  critical:      { bg: "bg-[rgba(204,68,85,0.11)]",     text: "text-[#cc4455]" },
  important:     { bg: "bg-[rgba(217,119,87,0.11)]",    text: "text-[#d97757]" },
  informational: { bg: "bg-[rgba(120,140,93,0.11)]",    text: "text-[#788c5d]" },
} as const;
```

### Refresh Button Pattern
```typescript
// Source: TanStack Query cache invalidation pattern
const queryClient = useQueryClient();
const { data, isLoading, isFetching } = useDigestLatest();

const handleRefresh = () => {
  queryClient.invalidateQueries({ queryKey: digestKeys.latest() });
};

// isFetching tracks background refetch (isLoading is only for initial load)
<button onClick={handleRefresh} disabled={isFetching}>
  <RefreshCw className={cn("w-[13px] h-[13px]", isFetching && "animate-spin")} />
  {t("refresh")}
</button>
```

### Right Panel Summary Stats (Client-computed)
```typescript
// Source: CONTEXT.md — 2x2 grid: Updates/Courses/Grades/Urgent
const summaryStats = useMemo(() => {
  if (!digestData) return { updates: 0, courses: 0, grades: 0, urgent: 0 };
  const allHighlights = digestData.courses.flatMap(c => c.highlights);
  return {
    updates: allHighlights.length,
    courses: digestData.courses.length,
    grades: allHighlights.filter(h => ["new_grade", "grade_published", "grade_alert"].includes(h.type)).length,
    urgent: allHighlights.filter(h => h.urgency === "critical").length,
  };
}, [digestData]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Date grouping (ROADMAP SC) | Course grouping (user decision) | CONTEXT.md 2026-03-24 | Matches prototype, more useful for students |
| Expandable highlights | All expanded by default | CONTEXT.md 2026-03-24 | Simpler implementation, API only has summaries |
| Multiple filter types | Type filter only | CONTEXT.md 2026-03-24 | Source/date filters deferred to M2 |

## Open Questions

1. **DigestCourseEntry Missing `name` Field**
   - What we know: Schema has only `code` and `highlights`. Prototype displays full names.
   - What's unclear: Should we add `name` to the fixture/schema or derive it from courses fixture?
   - Recommendation: Add `name` to fixture data (simplest). The OpenAPI schema type is string-keyed so extra fields pass through. Update the mock Route Handler to return enriched data.

2. **Per-Highlight Timestamps**
   - What we know: Prototype shows individual times ("2 hours ago", "5 hours ago") but DigestHighlight schema has no timestamp field.
   - What's unclear: Should we add a timestamp to each highlight or omit individual times?
   - Recommendation: Add a `created_at` field to fixture highlights for display purposes. It's mock data — we can extend it beyond the strict schema. The M2 backend will define the final field set.

3. **Digest History Navigation**
   - What we know: No `/digest/{id}` endpoint exists. CONTEXT.md says click loads that day's digest.
   - What's unclear: How to fetch a specific historical digest.
   - Recommendation: For M1, track selected digest ID in state, visually highlight the selected history entry, but always show the same data. Add a TODO comment for M2 backend endpoint.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run __tests__/digest --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-05-A | Digest entries display with course grouping | unit | `cd frontend && npx vitest run __tests__/digest/DigestPage.test.tsx -t "renders course sections"` | Wave 0 |
| UI-05-B | Each entry shows source, type, urgency score | unit | `cd frontend && npx vitest run __tests__/digest/HighlightItem.test.tsx -t "shows type icon and urgency badge"` | Wave 0 |
| UI-05-C | Filter controls filter by type | unit | `cd frontend && npx vitest run __tests__/digest/DigestPage.test.tsx -t "filters by type"` | Wave 0 |
| UI-05-D | Right panel summary + history | unit | `cd frontend && npx vitest run __tests__/digest/DigestPage.test.tsx -t "renders right panel"` | Wave 0 |
| UI-05-E | Loading/error/empty states | unit | `cd frontend && npx vitest run __tests__/digest/DigestPage.test.tsx -t "loading state"` | Wave 0 |
| UI-05-F | Urgent banner for critical items | unit | `cd frontend && npx vitest run __tests__/digest/DigestPage.test.tsx -t "urgent banner"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run __tests__/digest --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/digest/DigestPage.test.tsx` — covers UI-05-A, UI-05-C, UI-05-D, UI-05-E, UI-05-F
- [ ] `frontend/__tests__/digest/HighlightItem.test.tsx` — covers UI-05-B
- [ ] `frontend/__tests__/digest/CourseSectionCard.test.tsx` — covers course section rendering with stripe/header

*(Test infrastructure (vitest, jsdom, roughjs mock pattern) already exists from prior phases)*

## Sources

### Primary (HIGH confidence)
- `prototype/digest.html` — Full visual specification with all CSS styles, JS rendering, mock data structure
- `frontend/openapi/openapi.yaml` lines 886-945, 1588-1662 — DigestLatest, DigestCourseEntry, DigestHighlight, DigestSummary, UrgentDeadline schemas
- `frontend/hooks/use-digest.ts` — Existing hooks (useDigestLatest, useDigestHistory) with TanStack Query
- `frontend/lib/fixtures/digest.ts` — Current fixture data (3 courses, 5 history entries)
- `frontend/components/predict/PredictPage.tsx` — Portal-slot pattern reference implementation
- `frontend/components/deadlines/DeadlinesPage.tsx` — Client-side filtering pattern reference
- `.planning/phases/10-digest-page/10-CONTEXT.md` — All user decisions

### Secondary (MEDIUM confidence)
- `frontend/components/design-system/RoughCard.tsx` — RoughCard implementation details
- `frontend/components/shared/AnimatedEntry.tsx` — Animation delay pattern
- `frontend/components/dashboard/SkeletonCard.tsx` — Skeleton variants
- `frontend/lib/dashboard/course-colors.ts` — getCourseColor utility

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and used, versions verified from package.json
- Architecture: HIGH — follows exact patterns from Phases 5-9, no novel patterns needed
- Pitfalls: HIGH — identified from direct code inspection (fixture gaps, schema mismatches, missing endpoints)

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable — frontend patterns well-established, no external dependencies)
