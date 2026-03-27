# Phase 17: Notifications & Digest - Research

**Researched:** 2026-03-27
**Domain:** In-app notifications, scheduled digest generation, deadline reminders, GPA risk alerts
**Confidence:** HIGH

## Summary

Phase 17 is substantially pre-built. The codebase already contains: (1) `Notification`, `PushRecord`, and `Digest` ORM models with DB tables deployed via Supabase migration; (2) `NotificationService` with SHA-256 PushRecord dedup and dual-channel (in_app + email via SES) delivery; (3) `DigestService` with rule-based collection (grades, deadlines, high-value Ed posts) and AI enhancement hooks; (4) `RiskAlertService` with 5-point WAM gap threshold, AI deep analysis via `AIEngine`, and rule-based fallback; (5) `check_deadline_reminders` and `generate_daily_digests` sync tasks already registered in the APScheduler engine with configurable intervals; (6) REST routes for `/notifications`, `/digest`, and `/alerts` endpoints; (7) Frontend hooks (`useNotifications`, `useAlerts`, `useDigestLatest`, `useDigestHistory`) ready to consume these endpoints.

The primary gap is that the existing **unit tests reference the old `User` model** (pre-Phase 13 migration to `Profile` + Supabase Auth), causing them to fail. The `risk_alert.py` service also has a bug at line 95 where it references `user.ai_calls_today` instead of `profile.ai_calls_today`. Additionally, the `check_deadline_reminders` task lacks a dedicated unit test, and the `generate_daily_digests` task lacks independent testing of its scheduling logic. Token expiration warning (PLAT-04) needs implementation -- the Profile model already tracks `canvas_token_status` and `ed_token_status` as "expired"/"active"/"not_configured", but there is no scheduled job or API endpoint that proactively warns users about approaching expiry.

**Primary recommendation:** Phase 17 is a "harden and fix" phase, not a greenfield build. Focus on (1) fixing broken tests (User -> Profile migration), (2) fixing the risk_alert.py bug, (3) adding token expiry warning logic, (4) comprehensive unit tests for the reminder checker and digest generator tasks, and (5) integration tests verifying the full notification pipeline.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DL-02 | Tiered deadline reminders at 72h, 24h, 3h before due date | `check_deadline_reminders` in `src/sync/tasks.py` (lines 521-587) already implements this with configurable window scanning. APScheduler job registered in engine.py. Needs unit tests. |
| DL-03 | GPA risk alert when trajectory deviates from target | `RiskAlertService` in `src/services/risk_alert.py` detects WAM gap >= 5 points with severity tiers. Has bug on line 95 (`user` vs `profile`). Needs test fix (User -> Profile). |
| INTEL-03 | Rule-based daily digest aggregating deadlines, grades, announcements, high-value posts | `DigestService._collect_rule_based` in `src/services/digest.py` collects grades (24h), deadlines (7d), endorsed/staff Ed posts (24h). AI scoring deferred to Phase 18. Needs test fix. |
| PLAT-04 | Token expiration warnings with re-auth guidance | **Not yet implemented.** Profile model tracks `canvas_token_status`/`ed_token_status` as "expired" when sync detects 401/403, but no proactive warning mechanism or dedicated API endpoint exists. Need new sync task or endpoint logic. |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| APScheduler | 3.11.2 | Background job scheduling for reminders and digest | Already configured in sync engine |
| SQLAlchemy | 2.0.48 | Async ORM for Notification/Digest/PushRecord models | Project standard |
| FastAPI | 0.135.1 | REST endpoints for notifications, digest, alerts | Project standard |
| structlog | 24.x | Structured logging for sync tasks | Project standard |
| boto3 | 1.35.x | AWS SES email delivery (async wrapper) | Already used in `src/email/ses.py` |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| anthropic | 0.84.x | AI digest summary and risk analysis (Phase 18 full) | AI enhancement path only |
| pydantic | 2.10.x | Request/response schemas for notification/digest APIs | All API schemas |

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
│   ├── engine.py          # APScheduler lifespan with check_deadline_reminders + generate_daily_digests jobs
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
**What:** A periodic job (every 30 min) scans all users' upcoming deadlines and creates notifications for those falling within the 72h/24h/3h windows.
**When to use:** When deadline count per user is low (<100) and scan frequency is moderate.
**Why this is correct for UniBoard:** University students typically have <20 active deadlines. Scanning all deadlines per user every 30 minutes is negligible cost.
**Implementation:** Already in `check_deadline_reminders()` at `src/sync/tasks.py:521-587`.

```python
# Source: src/sync/tasks.py lines 542-546
tiers: list[tuple[float, float, str, str]] = [
    (2.5, 3.5, "3h", "critical"),
    (23.0, 25.0, "24h", "warning"),
    (71.0, 73.0, "72h", "info"),
]
```

### Pattern 2: SHA-256 PushRecord dedup
**What:** Before creating any notification, compute `SHA-256(user_id|type|title)` and check `push_records` table for existing hash. If found, skip silently.
**When to use:** For all notification creation paths (reminders, risk alerts, digest notifications).
**Implementation:** Already in `NotificationService.create_notification()` at `src/services/notification.py:44-57`.

### Pattern 3: Pre-computed digest storage
**What:** Daily digest is generated by a cron job (07:00 AEST), stored as JSON in `digests.content_json`, and served to frontend via `GET /digest/latest`.
**When to use:** Always for digest. Pre-computation avoids expensive queries on each page load.
**Implementation:** Already in `DigestService.generate_digest()` and `generate_daily_digests()` task.

### Pattern 4: Token expiry detection via sync failure (existing passive approach)
**What:** When a sync task gets a 401/403 from Canvas/Ed API, it sets `canvas_token_status = "expired"` or `ed_token_status = "expired"` on the Profile model.
**Where it happens:** `_sync_user_grades` (line 130-133), `sync_all_deadlines` (line 252-254), `_sync_ed_lessons` (line 701-703).
**Gap:** This is purely reactive -- tokens are only detected as expired AFTER a sync fails. There is no proactive check or warning notification sent to users.

### Anti-Patterns to Avoid
- **Per-deadline scheduled jobs:** Don't schedule individual APScheduler jobs for each deadline. This creates unbounded job growth and is hard to manage. The current interval-scan approach is correct.
- **Real-time push (SSE/WebSocket) for notifications:** Unnecessary complexity for MVP. Frontend polling with TanStack Query refetch intervals is sufficient. Phase 19 may add SSE for AI streaming, but not for notifications.
- **Sending email for every notification:** The current code attempts SES for "email" channel notifications, but SES requires verified domain. For MVP, in-app notifications are the primary channel; email is optional.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Notification dedup | Custom timestamp-based dedup | SHA-256 PushRecord (already built) | Content hash is deterministic and O(1) lookup via unique index |
| Job scheduling | Custom asyncio task loops | APScheduler 3.11 AsyncIOScheduler (already configured) | Handles timezone, missed jobs, max instances |
| Timezone DST | Manual UTC offset calculation | `CronTrigger(timezone="Australia/Sydney")` | APScheduler handles AEST/AEDT transitions correctly |
| Email templating | String concatenation | Jinja2 (already in deps) | Better maintainability for email HTML bodies |

**Key insight:** This phase has no "build from scratch" problems. Everything is already scaffolded. The work is testing, bug-fixing, and adding the token expiry warning feature.

## Common Pitfalls

### Pitfall 1: Old User model in tests
**What goes wrong:** Existing unit tests (`test_notification_service.py`, `test_digest_service.py`, `test_risk_alert_service.py`) import `User` from `src.models.user` and use `hash_password`. Phase 13 migrated to `Profile` model linked to Supabase `auth.users`.
**Why it happens:** Phase 15/16 added services/routes that use Profile, but the Phase 13 migration didn't update all pre-existing test files.
**How to avoid:** All test helper functions must create `Profile` instances (not `User`), and integration tests must use Supabase JWT auth via `get_current_user_id` dependency override.
**Warning signs:** `ImportError: cannot import name 'User'` or `AttributeError: module has no attribute 'User'`.

### Pitfall 2: risk_alert.py variable name bug
**What goes wrong:** Line 95 of `risk_alert.py` references `user.ai_calls_today` but the variable in scope is `profile` (retrieved via `self._session.get(Profile, user_id)` on line 41).
**Why it happens:** Copy-paste error during migration from User to Profile model.
**How to avoid:** Fix to `profile.ai_calls_today += 1` and ensure test covers this code path.

### Pitfall 3: Digest cron timezone (DST trap)
**What goes wrong:** Using UTC offset instead of named timezone for AEST causes digest to fire at wrong time during daylight saving transitions.
**Why it happens:** AEST is UTC+10 but AEDT is UTC+11; manual calculation misses the switch.
**How to avoid:** Already correctly handled -- `CronTrigger(hour=7, timezone="Australia/Sydney")` is in config. **Do not change this to a UTC hour.**
**Warning signs:** Digest arriving 1 hour early/late around first Sunday of April/October.

### Pitfall 4: PushRecord dedup hash includes title (tier-specific)
**What goes wrong:** The current dedup hash is `SHA-256(user_id|type|title)`. Since the title includes the tier name (e.g., "COMP2017: Assignment 1 due in 72h" vs "...due in 24h"), each tier generates a separate notification. This is **correct behavior** -- users should get separate 72h, 24h, and 3h reminders.
**Why it matters:** Don't "fix" this by removing the tier from the title, or users will only get the first reminder.

### Pitfall 5: Token expiry proactive vs reactive
**What goes wrong:** PLAT-04 requires "display when tokens are near expiry." Canvas personal access tokens don't have explicit expiry dates (they persist until manually revoked). Ed tokens also lack documented expiry metadata.
**Why it happens:** Neither Canvas nor Ed APIs expose token expiry timestamps.
**How to avoid:** Implement a heuristic approach: (1) detect expired status from sync failures (already done), (2) create a notification when token_status changes to "expired", (3) consider a periodic "health check" ping to Canvas/Ed API to proactively detect token revocation before the next full sync.

## Code Examples

### Example 1: Creating a deadline reminder notification (existing pattern)
```python
# Source: src/sync/tasks.py lines 574-585
notif_svc = NotificationService(session)
for deadline in deadlines:
    course = course_map.get(deadline.course_id)
    course_code = course.code if course else "Unknown"
    await notif_svc.create_notification(
        user_id=user.id,
        notification_type="deadline_reminder",
        severity=severity,
        title=f"{course_code}: {deadline.title} due in {tier_name}",
        body=f"{deadline.title} is due in {tier_name}.",
        channels=["in_app", "email"],
    )
```

### Example 2: Digest rule-based collection (existing pattern)
```python
# Source: src/services/digest.py lines 89-192
# Collects: grades graded in last 24h, deadlines due in next 7 days,
# endorsed/staff Ed posts synced in last 24h
items: list[DigestItemResponse] = []
now = datetime.utcnow()
cutoff_24h = now - timedelta(hours=24)
# ... queries for grades, deadlines, posts
```

### Example 3: Token expiry warning notification (NEW -- to be implemented)
```python
# Pattern for proactive token expiry notification
async def check_token_health(self) -> None:
    """Check token validity for all users and notify on expiry."""
    session_factory = _get_sync_session_factory()
    async with session_factory() as session:
        # Find users with expired token status
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
            # Similar for Ed token
            await session.commit()
```

### Example 4: Unit test pattern with Profile (migration fix)
```python
# Correct pattern for Phase 17 tests (Profile, not User)
from src.models.user import Profile

async def _create_test_profile(
    session: AsyncSession,
    *,
    gpa_target: float | None = None,
) -> Profile:
    """Create a test Profile instance (no auth.users dependency in unit tests)."""
    profile = Profile(
        id=uuid.uuid4(),
        display_name="Test User",
        gpa_target=gpa_target,
    )
    session.add(profile)
    await session.flush()
    return profile
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `User` model with bcrypt password | `Profile` model linked to Supabase `auth.users` | Phase 13 (2026-03-26) | All test helpers must use Profile, not User |
| Manual JWT creation in tests | Supabase JWT verification via `get_current_user_id` | Phase 13 | Integration tests override dependency |
| No sync history | `sync_history` table with domain/status/timestamps | Phase 16 (2026-03-27) | Audit trail for all sync operations |

**Deprecated/outdated:**
- `src.models.user.User`: Removed in Phase 13. `Profile` is the correct model.
- `src.security.password.hash_password`: No longer used (Supabase Auth handles passwords).
- `src.security.auth.create_access_token`: No longer used for test auth (use Supabase JWT or dependency override).

## Open Questions

1. **Canvas token expiry heuristic**
   - What we know: Canvas personal access tokens don't expire unless manually revoked. Token status is set to "expired" when sync gets 401/403.
   - What's unclear: Should PLAT-04 only warn after sync failure detection, or should we add a proactive health-check ping?
   - Recommendation: Implement a lightweight token health check that runs alongside the deadline reminder job (every 30 min). A single `/api/v1/users/self` call per platform per user confirms token validity. If it fails, set status to "expired" and create notification. This adds <1s overhead per user per check.

2. **Email delivery for MVP**
   - What we know: SES is configured but requires domain verification and AWS credentials.
   - What's unclear: Is SES actually set up in the deployment environment?
   - Recommendation: Keep email channel code as-is (fire-and-forget pattern, never raises). The in-app notification is the primary channel. Email can be enabled later by configuring SES credentials.

3. **Risk alert scheduling**
   - What we know: `RiskAlertService.check_risk_for_user()` exists but is only exposed via `GET /alerts` (query past alerts). There is no scheduled job that proactively runs risk checks.
   - What's unclear: Should risk checks run on a schedule, or only after grade sync completes?
   - Recommendation: Run risk checks after each grade sync completion (inside `sync_all_grades`, after successfully updating grades for a user). This is event-driven and more efficient than polling.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3 + pytest-asyncio 0.25 |
| Config file | `pyproject.toml` [tool.pytest.ini_options] |
| Quick run command | `uv run pytest tests/unit/ -x -q` |
| Full suite command | `uv run pytest tests/ -x -q --timeout=120` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DL-02 | Deadline reminders at 72h/24h/3h tiers | unit | `uv run pytest tests/unit/test_deadline_reminders.py -x` | Wave 0 |
| DL-03 | GPA risk alert on WAM deviation >= 5 | unit | `uv run pytest tests/unit/test_risk_alert_service.py -x` | Exists (broken -- User model) |
| INTEL-03 | Daily digest aggregates grades/deadlines/posts | unit | `uv run pytest tests/unit/test_digest_service.py -x` | Exists (broken -- User model) |
| PLAT-04 | Token expiry warning notification | unit | `uv run pytest tests/unit/test_token_health.py -x` | Wave 0 |
| ALL | Route-level auth + response shape | integration | `uv run pytest tests/integration/test_notification_routes.py tests/integration/test_digest_routes.py -x` | Exists (minimal) |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/unit/ -x -q`
- **Per wave merge:** `uv run pytest tests/ -x -q --timeout=120`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_deadline_reminders.py` -- covers DL-02 (check_deadline_reminders task logic)
- [ ] `tests/unit/test_token_health.py` -- covers PLAT-04 (token expiry check and notification)
- [ ] Fix `tests/unit/test_notification_service.py` -- User -> Profile migration
- [ ] Fix `tests/unit/test_digest_service.py` -- User -> Profile migration
- [ ] Fix `tests/unit/test_risk_alert_service.py` -- User -> Profile migration + `user` -> `profile` bug fix

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- all models, services, routes, tasks, schemas, tests read directly
  - `src/sync/engine.py` -- APScheduler lifespan with reminder and digest jobs
  - `src/sync/tasks.py` -- check_deadline_reminders (L521-587), generate_daily_digests (L590-624)
  - `src/services/notification.py` -- Full NotificationService with PushRecord dedup
  - `src/services/digest.py` -- Full DigestService with rule-based and AI paths
  - `src/services/risk_alert.py` -- RiskAlertService with WAM gap detection
  - `src/models/notification.py`, `push_record.py`, `digest.py` -- ORM models
  - `src/web/routes/notifications.py`, `digest.py`, `alerts.py` -- REST endpoints
  - `src/config.py` -- Settings with reminder_check_interval_min, digest_cron_hour_aest
  - `supabase/migrations/00000000000001_initial_schema.sql` -- DB schema for notifications, push_records, digests tables
  - `frontend/hooks/use-digest.ts`, `use-notifications.ts` -- Frontend consumption hooks

### Secondary (MEDIUM confidence)
- APScheduler 3.11 documentation for CronTrigger timezone handling

### Tertiary (LOW confidence)
- Canvas LMS personal access token expiry behavior (no official docs found confirming tokens don't expire; based on observed behavior)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and configured, versions verified from running Python
- Architecture: HIGH -- all models, services, routes, tasks fully implemented and inspected
- Pitfalls: HIGH -- bugs identified from direct code reading (User model in tests, variable name in risk_alert.py)

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- no external API dependencies changing)
