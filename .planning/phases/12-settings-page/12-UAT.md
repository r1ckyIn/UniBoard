---
status: diagnosed
phase: 12-settings-page
source: [12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md]
started: 2026-03-26T10:30:00Z
updated: 2026-03-26T10:42:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Settings Page Load
expected: Navigate to /en/settings. Page renders with Settings icon + title + subtitle. Six section cards visible in order.
result: pass

### 2. Scroll-Spy Navigation
expected: Left sidebar shows SETTINGS label and 6 nav items. Scrolling highlights active section. Clicking nav smooth-scrolls. Danger Zone icon red.
result: issue
reported: "左侧边栏现在是悬浮在中间，需要和原型一致，顶住上面"
severity: major

### 3. Token Management Section
expected: Canvas/Ed platform rows with status badges, eye toggle, Update button, Sync Now.
result: pass

### 4. GPA Target Section
expected: Large orange number + grade band badge. Slider and numeric input synced. Save Target works.
result: issue
reported: "点击保存后没有同步到预测界面，反而还被预测页面的85重置了设置里设定的100"
severity: major

### 5. Notification Toggles
expected: 3 deadline toggles, GPA risk, digest frequency, email toggle. localStorage persistence.
result: issue
reported: "gpa风险警报和邮件通知下面的灰色描述应该向左对齐"
severity: cosmetic

### 6. Course Linking Table
expected: 5 courses with correct semester, sources, Auto-linked badges.
result: pass

### 7. Profile Section
expected: Editable name, readonly email, disabled password, Save Changes, account creation date.
result: issue
reported: "格式展示不美观，12月的1和2都分开了"
severity: cosmetic

### 8. Danger Zone Dialogs
expected: Red title, disconnect/delete buttons, confirmation dialogs, DELETE text gate.
result: issue
reported: "危险区域的弹窗的表现需要在屏幕中间"
severity: major

### 9. Right Panel Cards
expected: Account card, Sync Status, Quick Actions, About card in right panel.
result: pass

### 10. Chinese Locale
expected: /zh/settings shows all labels in natural Chinese.
result: pass

## Summary

total: 10
passed: 5
issues: 5
pending: 0
skipped: 0

## Gaps

- truth: "Left scroll-spy nav is sticky at top, matching prototype position"
  status: failed
  reason: "User reported: 左侧边栏现在是悬浮在中间，需要和原型一致，顶住上面"
  severity: major
  test: 2
  root_cause: "SettingsNav uses sticky top-[calc(56px+20px)] but scroll container is <main> (overflow-y:auto), not viewport. The 56px header is outside <main>, so 76px offset pushes nav too far down."
  artifacts:
    - path: "frontend/components/settings/SettingsNav.tsx"
      issue: "sticky top-[calc(56px+20px)] should be top-0 since scroll container is <main>"
  missing:
    - "Change top-[calc(56px+20px)] to top-0 in SettingsNav.tsx"
  debug_session: ""

- truth: "GPA target saved in settings persists and syncs to predict page"
  status: failed
  reason: "User reported: 点击保存后没有同步到预测界面，反而还被预测页面的85重置了设置里设定的100"
  severity: major
  test: 4
  root_cause: "Mock API is stateless — PATCH /users/me merges but GET always returns original mockUser. Predict page reads target_wam from separate fixture (gpa.ts), not user query."
  artifacts:
    - path: "frontend/app/api/v1/users/me/route.ts"
      issue: "PATCH returns merged object but GET returns original immutable mockUser"
    - path: "frontend/lib/fixtures/gpa.ts"
      issue: "target_wam: 85.0 is separate from user.gpa_target"
  missing:
    - "Make mock API stateful with module-level mutable variable for user data"
    - "Have predict page read gpa_target from user query or sync GPA report fixture"
  debug_session: ""

- truth: "GPA risk alert and email notification description text is left-aligned"
  status: failed
  reason: "User reported: gpa风险警报和邮件通知下面的灰色描述应该向左对齐"
  severity: cosmetic
  test: 5
  root_cause: "Description paragraphs have ml-[52px] left margin but toggle is on the RIGHT side (flex justify-between), causing pointless 52px indent."
  artifacts:
    - path: "frontend/components/settings/NotificationsSection.tsx"
      issue: "ml-[52px] on lines 103 and 147 misaligns description text"
  missing:
    - "Remove ml-[52px] from both description paragraphs"
  debug_session: ""

- truth: "Account creation date displays without line-breaking within the date"
  status: failed
  reason: "User reported: 格式展示不美观，12月的1和2都分开了"
  severity: cosmetic
  test: 7
  root_cause: "Date span lacks whitespace-nowrap. Chinese locale date-fns output can break between characters when squeezed by flex justify-between layout."
  artifacts:
    - path: "frontend/components/settings/ProfileSection.tsx"
      issue: "Date span on line 103-107 needs whitespace-nowrap"
  missing:
    - "Add whitespace-nowrap to the date span element"
  debug_session: ""

- truth: "Danger zone confirmation dialogs appear centered on screen"
  status: failed
  reason: "User reported: 危险区域的弹窗的表现需要在屏幕中间"
  severity: major
  test: 8
  root_cause: "Tailwind Preflight resets margin:0 on all elements, overriding native dialog's margin:auto centering. showModal() relies on UA stylesheet margin:auto."
  artifacts:
    - path: "frontend/components/settings/DangerZoneSection.tsx"
      issue: "dialog elements lack m-auto to restore centering after Preflight reset"
  missing:
    - "Add m-auto to both dialog elements' className"
  debug_session: ""
