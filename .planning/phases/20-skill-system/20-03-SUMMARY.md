---
phase: 20-skill-system
plan: 03
subsystem: services
tags: [skill-system, mcp-agent, tool-executor, qa-service, trace-recording, auto-generation]

# Dependency graph
requires:
  - phase: 20-02
    provides: ToolExecutor class and SkillService with lookup, trace, auto-gen, lifecycle
  - phase: 19
    provides: AIEngine agent_stream with tool_executor callable, QAService placeholder
provides:
  - QAService with ToolExecutor integration replacing _execute_tool placeholder
  - QAService with SkillService integration for skill lookup, trace recording, auto-generation
  - AI route handlers building ToolExecutor with decrypted tokens and proper cleanup
  - 9 unit tests (4 existing + 5 new) verifying full integration pipeline
affects: [21 (MCP server), M4 (production readiness)]

# Tech tracking
tech-stack:
  added: []
  patterns: [traced tool executor wrapper, try/finally cleanup in SSE routes, skill-aware agent branch]

key-files:
  created: []
  modified:
    - src/services/qa.py
    - src/web/routes/ai.py
    - tests/unit/test_qa_service.py

key-decisions:
  - "Inline fallback function when ToolExecutor is None — backward compatible for tests and simple deployments"
  - "Traced executor wrapper captures tool calls for SkillService recording without modifying ToolExecutor itself"
  - "_build_tool_executor as standalone async helper in routes — keeps QAService decoupled from token decryption"

patterns-established:
  - "Traced executor wrapper: inner function wrapping tool_fn to capture trace_steps list"
  - "SSE cleanup pattern: async generator with try/finally for ToolExecutor.close()"
  - "Skill-aware agent branch: lookup before, record after, auto-generate on no-skill success"

requirements-completed: [SKILL-01, SKILL-02, SKILL-03, SKILL-04]

# Metrics
duration: 5min
completed: 2026-03-29
---

# Phase 20 Plan 03: QAService Skill Integration Summary

**ToolExecutor + SkillService wired into QAService replacing placeholder with real adapter calls, traced execution recording, and auto-generation checks on every agent_stream workflow**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-29T04:34:41Z
- **Completed:** 2026-03-29T04:40:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced _execute_tool placeholder in QAService.stream_answer_question with ToolExecutor.execute for real Canvas/Ed adapter calls
- Added SkillService.get_skill() lookup before every agent_stream() call (per-course then global fallback)
- Added execution trace recording after agent_stream() completes (both success and failure paths)
- Added auto-generation check (maybe_generate_skill) after successful explorations without existing skills
- Built ToolExecutor with decrypted tokens in AI route handler with proper try/finally cleanup
- Added skill lookup to stream_review for future prompt injection path
- 5 new integration tests verifying the full pipeline, all 4 existing tests pass unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire ToolExecutor and SkillService into QAService and AI routes** - `68c9f04` (feat)
2. **Task 2: Update existing QA tests and add integration smoke tests** - `3c8affb` (test)

## Files Created/Modified
- `src/services/qa.py` - QAService with ToolExecutor + SkillService integration, traced executor wrapper
- `src/web/routes/ai.py` - _build_tool_executor helper, updated routes with token decryption and cleanup
- `tests/unit/test_qa_service.py` - 5 new tests for ToolExecutor, SkillService, trace recording, backward compat

## Decisions Made
- Inline fallback function when ToolExecutor is None ensures backward compatibility for tests and simple deployments
- Traced executor wrapper captures tool calls into trace_steps list without modifying ToolExecutor class
- _build_tool_executor is a standalone async helper in routes, keeping QAService decoupled from token decryption logic
- _skill variable in stream_review prefixed with underscore (future use) to satisfy ruff F841

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused variable lint error in stream_review**
- **Found during:** Task 1
- **Issue:** ruff F841 flagged `skill` variable as assigned but unused in stream_review
- **Fix:** Prefixed with underscore (`_skill`) since it's intentionally reserved for future prompt injection
- **Files modified:** src/services/qa.py
- **Verification:** `ruff check src/services/qa.py` passes
- **Committed in:** 68c9f04 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial lint fix, no scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all integration points are fully wired. The inline fallback (`[Tool {name} called. No adapter connected.]`) only activates when ToolExecutor is explicitly None, which is the expected graceful degradation path.

## Next Phase Readiness
- Phase 20 skill system is fully integrated: data layer (Plan 01) -> services (Plan 02) -> QAService wiring (Plan 03)
- agent_stream() calls now search Canvas/Ed via real adapters when tokens are configured
- Skills are looked up before exploration and traces recorded after
- Auto-generation triggers when 2+ similar traces accumulate without an existing skill
- Ready for Phase 21 (MCP server standalone) or M4 (production testing)

## Self-Check: PASSED

- All 3 files verified present on disk
- Both commit hashes (68c9f04, 3c8affb) verified in git log
- 9/9 tests passing

---
*Phase: 20-skill-system*
*Completed: 2026-03-29*
