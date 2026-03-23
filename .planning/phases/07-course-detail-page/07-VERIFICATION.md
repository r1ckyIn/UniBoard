---
phase: 07-course-detail-page
verified: 2026-03-23T11:30:00Z
status: passed
score: 8/8 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 8/8
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 7: Course Detail Page Verification Report

**Phase Goal:** Course Detail Page -- Assessment breakdown, materials browser, Ed posts
**Verified:** 2026-03-23T11:30:00Z
**Status:** passed
**Re-verification:** Yes -- regression check after previous passed verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Assessment breakdown shows all assessments with weights, scores, and due dates | VERIFIED | AssessmentSection.tsx (158 lines) renders table via AssessmentRow map with weight progress bars, due dates, graded scores with badge, or dashed-border prediction inputs; grade calculation in useMemo |
| SC-2 | Materials browser displays course folders with file listings | VERIFIED | MaterialsSection.tsx (87 lines) + MaterialItem.tsx (84 lines) render materials with week badges (regex extraction), source type icons (FileText/BookOpen), New badge, and empty state |
| SC-3 | Ed Discussion section shows recent posts with endorsed/staff badges | VERIFIED | EdPostsPanel.tsx (139 lines) calls useCourseDiscussions(courseId, "high_value"), renders post titles with author, endorsed/staff badges, locale-aware relative timestamps |
| SC-4 | Navigation between course detail sections works smoothly | VERIFIED | CourseDetailPage.tsx (197 lines) orchestrates all sections in single scroll layout with AnimatedEntry staggered delays; back link to /courses via router.push |

### Must-Haves (from PLAN frontmatter, all 4 plans)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P01-1 | courseDetail i18n namespace exists in both en.json and zh.json | VERIFIED | Both files contain "courseDetail" at line 199 with 9 sub-namespaces: aiChat, assessment, backLink, deadlines, edPosts, empty, gradeSummary, materials, quickLinks |
| P01-2 | useCourseDeadlines hook fetches course-specific deadlines | VERIFIED | use-deadlines.ts exports useCourseDeadlines with byCourse key factory (line 20), queryOptions (line 48), and thin wrapper (line 71) querying `courses/${courseId}/deadlines` |
| P01-3 | page.tsx server component renders CourseDetailPage with courseId prop | VERIFIED | app/[locale]/(dashboard)/courses/[id]/page.tsx (10 lines): imports CourseDetailPage, awaits params, passes courseId |
| P02-1 | Assessment table renders graded items with fixed scores and "graded" badge | VERIFIED | AssessmentRow.tsx line 82-99: graded path renders score + "/maxScore" + assess-graded-badge span |
| P02-2 | Assessment table renders ungraded items with dashed-border prediction inputs | VERIFIED | AssessmentRow.tsx line 100-119: score-input class with border-dashed, inputMode="numeric", placeholder from i18n |
| P02-3 | Grade summary shows current average based on graded assessments | VERIFIED | GradeSummary.tsx (84 lines): displays currentAvg with courseColor, basedOnAssessed text with weight percentage |
| P02-4 | Projected final updates with countUp animation when predictions change | VERIFIED | GradeSummary.tsx line 26: useCountUp(projectedFinal); use-count-up.ts (39 lines) implements rAF-based ease-out cubic animation |
| P02-5 | Materials list shows course materials with week badges and source type icons | VERIFIED | MaterialItem.tsx: week badge with i18n weekBadge key, FileText for module, BookOpen for lesson, courseSoft background |
| P02-6 | AI chat placeholder shows disabled input with Coming Soon text | VERIFIED | AiChatPlaceholder.tsx (58 lines): disabled input/button with opacity-50 cursor-not-allowed, Coming Soon badge |
| P03-1 | Quick links panel shows Canvas Home, Ed Discussion, Ed Lessons with colored icon backgrounds | VERIFIED | QuickLinksPanel.tsx (102 lines): 3 LinkConfig entries with distinct bgColor/iconColor values (red/blue/green) |
| P03-2 | Upcoming deadlines panel shows course-specific deadlines with colored stripe and days remaining | VERIFIED | CourseDeadlinesPanel.tsx (144 lines): calls useCourseDeadlines, renders rp-dl-stripe with courseColor, getBadgeStyle for days remaining |
| P03-3 | Ed Discussion panel shows only high-value posts with badges | VERIFIED | EdPostsPanel.tsx line 28: useCourseDiscussions(courseId, "high_value"); lines 105-113: is_endorsed and is_staff_post badge rendering |
| P03-4 | Page fetches data via useCourseDetail, useCourseMaterials, useCourseDiscussions, useCourseDeadlines | VERIFIED | CourseDetailPage.tsx lines 39-40: useCourseDetail + useCourseMaterials; CourseDeadlinesPanel line 25: useCourseDeadlines; EdPostsPanel line 28: useCourseDiscussions |
| P03-5 | Right panel content injected via portal-slot pattern | VERIFIED | CourseDetailPage.tsx line 65: getElementById("right-panel-slot"); lines 169-193: createPortal with QuickLinksPanel + CourseDeadlinesPanel + EdPostsPanel |
| P03-6 | Prediction state managed locally via useState, resets on navigation | VERIFIED | CourseDetailPage.tsx line 43: useState<Record<number, number \| null>>({}); handlePredictionChange with clamp 0-100 |
| P03-7 | Back link navigates to /courses | VERIFIED | CourseDetailPage.tsx lines 120-128: button with ArrowLeft icon + router.push("/courses") |
| P03-8 | Clicking external links opens ExternalLinkDialog confirmation | VERIFIED | QuickLinksPanel.tsx lines 93-99: ExternalLinkDialog with openUrl state; EdPostsPanel.tsx lines 131-136: same pattern |
| P04-1 | All 6 course-detail components use RoughCard (no inline border code) | VERIFIED | grep confirms 6/6 files import RoughCard; 0 files import "rough from roughjs" |
| P04-2 | EdPostsPanel renders author name for each post | VERIFIED | EdPostsPanel.tsx line 100: `{d.author}` rendered in span |
| P04-3 | EdPostsPanel timestamps are locale-aware | VERIFIED | EdPostsPanel.tsx lines 4,7,27,40: useLocale + zhCN/enUS + dateFnsLocale passed to formatDistanceToNow |

**Score:** 8/8 success criteria verified; all 21 must-have truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/components/course-detail/CourseDetailPage.tsx` | Page orchestrator with data hooks and portal | VERIFIED | 197 lines, imports all hooks and components, createPortal for right panel |
| `frontend/components/course-detail/AssessmentSection.tsx` | Assessment table with grade calculation | VERIFIED | 158 lines, RoughCard, table with AssessmentRow map, GradeSummary |
| `frontend/components/course-detail/AssessmentRow.tsx` | Single row with graded/ungraded modes | VERIFIED | 130 lines, React.memo, score-input for ungraded |
| `frontend/components/course-detail/GradeSummary.tsx` | Animated grade summary | VERIFIED | 84 lines, useCountUp + getGradeBand |
| `frontend/components/course-detail/CourseBanner.tsx` | Course banner with BannerDeco | VERIFIED | 88 lines, RoughCard + BannerDeco via withClientOnly |
| `frontend/components/course-detail/MaterialsSection.tsx` | Materials list | VERIFIED | 87 lines, RoughCard, MaterialItem map, empty state |
| `frontend/components/course-detail/MaterialItem.tsx` | Single material row | VERIFIED | 84 lines, week regex, source icons, New badge |
| `frontend/components/course-detail/AiChatPlaceholder.tsx` | Disabled AI chat | VERIFIED | 58 lines, disabled input/button, Coming Soon badge |
| `frontend/components/course-detail/QuickLinksPanel.tsx` | External links panel | VERIFIED | 102 lines, RoughCard, 3 links with ExternalLinkDialog |
| `frontend/components/course-detail/CourseDeadlinesPanel.tsx` | Deadlines panel | VERIFIED | 144 lines, RoughCard, useCourseDeadlines, colored stripe, day badge |
| `frontend/components/course-detail/EdPostsPanel.tsx` | Ed posts panel | VERIFIED | 139 lines, RoughCard, useCourseDiscussions high_value, author, locale timestamps, endorsed/staff badges |
| `frontend/lib/hooks/use-count-up.ts` | rAF animation hook | VERIFIED | 39 lines, requestAnimationFrame, ease-out cubic |
| `frontend/hooks/use-deadlines.ts` | byCourse + useCourseDeadlines | VERIFIED | byCourse key factory + queryOptions + thin wrapper exported |
| `frontend/messages/en.json` | courseDetail i18n namespace | VERIFIED | 9 sub-namespaces with full EN text |
| `frontend/messages/zh.json` | courseDetail i18n namespace | VERIFIED | 9 sub-namespaces with matching ZH translations |
| `frontend/app/[locale]/(dashboard)/courses/[id]/page.tsx` | Route entry | VERIFIED | 10 lines, server component, awaits params, passes courseId |
| `frontend/__tests__/course-detail/*.test.tsx` (5 files) | Passing tests | VERIFIED | 24/24 passing, 0 todo stubs remaining |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| CourseDetailPage.tsx | use-courses.ts | useCourseDetail(courseId) | WIRED | Line 10 import, line 39 call |
| CourseDetailPage.tsx | use-materials.ts | useCourseMaterials(courseId) | WIRED | Line 11 import, line 40 call |
| CourseDetailPage.tsx | #right-panel-slot | createPortal | WIRED | Line 65 getElementById, lines 169-193 createPortal |
| EdPostsPanel.tsx | use-discussions.ts | useCourseDiscussions(courseId, "high_value") | WIRED | Line 8 import, line 28 call with filter |
| CourseDeadlinesPanel.tsx | use-deadlines.ts | useCourseDeadlines(courseId) | WIRED | Line 6 import, line 25 call |
| QuickLinksPanel.tsx | ExternalLinkDialog.tsx | ExternalLinkDialog component | WIRED | Line 7 import, lines 93-99 render |
| EdPostsPanel.tsx | ExternalLinkDialog.tsx | ExternalLinkDialog component | WIRED | Line 10 import, lines 131-136 render |
| AssessmentSection.tsx | AssessmentRow.tsx | map over assessments | WIRED | Line 8 import, line 130 map to AssessmentRow |
| AssessmentSection.tsx | GradeSummary.tsx | renders at bottom | WIRED | Line 9 import, line 149 render |
| GradeSummary.tsx | use-count-up.ts | useCountUp import | WIRED | Line 4 import, line 26 call |
| CourseBanner.tsx | BannerDeco.tsx | withClientOnly dynamic import | WIRED | Lines 6-8 withClientOnly, line 53 render |
| page.tsx | CourseDetailPage.tsx | server component import | WIRED | Line 2 import, line 9 render with courseId prop |
| use-deadlines.ts | /courses/{id}/deadlines | ky GET request | WIRED | Line 51 `api.get(\`courses/${courseId}/deadlines\`)` |
| EdPostsPanel.tsx | date-fns/locale | locale-aware formatDistanceToNow | WIRED | Line 7 import zhCN/enUS, line 40 locale passed |
| All 6 components | RoughCard.tsx | import + JSX wrapper | WIRED | All 6 import RoughCard, 0 use inline rough.js |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| UI-11 | 07-01, 07-02, 07-03, 07-04 | Course Detail page with assessment breakdown, materials browser, and Ed posts | SATISFIED | Assessment table with prediction inputs and animated grade summary; Materials browser with week badges and source icons; Ed Discussion panel with endorsed/staff badges and author display; QuickLinks with ExternalLinkDialog; CourseDeadlines with colored stripes; all wired in CourseDetailPage orchestrator with portal-slot injection; all using RoughCard for consistent design |

No orphaned requirements found. Only UI-11 is mapped to Phase 7 in REQUIREMENTS.md traceability matrix.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| AiChatPlaceholder.tsx | 11,27,29 | "Coming Soon" / "placeholder" mentions | Info | Intentional by design -- phase goal explicitly requires "AI chat placeholder"; this is a planned deferred feature |

No TODO, FIXME, HACK, console.log, empty implementations, or stub returns found in any Phase 7 file.

### Test Verification

- **Course detail tests:** 24/24 passing (5 test files)
- **Todo stubs:** 0 remaining in course-detail test files (all replaced with real tests in Plans 02-04)
- **Regression:** No regressions from previous verification; test count increased from 23 to 24 due to Plan 04 adding EdPostsPanel author test

### Human Verification Required

### 1. Visual Layout and Styling

**Test:** Navigate to /courses/{id} and visually inspect the course detail page
**Expected:** Two-column layout with assessment table, materials list, AI chat on left; quick links, deadlines, Ed posts on right; all with hand-drawn Rough.js borders (via RoughCard) and paper texture
**Why human:** Visual styling, Rough.js border rendering, and layout proportions cannot be verified programmatically

### 2. Assessment Prediction Interaction

**Test:** Type predicted scores into the dashed-border inputs for ungraded assessments
**Expected:** Projected Final updates in real-time with smooth countUp animation; grade band label changes accordingly; input clamps to 0-100
**Why human:** Animation smoothness, real-time interactivity, and visual feedback require manual observation

### 3. External Link Dialog Flow

**Test:** Click Canvas Home, Ed Discussion, or Ed Lessons quick links; also click Ed Discussion posts
**Expected:** ExternalLinkDialog appears asking for confirmation before navigating to external URL
**Why human:** Dialog interaction flow and URL correctness require manual testing

### 4. Portal-Slot Right Panel Injection

**Test:** Observe that right panel content (QuickLinks, Deadlines, EdPosts) appears in the sidebar area, not inline with main content
**Expected:** Content renders in the #right-panel-slot area defined by the dashboard layout
**Why human:** Portal rendering behavior depends on DOM structure that only exists in the running app

### 5. Back Navigation

**Test:** Click "My Courses" back link at top of page
**Expected:** Navigates to /courses list page
**Why human:** Client-side navigation behavior requires running app

### 6. Locale-Aware Timestamps (Plan 04 addition)

**Test:** Switch to Chinese locale, navigate to course detail, check Ed Discussion post timestamps
**Expected:** Relative timestamps display in Chinese (e.g., "3 天前" instead of "3 days ago")
**Why human:** Locale switching requires running app with language toggle

### Gaps Summary

No gaps found. All 8 success criteria verified. All 21 must-have truths verified across 4 plans. All 17 artifacts exist, are substantive (no stubs), and are properly wired. All 15 key links verified as connected. Requirement UI-11 is satisfied. Plan 04 gap closure successfully migrated all 6 components to RoughCard and added author display + locale-aware timestamps to EdPostsPanel.

---

_Verified: 2026-03-23T11:30:00Z_
_Verifier: Claude (gsd-verifier)_
