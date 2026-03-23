---
status: diagnosed
phase: 07-course-detail-page
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md]
started: 2026-03-23T08:15:00Z
updated: 2026-03-23T08:35:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Navigate to Course Detail Page
expected: From the Courses page, click any course card. Browser navigates to /courses/{id}. Page loads without errors showing the course banner at top with course code, name, semester badge, and credit points.
result: pass

### 2. Assessment Table — Graded Items
expected: Assessment section shows a table with columns: Assessment, Weight, Due, Score. Graded items display the actual score (e.g. "85 /100") with a colored "Graded" badge. Weight column shows a small progress bar with percentage.
result: pass

### 3. Assessment Table — Prediction Input
expected: Ungraded assessment rows show a dashed-border input field instead of a score. Typing a number (e.g. "75") into the field accepts the value. The input has a "?" placeholder and "/{maxScore}" suffix.
result: pass

### 4. Grade Summary with Animation
expected: Below the assessment table, a GradeSummary bar shows "Current Average" (based on graded items only). When ALL prediction inputs are filled, a "Projected Final" value appears with a smooth count-up animation from 0 to the calculated percentage.
result: pass

### 5. Materials Section
expected: Materials card shows a list of course materials. Each item has a week badge (e.g. "W3"), a source icon (book for Canvas module, graduation cap for Ed lesson), title, and item/slide count. The most recent Ed lesson shows a "New" badge. Header shows total week count.
result: pass

### 6. AI Chat Placeholder
expected: Below materials, an AI chat section appears with a disabled text input, a grayed-out send button, and a "Coming Soon" badge. The input is non-functional (cannot type).
result: pass

### 7. Quick Links Panel (Right Panel)
expected: In the right sidebar, a QuickLinksPanel card shows 3 external links: Canvas, Ed Discussion, Ed Lessons. Each has a colored icon. Clicking a link opens an ExternalLinkDialog confirmation modal (not direct navigation).
result: pass

### 8. Course Deadlines Panel (Right Panel)
expected: Below QuickLinks, a CourseDeadlinesPanel shows upcoming deadlines for this course only. Each deadline has a colored left stripe (matching course color), name, formatted date, and a day badge (e.g. "in 3d").
result: issue
reported: "功能不对，和dashboard不一致，没有手绘元素没有天数标签"
severity: major

### 9. Ed Posts Panel (Right Panel)
expected: Below deadlines, an EdPostsPanel shows high-value discussion posts. Posts with staff answers show a "Staff" badge. Endorsed posts show an "Endorsed" badge. Each post shows title, author, and relative timestamp.
result: issue
reported: "功能缺失，与dashboard右侧栏不一致，缺少endorsed/staff标签、作者、时间戳"
severity: major

### 10. i18n — Chinese Locale
expected: Switch to Chinese locale (via language toggle or URL). All course detail text renders in Chinese — assessment column headers, section titles, badges, empty states, and button labels.
result: pass

### 11. Back Navigation
expected: Click the back arrow link at the top of the page. Browser navigates back to the courses list page (/courses).
result: pass

## Summary

total: 11
passed: 9
issues: 5
pending: 0
skipped: 0

## Gaps

- truth: "CourseDeadlinesPanel shows deadlines with hand-drawn border consistent with Dashboard right panel"
  status: failed
  reason: "User reported: 功能不对，和dashboard不一致，没有手绘元素没有天数标签"
  severity: major
  test: 8
  root_cause: "Inline Rough.js border code instead of shared RoughCard component. Missing burst-rAF animation smoothing, hover elevation, design tokens (bg-card-bg). Dashboard's DeadlineTimeline uses <RoughCard> wrapper."
  artifacts:
    - path: "frontend/components/course-detail/CourseDeadlinesPanel.tsx"
      issue: "Inline drawBorder/SVG/ResizeObserver duplicates RoughCard with degraded quality"
  missing:
    - "Replace inline border code with <RoughCard> wrapper (same as DeadlineTimeline.tsx line 136)"
  debug_session: ".planning/debug/course-deadlines-panel-gaps.md"

- truth: "EdPostsPanel shows high-value posts with author info and locale-aware timestamps consistent with Dashboard right panel"
  status: failed
  reason: "User reported: 功能缺失，与dashboard右侧栏不一致，缺少endorsed/staff标签、作者、时间戳"
  severity: major
  test: 9
  root_cause: "Plan-level omission: d.author never rendered in JSX despite data being available in API schema and mock fixtures. formatDistanceToNow called without locale option (always English). Endorsed/staff badges ARE present but at very small size (.58rem)."
  artifacts:
    - path: "frontend/components/course-detail/EdPostsPanel.tsx"
      issue: "Missing d.author render; formatDistanceToNow without locale"
  missing:
    - "Add d.author display between title and badges"
    - "Import useLocale + date-fns locales, pass locale to formatDistanceToNow (ref: NotificationPanel.tsx pattern)"
    - "Increase badge font size for better visibility"
  debug_session: ".planning/debug/edpostspanel-missing-features.md"

- truth: "CourseBanner hand-drawn border aligns with content border"
  status: failed
  reason: "User reported: 主内容区的头部展示课程代号和全称的卡片的手绘边框和真实边框没有对齐"
  severity: major
  test: post-UAT
  root_cause: "Inline Rough.js border drawing with hardcoded viewBox offset produces misalignment vs inner content div"
  artifacts:
    - path: "frontend/components/course-detail/CourseBanner.tsx"
      issue: "Inline drawBorder misaligned with content boundary"
  missing:
    - "Replace inline border with RoughCard wrapper for consistent alignment"
  debug_session: ""

- truth: "Right sidebar components match Dashboard design with complete borders (no clipping)"
  status: failed
  reason: "User reported: 右侧边栏所有组件不符合dashboard设计，右边框缺失，风格不一致"
  severity: major
  test: post-UAT
  root_cause: "Right panel container or overflow setting clips the Rough.js SVG border overflow (-4px viewBox extension). All 3 sidebar panels use inline border code instead of RoughCard."
  artifacts:
    - path: "frontend/components/course-detail/QuickLinksPanel.tsx"
      issue: "Right border clipped; inline border instead of RoughCard"
    - path: "frontend/components/course-detail/CourseDeadlinesPanel.tsx"
      issue: "Right border clipped; inline border instead of RoughCard"
    - path: "frontend/components/course-detail/EdPostsPanel.tsx"
      issue: "Right border clipped; inline border instead of RoughCard"
  missing:
    - "Replace inline borders with RoughCard in all 3 sidebar panels"
    - "Fix right panel container overflow to allow SVG border overshoot"
  debug_session: ""

- truth: "All main content cards have aligned borders (CourseBanner, AssessmentSection, MaterialsSection)"
  status: failed
  reason: "User reported: 主内容区所有卡片的边框需要对齐，头部卡片和assessment卡片边框没有对齐"
  severity: major
  test: post-UAT
  root_cause: "Each component implements its own inline Rough.js border with potentially different padding/offset. Using shared RoughCard would enforce consistent outer padding and viewBox."
  artifacts:
    - path: "frontend/components/course-detail/CourseBanner.tsx"
      issue: "Inline border with different effective width than AssessmentSection"
    - path: "frontend/components/course-detail/AssessmentSection.tsx"
      issue: "Inline border with different effective width than CourseBanner"
  missing:
    - "Replace all inline borders with RoughCard for uniform alignment"
  debug_session: ""
