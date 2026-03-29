---
phase: 20-skill-system
plan: 02
subsystem: services
tags: [skill-system, mcp-agent, tool-executor, auto-generation, lifecycle, difflib]

# Dependency graph
requires:
  - phase: 20-01
    provides: Skill + SkillExecution ORM models, SkillStatus/SkillCategory enums
  - phase: 14
    provides: Canvas, EdDiscussion, EdLessons adapters with resilience
  - phase: 19
    provides: AIEngine agent_stream with tool_executor callable signature
provides:
  - ToolExecutor class routing 3 MCP tool types to Canvas/Ed adapters
  - SkillService with two-phase lookup, execution trace recording, auto-generation, lifecycle management
  - 13 seeded starter skills across 4 categories from existing prompts
affects: [20-03 (QAService integration), 21 (MCP server)]

# Tech tracking
tech-stack:
  added: []
  patterns: [lazy adapter initialization, two-phase skill lookup, SequenceMatcher trace similarity, trace output truncation]

key-files:
  created:
    - src/services/tool_executor.py
    - src/services/skill.py
    - tests/unit/test_tool_executor.py
    - tests/unit/test_skill_service.py
  modified: []

key-decisions:
  - "Lazy adapter creation in ToolExecutor — adapters only instantiated on first tool call needing them"
  - "SequenceMatcher for trace similarity at 0.7 threshold — lightweight stdlib, no ML dependency"
  - "Lazy prompt resolution in seed_skills via marker strings to avoid circular imports"
  - "Adapter API params use str for course_id/lesson_id matching existing adapter signatures"

patterns-established:
  - "ToolExecutor pattern: graceful error strings instead of exceptions for agent consumption"
  - "SkillService data-only pattern: no AIEngine import, pure data service"
  - "Seed skills pattern: _SEEDED_SKILLS list with lazy prompt markers resolved at runtime"

requirements-completed: [SKILL-01, SKILL-02, SKILL-03, SKILL-04]

# Metrics
duration: 5min
completed: 2026-03-29
---

# Phase 20 Plan 02: ToolExecutor + SkillService Summary

**ToolExecutor routing 3 MCP tools to Canvas/Ed adapters with graceful error handling, plus SkillService managing two-phase lookup, trace recording, auto-generation from similar traces, lifecycle transitions, and 13 seeded skills**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-29T04:27:29Z
- **Completed:** 2026-03-29T04:32:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ToolExecutor routes search_canvas_modules, search_ed_threads, get_ed_lesson_content to real adapters with lazy initialization
- ToolExecutor converts all adapter errors (TokenInvalidError, UpstreamUnavailableError, UpstreamAPIError) to user-friendly strings for Claude consumption
- SkillService two-phase lookup: per-course (specific) -> global (course_id=None) -> None
- SkillService records execution traces with 2000-char output truncation to prevent JSONB bloat
- SkillService auto-generates draft skills when 2+ traces share >70% tool sequence similarity (via difflib.SequenceMatcher)
- SkillService lifecycle: draft->active on first success, active->needs_update when success_rate < 70%
- 13 seeded starter skills across data_collection (3), data_processing (3), ai_analysis (6), user_action (1) with real prompt constants
- 28 unit tests total (12 ToolExecutor + 16 SkillService) all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ToolExecutor service** - `772f19c` (feat) — TDD: RED->GREEN
2. **Task 2: Create SkillService with lookup, trace, auto-gen, lifecycle, seed** - `0c1a9ae` (feat) — TDD: RED->GREEN

## Files Created/Modified
- `src/services/tool_executor.py` - ToolExecutor class routing tool calls to Canvas/Ed adapters
- `src/services/skill.py` - SkillService with full skill lifecycle management
- `tests/unit/test_tool_executor.py` - 12 tests for routing, filtering, error handling, cleanup
- `tests/unit/test_skill_service.py` - 16 tests for lookup, trace, auto-gen, lifecycle, seed

## Decisions Made
- Lazy adapter instantiation in ToolExecutor — avoids creating HTTP clients for unused adapters
- Used difflib.SequenceMatcher (stdlib) for trace similarity rather than adding external NLP dependency
- Seed skills use lazy prompt markers (_LAZY_QA, _LAZY_REVIEW, etc.) resolved at runtime to avoid circular imports with src.prompts modules
- Adapter course_id/lesson_id parameters passed as str matching existing adapter signatures (not int)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ToolExecutor ready to replace `_execute_tool` placeholder in QAService (Plan 03)
- SkillService ready for QAService integration (skill lookup before agent_stream, trace recording after)
- 13 seeded skills ready to be applied on app startup via seed_skills()
- No blockers for Plan 03 (QAService wiring)

## Self-Check: PASSED

- All 4 files verified present on disk
- Both commit hashes (772f19c, 0c1a9ae) verified in git log
- 28/28 tests passing

---
*Phase: 20-skill-system*
*Completed: 2026-03-29*
