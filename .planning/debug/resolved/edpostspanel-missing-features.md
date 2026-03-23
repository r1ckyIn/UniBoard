---
status: resolved
trigger: "EdPostsPanel is missing endorsed/staff badges, author info, and relative timestamps. Inconsistent with Dashboard right panel."
created: 2026-03-23T08:00:00Z
updated: 2026-03-23T08:10:00Z
---

## Current Focus

hypothesis: EdPostsPanel renders badges and timestamps but omits author info; UAT report "missing badges" may be a rendering/visibility issue OR user tested before code deployed
test: Compare rendered elements against API schema fields
expecting: Identify which fields from Discussion schema are unused in the render
next_action: Return diagnosis

## Symptoms

expected: EdPostsPanel shows high-value posts with endorsed/staff badges, author name, and relative timestamp — consistent with Dashboard right panel
actual: User reported "功能缺失，与dashboard右侧栏不一致，缺少endorsed/staff标签、作者、时间戳"
errors: No runtime errors — functional gap
reproduction: Navigate to any Course Detail page, observe the EdPostsPanel in the right panel
started: Phase 07 Plan 03 initial implementation

## Eliminated

- hypothesis: API schema missing author/badges/timestamp fields
  evidence: Discussion schema in types.gen.d.ts includes author, is_endorsed, is_staff_post, created_at. Mock data in discussions.ts also has all fields.
  timestamp: 2026-03-23T08:05:00Z

- hypothesis: Data hook not returning required fields
  evidence: useCourseDiscussions returns full Discussion objects. Test file at EdPostsPanel.test.tsx uses fixture data that includes author, is_endorsed, is_staff_post, created_at.
  timestamp: 2026-03-23T08:06:00Z

## Evidence

- timestamp: 2026-03-23T08:02:00Z
  checked: EdPostsPanel.tsx source code (186 lines)
  found: |
    Component DOES render:
    1. Post title (line 144-146) - d.title
    2. Endorsed badge (line 150-154) - d.is_endorsed conditional
    3. Staff badge (line 155-159) - d.is_staff_post conditional
    4. Relative timestamp (line 163-165) - formatTime(d.created_at)
    Component does NOT render:
    5. Author name (d.author) - COMPLETELY ABSENT from JSX
    6. Category (d.category) - not rendered
    7. Summary (d.summary) - not rendered
  implication: Badges and timestamps ARE implemented. Author is the confirmed missing field.

- timestamp: 2026-03-23T08:04:00Z
  checked: Discussion schema in types.gen.d.ts (lines 631-644)
  found: Schema has author:string, category:string, summary:string in addition to the fields EdPostsPanel uses
  implication: author is available in the data but component never references it

- timestamp: 2026-03-23T08:05:00Z
  checked: Mock data in discussions.ts
  found: Every Discussion fixture has author field populated (e.g. "Dr. Smith", "Alex T.", "Prof. Wang")
  implication: Data is available end-to-end, just not rendered

- timestamp: 2026-03-23T08:06:00Z
  checked: Plan 07-03 spec for EdPostsPanel (07-03-PLAN.md)
  found: Plan says "Title: .78rem, 600, text-1, truncate, flex-1" then "Badges" then "Time" — plan does NOT explicitly list author in the render spec for EdPostsPanel
  implication: The plan itself omitted author from the EdPostsPanel render spec, even though the UAT test expected it

- timestamp: 2026-03-23T08:07:00Z
  checked: UAT test 9 expected behavior
  found: "Each post shows title, author, and relative timestamp" — UAT explicitly expects author
  implication: Plan omission led to implementation omission. UAT expectation is the source of truth.

- timestamp: 2026-03-23T08:08:00Z
  checked: Dashboard RecentActivity.tsx — the "equivalent" panel
  found: RecentActivity is NOT a direct equivalent — it shows activity items (grades, discussions, deadlines, endorsed) as a unified feed, not a discussion list. It has different data shape (ActivityItem with text/strongText/time). No per-post badges or author field.
  implication: The UAT's "inconsistent with Dashboard" claim is about general quality/richness, not about matching a specific Dashboard component

- timestamp: 2026-03-23T08:09:00Z
  checked: NotificationPanel.tsx — another potential comparison
  found: NotificationPanel renders title, body, and relative timestamp with locale-aware date-fns. Uses dateFnsLocale for i18n.
  implication: EdPostsPanel's formatDistanceToNow does NOT use locale-aware formatting (no dateFnsLocale), so Chinese locale would show English relative times — a secondary gap

## Resolution

root_cause: |
  Two confirmed gaps in EdPostsPanel.tsx:

  1. **MISSING AUTHOR**: The `author` field from the Discussion schema is never rendered.
     The component renders title + badges + time, but skips author entirely.
     Root cause: the Plan 07-03 spec for EdPostsPanel's render layout did not include
     author in its list of per-item elements, so the executor implemented exactly what
     the plan said. The UAT test 9 expectation ("each post shows title, author, and
     relative timestamp") was correct but the plan was incomplete.

  2. **NON-LOCALIZED TIMESTAMPS**: formatDistanceToNow is called without a locale option.
     When the app is in Chinese locale, relative times still display in English ("3 days ago"
     instead of "3天前"). NotificationPanel.tsx demonstrates the correct pattern: import
     dateFnsLocale and pass { addSuffix: true, locale: dateFnsLocale }.

  The badges (endorsed/staff) and timestamps ARE implemented and should be rendering.
  The UAT reporter's statement about "missing badges and timestamps" may reflect:
  (a) testing before the latest code was deployed, or
  (b) the badges being too small/subtle to notice at .58rem / .64rem font sizes.
  Regardless, the author field is definitively absent from the rendered output.

fix: ""
verification: ""
files_changed: []
