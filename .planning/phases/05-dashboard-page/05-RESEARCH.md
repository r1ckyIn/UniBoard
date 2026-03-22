# Phase 5: Dashboard Page - Research

**Researched:** 2026-03-22
**Domain:** Next.js React dashboard page with Rough.js hand-drawn UI, data visualization (donut chart, progress bars, timelines), and complex component interactions
**Confidence:** HIGH

## Summary

Phase 5 builds the Dashboard page -- the first page that uses the full AppShell layout (Sidebar + Header + RightPanel) with real data from hooks. It is a pure frontend phase with no new API endpoints. All data comes from existing TanStack Query hooks (`useGpaReport`, `useCourses`, `useUpcomingDeadlines`, `useNotifications`, `useAlerts`, `useCurrentUser`) backed by mock route handlers from Phase 2.

The primary complexity lies in three areas: (1) Rough.js canvas-drawn components (donut chart, progress bars, timeline) that must render on the client and handle SSR safely via `withClientOnly()`, (2) tightly coupled cross-card state between Deadlines and Assessment Weights donut, and (3) a hero section with scroll-driven parallax fade-out and framer-motion spring entrance animations. All design-system primitives (RoughCard, HeroDoodles, RoughNotationWrapper, ClientOnly, AnimatedEntry) already exist from Phase 1 and are well-tested patterns.

The existing codebase already has placeholder content in the dashboard page (`app/[locale]/(dashboard)/page.tsx`) and the RightPanel (`components/layout/RightPanel.tsx`). Phase 5 replaces these placeholders with data-driven components while extending the Header with functional dropdowns (NotificationPanel, AvatarMenu).

**Primary recommendation:** Build components bottom-up (data utilities and small components first, then composites, then page orchestrator), use `roughjs` directly for canvas-rendered elements (donut/progress bars/timeline) with `withClientOnly()` wrappers, manage Deadlines-Donut cross-card state via local `useState` in the page orchestrator, and use Motion (framer-motion) only for the hero section entrance while relying on existing CSS `AnimatedEntry` for content sections.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Hero Section**: Data-driven greeting (time-of-day + first name from auth store), date line with semester week number, encouragement text with pluggable interface/abstraction layer for future curated catalog, scroll prompt with bobbing animation, smooth scroll to Stats Row, hero text parallax fade-out on scroll, Motion spring staggered entrance animations
- **Stats Row**: 3 stat cards (WAM/orange, GPA Target/blue, Alerts/amber) with Rough.js borders. Display-only, NOT clickable. NO countUp animation. Data from `useGpaReport()` and computed alerts count
- **Course Grades Table**: All enrolled courses with code, name, assessed % (Rough.js canvas progress bar), earned %, target badge, grade band indicator. Row hover shows "predict ->" link. "predict ->" navigates to Predict page (Phase 9). Row click navigates to Course Detail (Phase 7). Rough.js canvas-based progress bar for assessed %
- **Upcoming Deadlines & Assessment Weights (Linked Cards)**: 2-column grid bottom row. Default donut shows course owning nearest upcoming deadline. 3 deadline interaction modes (hover displacement, click switches donut, "see details" navigates). Rough.js timeline with hand-drawn line + colored dots. Donut entry animation: segments exploded then converge
- **Right Panel - Profile Card**: Data from auth store + user profile hook + courses hook. Show faculty/program name (NOT major). Avatar with gradient orange + user initials
- **Right Panel - Mini Calendar**: Navigable (left/right month switching). Deadline dot markers with color depth scaling by cumulative assessment weight. Today highlighted solid orange. Date click navigates to Deadlines page (Phase 8)
- **Right Panel - Recent Activity**: Latest 4-5 items with color-coded icons. Click opens confirmation dialog before opening external URL in new tab
- **Header Dropdowns**: Full implementation with NotificationPanel and AvatarMenu. Click-outside-to-close. dropIn animation. Arrow notch
- **Entrance Animations**: Hero uses Motion spring. Content sections use CSS staggered slideUp (d1-d10). Donut uses custom converge animation
- **Loading & Error States**: Per-section independent loading with warm-toned skeletons. In-card error with retry button. No full-page error
- **i18n**: Full EN/ZH support with `dashboard` namespace in next-intl messages

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

### Deferred Ideas (OUT OF SCOPE)
- Predict page (Phase 9) -- "predict ->" link navigates there but page doesn't exist yet
- Course Detail page (Phase 7) -- row click navigates there but page doesn't exist yet
- Deadlines page (Phase 8) -- calendar date click and "see details" navigate there but page doesn't exist yet
- Real-time data refresh / WebSocket updates -- M2+ backend feature
- Dashboard widget customization / drag-and-drop -- v2 personalization
- Mobile responsive layout -- MOBILE-01 (v2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Dashboard page with hero welcome, stats row (WAM/Target/Alerts), course grades table, deadline timeline, assessment weight chart | All 5 success criteria mapped to specific components. Hero section uses auth store + encouragement provider. Stats row uses `useGpaReport()` + `useAlerts()`. Course grades table uses `useCourses()` + GPA report course data. Deadline timeline uses `useUpcomingDeadlines()`. Assessment weight donut uses course detail weights from `useCourseDetail()` or fixture data. Rough.js canvas rendering for progress bars, timeline, and donut with `withClientOnly()` SSR safety. |
</phase_requirements>

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| roughjs | 4.6.6 | Hand-drawn SVG rendering for donut, progress bars, timeline | Project design system foundation; all cards use Rough.js borders |
| motion (framer-motion) | 12.38.0 | Hero section spring entrance animations | Established pattern in Phase 3/4 for entrance animations |
| react-rough-notation | 1.0.8 | Text annotation (underline, circle, highlight) on hero text | Already used in Phase 1 for hero annotations |
| rough-notation | 0.5.1 | Lower-level API used by RoughNotationWrapper | Direct `annotate()` usage in existing component |
| @tanstack/react-query | 5.91.2 | Data fetching hooks for all dashboard data | Standard project data layer with keys-factory pattern |
| next-intl | 4.8.3 | i18n with `dashboard` namespace | Established locale routing in `app/[locale]/` |
| date-fns | 4.1.0 | Date formatting for calendar, deadlines, activity timestamps | Already installed, lightweight date manipulation |
| lucide-react | 0.577.0 | Icons for all cards, activity items, navigation | Project icon library standard |
| zustand | 5.0.12 | Auth store (user name, email for hero/profile) | Already used for auth state |

### Supporting (no new installs needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwind-merge | 3.5.0 | Conditional CSS class merging via `cn()` utility | All component className composition |
| clsx | 2.1.1 | Utility for conditional classes (via cn wrapper) | Used internally by cn |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw Rough.js for donut | roughViz / Recharts | Rough.js provides hand-drawn aesthetic matching project identity; roughViz was explicitly removed from prototype |
| CSS scroll-driven parallax | Intersection Observer + JS | CSS approach simpler but less cross-browser; recommend Intersection Observer for reliable hero fade-out |
| Custom dialog for external links | HTML `<dialog>` element | `<dialog>` is accessible by default (focus trap, Escape key); prefer it over custom overlay |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

**Version verification:** All versions verified against installed `package.json` as of 2026-03-22. No new dependencies required.

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── components/
│   ├── dashboard/
│   │   ├── DashboardPage.tsx          # Client orchestrator (state, scroll, data)
│   │   ├── HeroSection.tsx            # Hero with Motion entrance + parallax
│   │   ├── StatsRow.tsx               # 3 stat cards with RoughCard
│   │   ├── CourseGradesTable.tsx       # Table with Rough progress bars
│   │   ├── RoughProgressBar.tsx        # Canvas-based Rough.js progress bar
│   │   ├── DeadlineTimeline.tsx        # Rough.js timeline with items
│   │   ├── AssessmentDonut.tsx         # Rough.js donut chart with converge animation
│   │   ├── ProfileCard.tsx            # Right panel profile card
│   │   ├── MiniCalendar.tsx           # Navigable calendar with deadline dots
│   │   ├── RecentActivity.tsx         # Activity list with click-to-external
│   │   ├── ExternalLinkDialog.tsx     # HTML dialog for external link confirm
│   │   └── SkeletonCard.tsx           # Per-section skeleton placeholders
│   └── layout/
│       ├── NotificationPanel.tsx      # Dropdown notification panel
│       └── AvatarMenu.tsx             # Dropdown avatar menu
├── lib/
│   └── dashboard/
│       ├── encouragement.ts           # EncouragementProvider interface + mock impl
│       └── course-colors.ts           # Per-course color mapping utility
├── messages/
│   ├── en.json                        # Extended with dashboard namespace
│   └── zh.json                        # Extended with dashboard namespace
└── app/[locale]/(dashboard)/
    └── page.tsx                       # Server component -> DashboardPage client component
```

### Pattern 1: Server Component Page Shell + Client Orchestrator
**What:** The `page.tsx` remains a server component (for locale setup) that renders a `"use client"` DashboardPage orchestrator. The orchestrator manages all cross-component state (selected deadline ID for donut linkage, scroll position for parallax).
**When to use:** This phase, and all future dashboard pages.
**Example:**
```typescript
// app/[locale]/(dashboard)/page.tsx (server component)
import { setRequestLocale } from "next-intl/server";
import DashboardPage from "@/components/dashboard/DashboardPage";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DashboardPage />;
}
```

### Pattern 2: withClientOnly() for Rough.js Canvas Components
**What:** Any component that directly uses `rough.svg()` or `rough.canvas()` must be wrapped with `withClientOnly()` to skip SSR. This prevents hydration mismatches since Rough.js generates non-deterministic SVG paths.
**When to use:** RoughProgressBar, AssessmentDonut, DeadlineTimeline (the Rough.js drawn elements within them).
**Example:**
```typescript
// In parent component
import { withClientOnly } from "@/components/design-system/ClientOnly";

const RoughProgressBar = withClientOnly(
  () => import("@/components/dashboard/RoughProgressBar")
);
```

### Pattern 3: Cross-Card State via Orchestrator
**What:** The Deadlines-Donut linkage requires shared state (which deadline is selected). Manage this as `useState` in DashboardPage and pass down as props. Avoid React Context for this simple case.
**When to use:** When two sibling components need to share a single piece of state.
**Example:**
```typescript
// In DashboardPage
const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(null);

// Derive donut data from selected deadline
const donutCourseId = selectedDeadlineId
  ? deadlines.find(d => d.id === selectedDeadlineId)?.course_id
  : nearestDeadline?.course_id;

<DeadlineTimeline
  deadlines={upcomingDeadlines}
  selectedDeadlineId={selectedDeadlineId}
  onDeadlineClick={setSelectedDeadlineId}
/>
<AssessmentDonut
  weights={courseWeights[donutCourseId]}
  highlightType={selectedDeadline?.assessmentType}
  courseColor={courseColorMap[donutCourseId]}
/>
```

### Pattern 4: Existing Hook Composition for Dashboard Data
**What:** Dashboard consumes multiple hooks simultaneously. All hooks already exist from Phase 2. Compose them in the orchestrator; TanStack Query handles parallel fetching automatically.
**When to use:** DashboardPage orchestrator.
**Example:**
```typescript
const gpa = useGpaReport();           // WAM, target, course grades
const courses = useCourses();          // Course list with metadata
const deadlines = useUpcomingDeadlines(); // Upcoming deadlines
const notifications = useNotifications(); // For header dropdown
const alerts = useAlerts();            // Alert count for stats
const user = useCurrentUser();         // Profile data
```

### Pattern 5: Scroll-Driven Hero Parallax with useEffect
**What:** Hero fade-out on scroll uses a scroll event listener that calculates opacity based on scroll position relative to hero height. Use `useEffect` with `requestAnimationFrame` throttling for performance.
**When to use:** HeroSection component only.
**Example:**
```typescript
useEffect(() => {
  let ticking = false;
  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const heroH = heroRef.current?.offsetHeight ?? window.innerHeight;
        const opacity = Math.max(0, 1 - scrollY / heroH);
        if (contentRef.current) {
          contentRef.current.style.opacity = String(opacity);
        }
        ticking = false;
      });
      ticking = true;
    }
  };
  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, []);
```

### Anti-Patterns to Avoid
- **DO NOT use React Context for Deadlines-Donut state:** It is two components sharing one value; props from parent are cleaner and more debuggable
- **DO NOT use `useEffect` to synchronize derived state:** Derive donut's course from selectedDeadlineId directly in render, never `useEffect(() => setDonutCourse(...))`
- **DO NOT import Rough.js in server components or top-level of client components without withClientOnly():** This causes SSR errors and hydration mismatches
- **DO NOT create a single monolithic component:** Split each dashboard section into its own file (HeroSection, StatsRow, etc.) per the component inventory in UI-SPEC
- **DO NOT use `window.scrollTo` without `typeof` guard in tests:** jsdom does not implement `scrollTo` (documented in CLAUDE.md pitfall)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom date string manipulation | `date-fns` `format()`, `differenceInDays()`, `isToday()` | Already installed; handles locale, timezone, edge cases |
| Donut chart arcs | Custom SVG path math from scratch | Rough.js `arc()` method | Rough.js has built-in arc drawing; compute start/end angles, let Rough.js draw |
| Click-outside detection | Custom portal + event logic | Existing pattern in Header.tsx (useRef + document click listener) | Already proven pattern, just extend |
| i18n message structure | Custom locale management | next-intl `useTranslations("dashboard")` | Established in Phase 1, just add namespace keys |
| Calendar grid computation | Full calendar library | Simple loop with `getDaysInMonth`/`getFirstDayOfWeek` | Already implemented in RightPanel.tsx; extract and enhance with month navigation |
| Per-course color mapping | Inline color conditionals | Centralized `course-colors.ts` utility mapping course codes to palette | Reusable across grades table, donut, timeline, and future phases |
| External link confirmation | Browser `confirm()` or custom modal | HTML `<dialog>` element | Native accessibility (focus trap, Escape close, aria-modal), no library needed |

**Key insight:** The existing codebase already contains working implementations for many sub-problems (calendar grid in RightPanel, click-outside in Header, AnimatedEntry delays). Phase 5 should extract, refactor, and enhance these rather than rebuilding from scratch.

## Common Pitfalls

### Pitfall 1: Rough.js SVG in SSR
**What goes wrong:** Rough.js uses `document.createElementNS` which is unavailable during SSR. If a component importing `roughjs` is rendered server-side, it crashes.
**Why it happens:** Next.js server components and `"use client"` components both attempt initial SSR.
**How to avoid:** Wrap ALL components that directly call `rough.svg()` / `rough.canvas()` with `withClientOnly()`. This uses `next/dynamic` with `ssr: false`.
**Warning signs:** "document is not defined" error during build or hydration mismatch warnings.

### Pitfall 2: jsdom Missing Scroll/Canvas APIs
**What goes wrong:** Tests for HeroSection (scroll-based parallax), RoughProgressBar (canvas), AssessmentDonut (SVG + canvas) will fail because jsdom doesn't implement `scrollTo`, `scrollIntoView`, canvas 2D context, or `requestAnimationFrame` reliably.
**Why it happens:** jsdom is a lightweight DOM implementation without rendering engine.
**How to avoid:** (1) Add `typeof element.scrollTo === "function"` guards in code (already documented in CLAUDE.md). (2) Mock `window.scrollY` and `requestAnimationFrame` in test setup. (3) For Rough.js canvas components, test props/behavior not canvas output -- verify the component renders without errors and passes correct data.
**Warning signs:** "scrollTo is not a function" or "getContext is not a function" in test output.

### Pitfall 3: Hydration Mismatch from Time-Based Greeting
**What goes wrong:** Hero greeting is time-of-day based ("Good morning/afternoon/evening"). If server renders "Good morning" but client hydrates at a different time, React warns about hydration mismatch.
**Why it happens:** Time-dependent content differs between server and client render.
**How to avoid:** Make HeroSection a pure client component (it already must be for Motion animations). The time-of-day computation only runs on the client. The server component (page.tsx) should not render time-dependent text.
**Warning signs:** "Text content did not match" hydration warning in console.

### Pitfall 4: Rough.js Donut Arc Math
**What goes wrong:** `rough.arc()` takes center, width, height, startAngle, endAngle in radians. Off-by-one in angle calculations leads to overlapping or missing segments.
**Why it happens:** Confusing degrees vs radians, not accumulating angles properly.
**How to avoid:** Convert weights to cumulative angles: `startAngle = prevEndAngle`, `endAngle = startAngle + weight * 2 * Math.PI`. Start from `-Math.PI / 2` (top of circle) for visual convention. Verify total angles sum to `2 * Math.PI`.
**Warning signs:** Donut segments visually overlap, have gaps, or don't form a complete circle.

### Pitfall 5: RoughCard Double Padding (Two-Layer Pattern)
**What goes wrong:** RoughCard has a specific two-layer structure -- outer div with 10px padding (for Rough.js border wobble visibility) + inner div with actual bg/shadow/content padding. If additional padding wrappers are added outside, spacing breaks.
**Why it happens:** Not understanding the existing RoughCard inner structure.
**How to avoid:** Pass content padding via RoughCard's `padding` prop (e.g., `padding="py-5 px-6"`). Don't wrap RoughCard in additional padding divs.
**Warning signs:** Cards appear with double borders or excessive whitespace.

### Pitfall 6: Header Dropdown Extension Conflicts
**What goes wrong:** The existing Header.tsx has hardcoded notification items and avatar menu items as JSX. Refactoring to accept data from hooks while keeping click-outside logic intact can introduce state race conditions.
**Why it happens:** The current Header is self-contained with static content. Extending to dynamic data means the Header needs to accept children or render props for dropdown content.
**How to avoid:** Extract NotificationPanel and AvatarMenu as separate components that the Header imports. Keep click-outside refs and toggle state in Header. Pass data as props to the panel/menu components.
**Warning signs:** Clicking a notification closes the dropdown unexpectedly, or dropdowns flicker.

### Pitfall 7: Next.js 15 Promise-Based Params
**What goes wrong:** `params` in Next.js 15 page components is a Promise, not a direct object. Forgetting to `await params` causes TypeScript errors.
**Why it happens:** Next.js 15 migration changed params to async.
**How to avoid:** Already established in codebase: `const { locale } = await params;` in server components.
**Warning signs:** TypeScript error: "Property 'locale' does not exist on type 'Promise<...>'"

## Code Examples

Verified patterns from existing codebase:

### Rough.js Arc Drawing for Donut Segments
```typescript
// Source: roughjs 4.6.6 API + project Rough.js patterns
import rough from "roughjs";

function drawDonut(svg: SVGSVGElement, weights: { name: string; weight: number; color: string }[]) {
  const rc = rough.svg(svg);
  const cx = 180, cy = 150;
  const outerR = 95, innerR = 55;
  let currentAngle = -Math.PI / 2; // Start from top

  weights.forEach((w) => {
    const sweepAngle = w.weight * 2 * Math.PI;
    const endAngle = currentAngle + sweepAngle;

    // Rough.js arc: (x, y, width, height, start, stop, closed, options)
    const arc = rc.arc(cx, cy, outerR * 2, outerR * 2, currentAngle, endAngle, false, {
      stroke: w.color,
      strokeWidth: outerR - innerR, // Thickness = ring width
      roughness: 1.5,
      fill: w.color,
      fillStyle: "cross-hatch",
      fillWeight: 1.8,
      seed: 42,
    });
    svg.appendChild(arc);
    currentAngle = endAngle;
  });
}
```

### Rough.js Hand-Drawn Progress Bar
```typescript
// Source: roughjs 4.6.6 API, modeled after prototype dashboard.html
import rough from "roughjs";

function drawProgressBar(
  svg: SVGSVGElement,
  progress: number, // 0-1
  color: string,
  width: number = 120,
  height: number = 14
) {
  const rc = rough.svg(svg);

  // Background track
  svg.appendChild(rc.rectangle(0, 0, width, height, {
    stroke: "#d5d2ca",
    fill: "#eae7e0",
    fillStyle: "solid",
    roughness: 1.2,
    seed: 42,
  }));

  // Filled portion
  if (progress > 0) {
    svg.appendChild(rc.rectangle(0, 0, width * progress, height, {
      stroke: color,
      fill: color,
      fillStyle: "solid",
      roughness: 1.6,
      seed: 42,
    }));
  }
}
```

### Motion Spring Entrance for Hero
```typescript
// Source: motion 12.38.0 API, matching Phase 3/4 animation style
import { motion } from "motion/react";

const heroVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      delay,
    },
  }),
};

// Usage in HeroSection
<motion.h1
  variants={heroVariants}
  initial="hidden"
  animate="visible"
  custom={0.1}
>
  {greeting}
</motion.h1>
```

### Encouragement Provider Interface
```typescript
// Source: CONTEXT.md decision + UI-SPEC interface contract
interface ActivitySummary {
  completedDeadlinesLast7Days: number;
  recentCompletedItems: string[]; // e.g., ["COMP2017 Lab 4", "STAT2011 Quiz"]
}

interface EncouragementText {
  message: string;         // Full encouragement text
  highlightPhrase: string; // Phrase for Rough Notation highlight
}

type EncouragementProvider = (activity: ActivitySummary) => EncouragementText;

// Mock implementation (3-5 hardcoded messages)
export const defaultEncouragementProvider: EncouragementProvider = (activity) => {
  if (activity.recentCompletedItems.length >= 2) {
    const items = activity.recentCompletedItems.slice(0, 2);
    return {
      message: `The ${items[0]} and the ${items[1]} are done and behind you now. You've been working so hard -- it's okay to take it slow today.`,
      highlightPhrase: "it's okay to take it slow today",
    };
  }
  // ... other cases
};
```

### Per-Course Color Mapping
```typescript
// Source: UI-SPEC Per-Course Color Assignment
const COURSE_COLORS: Record<string, { base: string; soft: string }> = {
  COMP2017: { base: "#d97757", soft: "rgba(217,119,87,.11)" },
  COMP3221: { base: "#6a9bcc", soft: "rgba(106,155,204,.11)" },
  STAT2011: { base: "#b08968", soft: "rgba(176,137,104,.11)" },
  INFO2222: { base: "#788c5d", soft: "rgba(120,140,93,.11)" },
};

// Fallback for unknown courses: cycle through palette
const PALETTE = ["#d97757", "#6a9bcc", "#b08968", "#788c5d"];
export function getCourseColor(code: string): { base: string; soft: string } {
  if (COURSE_COLORS[code]) return COURSE_COLORS[code];
  const idx = code.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % PALETTE.length;
  return { base: PALETTE[idx], soft: `${PALETTE[idx]}1c` };
}
```

### HTML Dialog for External Link Confirmation
```typescript
// Source: HTML <dialog> element, accessible pattern
"use client";

import { useRef, useEffect } from "react";

interface ExternalLinkDialogProps {
  open: boolean;
  url: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExternalLinkDialog({ open, url, onConfirm, onCancel }: ExternalLinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  return (
    <dialog ref={dialogRef} onClose={onCancel} className="...">
      {/* Content */}
    </dialog>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion import | `motion/react` import path | motion v12 | Must use `import { motion } from "motion/react"` not `"framer-motion"` |
| roughViz for donut charts | Raw Rough.js arc drawing | Prototype design | roughViz removed from prototype; use Rough.js directly |
| Next.js params as direct object | Promise-based params | Next.js 15 | Must `await params` in server components |
| Static RightPanel content | Data-driven from hooks | Phase 5 | RightPanel.tsx must be refactored to accept children/props |

**Deprecated/outdated:**
- `framer-motion` package name: Now `motion` (v12+), import from `"motion/react"`
- roughViz library: Explicitly removed from prototype, use Rough.js SVG directly

## Open Questions

1. **Course Detail Data for Donut Weights**
   - What we know: `useCourseDetail(id)` returns assessment weights per course. Dashboard donut needs weights for one course at a time.
   - What's unclear: Should we fetch course detail for the nearest-deadline's course eagerly, or only on demand when a deadline is clicked? Fetching on demand causes a loading flash when switching donut views.
   - Recommendation: Pre-fetch course details for all courses with upcoming deadlines using `useQueries()` or `useCourseDetail()` calls. TanStack Query caches them after first fetch. This gives instant donut switching without loading states. For mock routes, data returns instantly anyway.

2. **RightPanel Refactoring Strategy**
   - What we know: Current RightPanel.tsx contains hardcoded profile, calendar, and activity content. Phase 5 needs to replace this with data-driven components.
   - What's unclear: Should RightPanel remain self-contained and internally fetch data, or should it accept children from the page?
   - Recommendation: Two options -- (A) RightPanel accepts `children` prop and page passes dashboard-specific right panel content, or (B) create a DashboardRightPanel that replaces the generic one. Option A is better for future pages that have different right panel content. The `(dashboard)/layout.tsx` currently hardcodes `<RightPanel />` in AppShell; we may need to make AppShell's right panel slot configurable.

3. **Donut Converge Animation Approach**
   - What we know: UI-SPEC specifies segments start exploded/separated, then converge to form the donut. Duration 0.8s, easing cubic-bezier(.16,1,.3,1).
   - What's unclear: Best implementation approach -- CSS transforms, Motion, or requestAnimationFrame.
   - Recommendation: Use `requestAnimationFrame` with the Rough.js redraw loop. Store `explodeProgress` (1.0 -> 0.0 over 0.8s) and offset each segment outward by `explodeProgress * offsetDistance`. Redraw Rough.js arcs each frame. This is cleanest because the donut is already a Rough.js SVG canvas -- CSS transforms on individual arc paths would be complex. Alternatively, draw segments as individual SVG groups and animate their `transform` with CSS, but this requires pre-rendering all arcs.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && pnpm test -- --run --testPathPattern dashboard` |
| Full suite command | `cd frontend && pnpm test -- --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01-hero | Hero renders greeting with user name, time-of-day, and encouragement text | unit | `cd frontend && pnpm test -- --run --testPathPattern HeroSection` | Wave 0 |
| UI-01-stats | Stats row renders WAM, target, alert count from hook data | unit | `cd frontend && pnpm test -- --run --testPathPattern StatsRow` | Wave 0 |
| UI-01-grades | Course grades table renders course rows with progress and grade bands | unit | `cd frontend && pnpm test -- --run --testPathPattern CourseGradesTable` | Wave 0 |
| UI-01-deadlines | Deadline timeline renders items with correct urgency colors | unit | `cd frontend && pnpm test -- --run --testPathPattern DeadlineTimeline` | Wave 0 |
| UI-01-donut | Donut renders with correct segment count and switches on deadline click | unit | `cd frontend && pnpm test -- --run --testPathPattern AssessmentDonut` | Wave 0 |
| UI-01-calendar | Mini calendar shows current month with deadline indicators | unit | `cd frontend && pnpm test -- --run --testPathPattern MiniCalendar` | Wave 0 |
| UI-01-activity | Recent activity renders items and opens external link dialog on click | unit | `cd frontend && pnpm test -- --run --testPathPattern RecentActivity` | Wave 0 |
| UI-01-header | Header dropdowns toggle on click and close on outside click | unit | `cd frontend && pnpm test -- --run --testPathPattern "NotificationPanel\|AvatarMenu"` | Wave 0 |
| UI-01-i18n | Dashboard messages exist in both en.json and zh.json with correct keys | unit | `cd frontend && pnpm test -- --run --testPathPattern message-keys` | Existing (extend) |
| UI-01-loading | Skeleton components render with aria-busy and correct variants | unit | `cd frontend && pnpm test -- --run --testPathPattern SkeletonCard` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm test -- --run --testPathPattern dashboard`
- **Per wave merge:** `cd frontend && pnpm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/dashboard/HeroSection.test.tsx` -- covers UI-01-hero
- [ ] `__tests__/dashboard/StatsRow.test.tsx` -- covers UI-01-stats
- [ ] `__tests__/dashboard/CourseGradesTable.test.tsx` -- covers UI-01-grades
- [ ] `__tests__/dashboard/DeadlineTimeline.test.tsx` -- covers UI-01-deadlines
- [ ] `__tests__/dashboard/AssessmentDonut.test.tsx` -- covers UI-01-donut
- [ ] `__tests__/dashboard/MiniCalendar.test.tsx` -- covers UI-01-calendar
- [ ] `__tests__/dashboard/RecentActivity.test.tsx` -- covers UI-01-activity
- [ ] `__tests__/dashboard/ExternalLinkDialog.test.tsx` -- covers UI-01-activity dialog
- [ ] `__tests__/layout/NotificationPanel.test.tsx` -- covers UI-01-header
- [ ] `__tests__/layout/AvatarMenu.test.tsx` -- covers UI-01-header
- [ ] `__tests__/dashboard/SkeletonCard.test.tsx` -- covers UI-01-loading
- [ ] `__tests__/dashboard/encouragement.test.ts` -- covers encouragement provider logic
- [ ] `__tests__/dashboard/course-colors.test.ts` -- covers color mapping utility

Framework install: Not needed -- vitest and @testing-library/react already configured.

## Implementation Complexity Assessment

### Component Complexity Ranking (for plan task sizing)

| Component | Complexity | Estimated LOC | Key Challenge |
|-----------|-----------|---------------|---------------|
| AssessmentDonut | HIGH | 200-250 | Rough.js arc math + converge animation + highlight state |
| HeroSection | HIGH | 150-200 | Motion spring + parallax fade + scroll handler + Rough Notation group |
| CourseGradesTable | MEDIUM-HIGH | 150-180 | Rough.js progress bars + hover interactions + row navigation |
| DeadlineTimeline | MEDIUM-HIGH | 140-170 | Rough.js SVG line/dots + urgency colors + hover/click modes |
| MiniCalendar | MEDIUM | 120-150 | Month navigation state + deadline weight-to-color mapping + date grid |
| DashboardPage | MEDIUM | 100-130 | Hook composition + cross-card state + scroll ref management |
| NotificationPanel | MEDIUM | 80-120 | Dynamic data from hook + unread styling + refactor from Header |
| AvatarMenu | MEDIUM | 80-100 | Dynamic user data + navigation + logout + refactor from Header |
| RecentActivity | MEDIUM | 80-100 | Activity item rendering + external link dialog trigger |
| ProfileCard | LOW-MEDIUM | 60-80 | Data composition from multiple hooks |
| StatsRow | LOW-MEDIUM | 80-100 | 3 stat cards with Rough Notation on WAM |
| ExternalLinkDialog | LOW | 50-70 | HTML dialog + confirm/cancel |
| SkeletonCard | LOW | 60-80 | CSS shimmer animation + variant shapes |
| RoughProgressBar | LOW | 50-70 | Rough.js rectangle drawing |
| encouragement.ts | LOW | 40-60 | Interface + mock catalog |
| course-colors.ts | LOW | 30-40 | Static map + fallback |
| i18n messages | LOW | 100-120 lines JSON | Copy from UI-SPEC copywriting contract |

### Recommended Plan Splitting Strategy

Given the GSD executor pattern of ~5-8 files per task, recommend splitting into 5-6 plans:

1. **Foundation**: i18n messages, course-colors utility, encouragement provider, SkeletonCard
2. **Data Components (Simple)**: StatsRow, ProfileCard, RoughProgressBar
3. **Data Components (Complex)**: CourseGradesTable, DeadlineTimeline
4. **Visualization**: AssessmentDonut (with converge animation)
5. **Hero + Layout**: HeroSection (Motion + parallax), Header refactor (NotificationPanel, AvatarMenu)
6. **Orchestrator + Right Panel**: DashboardPage, MiniCalendar, RecentActivity, ExternalLinkDialog, page.tsx update

## Sources

### Primary (HIGH confidence)
- Existing codebase files (read directly): RoughCard.tsx, Header.tsx, RightPanel.tsx, AppShell.tsx, all hooks, all fixtures, ClientOnly.tsx, HeroDoodles.tsx, RoughNotationWrapper.tsx, AnimatedEntry.tsx, auth store, page.tsx, layout.tsx
- `package.json` dependencies (verified installed versions)
- `05-UI-SPEC.md` (approved design contract)
- `05-CONTEXT.md` (user decisions)
- `prototype/dashboard.html` (visual reference)
- `prototype/DESIGN_SYSTEM.md` (CSS patterns)

### Secondary (MEDIUM confidence)
- roughjs API: `rough.arc()`, `rough.rectangle()`, `rough.line()`, `rough.circle()` -- based on roughjs 4.6.6 bundled API which is stable and well-documented
- motion v12 API: `import { motion } from "motion/react"` -- verified in existing Phase 3/4 code using this import path
- HTML `<dialog>` element: Standard web API with broad browser support, no library needed

### Tertiary (LOW confidence)
- None -- all findings verified against installed packages and existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in prior phases
- Architecture: HIGH -- patterns directly observed in existing codebase (RoughCard, withClientOnly, AnimatedEntry, hook composition)
- Pitfalls: HIGH -- 4/7 pitfalls documented from actual project experience (CLAUDE.md), remainder from React/Next.js standard knowledge
- Visualization (donut): MEDIUM -- Rough.js arc API is stable but the converge animation is custom work requiring iteration

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- all libraries pinned, no breaking changes expected)
