# UniBoard MCP Server

A standalone MCP (Model Context Protocol) server that gives Claude Desktop access to university learning platforms — Canvas LMS, Ed Discussion, Ed Lessons, and USYD Unit Outline data.

## Features

- **Multi-Platform Coverage** — Canvas LMS (9 tools), Ed Discussion (3 tools), Ed Lessons (3 tools), USYD Unit Outline (2 tools)
- **Production Resilience** — Circuit breaker, rate limiting, and exponential backoff retry on all API calls
- **Human-Readable Output** — All tools return formatted text optimized for LLM consumption
- **Zero Backend Dependency** — Standalone package, no UniBoard backend or database required
- **Environment-Based Config** — Users bring their own API tokens via environment variables

## Quick Start

### Install

```bash
# Clone and install
git clone https://github.com/r1ckyIn/UniBoard.git
cd UniBoard/mcp-server
pip install -e .
```

Or with uv:

```bash
cd UniBoard/mcp-server
uv pip install -e .
```

### Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual tokens:
# CANVAS_API_TOKEN=your_canvas_token
# ED_API_TOKEN=your_ed_token
# CANVAS_BASE_URL=https://canvas.sydney.edu.au/api/v1
```

### Claude Desktop Configuration

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "uniboard": {
      "command": "uniboard-mcp",
      "env": {
        "CANVAS_API_TOKEN": "your_canvas_token_here",
        "ED_API_TOKEN": "your_ed_api_token_here",
        "CANVAS_BASE_URL": "https://canvas.sydney.edu.au/api/v1"
      }
    }
  }
}
```

Or if using uv:

```json
{
  "mcpServers": {
    "uniboard": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/UniBoard/mcp-server", "uniboard-mcp"],
      "env": {
        "CANVAS_API_TOKEN": "your_canvas_token_here",
        "ED_API_TOKEN": "your_ed_api_token_here",
        "CANVAS_BASE_URL": "https://canvas.sydney.edu.au/api/v1"
      }
    }
  }
}
```

## Tools Reference

### Canvas LMS (9 tools)

| Tool | Description |
|------|-------------|
| `get_canvas_courses` | List all active courses with IDs and codes |
| `get_canvas_grades` | Get grades and enrollment data for a course |
| `get_canvas_assignments` | List assignments with due dates and points |
| `get_canvas_modules` | Get module tree with items |
| `get_canvas_announcements` | List course announcements with content |
| `get_canvas_files` | List/search course files |
| `get_canvas_tabs` | Get course navigation tabs |
| `get_canvas_assignment_groups` | Get assignment groups with weights |
| `validate_canvas_token` | Check Canvas token validity |

### Ed Discussion (3 tools)

| Tool | Description |
|------|-------------|
| `get_ed_threads` | List threads with filter (endorsed/staff) and sort |
| `get_ed_thread` | Get single thread with full content |
| `search_ed_threads` | Search threads by keyword |

### Ed Lessons (3 tools)

| Tool | Description |
|------|-------------|
| `get_ed_lessons` | List lessons grouped by module |
| `get_ed_lesson` | Get lesson with slide content |
| `validate_ed_token` | Check Ed token validity |

### USYD Unit Outline (2 tools)

| Tool | Description |
|------|-------------|
| `parse_unit_outline` | Parse assessment items, weights, outcomes from URL |
| `validate_outline_weights` | Check if assessment weights sum to ~100% |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CANVAS_API_TOKEN` | For Canvas tools | — | Canvas LMS API token |
| `ED_API_TOKEN` | For Ed tools | — | Ed Discussion/Lessons API token |
| `CANVAS_BASE_URL` | No | `https://canvas.sydney.edu.au/api/v1` | Canvas API base URL |

**Getting tokens:**
- **Canvas**: Account > Settings > New Access Token
- **Ed**: Browser DevTools > Network tab > Copy `token` cookie from any edstem.org request

## Architecture

```
uniboard_mcp/
├── server.py          # FastMCP server, 17 tool definitions, lifespan
├── errors.py          # Error hierarchy (TokenInvalid, RateLimited, etc.)
├── adapters/
│   ├── canvas.py      # Canvas LMS API client (9 methods)
│   ├── ed_discussion.py  # Ed Discussion API client (3 methods)
│   ├── ed_lessons.py  # Ed Lessons API client (3 methods)
│   └── resilience.py  # CircuitBreaker, RateLimiter, RetryConfig
└── parsers/
    └── unit_outline.py  # USYD Unit Outline HTML parser
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]" pytest pytest-asyncio

# Run tests
python -m pytest tests/ -x --timeout=30

# Lint
ruff check src/
```

## License

MIT License — see [LICENSE](../LICENSE) for details.

## Author

**Ricky** — CS Student @ University of Sydney

[![GitHub](https://img.shields.io/badge/GitHub-r1ckyIn-181717?style=flat-square&logo=github)](https://github.com/r1ckyIn)
