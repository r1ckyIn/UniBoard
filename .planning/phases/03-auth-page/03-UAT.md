---
status: complete
phase: 03-auth-page
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: 2026-03-21T15:50:00Z
updated: 2026-03-21T16:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Auth Page Two-Panel Layout
expected: Visit http://localhost:3001/en/auth — page loads with two-panel layout: brand panel on left (logo "U" mark, "UniBoard" text, tagline, 3 feature highlights), form card on right with login form as default view. Colorful Rough.js doodle shapes visible in background at subtle opacity.
result: issue
reported: "页面的滚动条需要不随着条件创建或者消失，常态存在并且默认隐形"
severity: cosmetic

### 2. Entrance Animation
expected: On page load, elements appear with staggered slide-up animation — brand panel and form card animate in sequentially with smooth easing.
result: issue
reported: "品牌面板很平滑，表单卡片不平滑，并且表单卡片不需要做指针停留之后的立体悬浮，普通卡片就可以，然后你需要把这个登录页面做成那种书本的感觉，品牌面板和表单卡片正好可以把整个页面分为两页，然后动效时书本翻开，搜索最佳实践然后重新修改为丝滑版本"
severity: major

### 3. Login Form Validation
expected: Click into email field, type a non-USYD email (e.g. "test@gmail.com"), then click away (blur). Inline red error appears: "Please use your USYD student email (@uni.sydney.edu.au)". Leave password empty and blur — shows "Password is required".
result: issue
reported: "不管是邮箱还是密码，只有用户点击登入按钮之后才会跳出来这些提示，现在我是输入了再删除然后点击其他空白地方也会出现这个提示"
severity: major

### 4. Forgot Password Toast
expected: Click "Forgot password?" link next to password label. A sonner toast notification appears at top-center: "Password reset is not available in demo mode".
result: pass

### 5. Form Switching Animation
expected: Click "Create one" link at bottom of login form. Form smoothly transitions to register form with crossfade + height morph animation. The RoughCard border redraws smoothly as height changes.
result: issue
reported: "表单很丝滑但是手绘边框的大小切换不平滑，手绘边框也需要流畅的拓展或者收缩大小"
severity: major

### 6. Register Form & Password Strength
expected: Register form shows 4 fields: Display Name, Email, Password, Confirm Password. Type in password field — 4-bar password strength meter below updates in real-time: short password = red "Weak", medium = amber "Fair"/"Good", strong (12+ chars, mixed case, digit, special) = green "Strong".
result: pass

### 7. Switch Back to Login
expected: Click "Sign in" link at bottom of register form. Form smoothly transitions back to login form with crossfade animation.
result: pass
note: same RoughCard border issue as test 5, will be fixed together

### 8. Responsive Brand Panel
expected: Resize browser window below 900px width. Brand panel (left side) disappears, form card centers on screen. Resize back above 900px — brand panel reappears.
result: pass

### 9. Language Switcher
expected: Small globe button visible in top-right corner showing current locale ("EN"). Click it — all text on the page switches to Chinese (titles, labels, placeholders, button text). Click again — switches back to English.
result: issue
reported: "在create account界面点击切换成中文刷新后回到了signin页面，语言切换时表单状态（注册/登录）没有保持"
severity: major

### 10. Auth Doodles Background
expected: Colorful hand-drawn doodle shapes (stars, sparkles, dots, wavy lines) visible across the full screen background at subtle opacity. Shapes should be in warm colors (orange, blue, green) matching the design system.
result: pass

## Summary

total: 10
passed: 5
issues: 5
pending: 0
skipped: 0

## Gaps

- truth: "页面滚动条应常态存在但默认隐形，不随内容条件创建或消失"
  status: failed
  reason: "User reported: 页面的滚动条需要不随着条件创建或者消失，常态存在并且默认隐形"
  severity: cosmetic
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "入场动画平滑，表单卡片无悬浮效果，整体书本翻开感觉"
  status: failed
  reason: "User reported: 品牌面板很平滑，表单卡片不平滑，不需要立体悬浮，需要书本翻开的动效"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "表单验证仅在用户点击登录按钮后触发，blur 不触发验证"
  status: failed
  reason: "User reported: 只有用户点击登入按钮之后才应该跳出提示，现在blur也会触发"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "RoughCard 手绘边框在表单切换时平滑过渡大小"
  status: failed
  reason: "User reported: 手绘边框的大小切换不平滑，需要流畅的拓展或者收缩大小"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "语言切换时保持当前表单状态（登录/注册）"
  status: failed
  reason: "User reported: 在register界面切换语言后回到了login页面，表单状态未保持"
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
