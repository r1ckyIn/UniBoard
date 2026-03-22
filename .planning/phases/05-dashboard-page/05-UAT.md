---
status: complete
phase: 05-dashboard-page
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md]
started: 2026-03-22T18:00:00Z
updated: 2026-03-23T08:58:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard Page Load
expected: Navigate to the dashboard (root "/" or "/en"). The page loads without errors. You see a greeting at the top, a date line with semester/week info, and an encouragement message. Below: stats row, course grades table, deadline timeline, assessment donut. Right panel: profile card, mini calendar, recent activity.
result: issue
reported: "鼓励语文字底部的 Rough Notation highlight 底涂效果在刷新后和页面完全加载后位置不一致，底涂没有严格跟随文字位置"
severity: cosmetic

### 2. Hero Section & Scroll Behavior
expected: The hero section shows a time-of-day greeting (morning/afternoon/evening) with your name. As you scroll down, the hero text fades out with a parallax effect. A scroll prompt ("your dashboard") is visible before scrolling.
result: issue
reported: "Hero 区域的手绘和底涂效果应该像 HTML 原型一样逐个出现（有延迟），当前实现是全部同时出现"
severity: cosmetic

### 3. Stats Row Cards
expected: Three stat cards appear below the hero: "Current WAM" (orange accent), "GPA Target" (blue accent), "Alerts" (amber accent). Each shows a number and subtitle. The numbers appear with Rough.js hand-drawn circle/underline annotations.
result: issue
reported: "85分显示的grade band是D，但USYD官方标准85应该是HD (High Distinction)。评分标准：HD 85-100, D 75-84, CR 65-74, P 50-64, F 0-49"
severity: major

### 4. Course Grades Table
expected: A table shows enrolled courses with columns: Course, Assessed, Earned, Target. Each course row has a hand-drawn Rough.js progress bar showing percentage assessed. A "predict →" link appears per course. A badge shows the current semester.
result: pass

### 5. Deadline Timeline with Cross-Card Interaction
expected: A vertical timeline shows upcoming deadlines with hand-drawn Rough.js line and colored dots (urgency-based: red for urgent, amber for soon, green for later). Clicking a deadline should switch the assessment donut chart to show that deadline's course assessment weights. The selected deadline should appear highlighted.
result: issue
reported: "Deadline Timeline 和 Assessment Weights 两张卡片大小不一致，应该等高"
severity: cosmetic

### 6. Assessment Donut Chart
expected: A donut chart shows assessment weights using Rough.js cross-hatch fill pattern. Segments have leader lines with labels (assessment name + weight%). When no deadline is selected, it shows the nearest deadline's course. An empty state message appears if no upcoming deadlines exist.
result: issue
reported: "Assessment Weights 甜甜圈图的设计和 HTML 原型不同，需要一比一还原。原型是平滑蓝色调渐变甜甜圈 + 细引导线 + 百分比标签，不是 Rough.js cross-hatch 填充"
severity: major

### 7. Mini Calendar
expected: Right panel shows a navigable mini calendar. Left/right arrows switch months. Days with deadlines show colored dots with depth based on weight (more weight = more opaque). Today is highlighted. Clicking a date navigates to the deadlines page.
result: pass

### 8. Profile Card
expected: Right panel shows a profile card with your initials in a gradient circle, your name, faculty/program info, semester, and two stats: course count and credit points.
result: issue
reported: "1) 应显示院校(如 Faculty of Science)而非专业(Computer Science)。2) 右侧边栏所有卡片不应有指针悬浮的起伏立体效果(hover elevation)"
severity: minor

### 9. Recent Activity Feed
expected: Right panel shows a "Recent Activity" list with color-coded icons (green for grade, blue for discussion, amber for deadline, purple for endorsed). Clicking an item with an external URL opens a confirmation dialog before navigating away.
result: issue
reported: "功能 pass，但确认对话框要在屏幕中心并且尽量扁平"
severity: cosmetic

### 10. External Link Dialog
expected: When clicking an external link in recent activity, a dialog appears asking "Open external link?" with the URL shown. Two buttons: "Open link" (navigates) and "Stay on UniBoard" (closes dialog). Pressing Escape also closes it.
result: skipped
reason: Covered by Test 9 feedback — dialog position and flatness issue recorded there

### 11. Notification Panel (Header)
expected: Clicking the bell icon in the header opens a dropdown showing recent notifications with icons by type, titles, bodies, and relative timestamps. Clicking outside the panel closes it.
result: issue
reported: "功能没问题，但通知面板滚动不够流畅"
severity: minor

### 12. Avatar Menu (Header)
expected: Clicking the avatar in the header opens a dropdown menu showing your name, email, and navigation items (Profile, Settings, API Tokens, Log out). Clicking outside closes it.
result: pass

### 13. Skeleton Loading States
expected: While data is loading (can test by throttling network in DevTools), dashboard sections show warm-toned skeleton shimmer placeholders instead of empty space. Each section has a distinct skeleton shape matching its content.
result: issue
reported: "Skeleton loading 状态全部是纯灰色只能看到组件底座，观感不好。右侧边栏应该固定位置不随页面滚动消失，滚动条应默认隐藏。需要参考其他 SaaS 产品最佳实践"
severity: major

### 14. i18n Language Switching
expected: Switch language to Chinese (if language switcher is available). Dashboard text changes to Chinese — greeting, stats labels, table headers, calendar labels, activity feed text. Switch back to English and everything returns to English.
result: issue
reported: "鼓励语没有切换成中文（仍显示英文）。另外头像菜单的悬停灰色高亮延迟太高，不跟手"
severity: major

## Summary

total: 14
passed: 4
issues: 10
pending: 0
skipped: 1
skipped: 0

## Gaps

- truth: "Rough Notation highlight annotation strictly follows text position on page load"
  status: failed
  reason: "User reported: 鼓励语文字底部的 Rough Notation highlight 底涂效果在刷新后和页面完全加载后位置不一致，底涂没有严格跟随文字位置"
  severity: cosmetic
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Hero section annotations appear one by one with staggered delays matching HTML prototype"
  status: failed
  reason: "User reported: Hero 区域的手绘和底涂效果应该逐个出现有延迟，当前全部同时出现"
  severity: cosmetic
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Deadline Timeline and Assessment Donut cards are equal height"
  status: failed
  reason: "User reported: 两张卡片大小不一致，应该等高"
  severity: cosmetic
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Assessment Donut matches HTML prototype pixel-perfectly — smooth blue-tone gradient donut with leader lines"
  status: failed
  reason: "User reported: 甜甜圈图设计和 HTML 原型不同，需要一比一还原。原型是平滑蓝色调渐变甜甜圈，不是 Rough.js cross-hatch"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Grade band calculation uses correct USYD grading scale (HD 85-100, D 75-84, CR 65-74, P 50-64, F 0-49)"
  status: failed
  reason: "User reported: 85分显示D，但USYD标准85是HD (High Distinction)"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Profile card shows faculty (e.g. Faculty of Science) not major; right panel cards have no hover elevation effect"
  status: failed
  reason: "User reported: 应显示院校(Faculty of Science)而非专业(Computer Science)；右侧边栏卡片不应有悬浮起伏立体效果"
  severity: minor
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "External link confirmation dialog is centered on screen and has a flat/minimal design"
  status: failed
  reason: "User reported: 确认对话框要在屏幕中心并且尽量扁平"
  severity: cosmetic
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Notification panel scrolling is smooth and fluid"
  status: failed
  reason: "User reported: 通知面板滚动不够流畅"
  severity: minor
  test: 11
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Encouragement text switches to Chinese when locale is zh"
  status: failed
  reason: "User reported: 鼓励语在切换到中文后仍显示英文"
  severity: major
  test: 14
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Avatar menu hover highlight is instant with no perceptible delay"
  status: failed
  reason: "User reported: 头像菜单悬停灰色高亮延迟太高，不跟手"
  severity: minor
  test: 14
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Skeleton loading states use warm-toned shimmer with distinct section shapes; right sidebar stays fixed on scroll with hidden scrollbar"
  status: failed
  reason: "User reported: Skeleton 全部纯灰只能看到组件底座观感不好，右侧边栏应固定位置不随页面滚动消失，滚动条默认隐藏，需参考 SaaS 最佳实践"
  severity: major
  test: 13
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
