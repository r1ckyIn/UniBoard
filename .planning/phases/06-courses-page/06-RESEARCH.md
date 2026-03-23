# Phase 6: Courses Page - Research

**Researched:** 2026-03-23
**Domain:** Next.js page component with Rough.js card grid, grade display, responsive layout
**Confidence:** HIGH

## Summary

Phase 6 is a relatively contained frontend page implementation that builds heavily on established patterns from Phases 1-5. The Courses page displays a 3-column responsive card grid where each card shows course name, code, colored banner with Rough.js doodle decorations, current grade percentage, grade band badge, and an assessed-percentage progress bar. Clicking a card navigates to the Course Detail page (Phase 7 -- route placeholder only).

The key technical challenge is implementing 5 unique Rough.js banner doodle patterns (circle+sparkle, wave, star, dots cluster, zigzag) on each card's colored banner. All other elements have direct precedents: `RoughCard` (Phase 4), `RoughProgressBar` (Phase 5), `getGradeBand()` (Phase 5), `getCourseColor()` (Phase 5), `AnimatedEntry` (Phase 5), `useCourses()` hook (Phase 2), and the `(dashboard)` layout with AppShell (Phase 1).

**Primary recommendation:** Build a `CoursesPage` client component under `frontend/components/courses/` following the exact DashboardPage pattern -- hook data fetching, skeleton loading, AnimatedEntry stagger, and portal for right panel if needed. The banner doodle component should use `withClientOnly()` for SSR safety. Course color mapping needs MATH1005/EDGU1003 additions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 3-column responsive grid (3 cols default, 2 cols at 1400px, 1 col at 900px)
- Two-layer RoughCard structure (outer gap + inner bg) -- established in Phase 4
- Colored banner per card with course code + name overlay
- Info section: term, grade percentage + grade band badge, Rough.js progress bar for assessed %
- 5 unique Rough.js doodle patterns on banners (circle+sparkle, wave, star, dots cluster, zigzag)
- Each card gets a different white semi-transparent deco on the colored banner
- Grade percentage colored with course color
- Grade band badge (HD/D/CR/P/F) -- reuse `getGradeBand()` from Phase 5
- Progress bar showing assessed % -- reuse `RoughProgressBar` pattern
- Hover: translateY(-3px) lift effect
- Click: navigate to Course Detail page `/courses/{id}` (Phase 7, route placeholder)
- "My Courses" heading with BookOpen icon + semester badge ("2026 S1")
- "N Published" filter badge on the right

### Claude's Discretion
- Banner doodle assignment strategy (by index vs hash)
- Grade badge color scheme (course color vs grade-based)
- Empty state design (no courses)
- Loading skeleton card design
- Entrance animation approach (CSS slideUp vs Motion springs)
- Right panel content (empty or reused)
- Exact Rough.js parameters for progress bars and borders
- i18n message structure for courses namespace

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-02 | Courses page showing all enrolled courses with grade overview, assessment breakdown, and file navigation | Card grid with grade display covers "grade overview". Assessment breakdown and file navigation are Course Detail (Phase 7/UI-11) scope. This phase covers the card grid listing portion of UI-02. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App Router page routing | Already installed, `(dashboard)` route group established |
| roughjs | 4.6.6 | Hand-drawn SVG borders and doodles | Already installed, used across all phases |
| next-intl | 4.8.3 | i18n translations | Already installed, `useTranslations` pattern established |
| lucide-react | 0.577.0 | BookOpen icon for title row | Already installed, sidebar uses same icons |
| TanStack Query | 5.91.2 | `useCourses()` hook data fetching | Already installed, hook exists from Phase 2 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| motion | 12.38.0 | Spring entrance animations | Optional -- AnimatedEntry CSS approach already works |
| tailwind-merge | 3.5.0 | `cn()` utility for class merging | Every component uses this |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AnimatedEntry CSS | Motion springs | CSS is simpler, already working; springs give more control but unnecessary for simple slideUp |
| Rough.js canvas progress bar | SVG RoughProgressBar | SVG approach already built in Phase 5; prototype uses canvas but SVG component matches better |

**No new installations needed.** All dependencies are already in `package.json`.

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── app/[locale]/(dashboard)/courses/
│   └── page.tsx              # Server component: setRequestLocale + render CoursesPage
├── components/courses/
│   ├── CoursesPage.tsx       # Client component: data fetching, layout orchestration
│   ├── CourseCard.tsx         # Single course card with banner, info, progress bar
│   └── BannerDeco.tsx        # Rough.js SVG doodle decorations (5 patterns)
├── __tests__/courses/
│   ├── CoursesPage.test.tsx
│   ├── CourseCard.test.tsx
│   └── BannerDeco.test.tsx
└── messages/
    ├── en.json               # Add "courses" namespace
    └── zh.json               # Add "courses" namespace
```

### Pattern 1: Page Route Convention
**What:** Server component page.tsx delegates to client component
**When to use:** Every `(dashboard)` page follows this pattern
**Example:**
```typescript
// app/[locale]/(dashboard)/courses/page.tsx
import { setRequestLocale } from "next-intl/server";
import CoursesPage from "@/components/courses/CoursesPage";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CoursesPage />;
}
```

### Pattern 2: Two-Layer RoughCard for Course Cards
**What:** Outer transparent div with 6px padding for rough border visibility, inner div with card-bg
**When to use:** The course card differs from standard RoughCard because it has a colored banner section
**Key difference from standard RoughCard:** The course card needs `overflow: hidden` on the inner div for the banner, but the outer rough border SVG needs `overflow: visible`. The existing `RoughCard` component uses fixed padding `p-[10px]` and uniform inner content. For course cards, the inner structure needs a banner (no padding) + info section (with padding), so a custom card component is needed rather than reusing RoughCard directly.

### Pattern 3: SSR-Safe Rough.js via withClientOnly
**What:** Dynamic import with `ssr: false` for components using Rough.js
**When to use:** Any component that calls `rough.svg()` or `rough.canvas()`
**Example:**
```typescript
const BannerDeco = withClientOnly(
  () => import("@/components/courses/BannerDeco")
);
```

### Pattern 4: Data Flow
**What:** CoursesPage fetches via `useCourses()`, maps data, passes to CourseCard
**When to use:** All pages follow this controller-component pattern
**Key fields from Course schema:**
- `id` -- for navigation key
- `name` -- course name display
- `code` -- course code (banner overlay)
- `semester` -- term display
- `current_mark` -- grade percentage (nullable)
- `grade_letter` -- unused; compute from `current_mark` via `getGradeBand()`
- `completed_weight` -- assessed percentage (0-1)

### Anti-Patterns to Avoid
- **Don't reuse RoughCard directly for course cards:** The banner requires a different internal structure (no padding on banner area, overflow hidden on inner). Build a dedicated CourseCard with its own rough border logic.
- **Don't use canvas for progress bars:** The prototype uses canvas, but SVG `RoughProgressBar` is already built and tested. Reuse it.
- **Don't compute grade band from `grade_letter` field:** Use `getGradeBand(current_mark)` for consistency with dashboard. The API field `grade_letter` may not match USYD grade band exactly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hand-drawn borders | Custom SVG path generation | `rough.svg().rectangle()` with seed | Already established pattern, deterministic redraw |
| Grade band calculation | Manual if-else chain | `getGradeBand()` from `@/lib/utils/grade-band` | Already unit-tested, handles null/NaN |
| Course color lookup | Inline color switch | `getCourseColor()` from `@/lib/dashboard/course-colors` | Centralized, add missing entries |
| Progress bar | Custom canvas drawing | `RoughProgressBar` from `@/components/dashboard/` | Already built with SVG approach, tested |
| SSR safety wrapper | Manual `typeof window` checks | `withClientOnly()` from `@/components/design-system/ClientOnly` | Handles dynamic import + ssr:false |
| Slide-up animation | Custom keyframe CSS | `AnimatedEntry` with delay prop | Already handles stagger delays |
| Internationalization | Hardcoded strings | `useTranslations("courses")` | Established pattern with en.json/zh.json |

**Key insight:** This phase is 80% composition of existing utilities. The only genuinely new code is the banner doodle SVG patterns and the card layout itself.

## Common Pitfalls

### Pitfall 1: Rough.js Hydration Mismatch
**What goes wrong:** Rough.js generates random SVG paths by default, causing SSR/client mismatch
**Why it happens:** Server renders one random path, client renders a different one
**How to avoid:** Use `withClientOnly()` for all Rough.js components. Use `seed: 42` for deterministic paths (established in RoughCard).
**Warning signs:** React hydration error in console, visual "flash" on page load

### Pitfall 2: Banner Deco SVG Sizing
**What goes wrong:** Doodle decorations positioned at absolute pixel coordinates don't scale with card width
**Why it happens:** Prototype uses hardcoded coordinates (e.g., `circle(220, 30, 40)`) assuming fixed card width
**How to avoid:** Use SVG `viewBox` on the banner deco SVG that matches banner dimensions. The deco SVG should use `position: absolute; inset: 0` on the banner container, with a viewBox like `"0 0 300 120"` to match prototype proportions.
**Warning signs:** Doodles overflow banner or appear clipped on different screen sizes

### Pitfall 3: Course Color Map Missing Entries
**What goes wrong:** `getCourseColor("EDGU1003")` and `getCourseColor("MATH2021")` return default gray
**Why it happens:** The existing `COURSE_COLORS` map only has 4 entries (COMP2017, COMP3221, STAT2011, INFO2222). Fixtures have 5 courses. Prototype shows EDGU1003 (green) and MATH2021 (purple).
**How to avoid:** Add entries for EDGU1003 (`#788c5d`) and MATH1005/MATH2021 (`#9b7bb8`) to `course-colors.ts`. Note: fixture uses MATH1005 but prototype uses MATH2021 -- follow fixture data since that's what the API mock returns.
**Warning signs:** Cards with gray borders/banners instead of colored ones

### Pitfall 4: Null Grade Handling
**What goes wrong:** MATH1005 in fixtures has `current_mark: null` and `completed_weight: 0.0`
**Why it happens:** Course with no graded assessments yet
**How to avoid:** Display em-dash for grade when null, show 0% progress bar, still render the card normally. `getGradeBand(null)` already returns "\u2014".
**Warning signs:** NaN displayed in grade field, undefined errors

### Pitfall 5: Navigation to Non-Existent Route
**What goes wrong:** Clicking a course card navigates to `/courses/{id}` which doesn't exist until Phase 7
**Why it happens:** Phase 7 (Course Detail) hasn't been built yet
**How to avoid:** Still implement the navigation via `router.push()`. Next.js will show the default 404 page, which is acceptable during development. Alternatively, the route could be prefixed with `#` as a no-op, but real navigation is preferred for future integration.
**Warning signs:** User confusion if 404 page is ugly -- but the custom not-found.tsx from Phase 4 handles this

### Pitfall 6: ResizeObserver Burst on Card Grid
**What goes wrong:** RoughCard's ResizeObserver triggers burst redraws for all 5 cards simultaneously on page load
**Why it happens:** CSS grid layout causes multiple resize events as cards settle
**How to avoid:** Use `seed` parameter for deterministic Rough.js paths (already done). The burst is short-lived (400ms) and won't cause visual issues. If building a custom card border (not reusing RoughCard), apply the same ResizeObserver + burst pattern.
**Warning signs:** Jittery borders on initial page load

### Pitfall 7: Prototype Data vs Fixture Data Mismatch
**What goes wrong:** Prototype shows EDGU1003 "Diet & Nutrition" and MATH2021 "Vector Calculus", but fixtures have INFO2222 "Computing 2 Usability" and MATH1005 "Statistics"
**Why it happens:** Prototype was designed independently from the fixture data
**How to avoid:** Follow fixture data (source of truth for API responses), not prototype course names. The visual structure (colors, layout, doodles) should match prototype; the data content comes from fixtures.
**Warning signs:** Hardcoding prototype course names instead of using API data

## Code Examples

### Banner Deco Pattern (from prototype)
```typescript
// Source: prototype/courses.html lines 353-389
// 5 doodle patterns, each using rough.svg() with white semi-transparent strokes
// Pattern 0: Circle + sparkle (top-right area)
// Pattern 1: Wave line + small circle
// Pattern 2: Star polygon + small circle
// Pattern 3: Dots cluster (3 circles)
// Pattern 4: Zigzag + circle

// Common Rough.js options for deco:
// stroke: "rgba(255,255,255,.25)" to "rgba(255,255,255,.3)"
// strokeWidth: 1.5 to 2
// roughness: 2 to 2.5
// fill: "none"
```

### Card Structure (from prototype CSS)
```typescript
// Source: prototype/courses.html lines 98-120
// Outer: transparent bg, no border, no shadow, 6px padding, cursor pointer
// Hover: translateY(-3px)
// Inner: bg card-bg, overflow hidden
// Banner: 120px height, colored bg, gradient overlay, deco SVG, text overlay
// Info: 14px 18px 16px padding, term + grade row + progress row
```

### Grade Badge Color Mapping (recommendation for Claude's discretion)
```typescript
// Recommendation: Use grade-based colors (not course colors) for the badge
// This matches the prototype where badge colors vary by grade level:
// HD 85+ → blue-soft/blue (achievement color)
// D 75+  → blue-soft/blue
// CR 65+ → orange-soft/orange
// P 50+  → amber-soft/amber
// F <50  → red (not shown in prototype but logical)
//
// Prototype evidence: COMP2017 82.5% shows "HD 85+" badge in blue,
// STAT2011 62.0% shows "D 75+" badge in orange -- but this seems like
// a prototype inconsistency (62% should be "P", not "D 75+").
// Follow getGradeBand() for correct band, use grade-level colors for badge.
```

### Grade Band Badge with Threshold Label (from prototype)
```typescript
// The prototype shows badge text as "HD 85+" / "D 75+" format
// This is grade band + minimum threshold
// Implementation:
const BAND_LABELS: Record<string, string> = {
  HD: "HD 85+",
  D: "D 75+",
  CR: "CR 65+",
  P: "P 50+",
  F: "F",
};

function getBandLabel(mark: number | null | undefined): string {
  const band = getGradeBand(mark);
  return BAND_LABELS[band] ?? "\u2014";
}
```

### Responsive Grid (from prototype CSS)
```css
/* Source: prototype/courses.html lines 95, 139-140 */
.courses-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
@media (max-width: 1400px) { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 900px) { grid-template-columns: 1fr; }
```

### Tailwind equivalent:
```
grid grid-cols-1 min-[900px]:grid-cols-2 min-[1400px]:grid-cols-3 gap-5
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rough.js canvas progress bars | SVG RoughProgressBar component | Phase 5 | Reusable, testable, no canvas sizing issues |
| Inline course colors | `getCourseColor()` centralized map | Phase 5 | Need to extend map for 2 more courses |
| Manual rough border SVG | RoughCard with ResizeObserver | Phase 4 | Stable pattern, but course card needs custom variant |

**Deprecated/outdated:**
- None for this phase -- all dependencies are current.

## Open Questions

1. **Fixture vs Prototype Course Name Mismatch**
   - What we know: Prototype shows EDGU1003/MATH2021, fixtures show INFO2222/MATH1005
   - What's unclear: Whether fixtures should be updated to match prototype
   - Recommendation: Use fixture data as-is (source of truth for API). The visual design follows prototype structure, not prototype data.

2. **Grade Badge Color Inconsistency in Prototype**
   - What we know: Prototype shows STAT2011 at 62% with "D 75+" badge -- this is incorrect by USYD grading scale (62% = P)
   - What's unclear: Whether this was intentional in the prototype
   - Recommendation: Follow `getGradeBand()` logic (62% = P), not prototype's incorrect label. Badge colors should map to grade bands.

3. **Right Panel Content**
   - What we know: Dashboard uses portal to inject ProfileCard + MiniCalendar + RecentActivity into right panel
   - What's unclear: Whether Courses page should have right panel content or leave it empty
   - Recommendation: Leave right panel empty (no portal injection). The courses page is a simple grid view without supplementary info panels. Right panel slot remains visible but unused.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run __tests__/courses/ --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-02-a | Course cards render in responsive grid | unit | `npx vitest run __tests__/courses/CoursesPage.test.tsx -t "renders course cards"` | No - Wave 0 |
| UI-02-b | Card shows course name, WAM, grade band, assessed % | unit | `npx vitest run __tests__/courses/CourseCard.test.tsx -t "displays grade info"` | No - Wave 0 |
| UI-02-c | Click card navigates to /courses/{id} | unit | `npx vitest run __tests__/courses/CourseCard.test.tsx -t "navigates on click"` | No - Wave 0 |
| UI-02-d | Rough.js borders and hover animations | manual-only | Visual inspection in browser | N/A - jsdom cannot render Rough.js visuals |
| UI-02-e | Loading skeleton state | unit | `npx vitest run __tests__/courses/CoursesPage.test.tsx -t "skeleton"` | No - Wave 0 |
| UI-02-f | Null grade handling (MATH1005) | unit | `npx vitest run __tests__/courses/CourseCard.test.tsx -t "null grade"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run __tests__/courses/ --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/courses/CoursesPage.test.tsx` -- covers UI-02-a, UI-02-e
- [ ] `frontend/__tests__/courses/CourseCard.test.tsx` -- covers UI-02-b, UI-02-c, UI-02-f
- [ ] `frontend/__tests__/courses/BannerDeco.test.tsx` -- covers deco rendering (smoke test)

## Sources

### Primary (HIGH confidence)
- `prototype/courses.html` -- Full visual specification with CSS, HTML structure, Rough.js scripts
- `prototype/DESIGN_SYSTEM.md` -- Reusable CSS patterns, color variables
- `frontend/components/design-system/RoughCard.tsx` -- Existing Rough.js card pattern
- `frontend/components/dashboard/RoughProgressBar.tsx` -- Existing progress bar component
- `frontend/lib/utils/grade-band.ts` -- Grade band calculation
- `frontend/lib/dashboard/course-colors.ts` -- Course color mapping
- `frontend/hooks/use-courses.ts` -- Data fetching hooks
- `frontend/lib/fixtures/courses.ts` -- Mock data (5 courses)
- `frontend/lib/api/types.gen.d.ts` -- Course schema definition
- `frontend/components/dashboard/DashboardPage.tsx` -- Reference page pattern

### Secondary (MEDIUM confidence)
- None needed -- all patterns verified from codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- follows exact patterns from Phase 5 DashboardPage
- Pitfalls: HIGH -- identified from direct codebase inspection (null grades, missing colors, data mismatches)

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable -- no external dependencies or fast-moving APIs)
