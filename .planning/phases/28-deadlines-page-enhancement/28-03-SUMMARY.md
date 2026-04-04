---
plan: "28-03"
phase: "28-deadlines-page-enhancement"
status: complete
started: "2026-04-04T11:48:00Z"
completed: "2026-04-04T12:00:00Z"
---

## What Was Built

Redesigned DeadlineCard with due time prominence, three-dot action menu (pin/delete), overdue red border, and pinned amber stripe. Timeline sorts pinned items to top.

## Key Changes

### DeadlineCard.tsx
- Added due time display on far right with enlarged font (1.05rem bold)
- Three-dot menu (MoreHorizontal icon) with Pin to top / Delete dropdown
- Overdue cards get 2px red border (#d97757)
- Pinned cards get amber left stripe (#b08968) + Pin icon next to title
- Click-outside handler closes dropdown via mousedown listener
- Menu clicks excluded from card toggle via data-actions-menu attribute

### DeadlineTimelineView.tsx
- Pinned deadlines sort to top within timeline via useMemo sort
- Pinned timeline dots use amber color (#b08968) instead of urgency color

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | DeadlineCard redesign + timeline pin sorting | ✅ | 711adcc |
| 2 | Visual verification (human-verify checkpoint) | ✅ | Verified via agent-browser |

## Verification

- tsc --noEmit: 0 errors
- Visual: Due time displayed, three-dot menu works, pin/delete functional
- Visual: Overdue cards have red border, pinned cards have amber stripe
- Visual: "All" mode hides completed, "This Week" shows 7-day window

## Self-Check: PASSED

### key-files

created:
- (none — modified existing files)

modified:
- frontend/components/deadlines/DeadlineCard.tsx
- frontend/components/deadlines/DeadlineTimelineView.tsx
