---
phase: 13-supabase-foundation
plan: 01
subsystem: database
tags: [supabase, postgresql, rls, migration, pgvector, auth]

# Dependency graph
requires:
  - phase: none
    provides: "SQLAlchemy models define table structure (src/models/)"
provides:
  - "Supabase local dev environment (supabase start)"
  - "15 application tables via SQL migration"
  - "RLS policies for per-user data isolation on all tables"
  - "Auto-profile creation trigger on auth.users INSERT"
  - "pgvector extension for content_embeddings"
  - "updated_at auto-trigger on all tables"
affects: [13-02, 13-03, 14-platform-adapters, 15-core-services, 16-sync-engine]

# Tech tracking
tech-stack:
  added: [supabase-cli]
  patterns: [supabase-cli-migration, rls-per-user-isolation, auth-users-fk, updated-at-trigger]

key-files:
  created:
    - supabase/config.toml
    - supabase/migrations/00000000000001_initial_schema.sql
    - supabase/migrations/00000000000002_rls_policies.sql
    - supabase/seed.sql
  modified:
    - .env.example
    - .gitignore

key-decisions:
  - "profiles table PK is auth.users(id) with ON DELETE CASCADE, not a separate UUID"
  - "RLS subquery join pattern for indirect tables (grades->courses->user_id) rather than denormalizing user_id"
  - "GENERATED ALWAYS AS STORED for tsvector columns matching SQLAlchemy Computed definitions"
  - "pgvector extension created in extensions schema for Supabase compatibility"

patterns-established:
  - "RLS direct pattern: (select auth.uid()) = user_id for tables with direct user_id"
  - "RLS subquery pattern: course_id IN (SELECT id FROM courses WHERE user_id = auth.uid()) for indirect tables"
  - "RLS deep join pattern: module_id IN (SELECT m.id FROM modules m JOIN courses c ON ... WHERE c.user_id = auth.uid())"
  - "handle_updated_at() trigger on every table for automatic timestamp management"
  - "handle_new_user() trigger on auth.users for automatic profile row creation"

requirements-completed: [INFRA-01]

# Metrics
duration: 15min
completed: 2026-03-26
---

# Phase 13 Plan 01: Supabase Schema & RLS Summary

**Supabase local stack with 15-table schema matching SQLAlchemy models, 60 RLS policies for per-user isolation, pgvector extension, and auto-profile creation trigger**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-26T02:50:59Z
- **Completed:** 2026-03-26T03:06:09Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Complete PostgreSQL schema with 15 application tables derived from existing SQLAlchemy ORM models
- RLS enabled on all tables with 60 policies (4 per table) enforcing per-user data isolation
- Auto-profile creation trigger that fires on Supabase Auth user registration
- pgvector extension (v0.8.0) installed for 1024-dimension content embeddings
- Full-text search via TSVECTOR GENERATED ALWAYS on discussion_threads, module_items, lessons
- Local Supabase stack running (DB port 54322, Auth port 54321, Studio port 54323)

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Supabase project and create complete schema migration** - `f228e3e` (feat)
2. **Task 2: Create RLS policies for per-user data isolation on all tables** - `be2c6e7` (feat)

## Files Created/Modified
- `supabase/config.toml` - Supabase local dev configuration (project_id=uniboard, auth port 54321, site_url localhost:3001)
- `supabase/migrations/00000000000001_initial_schema.sql` - 15 tables: profiles, courses, grades, unified_deadlines, discussion_threads, modules, module_items, lessons, slides, unit_outlines, digests, notifications, push_records, whatif_scenarios, content_embeddings
- `supabase/migrations/00000000000002_rls_policies.sql` - 60 RLS policies (SELECT/INSERT/UPDATE/DELETE x 15 tables) with optimized auth.uid() subquery pattern
- `supabase/seed.sql` - Development seed data placeholder with usage instructions
- `.env.example` - Added Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_JWT_SECRET, DATABASE_URL for Supabase)
- `.gitignore` - Added supabase/.temp/ exclusion

## Decisions Made
- profiles table uses auth.users(id) as PK directly (not a separate UUID) -- simplifies the trigger and aligns with Supabase Auth conventions
- RLS on indirect tables (grades, deadlines, etc.) uses subquery join through courses rather than denormalizing user_id onto every table -- keeps schema normalized and matches existing SQLAlchemy FK structure
- tsvector columns use GENERATED ALWAYS AS STORED (PostgreSQL 12+) matching the SQLAlchemy Computed(persisted=True) definitions
- pgvector extension created in `extensions` schema (Supabase convention) with `vector(1024)` for Voyage AI embeddings
- Supabase db_major_version left at 17 (CLI default) since local dev only; production Supabase version may differ

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `supabase db reset` exits with error code 1 due to "Error status 502: An invalid response was received from the upstream server" during container restart phase -- this is a known Supabase CLI race condition, not a migration error. Both migrations apply successfully before the restart. Verified by querying pg_tables and pg_policies directly.
- Initial Docker image download took ~4 minutes for first-time Supabase CLI usage (872MB analytics image)

## User Setup Required
None - local Supabase stack runs via Docker, no external service configuration needed.

## Next Phase Readiness
- Database schema ready for Plan 02 (FastAPI backend skeleton with Supabase JWT validation)
- Plan 03 (Frontend auth migration) can use the local Supabase Auth at localhost:54321
- All 15 tables with RLS policies provide the foundation for Phase 14-16 backend services

---
*Phase: 13-supabase-foundation*
*Completed: 2026-03-26*
