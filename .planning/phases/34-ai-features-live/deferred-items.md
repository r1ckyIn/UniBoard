# Phase 34 Deferred Items

This file tracks work deferred out of scope from within-worktree executor agents.
Items here are resolved by the human operator (via the orchestrator) after the
parallel worktree executors return.

---

## 34-01 Task 3 [BLOCKING] -- supabase db push

**Deferred:** 2026-04-17
**Gate type:** human-action (authentication + schema-push gate)
**Why deferred:** Worktree executor cannot apply the migration:
1. `SUPABASE_ACCESS_TOKEN` is not set in the worktree shell environment.
2. Project-specific note in the executor prompt explicitly forbids
   `supabase db push` from inside a worktree (would mutate live prod DB
   under a branch other than main).
3. Schema push is a user-owned gate per GSD `gate-schema-push` convention.

**What was completed in 34-01:**
- Migration file authored and committed (188d09b): `supabase/migrations/00000000000008_phase34_ai_features.sql`
- ORM models + Pydantic schemas + route handler wired (018bc99)
- mypy --strict + ruff clean on all modified files

**What the human operator needs to do before Wave 2/3 plans (34-02, 34-03, 34-04) execute:**

```bash
# 1. Ensure SUPABASE_ACCESS_TOKEN is in your shell env
export SUPABASE_ACCESS_TOKEN=sbp_...      # from Supabase Studio -> Account -> Access Tokens

# 2. Apply the migration to Supabase (local or prod)
supabase db push

# 3. Verify schema mutated (all 3 should succeed):
supabase db psql -c "SELECT to_regclass('public.study_recommendation_cache')" | grep study_recommendation_cache
supabase db psql -c "SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='remaining_credit_points'" | grep remaining_credit_points
supabase db psql -c "SELECT column_name FROM information_schema.columns WHERE table_name='courses' AND column_name='content_hash'" | grep content_hash

# 4. Verify 4 RLS policies live on the new table
supabase db psql -c "SELECT count(*) FROM pg_policies WHERE tablename='study_recommendation_cache'"
```

**Blocking downstream plans:**
- Plan 34-02 (study rec service) -- reads/writes `study_recommendation_cache`
- Plan 34-03 (path planner) -- reads `profiles.remaining_credit_points`
- Plan 34-04 (embedding worker) -- reads/writes `courses.last_qa_access_at`, `embedded_at`, `content_hash`

Wave 2 should NOT start until these DB verifications pass.
