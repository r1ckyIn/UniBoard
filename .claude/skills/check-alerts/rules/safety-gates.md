# Safety Gates — 告警自动处理安全规则

## Priority 分类

### P1 紧急（仅通知，不自动修复）

- 5 分钟内 >10 events
- 影响 auth（登录/注册/JWT）
- 影响 sync（数据同步）
- 影响 payment（如未来有）
- Sentry level = "fatal"
- Vercel 部署失败

### P2 重要（自动修复 + PR 等待人工审核）

- 新 issue（first seen < 24h）
- Regression（之前 resolved 现在重新出现）
- 影响核心页面（dashboard, courses, predict）
- events > 5 但不满足 P1 条件

### P3 可观察（可自动修复 + 自动合并）

- 已知 pattern 的 transient 错误
- events <= 5
- 不影响核心功能
- 有明确的单文件修复方案

### Noise（忽略）

- 已被 before_send 过滤但仍出现
- ResizeObserver、ChunkLoadError、NetworkError
- Bot/crawler 触发的错误

## 自动修复红线

1. **绝不在 main 分支上 commit** — 始终创建 `fix/sentry-{id}` 分支
2. **修改 > 3 文件时停止** — 升级为 P1 等待人工
3. **验证循环必须全部通过** — build + test + lint + typecheck
4. **不修改测试来通过测试** — 只改源代码
5. **不修改 migration/schema** — DB 变更需要人工审核
6. **不修改 auth/security 代码** — 安全相关需要人工审核
7. **commit 前打 tag** — `pre-fix-{issue_id}` 方便 revert
