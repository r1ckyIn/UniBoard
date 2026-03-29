---
plan: 21-01
status: complete
started: "2026-03-29T20:00:00Z"
completed: "2026-03-29T20:15:00Z"
duration_minutes: 15
---

# Plan 21-01 Summary: Standalone MCP Server Package

## What was built

Complete standalone MCP server package (`mcp-server/`) exposing 17 tools for Claude Desktop across 4 platforms:
- **Canvas LMS** (9 tools): courses, grades, assignments, modules, announcements, files, tabs, assignment groups, token validation
- **Ed Discussion** (3 tools): thread listing, detail, search
- **Ed Lessons** (3 tools): lesson listing, detail with slides, token validation
- **USYD Unit Outline** (2 tools): assessment parsing with weight validation

## Key decisions

- Ported all 4 adapters from UniBoard, removing SQLAlchemy/Supabase/base class dependencies
- Shared `httpx.AsyncClient` via lifespan pattern for connection pooling
- Added 2 new Canvas methods (`get_announcements`, `get_files`) per D-04 requirements
- All tools return human-readable formatted text, not raw JSON
- Environment variable config only — no backend dependency

## Key files

### Created
- `mcp-server/pyproject.toml` — Package definition with mcp, httpx, pydantic, beautifulsoup4 deps
- `mcp-server/src/uniboard_mcp/server.py` — FastMCP server with 17 `@mcp.tool()` registrations
- `mcp-server/src/uniboard_mcp/adapters/canvas.py` — CanvasAdapter (9 public methods)
- `mcp-server/src/uniboard_mcp/adapters/ed_discussion.py` — EdDiscussionAdapter with Pydantic parsing
- `mcp-server/src/uniboard_mcp/adapters/ed_lessons.py` — EdLessonsAdapter with critical field mappings
- `mcp-server/src/uniboard_mcp/adapters/resilience.py` — CircuitBreaker, RateLimiter, RetryConfig
- `mcp-server/src/uniboard_mcp/parsers/unit_outline.py` — USYD HTML parser
- `mcp-server/src/uniboard_mcp/errors.py` — Simplified error hierarchy
- `mcp-server/tests/test_tools.py` — 34 tests covering resilience, parser, format helpers
- `mcp-server/README.md` — Claude Desktop config, tools reference, architecture

## Self-check

- [x] Server imports and runs (`from uniboard_mcp.server import mcp`)
- [x] 17 `@mcp.tool()` decorators registered
- [x] 34 tests pass (`python -m pytest tests/ -x`)
- [x] README contains Claude Desktop JSON config example
- [x] No SQLAlchemy, Supabase, or UniBoard backend dependencies
