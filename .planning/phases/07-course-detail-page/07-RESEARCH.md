# Phase 7: Course Detail Page - Research

**Researched:** 2026-03-23
**Domain:** Next.js page component, inline score prediction, Rough.js hand-drawn UI, portal-slot pattern
**Confidence:** HIGH

## Summary

Phase 7 builds the Course Detail page, the drill-down view from the Courses page (Phase 6). The page displays a course banner, assessment breakdown table with inline score prediction, course materials list, an AI chat placeholder (disabled), and a right panel with quick links, upcoming deadlines, and high-value Ed Discussion posts. This is the most complex M1 page in terms of interactive state management due to the inline prediction feature.

The codebase already provides all necessary data hooks (`useCourseDetail`, `useCourseGrades`, `useCourseMaterials`, `useCourseDiscussions`), mock API routes (`/courses/[id]`, `/courses/[id]/materials`, `/courses/[id]/discussions`, `/courses/[id]/deadlines`), fixture data, and reusable components (BannerDeco, RoughProgressBar, ExternalLinkDialog, AnimatedEntry, withClientOnly). The main new work is: (1) the page route + page component, (2) assessment table with prediction input state, (3) grade summary with countUp animation, (4) materials browser, (5) right panel content (quick links, course deadlines, Ed posts), and (6) a new `useCourseDeadlines` hook (the API route exists but no hook wraps it).

**Primary recommendation:** Structure the page as a top-level `CourseDetailPage` component that fetches data via existing hooks, manages prediction state with `useState`, and injects right-panel content via the established `createPortal` + `#right-panel-slot` pattern. Use CSS slideUp staggered animations (AnimatedEntry) for entrance, matching all other M1 pages.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Inline Score Prediction**: per-course inline prediction on this page; Predict page (Phase 9) handles cross-course. No cross-page persistence in M1 -- predictions are temporary page state. Input clamped 0-100. Input style: dashed border-bottom, transparent bg, Source Serif 4 font, placeholder "?"
- **Grade Summary merged into Assessment card**: placed at bottom of Assessment section card, not a separate card (prototype has it as separate card with margin-top: -10px, we merge inside)
- **Projected Final animation**: countUp-style number scrolling transition when value changes as user types predictions
- **Ed Discussion Posts in right panel**: compact list with title, time, endorsed/staff badges. Filter: only high-value (endorsed or staff-answered). Click opens ExternalLinkDialog then new tab
- **AI Chat Placeholder**: preserve UI layout (input + send button) but disable input, show "Coming Soon" text. Below Materials in main content
- **Right Panel card order**: Quick Links -> Upcoming Deadlines -> Ed Discussion
- **Quick Links click**: reuse ExternalLinkDialog confirmation dialog
- **Quick Links items**: Canvas Home, Ed Discussion, Ed Lessons with colored icon backgrounds
- **Content injection**: reuse portal-slot pattern (createPortal + #right-panel-slot) from Phase 5
- **Upcoming Deadlines**: course-specific with colored stripe, days remaining badge
- **Back link**: "My Courses" at top, navigates to /courses
- **Course Banner**: colored strip with course code, name, term badge, credit points, instructor -- reuse BannerDeco from Phase 6
- **Main content order**: Banner -> Assessment (with merged Grade Summary) -> Materials -> AI Chat placeholder
- **Entrance animations**: CSS slideUp with staggered delays (d1-d8) matching prototype timing
- **Graded vs ungraded visual distinction**: graded items show fixed score + "graded" badge (course-color background), ungraded show dashed-underline input

### Claude's Discretion
- Rough.js parameters for section card borders and weight progress bars
- Materials list item layout details (week badge width, icon sizing)
- AI placeholder exact disabled state styling
- Entrance animation timing fine-tuning
- Empty state designs (no assessments, no materials, no Ed posts)
- i18n message structure for course-detail namespace
- Exact countUp animation implementation for Projected Final

### Deferred Ideas (OUT OF SCOPE)
- Cross-page prediction persistence (localStorage or backend) -- M2
- AI Chat actual functionality -- Phase 19
- Ed Discussion post in-app detail view -- future enhancement
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-11 | Course Detail page with assessment breakdown, materials browser, and Ed posts | Full page implementation: assessment table with inline prediction, materials list, Ed posts in right panel, course banner, quick links, upcoming deadlines, AI chat placeholder |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App Router with `[locale]/(dashboard)/courses/[id]/page.tsx` | Project framework |
| React | 19.1.0 | Component rendering, useState for prediction state | Project framework |
| TanStack Query | 5.91.2 | Data fetching via existing hooks | Established pattern (Phase 2) |
| roughjs | 4.6.6 | Hand-drawn card borders, weight progress bars | Design system standard |
| next-intl | 4.8.3 | i18n for `courseDetail` namespace | Established pattern (Phase 1) |
| lucide-react | 0.577.0 | Icons (ArrowLeft, GraduationCap, Folder, ExternalLink, Clock, MessageCircle, etc.) | Project icon library |
| date-fns | 4.1.0 | Date formatting for due dates and Ed post timestamps | Established pattern |
| tailwind-merge + clsx | 3.5.0 / 2.1.1 | Conditional class composition via `cn()` | Established pattern |

### No New Dependencies Required
All functionality can be built with existing dependencies. The countUp animation for Projected Final uses CSS `transition` on a number display element or a lightweight `requestAnimationFrame` loop -- no external library needed.

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── app/[locale]/(dashboard)/courses/[id]/
│   └── page.tsx                         # Server component, setRequestLocale + renders CourseDetailPage
├── components/course-detail/
│   ├── CourseDetailPage.tsx              # Main client component, data fetching, portal, prediction state
│   ├── CourseBanner.tsx                  # Banner with BannerDeco, course info, tags
│   ├── AssessmentSection.tsx             # Assessment table + merged Grade Summary
│   ├── AssessmentRow.tsx                 # Single assessment row (graded or prediction input)
│   ├── GradeSummary.tsx                  # Current Average + Projected Final + note
│   ├── MaterialsSection.tsx             # Materials list with week badges
│   ├── MaterialItem.tsx                 # Single material row
│   ├── AiChatPlaceholder.tsx            # Disabled AI input placeholder
│   ├── QuickLinksPanel.tsx              # Right panel: Canvas/Ed/EdLessons links
│   ├── CourseDeadlinesPanel.tsx          # Right panel: upcoming course deadlines
│   └── EdPostsPanel.tsx                 # Right panel: high-value Ed Discussion posts
├── hooks/
│   └── use-deadlines.ts                 # ADD useCourseDeadlines(courseId) to existing file
└── messages/en/courseDetail.json         # i18n messages
```

### Pattern 1: Portal-Slot for Right Panel (established Phase 5)
**What:** Page-specific content injected into AppShell's `#right-panel-slot` via `createPortal`
**When to use:** Every dashboard page that needs right panel content
**Example:**
```typescript
// Established in DashboardPage.tsx (Phase 5)
const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
useEffect(() => {
  setPortalTarget(document.getElementById("right-panel-slot"));
}, []);

// In JSX:
{portalTarget && createPortal(
  <>
    <QuickLinksPanel courseCode={course.code} />
    <CourseDeadlinesPanel courseId={id} courseColor={color} />
    <EdPostsPanel courseId={id} />
  </>,
  portalTarget
)}
```

### Pattern 2: Inline Prediction State Management
**What:** `useState<Record<number, number | null>>` maps assessment index to predicted score. Only ungraded assessments have inputs. Grade summary recalculates on every state change.
**When to use:** This page only (predictions are ephemeral page state in M1)
**Example:**
```typescript
const [predictions, setPredictions] = useState<Record<number, number | null>>({});

const handlePrediction = (index: number, value: string) => {
  const num = value === "" ? null : Math.min(100, Math.max(0, Number(value)));
  setPredictions(prev => ({ ...prev, [index]: num }));
};

// Grade summary calculation
const { currentAvg, projectedFinal, assessedWeight } = useMemo(() => {
  // ... weighted average from graded + predicted scores
}, [assessmentWeights, predictions]);
```

### Pattern 3: CountUp Animation for Projected Final
**What:** When projected final changes, animate the number from old value to new value over ~400ms using `requestAnimationFrame`
**When to use:** GradeSummary component's projected percentage display
**Implementation:** Use a `useRef` for the display element and a `useEffect` that triggers rAF-based interpolation when the projected value changes. CSS `transition` on `opacity` can handle the em-dash-to-number transition.

### Pattern 4: Two-Layer Section Cards with Rough.js Borders
**What:** Outer div (10px padding, no bg) + inner div (bg `#f6f5f0`, padding 22px 26px) + Rough.js SVG border on outer
**When to use:** All section cards (Assessment, Materials, right panel cards)
**Note:** This is the same `section-card` + `section-card-inner` pattern from the prototype. Can reuse existing `RoughCard` component or draw borders inline like `CourseCard` does.

### Pattern 5: Server Component Page + Client Component Body
**What:** `page.tsx` is a server component that sets locale, then renders a `"use client"` `CourseDetailPage` component
**When to use:** Every page in the `(dashboard)` route group
**Example:**
```typescript
// app/[locale]/(dashboard)/courses/[id]/page.tsx
import { setRequestLocale } from "next-intl/server";
import CourseDetailPage from "@/components/course-detail/CourseDetailPage";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function Page({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <CourseDetailPage courseId={id} />;
}
```

### Anti-Patterns to Avoid
- **Lifting prediction state to global store**: Predictions are page-local state (no cross-page persistence in M1). Do NOT use Zustand or React Context.
- **Separate Grade Summary card**: User explicitly decided to merge Grade Summary into the Assessment section card. Do NOT create it as a separate `section-card`.
- **Using `useDeadlines` with course filter**: The existing `useDeadlines` hook hits `/deadlines` (global). The API for `/courses/{id}/deadlines` exists and returns `CourseDeadline[]` (different shape -- no `course_code`/`course_name`). Create a proper `useCourseDeadlines` hook.
- **Fetching all discussions then filtering client-side**: The `useCourseDiscussions` hook already supports a `filter` parameter -- pass `"high_value"` to get only endorsed/staff-answered posts from the API.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hand-drawn borders | Custom SVG path generation | `roughjs` (already installed) | Consistent with design system |
| Progress bars | Canvas-based manual drawing | `RoughProgressBar` component (Phase 5) or inline pattern from `CourseCard` | Already proven, handles ResizeObserver |
| External link confirmation | Custom modal | `ExternalLinkDialog` (Phase 5) | Exact same UX pattern, already tested |
| Entry animations | Custom framer-motion variants | `AnimatedEntry` component with delay map | Established CSS slideUp pattern across all pages |
| Client-only Rough.js | Manual dynamic imports | `withClientOnly()` wrapper (Phase 1) | SSR safety already solved |
| Grade band calculation | Inline if/else | `getGradeBand()` from `lib/utils/grade-band.ts` | Single source of truth |
| Course color lookup | Hardcoded colors | `getCourseColor()` from `lib/dashboard/course-colors.ts` | Already maps all 5 courses |
| Date formatting | Manual string building | `date-fns` format/formatDistanceToNow | Already a dependency |
| Number clamping | inline Math.min/max | Simple utility but keep inline -- too trivial for a file | N/A |

**Key insight:** Phase 7 heavily reuses Phase 5/6 infrastructure. The assessment table with prediction inputs is the only genuinely new interactive pattern.

## Common Pitfalls

### Pitfall 1: jsdom Missing scrollTo
**What goes wrong:** Tests crash with `scrollRef.current?.scrollTo is not a function`
**Why it happens:** jsdom does not implement `scrollTo`, `scrollIntoView`, etc.
**How to avoid:** Add `typeof element.scrollTo === "function"` guard before calling. Already documented in project CLAUDE.md.
**Warning signs:** Any component test that involves scrolling behavior.

### Pitfall 2: Rough.js SVG in jsdom Tests
**What goes wrong:** Rough.js calls `createElementNS` which returns minimal stubs in jsdom.
**Why it happens:** jsdom's SVG support is incomplete.
**How to avoid:** Mock `roughjs` in tests using the pattern established in Phase 6 (`roughjs mock uses createElementNS g stubs for jsdom SVG testing compatibility`).
**Warning signs:** Tests importing components that use `rough.svg()`.

### Pitfall 3: Number Input Type Quirks
**What goes wrong:** `<input type="number">` has inconsistent behavior across browsers -- `e.target.value` can be empty string even with min/max attributes, scroll wheel changes value, arrow keys increment.
**Why it happens:** Browser-native number input behavior varies.
**How to avoid:** Use `type="text"` with `inputMode="numeric"` and `pattern="[0-9]*"` for more predictable behavior. Or keep `type="number"` but handle the empty string case explicitly in the onChange handler. Clamp on blur, not on every keystroke (so users can type "1" then "0" without clamping to 1 first).
**Warning signs:** Users unable to clear the input field or type multi-digit numbers.

### Pitfall 4: Portal Target Not Available on First Render
**What goes wrong:** `document.getElementById("right-panel-slot")` returns null during SSR or first render.
**Why it happens:** Portal target is in the DOM from `RightPanel.tsx` but might not be mounted when `useEffect` runs.
**How to avoid:** Use `useState` + `useEffect` pattern (exactly as Phase 5 DashboardPage does). The `setPortalTarget` call in `useEffect` ensures client-side only.
**Warning signs:** Right panel content not appearing.

### Pitfall 5: Re-rendering Entire Assessment Table on Prediction Input
**What goes wrong:** Every keystroke in a prediction input re-renders all assessment rows, causing visible lag.
**Why it happens:** Prediction state lives in parent component, causing full re-render cascade.
**How to avoid:** Memoize `AssessmentRow` with `React.memo` and pass stable callbacks via `useCallback`. The grade summary calculation should use `useMemo`.
**Warning signs:** Noticeable input lag when typing prediction scores.

### Pitfall 6: CSS Variable --course-color Scoping
**What goes wrong:** Course color CSS variable bleeds into other components or doesn't apply to nested elements.
**Why it happens:** CSS custom properties inherit down the tree.
**How to avoid:** Set `--course-color` and `--course-soft` on the page container div. All child components reference these variables. This matches the prototype's approach.
**Warning signs:** Wrong colors in nested components.

### Pitfall 7: Next.js 15 Promise-based Params
**What goes wrong:** TypeScript error when accessing `params.id` directly.
**Why it happens:** Next.js 15 changed params to `Promise<{...}>` in dynamic routes.
**How to avoid:** Always `const { id } = await params;` in server components, or pass `courseId` as prop to client component (established pattern).
**Warning signs:** TypeScript compile error in `page.tsx`.

## Code Examples

### Assessment Table with Prediction Input
```typescript
// Source: prototype/course-detail.html (score-input pattern)
interface AssessmentRowProps {
  name: string;
  subtitle?: string;
  weight: number;
  dueDate?: string;
  score: number | null;
  maxScore: number;
  status: "graded" | "upcoming" | "submitted";
  courseColor: string;
  courseSoft: string;
  prediction: number | null;
  onPredictionChange: (value: string) => void;
}

// Graded: fixed score + badge
// Ungraded: dashed-border input
```

### Grade Summary Calculation
```typescript
// Source: prototype/course-detail.html (computeProjected logic)
function computeGradeSummary(
  assessments: AssessmentWeight[],
  predictions: Record<number, number | null>
) {
  let gradedSumSW = 0;
  let gradedSumW = 0;
  let totalSumSW = 0;
  let allFilled = true;

  assessments.forEach((a, i) => {
    if (a.score !== null) {
      gradedSumSW += a.score * a.weight;
      gradedSumW += a.weight;
      totalSumSW += a.score * a.weight;
    } else {
      const pred = predictions[i];
      if (pred !== null && pred !== undefined) {
        totalSumSW += pred * a.weight * a.max_score / 100;
        // Note: predictions are 0-100 scale, weights are 0-1 scale
      } else {
        allFilled = false;
      }
    }
  });

  const currentAvg = gradedSumW > 0 ? gradedSumSW / gradedSumW : null;
  const totalWeight = assessments.reduce((s, a) => s + a.weight, 0);
  const projectedFinal = allFilled ? totalSumSW / totalWeight : null;

  return {
    currentAvg,
    projectedFinal,
    assessedWeight: gradedSumW,
  };
}
```

### CountUp Animation Hook
```typescript
// Lightweight rAF-based number animation
function useCountUp(target: number | null, duration = 400) {
  const [display, setDisplay] = useState<number | null>(target);
  const prevRef = useRef<number | null>(target);

  useEffect(() => {
    if (target === null || prevRef.current === null) {
      setDisplay(target);
      prevRef.current = target;
      return;
    }

    const from = prevRef.current;
    const to = target;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevRef.current = target;
  }, [target, duration]);

  return display;
}
```

### Portal Pattern (from Phase 5)
```typescript
// Source: DashboardPage.tsx (Phase 5)
const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
useEffect(() => {
  setPortalTarget(document.getElementById("right-panel-slot"));
}, []);

// In render:
{portalTarget && createPortal(<RightPanelContent />, portalTarget)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate Grade Summary card (prototype) | Merged into Assessment section card | Phase 7 CONTEXT decision | Simpler DOM, no negative margin hack |
| Motion spring for page entrance | CSS slideUp with AnimatedEntry | Phase 5+ (prototype-aligned) | Consistent with all M1 pages |
| Global deadline hook with filter | Course-specific deadline hook | Phase 7 (new) | Correct API shape (`CourseDeadline` vs `Deadline`) |

**Deprecated/outdated:**
- Grade Summary as separate card with `margin-top: -10px` -- replaced by merged layout per user decision

## Open Questions

1. **Instructor Name in Banner**
   - What we know: Prototype shows "Dr. Nguyen" as a banner tag. Current `CourseDetail` schema and fixture data do not include an `instructor` field.
   - What's unclear: Where does instructor name come from?
   - Recommendation: Add a static instructor mapping in fixtures or omit the instructor tag from the banner until backend provides it. The Course schema has no instructor field, so this would need a fixture-level addition. Use a simple `Record<string, string>` mapping `courseId -> instructor`.

2. **ExternalLinkDialog i18n Namespace**
   - What we know: ExternalLinkDialog currently uses `useTranslations("dashboard")` with keys like `externalLink.title`.
   - What's unclear: Should Course Detail reuse the same dashboard namespace or should ExternalLinkDialog accept a generic namespace?
   - Recommendation: Keep using `dashboard` namespace since the dialog is shared. Or extract `externalLink.*` keys to a `common` namespace. For M1, simplest to keep `dashboard` namespace.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run --testPathPattern course-detail` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-11a | Assessment table renders graded + ungraded items | unit | `cd frontend && npx vitest run --testPathPattern AssessmentSection` | Wave 0 |
| UI-11b | Prediction input updates projected final | unit | `cd frontend && npx vitest run --testPathPattern AssessmentSection` | Wave 0 |
| UI-11c | Materials list renders course materials | unit | `cd frontend && npx vitest run --testPathPattern MaterialsSection` | Wave 0 |
| UI-11d | Ed Discussion posts show high-value only | unit | `cd frontend && npx vitest run --testPathPattern EdPostsPanel` | Wave 0 |
| UI-11e | Navigation from courses page works | unit | `cd frontend && npx vitest run --testPathPattern CourseDetailPage` | Wave 0 |
| UI-11f | Quick links open ExternalLinkDialog | unit | `cd frontend && npx vitest run --testPathPattern QuickLinksPanel` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run --testPathPattern course-detail`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/course-detail/AssessmentSection.test.tsx` -- covers UI-11a, UI-11b
- [ ] `frontend/__tests__/course-detail/MaterialsSection.test.tsx` -- covers UI-11c
- [ ] `frontend/__tests__/course-detail/EdPostsPanel.test.tsx` -- covers UI-11d
- [ ] `frontend/__tests__/course-detail/CourseDetailPage.test.tsx` -- covers UI-11e
- [ ] `frontend/__tests__/course-detail/QuickLinksPanel.test.tsx` -- covers UI-11f
- [ ] roughjs mock pattern reuse from `frontend/__tests__/courses/` directory

## Sources

### Primary (HIGH confidence)
- `prototype/course-detail.html` -- Full visual specification: HTML structure, CSS styles, JavaScript grade calculation logic, Rough.js usage
- `frontend/hooks/use-courses.ts`, `use-grades.ts`, `use-materials.ts`, `use-discussions.ts`, `use-deadlines.ts` -- Existing hook implementations
- `frontend/lib/fixtures/courses.ts` -- `courseDetails` with `assessment_weights` array (the core data for the assessment table)
- `frontend/lib/fixtures/materials.ts` -- `materialsByCourse` fixture data
- `frontend/lib/fixtures/discussions.ts` -- `discussionsByCourse` fixture data with `is_endorsed`/`is_staff_post` flags
- `frontend/lib/api/types.gen.d.ts` -- OpenAPI-generated types for `CourseDetail`, `AssessmentWeight`, `Material`, `Discussion`, `CourseDeadline`
- `frontend/components/courses/BannerDeco.tsx` -- Reusable Rough.js banner decorations (5 patterns)
- `frontend/components/courses/CourseCard.tsx` -- Established navigation pattern: `router.push('/courses/${id}')`
- `frontend/components/dashboard/ExternalLinkDialog.tsx` -- Native `<dialog>` with confirmation for external links
- `frontend/components/dashboard/DashboardPage.tsx` -- Portal-slot pattern reference implementation
- `frontend/components/shared/AnimatedEntry.tsx` -- CSS slideUp with delay map (d1-d10)
- `frontend/app/api/v1/courses/[id]/route.ts` -- Mock API route for course detail
- `frontend/app/api/v1/courses/[id]/deadlines/route.ts` -- Mock API route for course deadlines
- `.planning/phases/07-course-detail-page/07-CONTEXT.md` -- All user decisions

### Secondary (MEDIUM confidence)
- `prototype/DESIGN_SYSTEM.md` -- CSS variables, card patterns, Rough.js parameters
- `.planning/phases/05-dashboard-page/05-CONTEXT.md` -- Portal-slot, ExternalLinkDialog, grade-band, course-colors patterns
- `.planning/phases/06-courses-page/06-CONTEXT.md` -- BannerDeco, CourseCard, RoughProgressBar patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and proven in prior phases
- Architecture: HIGH -- all patterns (portal-slot, hooks, AnimatedEntry, two-layer cards) are established and have working reference implementations
- Pitfalls: HIGH -- jsdom/Rough.js, portal timing, number input quirks are well-documented from prior phases
- Data layer: HIGH -- all mock API routes, fixtures, and hooks exist; only `useCourseDeadlines` needs creation
- Prediction logic: HIGH -- prototype JavaScript provides exact algorithm, straightforward port to React state

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable -- all dependencies are locked, patterns are established)
