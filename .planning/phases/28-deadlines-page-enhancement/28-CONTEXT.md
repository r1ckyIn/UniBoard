# Phase 28: Deadlines Page Enhancement - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance the Deadlines page with card redesign (due time prominence, three-dot menu with delete/pin), filtering logic changes (All/Week mode semantics), overdue highlighting, and user action persistence in the database. Five success criteria from ROADMAP.md.

</domain>

<decisions>
## Implementation Decisions

### Card Redesign (D-01, D-02)
- **D-01:** Due time displayed on far right with enlarged font — replace current urgency badge position with prominent time display
- **D-02:** Three-dot menu (MoreHorizontal icon) triggers a dropdown popover below the icon with "Pin to top" and "Delete" options. Click outside to dismiss. Dropdown is a simple div with absolute positioning, not a native `<dialog>`.

### Pinned State Visual (D-03)
- **D-03:** Pinned deadlines use amber left-side stripe (#b08968) replacing the courseColor stripe, plus a small pin icon (📌) next to the title. Pinned cards sort to top of list within their time group.

### Overdue Highlighting (D-04)
- **D-04:** Overdue-but-submittable deadlines (past due, status != "completed") display with red border (border-color: #d97757 or similar warm red). Extend urgency.ts to add "overdue" level for daysRemaining < 0.

### Filter Logic Changes (D-05, D-06)
- **D-05:** "All" mode shows only incomplete + overdue-but-submittable deadlines (hide completed and past-due-not-submittable). This changes current behavior where "all" showed everything.
- **D-06:** "This Week" mode shows all statuses within 7-day window (including completed) — this is the mode for reviewing weekly workload holistically.

### Persistence Strategy (D-07, D-08)
- **D-07:** New `deadline_user_actions` table (user_id, deadline_id, action_type, created_at) — separate from UnifiedDeadline to avoid sync engine overwriting user decisions. action_type enum: "pinned" | "deleted".
- **D-08:** Two new API endpoints: `POST /deadlines/{id}/actions` (body: {action: "pin"|"delete"}) and `DELETE /deadlines/{id}/actions/{action}` (unpin/undelete). Frontend uses optimistic updates via TanStack Query mutation + cache invalidation.

### Notification Panel Integration (D-09)
- **D-09:** Pinned deadlines appear at top of NotificationPanel's deadline_reminder section with a pin icon badge. Query filters pinned deadlines from deadline_user_actions table and merges with existing notification logic.

### Claude's Discretion
- Delete confirmation: Claude decides whether delete needs a confirmation step or is instant with undo toast
- Dropdown animation: Claude decides transition style (fade/slide)
- Overdue border style: Claude decides exact border width and whether to use solid or dashed for distinction from normal cards
- Pin/unpin toggle behavior in dropdown menu text ("Pin" vs "Unpin" based on current state)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` lines 148-154 — DL-UX-01 through DL-UX-05 requirement definitions
- `docs/UniBoard_TRD_v2.md` §4 — Data model (for new table design context)
- `docs/UniBoard_TRD_v2.md` §12 — REST API spec (for new endpoint conventions)

### Design
- `docs/frontend_brief.md` — Design system (Anthropic-inspired warm palette, Rough.js borders)
- `prototype/deadline.html` — Original deadline page prototype

### Existing Components (must read before modifying)
- `frontend/components/deadlines/DeadlineCard.tsx` — Current card component to redesign
- `frontend/components/deadlines/DeadlinesPage.tsx` — Filter state management
- `frontend/components/deadlines/DeadlineTitleRow.tsx` — All/Week toggle (already exists)
- `frontend/components/deadlines/DeadlineTimelineView.tsx` — Timeline rendering with RoughDot
- `frontend/lib/deadlines/urgency.ts` — Urgency classification (needs "overdue" level)
- `frontend/hooks/use-deadlines.ts` — TanStack Query hooks (add mutation hooks)
- `frontend/components/layout/NotificationPanel.tsx` — Notification display (pin integration)

### Backend Models
- `src/models/deadline.py` — UnifiedDeadline ORM model (do NOT modify for user actions)
- `src/schemas/deadline.py` — Pydantic schemas (extend for action endpoints)
- `src/services/deadline.py` — Deadline service (extend for action queries)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DeadlineCard` — Existing card with expand/collapse, urgency badge, AI chat section — redesign in-place
- `URGENCY_COLORS` in urgency.ts — Extend with "overdue" level (red palette)
- `getCourseColor()` — Existing course color system, pinned state overrides with amber
- Native `<dialog>` pattern from Phase 05/12 — NOT used here (dropdown is simpler div popover)
- `deadlineKeys` query key factory — Extend for mutation invalidation

### Established Patterns
- Client-side filtering via useMemo (Phase 08 decision) — modify filter predicates
- Optimistic updates pattern: TanStack Query `onMutate` → `onError` rollback → `onSettled` invalidate
- Left color stripe on DeadlineCard (5px absolute positioned div) — override color for pinned
- `differenceInCalendarDays` for days computation — reuse for overdue detection

### Integration Points
- `DeadlinesPage.tsx` — Add pinned/deleted state from new API, modify filter logic
- `DeadlineTimelineView.tsx` — Sort pinned to top before rendering
- `DeadlineCard.tsx` — Add three-dot menu, due time display, overdue border, pin visual
- `NotificationPanel.tsx` — Query pinned deadlines, render with priority
- Backend: New migration for `deadline_user_actions` table, new routes, new service methods
- Supabase RLS: New policy for deadline_user_actions (user can only CRUD own actions)

</code_context>

<specifics>
## Specific Ideas

- Dropdown menu chosen over swipe/inline icons for desktop-first approach (project constraint)
- Amber (#b08968) chosen for pin stripe — matches project's existing amber palette variable
- Separate table for user actions (not modifying UnifiedDeadline) is critical — sync engine rewrites deadline data periodically, user actions must survive sync cycles

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-deadlines-page-enhancement*
*Context gathered: 2026-04-04*
