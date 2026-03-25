---
status: diagnosed
phase: 10-digest-page
source: 10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md
started: 2026-03-25T09:45:00Z
updated: 2026-03-25T09:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Digest 页面加载与标题行
expected: 访问 /en/digest 或 /zh/digest，页面正确加载。顶部显示标题行：Radio 图标、今日日期徽章、"Generated X ago" 文本、以及一个刷新按钮。
result: pass

### 2. 课程分组卡片显示
expected: 页面主内容区域显示多个课程卡片，每个卡片左侧有彩色条纹（5px），卡片头部显示课程代码（如 COMP2017）、课程名称、以及该课程的高亮条目数量徽章。课程按紧急度排序。
result: pass

### 3. 高亮条目渲染
expected: 每个课程卡片内显示高亮条目列表。每条高亮包含：类型特定的彩色图标、类型标签（如 Grade Released、Staff Answer 等）、来源徽章（Canvas 或 Ed）、摘要文本、紧急度标记（如有）、以及相对时间（如 "2h ago"）。
result: pass

### 4. 筛选栏功能
expected: 标题行下方显示 6 个 pill 筛选按钮（All、Grade、Staff、Deadline、Announcement、Exam）。默认选中 "All"。点击其他筛选器后，仅显示对应类型的高亮条目，已选中的按钮有明显的 active 样式区分。
result: pass

### 5. 紧急横幅
expected: 如果存在 critical 级别的高亮条目，筛选栏下方显示红色紧急横幅，提示有紧急项目需要关注。如果没有 critical 项目，横幅不显示。
result: pass

### 6. 右侧面板 — 摘要统计卡片
expected: 右侧面板显示一个 RoughCard 包裹的 2×2 统计网格，展示四个指标：Updates（更新数）、Courses（课程数）、Grades（成绩数）、Urgent（紧急数）。数值与当前 digest 数据一致。
result: pass

### 7. 右侧面板 — 历史记录卡片
expected: 右侧面板显示历史 digest 列表，每条记录可点击。点击后主内容区域切换到对应历史 digest 的内容，当前选中的记录有视觉高亮（如 ChevronRight 箭头）。
result: issue
reported: "点击近期摘要没有跳转，并且如果用户指针点击了记录应该立刻视觉高光，而不是用户指针离开后再显示高光"
severity: major

### 8. 加载骨架屏
expected: 页面数据加载期间（可通过 DevTools 限速网络模拟），显示骨架屏：主内容区域有 3 个课程占位符动画，右侧面板有 2 个占位符动画。数据加载完成后骨架屏消失，替换为真实内容。
result: pass

## Summary

total: 8
passed: 7
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "点击历史记录后主内容区域切换到对应历史 digest，选中记录立即视觉高亮"
  status: failed
  reason: "User reported: 点击近期摘要没有跳转，并且如果用户指针点击了记录应该立刻视觉高光，而不是用户指针离开后再显示高光"
  severity: major
  test: 7
  root_cause: "1) DigestPage.selectedHistoryId state not used for data fetching — no /digest/{id} endpoint (M2 TODO). 2) Tailwind hover:bg overrides selected bg while pointer hovers, making highlight appear only after pointer leaves."
  artifacts:
    - path: "frontend/components/digest/DigestHistoryCard.tsx"
      issue: "hover:bg overrides selected bg; no content switching on click"
    - path: "frontend/components/digest/DigestPage.tsx"
      issue: "selectedHistoryId not used in any query"
  missing:
    - "Add hover:bg-[rgba(217,119,87,0.15)] to selected state (CSS fix — DONE)"
    - "Content switching requires M2 /digest/{id} endpoint — out of scope for M1"
  debug_session: ""
