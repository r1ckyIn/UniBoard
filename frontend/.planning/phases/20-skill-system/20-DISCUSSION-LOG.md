# Phase 20: Skill System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 20-skill-system
**Areas discussed:** Skill storage & structure, Auto-generation trigger, Skill matching & selection, Pre-seeded vs emergent

---

## Skill Storage & Structure

### Storage Location

| Option | Description | Selected |
|--------|-------------|----------|
| DB table (Recommended) | PostgreSQL with JSONB for workflow_steps, tool_sequence, parameters | ✓ |
| Python files | Like existing src/prompts/ — each skill is a .py file | |
| Hybrid (core files + DB) | Pre-defined as .py, auto-generated in DB | |

**User's choice:** Best practice (DB table)
**Notes:** User deferred to best practices for all technical decisions.

### Skill Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-step workflow (Recommended) | Like /check-deadlines — complete orchestration | ✓ |
| Single-step prompt | One optimized system prompt per skill | |
| Layered (atomic + composite) | Atomic skills composable into workflows | |

**User's choice:** Best practice (multi-step workflow)
**Notes:** The `/check-deadlines` pattern validated this approach.

## Auto-generation Trigger

Technical decision made by Claude based on best practices:
- Trigger after successful `agent_stream()` with 2+ tool calls and citations
- Quality gate compatible with Phase 18 F1 monitoring
- Dedup via (operation_type, course_id) composite key

## Skill Matching & Selection

Technical decision made by Claude based on best practices:
- Two-phase lookup: per-course → global → full exploration
- No embedding-based matching (bounded domain, enum sufficient)

## Pre-seeded vs Emergent

Technical decision made by Claude based on best practices:
- Hybrid: ~10-15 core seeded + auto-generation to ~50

## Student Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Transparent | Show 'Using optimized workflow' in AI responses | |
| Backend invisible (Recommended) | Pure backend optimization, students see faster responses | ✓ |
| Settings page visible | Default hidden, viewable in Settings | |

**User's choice:** Backend invisible
**Notes:** Simplifies UI, reduces cognitive load for students.

## Course Quirks Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-discovery (Recommended) | Detect characteristics during first sync | |
| Manual configuration | Admin configures per-course quirks | |
| Hybrid | Auto-discover + user override in Settings | ✓ |

**User's choice:** Hybrid (auto-discover + user override)
**Notes:** Best of both worlds — works automatically for new courses, allows manual correction.

## Skill Taxonomy

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse same 4 categories (Recommended) | data_collection / data_processing / ai_analysis / user_action | ✓ |
| Reorganize by function | deadline / grades / materials / intelligence | |

**User's choice:** Reuse same 4 categories
**Notes:** Consistency with existing .claude/skills/ development tool taxonomy.

---

## Claude's Discretion

- Pre-seeded skill definitions (exact prompts, tool sequences)
- Migration seeding strategy
- ToolExecutor error handling details

## Deferred Ideas

- Skill marketplace/sharing (v2+)
- Skill analytics dashboard (M4: Operations)

## Key User Input

User provided critical context: their `/check-deadlines` Claude Code command (`~/.claude/commands/check-deadlines.md`) is a proven multi-step workflow that achieves 99% task completion with MCP tools. They also shared their Obsidian Deadline Dashboard as output proof. This validated the "multi-step workflow" granularity choice and informed the reference architecture for runtime skills.
