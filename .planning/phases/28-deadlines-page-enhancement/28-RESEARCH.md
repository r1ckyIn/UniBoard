# Phase 28: Deadlines Page Enhancement - Research

**Researched:** 2026-04-04
**Domain:** Frontend UX enhancement (React/Next.js) + Backend API extension (FastAPI/SQLAlchemy) + Database migration (Supabase)
**Confidence:** HIGH

## Summary

Phase 28 enhances the existing Deadlines page with five concrete features: (1) card redesign with prominent due time and three-dot action menu, (2) pinned deadlines with visual distinction and notification panel integration, (3) revised All/Week filter semantics, (4) overdue-but-submittable deadline highlighting, and (5) database-persisted user actions (pin/delete) that survive sync cycles.

The implementation spans three layers: a new `deadline_user_actions` database table with Supabase migration + RLS, two new FastAPI endpoints for CRUD operations on user actions, and frontend changes to DeadlineCard/DeadlinesPage/DeadlineTimelineView/NotificationPanel components plus new TanStack Query mutation hooks with optimistic updates. The existing codebase has well-established patterns for all required operations -- the challenge is integration coordination across layers, not technology discovery.

**Primary recommendation:** Implement bottom-up -- database migration first, then backend API endpoints, then frontend mutations and component redesign. Each layer is independently testable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Due time displayed on far right with enlarged font -- replace current urgency badge position with prominent time display
- **D-02:** Three-dot menu (MoreHorizontal icon) triggers a dropdown popover below the icon with "Pin to top" and "Delete" options. Click outside to dismiss. Dropdown is a simple div with absolute positioning, not a native `<dialog>`.
- **D-03:** Pinned deadlines use amber left-side stripe (#b08968) replacing the courseColor stripe, plus a small pin icon next to the title. Pinned cards sort to top of list within their time group.
- **D-04:** Overdue-but-submittable deadlines (past due, status != "completed") display with red border (border-color: #d97757 or similar warm red). Extend urgency.ts to add "overdue" level for daysRemaining < 0.
- **D-05:** "All" mode shows only incomplete + overdue-but-submittable deadlines (hide completed and past-due-not-submittable). This changes current behavior where "all" showed everything.
- **D-06:** "This Week" mode shows all statuses within 7-day window (including completed) -- this is the mode for reviewing weekly workload holistically.
- **D-07:** New `deadline_user_actions` table (user_id, deadline_id, action_type, created_at) -- separate from UnifiedDeadline to avoid sync engine overwriting user decisions. action_type enum: "pinned" | "deleted".
- **D-08:** Two new API endpoints: `POST /deadlines/{id}/actions` (body: {action: "pin"|"delete"}) and `DELETE /deadlines/{id}/actions/{action}` (unpin/undelete). Frontend uses optimistic updates via TanStack Query mutation + cache invalidation.
- **D-09:** Pinned deadlines appear at top of NotificationPanel's deadline_reminder section with a pin icon badge. Query filters pinned deadlines from deadline_user_actions table and merges with existing notification logic.

### Claude's Discretion
- Delete confirmation: Claude decides whether delete needs a confirmation step or is instant with undo toast
- Dropdown animation: Claude decides transition style (fade/slide)
- Overdue border style: Claude decides exact border width and whether to use solid or dashed for distinction from normal cards
- Pin/unpin toggle behavior in dropdown menu text ("Pin" vs "Unpin" based on current state)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DL-UX-01 | Deadline card redesign -- due time on far right with enlarged font; three-dot menu with delete/pin actions | D-01, D-02 locked decisions; DeadlineCard.tsx (193 lines) is the single component to modify; MoreHorizontal icon from lucide-react |
| DL-UX-02 | Pinned deadlines highlighted and prioritized in notification panel | D-03, D-09 decisions; amber #b08968 exists in project palette; NotificationPanel.tsx receives data as props |
| DL-UX-03 | All/This Week toggle -- "All" shows incomplete + overdue-submittable only; "This Week" shows all statuses | D-05, D-06 decisions; filter logic is in DeadlinesPage.tsx useMemo; status field exists on Deadline schema ("upcoming"|"submitted"|"overdue"|"completed") |
| DL-UX-04 | Overdue-but-submittable deadlines display with red border highlight | D-04 decision; urgency.ts extension needed; daysRemaining already computed via differenceInCalendarDays |
| DL-UX-05 | User actions (delete/pin) persisted in database, survive sync cycles and page refreshes | D-07, D-08 decisions; new table, new API endpoints, new mutation hooks |

</phase_requirements>

## Standard Stack

### Core (already in project -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | Frontend framework | Already installed |
| TanStack Query | v5 | Server state + optimistic mutations | Already used for all data hooks |
| Tailwind CSS | v4 | Styling | Already used everywhere |
| lucide-react | latest | Icons (MoreHorizontal, Pin) | Already the icon library |
| date-fns | latest | Date computation (differenceInCalendarDays) | Already used in urgency |
| FastAPI | latest | Backend REST API | Already the backend framework |
| SQLAlchemy 2.0 | async | ORM for new model | Already the ORM layer |
| Supabase CLI | latest | Database migration | Already used for all schema changes |

### No New Dependencies Required

This phase uses exclusively existing project dependencies. No `npm install` or `pip install` needed.

## Architecture Patterns

### Recommended Implementation Order
```
1. Database migration (Supabase SQL)
2. Backend model + service + routes
3. Frontend mutation hooks
4. Component redesign (DeadlineCard, urgency.ts, filters)
5. Notification panel integration
```

### Pattern 1: Separate User Actions Table (D-07)
**What:** A dedicated `deadline_user_actions` table instead of modifying `unified_deadlines`.
**When to use:** When user decisions must survive background sync cycles that rewrite source data.
**Why critical:** The sync engine runs `aggregate_and_dedup` periodically, which performs ON CONFLICT DO UPDATE on `unified_deadlines`. If pin/delete were columns on that table, sync would overwrite them.

**Table design:**
```sql
-- Source: CONTEXT.md D-07
CREATE TABLE deadline_user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deadline_id UUID NOT NULL REFERENCES unified_deadlines(id) ON DELETE CASCADE,
  action_type VARCHAR(10) NOT NULL CHECK (action_type IN ('pinned', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, deadline_id, action_type)
);
```

### Pattern 2: Optimistic Updates with TanStack Query (D-08)
**What:** Frontend immediately reflects pin/delete actions while the API call is in-flight.
**When to use:** For user actions where instant feedback is expected.
**Example (project-established pattern from use-sync.ts):**
```typescript
// Source: use-sync.ts pattern + TanStack Query v5 docs
export function useDeadlineAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { deadlineId: string; action: "pin" | "delete" }) =>
      api.post(`deadlines/${payload.deadlineId}/actions`, {
        json: { action: payload.action },
      }).json(),
    onMutate: async (payload) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: deadlineKeys.all });
      // Snapshot previous data
      const previous = queryClient.getQueryData(deadlineKeys.lists());
      // Optimistically update cache
      // ... (update logic depends on action type)
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(deadlineKeys.lists(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deadlineKeys.all });
    },
  });
}
```

### Pattern 3: Client-Side Filter Predicates (D-05, D-06)
**What:** Filter logic lives in `useMemo` inside `DeadlinesPage.tsx`, not in API query params.
**When to use:** When data set is small (typically < 100 deadlines per user) and instant switching is needed.
**Existing code (line 25-51 of DeadlinesPage.tsx):** Already uses this pattern. Modification adds status-based filtering.

### Pattern 4: Urgency Extension for "overdue" (D-04)
**What:** Add "overdue" level to `urgency.ts` type union and color map.
**How:** Extend `Urgency` type from `"urgent" | "soon" | "later"` to include `"overdue"`.
**Integration:** `getUrgency()` returns "overdue" when `daysRemaining < 0` AND deadline status is not "completed".

### Pattern 5: Dropdown Popover (D-02)
**What:** Simple absolute-positioned div, not `<dialog>`. Dismiss on click outside.
**Why:** Three-dot menus are simpler than dialogs. No focus trap needed.
**Implementation:** useState for open/close, useRef for click-outside detection via document addEventListener.

### Anti-Patterns to Avoid
- **Modifying `UnifiedDeadline` model for user actions:** Sync engine will overwrite. Use separate table.
- **Using `<dialog>` for dropdown menu:** Overkill. D-02 explicitly says "simple div with absolute positioning".
- **Fetching user actions as separate query:** Should be merged server-side in the deadline list endpoint to avoid waterfall.
- **Using `useEffect` for click-outside:** Use event delegation pattern with `document.addEventListener("mousedown")` in a custom hook or inline.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Click-outside detection | Custom DOM traversal | `useRef` + `document.addEventListener("mousedown")` pattern | Standard 10-line pattern, project has no external dropdown library |
| Optimistic cache updates | Manual state management | TanStack Query `useMutation` `onMutate`/`onError`/`onSettled` | Already the project pattern (use-sync.ts) |
| Date difference computation | Manual Date arithmetic | `differenceInCalendarDays` from date-fns | Already imported in DeadlineCard and DeadlinesPage |
| UUID generation | Custom ID generation | `gen_random_uuid()` in PostgreSQL | Matches all existing tables |

## Common Pitfalls

### Pitfall 1: Sync Engine Overwrites User Actions
**What goes wrong:** Adding `is_pinned` / `is_deleted` columns to `unified_deadlines` table, then sync engine's `ON CONFLICT DO UPDATE` resets them.
**Why it happens:** The `aggregate_and_dedup` method in `DeadlineService` uses `pg_insert().on_conflict_do_update()` which would overwrite custom columns.
**How to avoid:** D-07 decision -- use separate `deadline_user_actions` table. Never modify UnifiedDeadline for user preferences.
**Warning signs:** Pin/delete state disappearing after background sync runs.

### Pitfall 2: Filter Logic Status Mismatch
**What goes wrong:** "All" mode filtering relies on `status` field, but `status` is computed at route level (not stored in DB). The fixture deadlines have hardcoded status values.
**Why it happens:** `_compute_status_and_days()` in `deadlines.py` route derives status from `urgency` and `is_confirmed`. Frontend receives `status` as a string field in the Deadline schema: `"upcoming" | "submitted" | "overdue" | "completed"`.
**How to avoid:** Filter on the `status` field that the API already returns. The current backend route at line 43-55 computes status including "overdue" for past-due deadlines. Also handle the fixture route handler to return consistent status values.
**Warning signs:** Deadlines appearing/disappearing unexpectedly when switching filter modes.

### Pitfall 3: Optimistic Update Cache Key Mismatch
**What goes wrong:** Mutation updates the wrong query cache because key factory doesn't match.
**Why it happens:** `deadlineKeys.list(filters)` includes filter params. Optimistic update must target the correct key.
**How to avoid:** Use `queryClient.cancelQueries({ queryKey: deadlineKeys.all })` to cancel ALL deadline queries, then invalidate on settled.
**Warning signs:** UI doesn't reflect mutation immediately, or shows stale data after navigation.

### Pitfall 4: Click-Outside Closes During Three-Dot Click
**What goes wrong:** Clicking the three-dot button to open the menu also triggers the click-outside listener that was just registered, immediately closing it.
**Why it happens:** Event propagation -- the click event bubbles to the document listener.
**How to avoid:** Use `mousedown` (not `click`) for outside detection, or add the listener on the next tick via `setTimeout(() => document.addEventListener(...), 0)`.
**Warning signs:** Menu opens and immediately closes.

### Pitfall 5: RLS Policy Not Created for New Table
**What goes wrong:** Direct Supabase client access (if ever used) can read/write other users' actions.
**Why it happens:** Forgetting to add RLS policies for the new table.
**How to avoid:** Follow the pattern in `00000000000002_rls_policies.sql`. New table needs: `ALTER TABLE deadline_user_actions ENABLE ROW LEVEL SECURITY;` plus SELECT/INSERT/DELETE policies using `(select auth.uid()) = user_id`.
**Warning signs:** No immediate symptoms (Python backend bypasses RLS), but security gap exists.

### Pitfall 6: DeadlineCard onClick Interference with Dropdown
**What goes wrong:** Clicking the three-dot menu or dropdown items also triggers the card's expand/collapse toggle.
**Why it happens:** The existing `handleClick` in DeadlineCard listens on the entire card div.
**How to avoid:** Add `e.stopPropagation()` on the three-dot button and dropdown, or extend the existing `target.closest()` exclusion pattern (already excludes `[data-ai-input-row]` and `[data-mat-item]`).
**Warning signs:** Card expands/collapses when trying to pin or delete.

## Code Examples

### DeadlineCard Three-Dot Menu Structure
```tsx
// Pattern based on D-02 decision
// Simple div popover, not <dialog>
<div className="relative" data-actions-menu>
  <button
    onClick={(e) => {
      e.stopPropagation();
      setMenuOpen((prev) => !prev);
    }}
    className="p-1 rounded-md hover:bg-[#efede6] transition-colors"
    data-testid="deadline-menu-trigger"
  >
    <MoreHorizontal size={16} className="text-[#9b9b94]" />
  </button>

  {menuOpen && (
    <div
      className="absolute right-0 top-full mt-1 bg-white border border-[#e8e5dd] rounded-[8px] shadow-md z-10 py-1 min-w-[140px]"
      data-testid="deadline-menu-dropdown"
    >
      <button onClick={handlePin} className="...">
        {isPinned ? "Unpin" : "Pin to top"}
      </button>
      <button onClick={handleDelete} className="...text-red-600">
        Delete
      </button>
    </div>
  )}
</div>
```

### Urgency Extension for "overdue"
```typescript
// Extend existing urgency.ts
export type Urgency = "overdue" | "urgent" | "soon" | "later";

export function getUrgency(daysRemaining: number): Urgency {
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining <= 3) return "urgent";
  if (daysRemaining <= 7) return "soon";
  return "later";
}

export const URGENCY_COLORS: Record<Urgency, { dot: string; bg: string; soft: string }> = {
  overdue: {
    dot: "#d97757",
    bg: "rgba(217,119,87,.08)",
    soft: "rgba(217,119,87,.15)",
  },
  // ... existing entries
};
```

### Backend DeadlineUserAction Model
```python
# Source: project base model pattern (base.py)
class DeadlineUserAction(UUIDMixin, Base):
    """User-initiated actions (pin/delete) on deadlines, separate from sync."""
    __tablename__ = "deadline_user_actions"
    __table_args__ = (
        Index("ix_user_actions_user_deadline", "user_id", "deadline_id"),
        UniqueConstraint("user_id", "deadline_id", "action_type"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id"))
    deadline_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("unified_deadlines.id"))
    action_type: Mapped[str] = mapped_column(String(10))  # "pinned" | "deleted"
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

### Filter Logic Changes (D-05, D-06)
```typescript
// Modified filter in DeadlinesPage.tsx useMemo
// "all" mode: incomplete + overdue-submittable only
if (filterMode === "all") {
  result = result.filter((dl) => {
    // Hide completed and past-due-not-submittable
    return dl.status === "upcoming" || dl.status === "overdue" || dl.status === "submitted";
  });
  // Also exclude user-deleted deadlines
  result = result.filter((dl) => !deletedIds.has(dl.id));
}

if (filterMode === "week") {
  // Show ALL statuses within 7-day window (including completed)
  result = result.filter((dl) => {
    const days = differenceInCalendarDays(new Date(dl.due_date), now);
    return days >= -7 && days <= 7; // Include recent past for review
  });
  // Still exclude user-deleted
  result = result.filter((dl) => !deletedIds.has(dl.id));
}
```

### API Endpoint Pattern
```python
# Matches existing route pattern in deadlines.py
@router.post("/{deadline_id}/actions")
async def create_deadline_action(
    deadline_id: uuid.UUID,
    body: DeadlineActionCreate,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: DeadlineService = Depends(get_deadline_service),
) -> SuccessResponse[DeadlineActionResponse]:
    """Pin or soft-delete a deadline for the current user."""
    ...

@router.delete("/{deadline_id}/actions/{action}")
async def remove_deadline_action(
    deadline_id: uuid.UUID,
    action: str,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: DeadlineService = Depends(get_deadline_service),
) -> SuccessResponse[None]:
    """Remove a pin or undelete a deadline for the current user."""
    ...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| urgency: 3 levels | urgency: 4 levels (+ "overdue") | This phase | DeadlineCard and timeline dot color both need updating |
| "All" mode: shows everything | "All" mode: shows incomplete only | This phase | Filter predicate change in DeadlinesPage.tsx |
| No user actions on deadlines | Pin/delete with DB persistence | This phase | New table, endpoints, hooks, and UI |
| Card layout: title + badge | Card layout: title + time + menu | This phase | DeadlineCard.tsx restructured |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest + @testing-library/react |
| Framework (backend) | pytest + pytest-asyncio |
| Frontend config | `frontend/vitest.config.ts` |
| Backend config | `pytest.ini` or `pyproject.toml` |
| Frontend quick run | `cd frontend && npx vitest run __tests__/deadlines/` |
| Backend quick run | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && python -m pytest tests/unit/test_deadline_service.py -x` |
| Frontend full suite | `cd frontend && npx vitest run` |
| Backend full suite | `python -m pytest tests/ -x` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DL-UX-01 | Card shows due time + three-dot menu | unit (component) | `cd frontend && npx vitest run __tests__/deadlines/DeadlineCard.test.tsx -x` | Exists (needs update) |
| DL-UX-02 | Pinned deadlines in notification panel | unit (component) | `cd frontend && npx vitest run __tests__/deadlines/DeadlineCard.test.tsx -x` | Exists (needs pin tests) |
| DL-UX-03 | All/Week filter modes | unit (component) | `cd frontend && npx vitest run __tests__/deadlines/DeadlinesPage.test.tsx -x` | Exists (needs filter update) |
| DL-UX-04 | Overdue red border | unit (lib) | `cd frontend && npx vitest run __tests__/deadlines/DeadlineCard.test.tsx -x` | Exists (needs overdue test) |
| DL-UX-05 | User action persistence | unit (backend) | `python -m pytest tests/unit/test_deadline_user_actions.py -x` | Wave 0 |
| DL-UX-05 | User action API endpoints | integration | `python -m pytest tests/integration/test_deadline_action_routes.py -x` | Wave 0 |
| DL-UX-05 | Mutation hooks | unit (frontend) | `cd frontend && npx vitest run __tests__/deadlines/useDeadlineActions.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run __tests__/deadlines/` (frontend) or `python -m pytest tests/unit/test_deadline_service.py -x` (backend)
- **Per wave merge:** Full frontend + backend test suites
- **Phase gate:** All suites green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_deadline_user_actions.py` -- covers DL-UX-05 backend service
- [ ] `tests/integration/test_deadline_action_routes.py` -- covers DL-UX-05 API contract
- [ ] `frontend/__tests__/deadlines/useDeadlineActions.test.tsx` -- covers DL-UX-05 mutation hooks
- [ ] Update `frontend/__tests__/deadlines/DeadlineCard.test.tsx` -- add three-dot menu, pin visual, overdue border tests
- [ ] Update `frontend/__tests__/deadlines/DeadlinesPage.test.tsx` -- update filter mode assertions for new semantics
- [ ] `frontend/lib/fixtures/deadlines.ts` -- add fixture entries with overdue + pinned states

## Open Questions

1. **Backend: Should user actions be returned inline with the deadline list or as a separate query?**
   - What we know: D-08 says two separate action endpoints. The frontend needs pin/delete state per deadline.
   - What's unclear: Whether the existing `GET /deadlines` endpoint should be modified to include user_action data (pinned/deleted) as additional fields, or if the frontend should make two parallel queries.
   - Recommendation: Modify the existing `GET /deadlines` endpoint to LEFT JOIN `deadline_user_actions` and include `is_pinned` / `is_deleted` boolean fields in the response. This avoids a waterfall request pattern. The fixture route handler can simulate this with local state or localStorage.

2. **Fixture layer: How to simulate persistence for pin/delete in Route Handler mock?**
   - What we know: All data currently comes from static fixture files. Route Handlers are mock endpoints.
   - What's unclear: Whether to use in-memory module-scoped state or localStorage for mock persistence.
   - Recommendation: Use a module-scoped `Map<string, Set<string>>` in the fixture helpers to track actions per deadline. This persists across page navigations within a dev session but resets on server restart, which is acceptable for development.

## Project Constraints (from CLAUDE.md)

- **Code comments:** Must be in pure English only
- **Language:** Technical discussion in Chinese, code in English
- **Commit messages:** Conventional commits format with phase scope: `feat(28-XX): description`
- **Testing:** pytest + pytest-asyncio for backend, Vitest for frontend
- **Type checking:** mypy --strict for Python, tsc --noEmit for TypeScript
- **Lint:** ruff for Python, ESLint for frontend
- **Package manager:** uv (backend), pnpm 9+ (frontend)
- **i18n:** next-intl with en.json + zh.json message files
- **No force push, no direct commit to main**
- **Security:** No hardcoded secrets, validate external input

## Sources

### Primary (HIGH confidence)
- Codebase inspection of all 15+ files listed in CONTEXT.md canonical_refs
- Existing test files: `__tests__/deadlines/DeadlineCard.test.tsx`, `__tests__/deadlines/DeadlinesPage.test.tsx`
- Existing backend: `src/services/deadline.py`, `src/web/routes/deadlines.py`, `src/models/deadline.py`
- Supabase migrations: `supabase/migrations/00000000000001_initial_schema.sql`, `00000000000002_rls_policies.sql`
- Frontend hooks pattern: `hooks/use-deadlines.ts`, `hooks/use-sync.ts`, `hooks/use-feedback.ts`

### Secondary (MEDIUM confidence)
- TanStack Query v5 optimistic update pattern -- verified against existing `use-sync.ts` implementation

### Tertiary (LOW confidence)
- None -- all findings based on direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing project libraries
- Architecture: HIGH -- patterns directly observed in codebase (separate table, optimistic updates, client-side filtering)
- Pitfalls: HIGH -- derived from actual code analysis (sync engine ON CONFLICT, click propagation, RLS patterns)
- Code examples: HIGH -- based on existing project code with minimal modifications

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable -- no external dependency changes)
