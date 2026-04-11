# Check Alerts - 自动监控管线

Sentry + Vercel 告警自动检查与分类。检查生产环境告警、Sentry 错误、Vercel 部署状态。

## Triggers

- "check alerts"、"检查告警"、"有没有新的 bug"、"Sentry 有什么新的"

## 方案优先级

### 方案 1: Sentry MCP（最优）

如果 Sentry MCP 已连接，直接使用 MCP tools 查询：

```
mcp__sentry__list_issues(project: "uniboard-api", query: "is:unresolved")
mcp__sentry__list_issues(project: "uniboard-web", query: "is:unresolved")
mcp__sentry__get_issue_details(issue_id: "...")
```

### 方案 2: Monitor 脚本

后台运行 Sentry 轮询脚本，流式输出告警：

```bash
SENTRY_AUTH_TOKEN=xxx ./scripts/sentry-monitor.sh 300
```

### 方案 3: Gmail MCP

检查 Gmail 中的 Sentry/Vercel 邮件：

```
mcp__gmail__gmail_search(query: "from:sentry OR from:vercel[bot] is:unread")
mcp__gmail__gmail_get_message(messageId: "...")
mcp__gmail__gmail_mark_read(messageId: "...")
```

## 分类规则

| 优先级 | 条件 | 动作 |
|--------|------|------|
| P1 紧急 | 5min 内 >10 events，影响 auth/sync | 立即修复，创建 fix branch |
| P2 重要 | 新 issue 或 regression | `/gsd:add-todo` |
| P3 观察 | 已知 issue，低频 | 标记已读 |
| Noise | transient DB/network | 忽略 |

## Vercel 部署状态

```bash
gh api repos/r1ckyIn/UniBoard/deployments --jq '.[0:3] | .[] | {env: .environment, state: .state, created: .created_at}'
```

## 定时自动化

使用 `/schedule` 创建定时 remote agent：

```
/schedule create --cron "0 */4 * * *" --prompt "Run /check-alerts and report findings"
```

## 环境要求

- Sentry MCP: `claude mcp add sentry -e SENTRY_AUTH_TOKEN=xxx -- npx -y @sentry/mcp-server`
- Gmail MCP: 需要 OAuth 认证（`cd ~/.gmail-mcp && npm run auth`）
- Vercel: `gh` CLI 已安装且认证
