---
id: SEED-002
status: dormant
planted: 2026-04-23
planted_during: v2.0 / Phase 38.2 executing
trigger_when: schema-drift-surfaces-as-bootstrap-or-autogenerate-bug
scope: Medium
---

# SEED-002: Resolve ORM-vs-DB parent-table drift on 5 user_id FKs

## The Drift

Five `user_id` foreign keys carry a silent ORM-vs-DB parent-table mismatch:

| Table | ORM declares | Supabase reality |
|-------|--------------|------------------|
| `courses.user_id` | `ForeignKey("profiles.id")` | `REFERENCES auth.users(id) ON DELETE CASCADE` |
| `digests.user_id` | `ForeignKey("profiles.id")` | `REFERENCES auth.users(id) ON DELETE CASCADE` |
| `notifications.user_id` | `ForeignKey("profiles.id")` | `REFERENCES auth.users(id) ON DELETE CASCADE` |
| `push_records.user_id` | `ForeignKey("profiles.id")` | `REFERENCES auth.users(id) ON DELETE CASCADE` |
| `whatif_scenarios.user_id` | `ForeignKey("profiles.id")` | `REFERENCES auth.users(id) ON DELETE CASCADE` |

## Why This Matters

Functionally invisible at runtime today because `profiles.id == auth.users.id`
is guaranteed by an insert trigger. But the drift is a latent footgun:

1. **SQLAlchemy `create_all()` / alembic autogenerate** emits FKs against
   `profiles(id)` — wrong parent. A future dev bootstrapping a fresh test DB
   from ORM metadata gets a schema that diverges from prod.
2. **PR #117 proved the cost of ignoring it**: a migration that looked
   correct-by-ORM-declaration would have silently re-parented 5 FKs and
   severed the Supabase auth-delete cascade chain. Code review caught it
   before merge, but the next such PR might not be so lucky.
3. **Reading the code lies.** A new contributor reading
   `src/models/courses.py` sees `ForeignKey("profiles.id")` and reasons about
   the cascade path through `profiles` — the wrong mental model.

## When to Surface

**Trigger:** next time schema drift causes a concrete incident or friction
point. Likely triggers to watch for:

- A test DB bootstrap fails because SA-generated schema doesn't match prod
- `alembic revision --autogenerate` emits a diff that tries to "fix" the
  wrong thing
- A new `user_id` FK gets added to a model and the pattern question "which
  parent do I cite?" comes up
- A Supabase schema audit / RLS policy review
- Any milestone that touches auth (SSO, social login, account deletion,
  GDPR right-to-delete), which will force the question anyway

This seed should be presented during `/gsd-new-milestone` when the scope
mentions: auth / accounts / user-deletion / schema cleanup / ORM hygiene.

## Scope Estimate

**Medium** — ~5 FK entries across 5 model files + 1 decision + 1 migration
(either direction). Real work is mostly in:

1. Making the directional decision (ORM → DB or DB → ORM — see below)
2. Writing + testing the alembic + Supabase migration (if DB direction)
3. Audit for any other FKs that might have the same issue beyond these 5

## Two Directions to Choose Between

### Option A: Migrate ORM to match DB (`auth.users`)
- Change 5 `ForeignKey("profiles.id")` → `ForeignKey("auth.users.id")` in models
- **Pro:** zero DB migration, zero runtime risk
- **Pro:** matches how Supabase-native projects typically model auth: `auth.users`
  is the identity root, `profiles` is a convenience mirror
- **Con:** SA needs to be told `auth` is a cross-schema reference (SA schema
  binding quirk)
- **Con:** ORM relationships that navigate `profile.<child>` still need `profiles`
  as the relationship target — separating FK parent from relationship endpoint

### Option B: Migrate DB to match ORM (`profiles`)
- Alembic + Supabase migration: `ALTER TABLE ... DROP CONSTRAINT ... ADD FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE`
- **Pro:** simpler ORM, no cross-schema awareness needed
- **Con:** severs the Supabase auth-delete cascade chain — if a user is
  deleted at the Supabase auth layer, their profile goes (via the existing
  `profiles.id → auth.users.id` FK on delete cascade) and then cascades into
  these 5 tables via `profiles.id`. Same end-state but one extra hop, and
  the cascade trigger no longer fires from `auth.users` deletions if the
  `profiles` row was deleted first for any other reason
- **Con:** migration on 5 FKs with data is non-trivial — need to verify no
  orphan `user_id` values exist before the ALTER

## Breadcrumbs

**ORM declarations** (the 5 drifted FKs):
- `src/models/course.py` — `user_id`
- `src/models/digest.py` — `user_id`
- `src/models/notification.py` — `user_id`
- `src/models/push_record.py` — `user_id`
- `src/models/whatif.py` — `user_id`

**Already pointing at `auth.users` via `profiles.id` path (fine, left alone):**
- `src/models/deadline_user_action.py`
- `src/models/study_recommendation_cache.py`

**Supabase truth:**
- `supabase/migrations/00000000000001_initial_schema.sql` — the source
  declaration for these 5 FKs, emitting `REFERENCES auth.users(id)`
- `supabase/migrations/00000000000002_rls_policies.sql` — RLS policies that
  also reason about `auth.uid()` as the subject, reinforcing that
  `auth.users` is the identity root in this codebase

**The PR that discovered this:**
- PR #117 (merged 2026-04-23 as `41eb39a`) — originally tried to land a
  migration that would have re-parented these 5 FKs. Code review caught it.
  See `.planning/quick/260423-gir-*/260423-gir-SUMMARY.md` for the pivot
  narrative.

**Related hardening in flight:**
- PR #115 `_CASCADE_LOAD_OPTIONS` (selectinload before `session.delete`) —
  symptom fix for MissingGreenlet on async delete. Coupled to SEED-003
  (not yet planted) which proposes `passive_deletes=True` as the real fix.

## Notes

When this seed surfaces, check whether SEED-003 (passive_deletes cleanup)
has been planted — they share the same underlying theme ("make ORM match
DB reality") and may be worth bundling into one FK-hygiene phase.

Option A is likely the right answer because the rest of the Supabase-native
ecosystem (RLS policies, auth triggers, `auth.uid()` checks) already treats
`auth.users` as the identity root. Going Option B would fight the grain of
the platform. But this is a decision to confirm at surface time, not
pre-commit now.
