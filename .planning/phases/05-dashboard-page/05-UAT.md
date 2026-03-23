---
status: resolved
phase: 05-dashboard-page
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md, 05-07-SUMMARY.md, 05-08-SUMMARY.md, 05-09-SUMMARY.md, 05-10-SUMMARY.md]
started: 2026-03-23T09:30:00Z
updated: 2026-03-23T11:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard Page Load & Hero Section
expected: Page loads without errors. Hero shows greeting, date, encouragement with Rough Notation highlight aligned to text. Annotations appear sequentially with staggered delays (not simultaneously).
result: issue
reported: "中文应该显示周一而不是Monday；应该圈出'第四周'而不是圈'week4'"
severity: major

### 2. Stats Row & Grade Band
expected: Three stat cards: "Current WAM" (orange), "GPA Target" (blue), "Alerts" (amber). WAM of 85 shows "HD" badge (not "D"). Numbers have Rough.js annotations.
result: pass

### 3. Course Grades Table
expected: Table shows courses with Course, Assessed, Earned, Target columns. Rough.js progress bars. "predict" link per course. Semester badge visible.
result: issue
reported: "目标列标题居中但下方的等级徽章（D/CR/P/HD）左对齐，没有对齐"
severity: cosmetic

### 4. Deadline Timeline & Assessment Donut (Equal Height)
expected: Timeline with Rough.js line and colored dots. Donut chart matches HTML prototype: smooth blue-tone gradient annular ring with fine leader lines and percentage labels (NOT Rough.js cross-hatch). Both cards are equal height.
result: issue
reported: "仍然是 Rough.js cross-hatch 而非平滑 SVG（重写没生效）；移除动画；颜色按作业类型区分（quiz=蓝、exam=棕、assignment=绿）+ 右下角图例"
severity: major

### 5. Deadline-Donut Cross-Card Interaction
expected: Clicking a deadline switches the donut to show that course's assessment weights. Selected deadline appears highlighted.
result: issue
reported: "移除动画；选中截止日期后对应扇区弹出突显；始终保持 Rough.js 手绘风格"
severity: major

### 6. Right Panel — Profile Card
expected: Shows initials in gradient circle, your name, faculty info (e.g. "Faculty of Science" NOT "Computer Science"), semester, course count, credit points. No hover elevation effect.
result: pass

### 7. Right Panel — Mini Calendar & Recent Activity
expected: Mini calendar with month navigation, deadline dots, today highlighted. Recent activity with color-coded icons. No hover elevation. Right sidebar stays fixed on scroll.
result: pass

### 8. External Link Dialog
expected: Clicking external link in activity shows confirmation dialog. Centered on screen, flat/minimal design. "Open link" and "Stay on UniBoard" buttons. Escape closes it.
result: pass

### 9. Notification Panel
expected: Bell icon opens dropdown with notifications. Scrolling is smooth and fluid. Clicking outside closes it.
result: pass

### 10. Avatar Menu
expected: Clicking avatar opens dropdown with name, email, nav items. Hover highlight is instant. Clicking outside closes it.
result: pass

### 11. Skeleton Loading States
expected: Throttle network in DevTools. Skeleton placeholders show warm-toned shimmer (not plain gray). Each section has distinct skeleton shape. Scrollbar hidden by default.
result: pass

### 12. i18n Language Switching
expected: Switch to Chinese. ALL dashboard text changes to Chinese including encouragement, stats labels, table headers, calendar labels. Switch back — everything returns.
result: pass

### 13. Scroll Behavior
expected: Hero text fades with parallax on scroll. Right sidebar stays fixed (sticky). Scroll prompt visible before scrolling.
result: issue
reported: "右侧边栏还是随着页面滚动消失上移，sticky 未生效"
severity: major

## Summary

total: 13
passed: 8
issues: 5
pending: 0
skipped: 0

## Gaps

- truth: "Hero section date line shows localized day name (周一 not Monday) and circles '第四周' not 'week4'"
  status: resolved
  reason: "User reported: 中文应该显示周一而不是Monday；应该圈出'第四周'而不是圈'week4'"
  severity: major
  test: 1
  root_cause: "HeroSection.tsx line 69: format(new Date(), 'EEEE') called without locale param → always English weekday. Lines 166-179: hardcoded 'Week 4' string instead of using translated week number from t() function."
  artifacts:
    - path: "frontend/components/dashboard/HeroSection.tsx"
      issue: "Missing date-fns locale import; hardcoded English week text"
  missing:
    - "Import useLocale from next-intl, zhCN/enUS from date-fns/locale"
    - "Pass locale to format() for weekday"
    - "Replace hardcoded 'Week 4' with localized week number from translation"

- truth: "Course grades table Target column header and grade badges are aligned"
  status: resolved
  reason: "User reported: 目标列标题居中但下方的等级徽章（D/CR/P/HD）左对齐，没有对齐"
  severity: cosmetic
  test: 3
  root_cause: "CourseGradesTable.tsx: header uses text-center but cell td uses text-right + justify-end, causing misalignment with variable-width badges."
  artifacts:
    - path: "frontend/components/dashboard/CourseGradesTable.tsx"
      issue: "Cell alignment mismatch: text-right + justify-end vs header text-center"
  missing:
    - "Change cell td from text-right to text-center"
    - "Change inner div from justify-end to justify-center"

- truth: "Assessment Donut uses Rough.js hand-drawn style with type-based colors (quiz=blue, exam=brown, assignment=green), legend in bottom-right, no animation"
  status: resolved
  reason: "User reported: 保持 Rough.js 手绘风格但颜色按作业类型区分（quiz=蓝、exam=棕、assignment=绿）+ 右下角图例；移除动画"
  severity: major
  test: 4
  root_cause: "AssessmentDonut.tsx uses course-based color palette instead of type-based. No legend component. Animation logic (800ms converge) still present."
  artifacts:
    - path: "frontend/components/dashboard/AssessmentDonut.tsx"
      issue: "Colors based on course not assessment type; missing legend; animation present"
  missing:
    - "Add type-based color mapping (quiz=blue, exam=brown, assignment=green)"
    - "Add group_name to AssessmentWeight interface"
    - "Add legend component in bottom-right"
    - "Remove animation logic (rAF, animateFrame)"

- truth: "Clicking deadline pops out corresponding donut segment; no animation; always Rough.js hand-drawn style"
  status: resolved
  reason: "User reported: 移除动画；选中截止日期后对应扇区弹出突显；始终保持 Rough.js 手绘风格"
  severity: major
  test: 5
  root_cause: "Highlight only thickens stroke (strokeWidth 1→2) instead of pushing segment outward. Animation still runs on mount."
  artifacts:
    - path: "frontend/components/dashboard/AssessmentDonut.tsx"
      issue: "Highlight is stroke-only, not pop-out; animation still present"
  missing:
    - "Push highlighted segment 6px outward along midpoint angle"
    - "Remove converge animation, render segments immediately"

- truth: "Right sidebar stays fixed (sticky) on scroll, does not scroll away with page content"
  status: resolved
  reason: "User reported: 右侧边栏还是随着页面滚动消失上移，sticky 未生效"
  severity: major
  test: 13
  root_cause: "RightPanel.tsx has overflow-y-auto which conflicts with sticky positioning. Parent <main> in AppShell.tsx lacks overflow-y-auto and height constraint, so there's no proper scrollable ancestor for sticky to work against."
  artifacts:
    - path: "frontend/components/layout/RightPanel.tsx"
      issue: "overflow-y-auto conflicts with sticky; self-start redundant"
    - path: "frontend/components/layout/AppShell.tsx"
      issue: "main lacks overflow-y-auto and max-h constraint"
  missing:
    - "Make main the scrollable container with overflow-y-auto and max-h-[calc(100vh-header)]"
    - "Remove overflow-y-auto from RightPanel"
    - "Remove self-start from RightPanel"
