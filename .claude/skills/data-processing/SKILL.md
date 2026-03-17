# Data Processing Skills

Skills for deduplication, GPA/WAM calculation, and data parsing within UniBoard.

## Quick Reference

| Skill | File | When to Use |
|-------|------|-------------|
| Dedup | rules/dedup.md | Deadline dedup, notification dedup |
| GPA Math | rules/gpa-math.md | WAM/GPA calculation, what-if simulation, target path |
| Parsing | rules/parsing.md | Ed XML, HTML, JSON response parsing |

## Key Patterns

- All GPA math uses `Decimal` with `ROUND_HALF_UP` (never float arithmetic for grade calculations)
- SHA-256 `content_hash` for deterministic dedup (source + normalized title + date)
- `rapidfuzz.fuzz.token_set_ratio(95)` for fuzzy deadline matching (not `fuzz.ratio` at 80)
- `PushRecord` model for notification dedup (unique constraint on `user_id + content_hash`)
- Pydantic `ConfigDict(extra='ignore')` for resilient API response parsing
- Per-item error handling everywhere: `ValidationError` caught and skipped, never crash batch

## Rule 1: Immutable Data Flow

Data flows through a strict pipeline with no mutation of upstream data:
1. **Fetch** (adapters) -> raw JSON/HTML
2. **Validate** (Pydantic models) -> typed objects
3. **Transform** (services) -> domain objects
4. **Store** (SQLAlchemy ORM) -> database

Each stage produces new objects; input data is never modified in place.

## Rule 2: Three-Source Aggregation

UniBoard aggregates data from three sources for deadlines:
- **Canvas assignments** — `source="canvas_assignment"`, `is_confirmed=True`
- **Ed Lessons** — `source="ed_lesson"`, `is_confirmed=True`
- **Ed Discussion** — `source="ed_discussion"`, `is_confirmed=False` (regex-extracted, less reliable)

Each source has its own processing phase in `DeadlineService.aggregate_and_dedup()`.

## Rule 3: Read-Only External Policy

UniBoard NEVER writes to external platforms (Canvas, Ed). All operations are read-only.
- Sync jobs fetch data and store locally
- No POST/PUT/DELETE calls to Canvas or Ed APIs
- User tokens are used only for GET requests

## Files

- `src/services/deadline.py` — DeadlineService (SHA-256 dedup, fuzzy matching)
- `src/services/gpa.py` — GPAService (WAM, GPA, what-if, target path, trend)
- `src/services/notification.py` — NotificationService (PushRecord dedup)
- `src/parsers/ed_document.py` — parse_ed_document() (Ed XML -> plain text)
- `src/parsers/usyd_outline.py` — UnitOutlineParser (HTML -> AssessmentItem list)
- `src/models/grade.py` — Grade ORM (score, max_score, weight)
- `src/models/deadline.py` — UnifiedDeadline ORM (dedup_key, source, is_confirmed)

## Common Pitfalls

- Never use `float` for GPA math — always `Decimal(str(value))` to avoid IEEE 754 drift
- `token_set_ratio` handles supersets well ("Assignment 1 - Due Oct 15" vs "Assignment 1" scores 100)
- Threshold 95 rejects genuinely different items ("Assignment 1" vs "Assignment 2" scores ~91.7)
- SHA-256 dedup key includes course_code (uppercase) to prevent cross-course collisions
- `datetime.utcnow()` for all timestamps (not `datetime.now(UTC)`) — asyncpg TIMESTAMP WITHOUT TIME ZONE
