---
status: carried-over
owner: next-session
date: 2026-04-17
---

# 下一个 Session 接手清单

## 本 session 已完成（不用再做）

### 基础设施 — uniboard.uk 上线（PR #76 已合并）
- Vercel 绑域 `uniboard.uk` + `www`
- Railway 绑 `api.uniboard.uk` (port 8080)
- Cloudflare 4 条 DNS (REST API 写入，DNS-only / grey-cloud)
- Vercel env `NEXT_PUBLIC_API_URL = https://api.uniboard.uk`
- 代码 hardcode 同步：`uniboard.app → uniboard.uk`
- Supabase Auth Site URL / Redirect URLs 已 PATCH 为 `uniboard.uk`（含 `/auth/callback`）

### Backend 修复
- **PR #77**: USYD Unit Outline fetcher 加 `follow_redirects=True`（sydney.edu.au → www.sydney.edu.au 的 301 链）
- **PR #78**: `UnifiedDeadline.due_date`（tz-aware）vs `datetime.utcnow()`（naive）的 TypeError → 全替换为 `datetime.now(UTC)`，修 3 处：
  - `src/web/routes/courses.py`
  - `src/web/routes/deadlines.py`
  - `src/services/deadline.py`
- 合并后 COMP2017/MATH2021/STAT2011 的 `/deadlines` 从 500 → 200

## 遗留问题 — 下次一次性处理

### P0 · 卡顿（5fps 体感）— 本文件核心问题
症状：`uniboard.uk` dashboard 浏览时明显卡，交互掉帧。
- Canvas / Ed Deadlines 的 500 storm 已排除（PR #78 修了）
- `localhost:3001` 请求不在生产代码里（grep 确认）
- 可能藏得很深，需要 **Chrome DevTools Performance + React DevTools Profiler** 现场录 10s

推荐诊断顺序见文件末"浑身解数"列表。

### P1 · Ed course linking 失效
- `/api/user` 返回 `{courses: [{course: {code, year, session, ...}, role: ...}]}` 嵌套结构
- `src/services/course_linking.py::link_courses` 直接读 `ec.get("name")` / `ec.get("id")` flat → 全失败
- 用户 4 门课的 `ed_course_id` 全是 `null`
- 连带问题：Canvas 课名无 semester pattern（如 "COMP3221 Distributed Systems"），`extract_semester()` 返回 None，`(code, semester)` 匹配也不工作
- **修复思路**：在 `sync/courses.py` 解包 Ed 嵌套 + augment name；或在 `link_courses` 做 code-only fallback 当任一侧缺 semester
- 测过的用户 Ed API 已确认有 STAT2011 等 course，linking 修复后应立刻生效

### P2 · `/digest/latest` 404 静默
- 新用户还没 digest，404 是正确语义
- 但前端仍在重试，建议 hook 里 `retry: (count, err) => err.status !== 404`

### P3 · Grades 0% 全显示
- 四门课 grades 都是 0 — 可能 `sync_grades_failed`（Phase 33 log 里见过）
- outline fix 部署后还没触发过重新 sync，下次 session 先让用户点一次 Retry 再看

## 下次 Session 如何启动

```bash
cd ~/claude/r1ckyIn_GitHub/UniBoard
git checkout main && git pull
cat .planning/quick/20260417-platform-errors-post-domain/CONTINUE.md
/gsd-resume-work
```

---

# "浑身解数"诊断清单 — 5fps 卡顿

按**成本升序**、**诊断价值降序**排列。每项都写了具体命令/操作。

## 1 · 无扩展无缓存隔离测试（30 秒，必做）
**用意**：排除浏览器扩展干扰（腾讯翻译、广告屏蔽、PostHog 内存驻留等）。

```
Chrome → 新建无痕窗口 → uniboard.uk → 登录 → 浏览
```
如果无痕流畅 → 100% 是扩展问题（用户有腾讯翻译插件，可疑）。
如果无痕还是卡 → 继续下面。

## 2 · Chrome DevTools Performance 录制（2 分钟）
**最强武器**。录一段卡顿。

```
F12 → Performance → 小齿轮 "CPU: 4x slowdown" 关掉 → 录制
在页面上滚 / 切 tab 10 秒 → 停止
```
看三件事：
- **Main thread 红色长条** → 哪个 JS 函数阻塞
- **Frames 条** → 哪一帧 > 50ms
- **Bottom-Up 视图** → 聚合耗时 top-10 函数

复制截图或导出 .trace.json 发给下个 session。

## 3 · React DevTools Profiler（2 分钟）
**专门看 re-render 风暴**。

```
装 React DevTools → Profiler tab → 录制按钮
在页面操作 5 秒 → 停止 → "Ranked" 视图
```
看：
- 单次 commit 超过 16ms 的组件
- "Why did this render?" 里显示"props changed / parent rendered"但值没变 → memo 缺失
- 某个组件 update 次数 > 100 → 状态订阅写坏了（useAuthStore / TanStack Query selector）

## 4 · Network 看 polling / SSE 失败重连
```
Network tab → Fetch/XHR → 清空 → 静置 10 秒
```
应该几乎没有请求才对。如果看到：
- 同一 endpoint 每秒重试 → 某 hook 的 `retry` 配置炸了
- `EventSource` / `WebSocket` 状态不停 connecting → SSE 端点回 5xx 又重连

## 5 · Long Task API 浏览器 console 打点
粘到 DevTools Console：
```js
new PerformanceObserver(list => {
  for (const e of list.getEntries()) {
    if (e.duration > 50) console.log(`[long-task] ${e.duration.toFixed(0)}ms @`, e.name, e.attribution);
  }
}).observe({ type: 'longtask', buffered: true });
```
操作几秒，日志里出现的 `>50ms` task 就是掉帧来源。

## 6 · 看 window.performance.memory
```js
setInterval(() => console.log((performance.memory.usedJSHeapSize/1048576).toFixed(1)+'MB'), 2000)
```
内存持续涨 → 内存泄漏（常见：TanStack Query cache 无 GC / Sentry breadcrumb 不限长度）。

## 7 · React Scan（零配置可视化 re-render）
```bash
# 在 frontend/ 目录
npx react-scan@latest localhost:3001
```
浏览器会用彩色高亮每次重新渲染的组件。看哪块"一直在闪"。

## 8 · Sentry Replay（如果 Sentry 已 enable Replay）
Sentry dashboard → Replays → 找最近一条
Replay 会录屏 + 带上每次网络请求 + console log，用户侧发生什么一目了然。

## 9 · Bundle analyzer（看是否拉了巨大的 vendor chunk）
```bash
ANALYZE=true pnpm build
# 打开生成的 .next/analyze/*.html
```
找 >500KB 的第三方 chunk — 可能意外 import 了整个 moment / lodash / full icon pack。

## 10 · Vercel Speed Insights / Web Vitals 采样
```
Vercel Dashboard → uni-board → Speed Insights
```
看 CLS / INP / FID 实测分数。INP > 500ms 就是肉眼可见掉帧。

## 11 · Node.js backend 慢请求（边缘可能性）
即使 API 200，backend 慢 1 秒 x 10 个 query 也能让页面看上去卡。
```bash
railway logs --deployment <latest> | grep duration_ms | awk '{print $NF}' | sort -n | tail -20
```

---

## 优先执行顺序

**下次 session 第一分钟做 #1**（无痕测试）— 如果排除扩展，立刻进 #2 + #3 组合拳。带着 Performance .trace + Profiler 数据回来，我一般 5 分钟能定位到根因。

## 猜测（非结论）

基于这个项目的技术栈，卡顿最可能的 3 个嫌疑：
1. **TanStack Query** 的 `refetchOnWindowFocus: true` + 多个 `useQueries` 在 setup 完成后每秒发一波请求（我们看过的 `/deadlines` 500 重试就是这个机制放大的，底子还在）
2. **next-intl** 的 locale SSR hydration 在 `/en` 路由里每次跳转重跑
3. **Sentry Replay** 如果 `replaysSessionSampleRate: 1.0` 或没关，后台持续录屏占内存

这 3 个都能通过 #2/#3 直接 confirm 或排除。
