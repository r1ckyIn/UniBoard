---
phase: 04-intelligence-skills
plan: 01
subsystem: notifications, digest, intelligence
tags: [apscheduler, anthropic, ses, boto3, jinja2, zustand, tanstack-query, pgvector]

# Dependency graph
requires:
  - phase: 03-frontend-dashboard
    provides: "Sidebar layout, DigestCard/DigestFeed components, Zustand stores"
  - phase: 02-backend-api
    provides: "GPAService, DeadlineService, sync engine, PushRecord model"
provides:
  - "Notification ORM model + NotificationService with PushRecord SHA-256 dedup"
  - "Digest ORM model + DigestService with rule-based aggregation + AI urgency scoring"
  - "RiskAlertService with Claude Opus 4.6 deep analysis and rule-based fallback"
  - "APScheduler: deadline reminders (30min), daily digest (07:00 AEST)"
  - "SES email sender for dual-channel delivery"
  - "API routes: notifications (3), digest (2), alerts (1)"
  - "Frontend: NotificationBell, NotificationDropdown, urgency badges in DigestCard"
affects: [04-02-PLAN, 04-03-PLAN]

# Tech tracking
tech-stack:
  added: [boto3, jinja2, tiktoken, pgvector/pgvector:pg16]
  patterns: [naive-utc-datetime, pushrecord-dedup, ai-with-rule-fallback, zustand-tanstack-sync]

key-files:
  created:
    - src/models/notification.py
    - src/models/digest.py
    - src/schemas/notification.py
    - src/schemas/digest.py
    - src/services/notification.py
    - src/services/digest.py
    - src/services/risk_alert.py
    - src/prompts/risk_analysis.py
    - src/prompts/digest.py
    - src/email/ses.py
    - src/email/templates/digest.html
    - src/web/routes/notifications.py
    - src/web/routes/digest.py
    - src/web/routes/alerts.py
    - alembic/versions/005_phase4_notifications_digest.py
    - frontend/components/notifications/NotificationBell.tsx
    - frontend/components/notifications/NotificationDropdown.tsx
    - frontend/lib/hooks/useNotifications.ts
    - frontend/lib/hooks/useDigest.ts
    - frontend/lib/stores/notifications.ts
  modified:
    - src/config.py
    - src/models/__init__.py
    - src/models/user.py
    - src/sync/engine.py
    - src/sync/tasks.py
    - src/web/routes/__init__.py
    - docker-compose.yml
    - pyproject.toml
    - frontend/lib/api/types.ts
    - frontend/lib/api/endpoints.ts
    - frontend/components/layout/Sidebar.tsx
    - frontend/components/digest/DigestCard.tsx
    - frontend/components/digest/DigestFeed.tsx

key-decisions:
  - "Naive datetimes (datetime.utcnow) for PushRecord pushed_at -- consistent with project-wide asyncpg TIMESTAMP WITHOUT TIME ZONE convention"
  - "pgvector extension creation wrapped in DO block for graceful fallback when container not yet rebuilt"
  - "Digest CronTrigger uses timezone='Australia/Sydney' for DST-correct 07:00 AEST scheduling"
  - "RiskAlertService factory functions kept in route files, not deps.py, for clean mypy typing"
  - "DigestFeed uses API digest when available, falls back to Phase 3 client-side aggregation"

patterns-established:
  - "AI-with-fallback: Try AsyncAnthropic call, catch Exception, use rule-based output"
  - "Notification dedup: SHA-256 hash of user_id|type|title checked via PushRecord"
  - "Zustand-TanStack sync: useUnreadCount hook updates Zustand store on API success"

requirements-completed: [DL-02, DL-03, INTEL-03, INTEL-04]

# Metrics
duration: 24min
completed: 2026-03-17
---

# Phase 4 Plan 01: Notification/Digest System Summary

**Deadline reminders at 72h/24h/3h tiers, GPA risk alerts with Claude Opus 4.6 deep analysis, daily AI-enhanced digest with urgency scoring (1-5), dual-channel delivery (in-app + SES email), and frontend notification bell/dropdown UI**

## Performance

- **Duration:** 24 min
- **Started:** 2026-03-17T03:08:39Z
- **Completed:** 2026-03-17T03:33:00Z
- **Tasks:** 2 (1 TDD backend, 1 frontend)
- **Files modified:** 40
- **Tests added:** 17 backend + 3 frontend notification tests

## Accomplishments

- Full notification system with PushRecord SHA-256 dedup preventing duplicate alerts
- RiskAlertService detects WAM gap >= 5 from target, invokes Claude Opus 4.6 for deep analysis with rule-based fallback
- DigestService collects grades/deadlines/posts from last 24h, enhances with AI urgency scoring (1-5) and summary generation
- APScheduler jobs: check_deadline_reminders every 30min, generate_daily_digests at 07:00 AEST (timezone-aware, DST-correct)
- 7 new API endpoints: GET/PATCH notifications, unread-count, digest latest/history, alerts
- Frontend: NotificationBell with unread badge in sidebar, NotificationDropdown with severity icons, DigestCard with AI urgency badges and AI summary

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests** - `aa8f41a` (test)
2. **Task 1 GREEN: Backend implementation** - `efb9da0` (feat)
3. **Task 2: Frontend notification UI** - `597c245` (feat)
4. **Migration fix: pgvector graceful fallback** - `05f1e6a` (fix)

## Files Created/Modified

### Backend (27 files)
- `src/models/notification.py` - Notification ORM with user_id, type, severity, title, body, is_read
- `src/models/digest.py` - Digest ORM with content_json, ai_summary, digest_date
- `src/schemas/notification.py` - NotificationResponse, UnreadCountResponse
- `src/schemas/digest.py` - DigestItemResponse, DigestResponse, RiskAlertResponse
- `src/services/notification.py` - NotificationService with SHA-256 PushRecord dedup
- `src/services/digest.py` - DigestService with rule-based + AI urgency scoring
- `src/services/risk_alert.py` - RiskAlertService with Claude Opus 4.6 deep analysis
- `src/prompts/risk_analysis.py` - GPA_RISK_ANALYSIS_SYSTEM_PROMPT
- `src/prompts/digest.py` - DIGEST_URGENCY_SYSTEM_PROMPT, DIGEST_SUMMARY_SYSTEM_PROMPT
- `src/email/ses.py` - SESEmailSender with async boto3 wrapper
- `src/email/templates/digest.html` - Responsive HTML email template
- `src/web/routes/notifications.py` - GET/PATCH notification endpoints
- `src/web/routes/digest.py` - GET digest latest/history
- `src/web/routes/alerts.py` - GET alerts
- `alembic/versions/005_phase4_notifications_digest.py` - Migration for notifications + digests tables

### Frontend (13 files)
- `frontend/components/notifications/NotificationBell.tsx` - Bell icon with unread badge
- `frontend/components/notifications/NotificationDropdown.tsx` - Dropdown list with severity icons
- `frontend/lib/hooks/useNotifications.ts` - TanStack Query hooks for notifications
- `frontend/lib/hooks/useDigest.ts` - TanStack Query hooks for digest/alerts
- `frontend/lib/stores/notifications.ts` - Zustand store for notification state
- `frontend/components/digest/DigestCard.tsx` - Enhanced with urgency badges and AI summary
- `frontend/components/digest/DigestFeed.tsx` - API digest with client-side fallback

## Decisions Made

1. **Naive datetimes for PushRecord** -- Used `datetime.utcnow()` for pushed_at field, consistent with project-wide asyncpg TIMESTAMP WITHOUT TIME ZONE convention (decision from Phase 2)
2. **pgvector graceful fallback** -- Wrapped `CREATE EXTENSION IF NOT EXISTS vector` in PL/pgSQL DO block so migration doesn't fail when running against non-pgvector container
3. **Australia/Sydney timezone** -- APScheduler CronTrigger uses `timezone="Australia/Sydney"` for DST-correct 07:00 AEST scheduling (not static UTC offset)
4. **Service factories in route files** -- Kept NotificationService/DigestService/RiskAlertService factory functions in their respective route files instead of deps.py for clean mypy typing
5. **DigestFeed dual-mode** -- Uses API digest when available (Phase 4), falls back to Phase 3 client-side aggregation when API returns 404

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Naive datetime for PushRecord pushed_at**
- **Found during:** Task 1 (NotificationService implementation)
- **Issue:** Used `datetime.now(UTC)` which produces timezone-aware datetime, incompatible with asyncpg TIMESTAMP WITHOUT TIME ZONE
- **Fix:** Changed to `datetime.utcnow()` matching project convention
- **Files modified:** src/services/notification.py, src/services/digest.py
- **Committed in:** efb9da0

**2. [Rule 3 - Blocking] pgvector extension not available in current container**
- **Found during:** Task 1 (migration test verification)
- **Issue:** `CREATE EXTENSION IF NOT EXISTS vector` failed because current Docker container is postgres:16-alpine (without pgvector)
- **Fix:** Wrapped in PL/pgSQL DO block with EXCEPTION handler for graceful fallback
- **Files modified:** alembic/versions/005_phase4_notifications_digest.py
- **Committed in:** 05f1e6a

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

External services require configuration for full functionality:
- **AWS SES**: Verify sender email in SES sandbox, set AWS_ACCESS_KEY_ID/SECRET_ACCESS_KEY
- **Anthropic API**: Set ANTHROPIC_API_KEY in .env for AI urgency scoring and GPA risk analysis
- **Docker**: Rebuild container with `docker compose down -v && docker compose up -d` to use pgvector/pgvector:pg16

## Next Phase Readiness

- Notification and digest infrastructure complete, ready for Plan 04-02 (content embedding + semantic search)
- pgvector extension will be available after Docker container rebuild
- AI prompts established for urgency scoring and risk analysis, patterns reusable for 04-02 and 04-03

## Self-Check: PASSED

All 22 created files verified present. All 4 commit hashes verified in git log.

---
*Phase: 04-intelligence-skills*
*Completed: 2026-03-17*
