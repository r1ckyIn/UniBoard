---
phase: 03-frontend-dashboard
plan: 03
subsystem: ui
tags: [react, nextjs, zustand, tanstack-query, gpa-simulator, what-if, digest, settings, token-management]

# Dependency graph
requires:
  - phase: 03-frontend-dashboard/03-01
    provides: "Design system components, API client, types, auth hooks, layout shell, utilities"
provides:
  - "Predict page with real-time What-if GPA simulator (client-side WAM calculation)"
  - "Zustand predictor store for hypothetical score state management"
  - "Target path calculator (minimum scores to reach target WAM)"
  - "Scenario save, load, and compare functionality"
  - "Digest page with rule-based daily card feed (grades, deadlines, posts)"
  - "Settings page with token management, GPA target, course linking, profile"
  - "usePredict hooks (useWhatIfScenarios, useSaveWhatIf, useTargetPath)"
  - "11 automated tests for predict store and WAM calculation logic"
affects: [04-intelligence-skills-mcp]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand store for client-side prediction state (no API round-trips per slider change)"
    - "Client-side WAM calculation using calculateCourseWAM + calculateWAM from gpa.ts"
    - "Date-based aggregation for digest cards using useMemo with memoized date range"
    - "Token status badges with tri-state (active/invalid/not_configured)"

key-files:
  created:
    - frontend/lib/stores/predictor.ts
    - frontend/lib/hooks/usePredict.ts
    - frontend/components/predict/ScenarioBuilder.tsx
    - frontend/components/predict/AssessmentSlider.tsx
    - frontend/components/predict/TargetPath.tsx
    - frontend/components/predict/ScenarioList.tsx
    - frontend/app/[locale]/(dashboard)/predict/page.tsx
    - frontend/components/digest/DigestCard.tsx
    - frontend/components/digest/DigestFeed.tsx
    - frontend/app/[locale]/(dashboard)/digest/page.tsx
    - frontend/components/settings/TokenManager.tsx
    - frontend/components/settings/GPATargetSetting.tsx
    - frontend/components/settings/CourseLinking.tsx
    - frontend/components/settings/UserProfile.tsx
    - frontend/app/[locale]/(dashboard)/settings/page.tsx
    - frontend/__tests__/predict/ScenarioBuilder.test.tsx
  modified: []

key-decisions:
  - "Zustand store for predictor state: enables real-time WAM updates without API calls per slider change"
  - "Memoized date range in DigestFeed to avoid re-renders from new Date() on every render cycle"
  - "CourseLinking simplified: shows synced courses with auto-linked status, manual linking deferred"
  - "Password change UI disabled with 'coming soon' note (backend endpoint not yet available)"
  - "Digest is Phase 3 rule-engine version with chronological aggregation (AI scoring deferred to Phase 4)"

patterns-established:
  - "Zustand store pattern: create() with getState() for computed helpers (getOverridesAsArray)"
  - "loadScenario action: populate store from saved scenario API response"
  - "TokenManager per-platform section pattern: shared PlatformSection component"
  - "DigestDay aggregation: Map-based grouping by date with filter for non-empty days"

requirements-completed: [UI-04, UI-05, UI-06]

# Metrics
duration: 23min
completed: 2026-03-17
---

# Phase 3 Plan 03: Predict, Digest, and Settings Pages Summary

**Slider-based What-if GPA simulator with Zustand store for real-time client-side WAM calculation, rule-based daily digest feed, and settings page with token management and GPA target persistence**

## Performance

- **Duration:** 23 min
- **Started:** 2026-03-16T22:25:31Z
- **Completed:** 2026-03-16T22:49:00Z
- **Tasks:** 2
- **Files created:** 16

## Accomplishments
- Predict page with per-assessment sliders that update WAM in real-time without API round-trips
- Target path calculator showing minimum required scores per ungraded assessment
- Scenario management (save, load, compare side-by-side) via Zustand store + API
- Digest page aggregating grades, deadlines, and Ed posts into daily cards
- Settings page with Canvas/Ed token management (status badges, update forms, sync controls)
- GPA target setting with grade band preview and API persistence
- 11 automated tests covering predictor store operations and WAM calculation logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Predict page with What-if simulator, target path, scenario management, and tests** - `611fa5e` (feat)
2. **Task 2: Digest page and Settings page with token management, GPA target, profile** - `f2f3248` (feat)

## Files Created
- `frontend/lib/stores/predictor.ts` - Zustand store for hypothetical score overrides and scenario names
- `frontend/lib/hooks/usePredict.ts` - TanStack Query hooks for What-if scenarios and target path
- `frontend/components/predict/AssessmentSlider.tsx` - Range slider + number input per assessment (graded = locked)
- `frontend/components/predict/ScenarioBuilder.tsx` - Main simulator with expandable course sections and client-side WAM
- `frontend/components/predict/TargetPath.tsx` - Target WAM calculator with achievability badge and score table
- `frontend/components/predict/ScenarioList.tsx` - Saved scenarios with load-into-store and comparison view
- `frontend/app/[locale]/(dashboard)/predict/page.tsx` - Predict page assembling all predict components
- `frontend/components/digest/DigestCard.tsx` - Daily card with grades/deadlines/posts sections
- `frontend/components/digest/DigestFeed.tsx` - Client-side date aggregation into chronological feed
- `frontend/app/[locale]/(dashboard)/digest/page.tsx` - Digest page with feed and header
- `frontend/components/settings/TokenManager.tsx` - Canvas/Ed token status, update forms, sync button
- `frontend/components/settings/GPATargetSetting.tsx` - WAM target input with grade band preview
- `frontend/components/settings/CourseLinking.tsx` - Synced courses table (manual linking deferred)
- `frontend/components/settings/UserProfile.tsx` - Display name, email (read-only), password (disabled)
- `frontend/app/[locale]/(dashboard)/settings/page.tsx` - Settings page with 4 sections
- `frontend/__tests__/predict/ScenarioBuilder.test.tsx` - 11 tests for store ops and WAM calculation

## Decisions Made
- **Zustand store for predictor state** -- enables instant WAM feedback without network latency per slider change
- **Memoized date range in DigestFeed** -- prevents React hooks exhaustive-deps warnings and avoids unnecessary re-renders
- **CourseLinking simplified** -- backend manual linking API not available in Phase 2, shows current auto-linked courses
- **Password change UI disabled** -- backend endpoint not yet available, UI placeholder with "coming soon"
- **Digest is rule-engine version** -- chronological aggregation only, AI-enhanced urgency scoring deferred to Phase 4

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ESLint warning for unused `creditPoints` prop in CourseSection**
- **Found during:** Task 1 (ScenarioBuilder)
- **Issue:** `creditPoints` prop was declared but not used in CourseSection component
- **Fix:** Removed unused prop from interface and JSX usage
- **Files modified:** frontend/components/predict/ScenarioBuilder.tsx
- **Verification:** `pnpm build` passes with no warnings
- **Committed in:** 611fa5e (Task 1 commit)

**2. [Rule 1 - Bug] Fixed React hooks exhaustive-deps warning for `now` in DigestFeed**
- **Found during:** Task 2 (DigestFeed)
- **Issue:** `new Date()` created inside component body caused useMemo dependencies to change every render
- **Fix:** Memoized date computations (fromDate, toDate, today) in their own useMemo
- **Files modified:** frontend/components/digest/DigestFeed.tsx
- **Verification:** `pnpm build` passes with no warnings
- **Committed in:** f2f3248 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both were lint/correctness fixes. No scope creep.

## Issues Encountered
- Parallel 03-02 execution caused `.next` directory file system race conditions during builds. Resolved by retrying builds after brief delays. Not a code issue -- infrastructure artifact of parallel Next.js builds sharing the same `.next` output directory.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 dashboard pages now complete (Dashboard, Timetable, Courses, Deadlines, Predict, Digest, Settings)
- Phase 3 frontend dashboard is feature-complete pending 03-02 final commit
- Ready for Phase 4: Intelligence, Skills & MCP (AI-enhanced digest, risk alerts, MCP server)
- Predict page's Zustand store pattern can be extended for Phase 4 AI predictions

## Self-Check: PASSED

All 17 files verified present. Both task commits (611fa5e, f2f3248) verified in git log. TypeScript check passes (`tsc --noEmit`). All 11 predict tests pass. Build succeeds (24 static pages generated).

---
*Phase: 03-frontend-dashboard*
*Completed: 2026-03-17*
