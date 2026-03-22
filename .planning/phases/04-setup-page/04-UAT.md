---
status: complete
phase: 04-setup-page
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md
started: 2026-03-22T03:10:00Z
updated: 2026-03-22T03:08:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Setup 页面访问守卫
expected: 已登录但未配置 Token 的用户访问 /en/setup 时，正常显示 Setup 页面。未登录用户访问 /en/setup → 重定向到 /en/auth。已登录且已配置 Token 的用户访问 /en/setup → 重定向到 Dashboard。
result: pass

### 2. Welcome Step 展示
expected: Setup 页面第一步显示 UniBoard logo、标题、描述文字、3 个功能徽章（安全/隐私/删除相关图标，带柔和彩色背景），以及"Get Started"按钮。整体包裹在 RoughCard 手绘卡片中。
result: issue
reported: "这个自定义边框看起来不像手绘的"
severity: cosmetic

### 3. Step Indicator 进度条
expected: 页面顶部显示 3 个圆圈步骤指示器。当前步骤为橙色，已完成步骤为绿色带勾选标记，未来步骤为灰色边框。随着步骤前进，指示器正确更新状态。
result: pass

### 4. Tutorial Step 与 GuideCard 折叠
expected: 点击"Get Started"后进入第 2 步，显示 Canvas 和 Ed 两个教程卡片，默认都展开。点击卡片标题可折叠/展开，箭头图标有旋转动画。两个卡片可独立折叠。底部有"Back"和"I have my tokens"按钮。
result: pass

### 5. Token 输入与格式验证
expected: 第 3 步显示 Canvas 和 Ed 两个 Token 输入框，各带平台图标。输入无效格式（如短字符串）后输入框边框变红并显示错误信息。输入有效格式后边框变绿。Canvas Token 应为纯数字（50-100位），Ed Token 应为字母数字加下划线/连字符（10-50位）。
result: issue
reported: "右侧的x状删除按钮无法点击，ed和canvas的API应该都是字母数字下划线的吧，你看Claude desktop配置的mcp。Canvas token实际格式是3156~PR7xC...（字母数字+波浪号），不是纯数字"
severity: major

### 6. 顺序验证流程
expected: 点击验证按钮后，先验证 Canvas Token，短暂延迟后再验证 Ed Token。如果 Canvas Token 格式无效，停止验证并只显示 Canvas 错误，不继续验证 Ed。两个都通过后自动进入成功页面。
result: pass

### 7. Success Step 同步模拟
expected: 两个 Token 都验证通过后，显示成功界面：先出现加载 spinner（约 3 秒），然后显示 5 个模拟课程名称（COMP2017、COMP3221、STAT2011、INFO2222、MATH1005），以及"Go to Dashboard"按钮。点击按钮弹出 success toast 提示。
result: issue
reported: "没有显示模拟课程名称但是出现了加载 spinner（约 3 秒）。Go to Dashboard 跳转到 /en/dashboard 是 404。页面有 hydration error（not-found.tsx 重复 html 标签）"
severity: major

### 8. 步骤导航（前后切换）
expected: 在 Tutorial Step 可点击"Back"返回 Welcome Step。在 Token Step 可点击"Back"返回 Tutorial Step。步骤切换有 AnimatePresence 动画过渡效果。
result: pass

### 9. 中英文切换
expected: 切换语言到中文后，Setup 页面所有文案切换为中文显示（标题、描述、按钮文字、教程内容、错误信息等），且布局不破损。切回英文后正常显示英文。
result: issue
reported: "pass，但是切换中英文的时候会重定向到setup的第一个步骤，步骤状态丢失"
severity: minor

## Summary

total: 9
passed: 5
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "RoughCard 在 Setup 页面应显示手绘风格边框"
  status: failed
  reason: "User reported: 这个自定义边框看起来不像手绘的"
  severity: cosmetic
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Token 输入框清除按钮可点击，Canvas Token 验证应接受实际 Canvas API Token 格式（字母数字+波浪号，如3156~PR7xC...）"
  status: failed
  reason: "User reported: 右侧x删除按钮无法点击，Canvas token 实际格式是字母数字+波浪号，不是纯数字"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Success Step 显示 5 个模拟课程名称，Go to Dashboard 跳转到正确路由"
  status: failed
  reason: "User reported: 没有显示模拟课程名称，Go to Dashboard 跳转到 /en/dashboard 是 404，hydration error"
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "切换语言时保持当前步骤状态"
  status: failed
  reason: "User reported: 切换中英文的时候会重定向到setup的第一个步骤，步骤状态丢失"
  severity: minor
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
