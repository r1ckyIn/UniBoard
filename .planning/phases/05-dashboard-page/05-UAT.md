---
status: complete
phase: 05-dashboard-page
source: [05-09-SUMMARY.md, 05-10-SUMMARY.md]
started: 2026-03-23T11:30:00Z
updated: 2026-03-23T11:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Donut Type-Based Colors & Legend
expected: Assessment donut shows Rough.js cross-hatch style segments. Colors by assessment TYPE: quiz=blue, exam=brown, assignment=green, lab/project=orange, other=gray. Bottom-right corner shows a legend with colored squares and type labels. No animation on page load — segments render immediately.
result: pass

### 2. Donut Pop-Out Highlight
expected: Click a deadline in the timeline. The corresponding donut segment pops outward (~6px) along its angle. Leader line and dot follow the popped segment. No stroke-width change, no animation — pop is immediate.
result: pass

### 3. Hero Date Line Localization (Chinese)
expected: Switch to Chinese. Hero date line shows Chinese weekday (e.g. 星期一) and week number annotation shows "第4周" inside Rough Notation circle. Switch back to English — shows "Monday" and "Week 4".
result: pass

### 4. Target Column Alignment
expected: In the Course Grades table, the "Target" column header and the grade badges below it (HD/D/CR/P) are both center-aligned — badges sit directly under the header text.
result: pass

### 5. Right Sidebar Sticky
expected: Scroll down past the hero section. The right sidebar (profile card, calendar, activity) stays fixed in place — it does NOT scroll away with the page content. Hero text fades with parallax as you scroll.
result: pass

### 6. i18n Legend Labels
expected: Switch to Chinese. Donut legend labels show Chinese text (测验, 考试, 作业, 实验, 项目, 报告). Switch back to English — shows English labels (Quiz, Exam, Assignment, Lab, Project, Report).
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
