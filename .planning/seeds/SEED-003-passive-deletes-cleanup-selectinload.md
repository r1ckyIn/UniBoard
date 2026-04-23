---
id: SEED-003
status: dormant
planted: 2026-04-23
planted_during: v2.0 / Phase 38.2 executing
trigger_when: fk-hygiene-milestone-or-missinggreenlet-incident
scope: Small
---

# SEED-003: `passive_deletes=True` + remove `_CASCADE_LOAD_OPTIONS` selectinload

## The Current Patchwork

PR #115 added a module-level `_CASCADE_LOAD_OPTIONS` tuple in
`src/sync/courses.py` with 6 `selectinload()` options (including 2 nested
loads for `Module.items` and `Lesson.slides`), applied to every SELECT
whose rows feed `session.delete(course)`. That was the correct symptom
fix in-scope at the time: AsyncSession cannot lazy-load mid-flush, and
`Course`'s `cascade="all, delete-orphan"` relationships need their
children materialised before delete processing, or SQLAlchemy raises
`MissingGreenlet`.

PR #117 then aligned ORM declarations: every `ForeignKey(...)` to a
cascade parent now carries `ondelete="CASCADE"`. Supabase has had
DB-level `ON DELETE CASCADE` all along. So at the DB layer, deleting a
Course needs zero ORM help — Postgres will cascade grades, modules,
lessons, deadlines, outlines, and threads by itself.

The missing piece: SQLAlchemy doesn't know that. By default,
`cascade="all, delete-orphan"` makes SA manage the cascade in Python
(load children, orphan-check them, DELETE them individually). It issues
N+1 DELETEs instead of letting one DDL-level cascade handle everything.
And in async mode, "load children" means "lazy-load them," which means
`MissingGreenlet` without the `selectinload` workaround.

## The Real Fix

Add `passive_deletes=True` to every cascade relationship:

```python
# src/models/course.py
grades: Mapped[list[Grade]] = relationship(
    back_populates="course",
    cascade="all, delete-orphan",
    passive_deletes=True,               # <-- trust DB cascade
)
```

Effects:
1. **SA stops loading children before delete.** No more MissingGreenlet
   risk on `session.delete(course)`.
2. **`_CASCADE_LOAD_OPTIONS` becomes truly redundant.** Delete the tuple,
   restore the plain `select(Course).where(...)` form in the two call
   sites that currently carry `.options(*_CASCADE_LOAD_OPTIONS)`.
3. **Fewer SQL round-trips on delete.** One `DELETE FROM courses` +
   Postgres cascade, versus N+1 `DELETE FROM <child>` + `DELETE FROM courses`.
4. **ORM orphan-detection still works** for relationship mutations that
   are *not* deletions (reassigning a child to a different parent, etc.)
   because `passive_deletes` only affects the delete-orphan path.

## When to Surface

**Trigger:** any of these:

- A `MissingGreenlet` incident in a code path that calls
  `session.delete()` where the caller forgot to add `_CASCADE_LOAD_OPTIONS`
  to their SELECT
- SEED-002 gets picked up — both seeds belong to the same ORM-DB
  alignment hygiene theme, bundle into one phase
- A refactor that adds a new `cascade="all, delete-orphan"` relationship
  elsewhere in the codebase (the pattern should enforce `passive_deletes=True`
  as the house style; changing the existing ones makes the new ones
  easier to justify)
- Performance review of sync paths — the N+1 DELETE shape is a
  low-intensity smell worth cleaning up

## Scope Estimate

**Small** — a few hours total:

| Piece | Effort |
|-------|--------|
| Add `passive_deletes=True` to 6 relationships in `src/models/course.py` | ~5 min |
| Propagate to nested cascade relationships (`Module.items`, `Lesson.slides`) | ~5 min |
| Audit `src/models/user.py` for the same pattern on `Profile.courses` etc. | ~10 min |
| Delete `_CASCADE_LOAD_OPTIONS` tuple + 2 `.options(*_CASCADE_LOAD_OPTIONS)` call sites in `src/sync/courses.py` | ~5 min |
| Update / simplify `tests/unit/test_upsert_courses_merge.py` if the fake session reference needs touching | ~10 min |
| Verify: ruff, mypy, pytest sync face, smoke test a `session.delete(course)` path | ~20 min |

## Breadcrumbs

**The selectinload that gets retired:**
- `src/sync/courses.py` — `_CASCADE_LOAD_OPTIONS` tuple definition near the
  top of the module, applied at the candidates query and the stale_rows
  query (see "Purge pre-#113 zombie rows" comment block)

**Every relationship that needs `passive_deletes=True`:**
- `src/models/course.py` — grades, modules, lessons, unified_deadlines,
  unit_outlines, discussion_threads (6 cascades)
- `src/models/module.py` — items (1 nested cascade)
- `src/models/lesson.py` — slides (1 nested cascade)
- `src/models/user.py` — Profile's child collections (if any declare
  `cascade="all, delete-orphan"` — audit at surface time)

**Proof that DB cascade is already authoritative:**
- `supabase/migrations/00000000000001_initial_schema.sql` — every child
  FK has `ON DELETE CASCADE` (see PR #117 SUMMARY.md for the audit:
  `grep -rn 'REFERENCES' | grep -v 'ON DELETE CASCADE'` returns zero)
- `src/models/*.py` after PR #117 — every `ForeignKey(...)` to a cascade
  parent carries `ondelete="CASCADE"`

**Historical context:**
- PR #115 (merged as `21b487d`) — introduced `_CASCADE_LOAD_OPTIONS` as a
  scope-appropriate symptom fix. The follow-up note in that PR's SUMMARY.md
  already flagged this seed's direction.
- PR #117 (merged as `41eb39a`) — aligned ORM cascade declarations with
  Supabase reality. SUMMARY.md calls out the `passive_deletes` cleanup as
  "worth removing in a small follow-up PR for clarity, but not urgent."

## Notes

When this surfaces, verify upfront that `cascade="save-update, merge"`
(the non-delete-orphan parts of `cascade="all"`) still works as intended
with `passive_deletes=True`. SA docs are explicit that `passive_deletes`
only affects the delete-orphan behavior, not the other cascade kinds —
but a quick integration test on one mutation path (e.g., reassigning a
Lesson to a different Course) makes the assumption concrete.

Bundle with SEED-002 if it's also dormant at trigger time — both are
"make ORM match DB reality," shipping them as one `fk-hygiene` phase
gives reviewers one coherent story instead of two fragments.
