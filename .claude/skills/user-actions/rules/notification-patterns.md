# Notification Patterns Rules

Rules for creating, deduplicating, and delivering notifications.

## Rule 1: Dedup via PushRecord
SHA-256 `content_hash` on `PushRecord` model with unique constraint `(user_id, content_hash)`. Before creating a notification, check if PushRecord exists. This prevents duplicate deadline reminders and risk alerts.

## Rule 2: Dual-Channel Delivery
Notifications sent to both in_app (database) and email (AWS SES). Email sent async via `asyncio.create_task()` to avoid blocking the sync job. SES requires `asyncio.to_thread()` wrapper since boto3 is synchronous.

## Rule 3: Tiered Reminders
Deadline reminders at three urgency tiers:
- 72h before → severity: "info"
- 24h before → severity: "warning"
- 3h before → severity: "critical"
Each tier generates a separate notification with distinct content_hash.

## Rule 4: Scheduler Configuration
APScheduler jobs in `src/sync/engine.py`:
- Deadline reminders: `IntervalTrigger(minutes=30)` check
- Daily digest: `CronTrigger(hour=7, minute=0, timezone="Australia/Sydney")` — handles DST automatically
- `UNIBOARD_DISABLE_SYNC=true` env var disables scheduler in tests
Source: `src/services/notification.py`, `src/sync/engine.py`
