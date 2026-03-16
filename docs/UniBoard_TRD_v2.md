# UniBoard TRD v2.5 — 技术需求文档

> **项目名称**: UniBoard
> **文档类型**: TRD (Technical Requirements Document)
> **版本**: 2.5
> **日期**: 2026-03-03
> **作者**: Ricky
> **GitHub**: https://github.com/r1ckyIn/uniboard
> **关联文档**: UniBoard BRD v2.4（业务需求文档）

---

## 1. 技术概述

### 1.1 系统定位

UniBoard 技术上分为两层：

- **MCP 层（数据采集引擎）**: 基于 Model Context Protocol 的工具集，负责从 Canvas LMS 和 Ed (Discussion + Lessons) 两个平台采集数据。可独立运行于 Claude Desktop，也为 Web Dashboard 提供数据源。
- **Web Dashboard 层（用户界面）**: 面向学生的 Web 应用，提供 GPA 追踪、课件聚合、信息情报、AI 助手等功能。

### 1.2 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 前端 | Next.js + S3/CloudFront | React 生态，SSR/SSG 支持 |
| 后端 | AWS Lambda (Python 3.12+) | Serverless，按需计费，与 AWS 认证学习路径一致 |
| API 网关 | AWS API Gateway | RESTful API，与 Lambda 集成 |
| 数据库 | RDS PostgreSQL (t3.micro) | 关系型数据，Free Tier 750h/月 |
| 认证 | AWS Cognito | 用户注册/登录，JWT Token，50000 MAU 免费 |
| 文件存储 | S3 | 课件缓存 + 前端静态托管 |
| CDN | CloudFront | 前端加速，1TB/月免费 |
| 邮件 | SES | 推送摘要邮件，62000封/月免费 |
| 密钥管理 | Secrets Manager | 存储单个主加密密钥，$0.40/月 |
| 缓存 | RDS 缓存表 | Lambda 无状态不适合 Redis；API 响应/同步数据缓存在 RDS 表中，Unit Outline 等低频数据直接数据库缓存 |
| 定时任务 | EventBridge + Lambda | 定时同步 Canvas/Ed 数据 |
| 监控 | CloudWatch | 日志和监控，基础免费 |
| IaC | CDK (Python) | 基础设施即代码，与后端同语言，AWS 原生 |

**预估月成本（100 用户以内）**: < $5/月（基本在 AWS Free Tier 范围内）

---

## 2. MCP 工具规格

### 2.1 现有工具

#### Canvas API 工具

| 工具名 | 功能 | 状态 | Canvas API 端点 |
|--------|------|------|----------------|
| `canvas_list_courses` | 获取当前注册的课程列表 | ✅ 已实现 | `GET /api/v1/courses?enrollment_state=active` |
| `canvas_list_assignments` | 获取课程作业和截止日期 | ✅ 已实现 | `GET /api/v1/courses/:id/assignments` |
| `canvas_list_announcements` | 获取课程公告 | ✅ 已实现 | `GET /api/v1/announcements?context_codes[]=course_:id` |

#### Ed Discussion API 工具

| 工具名 | 功能 | 状态 | Ed API 端点 |
|--------|------|------|------------|
| `ed_list_courses` | 获取 Ed 课程列表 | ✅ 已实现 | `GET /api/courses` |
| `ed_list_threads` | 获取讨论帖列表 | ✅ 已实现 | `GET /api/courses/:id/threads` |
| `ed_get_thread` | 获取单个帖子详情 | ✅ 已实现 | `GET /api/threads/:id` |
| `ed_search_threads` | 搜索讨论帖 | ✅ 已实现 | `GET /api/courses/:id/threads?search=...` |

### 2.2 需新增工具 — Canvas API

#### `canvas_list_modules` (P0)

```
功能: 获取课程的模块列表（周次/主题结构）
端点: GET /api/v1/courses/:course_id/modules
参数:
  - course_id (required): Canvas 课程 ID
  - include[] (optional): "items" — 内联返回模块项目，减少请求次数
  - search_term (optional): 搜索模块名称
返回: Module[]
  - id: int
  - name: string (例: "Week 1 - Introduction")
  - position: int
  - items_count: int
  - items_url: string
  - items: ModuleItem[] (当 include[]=items 时)
认证: Bearer Token (Canvas API Token)
分页: Link header 分页
```

#### `canvas_list_module_items` (P0)

```
功能: 获取模块内的项目列表（课件/页面/文件/作业链接）
端点: GET /api/v1/courses/:course_id/modules/:module_id/items
参数:
  - course_id (required): Canvas 课程 ID
  - module_id (required): 模块 ID
  - include[] (optional): "content_details" — 包含截止日期等详情
返回: ModuleItem[]
  - id: int
  - title: string
  - type: "File" | "Page" | "Discussion" | "Assignment" | "Quiz" | "ExternalUrl" | "ExternalTool"
  - content_id: int (对应资源的 ID)
  - html_url: string (Canvas 页面 URL)
  - url: string (API URL，可用于获取详情)
  - external_url: string (ExternalUrl 类型时的外部链接)
```

#### `canvas_get_grades` (P0)

```
功能: 获取当前用户在指定课程中的成绩
端点: GET /api/v1/courses/:course_id/enrollments?user_id=self
       或 GET /api/v1/users/self/enrollments?type[]=StudentEnrollment
参数:
  - course_id (optional): 指定课程，不传则返回所有课程
  - include[] (optional): "current_points" — 包含当前得分
返回: Enrollment[]
  - course_id: int
  - grades:
    - current_score: float (按已评分项计算的百分比)
    - final_score: float (按所有项计算的百分比，未交的算 0)
    - current_grade: string (字母等级)
备注: 
  - current_score 更有参考价值（只算已出分的）
  - final_score 假设未提交的得 0 分
  - 需要额外请求 assignment groups 获取权重: 
    GET /api/v1/courses/:id/assignment_groups
```

#### `canvas_get_unit_outline_url` (P0) ✅ 已验证

```
功能: 获取课程的 Unit Outline 外部链接（悉大官网 URL）
端点: 两步获取
  Step 1: GET /api/v1/courses/:course_id/tabs
  Step 2: GET /api/v1/courses/:course_id/external_tools/:tool_id
参数:
  - course_id (required): Canvas 课程 ID
流程 (已验证):
  1. GET /courses/{id}/tabs → 查找 "Unit Outline" in label 的 tab
     - label 变体: "Unit Outline" / "Unit Outline (COMP2017)" / "Unit Outline (COMP9017)"
     - 使用模糊匹配: label.startswith("Unit Outline") 或 "Unit Outline" in label
     - tab type 均为 "external"
  2. 从 tab.id 字段提取 tool_id (格式: "context_external_tool_{tool_id}")
  3. GET /courses/{id}/external_tools/{tool_id} → 读取 custom_fields.url
     - custom_fields 结构: {"seams": "outline", "url": "https://sydney.edu.au/units/...", "seams_outline": "..."}
     - custom_fields.url 即为悉大 Unit Outline 的直接 URL
  4. 调用 fetch_unit_outline 解析该 URL
备注:
  - Canvas 中的 Unit Outline 本质是 LTI External Tool，但无需 sessionless_launch 或 LTI 流程，URL 直接在 external_tools 配置的 custom_fields.url 中
  - URL 格式: https://sydney.edu.au/units/{UNIT_CODE}/{YEAR}-{SESSION}-{MODE}-{CAMPUS}
  - 示例: https://sydney.edu.au/units/COMP3221/2026-S1C-ND-CC
```

#### `fetch_unit_outline` (P0) ✅ 已验证

```
功能: 抓取并解析悉尼大学 Unit Outline HTML 页面，提取评分结构
输入: unit_outline_url (string) — 从 canvas_get_unit_outline_url 获取的 URL
提取内容:
  - assessment_structure: AssessmentItem[]
    - name: string (评估名称，如 "Assignment 1", "Final Exam")
    - weight: float (权重百分比，如 0.30 代表 30%)
    - description: string (作业描述)
    - due_date: date (nullable) (截止日期)
    - length: string (评估时长)
    - ai_policy: string (AI 使用政策)
  - learning_outcomes: string[] (课程学习目标)
  - course_description: string (课程描述)
技术方案:
  - 使用 aiohttp 获取 HTML（无需认证，直接 HTTP GET）
  - 使用 BeautifulSoup4 确定性解析，核心选择器:
    - #assessment-table — 评分结构主表 (table.table-striped.table-bordered)
    - .assessment-weight — 权重百分比
    - .assessment-type — 评估类型列
    - .assessment-due — 截止日期列
    - .assessment-length — 评估时长
    - .assessment-description — 评估描述
    - .assessment-use-of-ai — AI 使用政策
    - .assessmentSummary — 评估摘要文本
    - #assessmentDetails — 详细评估信息
  - 表格行交替: 数据行 (name/weight/due/length/ai) 和 outcome 行，解析时跳过 outcome 行
  - 不依赖 AI 推断 — 纯结构化 HTML 解析
  - 解析失败时 fallback: 返回原始 HTML 供人工查看
  - 缓存策略: Unit Outline 每学期变化一次，首次抓取后缓存整学期
已验证:
  - ✅ DOM 结构: #assessment-table 选择器在所有课程中统一
  - ✅ 无需登录: 直接 curl 即可获取完整 HTML
  - ✅ 跨院系一致: 5 个课程 3 个院系（CS/Education/Math）使用完全相同的 DOM 结构，单一解析器即可
  - ✅ 无反爬机制: 无 Cloudflare Challenge，无速率限制，CloudFront CDN 有 300s 缓存
  - ✅ robots.txt 无 /units/ 限制（但仍建议礼貌爬取，1s 间隔）
```

#### `canvas_list_files` (P1)

```
功能: 获取课程文件列表
端点: GET /api/v1/courses/:course_id/files
参数:
  - course_id (required)
  - content_types[] (optional): 过滤文件类型，如 "application/pdf"
  - sort (optional): "name" | "size" | "created_at" | "updated_at"
  - search_term (optional): 搜索文件名
返回: File[]
  - id: int
  - display_name: string
  - content-type: string
  - size: int (bytes)
  - url: string (下载链接，需要认证)
  - created_at: datetime
```

#### `canvas_get_file_content` (P1)

```
功能: 下载/读取指定文件内容
端点: GET /api/v1/files/:file_id
返回: File 对象 (包含 url 字段用于下载)
备注: 
  - 实际下载需要跟随 url 重定向
  - PDF 文件需要额外解析（PyPDF2 / pdfplumber）
  - 需考虑文件大小限制
```

#### `canvas_list_pages` (P1)

```
功能: 获取课程 Wiki 页面列表
端点: GET /api/v1/courses/:course_id/pages
参数:
  - sort (optional): "title" | "created_at" | "updated_at"
  - search_term (optional): 搜索页面标题
返回: Page[]
  - page_id: int
  - url: string (page slug)
  - title: string
  - created_at: datetime
  - updated_at: datetime
```

#### `canvas_get_page` (P1)

```
功能: 获取指定页面的完整内容
端点: GET /api/v1/courses/:course_id/pages/:url_or_id
返回: Page
  - title: string
  - body: string (HTML 内容)
  - updated_at: datetime
备注: body 为 HTML 格式，需要解析提取文本
```

#### `canvas_list_calendar` (P2)

```
功能: 获取日历事件和截止日期
端点: GET /api/v1/calendar_events
参数:
  - type (optional): "event" | "assignment"
  - start_date, end_date (optional): 日期范围
  - context_codes[] (optional): "course_12345" 过滤课程
返回: CalendarEvent[]
```

#### `canvas_get_syllabus` (P2)

```
功能: 获取课程大纲
端点: GET /api/v1/courses/:course_id?include[]=syllabus_body
返回: Course (包含 syllabus_body 字段，HTML 格式)
```

### 2.3 需新增工具 — Ed API

#### `ed_list_lessons` (P0) ✅ 已验证

```
功能: 获取课程的 Ed Lessons 列表（含 Modules 分组）
端点: GET /api/courses/:course_id/lessons
认证: Bearer Token (与 Ed Discussion 共用，Token 从 edstem.org/settings/api-tokens 获取)
Base URL: https://edstem.org/api
返回: {"lessons": Lesson[], "modules": Module[]}
  Lesson 字段:
  - id, title, course_id, module_id, number, index
  - kind: string ("content")
  - state: string ("active")
  - status: string ("attempted")
  - slide_count: int
  - is_hidden, is_unlisted, is_timed, timer_duration
  - available_at, due_at, locked_at, solutions_at
  - effective_available_at, effective_due_at, effective_locked_at, effective_solutions_at
  - slides: [] (列表接口中 slides 为空数组，需调用详情接口获取完整内容)
  Module 字段:
  - id, course_id, user_id, name, created_at, updated_at
备注:
  - due_at 字段可作为 Deadline 数据源（部分课程教师会设置 Lesson 截止日期）
  - slides 数组在列表接口中为空，完整内容需通过 ed_get_lesson 获取
```

#### `ed_get_lesson` (P0) ✅ 已验证

```
功能: 获取单个 Lesson 的详情（包含完整内联 Slides）
端点: GET /api/lessons/:lesson_id
认证: Bearer Token（同上）
返回: {"lesson": Lesson}
  Lesson 字段: 同 ed_list_lessons，但 slides 数组包含完整内容
  Slide 字段:
  - id, original_id, lesson_id, user_id, course_id
  - type: "document" | "code" (document=文本内容, code=代码挑战)
  - title: string
  - index: int
  - content: string (XML 格式，<document version="2.0">，与 Ed Discussion 的 document 字段使用相同 XML 方言)
  - is_hidden: bool
  - challenge_id: int (仅 code 类型 slide)
  - status, correct, response
  - created_at, updated_at
关键修正:
  - ✅ Slide 内容字段名为 content（非 hschafer/edstem 中的 passage）
  - ✅ Slides 已完整内联在 Lesson 详情中，不需要单独的 slides 列表端点
  - ✅ XML 格式与 Ed Discussion 一致，可复用 parse_ed_document()
  - ✅ 50 次快速请求无 429，速率限制远宽于 Canvas
```

#### ~~`ed_get_lesson_slides`~~ — 不需要 ✅ 已验证

```
结论: Lesson 详情 API 已包含完整 Slide 内容（content 字段），不需要单独的工具。
      GET /api/lessons/slides/:slide_id 端点存在且可用，但仅在需要获取单个 Slide 时使用，
      正常场景下 ed_get_lesson 已足够。
```

#### `ed_list_threads` 参数增强 (P1) ✅ 已验证

```
说明: 以下功能通过增强现有 ed_list_threads 工具的参数实现，不需要新建工具
端点: GET /api/courses/:course_id/threads
新增参数:
  - filter: "unread" | "unanswered" | "starred" (注意: 不支持按 type 筛选)
  - category: string (大小写敏感，课程特定，如 "General", "Lectures", "Labs")
  - sort: "new" | "old" | "top" | "hot" (默认 "new")
  - offset: int (分页偏移，0-based)
  - limit: int (每页数量)
  - search: string (搜索关键词，可与其他参数组合)
组合示例:
  - ?filter=unread&category=General — 只看 General 类别的未读帖子
  - ?sort=top&limit=10 — 按投票数排序取前 10
  - ?category=Lectures&search=exam — 在 Lectures 类别中搜索 exam
关键发现:
  - categories 是课程特定的（由教师设置），无 API 列出可用类别
  - filter 参数不支持按 thread type（question/post/announcement）筛选
  - 帖子包含 user.course_role 字段（student/staff/admin），可用于信息情报模块识别教师帖子
  - 帖子状态标记: is_endorsed, is_staff_answered, is_student_answered, is_pinned,
    is_answered, is_locked, is_archived, is_seen, is_starred
API 技术细节:
  - Ed API base URL 统一为 edstem.org/api，不区分区域（无 au.edstem.org 等子域名）
  - Ed 官方无公开 API 文档，端点通过 hschafer/edstem 开源库 + curl 实测确认（详见 §9）
```

### 2.4 工具边界 — 明确不实现

| 工具 | 原因 |
|------|------|
| `ed_create_thread` | BRD 明确：只读不写，防止垃圾信息 |
| `ed_reply_thread` | 同上 |
| `ed_create_comment` | 同上 |
| `canvas_submit_assignment` | 学术诚信风险 |
| `canvas_take_quiz` | 学术诚信风险 |

---

## 3. 系统架构

### 3.1 整体架构图

```
┌────────────────────────────────────────────────────────────┐
│                      用户接入层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Web Browser  │  │ Claude Desktop│  │  Email Client    │  │
│  │  (Dashboard)  │  │  (MCP 模式)   │  │  (推送摘要)      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘  │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │ HTTPS            │ MCP/stdio        │ SMTP
┌─────────▼──────────────────▼──────────────────▼─────────────┐
│                      应用层                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    API / MCP Server                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ GPA      │ │ 课件     │ │ 信息     │ │ AI       │  │  │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │  │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │  │
│  │       └──────┬──────┘──────┬─────┘──────┬─────┘        │  │
│  │              ▼             ▼            ▼               │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │           Platform Adapter Layer                  │  │  │
│  │  │  ┌────────────┐  ┌──────────────┐  ┌──────────┐  │  │  │
│  │  │  │ Canvas     │  │ Ed Discussion│  │ Ed       │  │  │  │
│  │  │  │ Adapter    │  │ Adapter      │  │ Lessons  │  │  │  │
│  │  │  │            │  │ (只读)       │  │ Adapter  │  │  │  │
│  │  │  └─────┬──────┘  └──────┬───────┘  └────┬─────┘  │  │  │
│  │  └────────┼─────────────────┼────────────────┼───────┘  │  │
│  └───────────┼─────────────────┼────────────────┼──────────┘  │
└──────────────┼─────────────────┼────────────────┼─────────────┘
               │ HTTPS           │ HTTPS          │ HTTPS
   ┌───────────▼────┐  ┌────────▼──────┐  ┌─────▼──────────┐
   │ Canvas LMS API │  │ Ed Discussion │  │ Ed Lessons API │
   │ (sydney.edu.au)│  │ API (edstem)  │  │ (edstem)       │
   └───────┬────────┘  └───────────────┘  └────────────────┘
           │ (Canvas Tab → 外部链接)
   ┌───────▼────────────┐
   │ 悉大官网            │
   │ Unit Outline HTML  │
   │ (sydney.edu.au)    │
   └────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                      数据层                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Database │  │ File     │  │ Secret   │  │ Cache    │   │
│  │ (用户/   │  │ Storage  │  │ Manager  │  │ (RDS     │   │
│  │  成绩/   │  │ (课件    │  │ (主密钥)  │  │  缓存表)  │   │
│  │  推送)   │  │  缓存)   │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Platform Adapter 抽象层

为支持未来扩展到 Moodle、Blackboard 等 LMS 平台，数据访问层必须抽象化。

```python
from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime

# ──────────── 抽象接口 ────────────

class LMSAdapter(ABC):
    """学习管理系统适配器 — 负责课程、成绩、模块、文件"""
    
    @abstractmethod
    async def get_courses(self) -> list[Course]: ...
    
    @abstractmethod
    async def get_modules(self, course_id: str) -> list[Module]: ...
    
    @abstractmethod
    async def get_module_items(self, course_id: str, module_id: str) -> list[ModuleItem]: ...
    
    @abstractmethod
    async def get_grades(self, course_id: str) -> list[Grade]: ...
    
    @abstractmethod
    async def get_assignment_groups(self, course_id: str) -> list[AssignmentGroup]: ...
    
    @abstractmethod
    async def get_files(self, course_id: str) -> list[File]: ...
    
    @abstractmethod
    async def get_pages(self, course_id: str) -> list[Page]: ...
    
    @abstractmethod
    async def get_assignments_with_dates(self, course_id: str) -> list[Assignment]: ...
    
    @abstractmethod
    async def get_tab_url(self, course_id: str, tab_label: str) -> str | None:
        """获取课程导航栏中指定 tab 的外部链接（如 Unit Outline）"""
        ...


class DiscussionAdapter(ABC):
    """讨论平台适配器 — 只读，无 create/reply 方法"""
    
    @abstractmethod
    async def get_threads(self, course_id: str, limit: int = 50) -> list[Thread]: ...
    
    @abstractmethod
    async def get_thread(self, thread_id: str) -> Thread: ...
    
    @abstractmethod
    async def search_threads(self, course_id: str, query: str) -> list[Thread]: ...
    
    @abstractmethod
    async def get_threads_by_category(self, course_id: str, category: str) -> list[Thread]: ...


class LessonAdapter(ABC):
    """课件/Lesson 适配器"""

    @abstractmethod
    async def get_lessons(self, course_id: str) -> list[Lesson]: ...

    @abstractmethod
    async def get_lesson(self, lesson_id: str) -> Lesson:
        """获取 Lesson 详情（含完整内联 Slides，无需单独 get_slides）"""
        ...


# ──────────── 悉尼大学实现 ────────────

class CanvasAdapter(LMSAdapter):
    """Canvas LMS 适配器 — canvas.sydney.edu.au"""
    def __init__(self, api_token: str, base_url: str = "https://canvas.sydney.edu.au/api/v1"):
        ...

class EdDiscussionAdapter(DiscussionAdapter):
    """Ed Discussion 适配器 — edstem.org (只读)"""
    def __init__(self, api_token: str, base_url: str = "https://edstem.org/api"):
        ...

class EdLessonsAdapter(LessonAdapter):
    """Ed Lessons 适配器 — edstem.org
    端点已验证: GET /courses/{id}/lessons, GET /lessons/{id}
    与 Ed Discussion 共用同一套 Bearer Token 认证。
    Slides 内联在 Lesson 详情中（content 字段，XML 格式）。
    """
    def __init__(self, api_token: str, base_url: str = "https://edstem.org/api"):
        ...


# ──────────── 未来扩展示例 ────────────

class MoodleAdapter(LMSAdapter): ...
class BlackboardAdapter(LMSAdapter): ...
class CanvasDiscussionAdapter(DiscussionAdapter): ...  # Canvas 自带 Discussion 的大学
```

### 3.3 服务层设计

```python
class GPAService:
    """GPA 计算和预测服务"""
    
    def __init__(self, lms: LMSAdapter, outline_service: 'UnitOutlineService'):
        self.lms = lms
        self.outline = outline_service
    
    async def get_current_gpa(self, user_id: str) -> GPAReport: ...
    async def predict_gpa(self, user_id: str, what_if: list[WhatIfScore]) -> GPAPrediction: ...
    async def get_gpa_path(self, user_id: str, target_gpa: float) -> GPAPath: ...
    async def get_assessment_weights(self, course_id: str) -> list[AssessmentWeight]:
        """从 Unit Outline 获取精确的评分权重（非 AI 推断）"""
        ...


class UnitOutlineService:
    """Unit Outline 抓取和解析服务"""
    
    def __init__(self, lms: LMSAdapter):
        self.lms = lms
    
    async def get_outline_url(self, course_id: str) -> str | None:
        """从 Canvas 侧边栏获取 Unit Outline 外部链接"""
        return await self.lms.get_tab_url(course_id, "Unit Outline")
    
    async def fetch_and_parse(self, url: str) -> UnitOutline:
        """抓取悉大官网 HTML 并解析评分结构"""
        # aiohttp 获取 HTML → BeautifulSoup4 确定性解析
        # 提取: assessment_structure, learning_outcomes, course_description
        ...
    
    async def get_assessment_structure(self, course_id: str) -> list[AssessmentItem]:
        """一站式获取课程的评分结构"""
        url = await self.get_outline_url(course_id)
        if url:
            outline = await self.fetch_and_parse(url)
            return outline.assessments
        return []  # fallback: 从 Canvas assignment_groups 获取近似数据


class DeadlineService:
    """Deadline 三源聚合服务"""
    
    def __init__(self, lms: LMSAdapter, discussion: DiscussionAdapter, 
                 lessons: LessonAdapter, outline_service: UnitOutlineService):
        self.lms = lms
        self.discussion = discussion
        self.lessons = lessons
        self.outline = outline_service
    
    async def get_unified_deadlines(self, course_id: str) -> list[UnifiedDeadline]:
        """聚合三个来源的截止日期，去重后返回统一视图"""
        # 来源 1: Canvas Assignments (due_at 字段)
        canvas_deadlines = await self._from_canvas(course_id)
        # 来源 2: Ed Lessons 作业模块
        ed_lesson_deadlines = await self._from_ed_lessons(course_id)
        # 来源 3: Ed Discussion 教师评论中提及的截止日期
        ed_discussion_deadlines = await self._from_ed_discussion(course_id)
        
        # 合并去重: 基于作业名称模糊匹配 + 日期相近判定
        return self._merge_and_deduplicate(
            canvas_deadlines, ed_lesson_deadlines, ed_discussion_deadlines
        )
    
    async def get_all_deadlines(self, user_id: str) -> list[UnifiedDeadline]:
        """获取用户所有课程的统一 Deadline 时间线"""
        ...


class IntelligenceService:
    """信息情报服务"""

    def __init__(self, discussion: DiscussionAdapter, ai_engine: AIEngine):
        self.discussion = discussion
        self.ai = ai_engine

    async def get_high_value_threads(self, course_id: str) -> list[ValuedThread]:
        """
        Phase 2 (规则驱动): 基于 is_endorsed, is_staff_answered, user.course_role
                           字段筛选高价值帖子
        Phase 3 (AI 增强): 用 AIEngine.evaluate_thread() 对非结构化内容进行语义筛选
        """
        ...
    async def generate_daily_digest(self, user_id: str) -> Digest:
        """
        Phase 2: 规则聚合 — 新截止日期 + 新公告 + 新成绩 + 高价值帖子（模板化输出）
        Phase 3: AI 增强 — AIEngine.generate_digest() 智能组织和优先级排序
        """
        ...


class RiskAlertService:
    """风险预警服务 (BRD US-105)"""

    def __init__(self, gpa_service: GPAService, deadline_service: DeadlineService):
        self.gpa = gpa_service
        self.deadlines = deadline_service

    async def check_gpa_risk(self, user_id: str) -> list[RiskAlert]:
        """
        Phase 2 (简单阈值): 当课程成绩轨迹偏离目标 GPA 超过阈值时生成预警
        - 每次成绩同步后触发
        - 阈值: target_gpa - current_projected > configurable_threshold (默认 5 分)
        """
        ...

    async def check_deadline_risk(self, user_id: str) -> list[RiskAlert]:
        """检测即将到期但未提交的评估项"""
        ...


class NotificationService:
    """分级提醒服务 (BRD US-303)"""

    def __init__(self, deadline_service: DeadlineService, ses_client):
        self.deadlines = deadline_service
        self.ses = ses_client

    async def schedule_reminders(self, user_id: str) -> None:
        """
        为所有未来 Deadline 创建分级提醒:
        - 72h 前: informational 级别（邮件 + Web 通知）
        - 24h 前: warning 级别（邮件 + Web 通知）
        - 3h 前: critical 级别（邮件 + Web 通知）
        实现: EventBridge 定时触发 Lambda，扫描 UnifiedDeadline 表
        """
        ...

    async def send_notification(self, user_id: str, alert: RiskAlert | Reminder,
                                 channel: Literal["email", "web"]) -> None: ...
```

#### 课件搜索技术方案 (BRD US-202)

```python
class CourseMaterialService:
    """课件聚合服务"""

    def __init__(self, lms: LMSAdapter, lessons: LessonAdapter):
        self.lms = lms
        self.lessons = lessons

    async def get_unified_materials(self, course_id: str) -> list[UnifiedMaterial]: ...

    async def search_materials(self, query: str, course_id: str | None = None) -> list[SearchResult]:
        """
        全文搜索技术方案（分阶段实现）:

        Phase 2 (MVP): PostgreSQL 全文搜索
          - 使用 pg tsvector/tsquery 对已同步的课件文本建立全文索引
          - 支持: 课件标题、Slide 文本内容、Canvas Page HTML 文本
          - 返回: 匹配的课件名称、位置、内容片段（ts_headline）
          - 优点: 零额外成本，RDS 原生支持
          - 限制: 不支持 PDF 等二进制文件内容搜索

        Phase 3+ (可选升级): OpenSearch Serverless
          - 若 PostgreSQL 全文搜索性能/功能不足，可升级到 OpenSearch
          - 支持: 模糊匹配、同义词、PDF 内容索引
        """
        ...
```

### 3.4 评分权重数据源优先级

**问题**: Canvas `assignment_groups` 和 Unit Outline `#assessment-table` 都提供评分权重信息，可能存在不一致。

**优先级策略**:

| 优先级 | 数据源 | 理由 | 可用性 |
|--------|--------|------|--------|
| **1 (主)** | Unit Outline（悉大官网 HTML） | 学校官方权威来源，教师按制度维护 | 大部分课程可用 |
| **2 (备)** | Canvas assignment_groups | 教师自行配置，可能不完整或与 Outline 不同步 | 所有 Canvas 课程可用 |

**实现逻辑**:

```python
async def get_assessment_weights(self, course_id: str) -> WeightsResult:
    # 1. Try Unit Outline first (authoritative source)
    outline = await self.outline.get_assessment_structure(course_id)
    if outline:
        return WeightsResult(source="unit_outline", weights=outline)

    # 2. Fallback to Canvas assignment_groups
    groups = await self.lms.get_assignment_groups(course_id)
    return WeightsResult(source="canvas_assignment_groups", weights=groups)
```

**冲突处理**: 如果两个数据源都可用，以 Unit Outline 为准。在 UI 中显示数据来源标记（"数据来自 Unit Outline" / "数据来自 Canvas"），让用户知晓数据可靠性。

---

### 3.5 GPA/WAM 计算公式

#### 3.5.1 悉尼大学 WAM (Weighted Average Mark)

```
WAM = Σ(Mark_i × CreditPoints_i × LevelWeight_i) / Σ(CreditPoints_i × LevelWeight_i)

其中:
  Mark_i          = 第 i 门课的最终成绩（0-100）
  CreditPoints_i  = 第 i 门课的学分（通常 6cp）
  LevelWeight_i   = 课程层级权重:
                    1000-level (1年级) → 1
                    2000-level (2年级) → 2
                    3000-level (3年级) → 3
                    4000+ level        → 3
```

**数据来源:**
- `Mark_i`: Canvas `enrollments.grades.current_score`（已出分评估项）或 `final_score`（含未交项）
- `CreditPoints_i`: Course 数据模型 `credit_points` 字段（默认 6cp，悉大绝大多数课程为 6 学分）
- `LevelWeight_i`: 从 `Course.code` 中提取（如 COMP**2**017 → 2000-level → weight=2）

**悉尼大学成绩等级映射:**

| 等级 | 缩写 | 分数范围 |
|------|------|---------|
| High Distinction | HD | 85-100 |
| Distinction | D | 75-84 |
| Credit | CR | 65-74 |
| Pass | P | 50-64 |
| Fail | F | 0-49 |

#### 3.5.2 标准 4.0 GPA 映射表

| 分数范围 | GPA | 等级 |
|---------|-----|------|
| 85-100 | 4.0 (HD) | High Distinction |
| 75-84 | 3.0 (D) | Distinction |
| 65-74 | 2.0 (CR) | Credit |
| 50-64 | 1.0 (P) | Pass |
| 0-49 | 0.0 (F) | Fail |

```
GPA_4.0 = Σ(GPA_i × CreditPoints_i) / Σ(CreditPoints_i)
```

> 注意: 悉尼大学的 4.0 GPA 是粗粒度映射（非线性），WAM 是更精确的指标。UniBoard 同时支持两种制度，默认显示 WAM。

#### 3.5.3 单门课程当前成绩计算

```python
def calculate_course_mark(grades: list[Grade], weights: list[AssessmentWeight]) -> CourseMarkReport:
    """
    Calculate current mark for a single course.

    Uses Unit Outline weights as primary source.
    Falls back to Canvas assignment_groups if Unit Outline unavailable.
    """
    completed = [(g, w) for g, w in matched_pairs if g.score is not None]

    # Method: weighted average of completed assessments, normalized
    total_earned = sum(g.score / g.max_score * w.weight for g, w in completed)
    total_weight = sum(w.weight for _, w in completed)

    current_mark = (total_earned / total_weight * 100) if total_weight > 0 else None

    return CourseMarkReport(
        current_mark=current_mark,           # Projected mark based on completed assessments
        completed_weight=total_weight,        # How much of the course has been assessed
        remaining_assessments=remaining,      # List of upcoming assessments
    )
```

#### 3.5.4 What-if 预测算法

```python
def predict_gpa(
    current_grades: list[CourseGrade],
    what_if_scores: list[WhatIfScore],    # User hypothetical scores
    courses: list[Course],
    scale: Literal["wam", "gpa_4"] = "wam"
) -> GPAPrediction:
    """
    What-if GPA prediction.

    1. Take current completed grades as baseline
    2. Apply user's hypothetical scores for remaining assessments
    3. Recalculate WAM/GPA with the combined data
    """
    projected_marks = {}
    for course in courses:
        # Merge actual scores + what-if scores
        actual = get_completed_scores(course.id, current_grades)
        hypothetical = get_whatif_scores(course.id, what_if_scores)
        all_scores = actual + hypothetical

        # Calculate projected course mark
        projected_marks[course.id] = weighted_average(all_scores, course.weights)

    if scale == "wam":
        return calculate_wam(projected_marks, courses)
    else:
        return calculate_gpa_4(projected_marks, courses)
```

#### 3.5.5 目标 GPA 反推算法

```python
def reverse_calculate(
    target_gpa: float,
    current_grades: list[CourseGrade],
    courses: list[Course],
    scale: Literal["wam", "gpa_4"] = "wam"
) -> list[CourseTarget]:
    """
    Given a target GPA, reverse-calculate the minimum scores needed
    for remaining assessments in each course.

    Strategy: distribute required improvement proportionally across
    courses based on remaining weight and current performance gap.
    """
    # 1. Calculate how many "WAM points" are still needed
    # 2. For each course, calculate remaining weight
    # 3. Distribute required points across courses
    # 4. For each course, calculate minimum score per remaining assessment
    # 5. Flag courses where target is mathematically impossible (need > 100%)
    ...
```

---

## 4. 数据模型

### 4.1 ER 关系图

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │──1:N──│    Course    │──1:N──│    Grade     │
│              │       │              │       │              │
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ email        │       │ user_id (FK) │       │ course_id(FK)│
│ cognito_sub  │       │ canvas_      │       │ name         │
│ university_  │       │  course_id   │       │ score        │
│  id          │       │ ed_course_id │       │ max_score    │
│ canvas_api_  │       │ name         │       │ weight       │
│  token       │       │ code         │       │ submitted_at │
│ ed_api_token │       │ semester     │       └──────────────┘
│ gpa_target   │       │ credit_points│
│ gpa_scale    │       │ grading_     │
│ created_at   │       │  weights     │
│ last_sync_at │       │ unit_outline │
└──────────────┘       │  _url        │
                       └──────┬───────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
     ┌────────▼───┐ ┌─────▼─────┐ ┌──▼───────────┐
     │   Module   │ │  Lesson   │ │ Discussion   │
     │  (Canvas)  │ │   (Ed)    │ │ Thread (Ed)  │
     │            │ │           │ │              │
     │ id (PK)    │ │ id (PK)   │ │ id (PK)      │
     │ course_id  │ │ course_id │ │ course_id    │
     │ name       │ │ title     │ │ title        │
     │ position   │ │ ed_lesson │ │ author       │
     │ canvas_    │ │  _id      │ │ category     │
     │  module_id │ └─────┬─────┘ │ content      │
     └──────┬─────┘       │       │ is_endorsed  │
            │        ┌────▼────┐  │ is_staff     │
     ┌──────▼─────┐  │  Slide  │  │ gpa_score    │
     │ ModuleItem │  │         │  │ created_at   │
     │            │  │ id (PK) │  └──────────────┘
     │ id (PK)    │  │ lesson_ │
     │ module_id  │  │  id(FK) │
     │ title      │  │ content │
     │ type       │  │ type    │
     │ content_id │  │ order   │
     │ url        │  └─────────┘
     └────────────┘

     ┌──────────────┐
     │  PushRecord  │  (去重)
     │              │
     │ id (PK)      │
     │ user_id (FK) │
     │ content_hash │
     │ pushed_at    │
     └──────────────┘

     ┌──────────────────┐
     │  UnitOutline     │  (评分结构缓存)
     │                  │
     │ id (PK)          │
     │ course_id (FK)   │
     │ outline_url      │
     │ assessments JSON │
     │ raw_html         │
     │ fetched_at       │
     │ semester         │
     └──────────────────┘

     ┌──────────────────┐
     │ UnifiedDeadline  │  (三源聚合)
     │                  │
     │ id (PK)          │
     │ course_id (FK)   │
     │ title            │
     │ due_date         │
     │ source           │
     │ source_id        │
     │ weight           │
     │ description      │
     │ dedup_key        │
     │ is_confirmed     │
     │ created_at       │
     │ updated_at       │
     └──────────────────┘
```

### 4.2 字段详情

#### User

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | string | 用户邮箱 |
| cognito_sub | string (UNIQUE) | AWS Cognito 用户标识符，用于 JWT 验证 |
| university_id | string | 学号 (如 unikey) |
| canvas_api_token | string (加密) | Canvas API Token，AES-256 加密存储 |
| ed_api_token | string (加密) | Ed API Token，AES-256 加密存储 |
| gpa_target | float (nullable) | 用户设定的目标 GPA |
| gpa_scale | enum | "wam" (悉尼大学) | "gpa_4" (标准 4.0) |
| created_at | datetime | 注册时间 |
| last_sync_at | datetime | 最后同步时间 |

#### Course

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID (FK) | 所属用户 |
| canvas_course_id | string (nullable) | Canvas 课程 ID |
| ed_course_id | string (nullable) | Ed 课程 ID |
| name | string | 课程名称 |
| code | string | 课程代码 (如 COMP2123) |
| semester | string | 学期 (如 "2026-S1") |
| credit_points | int | 学分 |
| grading_weights | JSON | 评分权重结构（来源: Unit Outline 解析） |
| unit_outline_url | string (nullable) | Unit Outline 外部链接（从 Canvas tab 获取） |

#### Grade

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| course_id | UUID (FK) | 所属课程 |
| assessment_name | string | 评估名称 |
| score | float (nullable) | 得分 (null = 未出分) |
| max_score | float | 满分 |
| weight | float | 权重 (0-1) |
| group_name | string | 评分组名称 (如 "Assignments", "Exams") |
| submitted_at | datetime (nullable) | 提交时间 |
| graded_at | datetime (nullable) | 出分时间 |

#### DiscussionThread

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| course_id | UUID (FK) | 所属课程 |
| ed_thread_id | string | Ed 帖子原始 ID |
| title | string | 标题 |
| author | string | 作者 |
| category | string | 类别 (Announcements/Questions/...) |
| content | text | 内容 |
| is_endorsed | boolean | 是否被教师认可 |
| is_staff_post | boolean | 是否为教师/助教发帖 |
| gpa_relevance_score | float (0-1) | AI 评估的 GPA 相关性分数 |
| created_at | datetime | 发帖时间 |
| synced_at | datetime | 同步时间 |

#### PushRecord

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID (FK) | 目标用户 |
| content_hash | string (SHA-256) | 内容指纹 |
| source_type | enum | "thread" / "announcement" / "grade" / "deadline" |
| source_id | string | 原始内容 ID |
| pushed_at | datetime | 推送时间 |
| channel | enum | "email" / "web" / "digest" |

#### UnitOutline

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| course_id | UUID (FK) | 所属课程 |
| outline_url | string | 悉大官网 Unit Outline 页面 URL |
| assessments | JSON | 解析后的评分结构 `[{name, weight, description, due_date, type}]` |
| learning_outcomes | JSON | 课程学习目标列表 |
| raw_html | text | 原始 HTML（用于解析失败时人工查看和调试） |
| fetched_at | datetime | 抓取时间 |
| semester | string | 所属学期（Unit Outline 每学期变化一次） |

#### UnifiedDeadline

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| course_id | UUID (FK) | 所属课程 |
| title | string | 作业/评估名称 |
| due_date | datetime | 截止日期 |
| source | enum | "canvas_assignment" / "ed_lesson" / "ed_discussion" / "unit_outline" |
| source_id | string | 来源平台中的原始 ID |
| weight | float (nullable) | 评分权重（来自 Unit Outline，可能为 null） |
| description | text (nullable) | 作业描述摘要 |
| dedup_key | string | 去重键（基于课程+作业名称的归一化哈希），用于多来源合并 |
| is_confirmed | boolean | 是否已确认（Canvas 数据 = true，Ed Discussion 提取 = false 需人工确认） |
| created_at | datetime | 记录创建时间 |
| updated_at | datetime | 最后更新时间 |

---

## 5. 缓存与数据同步

### 5.1 同步策略

| 数据类型 | 同步频率 | 策略 | 说明 |
|---------|---------|------|------|
| 成绩 (Grades) | 每 15 分钟 | 增量同步 | 对比 graded_at 时间戳 |
| 作业/截止日期 | 每 1 小时 | 增量同步 | 对比 updated_at |
| Ed Discussion 帖子 | 每 1 小时 | 增量同步 | 基于帖子 ID 递增 |
| Canvas Modules | 每 24 小时 | 全量同步 | 模块结构变化不频繁 |
| Ed Lessons | 每 24 小时 | 全量同步 | 课件发布不频繁 |
| **Unit Outline** | **每学期一次** | **首次抓取 + 缓存** | **每学期变化一次，首次同步后缓存整学期。支持手动触发刷新** |
| 课件文件内容 | 首次访问时 | 懒加载 + 缓存 | 下载后存入文件存储 |

### 5.2 去重机制

```python
import hashlib

def content_fingerprint(source_type: str, source_id: str, content: str) -> str:
    """生成内容指纹，用于去重"""
    raw = f"{source_type}:{source_id}:{content}"
    return hashlib.sha256(raw.encode()).hexdigest()

def should_push(user_id: str, fingerprint: str) -> bool:
    """检查是否已推送过"""
    existing = db.query(PushRecord).filter(
        user_id=user_id, 
        content_hash=fingerprint
    ).first()
    return existing is None
```

### 5.3 Token 失效检测

Token 失效的完整检测与处理流程详见 **§14.4**。要点：每次同步任务执行时检查 API 响应状态码（401/403 触发失效标记），检测延迟 < 1 小时。

---

## 6. AI / 提示词工程

> **重要：AI 与确定性解析的职责划分**
> 
> - **评分结构（权重/作业占比）**: 来自 Unit Outline 的确定性 HTML 解析，**不使用 AI**
> - **Deadline 提取（Canvas/Ed Lessons）**: 来自结构化 API 数据，**不使用 AI**
> - **Deadline 提取（Ed Discussion 教师评论）**: 使用 AI 从非结构化帖子中识别截止日期信息
> - **Ed Discussion 高价值信息筛选**: 使用 AI 进行智能过滤和摘要
> - **每日摘要/复习材料生成**: 使用 AI

### 6.1 信息筛选提示词

```
System Prompt:
你是 UniBoard 的学术信息分析引擎。你的唯一目标是从 Ed Discussion 帖子中
提取对学生 GPA 有直接影响的信息。

对每个帖子，输出 JSON:
{
  "gpa_relevance": 0.0-1.0,      // GPA 相关性分数
  "category": "exam_info" | "assignment_clarification" | "rubric" | 
               "deadline_change" | "common_mistake" | "endorsed_answer" |
               "irrelevant",
  "summary": "一句话摘要",
  "urgency": "critical" | "important" | "informational",
  "key_facts": ["事实1", "事实2"]
}

评分规则:
- 0.9-1.0: 考试范围/重点、评分标准变更、截止日期延期
- 0.7-0.8: 作业要求澄清、教师回复的常见错误、Endorsed 回答
- 0.4-0.6: 一般知识性讨论、有参考价值但不直接影响评估
- 0.0-0.3: 闲聊、技术问题(WiFi/教室)、与评估无关的讨论

过滤规则:
- gpa_relevance < 0.4 的帖子不进入推送队列
- 同一信息的重复帖子只保留最早/最权威的版本
```

### 6.2 每日摘要生成提示词

```
System Prompt:
你是 UniBoard 的每日学业摘要生成器。基于今天的新信息，为学生生成简洁的
学业摘要邮件。

格式要求:
1. 按课程分组
2. 每门课最多 3 条关键信息
3. 紧急事项（截止日期 < 72h）置顶并标红
4. 总字数控制在 300 字以内
5. 不包含任何与 GPA 无关的信息

语气: 简洁、专业、有紧迫感（对紧急事项）
```

### 6.3 AI 服务接口

```python
class AIEngine(ABC):
    """AI 引擎抽象 — 支持替换不同 LLM 提供商"""

    @abstractmethod
    async def evaluate_thread(self, thread: Thread) -> ThreadEvaluation:
        """
        Evaluate a single Ed Discussion thread for GPA relevance.

        Args:
            thread: Thread object with title, content, author, category,
                    is_endorsed, is_staff_post fields
        Returns:
            ThreadEvaluation with:
              - gpa_relevance: float (0.0-1.0)
              - category: str (exam_info | assignment_clarification | rubric |
                               deadline_change | common_mistake | endorsed_answer | irrelevant)
              - summary: str (one-line summary)
              - urgency: str (critical | important | informational)
              - key_facts: list[str]
        Used by: IntelligenceService.get_high_value_threads() (§3.3)
        Prompt: §6.1 信息筛选提示词
        """
        ...

    @abstractmethod
    async def generate_digest(self, threads: list[ValuedThread],
                               grades: list[Grade],
                               deadlines: list[Deadline]) -> str:
        """
        Generate daily academic digest email content.

        Used by: IntelligenceService.generate_daily_digest() (§3.3)
        Prompt: §6.2 每日摘要生成提示词
        """
        ...

    @abstractmethod
    async def summarize_material(self, material: UnifiedMaterial) -> MaterialSummary:
        """
        US-203: Generate key point summary for a single Module/Lesson.

        Returns: MaterialSummary with key_points: list[str], summary: str
        """
        ...

    @abstractmethod
    async def generate_review(self, materials: list[UnifiedMaterial],
                               high_value_threads: list[ValuedThread]) -> str:
        """US-402: Generate targeted review materials before exams"""
        ...

    @abstractmethod
    async def answer_question(self, question: str,
                               context: list[UnifiedMaterial]) -> str:
        """US-401: Answer questions based on course materials with citations"""
        ...

class ClaudeEngine(AIEngine):
    """Anthropic Claude 实现"""
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        ...
```

### 6.4 AI 筛选质量评估与迭代

> 对应 BRD §5.4 的 "AI 筛选准确率 > 85%" 指标，本节定义评估框架和迭代机制。

#### 标注流程

1. **抽样**: 每周从 Ed Discussion 同步帖子中随机抽取 20 条（按 `created_at` 降序取最近一周内的帖子，随机采样）
2. **人工标注**: 由用户（开发者）对每条帖子标注 `gpa_relevant: true/false`，并标注 `category`（对应 §6.1 的分类）
3. **存储**: 标注结果存入 `ai_evaluation_labels` 表（`thread_id`, `human_label`, `human_category`, `labeled_at`）

#### 评估指标

| 指标 | 计算方式 | 目标 |
|------|---------|------|
| Precision | AI 判定为 GPA 相关的帖子中，确实相关的比例 | > 85% |
| Recall | 确实相关的帖子中，被 AI 正确识别的比例 | > 80% |
| F1 Score | Precision 和 Recall 的调和平均 | > 82% |

阈值: `gpa_relevance >= 0.4` 视为 AI 判定"GPA 相关"（对应 §6.1 过滤规则）。

#### 迭代机制

```
评估结果
    │
    ├── F1 >= 82%  → 保持当前 prompt，继续监控
    │
    ├── 75% <= F1 < 82%  → 优化 prompt（调整评分规则/示例），记录新版本
    │
    └── F1 < 75%  → 回退到规则驱动（is_endorsed + is_staff_answered + category），
                     直到 prompt 优化后 F1 恢复到 >= 82%
```

#### Prompt 版本管理

每次修改 §6.1 / §6.2 的 System Prompt 时，记录：

| 字段 | 说明 |
|------|------|
| `version` | 语义化版本号（如 `v1.0`, `v1.1`） |
| `change_summary` | 修改内容摘要 |
| `evaluation_result` | 当次评估的 Precision / Recall / F1 |
| `active_from` | 生效日期 |

存储位置: `docs/ai-prompt-versions.md`（项目文档，不在数据库中）。

---

## 7. 安全实现

### 7.1 API Token 存储

```
加密方式: AES-256-GCM
存储位置: RDS PostgreSQL 加密字段（用户 Token 量大，Secrets Manager 按密钥收费不划算）
加密密钥: AWS Secrets Manager 存储单个主密钥（$0.40/月），用于加解密 RDS 中的 Token 字段
密钥轮换: 支持，主密钥轮换时批量重加密 Token
```

### 7.2 认证流程

```
用户注册 → 邮箱验证 → 登录获取 JWT → 
  → 引导配置 Canvas Token → 验证 Token 有效性 → 加密存储
  → 引导配置 Ed Token → 验证 Token 有效性 → 加密存储
  → 首次全量同步 → 进入 Dashboard
```

### 7.3 API 权限

| 平台 | 请求的权限范围 | 写入权限 |
|------|-------------|---------|
| Canvas API | 读取课程、成绩、模块、文件、页面、导航栏(tabs) | **无** |
| Ed API | 读取课程、帖子、Lessons | **无** |
| 悉大官网 Unit Outline | 公开 HTML 页面抓取（预期无需登录） | **无** |

### 7.4 速率限制

| 端点 | 限制 |
|------|------|
| Canvas API | 每个 Token 每 10 秒 70 次请求 |
| Ed API | 50 次快速连续请求无 429，限制远宽于 Canvas（已验证） |
| 悉大官网 | 礼貌爬取: 每次请求间隔 ≥ 1 秒，每学期只抓取一次（无反爬机制，已验证） |
| UniBoard 自身 API | 每用户每分钟 60 次 |

---

## 8. 代码质量标准

### 8.1 语言和工具

| 项目 | 标准 |
|------|------|
| 语言 | Python 3.12+ |
| 类型注解 | 100% 覆盖，`mypy --strict` 通过 |
| 代码检查 | `ruff` (替代 flake8/isort/black) |
| 测试框架 | `pytest` + `pytest-asyncio` |
| 测试覆盖率 | 核心模块 > 80%，整体 > 60% |
| 日志 | `structlog` (JSON 格式) |
| 异步 | `asyncio` + `aiohttp` |
| 注释 | 纯英文（面向开源社区） |
| Git | Conventional Commits + PR Review |

### 8.2 项目结构 (预期)

```
uniboard/
├── src/
│   ├── mcp/                    # MCP 工具层
│   │   ├── server.py           # MCP Server 入口
│   │   ├── canvas_tools.py     # Canvas MCP 工具
│   │   └── ed_tools.py         # Ed MCP 工具
│   ├── adapters/               # Platform Adapter 层
│   │   ├── base.py             # 抽象接口
│   │   ├── canvas.py           # Canvas 适配器
│   │   ├── ed_discussion.py    # Ed Discussion 适配器
│   │   └── ed_lessons.py       # Ed Lessons 适配器
│   ├── services/               # 业务服务层
│   │   ├── gpa.py              # GPA 计算/预测
│   │   ├── unit_outline.py     # Unit Outline 抓取和解析
│   │   ├── deadlines.py        # Deadline 三源聚合
│   │   ├── materials.py        # 课件聚合
│   │   ├── intelligence.py     # 信息情报
│   │   └── ai_engine.py        # AI 引擎
│   ├── parsers/                # 解析器
│   │   └── usyd_outline.py     # 悉大 Unit Outline HTML 解析器 (BeautifulSoup4)
│   ├── models/                 # 数据模型
│   │   └── ...
│   └── web/                    # Web API (FastAPI)
│       └── ...
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/
│   ├── BRD.md
│   └── TRD.md
├── pyproject.toml
├── README.md
└── .github/
    └── workflows/              # CI/CD
```

### 8.3 CI/CD 流水线

```
Push / PR → Lint (ruff) → Type Check (mypy) → Test (pytest) → 
  → Coverage Report → Build → (Deploy on merge to main)
```

---

## 9. Ed Lessons API 验证结果 ✅ 全部完成

### 9.1 已确认信息

- Ed 平台 (edstem.org) 的 Lessons API 与 Discussion API 共用同一套后端（base URL: `https://edstem.org/api`）
- 使用相同的 Bearer Token 认证（从 edstem.org/settings/api-tokens 获取）
- Ed 官方没有公开 API 文档，端点通过 hschafer/edstem 开源库 + curl 实测确认

### 9.2 已验证端点

| Method | Endpoint | 功能 | 状态 |
|--------|----------|------|------|
| GET | `/courses/{course_id}/lessons` | 获取课程 Lessons + Modules 列表 | ✅ 已验证 |
| GET | `/lessons/{lesson_id}` | 获取 Lesson 详情（含完整内联 Slides） | ✅ 已验证 |
| GET | `/lessons/slides/{slide_id}` | 获取单个 Slide 详情 | ✅ 已验证（正常场景不需要） |

### 9.3 验证事项

| 编号 | 问题 | 验证方式 | 状态 | 结果 |
|------|------|---------|------|------|
| R-01 | Ed Lessons 具体端点路径 | hschafer/edstem + curl 实测 | ✅ 已验证 | 三个端点均可用 |
| R-02 | Lesson 列表端点是否按课程分组 | curl 实测 | ✅ 已验证 | 返回 lessons[] + modules[] |
| R-03 | Slides 内容格式 | curl 分析响应体 | ✅ 已验证 | XML `<document version="2.0">`，字段名 `content`（非 `passage`） |
| R-04 | Ed API 速率限制 | 50 次混合端点压力测试 | ✅ 已验证 | 全部 200，无 429 |
| R-05 | Ed 官方是否开放 Lessons 端点 | 文档研究 | ✅ 确认无公开文档 |
| R-06 | edapi PyPI 包是否支持 Lessons | 源码研究 | ✅ 确认不支持 |
| R-07 | 是否可以用相同 Token 读取 Lessons | curl 实测 | ✅ 已确认 |

### 9.4 关键修正（相对于 hschafer/edstem）

| 差异 | hschafer/edstem | 实际 API |
|------|----------------|---------|
| Slide 内容字段名 | `passage` | **`content`** |
| Lesson 编号字段 | `lesson_number` | **`number`** |
| 创建者字段 | `creator_id` | **`user_id`** |
| 额外字段 | 无 | `kind`, `state`, `status`, `slide_count`, `effective_*_at` |

### 9.5 实现计划（已确认端点）

1. 在 `src/adapters/ed_lessons.py` 中实现 `EdLessonsAdapter`（只需 `get_lessons` + `get_lesson`）
2. 在 `src/mcp/ed_tools.py` 中添加 `ed_list_lessons` + `ed_get_lesson` 两个 MCP 工具
3. 复用现有 `parse_ed_document()` 解析 Slide 的 XML content 字段
4. 单元测试 + 集成测试

---

## 10. Canvas Modules API 参考

### 10.1 List Modules

```
GET /api/v1/courses/:course_id/modules

Query Parameters:
  include[]=items          # 内联返回 Module Items
  include[]=content_details # 包含截止日期等详情
  search_term=<string>     # 搜索模块名称
  student_id=<id>          # 查看特定学生的进度

Response: Module[]
{
  "id": 123,
  "name": "Week 1 - Introduction",
  "position": 1,
  "workflow_state": "active",
  "items_count": 10,
  "items_url": "https://canvas.sydney.edu.au/api/v1/courses/.../modules/123/items",
  "items": [...]  // 当 include[]=items 时
}

认证: Authorization: Bearer <Canvas API Token>
分页: Link header (rel="next")
Canvas 文档: https://canvas.instructure.com/doc/api/modules.html
```

### 10.2 List Module Items

```
GET /api/v1/courses/:course_id/modules/:module_id/items

Query Parameters:
  include[]=content_details  # 截止日期、分数等

Response: ModuleItem[]
{
  "id": 768,
  "title": "Week 1 Lecture Slides",
  "type": "File",              // File | Page | Discussion | Assignment | Quiz | ExternalUrl | ExternalTool
  "content_id": 1038,           // 对应资源的 Canvas ID
  "html_url": "https://...",    // Canvas 页面链接
  "url": "https://...",         // API 端点链接
  "external_url": "https://..." // ExternalUrl 类型时的外部链接
}
```

---

## 11. 测试数据与验证课程

> 本章节记录用于开发和测试的真实课程 ID 映射，以及 API 端点验证使用的测试数据。

### 11.1 验证课程 ID 映射

以下为 2026-S1 学期用于开发验证的真实课程：

| 课程 | Canvas Course ID | Ed Course ID | 备注 |
|------|-----------------|-------------|------|
| COMP2017 Systems Programming | 69855 | 31567 | Canvas + Ed 双平台 |
| COMP3221 Distributed Systems | 69874 | 30772 | Canvas + Ed 双平台 |
| EDGU1003 Diet and Nutrition | 69981 | — | 仅 Canvas |
| MATH2021 Vector Calculus | 70641 | — | 仅 Canvas |
| STAT2011 Probability | 72506 | — | 仅 Canvas |

### 11.2 API 端点验证摘要

所有 API 端点在 §2 和 §9 中已有详细规格，此处汇总验证状态：

| 平台 | 端点类型 | 验证状态 | 详见 |
|------|---------|---------|------|
| Canvas | Courses / Assignments / Announcements | ✅ 已实现 | §2.1 |
| Canvas | Modules / Module Items / Grades | 待实现 | §2.2 |
| Canvas | Unit Outline（tabs + external_tools） | ✅ 已验证 | §2.2 `canvas_get_unit_outline_url` |
| Canvas | Unit Outline HTML 解析 | ✅ 已验证 | §2.2 `fetch_unit_outline` |
| Ed | Courses / Threads（Discussion） | ✅ 已实现 | §2.1 |
| Ed | Lessons / Lesson 详情 | ✅ 已验证 | §2.3 + §9 |
| Ed | Discussion 增强参数（filter/category/sort） | ✅ 已验证 | §2.3 `ed_list_threads` |

### 11.3 API 配置

```
Canvas Base URL: https://canvas.sydney.edu.au/api/v1
Ed Base URL: https://edstem.org/api
```

Token 配置详见 §18 本地开发环境。

---

## 12. UniBoard REST API 规格

> 后端: FastAPI + Mangum → Lambda，API Gateway 代理。所有端点遵循标准 REST 约定。

### 12.1 约定

| 项目 | 决策 |
|------|------|
| Base URL | `https://api.uniboard.app/v1`（prod），`https://dev-api.uniboard.app/v1`（dev） |
| 响应格式 | `{ "data": ..., "meta": { request_id, timestamp } }`，错误: `{ "error": { code, message } }` |
| 分页 | 游标分页（cursor + limit，默认 20，最大 100） |
| 速率限制 | 认证用户 60 req/min，未认证 10 req/min，标准 `X-RateLimit-*` 头 |
| 认证 | `Authorization: Bearer <jwt>`（Cognito 签发），`/auth/*` 和 `/health` 除外 |

---

### 12.2 认证端点

代理 AWS Cognito，前端不直接调用 Cognito SDK。标准 email/password 注册登录流程。

| 端点 | 说明 |
|------|------|
| `POST /auth/register` | 注册（email + password + display_name），返回 user_id + pending_verification |
| `POST /auth/login` | 登录，返回 access_token + refresh_token + expires_in |
| `POST /auth/refresh` | 刷新 JWT |
| `POST /auth/logout` | 登出，使 refresh token 失效 |
| `POST /auth/forgot-password` | 发送重置验证码 |
| `POST /auth/confirm-password` | 验证码 + 新密码确认重置 |

---

### 12.3 用户与 Token 配置端点

| 端点 | 说明 |
|------|------|
| `GET /users/me` | 用户信息（含 tokens.{canvas,ed}.status） |
| `PATCH /users/me` | 更新 display_name / gpa_target / gpa_scale |
| `PUT /users/me/tokens/{canvas\|ed}` | 配置平台 Token → 加密存储（§7.1）→ 验证有效性 → 返回 courses_found |
| `DELETE /users/me/tokens/{platform}` | 移除 Token |
| `POST /users/me/tokens/{platform}/verify` | 重新验证 Token 有效性，失效时 status="invalid"（§14.4） |
| `DELETE /users/me` | 删除账户及全部数据（GDPR-like） |
| `GET /users/me/export` | 导出全部数据（返回 S3 预签名 URL，1h 有效） |

---

### 12.4 课程端点

#### GET `/courses`

获取当前用户的所有课程列表。

**Query Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `semester` | string | 按学期过滤，如 `2026-S1` |

**Response (200):**
```json
{
  "data": [
    {
      "id": "crs_abc123",
      "name": "Systems Programming",
      "code": "COMP2017",
      "semester": "2026-S1",
      "credit_points": 6,
      "canvas_course_id": "69855",
      "ed_course_id": "31567",
      "current_mark": 82.5,
      "grade_letter": "D",
      "completed_weight": 0.40,
      "has_unit_outline": true,
      "last_sync_at": "2026-03-02T10:00:00Z"
    }
  ]
}
```

#### GET `/courses/:id`

获取单个课程详情。

**Response (200):**
```json
{
  "data": {
    "id": "crs_abc123",
    "name": "Systems Programming",
    "code": "COMP2017",
    "semester": "2026-S1",
    "credit_points": 6,
    "current_mark": 82.5,
    "grade_letter": "D",
    "completed_weight": 0.40,
    "assessment_weights": [
      { "name": "Assignment 1", "weight": 0.15, "score": 85.0, "max_score": 100, "status": "graded" },
      { "name": "Assignment 2", "weight": 0.15, "score": null, "max_score": 100, "status": "upcoming", "due_date": "2026-04-01T23:59:00Z" },
      { "name": "Midterm Exam", "weight": 0.20, "score": 80.0, "max_score": 100, "status": "graded" },
      { "name": "Final Exam", "weight": 0.50, "score": null, "max_score": 100, "status": "upcoming", "due_date": "2026-06-10T09:00:00Z" }
    ],
    "weight_source": "unit_outline"
  }
}
```

`weight_source` 标明权重数据来源（`unit_outline` | `canvas_assignment_groups`），对应 §3.4 评分权重优先级策略。

#### GET `/courses/:id/grades`

获取课程的详细成绩列表。映射到 §3.3 `GPAService`。

**Response (200):**
```json
{
  "data": [
    {
      "id": "grd_001",
      "assessment_name": "Assignment 1",
      "score": 85.0,
      "max_score": 100,
      "weight": 0.15,
      "group_name": "Assignments",
      "graded_at": "2026-03-10T14:00:00Z",
      "submitted_at": "2026-03-08T22:30:00Z"
    }
  ]
}
```

#### GET `/courses/:id/materials`

获取课程的聚合课件列表（Canvas Modules + Ed Lessons）。映射到 §3.3 `CourseMaterialService`。

**Query Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `source` | string | 按来源过滤：`canvas` / `ed` / 不传返回全部 |

**Response (200):**
```json
{
  "data": [
    {
      "id": "mat_001",
      "title": "Week 1 - Introduction to C",
      "source": "canvas",
      "source_type": "module",
      "items": [
        { "title": "Lecture Slides", "type": "File", "url": "/courses/crs_abc123/materials/mat_001/items/itm_001" },
        { "title": "Tutorial Exercises", "type": "Page", "url": "/courses/crs_abc123/materials/mat_001/items/itm_002" }
      ]
    },
    {
      "id": "mat_002",
      "title": "Week 1 - Memory Management",
      "source": "ed",
      "source_type": "lesson",
      "slide_count": 15,
      "url": "/courses/crs_abc123/materials/mat_002"
    }
  ]
}
```

#### GET `/courses/:id/discussions`

获取课程的高价值讨论帖列表。映射到 §3.3 `IntelligenceService`。

**Query Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `filter` | string | `high_value`（默认）/ `endorsed` / `staff` / `all` |
| `cursor` | string | 分页游标 |
| `limit` | int | 每页数量（默认 20） |

**Response (200):**
```json
{
  "data": [
    {
      "id": "thr_001",
      "ed_thread_id": "123456",
      "title": "Final exam will NOT cover Chapter 8",
      "author": "Dr. Smith",
      "category": "Announcements",
      "is_endorsed": false,
      "is_staff_post": true,
      "gpa_relevance_score": 0.95,
      "relevance_category": "exam_info",
      "summary": "Final exam excludes Chapter 8 (Hashing). Focus on Chapters 1-7.",
      "created_at": "2026-03-01T09:00:00Z"
    }
  ]
}
```

#### GET `/courses/:id/deadlines`

获取单个课程的截止日期列表。映射到 §3.3 `DeadlineService`。

**Response (200):**
```json
{
  "data": [
    {
      "id": "ddl_001",
      "title": "Assignment 2",
      "due_date": "2026-04-01T23:59:00Z",
      "source": "canvas_assignment",
      "weight": 0.15,
      "status": "upcoming",
      "days_remaining": 30
    }
  ]
}
```

#### GET `/courses/:id/outline`

获取课程 Unit Outline 解析结果。映射到 §3.3 `UnitOutlineService`。

**Response (200):**
```json
{
  "data": {
    "course_id": "crs_abc123",
    "outline_url": "https://sydney.edu.au/units/COMP2017/2026-S1C-ND-CC",
    "assessments": [
      {
        "name": "Assignment 1",
        "weight": 0.15,
        "description": "Implement a memory allocator in C",
        "due_date": "2026-03-08",
        "length": "2 weeks",
        "ai_policy": "Not permitted"
      }
    ],
    "learning_outcomes": [
      "Understand memory management in C",
      "Apply systems programming concepts"
    ],
    "fetched_at": "2026-03-01T00:00:00Z",
    "source": "unit_outline"
  }
}
```

当 Unit Outline 不可用时，`source` 为 `"canvas_fallback"`，`outline_url` 为 null。

---

### 12.5 GPA 端点

映射到 §3.3 `GPAService` 和 §3.5 GPA/WAM 计算公式。

#### GET `/gpa`

获取当前 GPA/WAM 报告。对应 BRD US-101。

**Response (200):**
```json
{
  "data": {
    "scale": "wam",
    "current_wam": 78.5,
    "current_gpa_4": 3.0,
    "target_wam": 85.0,
    "gap": -6.5,
    "courses": [
      {
        "course_id": "crs_abc123",
        "code": "COMP2017",
        "name": "Systems Programming",
        "credit_points": 6,
        "level_weight": 2,
        "current_mark": 82.5,
        "grade_letter": "D",
        "completed_weight": 0.40
      }
    ],
    "last_sync_at": "2026-03-02T10:00:00Z"
  }
}
```

#### POST `/gpa/predict`

What-if GPA 预测。对应 BRD US-102，算法参见 §3.5.4。

**Request:**
```json
{
  "what_if_scores": [
    { "course_id": "crs_abc123", "assessment_name": "Final Exam", "assumed_score": 90 },
    { "course_id": "crs_abc123", "assessment_name": "Assignment 2", "assumed_score": 85 }
  ],
  "scale": "wam"
}
```

**Response (200):**
```json
{
  "data": {
    "current_wam": 78.5,
    "predicted_wam": 83.2,
    "delta": +4.7,
    "per_course": [
      {
        "course_id": "crs_abc123",
        "code": "COMP2017",
        "current_mark": 82.5,
        "predicted_mark": 87.0,
        "applied_assumptions": [
          { "assessment": "Final Exam", "assumed_score": 90 },
          { "assessment": "Assignment 2", "assumed_score": 85 }
        ]
      }
    ]
  }
}
```

#### POST `/gpa/path`

目标 GPA 反推路径。对应 BRD US-103，算法参见 §3.5.5。

**Request:**
```json
{
  "target_wam": 85.0
}
```

**Response (200):**
```json
{
  "data": {
    "target_wam": 85.0,
    "current_wam": 78.5,
    "is_achievable": true,
    "per_course": [
      {
        "course_id": "crs_abc123",
        "code": "COMP2017",
        "current_mark": 82.5,
        "minimum_remaining_avg": 88.0,
        "remaining_assessments": [
          { "name": "Assignment 2", "weight": 0.15, "minimum_score": 85 },
          { "name": "Final Exam", "weight": 0.50, "minimum_score": 90 }
        ],
        "difficulty": "moderate"
      }
    ]
  }
}
```

当目标数学上不可达时，`is_achievable` 为 `false`，`minimum_remaining_avg` 超过 100。

---

### 12.6 Deadline 端点

映射到 §3.3 `DeadlineService`，三源聚合（Canvas Assignments + Ed Lessons + Ed Discussion）。

#### GET `/deadlines`

获取所有课程的统一 Deadline 时间线。对应 BRD US-106。

**Query Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `from` | ISO 8601 | 起始日期（默认今天） |
| `to` | ISO 8601 | 结束日期（默认学期末） |
| `course_id` | string | 按课程过滤 |

**Response (200):**
```json
{
  "data": [
    {
      "id": "ddl_001",
      "course_code": "COMP2017",
      "course_name": "Systems Programming",
      "title": "Assignment 2",
      "due_date": "2026-04-01T23:59:00Z",
      "source": "canvas_assignment",
      "weight": 0.15,
      "days_remaining": 30,
      "status": "upcoming",
      "is_confirmed": true
    },
    {
      "id": "ddl_002",
      "course_code": "COMP3221",
      "course_name": "Distributed Systems",
      "title": "Lab 5 Submission",
      "due_date": "2026-03-15T17:00:00Z",
      "source": "ed_lesson",
      "weight": null,
      "days_remaining": 13,
      "status": "upcoming",
      "is_confirmed": true
    }
  ]
}
```

`is_confirmed` 说明：来自 Canvas/Ed Lessons 的为 `true`，来自 Ed Discussion 教师评论提取的为 `false`（AI 提取，可能需人工确认）。

#### GET `/deadlines/upcoming`

获取未来 7 天内的紧急 Deadline。

**Response (200):** 格式同 `/deadlines`，自动过滤 `days_remaining <= 7` 且按紧急程度排序。

---

### 12.7 信息情报与通知端点

映射到 §3.3 `IntelligenceService`、`RiskAlertService`、`NotificationService`。

#### GET `/digest/latest`

获取最新一期的学业摘要。对应 BRD US-301a/b。

**Response (200):**
```json
{
  "data": {
    "digest_id": "dgst_001",
    "generated_at": "2026-03-02T06:00:00Z",
    "period": "daily",
    "courses": [
      {
        "code": "COMP2017",
        "highlights": [
          {
            "type": "new_grade",
            "summary": "Assignment 1 graded: 85/100 (D)",
            "urgency": "informational"
          },
          {
            "type": "staff_post",
            "summary": "Dr. Smith: Final exam will NOT cover Chapter 8",
            "urgency": "important",
            "source_thread_id": "thr_001"
          }
        ]
      }
    ],
    "urgent_deadlines": [
      {
        "course_code": "COMP3221",
        "title": "Lab 5 Submission",
        "due_date": "2026-03-05T17:00:00Z",
        "hours_remaining": 55
      }
    ]
  }
}
```

#### GET `/digest/history`

获取历史摘要列表。

**Query Parameters:** 支持 `cursor` + `limit` 分页。

**Response (200):**
```json
{
  "data": [
    {
      "digest_id": "dgst_001",
      "generated_at": "2026-03-02T06:00:00Z",
      "period": "daily",
      "highlight_count": 5
    }
  ]
}
```

#### GET `/alerts`

获取风险预警列表。对应 BRD US-105。映射到 `RiskAlertService`。

**Response (200):**
```json
{
  "data": [
    {
      "id": "alt_001",
      "type": "gpa_risk",
      "severity": "warning",
      "course_code": "STAT2011",
      "message": "Your projected mark (62) is 23 points below your target (85).",
      "current_mark": 62.0,
      "target_mark": 85.0,
      "created_at": "2026-03-02T10:00:00Z",
      "is_read": false
    },
    {
      "id": "alt_002",
      "type": "deadline_risk",
      "severity": "critical",
      "course_code": "COMP3221",
      "message": "Lab 5 is due in 3 hours and has not been submitted.",
      "deadline": "2026-03-05T17:00:00Z",
      "created_at": "2026-03-05T14:00:00Z",
      "is_read": false
    }
  ]
}
```

#### GET `/notifications`

获取通知列表（分级提醒 + 系统通知）。对应 BRD US-303。映射到 `NotificationService`。

**Query Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `unread_only` | bool | 仅返回未读通知（默认 false） |
| `cursor` | string | 分页游标 |

**Response (200):**
```json
{
  "data": [
    {
      "id": "ntf_001",
      "type": "deadline_reminder",
      "severity": "warning",
      "title": "Assignment 2 due in 24 hours",
      "body": "COMP2017 Assignment 2 is due tomorrow at 11:59 PM.",
      "is_read": false,
      "created_at": "2026-03-31T23:59:00Z"
    },
    {
      "id": "ntf_002",
      "type": "token_expired",
      "severity": "critical",
      "title": "Canvas token expired",
      "body": "Your Canvas API token is no longer valid. Please re-configure it in Settings.",
      "is_read": false,
      "action_url": "/settings/tokens",
      "created_at": "2026-03-02T10:00:00Z"
    }
  ]
}
```

---

### 12.8 数据同步端点

#### POST `/sync/trigger`

手动触发数据同步。映射到 §5 缓存与数据同步。

**Request:**
```json
{
  "scope": "all"
}
```

`scope` 可选值：`all` | `grades` | `deadlines` | `materials` | `discussions` | `outline`。

**Response (202):**
```json
{
  "data": {
    "sync_id": "sync_abc123",
    "status": "in_progress",
    "started_at": "2026-03-02T10:30:00Z"
  }
}
```

#### GET `/sync/status`

查询同步状态。

**Response (200):**
```json
{
  "data": {
    "last_sync": {
      "sync_id": "sync_abc123",
      "status": "completed",
      "started_at": "2026-03-02T10:30:00Z",
      "completed_at": "2026-03-02T10:31:15Z",
      "results": {
        "grades": { "synced": 12, "new": 2, "updated": 1 },
        "deadlines": { "synced": 8, "new": 0, "updated": 0 },
        "discussions": { "synced": 45, "new": 5, "updated": 0 }
      }
    },
    "platforms": {
      "canvas": { "status": "healthy", "last_success": "2026-03-02T10:31:00Z" },
      "ed": { "status": "healthy", "last_success": "2026-03-02T10:31:15Z" }
    }
  }
}
```

---

### 12.9 搜索端点

#### GET `/search`

全文搜索课件内容。对应 BRD US-202，技术方案参见 §3.3 课件搜索。

**Query Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 搜索关键词（必填） |
| `scope` | string | `materials` / `discussions` / `all`（默认 `all`） |
| `course_id` | string | 限定课程范围 |
| `limit` | int | 结果数量（默认 20） |

**Response (200):**
```json
{
  "data": [
    {
      "type": "material",
      "title": "Week 3 - Pointers and Memory",
      "source": "ed_lesson",
      "course_code": "COMP2017",
      "snippet": "...a <mark>pointer</mark> stores the memory address of another variable...",
      "url": "/courses/crs_abc123/materials/mat_003",
      "relevance": 0.92
    },
    {
      "type": "discussion",
      "title": "Confusion about pointer arithmetic",
      "source": "ed_discussion",
      "course_code": "COMP2017",
      "snippet": "...<mark>pointer</mark> arithmetic follows the size of the type...",
      "url": "/courses/crs_abc123/discussions/thr_045",
      "relevance": 0.85
    }
  ]
}
```

Phase 2 使用 PostgreSQL `tsvector/tsquery` 全文搜索（§3.3 课件搜索技术方案），`snippet` 由 `ts_headline` 生成。

---

### 12.10 健康检查端点

#### GET `/health`

无需认证。供 CloudWatch、CI/CD 和前端连通性检查使用。

**Response (200):**
```json
{
  "data": {
    "status": "healthy",
    "version": "2.4.0",
    "checks": {
      "database": "ok",
      "canvas_api": "ok",
      "ed_api": "ok",
      "cognito": "ok"
    },
    "timestamp": "2026-03-02T10:30:00Z"
  }
}
```

当某项检查失败时，`status` 为 `"degraded"`，对应检查项标记为 `"error"`。

---

## 13. 前端架构设计

### 13.1 技术选型

| 分类 | 选型 | 版本 | 理由 |
|------|------|------|------|
| 框架 | Next.js (App Router) | 14+ | React 生态，静态导出到 S3，文件系统路由 |
| 客户端状态 | Zustand | 5+ | 轻量、无 boilerplate，适合中小型应用 |
| 服务端状态 | TanStack Query | v5 | 缓存、后台刷新、乐观更新、请求去重 |
| CSS | Tailwind CSS | 3+ | Utility-first，与 shadcn/ui 无缝集成 |
| 组件库 | shadcn/ui | latest | 可复制的组件源码，不是黑盒依赖，完全可定制 |
| 图表 | Recharts | 2+ | React 原生，声明式 API，支持响应式 |
| HTTP 客户端 | ky | 1+ | 基于 fetch，轻量，自动 JSON、重试、钩子 |
| 日期处理 | date-fns | 3+ | Tree-shakeable，比 dayjs 更函数式 |
| 包管理器 | pnpm | 9+ | 快速、磁盘空间节省、严格依赖提升 |

### 13.2 页面路由

```
app/
├── (auth)/                         # 认证页面组（无 sidebar 布局）
│   ├── login/page.tsx              # 登录
│   └── register/page.tsx           # 注册
│
├── (onboarding)/                   # 引导流程（独立布局）
│   └── setup/
│       ├── page.tsx                # Step 1: 欢迎 + 基本设置
│       ├── canvas/page.tsx         # Step 2: Canvas Token 配置
│       └── ed/page.tsx             # Step 3: Ed Token 配置（可选跳过）
│
├── (dashboard)/                    # 主应用（含 sidebar 布局）
│   ├── layout.tsx                  # Sidebar + Header 布局
│   ├── page.tsx                    # Dashboard 首页（GPA 概览）
│   ├── courses/
│   │   └── [id]/
│   │       ├── page.tsx            # 课程详情（Tab: 成绩/课件/讨论/Outline）
│   │       └── materials/
│   │           └── [materialId]/page.tsx  # 课件详情/Slide 查看
│   ├── deadlines/page.tsx          # 统一 Deadline 时间线
│   ├── predict/page.tsx            # What-if GPA 预测器
│   ├── digest/page.tsx             # 学业摘要/信息情报
│   ├── search/page.tsx             # 全局搜索结果
│   └── settings/
│       ├── page.tsx                # 个人设置
│       └── tokens/page.tsx         # Token 管理
│
└── api/                            # Next.js 不使用 API routes（纯静态导出）
```

**路由与 BRD User Stories 映射：**

| 页面 | 对应 User Story |
|------|----------------|
| Dashboard 首页 | US-101（实时 GPA）、US-104（评分权重） |
| What-if 预测器 | US-102（What-if 模拟）、US-103（目标路径） |
| Deadline 时间线 | US-106（统一 Deadline） |
| 课程详情 - 课件 Tab | US-201（课件聚合） |
| 搜索页 | US-202（课件搜索） |
| 学业摘要 | US-301a（每日摘要）、US-302a（高价值帖子） |
| Onboarding | US-501（3 步注册）、US-502（零安装） |
| Settings / Tokens | Token 配置和管理 |

### 13.3 状态管理

| 层 | 工具 | 内容 |
|---|---|---|
| 客户端 UI | Zustand stores | `UIStore`（sidebar 开合、activeTab）、`PredictorStore`（What-if 分数暂存） |
| 服务端数据 | TanStack Query v5 | 每个 §12 端点对应一个 hook（useGPA、useCourses、useDeadlines、usePredictGPA 等） |

**缓存策略**: GPA/Courses `staleTime: 5min`，Deadlines `refetchInterval: 15min`，Digest 手动刷新。Query Key 与端点路径一一映射。

### 13.4 组件架构

按功能域组织 `components/` 目录：`gpa/`、`deadlines/`、`materials/`、`discussions/`、`alerts/`、`predict/`、`onboarding/`、`digest/`、`shared/`。

每个域包含列表 + 卡片/详情 + 图表（如适用）组件，命名 `<feature>-<role>.tsx`。`shared/` 含全局 sidebar、header（搜索+通知+用户菜单）、stale-data-banner（§14.3）、loading-skeleton、error-boundary。

### 13.5 响应式设计

Mobile-first 设计，3 个断点：

| 断点 | 宽度 | 布局 |
|------|------|------|
| Mobile | < 768px | 单列，Sidebar → Sheet（底部抽屉），图表堆叠 |
| Tablet | 768px - 1024px | 侧边栏折叠为图标，2 列 Grid |
| Desktop | > 1024px | 侧边栏展开，3 列 Grid |

Sidebar 在移动端变为 shadcn/ui Sheet；What-if 预测器 Desktop 左右分栏 → Mobile 上下堆叠；图表用 Recharts `ResponsiveContainer` 自适应。

### 13.6 关键页面线框

#### Dashboard 首页布局

```
┌─────────────────────────────────────────────────────────┐
│ [≡] UniBoard                    🔍 Search  🔔  👤      │
├──────┬──────────────────────────────────────────────────┤
│      │                                                  │
│  📊  │  ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│ Dash │  │ Current WAM │ │ GPA Target  │ │  Alerts   │  │
│      │  │   78.5 / D  │ │  85.0 / HD  │ │  2 new    │  │
│  📚  │  └─────────────┘ └─────────────┘ └───────────┘  │
│ Cours│                                                  │
│      │  ┌───────────────────────────────────────────┐  │
│  📅  │  │ Course Grades Overview                     │  │
│ Dead │  │ ┌──────────┬────────┬────────┬──────────┐  │  │
│      │  │ │ COMP2017 │ 82.5 D │ ██████░│ 40% done │  │  │
│  🎯  │  │ │ COMP3221 │ 76.0 D │ █████░░│ 35% done │  │  │
│ Pred │  │ │ STAT2011 │ 62.0 P │ ████░░░│ 30% done │  │  │
│      │  │ └──────────┴────────┴────────┴──────────┘  │  │
│  📡  │  └───────────────────────────────────────────┘  │
│ Dig. │                                                  │
│      │  ┌──────────────────┐ ┌──────────────────────┐  │
│  ⚙️  │  │ Upcoming          │ │ Assessment Weights   │  │
│ Sett │  │ Deadlines (7d)   │ │ COMP2017 (pie chart) │  │
│      │  │ • Lab 5    3 days│ │ [Asgn1 15%] [Mid 20%]│  │
│      │  │ • Essay    5 days│ │ [Asgn2 15%] [Fin 50%]│  │
│      │  └──────────────────┘ └──────────────────────┘  │
└──────┴──────────────────────────────────────────────────┘
```

#### 课程详情 Tab 布局

```
┌─────────────────────────────────────────────┐
│ COMP2017 - Systems Programming              │
├─────────────────────────────────────────────┤
│ [Grades] [Materials] [Discussions] [Outline] │
├─────────────────────────────────────────────┤
│ (Tab content area)                          │
│                                             │
│ Grades Tab:                                 │
│   Assessment weights chart + grade list     │
│                                             │
│ Materials Tab:                              │
│   Canvas Modules + Ed Lessons unified list  │
│                                             │
│ Discussions Tab:                            │
│   High-value threads filtered by relevance  │
│                                             │
│ Outline Tab:                                │
│   Unit Outline parsed assessment structure  │
└─────────────────────────────────────────────┘
```

#### What-if 预测器布局

```
┌───────────────────────┬─────────────────────┐
│ Score Input Panel     │ Result Panel        │
│                       │                     │
│ COMP2017:             │ Current WAM: 78.5   │
│ Assignment 2 ──[85]─○ │ Predicted:   83.2   │
│ Final Exam   ──[90]─○ │ Delta:      +4.7    │
│                       │                     │
│ COMP3221:             │ ┌─────────────────┐ │
│ Project    ──[75]──○  │ │ WAM Comparison  │ │
│ Final Exam ──[80]──○  │ │ (bar chart)     │ │
│                       │ │ Current vs Pred │ │
│ [Reset All]           │ └─────────────────┘ │
│                       │                     │
│                       │ Per-course breakdown│
│                       │ table below chart   │
└───────────────────────┴─────────────────────┘
```

### 13.7 认证流程

```
浏览器打开 UniBoard
        │
        ▼
  JWT 存在于 localStorage?
     │           │
    Yes          No
     │           │
     ▼           ▼
  JWT 有效?    → /login
     │
    Yes     No (expired)
     │           │
     │     尝试 silent refresh
     │     (POST /auth/refresh)
     │           │
     │      成功?  │
     │     Yes    No
     │      │      │
     │      │   清除 Token → /login
     │      │
     ▼      ▼
  Onboarding 完成?
     │           │
    Yes          No
     │           │
     ▼           ▼
  /dashboard    /setup (3-step onboarding)
```

**Token 存储**: `access_token` 存内存（Zustand），刷新后通过 refresh token 重获；`refresh_token` 存 `httpOnly` cookie 或 localStorage（静态导出 fallback）。

### 13.8 构建与打包

`pnpm build` 静态导出到 `out/` → S3 → CloudFront 缓存失效（§16.6）。首屏 JS < 200KB gzip，Recharts 按需加载（`next/dynamic`）。

---

## 14. 错误处理与降级策略

### 14.1 错误分类

| 错误码 | HTTP 状态 | 含义 | 可重试 | 用户操作 |
|--------|----------|------|--------|---------|
| `VALIDATION_ERROR` | 400 | 请求参数不合法 | 否 | 修正输入后重试 |
| `AUTH_REQUIRED` | 401 | 未登录或 JWT 过期 | 否 | 重新登录 |
| `FORBIDDEN` | 403 | 无权限 | 否 | 联系管理员 |
| `NOT_FOUND` | 404 | 资源不存在 | 否 | 检查 URL |
| `TOKEN_INVALID` | 422 | 平台 API Token 失效 | 否 | 重新配置 Token |
| `RATE_LIMITED` | 429 | 请求过于频繁 | 是 | 等待后自动重试 |
| `UPSTREAM_ERROR` | 502 | Canvas/Ed API 错误 | 是 | 显示缓存数据 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 | 是 | 等待后重试 |

### 14.2 后端全局异常处理

- 基类 `UniboardError(code, message, status_code)` + 子类 `TokenInvalidError`、`UpstreamAPIError`、`RateLimitedError`
- FastAPI `exception_handler` 统一返回 §12.1 错误信封格式，catch-all 不泄露堆栈
- 每个请求附带 `request_id`（中间件注入），日志和响应均携带

### 14.3 Canvas/Ed API 降级策略

`DegradedResponse` 包装器包含：`data`、`is_stale`、`stale_since`、`staleness_seconds`、`source("live"|"cache")`。

**流程**: 优先获取实时数据 → 失败时返回缓存数据 + `is_stale=true` → 无缓存时才抛错。

**前端联动**: 响应中 `is_stale=true` 时显示 `<StaleDataBanner>`："Data may be outdated (last updated X ago). [Retry Now]"

### 14.4 Token 失效处理流程

```
同步任务调用 Canvas/Ed API
         │
    收到 401/403 响应
         │
         ▼
  标记 Token 状态为 "invalid" (DB)
         │
         ├──→ 发送邮件通知用户（SES）
         │    Subject: "Your Canvas token needs attention"
         │
         ├──→ 创建 Web 通知（notification type: "token_expired"）
         │    action_url: "/settings/tokens"
         │
         └──→ 后续同步任务跳过该平台
              直到用户重新配置有效 Token
```

**检测周期**: 每次同步任务执行时检查（最频繁每 15 分钟一次，参见 §5.1），符合 BRD 要求的"< 1 小时检测延迟"。

### 14.5 重试策略

指数退避 + jitter（1s → 2s → 4s，max 30s），可重试状态码 `{429, 500, 502, 503, 504}`，最多 3 次。429 时尊重 `Retry-After` 头。

### 14.6 用户友好错误消息

| 场景 | 用户看到的消息 | 操作按钮 |
|------|-------------|---------|
| Canvas Token 失效 | "Your Canvas connection needs to be refreshed." | [Go to Settings] |
| Ed Token 失效 | "Your Ed connection needs to be refreshed." | [Go to Settings] |
| Canvas API 宕机 | "Canvas is temporarily unavailable. Showing last known data." | [Retry] |
| Ed API 宕机 | "Ed is temporarily unavailable. Showing last known data." | [Retry] |
| 网络断开 | "You appear to be offline. Showing cached data." | [Retry when online] |
| 同步失败 | "We couldn't sync your latest data. Will retry automatically." | [Retry Now] |
| GPA 计算缺数据 | "Some courses don't have grades yet. GPA is based on available data." | — |
| Unit Outline 解析失败 | "Couldn't parse assessment structure for {course}. Using Canvas data." | — |

### 14.7 熔断器 (Circuit Breaker)

每个上游平台独立维护熔断器状态，防止对故障 API 持续请求：

```
状态转换:
CLOSED ──[5 次连续失败]──→ OPEN ──[60s 冷却]──→ HALF_OPEN ──[1 次成功]──→ CLOSED
                                                     │
                                               [1 次失败]
                                                     │
                                                     ▼
                                                   OPEN
```

| 参数 | Canvas | Ed |
|------|--------|-----|
| 失败阈值 | 5 次 | 5 次 |
| 冷却时间 | 60 秒 | 60 秒 |
| 半开放测试请求 | 1 次 | 1 次 |

**与降级策略联动**: 熔断器 OPEN 状态时，直接走缓存路径（§14.3），不尝试实际 API 调用，减少延迟。Canvas 和 Ed 各自独立维护熔断器实例。

---

## 15. 数据库管理

### 15.1 ORM：SQLAlchemy 2.0 Async

SQLAlchemy 2.0 async + `asyncpg` 驱动。ORM 模型（`User`、`Course`、`Grade`、`DiscussionThread`、`UnitOutline`、`UnifiedDeadline`、`PushRecord` 等）字段与 §4 ER 图一一对应，索引定义见 §15.5。

### 15.2 Migration：Alembic

Alembic async 配置，`target_metadata = Base.metadata`。迁移文件按顺序编号：`001_initial_schema`（Users/Courses/Grades）→ `002_add_discussions` → `003_add_unit_outline` → `004_add_search_vectors`。

**生产部署**: CDK 部署时通过专用 Migration Lambda 运行 `alembic upgrade head`（§16.4），在 API Lambda 之前执行。

### 15.3 Lambda 连接池

**决策**: 不使用 RDS Proxy（最低 $15/月，超出预算），改用 Lambda 内置连接池：`pool_size=1, max_overflow=0, pool_recycle=300, pool_pre_ping=True`。

**连接数验证**: Lambda 并发 5-10 实例 × 每实例 1 连接 = 5-10 << RDS t3.micro 上限 60，安全余量充足。

### 15.4 Schema 初始化

CDK 部署顺序：RDS 实例 → Migration Lambda（`alembic upgrade head`）→ API Lambda → API Gateway。可选 `scripts/seed.py` 注入 demo 数据。

### 15.5 索引策略

| 索引名 | 表 | 列 | 类型 | 用途 |
|--------|------|------|------|------|
| `ix_users_email` | users | email | B-Tree (UNIQUE) | 登录查询 |
| `ix_users_cognito_sub` | users | cognito_sub | B-Tree (UNIQUE) | JWT 验证 |
| `ix_courses_user_semester` | courses | (user_id, semester) | B-Tree | 按学期查课程 |
| `ix_courses_canvas_id` | courses | (user_id, canvas_course_id) | B-Tree | Canvas ID 映射 |
| `ix_grades_course` | grades | (course_id, graded_at) | B-Tree | 成绩时间线 |
| `ix_threads_course_created` | discussion_threads | (course_id, created_at) | B-Tree | 帖子列表 |
| `ix_threads_ed_id` | discussion_threads | (course_id, ed_thread_id) | B-Tree (UNIQUE) | 增量同步去重 |
| `ix_threads_gpa_score` | discussion_threads | (course_id, gpa_relevance_score) | B-Tree | 高价值帖子筛选 |
| `ix_threads_search` | discussion_threads | search_vector | GIN | 全文搜索 |
| `ix_deadlines_course_due` | unified_deadlines | (course_id, due_date) | B-Tree | Deadline 排序 |
| `ix_deadlines_dedup` | unified_deadlines | dedup_key | B-Tree (UNIQUE) | 去重合并 |
| `ix_push_records_user_hash` | push_records | (user_id, content_hash) | B-Tree (UNIQUE) | 推送去重 |

#### 全文搜索 tsvector + 自动更新 trigger

```sql
-- Add tsvector column to discussion_threads
ALTER TABLE discussion_threads
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
) STORED;

-- GIN index for fast full-text search
CREATE INDEX ix_threads_search ON discussion_threads USING GIN (search_vector);

-- Query example
SELECT id, title, ts_headline('english', content, query) AS snippet
FROM discussion_threads, to_tsquery('english', 'exam & pointer') AS query
WHERE search_vector @@ query
ORDER BY ts_rank(search_vector, query) DESC
LIMIT 20;
```

### 15.6 数据保留与清理

| 数据类型 | 保留周期 | 清理策略 |
|---------|---------|---------|
| 用户账户 | 永久（除非用户删除） | DELETE /users/me |
| 课程 + 成绩 | 永久（历史 GPA 计算需要） | 用户删除时级联 |
| Discussion Threads | 当前学期 + 上一学期 | 每学期末清理更早的帖子 |
| Push Records | 90 天 | 定期清理过期记录 |
| Unit Outline 缓存 | 当前学期 + 上一学期 | 新学期开始时清理旧缓存 |
| 同步日志 | 30 天 | 定期清理 |
| 数据导出文件 (S3) | 24 小时 | S3 Lifecycle Policy 自动过期 |

**清理实现**: EventBridge 每周日触发 Cleanup Lambda（§16.4），按保留周期批量 DELETE。

---

## 16. 部署方案

### 16.1 环境划分

| 环境 | 用途 | 基础设施 | 说明 |
|------|------|---------|------|
| **dev** | 开发和测试 | 同一 AWS 账户，stack 前缀 `dev-` | 可随时销毁重建 |
| **prod** | 生产环境 | 同一 AWS 账户，stack 前缀 `prod-` | 持久运行 |

> **决策**: 100 用户规模不需要 staging 环境。dev 环境足够验证部署流程。通过 CDK stack 前缀隔离资源。

### 16.2 基础设施拓扑图

```
                         Internet
                            │
                    ┌───────▼───────┐
                    │   Route 53    │
                    │ uniboard.app  │
                    └───┬───────┬───┘
                        │       │
           ┌────────────▼┐  ┌──▼────────────┐
           │ CloudFront  │  │ API Gateway   │
           │ (前端 CDN)  │  │ (REST API)    │
           │ uniboard.app│  │ api.uniboard  │
           └──────┬──────┘  │  .app         │
                  │         └──────┬────────┘
           ┌──────▼──────┐        │
           │  S3 Bucket  │   ┌────▼──────────────────────────────┐
           │  (静态前端) │   │         Lambda Functions           │
           └─────────────┘   │                                    │
                             │  ┌────────────┐ ┌──────────────┐  │
                             │  │ api-handler │ │ sync-worker  │  │
                             │  │ (FastAPI)   │ │ (定时同步)    │  │
                             │  └──────┬─────┘ └──────┬───────┘  │
                             │         │              │          │
                             │  ┌──────┴──────┐ ┌─────┴───────┐ │
                             │  │ digest-gen  │ │ migration   │ │
                             │  │ (摘要生成)  │ │ (DB迁移)    │ │
                             │  └─────────────┘ └─────────────┘ │
                             └────────────┬──────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                 VPC │                     │
                    │            ┌────────▼────────┐           │
                    │            │  RDS PostgreSQL  │           │
                    │            │  (t3.micro)      │           │
                    │            └─────────────────┘           │
                    │                                           │
                    │   ┌──────────────┐  ┌──────────────┐     │
                    │   │ Secrets Mgr  │  │  VPC Endpoints│    │
                    │   │ (主加密密钥) │  │  (S3/Secrets) │    │
                    │   └──────────────┘  └──────────────┘     │
                    └───────────────────────────────────────────┘

            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │   Cognito    │  │     SES      │  │ EventBridge  │
            │  (用户认证)  │  │  (邮件推送)  │  │  (定时调度)  │
            └──────────────┘  └──────────────┘  └──────────────┘

            ┌──────────────┐
            │  CloudWatch  │
            │  (日志/监控) │
            └──────────────┘
```

### 16.3 CDK Stack 结构

`infra/app.py` 通过 `env_prefix`（`"dev"` | `"prod"`）实例化 8 个 Stack，依赖链：network → database → api/scheduler → 其余。

| Stack | 资源 |
|-------|------|
| `network` | VPC, Subnets (public+private), Security Groups, VPC Endpoints (S3, Secrets Manager) |
| `database` | RDS PostgreSQL t3.micro, Secrets Manager (master password + encryption key) |
| `auth` | Cognito User Pool, App Client, custom domain |
| `api` | Lambda (api-handler, migration), API Gateway REST API, IAM Roles |
| `frontend` | S3 Bucket (static hosting), CloudFront Distribution, OAI |
| `scheduler` | Lambda (sync-worker, digest-gen, cleanup), EventBridge Rules |
| `email` | SES Domain Identity, Email Templates |
| `monitoring` | CloudWatch Dashboards, Alarms, Log Groups |

### 16.4 Lambda 配置

| 函数 | 入口模块 | Memory | Timeout | 触发方式 | 说明 |
|------|---------|--------|---------|---------|------|
| `api-handler` | `src.web.main:handler` (Mangum) | 256MB | 30s | API Gateway | 主 API 处理，包含全部 §12 端点 |
| `sync-worker` | `src.workers.sync:handler` | 512MB | 120s | EventBridge (每15分钟) | Canvas/Ed 数据同步（§5.1） |
| `digest-gen` | `src.workers.digest:handler` | 256MB | 60s | EventBridge (每日 06:00 AEST) | 每日摘要生成（§12.7） |
| `migration` | `src.workers.migrate:handler` | 128MB | 60s | CDK Custom Resource | 数据库迁移（§15.2），仅部署时运行 |
| `cleanup` | `src.workers.cleanup:handler` | 128MB | 60s | EventBridge (每周日 03:00) | 数据清理（§15.6） |
| `token-check` | `src.workers.token_check:handler` | 128MB | 30s | EventBridge (每小时) | Token 有效性检测（§14.4） |
| `notification` | `src.workers.notification:handler` | 128MB | 30s | EventBridge (每小时) | 分级提醒检查和发送（§12.7） |

所有 Lambda 运行在 VPC 私有子网中（访问 RDS 需要），通过 VPC Endpoints 访问 S3 和 Secrets Manager。

### 16.5 域名与 SSL

| 域名 | 指向 | 用途 |
|------|------|------|
| `uniboard.app` | CloudFront Distribution | 前端静态站点 |
| `api.uniboard.app` | API Gateway Custom Domain | 后端 REST API |

**SSL 证书**: ACM (AWS Certificate Manager) 免费签发，自动续期。CloudFront 需要 `us-east-1` 区域证书，API Gateway 使用部署区域证书。

**DNS**: Route53 托管区域，A 记录 (Alias) 指向 CloudFront/API Gateway。

### 16.6 CI/CD

GitHub Actions，`.github/workflows/deploy.yml`：

| Job | 触发 | 步骤 |
|-----|------|------|
| `test` | push/PR → main, develop | ruff check → mypy → pytest --cov |
| `test-frontend` | 同上 | pnpm typecheck → lint → test → build |
| `deploy-dev` | push → develop，needs: test + test-frontend | `cdk deploy --all -c env=dev` → S3 sync → CloudFront invalidation |
| `deploy-prod` | push → main，needs: test + test-frontend | 同 dev，需手动审批（`environment: production`） |

### 16.7 成本明细

#### AWS Free Tier 期间（首 12 个月，100 用户以内）

| 服务 | 月费用 | 说明 |
|------|--------|------|
| RDS PostgreSQL t3.micro | $0.00 | Free Tier: 750h/月 |
| Lambda | $0.00 | Free Tier: 1M 请求 + 400,000 GB-s（详见下方 GB-seconds 明细） |
| API Gateway | $0.00 | Free Tier: 1M API 调用/月（12 个月） |
| S3 | $0.00 | Free Tier: 5GB + 20K GET + 2K PUT |
| CloudFront | $0.00 | Free Tier: 1TB 传输 + 10M 请求 |
| Cognito | $0.00 | Free Tier: 50,000 MAU |
| SES | $0.00 | Free Tier: 62,000 封/月（从 EC2/Lambda 发送） |
| Secrets Manager | ~$0.40 | 1 个密钥 × $0.40/月 |
| Route53 | ~$0.50 | 1 个托管区域 ($0.50) + 查询费 (~$0) |
| CloudWatch | $0.00 | Free Tier: 基础监控 |
| ACM | $0.00 | 免费 SSL 证书 |
| **总计** | **~$1.40/月** | |

**Lambda GB-seconds 详细估算：**

| Lambda 函数 | Memory | 超时 | 执行次数/月 | GB-seconds/月 | 占 Free Tier 比例 |
|------------|--------|------|-----------|--------------|-----------------|
| sync-worker | 512MB | 120s | 2,880 (每15分钟) | ~184,320 | 46.1% |
| api-handler | 256MB | 30s | ~10,000 | ~2,500 | 0.6% |
| digest-gen | 256MB | 60s | 30 (每日) | ~450 | 0.1% |
| token-check | 128MB | 30s | 720 (每小时) | ~2,700 | 0.7% |
| notification | 128MB | 30s | 720 (每小时) | ~2,700 | 0.7% |
| cleanup | 128MB | 60s | 4 (每周日) | ~30 | ~0% |
| migration | 128MB | 60s | ~2 (部署时) | ~15 | ~0% |
| **总计** | | | | **~192,715** | **48.2%** |

> **注意**: sync-worker 单独占 Free Tier 的 46%，是 GB-seconds 消耗的主要来源。100 用户规模下总用量在 Free Tier 范围内（~48%），但若用户增长或同步频率提高，可能接近上限。**优化方向**：缩短 sync-worker 平均执行时间（目标 < 60s）、空闲时段降低同步频率、实现增量同步减少 API 调用。

#### Free Tier 过期后

| 服务 | 月费用 | 说明 |
|------|--------|------|
| RDS PostgreSQL t3.micro | ~$12.00 | 按需: ~$0.017/h × 730h |
| Lambda | ~$0.50 | 预估 100K 请求/月 |
| API Gateway | ~$0.35 | 100K 请求 × $3.50/M |
| S3 | ~$0.10 | 存储 + 请求 |
| CloudFront | ~$0.10 | 100 用户流量极小 |
| Secrets Manager | ~$0.40 | 同上 |
| Route53 | ~$0.50 | 同上 |
| **总计** | **~$14.00/月** | RDS 占主导 |

> **成本优化备选**: 如果 RDS 成本过高，可考虑：
> - **Neon PostgreSQL (Free Tier)**: 0.5GB 存储 + 190 compute hours/月，100 用户足够，月费 $0
> - **Aurora Serverless v2**: 按用量计费，低流量时约 $8/月
> - **Supabase (Free Tier)**: 500MB 数据库 + 5GB 带宽，月费 $0

### 16.8 首次部署清单

**前置**: 注册域名 `uniboard.app`、AWS 账户 + Free Tier、CDK CLI、GitHub Secrets（AWS credentials）、SES 生产访问申请。

**部署**: `cdk bootstrap` → `cdk deploy dev-network dev-database` → 验证 RDS → `cdk deploy --all -c env=dev` → 上传前端 → CloudFront 失效。

**验证**: `GET /health` 200 → 注册+登录+配置 Token+同步 → Dashboard 数据显示 → CloudWatch 确认定时 Lambda 触发。

---

## 17. 修订历史

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|----------|------|
| 1.0 | 2026-01-13 | 初始 PRD（BRD + TRD 合并版） | Ricky |
| 2.0 | 2026-03-01 | 从 PRD 拆分为独立 TRD；详细化 MCP 工具 API 规格（参数/返回值/端点）；新增 Platform Adapter 接口设计；新增 ER 关系图和字段详情；新增 AI 提示词工程技术方案；新增 Ed Lessons API 验证计划；技术栈标记为待定 | Ricky |
| 2.1 | 2026-03-01 | 技术栈确认 AWS Serverless；新增 Unit Outline 抓取工具和服务；新增 DeadlineService 三源聚合；新增 UnitOutline 和 UnifiedDeadline 数据模型；明确 AI vs 确定性解析职责划分；架构图新增悉大官网数据源；项目结构新增 parsers/ 和 deadlines 模块；**Ed Lessons API 研究更新**：确认无现成开源实现、需自行 DevTools 抓包逆向工程、与 Discussion 共用认证机制、新增实现计划 | Ricky |
| 2.2 | 2026-03-02 | **API 验证全部完成**：Ed Lessons 三端点已确认（content 非 passage），slides 内联不需单独工具；Unit Outline URL 获取改为 tabs+external_tools 两步法，DOM 选择器 #assessment-table 跨院系统一，无需登录无反爬；Ed Discussion filter/category/sort/offset 参数已确认，user.course_role 字段发现；Ed API 速率限制确认宽于 Canvas；项目更名为 uniboard | Ricky |
| 2.3 | 2026-03-02 | **全面审查与完善**: 新增 §3.4 评分权重双数据源优先级策略（Unit Outline 为主/Canvas 为备）；新增 §3.5 完整 GPA/WAM 计算公式（WAM 公式 + 4.0 GPA 映射 + 单课成绩计算 + What-if 预测 + 目标反推算法）；新增 RiskAlertService（风险预警）、NotificationService（分级提醒）设计；课件搜索补充 PostgreSQL 全文搜索技术方案；AIEngine 新增 summarize_material 方法对应 BRD US-203；技术栈未决项全部确定：IaC→CDK(Python)、Token 存储→RDS 加密字段、Web 框架→FastAPI、缓存→RDS 缓存表；标题版本号修正为 v2.3 | Ricky |
| 2.4 | 2026-03-02 | **补充 5 个 Phase 2 必需章节**: 新增 §12 REST API 规格、§13 前端架构、§14 错误处理与降级、§15 数据库管理、§16 部署方案。随后精简通用代码示例（Zustand/TanStack hooks、FastAPI 异常处理、指数退避、熔断器、ORM 模型、Alembic 配置、CI/CD YAML），仅保留项目决策和 API 契约，§13-§16 减少约 33% 行数 | Ricky |
| 2.5 | 2026-03-03 | **全面质量审查修复**: 补充 §11 测试数据章节；合并重复 CourseMaterialService；User 表补充 cognito_sub；ER 图与字段详情统一；Lambda GB-seconds 成本估算详细化；新增 §6.4 AI 评估框架；新增 §18 本地开发环境；CLAUDE.md 技术细节迁入 TRD；Token 失效处理去重（§5.3→§14.4）；Lambda 入口签名补充；AI Engine 方法签名完善；Ed API 技术细节迁入 §2.3/§9 | Ricky |

---

## 18. 本地开发环境

### 18.1 前置依赖

| 工具 | 版本 | 用途 |
|------|------|------|
| Python | 3.12+ | 后端运行时 |
| Node.js | 20+ LTS | 前端运行时 |
| pnpm | 9+ | 前端包管理器 |
| Docker / Docker Compose | latest | 本地 PostgreSQL |
| uv 或 pip | latest | Python 依赖管理 |

### 18.2 Docker Compose（本地 PostgreSQL）

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: uniboard_dev
      POSTGRES_USER: uniboard
      POSTGRES_PASSWORD: devpassword
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 18.3 环境变量模板

```bash
# .env.example — 复制为 .env 后填入实际值

# Database
DATABASE_URL=postgresql+asyncpg://uniboard:devpassword@localhost:5432/uniboard_dev

# Platform API Tokens（从 Canvas/Ed 获取）
CANVAS_API_TOKEN=your_canvas_token_here
ED_API_TOKEN=your_ed_token_here

# API Base URLs
CANVAS_BASE_URL=https://canvas.sydney.edu.au/api/v1
ED_BASE_URL=https://edstem.org/api

# Encryption（本地开发用，生产环境从 Secrets Manager 获取）
ENCRYPTION_KEY=dev-only-32-byte-key-do-not-use-in-prod

# AI (optional for Phase 3)
ANTHROPIC_API_KEY=your_anthropic_key_here
```

> **注意**: `.env` 文件必须在 `.gitignore` 中，绝不提交到仓库。

### 18.4 MCP Server 本地注册

在 Claude Desktop 配置文件中注册 MCP Server：

**配置文件路径**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "uniboard": {
      "command": "python",
      "args": ["-m", "src.mcp.server"],
      "cwd": "/path/to/uniboard",
      "env": {
        "CANVAS_API_TOKEN": "your_canvas_token",
        "ED_API_TOKEN": "your_ed_token"
      }
    }
  }
}
```

### 18.5 启动命令

```bash
# --- 后端 ---
# 启动本地 PostgreSQL
docker compose up -d

# 数据库迁移
alembic upgrade head

# 启动 FastAPI 开发服务器
uvicorn src.web.main:app --reload --port 8000

# --- 前端 ---
cd frontend/
pnpm install
pnpm dev          # http://localhost:3000

# --- 验证（提交前必须全部通过）---
mypy src/
pytest
ruff check .

# 一键验证
mypy src/ && pytest && ruff check .
```

### 18.6 首次设置快速指南

```
1. git clone git@github.com:r1ckyIn/uniboard.git
2. cd uniboard
3. cp .env.example .env        # 填入实际 Token
4. docker compose up -d         # 启动 PostgreSQL
5. pip install -e ".[dev]"      # 安装依赖
6. alembic upgrade head         # 初始化数据库
7. pytest                       # 验证环境正常
8. uvicorn src.web.main:app --reload  # 启动后端
```
