---
phase: 39-design-token-foundation
reviewed: 2026-04-30T00:00:00Z
depth: standard
files_reviewed: 56
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 39 Code Review — Design Token Foundation

**Reviewed:** 2026-04-30
**Depth:** standard
**Files Reviewed:** 56
**Status:** issues_found

## Summary

Phase 39 实现整体扎实——design token 架构清晰、TDD 覆盖充分、ESLint rule 提供机械化护栏、sed 迁移产生统一的 motion-token 调用形式。56 文件审查中无 critical bug 或安全漏洞。

主要顾虑集中在 **timing-function 冲突**（4 个文件遗留了与新 `--ease-claude-out` 冲突的旧 timing 声明，CSS cascade 行为依赖最后定义而非显式 token），以及 **ESLint rule false-negative 边界**（pseudo-element variant `after:transition-all after:duration-N` 不被捕获）。这些不阻断 ship 但应在 ship 前清理，否则视觉 UAT 会带噪音。

CSS token 文件 `globals.css` 结构正确（@theme 内嵌套 @keyframes 是 Tailwind v4 合法用法），`hex-to-oklch.mjs` 数学正确（Pitfall 5 已规避）。其余建议均为 Info 级别可选优化。

---

## Warnings

### WR-01: Sidebar 同时声明两个 transition-timing-function

**File:** `frontend/components/layout/Sidebar.tsx:52`
**Severity:** warning
**Issue:** `cn(...)` className 字符串同时包含 `[transition-timing-function:var(--ease-claude-out)]`（来自 sed 迁移）和遗留的 `ease-[cubic-bezier(.4,0,.2,1)]`（v2.0 Phase 38 性能调优遗留）。两者最终都映射到同一 CSS 属性 `transition-timing-function`。Tailwind v4 的 cascade order 不保证哪个胜出——`cubic-bezier(.4,0,.2,1)` 是 Material Design ease，`var(--ease-claude-out)` 是 v3.0 brand ease（cubic-bezier(0.165, 0.85, 0.45, 1)），曲线不同。

**Fix:** Remove the legacy bracket utility `ease-[cubic-bezier(.4,0,.2,1)]`. D-13 specifies `var(--ease-claude-out)` is the v3.0 brand-canonical curve.

### WR-02: PredictCard / DeadlineCard inline `style.transitionTimingFunction` 覆盖 className token

**Files:** `frontend/components/deadlines/DeadlineCard.tsx:252-256`, `frontend/components/predict/PredictCard.tsx:213-218`
**Severity:** warning
**Issue:** 两个 expandable card 在 className 中应用 `[transition-timing-function:var(--ease-claude-out)]`，紧接 inline style 中又写 `transitionTimingFunction: "cubic-bezier(.4,0,.2,1)"`。Inline style **总是赢过** class style（CSS specificity 规则），所以 className 中的新 token 此处无效，实际生效的仍是旧的 Material curve——这两个组件的 expand/collapse 动画**不会**应用 v3.0 brand ease。

**Fix:** Remove the `transitionTimingFunction` line from inline style. className 已经通过 token 提供。

### WR-03: DeadlineTimeline / RecentActivity 末尾遗留 `ease-out` 冲突 token

**Files:** `frontend/components/dashboard/DeadlineTimeline.tsx:195`, `frontend/components/dashboard/RecentActivity.tsx:121`
**Severity:** warning
**Issue:** className 中已有 `[transition-timing-function:var(--ease-claude-out)]`，末尾又跟了裸 `ease-out`（Tailwind 的 `transition-timing-function: cubic-bezier(0, 0, 0.2, 1)`）。同 WR-01——两个 utility 写入同一 CSS 属性，cascade 顺序不可靠且语义重复。`ease-out` 应该是 sed 迁移前的 v2.0 配置遗留。

**Fix:** Remove trailing `ease-out` — token already supplies the timing function.

### WR-04: ESLint rule 对 pseudo-element / state variant 的 false negative

**File:** `frontend/eslint.config.mjs:33-35`
**Severity:** warning
**Issue:** Selector regex `Literal[value=/transition-(all|colors)\s+duration-(\[[^\]]*\]|\d+)/]` 不匹配 Tailwind 的 `after:transition-all after:duration-200` 形式（regex 要求 `transition-all` 后紧跟 `\s+duration-`，但插入 `after:` 前缀让前一个匹配失败）。`NotificationsSection.tsx:172` 的 toggle switch 就有此遗留写法没被 rule 抓到，也没被 sed 迁移到 motion token。同理 `before:` `hover:` `focus:` `dark:` `group-hover:` 等任何 modifier prefix 都让 rule 失效。

**Fix:** 增加针对 modifier-prefixed 形式的第二个 selector，并手动迁移 `NotificationsSection.tsx:172` 的 `after:transition-all after:duration-200`。

---

## Info

### IN-01: hex-to-oklch.mjs CLI sentinel 在 Windows 不兼容

**File:** `frontend/scripts/hex-to-oklch.mjs:112`
**Issue:** `if (import.meta.url === \`file://${process.argv[1]}\`)` 在 Windows 上失效（路径分隔符差异）。macOS-only 项目所以影响接近零，但建议用 `fileURLToPath(import.meta.url)` 标准模式。

### IN-02: hex-to-oklch.mjs 灰度色 hue fallback 不必要

**File:** `frontend/scripts/hex-to-oklch.mjs:104`
**Issue:** chroma=0 时 culori 返回 `h: undefined`，脚本回退 `"0"`。CSS 规范允许 `oklch(L 0 none)` 作为合法语法，渲染等价。可选：用 `"none"` 提升表达力。

### IN-03: hex-to-oklch round-trip 测试 + `convert()` 在 PALETTE 漂移时易脱钩

**File:** `frontend/__tests__/scripts/hex-to-oklch.test.ts:25-44`
**Issue:** 测试 FIXTURES 与 `scripts/hex-to-oklch.mjs` 中 `PALETTE` 是手抄复制（注释明确说"When PALETTE drifts, the FIXTURES list below MUST be updated in lockstep"）。可选：从同一来源 import 让 PALETTE 成为单一来源。

### IN-04: tokens-css.test.ts spacing regex 在 minified CSS 上 fragile

**File:** `frontend/__tests__/styles/tokens-css.test.ts:74`
**Issue:** Regex `${token}:\s+${value}\b` 要求至少一个空格 (`\s+`)。如果 globals.css 未来被 PostCSS 压缩成 `--spacing-1:4px;` 形式，断言会失败。可选：用 `\s*`。

### IN-05: phase39-transition-parity.spec.ts maxDiffPixelRatio 0.005 在跨平台 CI 容易抖动

**File:** `frontend/tests/e2e/phase39-transition-parity.spec.ts:93,108`
**Issue:** 0.5% 像素 diff 容差比 Phase 38 严格 4 倍。考虑到 baseline 在 production UAT 时生成（SEED-39），cross-platform CI 可能 false positive。建议 1% 容差或 pin Playwright OS image。

### IN-06: globals.css `@keyframes` 嵌套 `@theme` 在 Tailwind v4 中合法，但建议加注释提示

**File:** `frontend/app/globals.css:148-231`
**Issue:** 6 个 `@keyframes` 块嵌套在 `@theme { ... }` 内。Tailwind v4 spec 允许（`--animate-*` token 与 keyframes 名引用同源时鼓励嵌套），但与传统 CSS author 直觉相悖。建议加一行注释提示这是 Tailwind v4 idiom。

---

## Cross-File Observations

**正向**：sed 迁移在所有 56 文件中保持了高度一致的 motion-token 调用形式（`transition-X [transition-duration:var(--motion-fast|base|slow)] [transition-timing-function:var(--ease-claude-out)]`），未见 sed 截断破坏。Form C bracket transitions（`transition-[max-height]`、`transition-[width]`、`transition-[background]`、`transition-[border-color,box-shadow]`、`transition-[transform,box-shadow]`、`transition-[height]`、`transition-[background,transform]`）全部保留正确，没有意外丢失方括号。

**未迁移（预期）**：`transition-shadow`、`transition-opacity`、`transition-transform` 系单值 utility 不在 sed 范围（rule 只针对 transition-{all,colors} duration-N），未来若收紧门控应另起 phase。

---

## Files Skipped / Out of Scope

- `frontend/package.json`, `frontend/pnpm-lock.yaml`：dependency manifest，已审查（culori 4.0.2、@types/culori 4.0.1 正确锚定）
- 测试文件中的"intentional violation"字符串（`__tests__/eslint/no-raw-transition.test.ts`）：被 eslint.config.mjs 显式 override 关闭，符合预期

---

**Reviewer:** Claude (gsd-code-reviewer)
**Depth:** standard
