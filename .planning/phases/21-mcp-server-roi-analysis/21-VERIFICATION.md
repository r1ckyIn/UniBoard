---
phase: 21-mcp-server-roi-analysis
verified: 2026-03-29T09:09:25Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 21: MCP Server & ROI Analysis Verification Report

**Phase Goal:** Technical users can access UniBoard via Claude Desktop, and AI provides assignment ROI analysis
**Verified:** 2026-03-29T09:09:25Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                     | Status      | Evidence                                                                                       |
|----|-------------------------------------------------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------|
| 1  | MCP server exposes UniBoard data as tools accessible from Claude Desktop                  | VERIFIED    | `mcp = FastMCP("uniboard-mcp", lifespan=lifespan)` in server.py; 17 `@mcp.tool()` decorators; `mcp.run(transport="stdio")` entry point; Claude Desktop JSON config in README |
| 2  | 17 tools across Canvas (9), Ed Discussion (3), Ed Lessons (3), Unit Outline (2)           | VERIFIED    | `grep -c '@mcp.tool()' server.py` = 17; runtime tool count confirmed via `len(mcp._tool_manager._tools)` = 17 |
| 3  | Users configure tokens via environment variables only, no UniBoard backend dependency     | VERIFIED    | `.env.example` with CANVAS_API_TOKEN, ED_API_TOKEN; lifespan reads `os.environ.get()`; no SQLAlchemy/Supabase imports in mcp-server/ |
| 4  | Adapters include rate limiting, circuit breaker, and retry with exponential backoff       | VERIFIED    | `resilience.py` contains CircuitBreaker (CLOSED/OPEN/HALF_OPEN), CanvasRateLimiter (X-Rate-Limit-Remaining header), RetryConfig (exponential backoff); all adapter `_request()` methods use them |
| 5  | All tools return human-readable formatted text, not raw JSON                              | VERIFIED    | 12 format_* functions in server.py; each tool calls formatter before return; no `json.dumps` in tool returns |
| 6  | Canvas tools cover D-04 requirements: modules, assignments, grades, announcements, files  | VERIFIED    | `get_canvas_modules`, `get_canvas_assignments`, `get_canvas_grades`, `get_canvas_announcements`, `get_canvas_files` all present |
| 7  | Standalone MCP server runs via stdio transport for Claude Desktop                         | VERIFIED    | `def main(): mcp.run(transport="stdio")` at line 598; `[project.scripts] uniboard-mcp = "uniboard_mcp.server:main"` in pyproject.toml |
| 8  | ROI formula: weight / normalized_difficulty                                                | VERIFIED    | `_calculate_roi()` in roi.py: `normalized = max(difficulty, 0.2) / 5.0; return weight / normalized`; 22 unit tests pass |
| 9  | Historical difficulty: score/max_score ratio from graded assignments                      | VERIFIED    | `_score_to_difficulty()` with 3-band linear interpolation; `get_course_roi()` checks `grade.score is not None and grade.max_score > 0` |
| 10 | AI difficulty fallback: Claude analyzes for ungraded assignments                          | VERIFIED    | `_ai_difficulty()` uses AsyncAnthropic with DIFFICULTY_SYSTEM_PROMPT; quality gate at confidence < 50%; default 3.0 fallback |
| 11 | REST API at GET /api/v1/courses/{course_id}/roi                                          | VERIFIED    | `@router.get("/{course_id}/roi")` in routes/roi.py; `api_router.include_router(roi_router, prefix="/courses")` in __init__.py; router import confirmed |
| 12 | ROI section displays in Predict page alongside What-if simulator                          | VERIFIED    | PredictPage.tsx imports RoiCard at line 20; renders `<RoiCard>` inside portal at line 309 with `<AnimatedEntry delay={9}>` |
| 13 | ROI data fetched via TanStack Query from GET /api/v1/courses/{course_id}/roi             | VERIFIED    | use-roi.ts: `api.get(\`courses/${courseId}/roi\`)` via queryOptions; RoiCard.tsx uses `useQueries` with `roiOptions.course()` |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact                                            | Expected                                         | Status     | Details                                                   |
|-----------------------------------------------------|--------------------------------------------------|------------|-----------------------------------------------------------|
| `mcp-server/src/uniboard_mcp/server.py`            | FastMCP server with lifespan, all tool regs       | VERIFIED   | 604 lines, `mcp = FastMCP`, 17 tools, lifespan context    |
| `mcp-server/src/uniboard_mcp/adapters/canvas.py`   | CanvasAdapter ported with rate limiter            | VERIFIED   | `class CanvasAdapter`, 9 public methods, resilience wired  |
| `mcp-server/src/uniboard_mcp/adapters/ed_discussion.py` | EdDiscussionAdapter with Pydantic parsing    | VERIFIED   | `class EdDiscussionAdapter`, extra="ignore", per-item validation |
| `mcp-server/src/uniboard_mcp/adapters/ed_lessons.py`    | EdLessonsAdapter with critical field maps    | VERIFIED   | `class EdLessonsAdapter`, ED_FIELD_MAP, content not passage |
| `mcp-server/src/uniboard_mcp/parsers/unit_outline.py`   | UnitOutlineParser for USYD HTML              | VERIFIED   | `class UnitOutlineParser`, fetch_and_parse, parse, validate_weights |
| `mcp-server/src/uniboard_mcp/adapters/resilience.py`    | CircuitBreaker, RateLimiter, RetryConfig     | VERIFIED   | All 3 classes present with correct state machine logic     |
| `mcp-server/pyproject.toml`                         | Package with mcp, httpx, pydantic deps            | VERIFIED   | [project] with all 6 deps, entry point defined             |
| `src/services/roi.py`                               | ROIService with historical + AI difficulty         | VERIFIED   | `class ROIService`, 251 lines, DB queries + AI inference   |
| `src/schemas/roi.py`                                | AssignmentROI, CourseROIResponse schemas           | VERIFIED   | Both Pydantic models with all fields per spec              |
| `src/prompts/roi.py`                                | AI difficulty inference prompt                     | VERIFIED   | DIFFICULTY_SYSTEM_PROMPT + get_difficulty_prompt helper     |
| `src/web/routes/roi.py`                             | REST endpoint for ROI data                         | VERIFIED   | `@router.get("/{course_id}/roi")` with auth               |
| `tests/unit/test_roi_service.py`                    | Unit tests for ROI calculation                     | VERIFIED   | 22 tests across 6 test classes, all passing                |
| `mcp-server/tests/test_tools.py`                    | Tests for resilience, parser, format helpers       | VERIFIED   | 34 tests, all passing                                      |
| `frontend/hooks/use-roi.ts`                         | TanStack Query hook for ROI data                   | VERIFIED   | useRoi, roiKeys, roiOptions; calls courses/{id}/roi        |
| `frontend/components/predict/RoiCard.tsx`           | ROI ranking card component                         | VERIFIED   | RoughCard wrapper, useQueries, priority colors, AI badge   |
| `frontend/components/predict/PredictPage.tsx`       | Updated with RoiCard in right panel                | VERIFIED   | RoiCard imported and rendered in portal at delay=9         |
| `frontend/messages/en.json`                         | ROI i18n strings (English)                         | VERIFIED   | 8 roi_* keys present                                       |
| `frontend/messages/zh.json`                         | ROI i18n strings (Chinese)                         | VERIFIED   | 8 roi_* keys present with correct translations             |
| `mcp-server/README.md`                              | Claude Desktop config, tools reference             | VERIFIED   | 166 lines, install guide, JSON config, 17-tool table       |

### Key Link Verification

| From                                     | To                                         | Via                 | Status | Details                                                  |
|------------------------------------------|--------------------------------------------|---------------------|--------|----------------------------------------------------------|
| server.py                                | adapters/canvas.py                         | import              | WIRED  | `from uniboard_mcp.adapters.canvas import CanvasAdapter` |
| server.py                                | adapters/resilience.py                     | import (indirect)   | WIRED  | Via adapter constructors that use CircuitBreaker, etc.    |
| server.py                                | adapters/ed_discussion.py                  | import              | WIRED  | `from uniboard_mcp.adapters.ed_discussion import EdDiscussionAdapter` |
| server.py                                | adapters/ed_lessons.py                     | import              | WIRED  | `from uniboard_mcp.adapters.ed_lessons import EdLessonsAdapter` |
| server.py                                | parsers/unit_outline.py                    | import              | WIRED  | `from uniboard_mcp.parsers.unit_outline import UnitOutlineParser` |
| src/services/roi.py                      | src/models/course.py                       | query               | WIRED  | `select(Course)` with `selectinload(Course.grades)` + `selectinload(Course.unified_deadlines)` |
| src/web/routes/roi.py                    | src/services/roi.py                        | dependency          | WIRED  | `ROIService` in Depends, `get_roi_service` factory       |
| src/web/routes/__init__.py               | src/web/routes/roi.py                      | include_router      | WIRED  | `from src.web.routes.roi import router as roi_router`; `api_router.include_router(roi_router, prefix="/courses")` |
| frontend/hooks/use-roi.ts                | frontend/lib/api/client.ts                 | import              | WIRED  | `import { api } from "@/lib/api/client"`                  |
| frontend/components/predict/RoiCard.tsx  | frontend/hooks/use-roi.ts                  | import              | WIRED  | `import { roiOptions } from "@/hooks/use-roi"` + `import type { AssignmentROI }` |
| frontend/components/predict/PredictPage.tsx | frontend/components/predict/RoiCard.tsx | import              | WIRED  | `import RoiCard from "@/components/predict/RoiCard"` at line 20 |

### Data-Flow Trace (Level 4)

| Artifact                      | Data Variable       | Source                              | Produces Real Data | Status    |
|-------------------------------|---------------------|-------------------------------------|-------------------|-----------|
| src/services/roi.py           | course.grades       | SQLAlchemy select(Course) + selectinload(Course.grades) | Yes (DB query) | FLOWING   |
| frontend/hooks/use-roi.ts     | ROI response        | api.get(`courses/${courseId}/roi`)   | Yes (REST endpoint) | FLOWING |
| frontend/components/predict/RoiCard.tsx | rankedItems | useQueries -> roiOptions.course()   | Yes (via hook -> API -> service -> DB) | FLOWING |

### Behavioral Spot-Checks

| Behavior                          | Command                                                                                                    | Result          | Status |
|-----------------------------------|------------------------------------------------------------------------------------------------------------|-----------------|--------|
| MCP server imports and tool count | `python -c "from uniboard_mcp.server import mcp; print(len(mcp._tool_manager._tools))"` | 17              | PASS   |
| MCP server tests pass             | `cd mcp-server && python -m pytest tests/ -x --timeout=30 -q`                                             | 34 passed       | PASS   |
| ROI service unit tests pass       | `python -m pytest tests/unit/test_roi_service.py -x --timeout=30 -q`                                      | 22 passed       | PASS   |
| ROI router loads                  | `python -c "from src.web.routes.roi import router; print(len(router.routes))"`                             | 1               | PASS   |
| No print() in MCP server          | `grep -n "print(" server.py`                                                                              | No matches      | PASS   |
| No SQLAlchemy in MCP package       | `grep -ri "sqlalchemy\|supabase" mcp-server/src/`                                                         | Only docstrings | PASS   |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                         | Status    | Evidence                                                                                     |
|-------------|------------|-------------------------------------------------------------------------------------|-----------|----------------------------------------------------------------------------------------------|
| PLAT-03     | 21-01-PLAN | Technical users can access UniBoard data via MCP server through Claude Desktop       | SATISFIED | 17-tool MCP server with stdio transport, Claude Desktop config in README, env-based auth     |
| TUTOR-03    | 21-02-PLAN, 21-03-PLAN | Assignment ROI analysis -- identifies high-weight/low-difficulty assignments | SATISFIED | ROIService with formula, historical + AI difficulty, REST endpoint, RoiCard in Predict page  |

No orphaned requirements found. REQUIREMENTS.md maps PLAT-03 and TUTOR-03 to Phase 21, both claimed by plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected |

No TODO/FIXME/PLACEHOLDER/stub patterns found in any phase 21 files.

### Human Verification Required

### 1. MCP Server Claude Desktop Integration

**Test:** Install uniboard-mcp, configure Claude Desktop with real Canvas/Ed tokens, invoke `get_canvas_courses` tool
**Expected:** Claude Desktop shows active courses list in human-readable format
**Why human:** Requires Claude Desktop app with real API tokens; cannot test programmatically

### 2. ROI Card Visual Display

**Test:** Open Predict page with at least one course that has graded and ungraded assignments
**Expected:** RoiCard appears in right panel below SemesterProgressCard, showing ranked ungraded assignments with priority colors (green/amber/gray), weight percentages, difficulty dots, and AI badge where applicable
**Why human:** Visual rendering, Rough.js borders, color system, responsive layout cannot be verified programmatically

### 3. ROI Data Accuracy

**Test:** Compare ROI rankings against known course data (e.g., a 30% weight assignment with 90% historical score should rank higher than a 10% weight assignment with 50% score)
**Expected:** Rankings match intuitive priority order -- high weight + easy = top priority
**Why human:** Requires real course data to validate end-to-end correctness

### Gaps Summary

No gaps found. All 13 observable truths verified. All 18 artifacts exist, are substantive, and are properly wired. All key links connected. Both requirements (PLAT-03, TUTOR-03) satisfied. No anti-patterns detected. 34 MCP server tests and 22 ROI unit tests pass. The phase goal -- "Technical users can access UniBoard via Claude Desktop, and AI provides assignment ROI analysis" -- is achieved.

---

_Verified: 2026-03-29T09:09:25Z_
_Verifier: Claude (gsd-verifier)_
