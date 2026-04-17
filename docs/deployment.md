# UniBoard Production Deployment Guide

[English](#english) | [中文](#中文)

---

## English

### Architecture

UniBoard uses a three-service production architecture:

- **Supabase** (managed) -- PostgreSQL database + Auth (JWT issuance, session management)
- **Railway** (Python FastAPI) -- Backend API, platform adapters, sync engine, MCP/AI logic
- **Vercel** (Next.js) -- Frontend UI, static assets, server-side rendering

```
Browser → Vercel (Next.js) → Railway (FastAPI) → Supabase (PostgreSQL + Auth)
```

The frontend authenticates users via Supabase Auth (supabase-js) and sends the Supabase JWT to the Python backend for all data queries.

### Prerequisites

Before deploying, ensure you have:

- A **Supabase** project (free tier works for development)
- A **Railway** account with a linked GitHub repository
- A **Vercel** account with a linked GitHub repository
- A **Sentry** account (optional, for error tracking)
- An **Anthropic** API key (required for AI features)
- A **Voyage AI** API key (required for RAG/embeddings)

### Railway (Python Backend)

#### Setup Steps

1. Create a new project on [Railway](https://railway.app)
2. Link your GitHub repository (the one containing this codebase)
3. Railway auto-detects `railway.toml` in the project root and builds from `Dockerfile.production`
4. The Dockerfile uses a multi-stage build with tini (PID 1) and a non-root user for security
5. Set all environment variables listed below in the Railway dashboard

#### Environment Variables

| Variable | Required | Source | Example |
|----------|----------|--------|---------|
| `DATABASE_URL` | Yes | Supabase Dashboard -> Settings -> Database -> Connection string (change `postgresql://` to `postgresql+asyncpg://`) | `postgresql+asyncpg://postgres:xxx@db.xxx.supabase.co:5432/postgres` |
| `SUPABASE_URL` | Yes | Supabase Dashboard -> Settings -> API -> Project URL | `https://xxx.supabase.co` |
| `SUPABASE_JWT_SECRET` | Yes | Supabase Dashboard -> Settings -> API -> JWT Settings -> JWT Secret | 64+ character string |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Dashboard -> Settings -> API -> service_role key | `eyJhbG...` |
| `ENCRYPTION_KEY` | Yes | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` | 64-character hex string |
| `ANTHROPIC_API_KEY` | Yes (AI) | Anthropic Console -> API Keys | `sk-ant-...` |
| `VOYAGE_API_KEY` | Yes (RAG) | Voyage AI Dashboard -> API Keys | `pa-...` |
| `SENTRY_DSN` | Optional | Sentry Dashboard -> Settings -> Client Keys (DSN) | `https://xxx@o123.ingest.sentry.io/456` |
| `CORS_ORIGINS` | Yes | Your Vercel production URL | `https://uniboard.vercel.app` |
| `DEBUG` | Yes | Always `false` in production | `false` |
| `PORT` | Auto | Injected by Railway automatically -- do not set manually | (auto-injected) |

**Production Validation:** When `DEBUG=false`, the application validates on startup that:
- `SUPABASE_JWT_SECRET` is not using a known default value
- `ENCRYPTION_KEY` is not empty or using a known default
- `DATABASE_URL` does not point to localhost

If any validation fails, the application refuses to start with a clear error message. See `src/config.py` `model_post_init` for details.

#### Optional Environment Variables

These have sensible defaults but can be overridden:

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `CORS_ORIGINS` | `http://localhost:3001` | Comma-separated allowed origins |
| `AI_DAILY_LIMIT_PER_USER` | `100` | Max AI requests per user per day |
| `SYNC_GRADES_INTERVAL_MIN` | `15` | Grade sync interval in minutes |
| `SYNC_DEADLINES_INTERVAL_MIN` | `60` | Deadline sync interval in minutes |
| `SES_SENDER_EMAIL` | `digest@uniboard.uk` | Email sender address for digest notifications |
| `SES_REGION` | `ap-southeast-2` | AWS SES region |
| `EMAIL_NOTIFICATIONS_ENABLED` | `true` | Enable/disable email notifications |

### Vercel (Next.js Frontend)

#### Setup Steps

1. Create a new project on [Vercel](https://vercel.com)
2. Link your GitHub repository
3. Set **Framework Preset** to "Next.js"
4. Set **Root Directory** to `frontend`
5. Build command: `pnpm build` (Vercel auto-detects from package.json)
6. Set all environment variables listed below in the Vercel dashboard

#### Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same as Railway's `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase Dashboard -> Settings -> API -> anon/public key |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (e.g., `https://api.uniboard.uk/api/v1`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Sentry Dashboard -> Settings -> Client Keys (DSN) -- use a separate Sentry project from backend |
| `SENTRY_AUTH_TOKEN` | Optional | Sentry Dashboard -> Settings -> Auth Tokens (for source map upload) |
| `SENTRY_ORG` | Optional | Sentry organization slug |
| `SENTRY_PROJECT` | Optional | Sentry project slug |

#### Note on Mock Data

17 of 29 frontend API route handlers currently serve mock data from local fixtures. In production, these Route Handlers need to be converted to proxy the Python API. This is a known architectural decision documented in the codebase -- the Route Handlers serve as a BFF (Backend-for-Frontend) layer that was built in Phase 2 with OpenAPI contracts. Production proxying is planned for a future phase.

### Health Check

The `/health` endpoint returns:
- **200 OK** when the application is healthy
- **503 Service Unavailable** when a dependency (database, external API) is degraded

Railway monitors this endpoint per the `railway.toml` configuration:
- Path: `/health`
- Timeout: 120 seconds
- Restart policy: ON_FAILURE with max 3 retries

### Supabase Setup

1. Create a project on [Supabase](https://supabase.com)
2. Run database migrations: `supabase db push` (from the project root with Supabase CLI installed)
3. The schema includes 15 tables with 60+ RLS policies for per-user data isolation
4. Note the following values from Supabase Dashboard -> Settings -> API:
   - **Project URL** (for `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
   - **service_role key** (for `SUPABASE_SERVICE_ROLE_KEY`)
   - **JWT Secret** (for `SUPABASE_JWT_SECRET`)
5. From Settings -> Database, note the **Connection string** and convert `postgresql://` to `postgresql+asyncpg://` for `DATABASE_URL`

### Troubleshooting

**Railway deploy fails with health check timeout**
- Verify `DEBUG=false` is set (required for production validation)
- Verify all required environment variables are present and non-empty
- Check Railway deploy logs for startup errors (config validation failure messages)
- The health check timeout is 120 seconds -- if the app takes longer to start, increase `healthcheckTimeout` in `railway.toml`

**Frontend API calls fail (404 or network errors)**
- Verify `NEXT_PUBLIC_API_URL` in Vercel points to the Railway backend URL
- Verify `CORS_ORIGINS` in Railway includes the Vercel production URL (e.g., `https://uniboard.vercel.app`)
- Check browser DevTools Network tab for CORS errors

**Sentry not receiving events**
- Verify the CSP `connect-src` header allows `*.ingest.sentry.io` (configured in Phase 26 Plan 03)
- Verify the Sentry DSN is correct and the project is active
- Check browser console for CSP violation warnings

**Database connection errors**
- Verify `DATABASE_URL` uses `postgresql+asyncpg://` prefix (not `postgresql://`)
- Verify the Supabase project is active and not paused (free tier pauses after inactivity)
- Check Railway logs for SQLAlchemy connection errors

**Authentication failures**
- Verify `SUPABASE_JWT_SECRET` in Railway matches the Supabase project's JWT secret
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are correct
- JWT tokens expire -- ensure the frontend refreshes sessions via supabase-js

---

## 中文

### 架构

UniBoard 使用三服务生产架构：

- **Supabase**（托管）-- PostgreSQL 数据库 + Auth（JWT 签发、会话管理）
- **Railway**（Python FastAPI）-- 后端 API、平台适配器、同步引擎、MCP/AI 逻辑
- **Vercel**（Next.js）-- 前端 UI、静态资源、服务端渲染

```
浏览器 → Vercel (Next.js) → Railway (FastAPI) → Supabase (PostgreSQL + Auth)
```

前端通过 Supabase Auth (supabase-js) 进行用户认证，并将 Supabase JWT 发送到 Python 后端进行所有数据查询。

### 前置条件

部署前请确保具备：

- **Supabase** 项目（免费版可用于开发）
- **Railway** 账户并关联 GitHub 仓库
- **Vercel** 账户并关联 GitHub 仓库
- **Sentry** 账户（可选，用于错误追踪）
- **Anthropic** API 密钥（AI 功能必需）
- **Voyage AI** API 密钥（RAG/嵌入必需）

### Railway（Python 后端）

#### 设置步骤

1. 在 [Railway](https://railway.app) 创建新项目
2. 关联你的 GitHub 仓库（包含本代码库的仓库）
3. Railway 自动检测项目根目录的 `railway.toml` 并使用 `Dockerfile.production` 构建
4. Dockerfile 使用多阶段构建，包含 tini（PID 1）和非 root 用户以确保安全
5. 在 Railway 仪表板中设置以下所有环境变量

#### 环境变量

| 变量 | 必需 | 来源 | 示例 |
|------|------|------|------|
| `DATABASE_URL` | 是 | Supabase Dashboard -> Settings -> Database -> 连接字符串（将 `postgresql://` 改为 `postgresql+asyncpg://`） | `postgresql+asyncpg://postgres:xxx@db.xxx.supabase.co:5432/postgres` |
| `SUPABASE_URL` | 是 | Supabase Dashboard -> Settings -> API -> Project URL | `https://xxx.supabase.co` |
| `SUPABASE_JWT_SECRET` | 是 | Supabase Dashboard -> Settings -> API -> JWT Settings -> JWT Secret | 64+ 字符字符串 |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | Supabase Dashboard -> Settings -> API -> service_role key | `eyJhbG...` |
| `ENCRYPTION_KEY` | 是 | 生成命令：`python -c "import secrets; print(secrets.token_hex(32))"` | 64 字符十六进制字符串 |
| `ANTHROPIC_API_KEY` | 是（AI） | Anthropic Console -> API Keys | `sk-ant-...` |
| `VOYAGE_API_KEY` | 是（RAG） | Voyage AI Dashboard -> API Keys | `pa-...` |
| `SENTRY_DSN` | 可选 | Sentry Dashboard -> Settings -> Client Keys (DSN) | `https://xxx@o123.ingest.sentry.io/456` |
| `CORS_ORIGINS` | 是 | 你的 Vercel 生产 URL | `https://uniboard.vercel.app` |
| `DEBUG` | 是 | 生产环境始终设为 `false` | `false` |
| `PORT` | 自动 | Railway 自动注入 -- 无需手动设置 | （自动注入） |

**生产验证：** 当 `DEBUG=false` 时，应用启动时会验证：
- `SUPABASE_JWT_SECRET` 未使用已知默认值
- `ENCRYPTION_KEY` 非空且未使用已知默认值
- `DATABASE_URL` 不指向 localhost

如果验证失败，应用将拒绝启动并显示明确的错误信息。详见 `src/config.py` 中的 `model_post_init`。

#### 可选环境变量

这些变量有合理的默认值，但可以覆盖：

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `LOG_LEVEL` | `INFO` | 日志级别（`DEBUG`、`INFO`、`WARNING`、`ERROR`） |
| `CORS_ORIGINS` | `http://localhost:3001` | 逗号分隔的允许来源 |
| `AI_DAILY_LIMIT_PER_USER` | `100` | 每用户每日最大 AI 请求数 |
| `SYNC_GRADES_INTERVAL_MIN` | `15` | 成绩同步间隔（分钟） |
| `SYNC_DEADLINES_INTERVAL_MIN` | `60` | 截止日期同步间隔（分钟） |
| `SES_SENDER_EMAIL` | `digest@uniboard.uk` | 摘要通知的发件人地址 |
| `SES_REGION` | `ap-southeast-2` | AWS SES 区域 |
| `EMAIL_NOTIFICATIONS_ENABLED` | `true` | 启用/禁用邮件通知 |

### Vercel（Next.js 前端）

#### 设置步骤

1. 在 [Vercel](https://vercel.com) 创建新项目
2. 关联你的 GitHub 仓库
3. 将 **Framework Preset** 设为 "Next.js"
4. 将 **Root Directory** 设为 `frontend`
5. 构建命令：`pnpm build`（Vercel 从 package.json 自动检测）
6. 在 Vercel 仪表板中设置以下所有环境变量

#### 环境变量

| 变量 | 必需 | 来源 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | 与 Railway 的 `SUPABASE_URL` 相同 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 是 | Supabase Dashboard -> Settings -> API -> anon/public key |
| `NEXT_PUBLIC_API_URL` | 是 | 后端 API URL（例如 `https://api.uniboard.uk/api/v1`） |
| `NEXT_PUBLIC_SENTRY_DSN` | 可选 | Sentry Dashboard -> Settings -> Client Keys (DSN) -- 使用与后端不同的 Sentry 项目 |
| `SENTRY_AUTH_TOKEN` | 可选 | Sentry Dashboard -> Settings -> Auth Tokens（用于 source map 上传） |
| `SENTRY_ORG` | 可选 | Sentry 组织 slug |
| `SENTRY_PROJECT` | 可选 | Sentry 项目 slug |

#### Mock 数据说明

29 个前端 API 路由处理程序中有 17 个目前从本地 fixture 提供 mock 数据。在生产环境中，这些 Route Handler 需要转换为代理 Python API。这是代码库中记录的已知架构决策 -- Route Handler 充当 BFF（Backend-for-Frontend）层，在 Phase 2 中根据 OpenAPI 合约构建。生产代理计划在未来 phase 中实现。

### 健康检查

`/health` 端点返回：
- **200 OK** -- 应用健康
- **503 Service Unavailable** -- 依赖项（数据库、外部 API）降级

Railway 根据 `railway.toml` 配置监控此端点：
- 路径：`/health`
- 超时：120 秒
- 重启策略：ON_FAILURE，最多重试 3 次

### Supabase 设置

1. 在 [Supabase](https://supabase.com) 创建项目
2. 运行数据库迁移：`supabase db push`（在项目根目录下，需安装 Supabase CLI）
3. Schema 包含 15 张表和 60+ 条 RLS 策略，实现按用户数据隔离
4. 从 Supabase Dashboard -> Settings -> API 记录以下值：
   - **Project URL**（用于 `SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_URL`）
   - **anon/public key**（用于 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`）
   - **service_role key**（用于 `SUPABASE_SERVICE_ROLE_KEY`）
   - **JWT Secret**（用于 `SUPABASE_JWT_SECRET`）
5. 从 Settings -> Database 记录**连接字符串**，将 `postgresql://` 转换为 `postgresql+asyncpg://` 作为 `DATABASE_URL`

### 故障排除

**Railway 部署因健康检查超时而失败**
- 确认 `DEBUG=false` 已设置（生产验证所必需）
- 确认所有必需环境变量已设置且非空
- 检查 Railway 部署日志中的启动错误（配置验证失败信息）
- 健康检查超时为 120 秒 -- 如果应用启动时间更长，增加 `railway.toml` 中的 `healthcheckTimeout`

**前端 API 调用失败（404 或网络错误）**
- 确认 Vercel 中的 `NEXT_PUBLIC_API_URL` 指向 Railway 后端 URL
- 确认 Railway 中的 `CORS_ORIGINS` 包含 Vercel 生产 URL（例如 `https://uniboard.vercel.app`）
- 检查浏览器 DevTools 网络标签中的 CORS 错误

**Sentry 未收到事件**
- 确认 CSP `connect-src` 头允许 `*.ingest.sentry.io`（在 Phase 26 Plan 03 中配置）
- 确认 Sentry DSN 正确且项目处于活跃状态
- 检查浏览器控制台中的 CSP 违规警告

**数据库连接错误**
- 确认 `DATABASE_URL` 使用 `postgresql+asyncpg://` 前缀（非 `postgresql://`）
- 确认 Supabase 项目处于活跃状态且未暂停（免费版在不活跃后会暂停）
- 检查 Railway 日志中的 SQLAlchemy 连接错误

**认证失败**
- 确认 Railway 中的 `SUPABASE_JWT_SECRET` 与 Supabase 项目的 JWT secret 匹配
- 确认 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 正确
- JWT token 会过期 -- 确保前端通过 supabase-js 刷新会话

---

## License

MIT License
