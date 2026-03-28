# Phase 19: MCP Agent & Streaming - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 19-mcp-agent-streaming
**Areas discussed:** Streaming architecture, Deadline AI chat UX, MCP Agent vs DB context, Language preference

---

## Streaming Architecture

### SSE 粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 逐 token 流式（推荐） | 像 ChatGPT 一样逐字显示。用 Anthropic SDK 的 stream=True | ✓ |
| 分块流式 | 按句子或段落分块推送 | |
| 进度阶段式 | 推送阶段状态而非文本流 | |

**User's choice:** 逐 token 流式
**Notes:** None

### 前端 SSE 消费方式

| Option | Description | Selected |
|--------|-------------|----------|
| fetch + ReadableStream（推荐） | 更灵活，支持 POST 请求 | |
| EventSource API | 浏览器原生，只支持 GET | |
| 你来决定 | Claude 自行选择 | ✓ |

**User's choice:** 你来决定
**Notes:** Claude's discretion

### SSE 进度指示器

| Option | Description | Selected |
|--------|-------------|----------|
| 打字机 + 思考状态（推荐） | 先显示搜索/分析状态，然后逐字打出 AI 回答 | ✓ |
| 纯打字机效果 | 直接逐字显示，不显示状态 | |
| 你来决定 | Claude 自行设计 | |

**User's choice:** 打字机 + 思考状态
**Notes:** None

---

## Deadline AI Chat UX

### Chat 位置

| Option | Description | Selected |
|--------|-------------|----------|
| 右侧面板（推荐） | 复用 RightPanel 槽位 | |
| 底部抽屉 | 底部上拉 | |
| 全屏对话模式 | 全屏 AI 对话界面 | |
| 卡片内嵌（用户指定） | 嵌入在 deadline 详情卡片内部 | ✓ |

**User's choice:** 不是在卡片里面吗（附截图）
**Notes:** 用户提供了原型截图，展示 chat 嵌入在 deadline 详情卡片内部，位于"相关材料"下方。包含"材料已自动包含在上下文中"提示和"即将推出"占位标签。

### Chat 轮次

| Option | Description | Selected |
|--------|-------------|----------|
| 单轮问答（推荐） | 每次发问独立回答，不保留历史 | |
| 多轮对话 | 保留对话历史，能追问 | ✓ |
| 你来决定 | Claude 自行决定 | |

**User's choice:** 多轮对话
**Notes:** None

### Chat 历史

| Option | Description | Selected |
|--------|-------------|----------|
| 仅当前会话（推荐） | 对话历史只在当前打开卡片期间保留（React state） | ✓ |
| 持久化存储 | 对话历史存入 DB | |
| 你来决定 | Claude 自行判断 | |

**User's choice:** 仅当前会话
**Notes:** None

### Chat UI 展示

| Option | Description | Selected |
|--------|-------------|----------|
| 输入框上方气泡（推荐） | 问答以气泡形式展开，用户右对齐、AI 左对齐 | ✓ |
| 折叠式展开 | 在提问区下方展开回答区域 | |
| 你来决定 | Claude 自行设计 | |

**User's choice:** 输入框上方气泡
**Notes:** None

---

## MCP Agent vs DB Context

### AI 数据来源

| Option | Description | Selected |
|--------|-------------|----------|
| 纯 DB 上下文（推荐） | 用已同步到 Supabase 的数据 | |
| 实时 MCP 工具调用 | AI 通过 MCP tools 实时查询 Canvas/Ed API | |
| 混合模式 | DB 优先，数据不足时回退到 MCP 工具调用 | ✓ |

**User's choice:** 混合模式
**Notes:** 用户已有 canvasedmcp 仓库的 MCP 代码。DB 优先 + MCP 回退。

### Q&A 架构

| Option | Description | Selected |
|--------|-------------|----------|
| 同一套 QAService（推荐） | 复用已有 QAService，不同上下文 | ✓ |
| 分开独立服务 | 独立的 DeadlineChatService 和 QAService | |
| 你来决定 | Claude 自行决定 | |

**User's choice:** 同一套 QAService
**Notes:** Deadline chat 和 Course Q&A 都调 POST /courses/{id}/qa，只是上下文不同。

### MCP 回退路径

| Option | Description | Selected |
|--------|-------------|----------|
| Claude tool_use + 适配器（推荐） | 后端将适配器方法包装为 Anthropic tool definitions | |
| 直接调用适配器 | 后端确定性地调用适配器获取数据 | |
| MCP Client 连接 canvasedmcp | 后端作为 MCP client 连接用户的 MCP server | |
| 你来决定（最佳实践） | Claude 选择最佳方案 | ✓ |

**User's choice:** 选择最佳实践
**Notes:** 参考 /check-deadlines 斜杠命令实现，要求与斜杠命令一样的 agent 效果。

### MCP 回退触发

| Option | Description | Selected |
|--------|-------------|----------|
| DB 数据不足时 | token count 低于阈值自动回退 | |
| 用户显式请求 | 提供"搜索更多"按钮 | |
| 混合（两者皆可） | DB 不足自动回退 + 用户显式请求 | ✓ |

**User's choice:** 混合
**Notes:** None

---

## Language Preference (SET-LANG)

### Settings UI 位置

| Option | Description | Selected |
|--------|-------------|----------|
| 现有 Settings 新 section（推荐） | 添加"语言偏好"卡片，与 Notifications、GPA Target 并列 | ✓ |
| 合并到 Profile section | 在 Profile/Account 卡片内添加 | |
| 你来决定 | Claude 自行决定 | |

**User's choice:** 现有 Settings 新 section
**Notes:** None

### 语言范围

| Option | Description | Selected |
|--------|-------------|----------|
| AI 输出 + Digest（推荐） | 只影响 AI 生成的内容 | |
| 全局语言切换 | 同时影响界面 + AI 输出 | ✓ |
| 你来决定 | Claude 自行决定 | |

**User's choice:** 全局语言切换
**Notes:** 现有语言切换不足，所有地方能翻译的全部都要翻译：课程全称、unit outlines、deadline 名字、课程资料名字等。不能翻译的课程编号不用翻译。

### 动态内容翻译

| Option | Description | Selected |
|--------|-------------|----------|
| AI 批量翻译 + 缓存（推荐） | 同步时用 AI 翻译，存入 DB 的 name_zh 字段 | ✓ |
| 前端实时翻译 | 显示时调用 AI API 实时翻译 | |
| 你来决定 | Claude 自行选择 | |

**User's choice:** AI 批量翻译 + 缓存
**Notes:** None

---

## Claude's Discretion

- 前端 SSE 客户端实现方式
- MCP 回退具体技术路径
- AI 翻译批量大小和 prompt 设计
- Streaming 错误处理和重试策略

## Deferred Ideas

- Skill system auto-generation — Phase 20
- MCP Server for Claude Desktop — Phase 21
- Chat history DB persistence — future enhancement
