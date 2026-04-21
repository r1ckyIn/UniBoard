---
id: SEED-001
status: dormant
planted: 2026-04-21
planted_during: v3.0 / Phase 38 afterwork (Dependabot cleanup)
trigger_when: frontend refactor phase, or React 19 major cleanup, or lint-health audit
scope: Medium
---

# SEED-001: react-hooks v7 strict-rule cleanup

## Why This Matters

`eslint-plugin-react-hooks` v7 (pulled in by `eslint-config-next@16` via PR #42)
adds three strict rules that surface pre-existing idioms across 13 files:

- **`react-hooks/set-state-in-effect`** (16 error sites across 13 files)
  — setState inside useEffect without proper guards, can cause cascading
  re-renders. Found in: `AuthGuard`, `SetupGuard`, `DashboardGuard`, `UsydBanner`,
  `CourseDetailPage`, `DashboardPage`, `DeadlineAiChat`, `DigestPage`,
  `PredictPage`, `NotificationsSection`, `SettingsPage`, `TimetablePage`.

- **`react-hooks/refs`** (1 error site)
  — `hooks/use-ai-stream.ts:37` writes `messagesRef.current = messages` during
  render. Idiomatic React 19 replaces this with a setState callback or
  useEffect.

- **`react-hooks/incompatible-library`** (2 warning sites)
  — Auth forms (`RegisterForm`, `UpdatePasswordForm`) use `react-hook-form`'s
  `watch()` which React Compiler cannot memoise safely. Migrate to `useWatch`
  for compiler-friendly reads.

These are **best-practice warnings**, not functional bugs — current code works
in production. But leaving them disabled weakens future React 19 concurrent
rendering guarantees and bypasses React Compiler optimisations.

## When to Surface

**Trigger:** frontend refactor phase, React 19 cleanup initiative, or
lint-health audit milestone.

This seed should be presented during `/gsd-new-milestone` when the milestone
scope mentions any of:
- frontend tech-debt / refactor
- React 19 migration
- React Compiler adoption
- performance / concurrent rendering
- lint-health / code-quality audit

## Scope Estimate

**Medium** — ~1 phase (3-5 plans):

- **Plan 1:** Guard components (AuthGuard/SetupGuard/DashboardGuard) — lift
  hydration + auth checks out of useEffect. Likely use `useSyncExternalStore`
  or derived state from Supabase session.
- **Plan 2:** Page init effects (Dashboard/Predict/Timetable/Settings/Digest)
  — replace setState-in-effect with derived state via `useMemo` or move side
  effects to event handlers.
- **Plan 3:** use-ai-stream ref trick — rework to use `setMessages`
  functional-update callback instead of ref-in-render.
- **Plan 4:** Auth forms — migrate `watch("password")` to `useWatch({ control, name: "password" })`
  for React Compiler compatibility.
- **Plan 5:** Flip the 3 rules back on in `frontend/eslint.config.mjs`,
  remove the TODO block, verify `pnpm lint --max-warnings 0` clean.

## Breadcrumbs

**Rules disabled at:**
- `frontend/eslint.config.mjs` lines 18-24 (TODO block explaining each rule)

**Files with `react-hooks/set-state-in-effect` errors:**
- `components/auth/AuthGuard.tsx:22`
- `components/auth/UsydBanner.tsx:27`
- `components/course-detail/CourseDetailPage.tsx:81`
- `components/dashboard/DashboardPage.tsx:75`
- `components/deadlines/DeadlineAiChat.tsx:48`
- `components/digest/DigestPage.tsx:71`
- `components/layout/DashboardGuard.tsx:22`
- `components/predict/PredictPage.tsx:118, 232, 248`
- `components/settings/NotificationsSection.tsx:40`
- `components/settings/SettingsPage.tsx:61`
- `components/setup/SetupGuard.tsx:21`
- `components/timetable/TimetablePage.tsx:97, 103`

**Files with `react-hooks/refs` error:**
- `hooks/use-ai-stream.ts:37` (`messagesRef.current = messages` in render)

**Files with `react-hooks/incompatible-library` warnings:**
- `components/auth/RegisterForm.tsx:50` (`watch("password")`)
- `components/auth/UpdatePasswordForm.tsx:48` (`watch("password")`)

## Notes

Seed planted while merging PR #42 (eslint-config-next 15→16). Disabling the
rules was the pragmatic choice to keep the major upgrade moving without
destabilising Phase 38-verified code. The 18 violations are genuine
modernisation opportunities — they represent the drift between our early-M1
code (2026-03) and React 19 / React Compiler idioms.

Done-when marker: `grep -E '"react-hooks/(set-state-in-effect|refs|incompatible-library)": "off"' frontend/eslint.config.mjs` returns no matches.
