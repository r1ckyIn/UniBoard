---
phase: 33-token-lifecycle-onboarding
plan: 02
subsystem: [email, sync, services]
tags: [email-03, recall, ses, re-engagement, scheduler]
requires:
  - src/email/ses.py (existing SESEmailSender)
  - src/services/deadline.py (existing DeadlineService.get_deadlines)
  - src/models/user.py (profiles.recall_email_sent_at from Plan 33-01)
  - src/sync/scheduled.py (existing check_token_health PLAT-04 loop)
provides:
  - src/services/recall_email.py (RecallEmailService + should_send_recall_email)
  - src/email/templates/recall.html (branded HTML body)
  - src/email/templates/recall.txt (plaintext fallback body)
  - DeadlineService.list_upcoming(user_id, horizon_days, *, now) thin wrapper
  - SESEmailSender.send_html_email(..., text_body=None) optional plaintext kwarg
  - check_token_health(now=None) recall-email branch
affects:
  - Phase 17 in-app token notifications (still primary; recall is fallback only)
tech-stack:
  added: []
  patterns:
    - "Pure gating function (should_send_recall_email) with injected now param
       for deterministic tests -- avoids freezegun dependency"
    - "Python str.format-based email templates (no Jinja / no new dependency)"
    - "Isolated try/except for recall branch so SES failures cannot break the
       PLAT-04 in-app notification loop"
    - "Sentry phase=33 tag on recall-email failure for milestone-scoped triage"
key-files:
  created:
    - src/services/recall_email.py
    - src/email/templates/recall.html
    - src/email/templates/recall.txt
    - tests/unit/test_recall_email.py
  modified:
    - src/services/deadline.py
    - src/email/ses.py
    - src/sync/scheduled.py
    - tests/unit/test_token_health.py
decisions:
  - "SES (existing) over Resend -- research-corrected; zero new dependencies"
  - "str.format templates over Jinja -- dependency-light, 4 placeholders only"
  - "Pure function gating (should_send_recall_email) separates policy from IO
     so 6 gate-combinations can be tested without sessions/mocks"
  - "Injected now parameter on both DeadlineService.list_upcoming and
     check_token_health -- freezegun-free deterministic testing"
  - "Recall branch runs in its own session + try/except so a failed SES send
     cannot block the existing PLAT-04 notification path"
  - "Email comment in recall.html uses no literal curly braces -- doubled
     escaping is noted in a comment for future edits touching inline CSS"
metrics:
  duration: 15min
  completed: 2026-04-15
  tasks: 3
  files: 8
---

# Phase 33 Plan 02: Recall Email Service (EMAIL-03) Summary

One-liner: Adds `RecallEmailService` wired into `check_token_health()` that dispatches a branded HTML + plaintext recall email via the existing `SESEmailSender` for users with expired tokens who have been absent >=14 days from both the app and sync pipeline, rate-limited to once per 30 days via `profiles.recall_email_sent_at`.

## What Was Built

### Task 1: `DeadlineService.list_upcoming` wrapper (src/services/deadline.py)

Thin wrapper around the existing `get_deadlines(from_date, to_date, include_past)`: computes `to_date = now + timedelta(days=horizon_days)` and calls through. Accepts an optional keyword-only `now: datetime | None = None` so tests can pin time without `freezegun`. Default horizon is 14 days.

**Commit:** 6404102

### Task 2: RecallEmailService + templates + SES extension + 12 unit tests

1. **`src/email/ses.py`** — `SESEmailSender.send_html_email` gains an optional `text_body: str | None = None` keyword. When provided, the SES `Message.Body` includes a `Text` part alongside the `Html` part (multipart/alternative for better deliverability and plaintext clients). Backwards-compatible: existing callers pass zero/positional args unchanged.

2. **`src/email/templates/recall.html`** — Mirrors `supabase/templates/confirmation.html` visual vocabulary: UniBoard wordmark, #d97757 brand orange CTA, #faf9f5 cream background, inline-CSS table layout, 480px max width. Four `str.format` placeholders: `{display_name}`, `{deadline_count}`, `{deadline_line}`, `{deep_link}`. Contains `Reconnect UniBoard` CTA, `/setup?step=token` deep link, and a P.S. promoting Google OAuth migration. No literal curly braces in inline CSS -- a top-of-file comment documents the double-brace escaping rule for future edits.

3. **`src/email/templates/recall.txt`** — Same four placeholders, plain text, two short paragraphs + deep link on its own line.

4. **`src/services/recall_email.py`** — Two exports:

   - `should_send_recall_email(profile, last_sign_in_at, now) -> bool`: pure, no IO. Returns `True` iff all four gates open:
     - `canvas_token_status == "expired"` OR `ed_token_status == "expired"`
     - `last_sign_in_at is None or < now - 14d`
     - `profile.last_sync_at is None or < now - 14d`
     - `profile.recall_email_sent_at is None or < now - 30d`
   - `RecallEmailService(session, sender=None, app_base_url=None)`: composes `SESEmailSender` + `DeadlineService.list_upcoming(horizon_days=14, now=reference)` + raw-SQL `SELECT email FROM auth.users WHERE id=:uid`. On successful SES dispatch, issues `UPDATE profiles SET recall_email_sent_at=reference WHERE id=user_id`. On SES failure, reports to Sentry with `phase=33` tag and returns `False` without updating the profile. Subject line surfaces upcoming-deadline count when > 0, falls back to "reconnect when you're back" copy when 0.

5. **`tests/unit/test_recall_email.py`** — 12 tests:

   - Tests 1-6: pure gating function across all four gate dimensions
   - Tests 7-12: send path (subject composition with/without deadlines, profile timestamp update on success, no-update on failure, HTML + text bodies contain the deep link)

   Mocking approach: `SimpleNamespace` for the `auth.users` row, `patch.object` on `DeadlineService.list_upcoming` for deadline count injection, captured-list pattern on `session.execute` to inspect both the SELECT and the UPDATE statements.

**Commit:** 12ee5b0

### Task 3: Wire into check_token_health (src/sync/scheduled.py)

- Signature: `async def check_token_health(now: datetime | None = None) -> None`
- After the existing PLAT-04 notification loop completes per user, a new recall-branch runs in its own session and its own try/except:
  - `SELECT last_sign_in_at FROM auth.users WHERE id=:uid` via raw `text()`
  - `should_send_recall_email(profile, last_sign_in_at, reference)` → `RecallEmailService(session).send_recall(...)` → `session.commit()`
- Failures in the recall branch set `sentry_sdk.set_tag("phase", "33")` and log `recall_email_branch_failed`; they do NOT crash the scheduled job or the existing notification path.
- Five new tests appended to `tests/unit/test_token_health.py` (B-F) cover: not-absent skip, absent send, rate-limit skip, failure isolation, `now=` kwarg signature.

**Commit:** 4f2f5a0

## Verification Results

- `UNIBOARD_DISABLE_SYNC=true DEBUG=true uv run pytest tests/unit/test_recall_email.py tests/unit/test_token_health.py -x --timeout=120` — **20 passed**
- `uv run mypy --strict src/` — **Success: no issues found in 107 source files**
- `uv run ruff check src/ tests/unit/test_recall_email.py tests/unit/test_token_health.py` — **All checks passed!**
- `grep -c 'resend' pyproject.toml` — **0** (no Resend SDK added)
- Template rendering smoke test (`str.format` over both templates with a full context dict) — both render without `KeyError`, both output contain the deep link and expected copy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] HTML template comment used literal `{{` `}}` characters**

- **Found during:** Task 2 smoke-test of `str.format` rendering
- **Issue:** The top-of-file HTML comment originally contained the string `` ``{`` and ``}`` `` describing the escaping rule. Because the template is rendered via `str.format`, the unescaped `{` and `}` inside those markdown backticks caused `KeyError: '`` and ``'` at render time.
- **Fix:** Rewrote the comment to describe the rule using prose only, with zero literal braces; added guidance that future inline-CSS braces must be doubled.
- **Files modified:** src/email/templates/recall.html
- **Commit:** folded into 12ee5b0 (Task 2 commit)

**2. [Rule 3 - Blocking] Ruff SIM103 on `should_send_recall_email`**

- **Found during:** Task 2 `ruff check` after initial implementation
- **Issue:** `if (rate-limit condition): return False ; return True` flagged as SIM103 (could be inlined).
- **Fix:** Collapsed to `recently_sent = ...; return not recently_sent`.
- **Files modified:** src/services/recall_email.py
- **Commit:** folded into 12ee5b0 (Task 2 commit)

## Commits

| Task | Commit  | Summary |
| ---- | ------- | ------- |
| 1    | 6404102 | feat(33-02): add list_upcoming wrapper to DeadlineService |
| 2    | 12ee5b0 | feat(33-02): add RecallEmailService with SES + templates + 12 tests |
| 3    | 4f2f5a0 | feat(33-02): wire RecallEmailService into check_token_health |

## Acceptance Criteria Status

- [x] `async def list_upcoming(self, user_id, ...)` in `src/services/deadline.py`
- [x] `list_upcoming` accepts keyword-only `now: datetime | None = None`
- [x] `SESEmailSender.send_html_email` accepts optional `text_body` kwarg
- [x] `src/email/templates/recall.html` contains `Reconnect UniBoard` and the `{deep_link}` placeholder
- [x] `src/email/templates/recall.txt` contains `{deep_link}`
- [x] `src/services/recall_email.py` exports `RecallEmailService` and `should_send_recall_email`
- [x] All 12 unit tests in `tests/unit/test_recall_email.py` pass
- [x] `check_token_health` imports `RecallEmailService` + `should_send_recall_email`
- [x] `check_token_health` signature is `async def check_token_health(now: datetime | None = None) -> None`
- [x] All 5 new tests (B-F) in `tests/unit/test_token_health.py` pass (plus 3 pre-existing tests still green)
- [x] `mypy --strict src/` exits 0
- [x] `ruff check src/` exits 0
- [x] No `resend` dependency in pyproject.toml

## Known Stubs

None. The recall email is fully end-to-end: gating logic, subject composition, HTML + plaintext rendering, SES dispatch, profile timestamp stamp, Sentry-tagged failure reporting. The only unexercised path is the live SES send, which is an infrastructure concern (SES credentials + domain reputation) tracked in Phase 32's ongoing Mimecast deliverability work and acknowledged in the plan objective ("Mimecast quarantine risk is acknowledged — email is fallback, not primary").

## Success Criteria Contribution

- ROADMAP success criterion #1 (in-app first + 14-day recall email) — recall email path complete
- Fulfils requirement `EMAIL-03`

## Self-Check: PASSED

- Artifact `src/services/recall_email.py` — FOUND
- Artifact `src/email/templates/recall.html` — FOUND
- Artifact `src/email/templates/recall.txt` — FOUND
- Artifact `tests/unit/test_recall_email.py` — FOUND
- Artifact `src/services/deadline.py` — FOUND (modified, `async def list_upcoming` present)
- Artifact `src/email/ses.py` — FOUND (modified, `text_body` kwarg present)
- Artifact `src/sync/scheduled.py` — FOUND (modified, `RecallEmailService` imported)
- Artifact `tests/unit/test_token_health.py` — FOUND (modified, tests B-F present)
- Commit `6404102` — FOUND in git log
- Commit `12ee5b0` — FOUND in git log
- Commit `4f2f5a0` — FOUND in git log
