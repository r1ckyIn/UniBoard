# Phase 17: Notifications & Digest — Context

## Phase Goal
Users receive timely deadline reminders and daily academic digests

## Requirements
- DL-02: Tiered deadline reminders at 72h, 24h, 3h before due date
- DL-03: GPA risk alert when grade trajectory deviates from target threshold
- INTEL-03: Daily digest aggregates new deadlines, grades, announcements, and high-value Ed posts (rule-based; AI scoring deferred to Phase 18)
- PLAT-04: Token expiration warnings when Canvas/Ed tokens are near expiry with re-auth guidance

## Success Criteria (what must be TRUE)
1. Tiered deadline reminders trigger at 72h, 24h, and 3h before due date
2. GPA risk alert fires when grade trajectory deviates from target threshold
3. Daily digest aggregates new deadlines, grades, announcements, and high-value Ed posts
4. Token expiration warnings display when Canvas/Ed tokens are near expiry with re-auth guidance

## Depends On
Phase 16 (Sync Engine) — completed 2026-03-27

## Key Context from Research

### ~80% Pre-Built
The codebase already contains:
- **Models**: Notification, PushRecord (SHA-256 dedup), Digest ORM models with Supabase tables
- **Services**: NotificationService, DigestService, RiskAlertService (all implemented)
- **Sync Tasks**: check_deadline_reminders (30-min interval), generate_daily_digests (07:00 AEST)
- **Routes**: GET/PATCH /notifications, GET /digest/latest|history, GET /alerts
- **Frontend hooks**: useNotifications, useAlerts, useDigestLatest, useDigestHistory

### Critical Bugs to Fix
1. **User→Profile migration in tests**: test_notification_service.py, test_digest_service.py, test_risk_alert_service.py all import old `User` model
2. **risk_alert.py line 95 bug**: References `user.ai_calls_today` but variable is `profile`
3. **GPA risk not auto-triggered**: RiskAlertService exists but no scheduler job runs it

### Gaps to Implement
1. **PLAT-04 Token expiry warnings**: No proactive check — only reactive on sync failure. Need health-check task + notification creation
2. **GPA risk auto-detection**: Wire RiskAlertService into post-grade-sync hook
3. **Missing unit tests**: check_deadline_reminders task, token health check

### Architecture Decisions (from research)
- Token health: Lightweight API ping (/api/v1/users/self for Canvas, Ed equivalent) every 30 min alongside reminder checker
- Risk alerts: Event-driven after grade sync, not periodic polling
- Email: Keep as fire-and-forget (SES), in-app notifications are primary channel
- No new dependencies needed — zero package additions

## Constraints
- Python 3.12+, FastAPI, SQLAlchemy 2.0 async, APScheduler
- Supabase PostgreSQL with RLS
- Rule-based digest only (AI scoring deferred to Phase 18)
- Must integrate with existing sync engine pattern
- Package manager: uv
- All tests must use Profile model (not User)
