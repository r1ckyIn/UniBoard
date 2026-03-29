# Phase 21: MCP Server & ROI Analysis - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 21-mcp-server-roi-analysis
**Areas discussed:** ROI Analysis Algorithm, ROI Result Presentation, MCP Server Scope Pivot

---

## MCP Server Scope Pivot

User rejected original PLAT-03 concept entirely:

| Option | Description | Selected |
|--------|-------------|----------|
| Claude Desktop queries UniBoard backend | Original PLAT-03 — MCP server as bridge to UniBoard API | |
| Standalone open-source MCP server | Package Canvas+Ed adapters as independent tool | ✓ |

**User's choice:** "根本就没有Claude desktop调取uniboard数据这个功能，不打算做，如果有用户想要在desktop使用uniboard类似功能直接打包一个mcp就行核心功能打包开源"
**Notes:** Fundamental scope change. MCP server is a standalone product, not a UniBoard integration.

---

## MCP Server Version

| Option | Description | Selected |
|--------|-------------|----------|
| Repackage existing canvas-ed-mcp | Clean up and open-source as-is | |
| New version based on UniBoard adapters | More complete with Ed Lessons, Unit Outline, enhanced features | ✓ |

**User's choice:** Option 2 — based on UniBoard adapter code, more complete version.

---

## ROI Analysis Algorithm

| Option | Description | Selected |
|--------|-------------|----------|
| AI inference only | Claude reads assignment description/rubric to estimate difficulty | |
| Historical grades only | Use student's own scores to infer difficulty | |
| Comprehensive (grades + AI) | Historical grades when available, AI inference for ungraded | ✓ |

**User's choice:** Option 3 — comprehensive approach.
**Notes:** Clear priority: historical data first, AI fallback for missing data.

---

## ROI Result Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| MCP only | Only via Claude Desktop query | |
| REST API + Predict page | Web UI in Predict page alongside What-if simulator | ✓ |
| Both MCP + web | Dual entry point | |

**User's choice:** Option 2 — Predict page.
**Notes:** User first asked "什么是ROI，和Claude desktop有什么关系？" — clarified these are independent features before selecting.

---

## Claude's Discretion

- MCP Server framework selection (Python `mcp` SDK)
- MCP tool list design and granularity
- MCP authentication approach (env var tokens)
- ROI API endpoint design
- ROI difficulty normalization
- ROI UI card layout in Predict page
- AI difficulty inference prompt design

## Deferred Ideas

- MCP server as published package with proper versioning — post-M3
- ROI cross-semester trend analysis — future enhancement
