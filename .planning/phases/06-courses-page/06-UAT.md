---
status: complete
phase: 06-courses-page
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md]
started: 2026-03-23T03:30:00Z
updated: 2026-03-23T03:30:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: complete
name: All tests done
awaiting: none

## Tests

### 1. Courses page loads with course cards
expected: Navigate to http://localhost:3001/en/courses. Page shows "My Courses" heading with BookOpen icon, a semester badge, and a filter badge showing "{N} Published". Below, course cards display in a grid layout.
result: issue
reported: "右侧面板留白（没有右侧内容但占了宽度），卡片布局与原型不符：评级徽章需要靠右，进度条和百分比文字位置需要互换"
severity: major

### 2. Course card visual: colored banner with Rough.js decoration
expected: Each card has a colored banner (top section ~120px). Banner background color differs per course (orange for COMP2017, etc.). Inside each banner, a subtle white hand-drawn SVG deco pattern (circles, waves, stars, dots, or zigzag) is visible. Course code and name appear as white text overlaid on the banner.
result: pass

### 3. Grade display with band badge
expected: Below the banner, each card shows "Grade:" label followed by the grade percentage in bold (e.g. "82.5%") colored with the course's accent color. Next to the percentage, a small colored badge shows the grade band (e.g. "HD 85+", "D 75+"). For MATH1005 (null grade), an em-dash "—" displays in gray with no badge.
result: pass

### 4. Progress bar and assessed percentage
expected: Each card shows a hand-drawn progress bar (Rough.js style) indicating assessed weight. Next to it, a label like "40% assessed" appears. The bar fill color matches the course accent color.
result: pass

### 5. Card hover lift animation
expected: Hovering over a course card causes it to lift upward by ~3px with a smooth transition (~0.28s). The hand-drawn Rough.js border around the card is visible (thin gray wobbly rectangle).
result: pass

### 6. Responsive grid breakpoints
expected: At wide viewport (>1400px), cards show in 3 columns. Resize to ~1000px: 2 columns. Resize to ~800px: 1 column. Grid adjusts smoothly.
result: pass

### 7. Chinese locale
expected: Navigate to http://localhost:5173/zh/courses. Heading shows "我的课程". Grade label shows "成绩：". Filter badge shows "{N} 门已发布". Semester label shows "学期：".
result: pass

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Courses page uses full width without right panel whitespace; card layout matches prototype (badge right-aligned, progress text before bar)"
  status: resolved
  reason: "User reported: right panel whitespace + card layout mismatch. Fixed in commit 937f955"
  severity: major
  test: 1
  artifacts:
    - path: "frontend/components/layout/RightPanel.tsx"
      issue: "Panel did not auto-collapse when slot empty"
    - path: "frontend/components/courses/CourseCard.tsx"
      issue: "Badge not right-aligned, progress row order wrong"
  missing: []
