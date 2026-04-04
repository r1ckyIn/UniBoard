---
phase: 27-frontend-ux-fixes-and-course-materials-preview
verified: 2026-04-04T11:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 27: Frontend UX Fixes & Course Materials Preview Verification Report

**Phase Goal:** Dashboard and timetable interactions work correctly; course materials have inline preview capability
**Verified:** 2026-04-04T11:00:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking a grade activity item navigates in-app to /courses/{courseId} | VERIFIED | `RecentActivity.tsx` L60-61: `if (item.internalPath) router.push(item.internalPath)`. `map-to-activity.ts` L44-46: grade type sets `internalPath = n.action_url`. Test confirms `mockPush` called with `/courses/crs_comp2017`. |
| 2 | Clicking a deadline activity item navigates in-app to /deadlines | VERIFIED | `map-to-activity.ts` L47-49: `n.type === "deadline_reminder"` sets `internalPath = "/deadlines"`. Test confirms result.internalPath === "/deadlines". |
| 3 | Clicking a discussion/endorsed activity item opens ExternalLinkDialog with external URL | VERIFIED | `map-to-activity.ts` L53-55: external URLs (startsWith "http") set `externalUrl`. `RecentActivity.tsx` L62-64: `else if (item.externalUrl) setDialogUrl(item.externalUrl)`. Test confirms `HTMLDialogElement.prototype.showModal` called. |
| 4 | Activity items with internal paths do NOT open ExternalLinkDialog | VERIFIED | `RecentActivity.tsx` L60-61: `if (item.internalPath)` branch uses `router.push`, never reaches `setDialogUrl`. Test confirms `mockPush` called (not showModal) for grade item with internalPath. |
| 5 | Predict button on course cards already navigates correctly (no change needed) | VERIFIED | Plan 01 explicitly documents UX-02 as confirmed working. No changes made, verified by absence of modifications to predict-related files. |
| 6 | Timetable events for courses with attendance/participation show solid left border | VERIFIED | `TimetableEvent.tsx` L59: `borderLeft: \`3px ${hasAttendance ? 'solid' : 'dashed'} ${color.base}\``. Test confirms `eventDiv.style.borderLeft` contains "solid" when `hasAttendance={true}`. |
| 7 | Timetable events for courses without attendance/participation show dashed left border | VERIFIED | Same ternary as above. Test confirms "dashed" for `hasAttendance={false}` and `hasAttendance={undefined}`. |
| 8 | Timetable upcoming deadlines section shows gradient fade when items overflow | VERIFIED | `TimetableUpcomingDeadlines.tsx` L136-144: renders `data-testid="scroll-indicator"` div with `linear-gradient(transparent, rgba(246,245,240,0.95))` when `canScrollDown` is true. Test confirms indicator appears when scrollHeight > clientHeight. |
| 9 | Gradient fade disappears when user scrolls to bottom | VERIFIED | `TimetableUpcomingDeadlines.tsx` L43-46: `checkScroll` sets `canScrollDown` to false when `scrollTop + clientHeight >= scrollHeight - threshold`. Test confirms indicator hidden when content does not overflow. |
| 10 | Clicking a material item opens a slide-out panel with iframe | VERIFIED | `MaterialItem.tsx` L47: `onClick={url && onPreview ? () => onPreview(url, title) : undefined}`. `MaterialsSection.tsx` L84: passes `onPreview={onPreview}`. `CourseDetailPage.tsx` L70-71: `handlePreview` sets `previewMaterial` state. L218-222: renders `<MaterialViewerPanel url={previewMaterial?.url ?? null}>`. `MaterialViewerPanel.tsx` L80-86: renders `<iframe src={url}>` with sandbox. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/lib/notifications/map-to-activity.ts` | ActivityItem type with internalPath field; URL classification logic | VERIFIED | L12: `internalPath?: string` in interface. L40-56: type-based URL classification with grade/deadline/discussion/endorsed routing. |
| `frontend/components/dashboard/RecentActivity.tsx` | Per-type click handler routing via router.push and ExternalLinkDialog | VERIFIED | L5: `import { useRouter }`. L55: `const router = useRouter()`. L58-66: `handleItemClick` accepts `ActivityItem`, routes `internalPath` to `router.push`, `externalUrl` to `setDialogUrl`. |
| `frontend/__tests__/dashboard/RecentActivity.test.tsx` | Tests for per-type navigation routing | VERIFIED | 11 tests (6 unit + 5 component). Zero `.todo()` stubs. Covers grade->push, deadline->push, discussion->ExternalLinkDialog, endorsed->externalUrl, internal/external URL classification. |
| `frontend/components/timetable/TimetableEvent.tsx` | Event block with solid/dashed border based on hasAttendance prop | VERIFIED | L12: `hasAttendance?: boolean` in interface. L59: ternary `hasAttendance ? 'solid' : 'dashed'` in borderLeft style. |
| `frontend/components/timetable/TimetableGrid.tsx` | Passes hasAttendance boolean to TimetableEvent | VERIFIED | L28: `attendanceCourses?: Set<string>` in interface. L267: `hasAttendance={attendanceCourses?.has(s.course_code)}`. |
| `frontend/components/timetable/TimetablePage.tsx` | Computes attendanceCourses Set from course detail data | VERIFIED | L6: `useQueries` imported. L63-67: `useQueries` fetches course details. L72-85: `attendanceCourses` useMemo checks `assessment_weights` for "attendance"/"participation". L365: passes `attendanceCourses={attendanceCourses}` to TimetableGrid. |
| `frontend/components/timetable/TimetableUpcomingDeadlines.tsx` | Scroll overflow gradient indicator | VERIFIED | L36: `useRef<HTMLDivElement>(null)`. L37: `useState(false)` for canScrollDown. L49-60: scroll event listener with `{ passive: true }` + ResizeObserver. L136-144: gradient overlay div with `data-testid="scroll-indicator"`. |
| `frontend/__tests__/timetable/TimetableEvent.test.tsx` | Tests for solid/dashed border logic | VERIFIED | 4 tests: solid (hasAttendance=true), dashed (false), dashed (undefined default), text rendering. |
| `frontend/__tests__/timetable/TimetableUpcomingDeadlines.test.tsx` | Tests for scroll indicator visibility | VERIFIED | 4 tests: rendering, overflow detection, non-overflow hidden, gradient attributes. |
| `frontend/components/course-detail/MaterialViewerPanel.tsx` | Slide-out panel with iframe embed | VERIFIED | L7: `url: string \| null` prop. L43: `translate-x-0`/`translate-x-full` toggle. L42: `transition-transform duration-300`. L80-86: `<iframe src={url} sandbox="allow-same-origin allow-scripts allow-popups">`. L68-71: Close button with `aria-label="Close"`. L31-35: Escape key listener. L58-65: "Open in new tab" link with `target="_blank"`. |
| `frontend/components/course-detail/MaterialItem.tsx` | Click handler calling onPreview callback | VERIFIED | L17: `onPreview?: (url: string, title: string) => void`. L47: `onClick={url && onPreview ? () => onPreview(url, title) : undefined}`. |
| `frontend/components/course-detail/MaterialsSection.tsx` | Passes onPreview callback to MaterialItem | VERIFIED | L15: `onPreview?: (url: string, title: string) => void` in interface. L84: `onPreview={onPreview}` passed to MaterialItem. |
| `frontend/components/course-detail/CourseDetailPage.tsx` | Manages previewMaterial state, renders MaterialViewerPanel | VERIFIED | L24: `import MaterialViewerPanel`. L65-68: `useState<{ url: string; title: string } \| null>(null)`. L70-71: `handlePreview`. L74-76: `handleClosePreview`. L177: `onPreview={handlePreview}` to MaterialsSection. L218-222: `<MaterialViewerPanel>` rendered as Fragment sibling. |
| `frontend/__tests__/course-detail/MaterialViewerPanel.test.tsx` | Tests for panel open/close, iframe src, Escape key | VERIFIED | 8 tests: title rendering, iframe src, translate-x-full hidden, translate-x-0 visible, close button click, Escape key, sandbox attribute, open-in-new-tab link. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| RecentActivity.tsx | router.push() | handleItemClick checks internalPath vs externalUrl | WIRED | L60: `if (item.internalPath)` -> L61: `router.push(item.internalPath)`. L62-64: `else if (item.externalUrl)` -> `setDialogUrl(item.externalUrl)`. Pattern `item.internalPath.*router.push` confirmed. |
| map-to-activity.ts | RecentActivity.tsx | ActivityItem interface with internalPath and externalUrl fields | WIRED | `ActivityItem` type imported at RecentActivity.tsx L16. `internalPath` and `externalUrl` fields used in handleItemClick logic and rendering conditions. |
| TimetablePage.tsx | TimetableGrid.tsx | attendanceCourses Set prop | WIRED | L365: `attendanceCourses={attendanceCourses}` passed to TimetableGrid. |
| TimetableGrid.tsx | TimetableEvent.tsx | hasAttendance boolean prop derived from attendanceCourses.has(course_code) | WIRED | L267: `hasAttendance={attendanceCourses?.has(s.course_code)}` on TimetableEvent. |
| CourseDetailPage.tsx | MaterialViewerPanel.tsx | previewMaterial state controls panel visibility | WIRED | L218-222: `<MaterialViewerPanel url={previewMaterial?.url ?? null} title={previewMaterial?.title ?? ""} onClose={handleClosePreview} />`. Pattern `previewMaterial.*MaterialViewerPanel` confirmed. |
| MaterialItem.tsx | CourseDetailPage.tsx | onPreview callback lifts click event to page state | WIRED | MaterialItem L47 calls `onPreview(url, title)`. MaterialsSection L84 passes `onPreview={onPreview}`. CourseDetailPage L177 passes `onPreview={handlePreview}` which calls `setPreviewMaterial`. Full callback chain confirmed. |
| MaterialViewerPanel.tsx | iframe | url prop sets iframe src | WIRED | L80-86: `<iframe src={url}>` renders when url is non-null. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| TimetablePage.tsx | attendanceCourses | useQueries -> courseOptions.detail -> assessment_weights | Yes -- queries backend course detail API for each enrolled course | FLOWING |
| RecentActivity.tsx | activities (prop) | mapNotificationToActivity from parent | Yes -- transforms notification data with internalPath/externalUrl classification | FLOWING |
| MaterialViewerPanel.tsx | url (prop) | CourseDetailPage previewMaterial state from MaterialItem click | Yes -- material URL flows from API fixture/backend through materials query | FLOWING |
| TimetableUpcomingDeadlines.tsx | deadlines (prop) | TimetablePage -> useDeadlines hook | Yes -- deadline data from backend API | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED (requires running Next.js dev server for frontend components -- no runnable entry points without server startup)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| UX-01 | 27-01-PLAN | Dashboard reminder cards are functional (clicking navigates to relevant page or triggers action) | SATISFIED | Grade/deadline items use router.push for in-app navigation; discussion/endorsed with external URLs open ExternalLinkDialog. 11 tests confirm routing. |
| UX-02 | 27-01-PLAN | Dashboard course card predict button navigates to Predict page with corresponding course pre-selected/expanded | SATISFIED | Plan 01 confirmed this already works -- no changes needed. Documented in plan objective and success criteria. |
| UX-03 | 27-02-PLAN | Timetable lecture/tutorial blocks visually match Allocate+ layout style (color-coded, time/location visible, solid/dashed borders) | SATISFIED | TimetableEvent uses hasAttendance ternary for solid/dashed border. attendanceCourses computed from assessment_weights group_name. 4 tests confirm border style. |
| UX-04 | 27-02-PLAN | Timetable page shows scroll indicator when deadline items overflow the visible area | SATISFIED | TimetableUpcomingDeadlines has canScrollDown state with scroll listener + ResizeObserver. Gradient div rendered conditionally. 4 tests confirm indicator behavior. |
| FEAT-01 | 27-03-PLAN | Course detail page has inline material preview (mini-window viewer) | SATISFIED | MaterialViewerPanel component with iframe, slide animation (CSS translate transition), close button, Escape key, Open-in-new-tab fallback. Wired through MaterialItem -> MaterialsSection -> CourseDetailPage state. 8 tests confirm panel behavior. |

No orphaned requirements found. All 5 requirement IDs (UX-01, UX-02, UX-03, UX-04, FEAT-01) from REQUIREMENTS.md mapped to Phase 27 are claimed and satisfied by plans 27-01, 27-02, and 27-03.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| frontend/__tests__/dashboard/RecentActivity.test.tsx | 50 | `return null` | Info | Benign -- mock DynamicMock fallback for unresolved SSR component. Not a stub. |
| frontend/components/timetable/TimetablePage.tsx | 141, 190 | `return []` | Info | Benign -- legitimate empty returns for break weeks (no sessions) and "all" mode (no per-week deadline overlay). Business logic, not stubs. |

No TODO/FIXME/HACK/PLACEHOLDER comments found in any modified file.
No `.todo()` test stubs found in any test file.
No hardcoded empty data flowing to rendering found.

### Human Verification Required

### 1. Dashboard Activity Click Navigation

**Test:** Click a grade-type activity card on the Dashboard page
**Expected:** Browser navigates to /courses/{courseId} without showing ExternalLinkDialog
**Why human:** Requires running application to verify actual navigation behavior and dialog absence

### 2. Timetable Solid/Dashed Border Visual

**Test:** View timetable page with courses that have "Attendance" or "Participation" in their assessment weights
**Expected:** Those course events have solid left border; other courses have dashed left border
**Why human:** Visual distinction between 3px solid vs 3px dashed is subtle and needs visual confirmation

### 3. Timetable Deadline Scroll Gradient

**Test:** View timetable with 6+ upcoming deadlines in the right panel
**Expected:** Bottom gradient fade appears when items overflow; disappears when scrolled to bottom
**Why human:** Gradient fade effect and scroll behavior require visual confirmation in running app

### 4. Course Materials Inline Preview

**Test:** Navigate to Course Detail page, click a material item that has a URL
**Expected:** Right-side panel slides in with iframe showing the material; close button and Escape key dismiss it; "Open in new tab" link opens in new browser tab
**Why human:** Slide animation, iframe rendering, and cross-origin content loading need visual verification

### Gaps Summary

No gaps found. All 10 observable truths are verified at all levels (exists, substantive, wired, data-flowing). All 14 required artifacts exist and contain expected patterns. All 7 key links are wired. All 5 requirement IDs (UX-01 through UX-04 and FEAT-01) are satisfied. No blocker or warning anti-patterns detected. 27 tests across 4 test files cover the phase's functionality.

---

_Verified: 2026-04-04T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
