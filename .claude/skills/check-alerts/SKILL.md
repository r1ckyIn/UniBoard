# Check Alerts — 全自动告警处理管线

自动收集 Sentry/Vercel/Gmail 告警 → 分析根因 → 验证 → 写测试 → 修复 → 提交。

## Triggers

- "check alerts"、"检查告警"、"有没有新的 bug"、"Sentry 有什么"
- 定时执行：`/schedule create --cron "0 */4 * * *" --prompt "/check-alerts"`

## 执行流程

### Phase 1: Collect（收集告警）

**Spawn Agent: `collector`** — 只读，收集所有平台告警

```
Agent(name="collector", prompt="""
收集所有平台的未解决告警，输出结构化报告。

1. Sentry API（uniboard-api + uniboard-web）:
   - 查询 is:unresolved 的 issues
   - 对每个 issue 获取 title, level, event count, first/last seen, tags

2. Gmail（claude.ai Gmail MCP）:
   - 搜索 from:sentry OR from:vercel is:unread
   - 读取邮件内容提取关键信息
   - 标记已读

3. Vercel 部署状态:
   - gh api repos/r1ckyIn/UniBoard/deployments 最近 3 次
   - 检查是否有失败部署

输出格式：
ALERT_REPORT:
- issue_id: UNIBOARD-API-XX
  title: ...
  level: error/warning
  events: N
  first_seen: ...
  last_seen: ...
  transaction: /api/v1/xxx
  priority: P1/P2/P3 (按 rules/safety-gates.md 分类)
""")
```

### Phase 2: Triage（分类决策）

主进程根据 collector 报告分类：

| Priority | 判定条件 | 动作 |
|----------|---------|------|
| **P1 紧急** | 5min >10 events, 影响 auth/sync/payment | 通知用户，仅分析不自动修 |
| **P2 重要** | 新 issue / regression / 影响核心功能 | 分析 + 修复 + 创建 PR 等人工审核 |
| **P3 可观察** | 低频、已知、transient | 自动修复 + 自动合并（如适用） |
| **Noise** | 已被 before_send 过滤但仍上报 | 忽略，优化过滤规则 |

**P1 处理**：停止自动流程，输出报告给用户，等待指示。
**P2/P3 继续下一步**：

### Phase 3: Analyze（根因分析）

**Spawn Agent: `analyst`** — 只读，定位根因

```
Agent(name="analyst", prompt="""
根据 collector 的告警报告，分析每个 P2/P3 issue 的根因。

对每个 issue：
1. 从 Sentry 获取完整 stack trace 和 tags
2. 根据 transaction 路径定位源代码文件
3. 读取相关源代码，理解上下文
4. 分析错误模式（DB连接? API超时? 类型错误? 逻辑bug?）
5. 提出修复方案（具体到文件和行号）

输出格式：
ROOT_CAUSE:
- issue_id: UNIBOARD-API-XX
  file: src/xxx.py:42
  cause: 简要根因描述
  fix_plan: 具体修复步骤
  confidence: high/medium/low
  files_affected: [列表]
""")
```

### Phase 4: Verify Hypothesis（验证假设）

**Spawn Agent: `verifier`** — 只读，验证分析结论

```
Agent(name="verifier", prompt="""
验证 analyst 的根因分析是否正确。

对每个 ROOT_CAUSE：
1. 检查 fix_plan 的文件路径是否存在
2. 检查代码上下文是否与 stack trace 一致
3. 搜索是否有类似的已修复 pattern（git log）
4. 评估修复的 blast radius（影响几个文件）
5. 如果 blast radius > 3 files，降级为 P1（需人工）

输出格式：
VERIFICATION:
- issue_id: UNIBOARD-API-XX
  analyst_correct: true/false
  blast_radius: N files
  safe_to_auto_fix: true/false
  notes: ...
""")
```

### Phase 5: Test（写回归测试）

**Spawn Agent: `tester`** — 可写，写测试覆盖 bug

```
Agent(name="tester", prompt="""
为每个验证通过的 issue 写回归测试。

规则：
- 测试文件放在对应的 tests/unit/ 目录
- 测试名: test_{issue_id_lowercase}_regression
- 先写测试，确认测试在当前代码下 FAILS（红色）
- 只写测试，不修复代码

Python: pytest + pytest-asyncio
Frontend: vitest

运行验证：
- uv run python -m pytest tests/unit/test_xxx.py -x -q
- 确认测试失败（这是 TDD 的 RED 阶段）
""")
```

### Phase 6: Fix（修复）

**Spawn Agent: `fixer`** — 可写，实现修复

```
Agent(name="fixer", prompt="""
修复 bug 并通过测试。

规则：
1. 创建 fix 分支: fix/sentry-{issue_id}
2. 做最小修改修复 bug
3. 运行完整验证循环:
   - uv run python -m ruff check {files}
   - uv run python -m mypy {files} --strict
   - uv run python -m pytest tests/unit/ -x -q (排除 DB 依赖)
   - 前端: npx tsc --noEmit && npx eslint {files} --max-warnings 0
4. 全部通过后 commit:
   fix(sentry): {issue_title} [{issue_id}]
5. 推送分支，创建 PR

安全红线：
- 绝不在 main 上直接 commit
- 修改超过 3 个文件时停下来报告
- 不修改测试让测试通过（只改源代码）
""")
```

### Phase 7: Report（总结报告）

主进程汇总所有结果：

```
## Alert Processing Report [日期]

### Processed Issues
| Issue | Priority | Root Cause | Fix | PR |
|-------|----------|------------|-----|-----|
| API-XX | P2 | pool_pre_ping | ✅ Fixed | #61 |
| WEB-YY | P3 | ChunkLoad | ⏭ Filtered | - |
| API-ZZ | P1 | Auth crash | ⚠️ Needs human | - |

### Deployments
| Env | Status | SHA |
|-----|--------|-----|
| Production | ✅ | 2cbb608 |

### Actions
- 2 issues auto-fixed (PRs created)
- 1 issue escalated to user (P1)
- 3 noise events suppressed
```

## 安全门控

详见 `rules/safety-gates.md`

## 模式选择

| Flag | 行为 |
|------|------|
| `/check-alerts` | 默认：收集 + 分析 + 报告（不自动修复） |
| `/check-alerts --fix` | 完整流水线：包含自动修复 |
| `/check-alerts --dry-run` | 只收集告警，不分析 |
