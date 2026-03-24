---
status: complete
phase: 08-deadlines-page
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md]
started: 2026-03-23T12:00:00Z
updated: 2026-03-24T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Deadlines Page Route & Title
expected: Navigate to /deadlines. Page renders with "Deadlines" title (serif font), semester badge "2026 S1" (orange background), and a Calendar icon to the left of the title.
result: pass

### 2. Deadline Cards Display
expected: Multiple deadline cards visible in a vertical timeline layout. Each card shows: assignment title, course code + name (colored text), formatted due date, urgency countdown badge, and an italic AI summary placeholder line. A vertical line runs along the left with hand-drawn Rough.js dots.
result: pass
note: User feedback — AI summary placeholder needs redesign. Should be precise 20-30 word study guidance pointing to specific materials/chapters, not generic encouragement. Deferred to M3 AI milestone.

### 3. Card Expand/Collapse (Accordion)
expected: Click a deadline card — it smoothly expands to reveal "Related Materials" section and "AI Chat" section with Coming Soon badge. Click same card again — collapses. Click different card — first collapses, new one expands (accordion).
result: pass

### 4. Filter Controls — Course Dropdown
expected: Right side of title row has "All Courses" dropdown. Select a specific course — only deadlines from that course remain visible. Select "All Courses" again — all deadlines return.
result: pass

### 5. Filter Controls — All / This Week Toggle
expected: "All" and "This Week" toggle buttons. "All" active by default. Click "This Week" — only deadlines due within 7 days shown. Click "All" — all deadlines return.
result: pass

### 6. View Toggle — Timeline / Calendar
expected: Two icon toggle buttons (list + calendar). Click calendar icon to switch to calendar view, click list to return.
result: issue
reported: "不需要这个功能，deadlines页面只提供列表时间线视图，日历视图根据timetable原型实现"
severity: major

### 7. Calendar View — Month Grid & Course Dots
expected: In calendar view, month grid with day headers, numbered cells, course-colored dots on deadline days, today highlight, month label with nav chevrons.
result: skipped
reason: Calendar view removed from deadlines page scope per Test 6 feedback

### 8. Calendar View — Month Navigation
expected: Click chevrons to navigate months.
result: skipped
reason: Calendar view removed from deadlines page scope per Test 6 feedback

### 9. Calendar View — Click Date to Filter
expected: Click a day with dots to filter timeline below calendar.
result: skipped
reason: Calendar view removed from deadlines page scope per Test 6 feedback

### 10. Empty State
expected: Apply filters matching no deadlines. Empty state with calendar icon, "No Deadlines" title, and message.
result: pass
note: Verified via automated test (no mock data produces empty state manually)

### 11. Loading State
expected: On hard refresh, 3 skeleton cards with shimmer animation appear briefly before real cards load.
result: pass

## Summary

total: 11
passed: 7
issues: 1
pending: 0
skipped: 3

## Gaps

- truth: "Deadlines page should only have timeline view, not calendar view"
  status: failed
  reason: "User reported: 不需要这个功能，deadlines页面只提供列表时间线视图，日历视图根据timetable原型实现"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
