# Phase 21: MCP Server & ROI Analysis - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Two independent deliverables:

1. **Open-source MCP Server** — Standalone package based on UniBoard's adapter code (Canvas + Ed Discussion + Ed Lessons + Unit Outline). Users bring their own tokens, no UniBoard backend dependency. Published as open-source for any Claude Desktop user.

2. **Assignment ROI Analysis** — Identifies high-weight/low-difficulty assignments for effort optimization. Comprehensive difficulty estimation (historical grades + AI inference). Results displayed in Predict page alongside existing What-if simulator.

**NOT in scope:** Claude Desktop querying UniBoard backend (original PLAT-03 concept rejected). The MCP server is a standalone tool, not a bridge to UniBoard.

</domain>

<decisions>
## Implementation Decisions

### MCP Server — Scope & Architecture
- **D-01:** Build a new, complete MCP server based on UniBoard's adapter code. NOT a repackage of the existing `canvas-ed-mcp` — a more feature-rich version with Ed Lessons, Unit Outline parsing, and enhanced functionality.
- **D-02:** Standalone package — users provide Canvas token + Ed token via environment variables. No Supabase, no UniBoard backend dependency.
- **D-03:** Open-source distribution. Published as its own repository or clearly separable module.
- **D-04:** Adapter coverage: Canvas (modules, assignments, grades, announcements, files), Ed Discussion (threads, search), Ed Lessons (lessons, assignments), Unit Outline (HTML parsing with weight extraction).

### MCP Server — Claude's Discretion (Technical)
- **D-05:** Framework: Python `mcp` SDK (official MCP Python SDK). Claude to research best practices for tool definitions, resource exposure, and server lifecycle.
- **D-06:** Authentication: Environment variable tokens (`CANVAS_API_TOKEN`, `ED_API_TOKEN`, `CANVAS_BASE_URL`). Standard MCP server config pattern.
- **D-07:** Tool granularity and naming conventions — Claude to design based on MCP best practices and existing adapter method coverage.
- **D-08:** Error handling, rate limiting, and circuit breaker patterns — reuse UniBoard adapter patterns where applicable.

### ROI Analysis — Algorithm
- **D-09:** Comprehensive difficulty estimation approach:
  - **Primary (historical):** For graded assignments, use student's own score/max_score ratio to infer difficulty (low score = hard, high score = easy).
  - **Fallback (AI inference):** For ungraded/upcoming assignments, Claude analyzes assignment description, rubric complexity, Ed Discussion thread volume/sentiment, and assignment type (quiz vs essay vs project) to estimate difficulty on a scale.
- **D-10:** ROI formula: `ROI = weight / normalized_difficulty`. Higher ROI = more grade impact per effort unit. Assignments ranked by ROI descending.
- **D-11:** Output: per-assignment ROI score + recommendation text (e.g., "High priority: 30% weight, estimated easy" or "Low priority: 5% weight, estimated hard").

### ROI Analysis — Presentation
- **D-12:** Display location: Predict page, alongside existing What-if simulator. New ROI ranking card/section.
- **D-13:** REST API endpoint for ROI data (serves Predict page). Claude to design endpoint contract.
- **D-14:** ROI is web-only. NOT exposed via the MCP server (MCP server is a standalone Canvas+Ed tool, not tied to UniBoard features).

### Claude's Discretion (Technical)
- MCP SDK version and server boilerplate structure
- MCP tool list design (which adapter methods become tools, naming, input schemas)
- ROI API endpoint path and response schema
- ROI Predict page UI layout (card design, ranking visualization)
- AI difficulty inference prompt design
- Difficulty normalization approach (1-5 scale, percentile, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UniBoard Adapters (MCP server source code)
- `src/adapters/canvas.py` — CanvasAdapter: 7 endpoints, rate limiter, circuit breaker, pagination
- `src/adapters/ed_discussion.py` — EdDiscussionAdapter: defensive Pydantic parsing, graceful degradation
- `src/adapters/ed_lessons.py` — EdLessonsAdapter: lesson content, assignment extraction
- `src/parsers/unit_outline.py` — UnitOutlineParser: USYD HTML scraping, weight-sum validation

### MCP Protocol & SDK
- Python MCP SDK (`mcp` package) — official Anthropic MCP server SDK for Python

### ROI Data Sources
- `src/models/grade.py` — Grade model: score, max_score, weight, group_name (historical difficulty source)
- `src/models/course.py` — Course model: grading_weights JSONB (weight breakdown)
- `src/models/deadline.py` — Deadline model: weight, due_date (upcoming assignment context)
- `src/services/gpa.py` — GPAService: existing grade band thresholds, WAM calculation

### Existing AI Infrastructure
- `src/services/ai_engine.py` — AIEngine: Claude API wrapper, AGENT_TOOLS, agent_stream()
- `src/services/tool_executor.py` — ToolExecutor: routes tool calls to adapters (pattern reference for MCP server)
- `src/services/qa.py` — QAService: hybrid direct-context/RAG (AI inference integration point)

### Frontend (ROI integration point)
- `frontend/app/[locale]/(dashboard)/predict/page.tsx` — Predict page (add ROI section)
- `docs/frontend_brief.md` — Design system tokens (Rough.js, warm colors)
- `prototype/predict.html` — Original predict prototype

### Requirements & Architecture
- `docs/UniBoard_TRD_v2.md` §2 — MCP tool specifications
- `docs/UniBoard_TRD_v2.md` §12 — REST API specifications
- `docs/UniBoard_BRD_v2.md` — PLAT-03 (MCP server), TUTOR-03 (ROI analysis)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Platform Adapters** (`src/adapters/`): Full Canvas, Ed Discussion, Ed Lessons adapters with rate limiting, circuit breaker, error handling — direct source for MCP server tools.
- **UnitOutlineParser** (`src/parsers/unit_outline.py`): HTML parsing with weight-sum validation — unique differentiator for MCP server.
- **ToolExecutor** (`src/services/tool_executor.py`): Routes tool names to adapter methods — architectural pattern reference for MCP server tool dispatch.
- **GPAService** (`src/services/gpa.py`): Grade band thresholds, WAM calculation — reuse for ROI grade-based difficulty estimation.
- **AIEngine** (`src/services/ai_engine.py`): Claude API wrapper — reuse for AI difficulty inference.
- **Predict page components**: Existing What-if simulator UI — ROI section integrates alongside.

### Established Patterns
- **Adapter error handling**: TokenInvalidError, UpstreamUnavailableError, UpstreamAPIError — reuse in MCP server.
- **Circuit breaker + rate limiter**: CanvasRateLimiter, RetryConfig — port to MCP server.
- **Service DI**: FastAPI Depends() factory pattern — ROI service follows same pattern.
- **Route adapter pattern**: Legacy service output → contract-aligned response in route handlers.

### Integration Points
- **MCP server**: New standalone package (separate from `src/`). Copies/adapts adapter code, NOT imports from UniBoard.
- **ROI API**: New endpoint in `src/web/routes/` (e.g., `/courses/{id}/roi` or `/predict/roi`).
- **ROI frontend**: New section/card in Predict page, using existing Rough.js design system.
- **AI difficulty inference**: Extends QAService or new lightweight service calling AIEngine.

</code_context>

<specifics>
## Specific Ideas

- User explicitly rejected original PLAT-03 concept (Claude Desktop → UniBoard backend). MCP server must be fully standalone.
- MCP server should be "more complete" than existing canvas-ed-mcp — Ed Lessons and Unit Outline parsing are key differentiators.
- ROI display in Predict page should feel natural alongside What-if simulator — both help students optimize grades.
- Difficulty estimation: "有历史成绩用成绩，没有的用 AI 推断" — clear priority order.

</specifics>

<deferred>
## Deferred Ideas

- MCP server as npm/pip published package with proper versioning — post-M3 polish
- ROI cross-semester trend analysis — future enhancement
- Skill system integration with MCP server tools — not needed for standalone package

</deferred>

---

*Phase: 21-mcp-server-roi-analysis*
*Context gathered: 2026-03-29*
