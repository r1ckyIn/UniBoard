# Phase 27: Frontend UX Fixes & Course Materials Preview - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 27-frontend-ux-fixes-and-course-materials-preview
**Areas discussed:** Reminder card navigation, Timetable event styling, Scroll indicator, Material viewer

---

## Reminder Card Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to in-app pages | grade/deadline/discussion all route to internal pages | |
| All in-app | grade→course detail, deadline→deadlines page, discussion→course detail Ed tab | |
| Mixed mode | In-app where available, external links with warning for Ed discussion/endorsed | ✓ |

**User's choice:** Mixed mode
**Notes:** grade → `/courses/{courseId}`, deadline → `/deadlines?date={due_date}`, discussion/endorsed → external Ed link via ExternalLinkDialog

---

## Timetable Event Block Styling

| Option | Description | Selected |
|--------|-------------|----------|
| Full color blocks | Deep course color fill + white text (Allocate+ original) | |
| Medium route | ~60-70% opacity fill + white text, keep UniBoard rounded style | |
| Keep existing + tweak | Keep current style, adjust info layout | |

**User's choice:** None of the above — user clarified this is specifically about solid vs dashed border
**Notes:** Courses with attendance/participation → solid border, without → dashed border. Data from Unit Outline assessment weights. Not a full Allocate+ style overhaul. All other styling remains unchanged.

---

## Scroll Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom gradient fade | White gradient mask at list bottom | |
| "N more items" badge | Count badge at bottom, clickable | |
| Claude's discretion | Claude picks appropriate approach | ✓ |

**User's choice:** Claude's discretion
**Notes:** None

---

## Material Viewer

| Option | Description | Selected |
|--------|-------------|----------|
| Slide-out panel | Right-side panel with iframe embed | ✓ |
| Modal dialog | Centered dialog with iframe | |
| Split view | Shrink material list, expand preview area | |
| Claude's discretion | Claude picks approach | |

**User's choice:** Slide-out panel
**Notes:** Right-side slide-out with iframe for document preview, user stays on Course Detail page

---

## Claude's Discretion

- Scroll indicator design for Timetable deadline overflow

## Deferred Ideas

None — discussion stayed within phase scope
