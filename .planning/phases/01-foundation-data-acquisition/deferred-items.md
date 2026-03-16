# Deferred Items - Phase 01

## Pre-existing Issues

### Untracked test files with event loop conflicts
- **Files:** `tests/integration/test_canvas.py`, `tests/integration/test_ed_discussion.py`
- **Issue:** These untracked files use `event_loop` fixture which conflicts with session-scoped event loop. Running `pytest tests/` fails on collection due to `MultipleEventLoopsRequestedError`.
- **Impact:** Cannot run `pytest tests/` without explicitly excluding these files.
- **Resolution:** Will be resolved when Plan 01-03 (adapters) properly creates/replaces these test files.
