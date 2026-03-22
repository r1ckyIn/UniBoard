---
status: diagnosed
trigger: "Investigate why switching language (EN/ZH) on UniBoard's setup page resets the step state back to step 1"
created: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Language switch causes full locale-based route navigation, remounting SetupPage and resetting useState(1)
test: Traced full chain: LanguageSwitcher -> router.replace(path, {locale}) -> Next.js [locale] segment changes -> page remounts -> useState resets
expecting: N/A - root cause confirmed
next_action: Report diagnosis

## Symptoms

expected: Switching language should preserve the current step in the setup flow
actual: Switching language resets step state back to step 1
errors: No error messages - just state reset
reproduction: Navigate to setup page, advance to step 2+, switch language
started: Unknown

## Eliminated

## Evidence

- timestamp: 2026-03-22T00:01:00Z
  checked: SetupPage.tsx step state management
  found: Step state is managed by `useState<1 | 2 | 3 | "success">(1)` on line 21 - pure React local state with initial value 1, no persistence mechanism
  implication: Any remount of SetupPage will reset step to 1

- timestamp: 2026-03-22T00:02:00Z
  checked: LanguageSwitcher.tsx locale switching mechanism
  found: Uses `router.replace(fullPath, { locale: nextLocale })` (line 22) from next-intl navigation. This performs a route navigation that changes the `[locale]` dynamic segment.
  implication: Changing locale segment from /en/setup to /zh/setup (or vice versa) triggers a full page-level re-render in Next.js App Router

- timestamp: 2026-03-22T00:03:00Z
  checked: App Router route structure and i18n config
  found: Route is `app/[locale]/(auth)/setup/page.tsx`. The `[locale]` is a dynamic route segment. next-intl middleware rewrites `/setup` to `/en/setup` or `/zh/setup`. Routing config uses prefix-based locale strategy (defineRouting with locales ["en","zh"]).
  implication: When router.replace changes locale, Next.js sees a different [locale] param value, which causes the entire page component tree under [locale] to unmount and remount (new route segment = new component instance)

- timestamp: 2026-03-22T00:04:00Z
  checked: Whether any external state management exists for step
  found: No zustand, no URL query param, no sessionStorage, no context provider - step is purely local useState
  implication: The step value has nowhere to survive a component remount

## Resolution

root_cause: LanguageSwitcher calls `router.replace(path, { locale: nextLocale })` which changes the `[locale]` dynamic segment in the Next.js App Router route (`/en/setup` -> `/zh/setup`). This causes the entire page component tree to unmount and remount because Next.js treats different dynamic segment values as different routes. SetupPage's step state is managed solely by `useState(1)` with no persistence, so it resets to 1 on remount.
fix:
verification:
files_changed: []
