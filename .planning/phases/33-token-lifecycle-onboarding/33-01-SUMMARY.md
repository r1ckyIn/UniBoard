---
phase: 33-token-lifecycle-onboarding
plan: 01
subsystem: [supabase, models]
tags: [schema, migration, oauth, email, auth-harden, email-03, auth-harden-01]
requires:
  - supabase/migrations/00000000000001_initial_schema.sql (profiles table, handle_new_user trigger)
  - src/models/user.py (existing Profile ORM model)
provides:
  - profiles.recall_email_sent_at column (sent-once guard for re-engagement emails)
  - handle_new_user() trigger that populates display_name from Google OAuth metadata
  - Profile.recall_email_sent_at Mapped[datetime | None] on ORM model
affects:
  - Plan 33-02 (recall email service) -- can now enforce 30-day re-send cap
  - Plan 33-04 (Google OAuth onboarding) -- new signups get a usable display_name
tech-stack:
  added: []
  patterns:
    - "CREATE OR REPLACE FUNCTION to patch existing trigger body (no re-create of trigger needed)"
    - "COALESCE chain for multi-source OAuth metadata fallback (display_name -> full_name -> name -> '')"
key-files:
  created:
    - supabase/migrations/00000000000007_recall_email_and_oauth_profile.sql
  modified:
    - src/models/user.py
decisions:
  - "No index on recall_email_sent_at (per 33-RESEARCH Q4, <10k users does not justify a partial index)"
  - "recall_email_sent_at NOT exposed in any src/web/schemas/ Pydantic model (internal-only per plan)"
  - "Use CREATE OR REPLACE FUNCTION alone -- existing trigger on_auth_user_created picks up new body"
metrics:
  duration: 2min
  completed: 2026-04-15
  tasks: 2
  files: 2
---

# Phase 33 Plan 01: Recall Email Column + OAuth Profile Trigger Summary

One-liner: Adds `profiles.recall_email_sent_at` (EMAIL-03 guard) and patches `handle_new_user()` to populate `display_name` from Google OAuth `full_name`/`name` metadata (AUTH-HARDEN-01), plus updates the `Profile` SQLAlchemy model to match.

## What Was Built

### Task 1: Migration 00000000000007_recall_email_and_oauth_profile.sql

New Supabase migration with two operations:

1. `ALTER TABLE public.profiles ADD COLUMN recall_email_sent_at TIMESTAMPTZ` (nullable, no default, no index) with `COMMENT ON COLUMN` explaining its role as a re-send guard.
2. `CREATE OR REPLACE FUNCTION public.handle_new_user()` with an extended COALESCE chain:

   ```sql
   COALESCE(
     NEW.raw_user_meta_data->>'display_name',
     NEW.raw_user_meta_data->>'full_name',
     NEW.raw_user_meta_data->>'name',
     ''
   )
   ```

No changes to `CREATE TRIGGER on_auth_user_created` — function replacement is in-place.

### Task 2: Profile ORM model (src/models/user.py)

Added `recall_email_sent_at: Mapped[datetime | None]` after the existing `last_sync_at` column, typed as `DateTime(timezone=True)`, `nullable=True`, `default=None`, with a `comment=` that mirrors the SQL `COMMENT ON COLUMN`. No new imports required.

## Verification Results

- `test -f supabase/migrations/00000000000007_recall_email_and_oauth_profile.sql` — passes
- `grep -q 'recall_email_sent_at TIMESTAMPTZ' ...` — passes
- `grep -q "raw_user_meta_data->>'full_name'" ...` — passes
- `grep -q 'CREATE OR REPLACE FUNCTION public.handle_new_user' ...` — passes
- `uv run mypy --strict src/` — Success: no issues found in 106 source files
- `uv run ruff check src/` — All checks passed!
- `grep -r recall_email_sent_at src/web/schemas/` — no matches (field not leaked to API)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ruff E501 line-too-long on comment=**

- **Found during:** Task 2 verification (`ruff check src/models/user.py`)
- **Issue:** The `comment="..."` argument exceeded the project's 100-column limit (line was 157 chars).
- **Fix:** Wrapped the comment string in parentheses across three lines so the text stays identical semantically but lines stay under 100 chars.
- **Files modified:** src/models/user.py
- **Commit:** fca0c1a (included in the Task 2 commit, not a separate commit)

## Commits

| Task | Commit  | Summary |
| ---- | ------- | ------- |
| 1    | 519fe51 | feat(33-01): add migration 00000000000007 for recall_email_sent_at and OAuth profile |
| 2    | fca0c1a | feat(33-01): add recall_email_sent_at field to Profile ORM model |

## Known Stubs

None. No placeholder values, mock data sources, or unwired UI components are introduced by this plan. The column is intentionally unconsumed at this point — Plans 33-02 and 33-04 will wire it.

## Acceptance Criteria Status

- [x] File exists at `supabase/migrations/00000000000007_recall_email_and_oauth_profile.sql`
- [x] Contains `ALTER TABLE public.profiles ADD COLUMN recall_email_sent_at TIMESTAMPTZ`
- [x] Contains `CREATE OR REPLACE FUNCTION public.handle_new_user()`
- [x] Trigger body contains both `'display_name'` and `'full_name'` references inside a COALESCE
- [x] No NOT NULL constraint on recall_email_sent_at (nullable)
- [x] No index creation statement (intentional)
- [x] `src/models/user.py` contains `recall_email_sent_at: Mapped[datetime | None]`
- [x] Column uses `DateTime(timezone=True)` (timezone-aware)
- [x] `mypy --strict src/models/user.py` exits 0
- [x] Field NOT exposed in any Pydantic schema under `src/web/schemas/`

## Success Criteria Contribution

- ROADMAP success criteria #1 — recall email scaffolding (schema column added)
- ROADMAP success criteria #4 — Google OAuth profile creation (trigger populates display_name)

## Self-Check: PASSED

- Artifact `supabase/migrations/00000000000007_recall_email_and_oauth_profile.sql` — FOUND
- Artifact `src/models/user.py` — FOUND (modified)
- Commit `519fe51` — FOUND in git log
- Commit `fca0c1a` — FOUND in git log
