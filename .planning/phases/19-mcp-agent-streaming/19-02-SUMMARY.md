---
phase: 19-mcp-agent-streaming
plan: 02
subsystem: ai
tags: [translation, claude-api, batch, i18n, sync]

# Dependency graph
requires:
  - phase: 19-01
    provides: "name_zh/title_zh DB columns, TRANSLATION_SYSTEM_PROMPT"
provides:
  - "TranslationService for batch AI translation of course content"
  - "Sync pipeline integration for automatic translation after module sync"
  - "mcp_fallback_token_threshold and translation_enabled config settings"
affects: [19-03, 19-04, frontend-i18n]

# Tech tracking
tech-stack:
  added: []
  patterns: ["batch AI translation with fallback to original text on error", "lazy import for TranslationService/AIEngine in sync tasks"]

key-files:
  created:
    - src/services/translation.py
    - tests/unit/test_translation_service.py
  modified:
    - src/sync/tasks.py
    - src/config.py

key-decisions:
  - "Translation runs after module sync (sync_all_modules) not after every sync type"
  - "Uses separate session for translation to avoid holding sync session open during AI calls"
  - "Removed unused model imports from translation.py (Course relationships accessed via ORM traversal)"

patterns-established:
  - "Batch translation pattern: collect untranslated items, batch API call, apply results to ORM objects, flush"
  - "Non-blocking sync integration: translation wrapped in try/except so failures never block data sync"

requirements-completed: [SET-LANG]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 19 Plan 02: Translation Service Summary

**Batch AI translation service translating course names, module names, lesson/deadline titles into Chinese via Claude API, integrated into sync pipeline for non-English users**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T07:21:30Z
- **Completed:** 2026-03-28T07:24:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- TranslationService with batch_translate (configurable batch_size, JSON fallback) and translate_course_content (eager-loads relationships, skips already-translated)
- Sync pipeline integration: _translate_user_courses runs after module sync for non-English users
- Config settings: mcp_fallback_token_threshold=500, translation_enabled=True
- 7 unit tests covering batch translate, multi-batch, empty input, invalid JSON fallback, course content update, skip already-translated, course not found

## Task Commits

Each task was committed atomically:

1. **Task 1: TranslationService with batch AI translation** - `d9b90f1` (feat)
2. **Task 2: Sync pipeline integration and config update** - `b770a16` (feat)

## Files Created/Modified
- `src/services/translation.py` - TranslationService with batch_translate and translate_course_content methods
- `tests/unit/test_translation_service.py` - 7 unit tests for translation service
- `src/sync/tasks.py` - Added _translate_user_courses helper and call in sync_all_modules
- `src/config.py` - Added mcp_fallback_token_threshold and translation_enabled settings

## Decisions Made
- Translation runs after module sync (sync_all_modules) since that is where course/module/lesson data gets upserted
- Uses a separate session for translation (via session_factory) to avoid holding the sync session open during potentially slow AI API calls
- Removed unused direct model imports (UnifiedDeadline, Lesson, ModuleItem) from translation.py -- accessed via Course ORM relationships

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused imports causing ruff lint failure**
- **Found during:** Task 1 (TranslationService implementation)
- **Issue:** UnifiedDeadline, Lesson, ModuleItem imported but not directly referenced (accessed via ORM relationship traversal); `patch` imported but unused in test file
- **Fix:** Removed unused imports from both files
- **Files modified:** src/services/translation.py, tests/unit/test_translation_service.py
- **Verification:** `uv run ruff check` passes cleanly
- **Committed in:** d9b90f1 (Task 1 commit)

**2. [Rule 3 - Blocking] Adjusted _translate_user_courses signature to use session_factory**
- **Found during:** Task 2 (Sync integration)
- **Issue:** Plan spec used `session: AsyncSession` parameter, but in sync_all_modules the session is scoped inside a `async with session_factory()` block and committed before translation runs; translation needs its own session
- **Fix:** Changed signature to accept `session_factory: async_sessionmaker[AsyncSession]` and open a new session for translation
- **Files modified:** src/sync/tasks.py
- **Verification:** Import verification and lint check pass
- **Committed in:** b770a16 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TranslationService available for any future sync or on-demand translation needs
- Config settings ready for Plans 03/04 (MCP agent, frontend language switching)

## Self-Check: PASSED

All 4 source files found. Both task commits (d9b90f1, b770a16) verified in git log.

---
*Phase: 19-mcp-agent-streaming*
*Completed: 2026-03-28*
