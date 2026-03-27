# Phase 17: Notifications & Digest - Research

**Researched:** 2026-03-27 (refreshed)
**Domain:** In-app notifications, scheduled digest generation, deadline reminders, GPA risk alerts, token health
**Confidence:** HIGH

## Summary

Phase 17 is substantially pre-built (~80% scaffolded). The codebase already contains: (1) `Notification`, `PushRecord`, and `Digest` ORM models with DB tables deployed via Supabase migration; (2) `NotificationService` with SHA-256 PushRecord dedup and dual-channel (in_app + email via SES) delivery; (3) `DigestService` with rule-based collection (grades, deadlines, high-value Ed posts) and AI enhancement hooks; (4) `RiskAlertService` with 5-point WAM gap threshold, AI deep analysis via `AIEngine`, and rule-based fallback; (5) `check_deadline_reminders` and `generate_daily_digests` sync tasks already registered in the APScheduler engine with configurable intervals; (6) REST routes for `/notifications`, `/digest`, and `/alerts` endpoints; (7) Frontend hooks (`useNotifications`, `useAlerts`, `useDigestLatest`, `useDigestHistory`) ready to consume these endpoints.

The primary work items are: (a) existing unit tests reference the old `User` model (pre-Phase 13 migration to `Profile` + Supabase Auth), causing them to fail; (b) `risk_alert.py` line 95 has a variable name bug (`user.ai_calls_today` should be `profile.ai_calls_today`); (c) `RiskAlertService` exists but has no automatic trigger -- it needs to be wired into post-grade-sync as an event-driven hook; (d) PLAT-04 (token expiry warnings) needs a new proactive check task + notification creation; (e) the `check_deadline_reminders` task has no dedicated unit tests.

**Primary recommendation:** Phase 17 is a "harden, fix, and wire" phase, not greenfield. Focus on (1) fixing broken tests (User -> Profile migration), (2) fixing the risk_alert.py bug, (3) adding token expiry warning logic as a new sync task, (4) wiring risk alerts into post-grade-sync flow, (5) comprehensive unit tests for all task functions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Python 3.12+, FastAPI, SQLAlchemy 2.0 async, APScheduler
- Supabase PostgreSQL with RLS
- Rule-based digest only (AI scoring deferred to Phase 18)
- Must integrate with existing sync engine pattern
- Package manager: uv
- All tests must use Profile model (not User)

### Claude's Discretion
- Implementation order for bug fixes vs new features
- Token health check scheduling strategy (alongside reminders vs separate job)
- Risk alert trigger mechanism (post-grade-sync hook vs separate periodic job)

### Deferred Ideas (OUT OF SCOPE)
- AI-enhanced digest with urgency scoring (Phase 18 -- INTEL-04)
- Email delivery infrastructure setup (SES domain verification)
- Real-time push notifications (SSE/WebSocket)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DL-02 | Tiered deadline reminders at 72h, 24h, 3h before due date | `check_deadline_reminders` in `src/sync/tasks.py` (lines 535-601) fully implements 3-tier scanning with PushRecord dedup. APScheduler job registered in engine.py (30-min interval). Needs unit tests to verify tier window logic and dedup behavior. |
| DL-03 | GPA risk alert when trajectory deviates from target | `RiskAlertService` in `src/services/risk_alert.py` detects WAM gap >= 5 points with severity tiers (warning: 5-9, critical: 10+). Has bug on line 95 (`user` should be `profile`). Tests exist but broken (User -> Profile). **Gap:** No auto-trigger from sync -- needs post-grade-sync hook. |
| INTEL-03 | Rule-based daily digest aggregating deadlines, grades, announcements, high-value posts | `DigestService._collect_rule_based` in `src/services/digest.py` collects grades (24h), deadlines (next 7d), endorsed/staff Ed posts (24h). `generate_daily_digests` task runs at 07:00 AEST. Tests exist but broken (User -> Profile). |
| PLAT-04 | Token expiration warnings with re-auth guidance | **Not yet implemented.** Profile model tracks `canvas_token_status`/`ed_token_status` as "expired" when sync detects 401/403, but no proactive warning notification or health-check task exists. Need: (1) new `check_token_health` task function, (2) register in APScheduler engine, (3) create notification with action_url to Settings page. |
</phase_requirements>

## Standard Stack

### Core (already installed -- zero new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| APScheduler | >=3.11,<4.0 | Background job scheduling for reminders, digest, token health | Already configured in sync engine |
| SQLAlchemy | >=2.0,<3.0 | Async ORM for Notification/Digest/PushRecord models | Project standard |
| FastAPI | >=0.115,<1.0 | REST endpoints for notifications, digest, alerts | Project standard |
| structlog | >=24.0,<27.0 | Structured logging for sync tasks | Project standard |
| boto3 | >=1.35,<2.0 | AWS SES email delivery (async wrapper) | Already used in `src/email/ses.py` |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| anthropic | >=0.84,<1.0 | AI digest summary and risk analysis | AI enhancement path only (Phase 18 full) |
| pydantic | >=2.10,<3.0 | Request/response schemas for notification/digest APIs | All API schemas |
| httpx | >=0.28,<1.0 | HTTP client for token health-check pings | Token validation pings to Canvas/Ed API |

### No New Dependencies Needed
This phase requires **zero new packages**. All notification, digest, and scheduling infrastructure uses libraries already in `pyproject.toml`.

## Architecture Patterns

### Existing Architecture (already built)

```
src/
├── models/
│   ├── notification.py    # Notification ORM (user_id, type, severity, title, body, is_read)
│   ├── push_record.py     # PushRecord ORM for SHA-256 dedup (user_id, content_hash)
│   └── digest.py          # Digest ORM (user_id, digest_date, content_json, ai_summary)
├── services/
│   ├── notification.py    # NotificationService: create (with dedup), query, mark-read, unread-count
│   ├── digest.py          # DigestService: rule-based collection, AI enhancement, get_latest/history
│   └── risk_alert.py      # RiskAlertService: WAM gap detection, AI analysis, notification creation
├── sync/
│   ├── engine.py          # APScheduler lifespan with reminder + digest jobs
│   └── tasks.py           # check_deadline_reminders() + generate_daily_digests() task functions
├── web/routes/
│   ├── notifications.py   # GET /notifications, PATCH /{id}/read, GET /unread-count
│   ├── digest.py          # GET /digest/latest, GET /digest/history
│   └── alerts.py          # GET /alerts (GPA risk alerts)
├── schemas/
│   ├── notification.py    # NotificationResponse, UnreadCountResponse, MarkReadRequest
│   └── digest.py          # DigestItemResponse, DigestResponse, RiskAlertResponse
├── email/
│   └── ses.py             # SESEmailSender with async boto3 wrapper
└── prompts/
    └── digest.py          # DIGEST_URGENCY_SYSTEM_PROMPT, DIGEST_SUMMARY_SYSTEM_PROMPT
```

### Pattern 1: Interval-based deadline reminder scanning
**What:** A periodic job (every 30 min, configurable via `settings.reminder_check_interval_min`) scans all users' upcoming deadlines and creates notifications for those falling within the 72h/24h/3h time windows.
**When to use:** When deadline count per user is low (<100) and scan frequency is moderate.
**Implementation:** Already in `check_deadline_reminders()` at `src/sync/tasks.py:535-601`.

```python
# Source: src/sync/tasks.py lines 556-559
# Reminder tiers: (window_start_hours, window_end_hours, tier_name, severity)
tiers: list[tuple[float, float, str, str]] = [
    (2.5, 3.5, "3h", "critical"),
    (23.0, 25.0, "24h", "warning"),
    (71.0, 73.0, "72h", "info"),
]
```

### Pattern 2: SHA-256 PushRecord dedup
**What:** Before creating any notification, compute `SHA-256(user_id|type|title)` and check `push_records` table for existing hash. If found, skip silently (return None).
**When to use:** For all notification creation paths (reminders, risk alerts, digest notifications, token expiry warnings).
**Implementation:** Already in `NotificationService.create_notification()` at `src/services/notification.py:44-57`.

### Pattern 3: Pre-computed digest storage
**What:** Daily digest is generated by a cron job (07:00 AEST via `CronTrigger(timezone="Australia/Sydney")`), stored as JSON in `digests.content_json`, and served to frontend via `GET /digest/latest`.
**When to use:** Always for digest. Pre-computation avoids expensive queries on each page load.
**Implementation:** Already in `DigestService.generate_digest()` and `generate_daily_digests()` task.

### Pattern 4: Event-driven risk alerts (NEW -- to implement)
**What:** After `sync_all_grades()` successfully syncs a user's grades, call `RiskAlertService.check_risk_for_user(user_id)`. This is event-driven (after data changes), not polling.
**When to use:** Whenever grades are updated. More efficient than periodic polling because risk only changes when grade data changes.
**Implementation:** Add a post-sync hook call inside the `sync_all_grades()` success path.

### Pattern 5: Token health check (NEW -- to implement)
**What:** A periodic task (runs alongside or separately from reminders) pings Canvas/Ed APIs with a lightweight endpoint to detect token revocation before the next full sync fails.
**When to use:** For PLAT-04 proactive token expiry warnings.
**Implementation:** New `check_token_health()` task function in `src/sync/tasks.py`, registered in `src/sync/engine.py`.

### Anti-Patterns to Avoid
- **Per-deadline scheduled jobs:** Don't schedule individual APScheduler jobs for each deadline. This creates unbounded job growth. The current interval-scan approach is correct.
- **Real-time push (SSE/WebSocket) for notifications:** Unnecessary complexity for MVP. Frontend polling with TanStack Query refetch intervals is sufficient.
- **Sending email for every notification:** SES requires verified domain. For MVP, in-app notifications are the primary channel; email is optional fire-and-forget.
- **Removing tier name from dedup hash:** The PushRecord dedup hash is `SHA-256(user_id|type|title)`. Since the title includes tier name ("due in 72h" vs "due in 24h"), each tier generates a separate notification. This is **correct** -- users should get separate 72h, 24h, and 3h reminders.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Notification dedup | Custom timestamp-based dedup | SHA-256 PushRecord (already built) | Content hash is deterministic and O(1) lookup via unique index |
| Job scheduling | Custom asyncio task loops | APScheduler 3.11 AsyncIOScheduler (already configured) | Handles timezone, missed jobs, max instances |
| Timezone DST | Manual UTC offset calculation | `CronTrigger(timezone="Australia/Sydney")` | APScheduler handles AEST/AEDT transitions correctly |
| Email templating | String concatenation | Jinja2 (already in deps) | Better maintainability for email HTML bodies |
| Token validation | Custom HTTP client | httpx (already in deps, used by adapters) | Consistent error handling with existing adapter pattern |

**Key insight:** This phase has no "build from scratch" problems. Everything is already scaffolded. The work is testing, bug-fixing, wiring, and adding the token expiry warning feature.

## Common Pitfalls

### Pitfall 1: Old User model in tests (CRITICAL -- must fix first)
**What goes wrong:** Existing unit tests (`test_notification_service.py`, `test_digest_service.py`, `test_risk_alert_service.py`) and integration tests (`test_notification_routes.py`) import `User` from `src.models.user` and call `hash_password` from `src.security.password`. Phase 13 removed the `User` class and replaced it with `Profile`. `hash_password` no longer exists (Supabase Auth handles passwords).
**Why it happens:** Phase 15/16 added services/routes that use Profile, but the pre-existing test files were not migrated.
**How to avoid:** All test helper functions must create `Profile` instances directly (with `id=uuid.uuid4()`, `display_name`, `gpa_target`). No `email`, `hashed_password`, or `hash_password` usage. Integration tests use Supabase JWT via `get_current_user_id` dependency override.
**Warning signs:** `ImportError: cannot import name 'User'` or `ImportError: cannot import name 'hash_password'`.

### Pitfall 2: risk_alert.py variable name bug (line 95)
**What goes wrong:** Line 95 of `risk_alert.py` references `user.ai_calls_today` but the variable in scope is `profile` (retrieved via `self._session.get(Profile, user_id)` on line 41).
**Why it happens:** Copy-paste error during migration from User to Profile model.
**How to avoid:** Fix to `profile.ai_calls_today += 1`. Ensure test covers the `ai_was_called = True` code path to catch this.

### Pitfall 3: Digest cron timezone (DST trap)
**What goes wrong:** Using UTC offset instead of named timezone for AEST causes digest to fire at wrong time during daylight saving transitions.
**Why it happens:** AEST is UTC+10 but AEDT is UTC+11; manual calculation misses the switch.
**How to avoid:** Already correctly handled -- `CronTrigger(hour=7, timezone="Australia/Sydney")` is in `engine.py`. **Do not change this to a UTC hour.**
**Warning signs:** Digest arriving 1 hour early/late around first Sunday of April/October.

### Pitfall 4: Canvas/Ed tokens don't have explicit expiry timestamps
**What goes wrong:** PLAT-04 requires token expiry warnings. But Canvas personal access tokens don't have an explicit expiry date (they persist until manually revoked). Ed tokens' expiry behavior is undocumented.
**Why it happens:** Neither API exposes a token expiry field.
**How to avoid:** Use a heuristic approach: (1) detect "expired" status from sync failures (already done), (2) add a lightweight health-check ping to confirm token validity, (3) create notification when status transitions to "expired". Don't try to predict when tokens *will* expire -- only detect when they *have* expired.

### Pitfall 5: Test Profile creation without auth.users dependency
**What goes wrong:** Profile PK references `auth.users(id)` in production via Supabase trigger. In unit tests with the in-memory session, there is no `auth.users` table.
**Why it happens:** Tests run against a test DB with `Base.metadata.create_all` which only creates SQLAlchemy-managed tables, not Supabase system tables.
**How to avoid:** Profile FK to `auth.users` is only enforced in production Supabase migration. The test DB creates profiles with `id=uuid.uuid4()` directly since the FK constraint isn't in the SQLAlchemy model definition (Profile.id is just a `primary_key=True` UUID column, not a ForeignKey in the ORM model).

### Pitfall 6: `check_deadline_reminders` creates sessions inside a loop
**What goes wrong:** The function creates a new session for each user inside a for-loop via `async with session_factory() as session`. This is correct for isolation but means each user's notifications are committed independently.
**Why it matters:** If testing this function, the mock session factory must handle multiple `__aenter__` calls correctly (not reuse the same mock session instance). The existing `_mock_session_factory` pattern in `test_sync_tasks.py` uses a `_SessionCtx` class with `side_effect` that creates a new session per call.

## Code Examples

### Example 1: Fixing test helper from User to Profile
```python
# BEFORE (broken):
from src.models.user import User
from src.security.password import hash_password

async def _create_test_user(session: AsyncSession) -> User:
    user = User(
        email="test@test.com",
        hashed_password=hash_password("testpass123"),
        display_name="Tester",
    )
    session.add(user)
    await session.flush()
    return user

# AFTER (correct):
from src.models.user import Profile

async def _create_test_profile(
    session: AsyncSession,
    *,
    gpa_target: float | None = None,
    canvas_token_encrypted: str | None = None,
    ed_token_encrypted: str | None = None,
) -> Profile:
    """Create a test Profile (no auth.users dependency in unit tests)."""
    profile = Profile(
        id=uuid.uuid4(),
        display_name="Test User",
        gpa_target=gpa_target,
        canvas_api_token_encrypted=canvas_token_encrypted,
        ed_api_token_encrypted=ed_token_encrypted,
    )
    session.add(profile)
    await session.flush()
    return profile
```

### Example 2: Fixing risk_alert.py bug
```python
# BEFORE (line 95, bug):
if ai_was_called:
    user.ai_calls_today += 1  # NameError: 'user' is not defined
    await self._session.flush()

# AFTER (correct):
if ai_was_called:
    profile.ai_calls_today += 1  # 'profile' is the variable from line 41
    await self._session.flush()
```

### Example 3: Token health check task (NEW -- pattern to implement)
```python
# Pattern for proactive token expiry notification
# Source: follows existing check_deadline_reminders pattern in tasks.py

async def check_token_health() -> None:
    """Check token validity for all users and notify on expiry.

    Runs alongside reminder checks. Lightweight API ping per platform per user.
    """
    from src.services.notification import NotificationService

    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(Profile).where(
                or_(
                    Profile.canvas_token_status == "expired",
                    Profile.ed_token_status == "expired",
                )
            )
        )
        users = list(result.scalars().all())

    for user in users:
        async with session_factory() as session:
            notif_svc = NotificationService(session)
            if user.canvas_token_status == "expired":
                await notif_svc.create_notification(
                    user_id=user.id,
                    notification_type="token_expiry",
                    severity="warning",
                    title="Canvas API token expired",
                    body="Your Canvas token has expired. Go to Settings to reconnect.",
                    channels=["in_app"],
                    action_url="/settings#tokens",
                )
            if user.ed_token_status == "expired":
                await notif_svc.create_notification(
                    user_id=user.id,
                    notification_type="token_expiry",
                    severity="warning",
                    title="Ed API token expired",
                    body="Your Ed token has expired. Go to Settings to reconnect.",
                    channels=["in_app"],
                    action_url="/settings#tokens",
                )
            await session.commit()
```

### Example 4: Post-grade-sync risk alert hook (NEW -- pattern to implement)
```python
# Pattern: call RiskAlertService after successful grade sync
# Add to sync_all_grades() after the per-user success path

from src.services.risk_alert import RiskAlertService

# Inside the per-user loop, after successful _sync_user_grades:
try:
    async with session_factory() as session:
        risk_svc = RiskAlertService(session, anthropic_api_key="")
        await risk_svc.check_risk_for_user(user.id)
        await session.commit()
except Exception:
    logger.warning("risk_alert_post_sync_failed", user_id=str(user.id))
```

### Example 5: Sync task unit test pattern (for check_deadline_reminders)
```python
# Follows existing pattern from test_sync_tasks.py
# Key: mock session factory, mock Profile/Course/Deadline models

@patch("src.sync.tasks._get_sync_session_factory")
async def test_check_deadline_reminders_creates_notifications(
    mock_factory_fn: MagicMock,
) -> None:
    """Deadline within 72h window triggers info notification."""
    profile = _make_profile()
    course = _make_course(profile.id)

    # Mock deadline due in 72h (within the 71-73h window)
    deadline = MagicMock()
    deadline.course_id = course.id
    deadline.title = "Assignment 1"
    deadline.due_date = datetime.now(UTC) + timedelta(hours=72)

    # Set up session factory with custom execute side effects
    # ...verify NotificationService.create_notification was called
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `User` model with bcrypt password | `Profile` model linked to Supabase `auth.users` | Phase 13 (2026-03-26) | All test helpers must use Profile, not User |
| Manual JWT creation in tests | Supabase JWT verification via `get_current_user_id` | Phase 13 | Integration tests override dependency |
| No sync history | `sync_history` table with domain/status/timestamps | Phase 16 (2026-03-27) | Audit trail for all sync operations |
| Risk alerts query-only | Risk alerts auto-triggered post-grade-sync | Phase 17 (this phase) | RiskAlertService becomes proactive |
| Reactive token expiry (sync failure) | Proactive token health check + notification | Phase 17 (this phase) | Users get warned before next sync attempt |

**Deprecated/outdated:**
- `src.models.user.User`: Does NOT exist. `Profile` is the only user model class.
- `src.security.password.hash_password`: Does NOT exist. Supabase Auth handles passwords.
- `src.security.auth.create_access_token`: Does NOT exist. Use Supabase JWT or dependency override for tests.

## Open Questions

1. **Canvas token health-check endpoint**
   - What we know: Canvas REST API has `GET /api/v1/users/self` which returns 401 on bad token. This is the lightest possible ping.
   - What's unclear: Rate limits on this endpoint when called every 30 min per user (likely fine, Canvas rate limit is generous for GET /users/self).
   - Recommendation: Use `/api/v1/users/self` for Canvas. For Ed, use a similarly light endpoint (e.g., list courses). If the health check itself fails with a non-auth error (network), don't change token status.

2. **Email delivery for MVP**
   - What we know: SES is configured but requires domain verification and AWS credentials.
   - What's unclear: Is SES actually set up in the deployment environment?
   - Recommendation: Keep email channel code as-is (fire-and-forget pattern, never raises). In-app notification is the primary channel. Email can be enabled later by configuring SES credentials.

3. **Risk alert dedup across sync cycles**
   - What we know: PushRecord dedup uses `SHA-256(user_id|gpa_risk|title)`. The title includes the WAM gap value (e.g., "GPA Risk Alert: WAM 10.0 points below target").
   - What's unclear: If WAM gap changes slightly between syncs (e.g., 10.0 -> 10.2), a new notification would be created because the title changes.
   - Recommendation: Round the gap to nearest integer in the title to reduce noise, or use a coarser dedup key that doesn't include the exact gap value.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest >=8.3 + pytest-asyncio >=0.25 |
| Config file | `pyproject.toml` [tool.pytest.ini_options] |
| Quick run command | `uv run pytest tests/unit/ -x -q` |
| Full suite command | `uv run pytest tests/ -x -q --timeout=120` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DL-02 | Deadline reminders at 72h/24h/3h tiers | unit | `uv run pytest tests/unit/test_deadline_reminders.py -x` | Wave 0 |
| DL-03 | GPA risk alert on WAM deviation >= 5 | unit | `uv run pytest tests/unit/test_risk_alert_service.py -x` | Exists (broken -- User model) |
| DL-03 | Risk alert auto-trigger after grade sync | unit | `uv run pytest tests/unit/test_sync_tasks.py -x -k risk` | Wave 0 |
| INTEL-03 | Daily digest aggregates grades/deadlines/posts | unit | `uv run pytest tests/unit/test_digest_service.py -x` | Exists (broken -- User model) |
| PLAT-04 | Token expiry warning notification | unit | `uv run pytest tests/unit/test_token_health.py -x` | Wave 0 |
| ALL | Route-level auth + response shape | integration | `uv run pytest tests/integration/test_notification_routes.py tests/integration/test_digest_routes.py -x` | Exists (minimal -- auth-only) |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/unit/ -x -q`
- **Per wave merge:** `uv run pytest tests/ -x -q --timeout=120`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_deadline_reminders.py` -- covers DL-02 (check_deadline_reminders task logic with tier windows)
- [ ] `tests/unit/test_token_health.py` -- covers PLAT-04 (token expiry check and notification creation)
- [ ] Fix `tests/unit/test_notification_service.py` -- User -> Profile migration (imports, helper function)
- [ ] Fix `tests/unit/test_digest_service.py` -- User -> Profile migration (imports, helper function)
- [ ] Fix `tests/unit/test_risk_alert_service.py` -- User -> Profile migration + fix `user` -> `profile` bug in service
- [ ] Fix `tests/integration/test_notification_routes.py` -- User -> Profile migration, auth pattern update
- [ ] Fix `tests/integration/test_digest_routes.py` -- confirm no User references (currently clean but minimal)

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- all models, services, routes, tasks, schemas, tests read directly
  - `src/sync/engine.py` -- APScheduler lifespan with 6 registered jobs (4 sync + reminders + digest)
  - `src/sync/tasks.py` -- check_deadline_reminders (L535-601), generate_daily_digests (L604-638)
  - `src/services/notification.py` -- Full NotificationService with PushRecord dedup
  - `src/services/digest.py` -- Full DigestService with rule-based and AI paths
  - `src/services/risk_alert.py` -- RiskAlertService with WAM gap detection (bug on L95)
  - `src/models/notification.py`, `push_record.py`, `digest.py` -- ORM models
  - `src/models/user.py` -- Profile model with sync status fields and ai_calls_today
  - `src/web/routes/notifications.py`, `digest.py`, `alerts.py` -- REST endpoints
  - `src/config.py` -- Settings with reminder_check_interval_min=30, digest_cron_hour_aest=7
  - `tests/unit/test_notification_service.py` -- 4 tests, all broken (User import)
  - `tests/unit/test_digest_service.py` -- 2 tests, all broken (User import)
  - `tests/unit/test_risk_alert_service.py` -- 4 tests, all broken (User import)
  - `tests/unit/test_sync_tasks.py` -- 7 tests using correct Profile model (reference pattern)
  - `frontend/hooks/use-notifications.ts` -- useNotifications, useAlerts hooks
  - `frontend/hooks/use-digest.ts` -- useDigestLatest, useDigestHistory hooks
  - `pyproject.toml` -- all dependencies confirmed present, zero additions needed

### Secondary (MEDIUM confidence)
- APScheduler 3.11 documentation for CronTrigger timezone handling

### Tertiary (LOW confidence)
- Canvas LMS personal access token expiry behavior (no official docs confirming tokens don't expire; based on observed behavior and community consensus)
- Ed API token expiry behavior (no public documentation exists)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed, versions verified from pyproject.toml
- Architecture: HIGH -- all models, services, routes, tasks fully implemented and inspected line-by-line
- Pitfalls: HIGH -- bugs identified from direct code reading (User model in tests, variable name in risk_alert.py line 95)
- Test gaps: HIGH -- identified exactly which test files are broken and what mock patterns to follow

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- no external API dependencies changing)
