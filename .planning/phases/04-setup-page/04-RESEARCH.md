# Phase 4: Setup Page - Research

**Researched:** 2026-03-22
**Domain:** React multi-step onboarding form with token validation, Motion animations, Rough.js hand-drawn borders
**Confidence:** HIGH

## Summary

Phase 4 builds a 3-step API token onboarding page that continues the auth flow established in Phase 3. New users land here after registration to connect their Canvas LMS and Ed Discussion accounts. The page shares the same visual identity as the Auth page (colorful AuthDoodles, standalone centered layout, RoughCard borders) and reuses several existing components directly.

The technical challenge is moderate: a linear step wizard with crossfade/height-morph transitions (Motion AnimatePresence), collapsible guide cards with Rough.js border redraw, client-side token format validation (no real API calls), mock sync simulation, and a SetupGuard (inverse of AuthGuard -- requires logged-in + !tokenConfigured). All dependencies are already installed in the project. No new packages needed.

**Primary recommendation:** Build 9 new components (SetupPage orchestrator + StepIndicator + WelcomeStep + TutorialStep + GuideCard + TokenStep + TokenInput + SuccessStep + SetupGuard), add i18n "setup" namespace to both locale files, create the /[locale]/setup route in the (auth) route group, and update the (auth) layout to handle both Auth and Setup pages with appropriate guards.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Token validation triggers on "Validate & Connect" button click (not real-time input)
- Sequential validation: Canvas first -> wait 0.8s -> Ed. If first fails, stop
- Specific format error messages for each platform
- Enhanced sync simulation: call mock sync API, display real mock course names (COMP2017, COMP3221, STAT2011, INFO2222, MATH1005)
- Manual "Go to Dashboard" button (no auto-redirect)
- State update: useAuthStore.setTokenConfigured(true) + success toast on Dashboard
- Already-configured users visiting /setup auto-redirect to /dashboard
- Unauthenticated users visiting /setup redirect to /auth
- Reuse AuthDoodles component directly (same opacity 0.15-0.20)
- Use Motion library (framer-motion) for step transitions
- AnimatePresence for step crossfade with height morphing
- Guide cards default expanded, independent fold/unfold (not accordion)
- Step circles are display-only, not clickable
- Linear guided flow, no step skipping
- Full Chinese translations; platform names stay English
- Ed tutorial updated to real flow (region selection -> Australia)
- Route: /[locale]/setup in (auth) route group
- Setup page is one-time onboarding; token management deferred to Phase 12

### Claude's Discretion
- Exact Motion animation parameters (spring configs, duration, easing)
- Token format regex patterns (Canvas numeric, Ed alphanumeric)
- Sync simulation timing and mock course data selection
- Welcome page feature badge layout and icons
- Security note styling details
- Step 2 tutorial step icon choices
- Rough.js border seed and styling parameters

### Deferred Ideas (OUT OF SCOPE)
- Token management / editing after initial setup -- Phase 12 Settings page
- Real token validation against Canvas/Ed APIs -- M2 backend implementation
- Token expiration warnings -- Phase 17 Notifications
- Screenshot/GIF visual guides showing Canvas/Ed settings pages -- future enhancement
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-10 | Setup page with 3-step API token onboarding flow | Full UI-SPEC contract defines all 3 steps, transitions, visual details. 9 new components, i18n, route, guard |
| PLAT-01 | User can complete registration and API token connection in 3 steps with visual guides | Tutorial guide cards (Step 2) with Canvas + Ed instructions, token paste + validation (Step 3), mock sync simulation on success |
</phase_requirements>

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App router, route groups, dynamic routes | Already installed, (auth) route group established |
| React | 19.1.0 | Component framework | Already installed |
| motion | 12.38.0 | AnimatePresence step transitions, height morph | Already installed, Phase 3 established patterns |
| roughjs | 4.6.6 | Hand-drawn card borders via RoughCard | Already installed, ResizeObserver burst pattern established |
| next-intl | 4.8.3 | i18n with [locale] routing | Already installed, "setup" namespace to be added |
| zustand | 5.0.12 | Auth store (setTokenConfigured) | Already installed, store ready to use |
| lucide-react | 0.577.0 | Icons (shield-check, lock, trash-2, check, etc.) | Already installed |
| sonner | 2.0.7 | Toast notifications | Already installed, Toaster in (auth) layout |
| tailwind-merge + clsx | Latest | cn() utility for class merging | Already installed |

### Supporting (Already Installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.91.2 | useSyncTrigger mutation for sync simulation | Already installed, hook exists in use-sync.ts |
| ky | 1.14.3 | HTTP client for mock API calls | Already installed, api client configured |

**No new packages needed.** Everything required is already in the project.

## Architecture Patterns

### Recommended Project Structure

```
frontend/
├── components/setup/
│   ├── SetupPage.tsx          # Orchestrator: step state, transitions
│   ├── StepIndicator.tsx      # 3 circles + 2 lines, display-only
│   ├── WelcomeStep.tsx        # Step 1: logo, features, "Get Started"
│   ├── TutorialStep.tsx       # Step 2: Canvas + Ed guide cards
│   ├── GuideCard.tsx          # Collapsible tutorial card (reusable)
│   ├── TokenStep.tsx          # Step 3: paste tokens, validate
│   ├── TokenInput.tsx         # Single token input with status icon
│   ├── SuccessStep.tsx        # Success: sync sim, "Go to Dashboard"
│   └── SetupGuard.tsx         # Auth check: logged in + !tokenConfigured
├── app/[locale]/(auth)/
│   ├── layout.tsx             # MODIFY: handle both Auth + Setup guards
│   └── setup/
│       └── page.tsx           # Route entry: Suspense + SetupPage
├── messages/
│   ├── en.json                # ADD "setup" namespace
│   └── zh.json                # ADD "setup" namespace
└── lib/fixtures/
    └── helpers.ts             # Existing mock helpers (no changes)
```

### Pattern 1: Step Wizard with AnimatePresence Height Morphing

**What:** Multi-step form where step transitions use crossfade opacity + animated height change, with RoughCard border redrawing during the transition.

**When to use:** Any multi-step onboarding or wizard flow.

**Example:**
```typescript
// SetupPage.tsx orchestrator pattern
"use client";
import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";

type Step = 1 | 2 | 3 | "success";

export default function SetupPage() {
  const [step, setStep] = useState<Step>(1);

  return (
    <RoughCard disableHover padding="py-10 px-9 max-[680px]:py-7 max-[680px]:px-5">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, position: "absolute" as const }}
          transition={{ opacity: { duration: 0.3 } }}
        >
          {step === 1 && <WelcomeStep onNext={() => setStep(2)} />}
          {step === 2 && <TutorialStep onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <TokenStep onBack={() => setStep(2)} onSuccess={() => setStep("success")} />}
          {step === "success" && <SuccessStep />}
        </motion.div>
      </AnimatePresence>
    </RoughCard>
  );
}
```

### Pattern 2: SetupGuard (Inverse of AuthGuard)

**What:** Route guard that requires authentication AND !tokenConfigured. Inverse logic from AuthGuard.

**When to use:** /setup route only.

**Example:**
```typescript
// SetupGuard.tsx -- extends AuthGuard pattern
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";

export function SetupGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, tokenConfigured } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) router.replace("/auth");
    else if (tokenConfigured) router.replace("/dashboard");
  }, [hydrated, isAuthenticated, tokenConfigured, router]);

  if (!hydrated) return null;
  if (!isAuthenticated || tokenConfigured) return null;
  return <>{children}</>;
}
```

### Pattern 3: Collapsible GuideCard with Rough.js Border Redraw

**What:** Guide card with smooth height collapse/expand that triggers RoughCard's ResizeObserver -> burst redraw pattern.

**When to use:** Tutorial sections with expandable content inside RoughCard.

**Key insight:** RoughCard already has ResizeObserver burst pattern (400ms rAF loop). When guide card content collapses/expands, the parent RoughCard's height changes, triggering ResizeObserver automatically. No extra work needed -- just animate height via Motion or CSS transitions and the border redraws frame-by-frame.

### Pattern 4: Sequential Async Validation

**What:** Validate Canvas token first, show result, wait 0.8s, then validate Ed token. Stop on first failure.

**When to use:** Token validation in Step 3.

**Example:**
```typescript
// Token validation sequence (inside TokenStep)
const handleValidate = async () => {
  setValidating(true);

  // Canvas validation
  const canvasValid = validateCanvasToken(canvasValue);
  setCanvasStatus(canvasValid ? "valid" : "invalid");
  if (!canvasValid) {
    setValidating(false);
    return; // Stop -- don't validate Ed
  }

  // Wait 0.8s between validations
  await new Promise(r => setTimeout(r, 800));

  // Ed validation
  const edValid = validateEdToken(edValue);
  setEdStatus(edValid ? "valid" : "invalid");
  if (!edValid) {
    setValidating(false);
    return;
  }

  // Both passed -- wait 0.5s then transition to success
  await new Promise(r => setTimeout(r, 500));
  onSuccess();
};
```

### Pattern 5: (auth) Layout Guard Strategy

**What:** The (auth) layout currently wraps AuthGuard which redirects authenticated users away. Setup page needs the OPPOSITE -- it requires authentication. The layout must handle both.

**When to use:** When the (auth) route group serves pages with different auth requirements.

**Recommended approach:** Remove AuthGuard from layout.tsx. Each page provides its own guard:
- `/auth/page.tsx` wraps with AuthGuard (redirects authenticated users)
- `/setup/page.tsx` wraps with SetupGuard (requires authentication + !tokenConfigured)

This avoids fighting the layout-level guard.

### Anti-Patterns to Avoid

- **Wrapping Step content in layout animation + AnimatePresence together:** Don't mix `layout` prop with AnimatePresence `mode="wait"` -- can cause double animations and jitter. Use AnimatePresence mode="wait" with explicit opacity/height transitions instead.
- **Real-time token validation on input:** CONTEXT.md explicitly says validation triggers on button click only. Do not add onChange validation.
- **Using accordion for guide cards:** Both must be independently expandable. Do not use accordion behavior.
- **Auto-redirecting after sync completes:** User must click "Go to Dashboard" manually. No setTimeout redirect.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step transitions | Custom CSS transition manager | Motion AnimatePresence mode="wait" | Height morphing + opacity crossfade is complex to hand-roll correctly |
| Route guards | Custom middleware auth checks | Zustand persist hydration pattern (AuthGuard established) | Hydration timing is tricky; existing pattern handles it |
| Token storage API calls | Custom fetch() wrappers | Existing useConfigureToken() hook from use-user.ts | Already typed against OpenAPI spec |
| Sync trigger | Custom POST request | Existing useSyncTrigger() hook from use-sync.ts | Already implements cache invalidation |
| Toast notifications | Custom notification system | sonner Toaster (already in layout) | Already styled and configured |
| i18n | Custom translation system | next-intl useTranslations() | Already configured with [locale] routing |
| Hand-drawn borders | Custom SVG drawing code | RoughCard component with ResizeObserver burst | Already handles redraw during animations |
| Client-only rendering | Custom useEffect + state | withClientOnly() HOC | Already handles dynamic import + SSR skip |

**Key insight:** Phase 3 established nearly all the patterns this phase needs. The primary task is composing existing building blocks into the new step flow, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: AuthGuard in (auth) Layout Blocking Setup Page

**What goes wrong:** The current (auth)/layout.tsx wraps children with AuthGuard, which redirects authenticated users to /dashboard or /setup. But the setup page NEEDS an authenticated user. AuthGuard would redirect them away before they can see the setup page.

**Why it happens:** AuthGuard was designed for the auth page only -- it assumes "authenticated = wrong page."

**How to avoid:** Move guards from layout.tsx to individual page components. Auth page gets AuthGuard, Setup page gets SetupGuard. Layout only provides shared visual elements (AuthDoodles, LanguageSwitcher, Toaster).

**Warning signs:** Infinite redirect loop between /setup and /auth.

### Pitfall 2: Height Morphing Jank with AnimatePresence

**What goes wrong:** Steps have different heights. Transitioning between them without explicit height animation causes content to jump.

**Why it happens:** AnimatePresence mode="wait" handles opacity but not container height by default.

**How to avoid:** Wrap steps in a container that measures/animates height. Two approaches:
1. Use `motion.div` with `layout` on the wrapper to auto-animate height
2. Use a ref-based approach: measure outgoing height, measure incoming height, animate wrapper from one to other

RoughCard's ResizeObserver burst (400ms) will automatically redraw borders during the height transition.

**Warning signs:** Card border not following content during step transitions.

### Pitfall 3: Zustand Hydration Race in SetupGuard

**What goes wrong:** On first render, zustand persist hasn't hydrated from localStorage yet. isAuthenticated reads as false, causing premature redirect to /auth.

**Why it happens:** zustand/persist hydrates asynchronously.

**How to avoid:** Use the exact same hydration pattern as AuthGuard: `useAuthStore.persist.onFinishHydration()` + `hasHydrated()` check. Render nothing until hydrated.

**Warning signs:** Flash of redirect on page refresh, or user bouncing between /auth and /setup.

### Pitfall 4: scrollTo Not Available in jsdom (Testing)

**What goes wrong:** Tests crash with `scrollTo is not a function`.

**Why it happens:** jsdom doesn't implement scrollTo, scrollIntoView, or other scroll APIs.

**How to avoid:** Already documented in CLAUDE.md. Add `typeof element.scrollTo === "function"` guards in component code. Or mock scrollTo in test setup if needed.

### Pitfall 5: Motion/Framer-Motion Import Path

**What goes wrong:** Using `import { ... } from "framer-motion"` instead of `import { ... } from "motion/react"`.

**Why it happens:** Many tutorials still reference the old "framer-motion" package name.

**How to avoid:** This project uses the `motion` package (v12.38.0). Always import from `motion/react`. Phase 3 established this pattern -- check SuccessOverlay.tsx and AuthPage.tsx for reference.

### Pitfall 6: Tuple Cast for Motion Ease Arrays

**What goes wrong:** TypeScript strict mode rejects `ease: [0.4, 0, 0.2, 1]` because it infers `number[]` instead of the required tuple type.

**Why it happens:** TypeScript literal inference doesn't narrow arrays to tuples automatically.

**How to avoid:** Cast ease arrays: `ease: [0.4, 0, 0.2, 1] as [number, number, number, number]`. Already established in Phase 03-02 (STATE.md decision).

### Pitfall 7: Suspense Boundary for useSearchParams

**What goes wrong:** Next.js 15 static builds fail without Suspense boundary around components using useSearchParams.

**Why it happens:** Next.js 15 requires Suspense for client-side URL state consumers during static optimization.

**How to avoid:** Wrap page component in `<Suspense>` in page.tsx (same as auth/page.tsx pattern). The setup page may not use useSearchParams directly, but if it does, ensure Suspense wrapping.

## Code Examples

### Token Format Validation Functions

```typescript
// lib/validation/token.ts (or inline in TokenStep)
/**
 * Canvas tokens are numeric strings, typically ~70 characters.
 * Pattern: digits only, length between 50-100 (generous range).
 */
export function validateCanvasToken(value: string): boolean {
  const trimmed = value.trim();
  return /^\d{50,100}$/.test(trimmed);
}

/**
 * Ed Discussion tokens are shorter alphanumeric strings.
 * Pattern: alphanumeric + possible hyphens/underscores, 10-50 chars.
 */
export function validateEdToken(value: string): boolean {
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]{10,50}$/.test(trimmed);
}
```

### Sync Simulation in SuccessStep

```typescript
// Inside SuccessStep component
const MOCK_COURSES = ["COMP2017", "COMP3221", "STAT2011", "INFO2222", "MATH1005"];

const [syncStatus, setSyncStatus] = useState<"syncing" | "complete">("syncing");
const [courseNames, setCourseNames] = useState<string[]>([]);

useEffect(() => {
  // Simulate sync API call + 3s delay
  const timer = setTimeout(() => {
    setCourseNames(MOCK_COURSES);
    setSyncStatus("complete");
    // Update auth store
    useAuthStore.getState().setTokenConfigured(true);
  }, 3000);
  return () => clearTimeout(timer);
}, []);
```

### i18n Namespace Addition Pattern

```json
// messages/en.json -- add "setup" key alongside existing namespaces
{
  "nav": { ... },
  "auth": { ... },
  "setup": {
    "welcome": {
      "title": "Welcome to UniBoard",
      "description": "Let's connect your Canvas LMS and Ed Discussion accounts...",
      "subtitle": "This takes about 2 minutes. You'll need access to Canvas and Ed.",
      "features": {
        "readonly": "Read-only access",
        "encrypted": "AES-256 encrypted",
        "deletable": "Delete anytime"
      },
      "cta": "Get Started"
    },
    "tutorial": { ... },
    "tokens": { ... },
    "success": { ... }
  }
}
```

### Step Indicator Component Pattern

```typescript
// StepIndicator.tsx
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | "success";
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const stepNum = currentStep === "success" ? 4 : currentStep;

  const circleClass = (step: number) =>
    cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ease",
      step < stepNum || currentStep === "success"
        ? "bg-[#788c5d] text-white"       // completed
        : step === stepNum
          ? "bg-[#d97757] text-white"      // active
          : "border-2 border-card-border text-text-3" // upcoming
    );

  const lineClass = (afterStep: number) =>
    cn(
      "w-12 h-0.5 mx-2 transition-[background] duration-300 ease",
      afterStep < stepNum || currentStep === "success"
        ? "bg-[#788c5d]"
        : "bg-card-border"
    );

  return (
    <div className="flex items-center justify-center mb-8" role="group" aria-label="Setup progress">
      {[1, 2, 3].map((step, i) => (
        <Fragment key={step}>
          <div className={circleClass(step)} aria-label={`Step ${step}`}>
            {(step < stepNum || currentStep === "success")
              ? <Check size={16} />
              : step}
          </div>
          {i < 2 && <div className={lineClass(step)} />}
        </Fragment>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion package | motion package (v12+) | 2024 rebrand | Import from "motion/react" not "framer-motion" |
| Manual height animation for step wizards | AnimatePresence mode="wait" + layout | Motion v11+ | Simpler API for cross-step transitions |
| zustand v4 persist API | zustand v5 persist with onFinishHydration | 2024 | Same API, just version alignment |

**No deprecated patterns in current stack.** All Phase 3 patterns remain current.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react + jsdom |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && pnpm test -- --run --testPathPattern setup` |
| Full suite command | `cd frontend && pnpm test -- --run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-10-a | SetupGuard redirects unauthenticated to /auth | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/SetupGuard` | Wave 0 |
| UI-10-b | SetupGuard redirects configured users to /dashboard | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/SetupGuard` | Wave 0 |
| UI-10-c | Step navigation 1->2->3->success flow | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/SetupPage` | Wave 0 |
| UI-10-d | StepIndicator renders correct states | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/StepIndicator` | Wave 0 |
| PLAT-01-a | Token format validation (Canvas numeric ~70 chars) | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/token-validation` | Wave 0 |
| PLAT-01-b | Token format validation (Ed alphanumeric) | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/token-validation` | Wave 0 |
| PLAT-01-c | Sequential validation stops on first failure | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/TokenStep` | Wave 0 |
| PLAT-01-d | Guide cards expand/collapse independently | unit | `cd frontend && pnpm test -- --run --testPathPattern setup/GuideCard` | Wave 0 |
| UI-10-e | i18n keys exist for both en and zh | unit | Covered by existing `__tests__/i18n/message-keys.test.ts` (add "setup" check) | Partial |
| UI-10-f | Visual rendering of all steps | manual-only | Requires browser -- UAT | N/A |

### Sampling Rate

- **Per task commit:** `cd frontend && pnpm test -- --run --testPathPattern setup`
- **Per wave merge:** `cd frontend && pnpm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `__tests__/setup/SetupGuard.test.tsx` -- covers UI-10-a, UI-10-b
- [ ] `__tests__/setup/SetupPage.test.tsx` -- covers UI-10-c (step flow)
- [ ] `__tests__/setup/StepIndicator.test.tsx` -- covers UI-10-d
- [ ] `__tests__/setup/token-validation.test.ts` -- covers PLAT-01-a, PLAT-01-b
- [ ] `__tests__/setup/TokenStep.test.tsx` -- covers PLAT-01-c
- [ ] `__tests__/setup/GuideCard.test.tsx` -- covers PLAT-01-d
- [ ] Update existing `__tests__/i18n/message-keys.test.ts` to check "setup" namespace

## Open Questions

1. **Sync simulation: real API call vs. pure setTimeout?**
   - What we know: CONTEXT.md says "call mock sync API (POST /api/v1/sync/trigger)". The mock route handler exists and returns a sync_id + "in_progress" status. However, the mock route doesn't return course names -- it just returns sync metadata.
   - What's unclear: Whether to actually call the API (which doesn't return course data) and use hardcoded course names, or skip the API call entirely and just simulate with setTimeout + hardcoded data.
   - Recommendation: Call the mock sync API for realism (validates hook wiring), but use hardcoded MOCK_COURSES for the course names display since the mock API doesn't provide them. This tests the real hook integration while delivering the expected UX.

2. **Auth layout restructuring: how much to change?**
   - What we know: Current (auth)/layout.tsx wraps everything in AuthGuard. Setup page needs opposite guard logic.
   - What's unclear: Whether to move guards entirely to page level, or use a conditional guard in layout.
   - Recommendation: Move guards to page level. Layout provides only visual scaffolding (Doodles, Switcher, Toaster). This is cleaner and more explicit. Auth page wraps its own AuthGuard, Setup page wraps its own SetupGuard. Minimal layout changes.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- All component files, hooks, store, routes read directly
  - `frontend/components/auth/AuthGuard.tsx` -- guard hydration pattern
  - `frontend/components/auth/AuthDoodles.tsx` -- full doodle implementation
  - `frontend/components/design-system/RoughCard.tsx` -- ResizeObserver burst pattern
  - `frontend/components/shared/AnimatedEntry.tsx` -- entrance animation
  - `frontend/components/auth/SuccessOverlay.tsx` -- Motion AnimatePresence usage
  - `frontend/components/auth/AuthPage.tsx` -- Motion variant patterns, navigation to /setup
  - `frontend/lib/auth/store.ts` -- zustand store with setTokenConfigured
  - `frontend/hooks/use-sync.ts` -- useSyncTrigger mutation
  - `frontend/hooks/use-user.ts` -- useConfigureToken, useVerifyToken
  - `frontend/app/[locale]/(auth)/layout.tsx` -- current layout with AuthGuard
  - `frontend/app/api/v1/sync/trigger/route.ts` -- mock sync endpoint
  - `frontend/app/api/v1/users/me/tokens/[platform]/route.ts` -- mock token endpoint

### Secondary (MEDIUM confidence)
- `04-CONTEXT.md` -- user decisions and constraints
- `04-UI-SPEC.md` -- visual contract (spacing, typography, color, interaction)
- `prototype/setup.html` -- HTML prototype (source of truth for visual implementation)
- `DESIGN_SYSTEM.md` -- reusable CSS patterns
- `.planning/STATE.md` -- accumulated decisions from prior phases

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already installed, no new packages needed
- Architecture: HIGH -- extends established Phase 3 patterns directly
- Pitfalls: HIGH -- based on direct codebase inspection and prior phase decisions in STATE.md
- Validation: HIGH -- test framework configured, patterns established in existing test files

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- no dependency changes expected)
