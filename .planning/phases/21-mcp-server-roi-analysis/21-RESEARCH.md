# Phase 21: MCP Server & ROI Analysis - Research

**Researched:** 2026-03-29
**Domain:** Python MCP SDK (server development), Tool/Resource APIs, MCP server distribution
**Confidence:** HIGH

## Summary

The official Python MCP SDK (`mcp` package, v1.26.0) provides a high-level `FastMCP` class at `mcp.server.fastmcp` that uses Python type hints and docstrings to auto-generate tool schemas. Tools are defined via `@mcp.tool()` decorators, resources via `@mcp.resource()`, and the server runs over stdio transport (standard for Claude Desktop). The SDK supports async functions natively, lifespan-managed shared state (for httpx clients), and `ToolError` for graceful error reporting.

UniBoard's existing adapter code (Canvas, Ed Discussion, Ed Lessons) maps directly to MCP tools. Each adapter method (e.g., `get_courses`, `get_grades`, `search_threads`) becomes one `@mcp.tool()` function. The resilience patterns (rate limiter, circuit breaker, retry) port cleanly since the MCP server is standalone Python. Authentication follows the standard MCP pattern: environment variables (`CANVAS_API_TOKEN`, `ED_API_TOKEN`, `CANVAS_BASE_URL`).

**Primary recommendation:** Use the official `mcp` package (v1.26.0) with `from mcp.server.fastmcp import FastMCP`. Do NOT use the standalone `fastmcp` package -- the official SDK is sufficient for this server's needs and maintains strict MCP spec compliance. Define one tool per adapter method with `snake_case` verb-noun naming. Use lifespan context to manage shared httpx clients.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Build a new, complete MCP server based on UniBoard's adapter code. NOT a repackage of the existing `canvas-ed-mcp` -- a more feature-rich version with Ed Lessons, Unit Outline parsing, and enhanced functionality.
- **D-02:** Standalone package -- users provide Canvas token + Ed token via environment variables. No Supabase, no UniBoard backend dependency.
- **D-03:** Open-source distribution. Published as its own repository or clearly separable module.
- **D-04:** Adapter coverage: Canvas (modules, assignments, grades, announcements, files), Ed Discussion (threads, search), Ed Lessons (lessons, assignments), Unit Outline (HTML parsing with weight extraction).
- **D-09 to D-11:** ROI analysis algorithm with historical + AI difficulty estimation.
- **D-12 to D-14:** ROI display in Predict page, REST endpoint, web-only (not in MCP server).

### Claude's Discretion
- **D-05:** Framework: Python `mcp` SDK (official). Researched below.
- **D-06:** Authentication: Environment variable tokens. Researched below.
- **D-07:** Tool granularity and naming conventions. Researched below.
- **D-08:** Error handling, rate limiting, circuit breaker patterns. Researched below.
- MCP SDK version and server boilerplate structure
- MCP tool list design (which adapter methods become tools, naming, input schemas)
- ROI API endpoint path and response schema
- ROI Predict page UI layout
- AI difficulty inference prompt design
- Difficulty normalization approach

### Deferred Ideas (OUT OF SCOPE)
- MCP server as npm/pip published package with proper versioning -- post-M3 polish
- ROI cross-semester trend analysis -- future enhancement
- Skill system integration with MCP server tools -- not needed for standalone package
</user_constraints>

## Standard Stack

### Core (MCP Server)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mcp` | 1.26.0 | Official Python MCP SDK with FastMCP high-level API | Official Anthropic SDK, strict spec compliance, built-in FastMCP |
| `httpx` | 0.28+ | Async HTTP client for API calls | Already used in UniBoard adapters, async-first, httpx.AsyncClient |
| `pydantic` | 2.x | Response validation, schema generation | Already used in adapters, FastMCP uses it for schema generation |
| `structlog` | 24.x | Structured logging (to stderr for stdio transport) | Already used across UniBoard codebase |

### Supporting (MCP Server)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `beautifulsoup4` | 4.12+ | Unit Outline HTML parsing | Unit Outline tool (USYD website scraping) |
| `lxml` | 5.x | Fast HTML parser backend for BS4 | Paired with beautifulsoup4 |

### Not Needed
| Instead of | Why Not |
|------------|---------|
| `fastmcp` (standalone package) | Official `mcp` SDK includes `FastMCP` at `mcp.server.fastmcp` -- sufficient for our needs, avoids dependency confusion |
| `click` / `argparse` | Server runs via `mcp.run(transport="stdio")` -- no CLI needed |
| `uvicorn` / `starlette` | Stdio transport only -- no HTTP server needed for Claude Desktop MCP |

**Installation (MCP server package):**
```bash
uv add "mcp[cli]" httpx pydantic structlog beautifulsoup4 lxml
```

## Architecture Patterns

### Recommended MCP Server Structure
```
mcp-server/
├── pyproject.toml           # Package definition, entry point
├── README.md                # Open-source docs
├── .env.example             # CANVAS_API_TOKEN, ED_API_TOKEN, CANVAS_BASE_URL
├── src/
│   └── uniboard_mcp/
│       ├── __init__.py
│       ├── server.py        # FastMCP instance, lifespan, tool registrations
│       ├── tools/
│       │   ├── __init__.py
│       │   ├── canvas.py    # Canvas tools (@mcp.tool())
│       │   ├── ed_discussion.py  # Ed Discussion tools
│       │   ├── ed_lessons.py     # Ed Lessons tools
│       │   └── unit_outline.py   # Unit Outline tools
│       ├── adapters/
│       │   ├── __init__.py
│       │   ├── canvas.py         # Ported from UniBoard (simplified)
│       │   ├── ed_discussion.py  # Ported from UniBoard
│       │   ├── ed_lessons.py     # Ported from UniBoard
│       │   └── resilience.py     # Rate limiter + circuit breaker
│       ├── parsers/
│       │   └── unit_outline.py   # HTML parser (ported from UniBoard)
│       └── errors.py             # ToolError wrappers
└── tests/
    ├── conftest.py
    └── test_tools/
```

### Pattern 1: FastMCP Server with Lifespan (Shared httpx Clients)
**What:** Use `lifespan` to create and share httpx.AsyncClient instances across all tool calls
**When to use:** Always -- avoids creating new HTTP clients per tool invocation

```python
# Source: Official MCP SDK docs + modelcontextprotocol.io/docs/develop/build-server
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from dataclasses import dataclass
import os

import httpx
from mcp.server.fastmcp import FastMCP

@dataclass
class AppContext:
    """Shared state across all tool calls."""
    canvas_client: httpx.AsyncClient | None
    ed_client: httpx.AsyncClient | None
    canvas_base_url: str

@asynccontextmanager
async def lifespan(server: FastMCP) -> AsyncGenerator[AppContext, None]:
    """Initialize HTTP clients on startup, close on shutdown."""
    canvas_token = os.environ.get("CANVAS_API_TOKEN")
    ed_token = os.environ.get("ED_API_TOKEN")
    canvas_base_url = os.environ.get("CANVAS_BASE_URL", "https://canvas.instructure.com/api/v1")

    canvas_client = None
    ed_client = None

    if canvas_token:
        canvas_client = httpx.AsyncClient(
            base_url=canvas_base_url,
            headers={"Authorization": f"Bearer {canvas_token}"},
            timeout=30.0,
        )
    if ed_token:
        ed_client = httpx.AsyncClient(
            base_url="https://edstem.org/api",
            headers={"Authorization": f"Bearer {ed_token}"},
            timeout=30.0,
        )

    try:
        yield AppContext(
            canvas_client=canvas_client,
            ed_client=ed_client,
            canvas_base_url=canvas_base_url,
        )
    finally:
        if canvas_client:
            await canvas_client.aclose()
        if ed_client:
            await ed_client.aclose()

mcp = FastMCP("uniboard-mcp", lifespan=lifespan)
```

### Pattern 2: Tool Definition with ToolError
**What:** Define tools using `@mcp.tool()` with descriptive docstrings and graceful error handling
**When to use:** Every tool definition

```python
# Source: Official MCP Python SDK + gofastmcp.com/servers/tools
from mcp.server.fastmcp import FastMCP, Context
from mcp.server.session import ServerSession

@mcp.tool()
async def get_courses(
    ctx: Context[ServerSession, AppContext],
) -> str:
    """List all Canvas courses the user is enrolled in.

    Returns course names, IDs, and enrollment status.
    Requires CANVAS_API_TOKEN environment variable.
    """
    app = ctx.request_context.lifespan_context
    if not app.canvas_client:
        raise ToolError("Canvas API token not configured. Set CANVAS_API_TOKEN environment variable.")

    try:
        response = await app.canvas_client.get(
            "/courses",
            params={"enrollment_state": "active", "per_page": "100"},
        )
        response.raise_for_status()
        courses = response.json()
        # Format for LLM consumption
        lines = []
        for c in courses:
            lines.append(f"- {c['name']} (ID: {c['id']})")
        return "\n".join(lines) if lines else "No active courses found."
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (401, 403):
            raise ToolError("Canvas API token is invalid or expired.")
        raise ToolError(f"Canvas API error: HTTP {exc.response.status_code}")
```

### Pattern 3: Resource Definition (Optional, for Static Data)
**What:** Expose read-only reference data as MCP resources
**When to use:** Rarely for this server -- tools are the primary interface

```python
# Source: Official MCP Python SDK docs
@mcp.resource("config://server-info")
def get_server_info() -> str:
    """Server configuration and capabilities."""
    import json
    return json.dumps({
        "name": "UniBoard MCP Server",
        "version": "1.0.0",
        "platforms": ["Canvas LMS", "Ed Discussion", "Ed Lessons", "Unit Outline"],
        "canvas_configured": bool(os.environ.get("CANVAS_API_TOKEN")),
        "ed_configured": bool(os.environ.get("ED_API_TOKEN")),
    })
```

### Pattern 4: Server Entry Point (stdio transport)
**What:** Run the MCP server over stdio for Claude Desktop integration
**When to use:** Always -- standard transport for desktop MCP clients

```python
# Source: modelcontextprotocol.io/docs/develop/build-server
if __name__ == "__main__":
    mcp.run(transport="stdio")
```

### Anti-Patterns to Avoid
- **Creating httpx clients inside tool functions:** Wastes connections, no connection pooling. Use lifespan context instead.
- **Using print() in stdio servers:** Corrupts JSON-RPC stream. Use `structlog` configured to write to stderr, or `ctx.info()`/`ctx.warning()`.
- **Returning raw JSON dicts from tools:** Return formatted strings for LLM consumption. The LLM reads text, not structured data.
- **One mega-tool that does everything:** Each adapter method should be its own tool. Claude can orchestrate multi-tool workflows.
- **Exposing internal implementation details in tool descriptions:** Describe what the tool does for the user, not how it works internally.

## Tool Design: Adapter Method to MCP Tool Mapping

### Canvas Tools (requires CANVAS_API_TOKEN + CANVAS_BASE_URL)
| Tool Name | Source Method | Parameters | Description |
|-----------|-------------|------------|-------------|
| `get_canvas_courses` | `CanvasAdapter.get_courses()` | none | List all enrolled Canvas courses |
| `get_canvas_grades` | `CanvasAdapter.get_grades()` | `course_id: str` | Get grades for a specific course |
| `get_canvas_assignments` | `CanvasAdapter.get_assignments()` | `course_id: str` | Get assignments for a specific course |
| `get_canvas_modules` | `CanvasAdapter.get_modules()` | `course_id: str` | Get modules and items for a course |
| `get_canvas_assignment_groups` | `CanvasAdapter.get_assignment_groups()` | `course_id: str` | Get assignment groups with weight info |
| `get_canvas_announcements` | new (Canvas API) | `course_id: str` | Get recent announcements |
| `get_canvas_files` | new (Canvas API) | `course_id: str, folder_path: str?` | List course files/folders |

### Ed Discussion Tools (requires ED_API_TOKEN)
| Tool Name | Source Method | Parameters | Description |
|-----------|-------------|------------|-------------|
| `get_ed_threads` | `EdDiscussionAdapter.get_threads()` | `course_id: str, filter: str?, sort: str?, limit: int?` | List discussion threads |
| `get_ed_thread` | `EdDiscussionAdapter.get_thread()` | `thread_id: str` | Get a single thread with replies |
| `search_ed_threads` | `EdDiscussionAdapter.search_threads()` | `course_id: str, query: str` | Search threads by keyword |

### Ed Lessons Tools (requires ED_API_TOKEN)
| Tool Name | Source Method | Parameters | Description |
|-----------|-------------|------------|-------------|
| `get_ed_lessons` | `EdLessonsAdapter.get_lessons()` | `course_id: str` | List all lessons and modules |
| `get_ed_lesson` | `EdLessonsAdapter.get_lesson()` | `lesson_id: str` | Get lesson with slide content |

### Unit Outline Tools (no auth needed)
| Tool Name | Source | Parameters | Description |
|-----------|--------|------------|-------------|
| `parse_unit_outline` | `UnitOutlineParser` | `unit_code: str, year: int?` | Parse USYD unit outline for assessment weights |

### Tool Naming Convention
- **Format:** `snake_case`, verb-noun, max 32 characters
- **Platform prefix:** `get_canvas_*`, `get_ed_*`, `search_ed_*`, `parse_*`
- **Rationale:** Claude sees all tool names at once. Prefixed grouping helps it select the right platform. Imperative verbs (`get`, `search`, `parse`) signal intent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol wire format | Custom JSON-RPC handler | `mcp` SDK's FastMCP | Handles protocol negotiation, transport, schema generation |
| Tool input schema generation | Manual JSON Schema | FastMCP type hints + docstrings | Auto-generates from Python type annotations |
| Stdio transport framing | Custom stdin/stdout reader | `mcp.run(transport="stdio")` | Handles JSON-RPC framing, error recovery |
| HTTP client lifecycle | Manual open/close | FastMCP lifespan context | Clean startup/shutdown, shared across tools |
| Error reporting to LLM | Return error strings | `raise ToolError("message")` | Proper MCP error protocol, LLM gets actionable message |

**Key insight:** The `mcp` SDK handles all protocol-level concerns. Focus code on adapter logic (HTTP calls to Canvas/Ed) and response formatting (text for LLM consumption).

## Common Pitfalls

### Pitfall 1: stdout Corruption in Stdio Transport
**What goes wrong:** Using `print()` or logging to stdout corrupts the JSON-RPC message stream, causing the MCP client to disconnect.
**Why it happens:** Stdio transport uses stdout exclusively for MCP protocol messages.
**How to avoid:** Configure all logging to stderr. Use `structlog` with stderr handler. For debug output, use `ctx.info()` / `ctx.warning()` which go through the MCP logging protocol.
**Warning signs:** Server starts but Claude Desktop shows "server disconnected" immediately.

### Pitfall 2: Missing Environment Variable Handling
**What goes wrong:** Server crashes on startup if tokens are not set, giving a cryptic error in Claude Desktop.
**Why it happens:** No graceful degradation for missing config.
**How to avoid:** Check env vars in lifespan, set clients to `None` if missing. In each tool, check if the relevant client exists and raise `ToolError` with a clear message ("Set CANVAS_API_TOKEN environment variable").
**Warning signs:** Tools that silently fail or return empty data.

### Pitfall 3: Returning Overly Structured Data
**What goes wrong:** Returning raw JSON dicts causes the LLM to see `{'id': 123, 'name': ...}` which is harder to reason about.
**Why it happens:** Developer thinks structured data is better for the LLM.
**How to avoid:** Return human-readable formatted text strings. The LLM processes natural language better than raw JSON. Example: `"- COMP1234: Intro to CS (ID: 1234, Grade: HD)"` instead of `{"id": 1234, "name": "COMP1234", ...}`.
**Warning signs:** Claude asks follow-up questions about data it already has.

### Pitfall 4: Tool Explosion (Too Many Fine-Grained Tools)
**What goes wrong:** Defining 50+ tools overwhelms Claude's tool selection, causing it to pick wrong tools or ignore relevant ones.
**Why it happens:** Mapping every API parameter variation to a separate tool.
**How to avoid:** One tool per logical operation. Use optional parameters (default values) instead of creating separate tools. Target 12-18 tools total.
**Warning signs:** Claude struggles to find the right tool, asks which tool to use.

### Pitfall 5: Blocking the Event Loop in Sync Code
**What goes wrong:** CPU-bound HTML parsing (Unit Outline) blocks the async event loop, causing all concurrent tool calls to stall.
**Why it happens:** BeautifulSoup parsing is synchronous and can take >100ms for large pages.
**How to avoid:** Use `asyncio.to_thread()` to run sync parsing in a thread pool. FastMCP auto-wraps sync functions in threadpool, but for async tools that call sync code internally, wrap explicitly.
**Warning signs:** Other tools time out while Unit Outline parsing is running.

### Pitfall 6: Rate Limiting Shared Across All Tool Calls
**What goes wrong:** Multiple rapid tool calls from Claude hit Canvas API rate limits (700 req/10min), causing cascading failures.
**Why it happens:** Claude may call several tools in sequence within seconds.
**How to avoid:** Port the `CanvasRateLimiter` from UniBoard adapters. Track `X-Rate-Limit-Remaining` header. Queue requests when approaching limit.
**Warning signs:** HTTP 429 errors after a burst of tool calls.

## Code Examples

### Complete Minimal MCP Server
```python
# Source: Official MCP Python SDK + modelcontextprotocol.io
"""UniBoard MCP Server - Canvas + Ed Discussion + Ed Lessons."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from dataclasses import dataclass

import httpx
from mcp.server.fastmcp import FastMCP, Context
from mcp.server.session import ServerSession

# -- Lifespan: shared HTTP clients --

@dataclass
class AppContext:
    canvas_client: httpx.AsyncClient | None
    ed_client: httpx.AsyncClient | None

@asynccontextmanager
async def lifespan(server: FastMCP) -> AsyncGenerator[AppContext, None]:
    canvas_token = os.environ.get("CANVAS_API_TOKEN")
    ed_token = os.environ.get("ED_API_TOKEN")
    base_url = os.environ.get("CANVAS_BASE_URL", "https://canvas.instructure.com/api/v1")

    canvas = httpx.AsyncClient(
        base_url=base_url,
        headers={"Authorization": f"Bearer {canvas_token}"},
        timeout=30.0,
    ) if canvas_token else None

    ed = httpx.AsyncClient(
        base_url="https://edstem.org/api",
        headers={"Authorization": f"Bearer {ed_token}"},
        timeout=30.0,
    ) if ed_token else None

    try:
        yield AppContext(canvas_client=canvas, ed_client=ed)
    finally:
        if canvas:
            await canvas.aclose()
        if ed:
            await ed.aclose()

# -- Server --

mcp = FastMCP("uniboard-mcp", lifespan=lifespan)

# -- Tools --

@mcp.tool()
async def get_canvas_courses(ctx: Context[ServerSession, AppContext]) -> str:
    """List all Canvas courses the user is enrolled in.

    Returns course names, IDs, and enrollment type for each active course.
    Requires CANVAS_API_TOKEN to be configured.
    """
    app = ctx.request_context.lifespan_context
    if not app.canvas_client:
        from mcp.server.fastmcp import ToolError  # or from fastmcp.exceptions
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN env var.")

    resp = await app.canvas_client.get("/courses", params={"enrollment_state": "active", "per_page": "100"})
    resp.raise_for_status()
    courses = resp.json()

    if not courses:
        return "No active courses found."

    lines = [f"Found {len(courses)} active courses:\n"]
    for c in courses:
        lines.append(f"- {c.get('name', 'Unknown')} (ID: {c['id']})")
    return "\n".join(lines)

# -- Entry point --

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

### Claude Desktop Configuration (claude_desktop_config.json)
```json
{
  "mcpServers": {
    "uniboard": {
      "command": "uv",
      "args": [
        "--directory",
        "/absolute/path/to/mcp-server",
        "run",
        "src/uniboard_mcp/server.py"
      ],
      "env": {
        "CANVAS_API_TOKEN": "your-canvas-token",
        "ED_API_TOKEN": "your-ed-token",
        "CANVAS_BASE_URL": "https://canvas.sydney.edu.au/api/v1"
      }
    }
  }
}
```

### ToolError Import (Official SDK)
```python
# In the official mcp SDK (v1.x), ToolError lives here:
from mcp.server.fastmcp import ToolError

# Usage in tool:
@mcp.tool()
async def get_grades(course_id: str, ctx: Context[ServerSession, AppContext]) -> str:
    """Get grades for a Canvas course by course ID."""
    app = ctx.request_context.lifespan_context
    if not app.canvas_client:
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN.")
    # ... implementation
```

### Async Tool with Optional Parameters
```python
@mcp.tool()
async def get_ed_threads(
    course_id: str,
    filter: str = "",
    sort: str = "new",
    limit: int = 20,
    ctx: Context[ServerSession, AppContext] = None,
) -> str:
    """List discussion threads from Ed Discussion for a course.

    Args:
        course_id: The Ed course ID
        filter: Optional category filter (e.g., "question", "discussion")
        sort: Sort order - "new" (default), "top", or "active"
        limit: Maximum threads to return (default: 20, max: 100)
    """
    # FastMCP auto-generates input schema from these type hints + docstring
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom JSON-RPC server | `mcp` SDK with FastMCP | 2024 | No manual protocol handling needed |
| SSE transport | Streamable HTTP (spec 2025-03-26) | March 2025 | SSE deprecated but still works; stdio remains standard for desktop |
| Manual schema definitions | Type hint auto-generation | FastMCP 1.0 (2024) | Zero boilerplate for input schemas |
| `fastmcp` standalone | `mcp` SDK built-in FastMCP | ongoing | Two packages exist; official SDK sufficient for most use cases |

**Deprecated/outdated:**
- **SSE transport**: Replaced by "Streamable HTTP" in spec 2025-03-26. Still works but no longer recommended for new servers. Stdio remains the standard for Claude Desktop.
- **Manual `@app.call_tool` handler**: Old low-level pattern. Use `@mcp.tool()` decorator instead.

## Existing MCP Servers for Canvas LMS (Reference)

| Project | Stars | Tools | Relevance |
|---------|-------|-------|-----------|
| [vishalsachdev/canvas-mcp](https://github.com/vishalsachdev/canvas-mcp) | Popular | 90+ | Most complete Canvas MCP; Python; reference for tool naming |
| [ahnopologetic/canvas-lms-mcp](https://github.com/ahnopologetic/canvas-lms-mcp) | Moderate | ~15 | Minimal Canvas MCP; good simplicity reference |
| [DMontgomery40/mcp-canvas-lms](https://github.com/DMontgomery40/mcp-canvas-lms) | Moderate | 54 | Mid-size; manages courses + grades |

**Our differentiators vs existing Canvas MCP servers:**
- Ed Discussion integration (threads, search)
- Ed Lessons integration (slides, content)
- Unit Outline HTML parsing (USYD-specific assessment weights)
- Combined multi-platform view (Canvas + Ed in one server)

## Open Questions

1. **ToolError Import Path**
   - What we know: In `mcp` v1.x, ToolError may be at `mcp.server.fastmcp.ToolError` or may need a different import path. The standalone `fastmcp` uses `fastmcp.exceptions.ToolError`.
   - What's unclear: Exact import in `mcp` v1.26.0 -- may not exist in the official SDK's built-in FastMCP.
   - Recommendation: During implementation, verify with `python -c "from mcp.server.fastmcp import ToolError"`. If not available, return error strings instead (still works, just less formal). Alternatively, raise `ValueError` which FastMCP catches and converts to error response.

2. **MCP Server Package Distribution**
   - What we know: D-03 says open-source, own repo or separable module.
   - What's unclear: Whether to create a separate git repo immediately or keep as subdirectory in UniBoard repo.
   - Recommendation: Start as `mcp-server/` subdirectory in UniBoard repo. Extract to separate repo as post-M3 polish (already deferred in CONTEXT.md).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12 | MCP server | Yes | 3.12.7 | -- |
| uv | Package management | Yes | 0.6.8 | pip works too |
| mcp package | MCP SDK | Yes (installed) | 1.21.2 (1.26.0 on PyPI) | Upgrade to 1.26.0 |
| httpx | HTTP client | Yes (installed) | -- | Already in project |
| pydantic | Validation | Yes (installed) | -- | Already in project |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:**
- `mcp` needs upgrade from 1.21.2 to 1.26.0 (latest) -- simple `uv add mcp>=1.26.0`

## Project Constraints (from CLAUDE.md)

- **Language:** Code comments in English, technical discussion in Chinese
- **Type checking:** mypy --strict
- **Lint:** ruff
- **Tests:** pytest + pytest-asyncio
- **Package manager:** uv (backend)
- **Backend stack:** Python 3.12+, FastAPI (for REST API part), SQLAlchemy 2.0 async
- **MCP server is standalone** -- no FastAPI/SQLAlchemy dependency, but follows same code style
- **Commit format:** GSD format `{type}(21-{plan}): {description}`
- **Verification loop:** Build -> Test -> Lint -> TypeCheck before each commit

## Sources

### Primary (HIGH confidence)
- [Official MCP Build Server Tutorial](https://modelcontextprotocol.io/docs/develop/build-server) - Full Python server setup guide
- [MCP Python SDK GitHub](https://github.com/modelcontextprotocol/python-sdk) - Official SDK repo, README, examples
- [PyPI mcp package](https://pypi.org/project/mcp/) - Version 1.26.0, Python >=3.10
- [FastMCP Tools Docs](https://gofastmcp.com/servers/tools) - Comprehensive tool definition patterns
- [FastMCP Resources Docs](https://gofastmcp.com/servers/resources) - Resource definition, URI templates

### Secondary (MEDIUM confidence)
- [MCP SDK Lifespan + Context](https://deepwiki.com/modelcontextprotocol/python-sdk/2.5-context-injection-and-lifespan) - Lifespan pattern with typed context
- [MCP Server Naming Conventions](https://zazencodes.com/blog/mcp-server-naming-conventions) - Tool naming analysis from 500+ servers
- [MCP API Naming Best Practices](https://gist.github.com/eonist/eb8d5628aad07fc57ce339e518158c20) - Verb-noun, snake_case conventions
- [Canvas MCP (vishalsachdev)](https://github.com/vishalsachdev/canvas-mcp) - Reference Canvas MCP server (90+ tools)

### Tertiary (LOW confidence)
- [FastMCP 2.0 vs MCP SDK discussion](https://github.com/modelcontextprotocol/python-sdk/issues/1068) - Package divergence analysis
- [OWASP MCP Token Mismanagement](https://owasp.org/www-project-mcp-top-10/2025/MCP01-2025-Token-Mismanagement-and-Secret-Exposure) - Security best practices for MCP auth

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK docs verified, versions confirmed on PyPI
- Architecture: HIGH - Lifespan pattern from official docs, tool mapping from existing adapters
- Pitfalls: HIGH - Multiple sources (official docs, community issues, existing Canvas MCP servers)
- Tool design: MEDIUM - Naming conventions from community analysis, not official spec requirement

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (30 days -- MCP SDK is relatively stable at v1.x)
