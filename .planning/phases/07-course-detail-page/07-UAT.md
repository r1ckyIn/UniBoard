---
status: complete
phase: 07-course-detail-page
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md]
started: 2026-03-23T08:15:00Z
updated: 2026-03-23T08:28:00Z
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
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "CourseDeadlinesPanel shows deadlines with colored stripe, day badge (e.g. in 3d), and hand-drawn border consistent with Dashboard right panel"
  status: failed
  reason: "User reported: 功能不对，和dashboard不一致，没有手绘元素没有天数标签"
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "EdPostsPanel shows high-value posts with endorsed/staff badges, author, and relative timestamp consistent with Dashboard right panel"
  status: failed
  reason: "User reported: 功能缺失，与dashboard右侧栏不一致，缺少endorsed/staff标签、作者、时间戳"
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
