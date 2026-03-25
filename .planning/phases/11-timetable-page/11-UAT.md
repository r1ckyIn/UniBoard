---
status: complete
phase: 11-timetable-page
source: [11-01-SUMMARY.md, 11-02-SUMMARY.md, 11-03-SUMMARY.md]
started: 2026-03-25T15:50:00Z
updated: 2026-03-25T16:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Timetable Page Loads at /timetable
expected: Navigate to /en/timetable. Page loads with a title row showing "Timetable" heading with calendar icon, "2026 S1" badge, a week slider (range 1-14), prev/next navigation arrows, date range display, and All Weeks / Current Week mode toggle.
result: issue
reported: "前后导航箭头 + 日期范围之间没有weeks提示，用户不知道是week多少"
severity: minor

### 2. Weekly Time Grid with Events
expected: Below the title row, a 7-day grid renders with day headers (Mon-Sun) and dates. Time labels in the left gutter show hours from 8 AM to 11 PM. Colored event blocks appear in the grid cells at their scheduled times, showing course code, name, time range, type/section, and location.
result: pass

### 3. Week Slider Navigation
expected: Dragging the week slider or clicking prev/next arrows changes the displayed week. The date range updates, events filter to show only sessions for that week's teaching week, and the slider thumb moves to the selected position.
result: pass

### 4. All Weeks / Current Week Mode Toggle
expected: Clicking "All Weeks" shows all sessions across all teaching weeks (slider becomes disabled). Clicking "Current Week" returns to the current week view with the slider re-enabled and positioned at the system-date week.
result: pass

### 5. Overlapping Events Display Side-by-Side
expected: If two or more sessions overlap in time on the same day, they display side-by-side within the day column (each taking a fraction of the column width) rather than stacking on top of each other.
result: pass

### 6. Deadline Overlay Lines
expected: Dashed colored lines appear in the grid at the times of upcoming deadlines. Each line has a tag badge showing the deadline name and a diamond dot. Hovering over a deadline line shows a tooltip with urgency badge, title, course, time, and "View details" text.
result: issue
reported: "需要从 ~/claude/obsidian/200 Areas/210 University/Year2-S1/Deadline Dashboard.md 获取真实deadline信息，切换weeks时当前week的deadline需要消失转而显示下一个week的deadline"
severity: major

### 7. Current-Time Now Line
expected: When viewing the current week, a red horizontal line with a circle dot appears on today's column at the current time position. It should be visible between 8 AM and 11 PM.
result: pass

### 8. Break Week Message
expected: Navigate to a break week (e.g., week 7 if it's a mid-semester break). The grid area shows a centered overlay message indicating it's a break week ("Mid-semester Break" / "No classes this week") instead of the regular grid content.
result: pass

### 9. Right Panel: MiniCalendar, Upcoming Deadlines, Course Legend
expected: The right side panel shows three cards: (1) MiniCalendar at the top, (2) "Upcoming Deadlines" card showing up to 4 nearest deadlines with course color stripes and countdown badges (e.g., "Today", "2 days"), (3) "Courses" legend card showing enrolled courses with color dots and count badge.
result: issue
reported: "courses要跟随真实数据更新"
severity: major

### 10. Chinese Locale (/zh/timetable)
expected: Navigate to /zh/timetable. The page renders with Chinese labels: "课程表" title, "全部周"/"当前周" mode toggle, "即将到来的截止日期" deadlines card, "课程" legend, day headers show 一/二/三/四/五/六/日.
result: pass

## Summary

total: 10
passed: 7
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Title row shows current week number between nav arrows and date range"
  status: failed
  reason: "User reported: 前后导航箭头 + 日期范围之间没有weeks提示，用户不知道是week多少"
  severity: minor
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Deadline overlays use real deadline data from Obsidian and filter by currently viewed week"
  status: failed
  reason: "User reported: 需要从 Obsidian Deadline Dashboard.md 获取真实deadline信息，切换weeks时deadline需要按week过滤显示"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Course legend reflects real enrolled course data"
  status: failed
  reason: "User reported: courses要跟随真实数据更新"
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "MiniCalendar shows color intensity based on deadline count per day"
  status: failed
  reason: "User reported: 日历要根据deadline数量的不同而变化颜色深度"
  severity: minor
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "All mock/fixture data across the system replaced with real data from Obsidian Deadline Dashboard"
  status: failed
  reason: "User reported: 修复问题的时候根据真实的deadline信息把整个系统的虚拟数据替换掉"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
