# Phase 28: Deadlines Page Enhancement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 28-deadlines-page-enhancement
**Areas discussed:** Card Redesign, Filter Logic, Persistence Strategy, Notification Panel Integration

---

## Card Redesign — Menu Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown 弹出菜单 | 点击三点图标，向下弹出小卡片显示 "Pin"/"Delete" 两项，点击外部关闭 | ✓ |
| 滑动操作栏 | 左滑卡片露出右侧操作按钮（Pin / Delete），移动端风格 | |
| 卡片内嵌图标 | 不用菜单，直接在卡片右上角显示 pin 图标和 delete 图标（hover 时显现） | |

**User's choice:** Dropdown 弹出菜单
**Notes:** 轻量级、符合常见 UI 模式，desktop-first 项目

## Card Redesign — Pin Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| 左侧金色边条 | 将现有 courseColor 左侧竖条替换为金色/amber（#b08968），加 pin 图标标记 | ✓ |
| 卡片背景色变化 | 整张卡片背景变为淡金色，与普通卡片区分 | |
| 置顶 + 微妙标记 | Pinned 卡片排序置顶，只加小型 pin 图标，不改变颜色 | |

**User's choice:** 左侧金色边条
**Notes:** 使用项目已有的 amber 色系变量

## Filter Logic, Persistence Strategy, Notification Panel

**User's choice:** 用户要求跳过详细讨论，直接生成 context
**Notes:** Claude 根据需求文档（DL-UX-01~05）和代码库分析做出合理技术决策

---

## Claude's Discretion

- Delete 确认交互方式（确认弹窗 vs 即时删除+undo toast）
- Dropdown 动画效果
- Overdue 红色边框的具体宽度和样式
- Pin/Unpin 菜单文字切换

## Deferred Ideas

None
