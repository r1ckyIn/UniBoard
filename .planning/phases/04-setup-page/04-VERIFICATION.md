---
phase: 04-setup-page
verified: 2026-03-22T07:45:00Z
status: passed
score: 7/7 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 7/7
  gaps_closed:
    - "RoughCard two-layer structure for visible hand-drawn borders (UAT Test 2)"
    - "Canvas token regex accepts real {id}~{secret} format, XCircle clickable clear button (UAT Test 5)"
    - "SuccessStep shows course names, navigates to /, no hydration error (UAT Test 7)"
    - "Setup step persisted in URL ?step=N across language switches (UAT Test 9)"
  gaps_remaining: []
  regressions: []
---

# Phase 04: Setup Page Verification Report

**Phase Goal:** New users can complete API token onboarding in 3 guided steps
**Verified:** 2026-03-22T07:45:00Z
**Status:** PASSED
**Re-verification:** Yes -- after UAT gap closure (Plans 04-04 and 04-05)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 3-step flow is visually clear: register -> get tokens -> paste tokens | VERIFIED | SetupPage.tsx manages step state `useState<StepValue>` with `parseStep(searchParams.get("step"))` for persistence. Renders WelcomeStep (step 1), TutorialStep (step 2), TokenStep (step 3), SuccessStep (success). StepIndicator shows 3 circles with orange/green/border states. 8 SetupPage tests + 5 StepIndicator tests confirm flow. |
| 2 | Each step includes visual guides showing where to find Canvas/Ed tokens | VERIFIED | TutorialStep renders two GuideCard components (canvas + ed). Each GuideCard shows 5 numbered steps with icons, platform name, and i18n text. Canvas tutorial mentions 120-day token expiry. Ed tutorial mentions permanent tokens. GuideCards independently collapsible with chevron rotation. 5 GuideCard tests pass. |
| 3 | Token paste fields validate format before accepting | VERIFIED | `lib/validations/token.ts` validates Canvas tokens via `/^\d+~[A-Za-z0-9]{20,}$/` (accepts real `{id}~{secret}` format per UAT fix). Ed tokens via `/^[a-zA-Z0-9_-]{10,50}$/`. TokenStep performs sequential Canvas-first validation with 0.8s delay. Error messages reference correct format (`{number}~{alphanumeric}`). XCircle icon is a clickable `<button>` with `onClear` callback. 10 token-validation tests + 7 TokenStep tests pass. |
| 4 | Completion redirects to dashboard with success confirmation | VERIFIED | SuccessStep calls `useSyncTrigger.mutateAsync({scope:"all"})`, shows spinner for 3s, then displays 5 mock course names (COMP2017, COMP3221, STAT2011, INFO2222, MATH1005). `handleGoToDashboard` calls `toast.success`, `setTokenConfigured(true)`, then `router.push("/")` (correct route per UAT fix). |
| 5 | SetupGuard protects route: unauth -> /auth, configured -> /dashboard, valid -> render | VERIFIED | SetupGuard.tsx checks `isAuthenticated` and `tokenConfigured` from useAuthStore with zustand hydration pattern. Returns null during hydration (no flash). 4 SetupGuard tests cover all scenarios. |
| 6 | All text comes from i18n setup namespace (no hardcoded strings) | VERIFIED | All 6 setup components use `useTranslations("setup.{section}")`. en.json and zh.json both contain setup namespace with 4 sections (welcome, tutorial, tokens, success), identical key structure. i18n parity test passes. Error messages updated with correct Canvas format description. |
| 7 | UAT gap closures: RoughCard two-layer, step URL persistence, token fixes, SuccessStep fixes | VERIFIED | RoughCard uses outer `p-[10px] overflow-visible` + inner `bg-card-bg rounded-card`. SetupPage reads/writes `?step=N` via `useSearchParams` + `router.replace`. Canvas regex accepts `{id}~{secret}`. SuccessStep defers `setTokenConfigured` to click handler. `not-found.tsx` has no html/body wrapper. |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/lib/validations/token.ts` | Token format validation | VERIFIED | 17 lines, exports validateCanvasToken + validateEdToken, Canvas regex `/^\d+~[A-Za-z0-9]{20,}$/` |
| `frontend/components/setup/SetupGuard.tsx` | Route guard | VERIFIED | 38 lines, named export, zustand hydration pattern, 3 redirect scenarios |
| `frontend/components/setup/StepIndicator.tsx` | 3-circle step progress | VERIFIED | 59 lines, default export, 4 visual states, a11y attributes |
| `frontend/components/setup/WelcomeStep.tsx` | Step 1: logo + features + CTA | VERIFIED | 91 lines, default export, uses i18n, 3 feature badges with icons |
| `frontend/components/setup/TutorialStep.tsx` | Step 2: Canvas + Ed tutorials | VERIFIED | 48 lines, default export, renders 2 GuideCards |
| `frontend/components/setup/GuideCard.tsx` | Collapsible platform tutorial | VERIFIED | 107 lines, default export, collapse/expand, chevron rotation, a11y |
| `frontend/components/setup/TokenInput.tsx` | Token field with status + clear | VERIFIED | 94 lines, default export, idle/valid/invalid states, onClear as `<button>` |
| `frontend/components/setup/TokenStep.tsx` | Step 3: sequential validation | VERIFIED | 135 lines, default export, Canvas-first validation, 0.8s delay, onClear wired |
| `frontend/components/setup/SuccessStep.tsx` | Success: sync + dashboard CTA | VERIFIED | 93 lines, default export, setTokenConfigured in click handler, router.push("/") |
| `frontend/components/setup/SetupPage.tsx` | Step orchestrator with URL persistence | VERIFIED | 100 lines, default export, AnimatePresence, RoughCard, useSearchParams, setStepWithUrl |
| `frontend/app/[locale]/(auth)/setup/page.tsx` | Route entry | VERIFIED | 13 lines, SetupGuard + Suspense + SetupPage (no placeholder) |
| `frontend/app/[locale]/(auth)/layout.tsx` | Visual-only scaffolding | VERIFIED | 34 lines, AuthGuard removed, only AuthDoodles + LanguageSwitcher + Toaster |
| `frontend/app/[locale]/(auth)/auth/page.tsx` | Auth page with page-level guard | VERIFIED | 13 lines, AuthGuard wraps at page level |
| `frontend/messages/en.json` | English i18n with setup namespace | VERIFIED | setup key with welcome/tutorial/tokens/success, Canvas error mentions `{number}~{alphanumeric}` |
| `frontend/messages/zh.json` | Chinese i18n with setup namespace | VERIFIED | setup key with identical structure, Canvas error updated |
| `frontend/components/design-system/RoughCard.tsx` | Two-layer RoughCard | VERIFIED | 118 lines, outer p-[10px] overflow-visible + inner bg-card-bg, data-testid="rough-card-outer" |
| `frontend/app/not-found.tsx` | Content-only not-found | VERIFIED | 32 lines, no html/body wrapper, inline styles only |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| SetupGuard.tsx | lib/auth/store.ts | useAuthStore for isAuthenticated + tokenConfigured | WIRED | Line 5: import, Line 9: destructure |
| auth/page.tsx | AuthGuard.tsx | AuthGuard wrapping at page level | WIRED | Line 2: import, Line 7: `<AuthGuard>` wrapping |
| setup/page.tsx | SetupGuard.tsx | SetupGuard wrapping at page level | WIRED | Line 2: import, Line 7: `<SetupGuard>` wrapping |
| setup/page.tsx | SetupPage.tsx | SetupPage rendered in route | WIRED | Line 3: import, Line 9: `<SetupPage />` |
| WelcomeStep.tsx | messages/en.json | useTranslations('setup.welcome') | WIRED | Line 33: `useTranslations("setup.welcome")` |
| TutorialStep.tsx | GuideCard.tsx | Renders two GuideCard instances | WIRED | Lines 25/26: `<GuideCard platform="canvas">`, `<GuideCard platform="ed">` |
| GuideCard.tsx | messages/en.json | useTranslations('setup.tutorial') | WIRED | Line 29: `useTranslations("setup.tutorial")` |
| TokenStep.tsx | lib/validations/token.ts | validateCanvasToken + validateEdToken | WIRED | Lines 7-10: import, Lines 37/49: called in handleValidate |
| TokenStep.tsx | TokenInput.tsx | onClear prop wiring | WIRED | Lines 88/99: `onClear={() => {...}}` passed to both TokenInputs |
| SuccessStep.tsx | hooks/use-sync.ts | useSyncTrigger for mock sync | WIRED | Line 9: import, Line 22: `useSyncTrigger()`, Line 28: `.mutateAsync()` |
| SuccessStep.tsx | lib/auth/store.ts | setTokenConfigured in click handler | WIRED | Line 8: import, Line 43: `useAuthStore.getState().setTokenConfigured(true)` inside handleGoToDashboard |
| SetupPage.tsx | StepIndicator.tsx | StepIndicator receives currentStep | WIRED | Line 9: import, Line 57: `<StepIndicator currentStep={step} />` |
| SetupPage.tsx | RoughCard.tsx | RoughCard with disableHover | WIRED | Line 7: import, Lines 62-64: `<RoughCard disableHover={true}>` |
| SetupPage.tsx | URL search params | useSearchParams + router.replace | WIRED | Line 4: useSearchParams import, Line 37: `searchParams.get("step")`, Line 49: `router.replace(...)` |
| RoughCard.tsx | rough.js SVG | Outer wrapper with padding gap | WIRED | Line 98: `p-[10px]` on outer, SVG at line 104-107, inner bg at line 109-112 |
| (auth)/layout.tsx | AuthGuard.tsx | AuthGuard REMOVED from layout | WIRED | AuthGuard not imported or used -- confirmed absent |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| UI-10 | 04-01, 04-02, 04-03, 04-04, 04-05 | Setup page with 3-step API token onboarding flow | SATISFIED | Complete 3-step flow: Welcome -> Tutorial -> Token -> Success. 10+ components, 20 test files (136 tests), all passing. UAT gaps closed: Canvas regex, clear button, course display, step persistence, RoughCard border. |
| PLAT-01 | 04-01, 04-02, 04-03, 04-04 | User can complete registration and API token connection in 3 steps with visual guides | SATISFIED | Visual guides (GuideCard with numbered steps for Canvas and Ed), token format validation accepting real Canvas format, sequential validation with visual feedback, sync simulation, dashboard redirect to `/`. |

No orphaned requirements found. REQUIREMENTS.md maps UI-10 and PLAT-01 to Phase 4 -- both claimed and satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| SuccessStep.tsx | 30 | `.catch(() => {})` | Info | Fire-and-forget mock sync call; acceptable for mock layer |
| SetupGuard.tsx | 34, 36 | `return null` | Info | Intentional guard logic preventing flash-of-content |

No TODO/FIXME/PLACEHOLDER comments, no empty implementations, no console.log debugging, no stub returns.

### Human Verification Required

### 1. RoughCard Hand-Drawn Border Visibility (UAT Re-test)

**Test:** Open browser, navigate to /en/setup. Inspect the card wrapping the setup content.
**Expected:** The rough.js hand-drawn border should be visibly sketchy/wobbly with a 10px gap between the border and the card background, matching the prototype's hand-drawn aesthetic.
**Why human:** Visual rendering of rough.js SVG borders requires visual confirmation. The two-layer structure is verified in code but the aesthetic quality needs human judgment.

### 2. Step URL Persistence Across Language Switch (UAT Re-test)

**Test:** Navigate to step 2 or 3, then switch language (EN -> ZH or vice versa).
**Expected:** The current step is preserved after language switch. URL should contain `?step=2` or `?step=3`.
**Why human:** Full client-side navigation with next-intl locale switching needs browser testing.

### 3. Token Clear Button Functionality (UAT Re-test)

**Test:** Enter an invalid Canvas token, click "Validate & Connect", then click the X icon next to the input.
**Expected:** The X icon is clickable (cursor changes to pointer), clicking it clears the input field and resets the validation state to idle.
**Why human:** Interactive behavior with click events needs browser verification.

### 4. SuccessStep Course Names Display (UAT Re-test)

**Test:** Complete the 3-step flow with valid tokens. Wait for 3-second sync animation.
**Expected:** After spinner completes, 5 course names appear (COMP2017, COMP3221, STAT2011, INFO2222, MATH1005), then "Go to Dashboard" button appears. Clicking it shows a success toast and navigates to `/`.
**Why human:** Timer-based state transitions and route navigation need browser testing.

### Gaps Summary

No gaps found. All 7 observable truths verified. All 17 artifacts exist, are substantive (no stubs), and are properly wired. All 16 key links confirmed connected. Both requirement IDs (UI-10, PLAT-01) are satisfied. Full test suite (136 tests across 20 files) passes. TypeScript compiles cleanly. No blocker anti-patterns detected.

The 4 UAT gaps from the previous round have all been addressed:
1. **RoughCard border** -- Restructured to two-layer approach with 10px padding gap (Plan 04-05)
2. **Canvas token regex + clear button** -- Regex updated to `{id}~{secret}`, XCircle is clickable button (Plan 04-04)
3. **SuccessStep routing + courses** -- `setTokenConfigured` deferred to click handler, route changed to `/`, not-found.tsx fixed (Plan 04-04)
4. **Step persistence** -- Step stored in URL `?step=N` via useSearchParams + router.replace (Plan 04-05)

Human re-verification of these 4 fixes is recommended to confirm the UAT issues are fully resolved in the browser.

---

_Verified: 2026-03-22T07:45:00Z_
_Verifier: Claude (gsd-verifier)_
