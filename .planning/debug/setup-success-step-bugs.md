---
status: diagnosed
trigger: "Three issues with SuccessStep: mock courses not displayed, dashboard route 404, hydration error from not-found.tsx"
created: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:10:00Z
---

## Current Focus

hypothesis: All three root causes confirmed
test: Code tracing
expecting: N/A - diagnosis complete
next_action: Report findings

## Symptoms

expected: 1) Course names appear after sync completes. 2) "Go to Dashboard" navigates to working route. 3) No hydration errors.
actual: 1) Course names never shown. 2) /en/dashboard is 404. 3) Hydration mismatch from duplicate html tag.
errors: 404 on /en/dashboard, hydration mismatch SSR/client
reproduction: Visit setup page, complete token step, observe SuccessStep
started: Since Phase 04 implementation

## Eliminated

## Evidence

- timestamp: 2026-03-22T00:05:00Z
  checked: SuccessStep.tsx setTimeout (lines 32-36) + SetupGuard.tsx (lines 28-29, 36)
  found: "setTokenConfigured(true)" is called in the SAME setTimeout callback as setCourseNames/setSyncStatus. SetupGuard subscribes to tokenConfigured and returns null when it's true (line 36). So the moment tokenConfigured flips to true, SetupGuard unmounts SuccessStep before the user can see courses or the CTA button.
  implication: ROOT CAUSE for Bug 1. setTokenConfigured must be deferred to handleGoToDashboard.

- timestamp: 2026-03-22T00:06:00Z
  checked: SuccessStep.tsx line 44 + route structure
  found: router.push("/dashboard") navigates to /dashboard. next-intl middleware redirects this to /en/dashboard. But the dashboard page is at app/[locale]/(dashboard)/page.tsx — the (dashboard) is a route GROUP (no URL segment). The actual URL is /en, NOT /en/dashboard.
  implication: ROOT CAUSE for Bug 2. Must use "/" instead of "/dashboard".

- timestamp: 2026-03-22T00:07:00Z
  checked: app/not-found.tsx + app/layout.tsx
  found: not-found.tsx renders its own <html> and <body>. app/layout.tsx ALSO renders <html> and <body>. Next.js wraps not-found inside root layout, producing nested <html><body><html><body>. This is an SSR/client hydration mismatch.
  implication: ROOT CAUSE for Bug 3. not-found.tsx must not include <html>/<body>.

## Resolution

root_cause: See three root causes in Evidence section
fix: See report below
verification:
files_changed: []
