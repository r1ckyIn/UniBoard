---
status: complete
phase: 09-predict-page
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md]
started: 2026-03-24T15:30:00+11:00
updated: 2026-03-24T18:10:00+11:00
---

## Current Test

[testing complete]

## Tests

### 1. Predict Page Loads
expected: Navigate to /predict. Page renders with title row, faculty selector, semester badge, CP badge, and 5 collapsed course cards.
result: pass

### 2. Card Expand/Collapse
expected: Click card to expand (CSS transition), showing 3-column assessment table and grade summary. Click again to collapse. Multiple cards can be open simultaneously.
result: pass

### 3. Score Input for Ungraded Assessments
expected: Ungraded assessments show dashed-underline input fields. Typing a score updates grade summary in real-time.
result: issue
reported: "是实时更新但是表现形式和courses的不太一样，没有平滑滚动"
severity: cosmetic

### 4. WAM Overview Card (Right Panel)
expected: Right panel shows WAM number, grade band badge, GPA conversion, basis text. WAM updates live as predictions change.
result: pass

### 5. Target WAM Slider (Right Panel)
expected: Slider changes target WAM. Gap badge shows on-track or to-go difference.
result: pass

### 6. Required Scores Card (Right Panel)
expected: Per-course required scores with feasibility icons (check/alert/x/lock).
result: pass

### 7. Semester Progress Card (Right Panel)
expected: Per-course progress bars with weighted overall percentage.
result: pass

### 8. Faculty Scheme Persistence
expected: Change faculty scheme, WAM recalculates, selection persists after refresh.
result: issue
reported: "下面会排除但是卡片没有相应，卡片也加一个锁住的动画，然后功能禁用"
severity: minor

### 9. Deep Link Auto-Expand
expected: Navigate to /predict?course=COMP2017, matching card auto-expands and scrolls into view.
result: pass

### 10. Chinese Locale
expected: All predict page text renders in Chinese at /zh/predict.
result: pass

## Summary

total: 10
passed: 8
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Grade summary and WAM numbers update with smooth counting animation like courses page"
  status: failed
  reason: "User reported: 是实时更新但是表现形式和courses的不太一样，没有平滑滚动"
  severity: cosmetic
  test: 3
  root_cause: "PredictGradeSummary does not use useCountUp hook unlike course-detail GradeSummary"
  artifacts:
    - path: "frontend/components/predict/PredictGradeSummary.tsx"
      issue: "Missing useCountUp for animated number transitions"
    - path: "frontend/components/predict/WamOverviewCard.tsx"
      issue: "WAM number also lacks counting animation"
  missing:
    - "Add useCountUp to PredictGradeSummary projected value"
    - "Add useCountUp to WamOverviewCard WAM number"
  debug_session: ""

- truth: "Excluded course cards show visual lock/dimmed state and disable expand/input when faculty scheme excludes them"
  status: failed
  reason: "User reported: 下面会排除但是卡片没有相应，卡片也加一个锁住的动画，然后功能禁用"
  severity: minor
  test: 8
  root_cause: "PredictCard has no awareness of faculty scheme exclusion — only RequiredScoresCard shows excluded state"
  artifacts:
    - path: "frontend/components/predict/PredictCard.tsx"
      issue: "No excluded prop or visual state for faculty-excluded courses"
    - path: "frontend/components/predict/PredictPage.tsx"
      issue: "Does not pass exclusion state to PredictCard"
  missing:
    - "Add excluded prop to PredictCard"
    - "When excluded: dim card opacity, show lock overlay, disable expand and score inputs"
    - "PredictPage passes exclusion state based on faculty scheme and course level"
  debug_session: ""
