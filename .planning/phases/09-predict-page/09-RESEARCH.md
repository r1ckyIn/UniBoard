# Phase 9: Predict Page - Research

**Researched:** 2026-03-24
**Domain:** Frontend page (React/Next.js) — GPA prediction simulator with client-side WAM calculations
**Confidence:** HIGH

## Summary

Phase 9 builds the Predict page, a cross-course GPA simulator where users expand course cards, enter hypothetical scores for ungraded assessments, and see WAM/GPA update in real-time. The right panel shows WAM overview, a target WAM slider, reverse-calculated required scores per course, and semester progress bars. All calculation is client-side (no API calls) using existing fixture data from `useGpaReport()` and `useCourseDetail()`.

The core technical challenge is implementing the USYD WAM formula correctly with faculty-based level weights, and the reverse-calculation algorithm that determines what scores each course needs on remaining assessments to hit a target WAM. The prototype `predict.html` contains reference JS implementations for all computation functions (`computeCurrent`, `computeProjected`, `computeWAM`, `computeRequired`), which must be faithfully replicated in React.

Component reuse from Phase 7 (AssessmentRow, GradeSummary) is feasible but requires adaptation — the Predict page uses 3-column tables (no Due Date column) while Phase 7 uses 4-column tables. The expandable card pattern from Phase 8 (DeadlineCard) provides the CSS border + left color stripe + max-height transition pattern. The portal-slot pattern from Phase 5/7 injects right panel content.

**Primary recommendation:** Build a `usePredictEngine` custom hook encapsulating all WAM/GPA computation and reverse-calculation state, consumed by both the main content (course cards) and right panel (WAM overview, required scores). Faculty selector persists to localStorage. Reuse AssessmentRow with a `hideDueDate` prop or build a lightweight PredictAssessmentRow (Claude's discretion per CONTEXT.md).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **New PredictCard expandable shell** wrapping reused internals: build a new expandable card component (CSS border + left color stripe, like DeadlineCard pattern from Phase 8), with card header showing course info + Current/Projected marks + grade badge + expand chevron
- **Reuse AssessmentRow and GradeSummary** from Phase 7 inside the expanded section
- **Table column difference**: Phase 7 AssessmentRow has 4 columns (including Due Date), prototype has 3 columns (Assessment/Weight/Score). Claude's discretion on whether to add a `hideDueDate` prop or build a simplified PredictRow
- **Border style**: course prediction cards use CSS border + left colored stripe (not Rough.js) matching prototype; right panel cards use RoughCard with Rough.js hand-drawn borders
- **Client-side calculation**: all WAM/GPA/Projected values computed in the browser in real-time. `useGpaPredict()` and `useGpaPath()` hooks are NOT used in M1
- **Data sources**: `useCourses()` for course list, `useCourseGrades(id)` for per-course assessment details, `useGpaReport()` for level_weight/credit_points/target_wam
- **USYD WAM formula**: `WAM = sum(mark x cp x level_weight) / sum(cp x level_weight)`. Level_weight varies by faculty: Standard (all=1), Engineering (0/2/3/4), Science Honours (2/3 for 2000/3000 only)
- **Faculty selector**: dropdown or segmented control, default "Standard" (all weights = 1). Persists via localStorage
- **Real-time updates**: every keystroke immediately recalculates all values. No debounce
- **Default state**: all cards collapsed on page load
- **Multi-expand**: users can expand multiple course cards simultaneously (not accordion)
- **Deep-link from Dashboard**: URL search param `?course=COMP2017` auto-expands the matching card and scrolls into view
- **Score input**: number input fields (not sliders) for ungraded assessments, clamped 0-100. Dashed underline style
- **Right panel**: 4 cards (WAM Overview, Target WAM, Required Scores, Semester Progress) all using RoughCard
- **Portal-slot pattern**: createPortal + #right-panel-slot for right panel injection
- **Title row**: "Grade Predictor" heading with Target icon (Lucide), semester badge, credit points badge
- **Entrance animations**: CSS slideUp staggered delays (d1-d10)
- **i18n**: Full EN/ZH support, add `predict` namespace to next-intl messages
- **Loading & Error States**: per-section independent loading/error with skeleton/retry

### Claude's Discretion
- Exact implementation of AssessmentRow reuse vs new PredictRow (based on code complexity)
- Faculty selector UI placement and styling details
- GPA to WAM conversion formula specifics (simplified 4-point scale mapping)
- Skeleton card shapes and shimmer details
- Rough.js seed values and styling for right panel cards
- Entrance animation timing fine-tuning
- Error state wording
- Empty state design (no courses, no assessments)

### Deferred Ideas (OUT OF SCOPE)
- Cross-page prediction persistence (localStorage or backend) — deferred to M2 Phase 15
- Faculty auto-detection from Canvas enrollment — deferred to M2 Phase 14
- Historical WAM trend chart — out of scope for Phase 9
- Export/share prediction results — future feature
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-04 | Predict page with interactive What-if GPA simulator (slider-based score input, real-time calculation) | USYD WAM formula verified, prototype JS reference implementation analyzed, component reuse strategy defined, right panel card architecture documented |
</phase_requirements>

## Standard Stack

### Core (Already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ | UI framework | Project standard |
| Next.js | 15+ | App Router, file-based routing | Project standard |
| next-intl | latest | i18n (EN/ZH) | Established in Phase 1 |
| TanStack Query | v5 | Data fetching hooks | Established in Phase 2 |
| roughjs | 4.6.6 | Hand-drawn borders for right panel cards | Established in Phase 1 |
| lucide-react | latest | Icons (Target, ChevronDown, CheckCircle, AlertTriangle, XCircle, BarChart3, Lock) | Project standard |
| date-fns | 3+ | Not heavily used in this phase (maybe format for semester label) | Project standard |
| Tailwind CSS | v4 | Styling | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5+ | NOT needed for this phase | Predictions are local page state, no global store needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom WAM calc hook | useGpaPredict() mutation hook | CONTEXT.md explicitly says M1 is client-side only; mutations deferred to M2 |
| Local component state | Zustand store for predictions | Overkill for page-scoped state; cross-page persistence deferred to M2 |

**Installation:** No new packages needed. All dependencies already in project.

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── components/predict/
│   ├── PredictPage.tsx          # Main orchestrator (data fetching, portal, state mgmt)
│   ├── PredictTitleRow.tsx      # Title row: icon, heading, semester badge, cp badge, faculty selector
│   ├── PredictCard.tsx          # Expandable course card (CSS border + stripe, header + expanded section)
│   ├── PredictAssessmentTable.tsx  # 3-column assessment table (Assessment/Weight/Score) — OR reuses AssessmentRow with hideDueDate
│   ├── PredictGradeSummary.tsx  # Grade summary row at bottom of expanded card (or reuse GradeSummary)
│   ├── WamOverviewCard.tsx      # Right panel: current/predicted WAM, grade band, GPA
│   ├── TargetWamCard.tsx        # Right panel: target slider, gap badge
│   ├── RequiredScoresCard.tsx   # Right panel: reverse-calculated per-course required scores
│   └── SemesterProgressCard.tsx # Right panel: per-course RoughProgressBar assessed %
├── lib/predict/
│   ├── wam-engine.ts            # Pure functions: computeCurrent, computeProjected, computeWAM, computeRequired
│   ├── faculty-weights.ts       # Faculty level_weight maps: Standard, Engineering, ScienceHonours
│   └── wam-to-gpa.ts            # WAM-to-GPA 4.0 scale conversion
├── app/[locale]/(dashboard)/predict/
│   └── page.tsx                 # Route page (renders PredictPage with Suspense)
└── messages/
    ├── en.json                  # Add "predict" namespace
    └── zh.json                  # Add "predict" namespace
```

### Pattern 1: Prediction Engine (Pure Functions)

**What:** Centralized WAM/GPA computation extracted as pure functions, testable without React.
**When to use:** For all calculation logic on this page.
**Example:**
```typescript
// Source: prototype/predict.html computeWAM() + computeRequired()

// faculty-weights.ts
export type FacultyScheme = "standard" | "engineering" | "science_honours";

export const FACULTY_WEIGHTS: Record<FacultyScheme, (level: number) => number> = {
  standard: () => 1,
  engineering: (level) => {
    if (level >= 4) return 4;
    if (level === 3) return 3;
    if (level === 2) return 2;
    return 0; // 1000-level excluded
  },
  science_honours: (level) => {
    if (level >= 3) return 3;
    if (level === 2) return 2;
    return 0; // 1000-level excluded
  },
};

// wam-engine.ts
interface CourseData {
  courseId: string;
  code: string;
  creditPoints: number;
  levelWeight: number; // from GpaCourseSummary
  assessments: { weight: number; score: number | null; maxScore: number }[];
  predictions: Record<number, number | null>;
}

export function computeCurrent(assessments, predictions): number { /* ... */ }
export function computeProjected(assessments, predictions): number | null { /* ... */ }
export function computeWAM(courses: CourseData[], scheme: FacultyScheme): { wam: number; allFilled: boolean } { /* ... */ }
export function computeRequired(courses: CourseData[], targetWAM: number, scheme: FacultyScheme): RequiredScore[] { /* ... */ }
```

### Pattern 2: Expandable Card (CSS border + max-height transition)

**What:** Course prediction cards using CSS border (not Rough.js) with left color stripe, collapsible via max-height transition.
**When to use:** For all 5 course cards on the page.
**Example:**
```typescript
// Source: prototype/predict.html .pc-card pattern + Phase 8 DeadlineCard.tsx

// PredictCard.tsx
export default function PredictCard({
  course, isExpanded, onToggle, courseColor, children
}) {
  return (
    <div className={`relative ${isExpanded ? "cursor-default" : "cursor-pointer"}`}
         onClick={handleClick}>
      <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] shadow-card overflow-hidden relative">
        {/* Left color stripe */}
        <div className="absolute left-0 top-0 bottom-0 w-[5px] z-[3]"
             style={{ backgroundColor: courseColor.base }} />

        {/* Header (always visible) */}
        <div className="p-[16px_20px_16px_24px] flex items-center gap-[14px]">
          {/* color dot, course info, assessed badge, current/projected marks, grade badge, chevron */}
        </div>

        {/* Expanded section */}
        <div className="overflow-hidden transition-[max-height] duration-[400ms]"
             style={{
               maxHeight: isExpanded ? "800px" : "0",
               transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
             }}>
          {children}
        </div>
      </div>
    </div>
  );
}
```

### Pattern 3: Portal-Slot for Right Panel

**What:** Right panel content injected via createPortal into #right-panel-slot DOM element.
**When to use:** For all 4 right panel cards.
**Example:**
```typescript
// Source: Phase 5 DashboardPage.tsx, Phase 7 CourseDetailPage.tsx

const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
useEffect(() => {
  setPortalTarget(document.getElementById("right-panel-slot"));
}, []);

// In JSX:
{portalTarget && createPortal(
  <>
    <WamOverviewCard ... />
    <TargetWamCard ... />
    <RequiredScoresCard ... />
    <SemesterProgressCard ... />
  </>,
  portalTarget
)}
```

### Pattern 4: Prediction State Management (Local Page State)

**What:** Per-course prediction values stored in React state at page level, passed down to cards.
**When to use:** For managing score inputs across all course cards.
**Example:**
```typescript
// Source: Phase 7 CourseDetailPage.tsx prediction pattern

// Per-course predictions: { courseId: { assessmentIndex: number | null } }
const [allPredictions, setAllPredictions] = useState<
  Record<string, Record<number, number | null>>
>({});

const handlePredictionChange = useCallback(
  (courseId: string, index: number, value: string) => {
    if (value === "") {
      setAllPredictions(prev => ({
        ...prev,
        [courseId]: { ...prev[courseId], [index]: null },
      }));
      return;
    }
    const num = Number(value);
    if (isNaN(num)) return;
    const clamped = Math.min(100, Math.max(0, num));
    setAllPredictions(prev => ({
      ...prev,
      [courseId]: { ...prev[courseId], [index]: clamped },
    }));
  },
  []
);
```

### Anti-Patterns to Avoid
- **Debouncing score inputs:** CONTEXT.md explicitly says no debounce needed — 5 courses x ~4 assessments = trivial computation
- **Using useGpaPredict() mutation:** This is an API call to the backend prediction endpoint, NOT for M1 client-side calculation
- **Accordion behavior:** CONTEXT.md says multi-expand, NOT accordion — do not close other cards when one opens
- **Rough.js on course cards:** CONTEXT.md specifies CSS border + left stripe for course cards; only right panel cards use RoughCard

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Expandable card | New animation system | CSS max-height transition pattern (from Phase 8 DeadlineCard) | Already proven, matches prototype exactly |
| Grade band calculation | Custom grade thresholds | Existing `getGradeBand()` from `lib/utils/grade-band.ts` | Already implemented with HD/D/CR/P/F thresholds |
| Course colors | New color mapping | Existing `getCourseColor()` from `lib/dashboard/course-colors.ts` | 5 courses already mapped |
| Progress bars | Canvas-based bars | Existing `RoughProgressBar` component | Already handles Rough.js drawing, supports variable width/color |
| Hand-drawn card borders | Manual Rough.js SVG | Existing `RoughCard` component with `disableHover` prop | ResizeObserver + rAF burst redraw already handled |
| Entrance animations | Custom animation system | Existing `AnimatedEntry` component with delay prop | Matches prototype d1-d10 stagger timing |
| Right panel injection | Custom layout nesting | Existing portal-slot pattern (#right-panel-slot) | Proven in Phase 5 and Phase 7 |
| SSR safety for Rough.js | Manual dynamic import | Existing `withClientOnly()` wrapper | Handles hydration mismatch prevention |

**Key insight:** This page is 80% assembly of existing patterns. The unique work is the WAM calculation engine and the PredictCard shell component.

## Common Pitfalls

### Pitfall 1: Incorrect WAM Formula for Non-Standard Faculties
**What goes wrong:** Using flat credit-point weighted average instead of faculty-specific level_weight system gives incorrect WAM for Engineering/Science Honours students.
**Why it happens:** The "Standard" scheme (all weights = 1) is a simple weighted average, but Engineering weights are 0/2/3/4 (1000-level courses get weight 0, meaning they are EXCLUDED from the WAM).
**How to avoid:** Implement `FACULTY_WEIGHTS` map with 3 schemes. When `levelWeight(course.level) === 0`, that course contributes nothing to numerator OR denominator. Test with Engineering fixture data showing 1000-level exclusion.
**Warning signs:** Engineering students see different WAM than expected; 1000-level electives incorrectly affecting WAM.

### Pitfall 2: Assessment Weight Format Mismatch (0-1 vs 0-100)
**What goes wrong:** Fixture `assessment_weights[].weight` uses 0-1 scale (e.g., 0.15 = 15%) while prototype data uses 0-100 (e.g., 15 = 15%).
**Why it happens:** The OpenAPI schema and fixture data store weights as decimals (0.0-1.0), but the prototype JS operates on percentage integers (0-100). Mixing these causes wildly wrong calculations.
**How to avoid:** Normalize ALL weights to the same scale at the calculation boundary. The prototype's `computeWAM()` assumes `sum(weight) = 100` per course. The existing `AssessmentSection.tsx` computation already handles 0-1 weights correctly — follow that pattern, not the prototype's raw JS.
**Warning signs:** Projected grades showing impossibly high/low values; "100% assessed" on partially completed courses.

### Pitfall 3: Reverse Calculation Assumes Other Courses Maintain Current Average
**What goes wrong:** The `computeRequired()` function's assumption may confuse users or produce misleading results.
**Why it happens:** To calculate what score Course A needs to hit target WAM, we must assume something about other courses. The prototype assumes each other course scores its current average on all remaining assessments. This is a reasonable default but not always accurate.
**How to avoid:** Follow the prototype's exact algorithm. Show the assumption clearly in UI: "Average on remaining assessments" note text (already in prototype).
**Warning signs:** Required scores changing unexpectedly when modifying predictions in unrelated courses (this is correct behavior due to the cross-course dependency, but should be visually clear).

### Pitfall 4: Deep-Link Auto-Expand Scroll Timing
**What goes wrong:** `scrollIntoView` fires before the card's expand animation completes, scrolling to the wrong position.
**Why it happens:** CSS max-height transition takes 400ms. If scroll triggers before the card reaches full height, the browser scrolls to a position that becomes incorrect once the card finishes expanding.
**How to avoid:** Use `setTimeout` matching the transition duration (400ms) before calling `scrollIntoView()`, or use the `transitionend` event on the expanded section element.
**Warning signs:** Card scrolls into view but is partially hidden below the fold.

### Pitfall 5: Course Data Joining (GpaReport + CourseDetail)
**What goes wrong:** The Predict page needs data from two different endpoints: `useGpaReport()` (for level_weight, credit_points) and course detail data (for assessment_weights with scores). Joining these by course_id can fail if IDs don't match.
**Why it happens:** The GPA report uses `course_id` like "crs_comp2017" while course detail also uses this ID. But the `useCourseDetail()` hook fetches per-course, creating N+1 calls.
**How to avoid:** Fetch `useGpaReport()` for the course list (already includes code, credit_points, level_weight), then for each course fetch `useCourseDetail(courseId)` to get assessment_weights. Alternatively, since this is mock data, all hooks resolve instantly. The page should handle the loading state for each course independently.
**Warning signs:** Missing assessment data for some courses; loading spinners that never resolve.

### Pitfall 6: jsdom Missing scrollTo/scrollIntoView
**What goes wrong:** Tests crash with `scrollTo is not a function` or `scrollIntoView is not a function`.
**Why it happens:** jsdom doesn't implement scroll APIs (documented in CLAUDE.md as Problem 3).
**How to avoid:** Add `typeof element.scrollIntoView === "function"` guard before calling, OR mock `Element.prototype.scrollIntoView = vi.fn()` in test setup.
**Warning signs:** All component tests fail with DOM API errors.

## Code Examples

### WAM Computation Engine (Verified from prototype JS)

```typescript
// Source: prototype/predict.html lines 405-518

/**
 * Compute current average over graded assessments only.
 * Weights are 0-1 scale (from fixture data).
 */
export function computeCurrent(
  assessments: { weight: number; score: number | null; maxScore: number }[]
): number {
  let sumSW = 0;
  let sumW = 0;
  for (const a of assessments) {
    if (a.score !== null && a.maxScore > 0) {
      const normalized = a.score / a.maxScore; // normalize to 0-1
      sumSW += normalized * a.weight;
      sumW += a.weight;
    }
  }
  return sumW > 0 ? (sumSW / sumW) * 100 : 0; // return as percentage
}

/**
 * Compute projected final including predictions.
 * Returns null if not all ungraded assessments have predictions.
 */
export function computeProjected(
  assessments: { weight: number; score: number | null; maxScore: number }[],
  predictions: Record<number, number | null>
): number | null {
  let sumSW = 0;
  let totalW = 0;
  let allFilled = true;

  assessments.forEach((a, i) => {
    totalW += a.weight;
    if (a.score !== null && a.maxScore > 0) {
      sumSW += (a.score / a.maxScore) * a.weight;
    } else {
      const pred = predictions[i];
      if (pred !== null && pred !== undefined) {
        sumSW += (pred / (a.maxScore || 100)) * a.weight;
      } else {
        allFilled = false;
      }
    }
  });

  if (!allFilled) return null;
  return totalW > 0 ? (sumSW / totalW) * 100 : 0;
}
```

### Faculty Weight Mapping (Verified from official USYD sources)

```typescript
// Source: sydney.edu.au/students/weighted-average-mark.html
//         sydney.edu.au/handbooks/engineering/engineering-honours/course-resolutions.html
//         rp-handbooks.sydney.edu.au/handbooks/archive/2016/science/coursework/honours/

export type FacultyScheme = "standard" | "engineering" | "science_honours";

export const FACULTY_WEIGHTS: Record<FacultyScheme, (level: number) => number> = {
  // Standard: all levels weighted equally at 1
  standard: () => 1,

  // Engineering (EIHWAM): 0/2/3/4 for 1000/2000/3000/4000+
  // 1000-level units get weight 0 (excluded from WAM)
  // Thesis units get double weight (8) — not applicable to our use case
  engineering: (level: number) => {
    if (level >= 4) return 4;
    if (level === 3) return 3;
    if (level === 2) return 2;
    return 0;
  },

  // Science Honours (SCIWAM): only intermediate (2000) and senior (3000+)
  // 1000-level units excluded (weight 0)
  science_honours: (level: number) => {
    if (level >= 3) return 3;
    if (level === 2) return 2;
    return 0;
  },
};
```

### WAM-to-GPA Conversion (Simplified 4-point scale)

```typescript
// Source: prototype/predict.html wamToGPA() function + USYD guide-to-grades

export function wamToGpa(wam: number): number {
  if (wam >= 85) return 4.0;  // HD
  if (wam >= 75) return 3.5;  // D
  if (wam >= 65) return 2.5;  // CR
  if (wam >= 50) return 1.5;  // P
  return 0.0;                  // F
}
```

**Note:** This is a simplified step-function mapping. USYD doesn't officially define a 4.0 GPA scale — WAM is the primary metric. The TRD stores `current_gpa_4` in the GPA report for convenience. Claude has discretion on whether to use linear interpolation within bands for smoother GPA display.

### Reverse Calculation (computeRequired)

```typescript
// Source: prototype/predict.html computeRequired() function lines 479-518

/**
 * For each course, calculate the minimum average score needed on remaining
 * assessments to achieve the target WAM.
 *
 * Algorithm:
 * 1. For the target course: solve for the required average on remaining weight
 * 2. For all other courses: assume they score their current average on remaining
 * 3. WAM equation: targetWAM = sum(final_mark * cp * lw) / sum(cp * lw)
 *    Solve for target course's final_mark, then derive required average
 */
export function computeRequired(
  courses: CourseComputeData[],
  targetWAM: number,
  scheme: FacultyScheme
): RequiredScoreResult[] {
  const getLW = FACULTY_WEIGHTS[scheme];
  const totalDen = courses.reduce(
    (sum, c) => sum + c.creditPoints * getLW(c.level),
    0
  );

  return courses.map((course, idx) => {
    const lw = getLW(course.level);
    if (lw === 0) {
      // Course excluded from WAM under this scheme
      return { code: course.code, color: course.color, required: 0, excluded: true };
    }

    const { knownSum, knownWeight } = getKnownScores(course);
    const remainWeight = 1.0 - knownWeight; // weights are 0-1

    if (remainWeight <= 0) {
      return { code: course.code, color: course.color, required: computeCurrent(course.assessments), locked: true };
    }

    // Assume other courses maintain their current average
    let otherNum = 0;
    courses.forEach((o, oi) => {
      if (oi === idx) return;
      const oLw = getLW(o.level);
      if (oLw === 0) return;
      const { knownSum: oKS, knownWeight: oKW } = getKnownScores(o);
      const oRemain = 1.0 - oKW;
      const oAvg = oKW > 0 ? (oKS / oKW) : targetWAM / 100;
      const oFinal = (oKS + oAvg * oRemain) * 100; // convert to percentage
      otherNum += oFinal * o.creditPoints * oLw;
    });

    const neededFinal = (targetWAM * totalDen - otherNum) / (course.creditPoints * lw);
    const knownContrib = knownSum * 100; // convert to percentage
    const required = (neededFinal - knownContrib) / (remainWeight * 100);

    return { code: course.code, color: course.color, required, locked: false };
  });
}
```

### Feasibility Classification

```typescript
// Source: prototype/predict.html feasibilityClass() lines 520-534

export type Feasibility = "feasible" | "warning" | "impossible";

export function getFeasibility(required: number): Feasibility {
  if (required <= 85) return "feasible";   // Comfortable — green check
  if (required <= 100) return "warning";    // Achievable but hard — orange alert
  return "impossible";                      // Mathematically impossible — red X
}

export const FEASIBILITY_ICONS = {
  feasible: "CheckCircle",    // green
  warning: "AlertTriangle",   // orange
  impossible: "XCircle",      // red
} as const;

export const FEASIBILITY_COLORS = {
  feasible: "var(--green)",
  warning: "var(--orange)",
  impossible: "var(--red)",
} as const;
```

### Target Slider with Fill Gradient

```typescript
// Source: prototype/predict.html updateSliderFill() + target-slider CSS

// The range slider needs a custom fill gradient to show progress
// CSS approach (inline style on the input):
const pct = ((value - 50) / 50) * 100;
const bgStyle = `linear-gradient(to right, var(--orange) 0%, var(--orange) ${pct}%, var(--divider) ${pct}%, var(--divider) 100%)`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side GPA calculation | Client-side computation in M1 | Phase 9 decision | All calculation is synchronous, no loading states for computation |
| Single WAM scheme | Faculty-based level_weight system | Phase 9 CONTEXT.md | Must support 3 faculty schemes, default to Standard |
| Accordion cards | Multi-expand cards | Phase 9 CONTEXT.md | Multiple cards can be open simultaneously for comparison |
| Slider score input | Number input with dashed underline | Phase 9 CONTEXT.md | Despite requirement ID mentioning "slider-based", CONTEXT.md overrides to number inputs |

**Deprecated/outdated:**
- UI-04 requirement text says "slider-based score input" but CONTEXT.md explicitly specifies number input fields (not sliders). CONTEXT.md takes precedence.

## Open Questions

1. **Course Level Derivation**
   - What we know: The GPA report fixture includes `level_weight` per course (already resolved), and courses have codes like COMP2017 (level 2), COMP3221 (level 3). The prototype derives level from course data field `level`.
   - What's unclear: The `GpaCourseSummary` schema has `level_weight` but not `level` (the raw course level number). The course-level needs to be derived either from course code parsing (e.g., COMP**2**017 = level 2) or from the fixture data structure.
   - Recommendation: Parse level from course code (second character of numeric part) as a utility function. This is consistent with USYD course code conventions where the first digit of the number indicates the level.

2. **WAM-to-GPA Precision**
   - What we know: The prototype uses step-function mapping (85+=4.0, 75+=3.5, etc.)
   - What's unclear: Whether users expect linear interpolation within bands for more precise GPA display
   - Recommendation: Start with step-function (matches prototype), note as Claude's discretion area

3. **MATH1005 (No Grades Course) Display**
   - What we know: MATH1005 has `completed_weight: 0.0`, all assessments ungraded, `current_mark: null`
   - What's unclear: How to display current/projected in header when both are zero/null
   - Recommendation: Show em-dash for current, show projected only when user enters predictions. Follow existing pattern from `getGradeBand()` which returns em-dash for null.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run --testPathPattern predict` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-04a | WAM computation correctness (standard/engineering/science_honours) | unit | `cd frontend && npx vitest run --testPathPattern wam-engine -x` | Wave 0 |
| UI-04b | computeRequired reverse calculation | unit | `cd frontend && npx vitest run --testPathPattern wam-engine -x` | Wave 0 |
| UI-04c | Faculty weight mapping | unit | `cd frontend && npx vitest run --testPathPattern faculty-weights -x` | Wave 0 |
| UI-04d | PredictCard expand/collapse | component | `cd frontend && npx vitest run --testPathPattern PredictCard -x` | Wave 0 |
| UI-04e | Score input clamping (0-100) | component | `cd frontend && npx vitest run --testPathPattern PredictCard -x` | Wave 0 |
| UI-04f | Real-time WAM update on input | component | `cd frontend && npx vitest run --testPathPattern PredictPage -x` | Wave 0 |
| UI-04g | Target slider updates required scores | component | `cd frontend && npx vitest run --testPathPattern PredictPage -x` | Wave 0 |
| UI-04h | Deep-link ?course=X auto-expand | component | `cd frontend && npx vitest run --testPathPattern PredictPage -x` | Wave 0 |
| UI-04i | i18n message keys completeness | unit | `cd frontend && npx vitest run --testPathPattern message-keys -x` | Existing (update) |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run --testPathPattern predict -x`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/predict/wam-engine.test.ts` — covers UI-04a, UI-04b (pure function tests for WAM calculation, reverse calculation, all 3 faculty schemes)
- [ ] `frontend/__tests__/predict/faculty-weights.test.ts` — covers UI-04c (level weight mapping for each scheme)
- [ ] `frontend/__tests__/predict/PredictCard.test.tsx` — covers UI-04d, UI-04e (expand/collapse, input clamping)
- [ ] `frontend/__tests__/predict/PredictPage.test.tsx` — covers UI-04f, UI-04g, UI-04h (integration: real-time updates, target slider, deep-link)
- [ ] Update `frontend/__tests__/i18n/message-keys.test.ts` — covers UI-04i (add predict namespace)

## Sources

### Primary (HIGH confidence)
- `prototype/predict.html` — Complete reference implementation including JS calculation logic (computeCurrent, computeProjected, computeWAM, computeRequired), HTML structure, and CSS styles
- `frontend/components/course-detail/AssessmentRow.tsx` — Existing assessment row component with prediction input support
- `frontend/components/course-detail/GradeSummary.tsx` — Existing grade summary with countUp animation
- `frontend/components/course-detail/AssessmentSection.tsx` — Grade calculation logic (useMemo) pattern
- `frontend/components/deadlines/DeadlineCard.tsx` — Expandable card pattern (CSS border + left stripe + max-height transition)
- `frontend/components/dashboard/DashboardPage.tsx` — Portal-slot pattern reference
- `frontend/lib/fixtures/gpa.ts` — GPA report fixture with level_weight, credit_points per course
- `frontend/lib/fixtures/courses.ts` — CourseDetail fixture with assessment_weights including score/maxScore/weight
- `frontend/lib/api/types.gen.d.ts` — TypeScript types for GpaReport, GpaCourseSummary, AssessmentWeight, CourseDetail

### Secondary (MEDIUM confidence)
- [USYD WAM official page](https://www.sydney.edu.au/students/weighted-average-mark.html) — Official formula: WAM = sum(mark x cp x level_weight) / sum(cp x level_weight)
- [USYD Engineering Honours resolutions](http://www.sydney.edu.au/handbooks/engineering/engineering-honours/course-resolutions.html) — Engineering EIHWAM: level weights 0/2/3/4 for 1000/2000/3000/4000+
- [USYD Science Honours resolutions](https://rp-handbooks.sydney.edu.au/handbooks/archive/2016/science/coursework/honours/index.shtml.html) — SCIWAM: level weights 2/3 for 2000/3000 only, 1000-level excluded
- [GradeCalc.info USYD calculator](https://gradecalc.info/au/nsw/usyd/weighted-grade-calc.pl) — Grade scale confirmation: HD 85-100, D 75-84, CR 65-74, P 50-64, F 0-49

### Tertiary (LOW confidence)
- WAM-to-GPA 4.0 conversion mapping — no official USYD source found; using prototype's step-function mapping as reference implementation. USYD primarily uses WAM, not GPA 4.0.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - patterns proven in Phase 5/7/8, prototype JS provides exact algorithm reference
- WAM formula (Standard): HIGH - verified against official USYD source
- WAM formula (Engineering): HIGH - verified against official Engineering faculty resolutions
- WAM formula (Science Honours): MEDIUM - verified against 2016 archived resolutions, current resolutions may differ
- Reverse calculation: HIGH - prototype JS provides reference implementation
- Component reuse: HIGH - read all source files, interfaces are compatible
- Pitfalls: HIGH - based on codebase analysis and prior phase learnings documented in STATE.md

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable — frontend patterns, no external dependency changes expected)
