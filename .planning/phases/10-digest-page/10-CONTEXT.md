# Phase 10: Digest Page - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Digest page — a daily academic intelligence feed where students see AI-scored highlights grouped by course. Each course section shows grade updates, staff posts, deadline changes, endorsed posts, announcements, and exam hints with urgency badges. The page includes type filtering, an urgent banner for critical items, and a right panel with summary stats and digest history navigation. This is a frontend-only page consuming mock digest API data; backend digest generation deferred to M2 (Phase 17).

Requirements: UI-05

</domain>

<decisions>
## Implementation Decisions

### Information Grouping
- **Group by course** (matching prototype), NOT by date. Each course gets a section with colored left stripe, course code + name header, and update count badge
- **Course section ordering**: highest urgency first — courses containing `critical` highlights sort to top, then `important`, then `informational`. Within same urgency tier, sort by highlight count descending
- **Highlight ordering within section**: urgency priority first (critical → important → informational), then by time descending within same urgency level
- **Urgent Banner**: when any `critical` urgency highlights exist, display a red alert banner below the title row showing count (e.g., "2 urgent items need your attention"). Hide banner when no critical items

### Highlight Display & Interaction
- **All highlights fully expanded by default** (matching prototype). No collapse/expand — current API returns single-line summaries, not expandable content
- **6 highlight types** with distinct icon + background color per prototype: new_grade (green/check-circle), staff_post (blue/message-circle), deadline_change (purple/calendar-clock), endorsed_post (amber/star), new_announcement (orange/megaphone), exam_info (red/graduation-cap)
- **Source badge**: display a small Canvas/Ed source tag alongside the type label. Inferred from highlight type (grade_published → Canvas, staff_post → Ed, etc.) since API schema has no explicit source field. M2 backend can add a source field later
- **Thread link**: highlights with `source_thread_id` show "View thread →" link that navigates to Course Detail page's Ed Posts section (`/courses/[courseId]?tab=posts`)
- **Time display**: relative time (e.g., "2 hours ago") from `generated_at` field
- **Urgency badges**: critical (red-soft bg), important (orange-soft bg), informational (green-soft bg) — positioned at the end of each highlight row

### Filtering
- **Type filter only** for M1. Pill buttons below title row: All (default active) | Grade | Staff | Deadline | Announcement | Exam
- Client-side filtering via `useMemo` — filter highlights across all course sections, hide courses with 0 matching highlights after filter
- Source filter and date range filter deferred to M2 (requires backend support)
- **Filter button style**: Claude's discretion — choose based on existing design system patterns and visual consistency

### Title Row
- "Daily Digest" heading with Radio icon (Lucide), date badge (e.g., "Thu, 20 Mar"), "Generated X ago" italic text, Refresh button
- Refresh button: invalidates TanStack Query cache, re-fetches digest/latest. Shows loading spinner during refetch, updates "Generated just now" on completion

### Right Panel
- **Card 1 — Today's Summary**: 2×2 grid showing Updates count, Courses count, Grades count, Urgent count. Client-side computed from digest data. RoughCard with Rough.js borders
- **Card 2 — Recent Digests**: list of past digests (date + item count + chevron). Uses `useDigestHistory()` hook. Click loads and displays that day's digest in the main content area (replaces current digest, title row date updates, current item highlighted in list). RoughCard with Rough.js borders
- **No Urgent Deadlines card** — kept simple with just 2 right panel cards
- Injection method: portal-slot pattern (createPortal + #right-panel-slot) — same as Phase 5/7/9

### Course Section Visual Style
- Prototype pattern: `.course-section-wrap` with `border: 1.5px solid #d0cdc4`, colored left stripe (5px `::after` pseudo-element), course color dot + code + name + count badge in header
- NOT using RoughCard for course sections (they use CSS border + left stripe, not Rough.js hand-drawn borders)
- Right panel cards DO use RoughCard with Rough.js hand-drawn borders

### Entrance Animations
- CSS slideUp staggered delays (d1-d10) matching prototype timing pattern used across all pages

### i18n
- Full EN/ZH support: page title, date formatting, urgency labels, type labels, filter buttons, summary card labels, empty states, "Generated X ago" text, "View thread" link text
- Add `digest` namespace to next-intl messages

### Loading & Error States
- Skeleton loading for course sections (3 placeholder sections with shimmer)
- Skeleton loading for right panel cards
- Error: friendly message + retry button (consistent with other pages)
- Empty state: when digest has no highlights — illustration + "No updates today" message

### Claude's Discretion
- Filter pill button exact styling (pill vs chip vs segmented, based on design system)
- Skeleton card shapes and shimmer details
- Rough.js seed values and styling for right panel cards
- Entrance animation timing fine-tuning
- Error/empty state wording and illustration choice
- Source badge inference mapping (type → Canvas/Ed)
- Responsive breakpoints for course section grid

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Specification (PRIMARY — this IS the spec)
- `prototype/digest.html` — Digest page prototype: course-grouped sections, highlight items with urgency badges, right panel Summary + Recent Digests, all CSS styles and JS rendering logic
- `prototype/DESIGN_SYSTEM.md` — Reusable CSS patterns, color vars, card styles, paper texture

### API Contract & Data
- `frontend/openapi/openapi.yaml` — DigestLatest, DigestCourseEntry, DigestHighlight, UrgentDeadline, DigestSummary schemas
- `frontend/lib/fixtures/digest.ts` — Mock digest data (3 courses, 5 highlights, 5 history entries)
- `frontend/hooks/use-digest.ts` — useDigestLatest(), useDigestHistory() hooks (already implemented)
- `frontend/app/api/v1/digest/latest/route.ts` — Mock digest latest endpoint
- `frontend/app/api/v1/digest/history/route.ts` — Mock digest history endpoint

### Technical Architecture
- `docs/UniBoard_TRD_v2.md` §12.7 — Digest endpoints (latest, history) — API contract
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification

### Requirements
- `.planning/REQUIREMENTS.md` — UI-05 (Digest page), INTEL-03 (daily digest), INTEL-04 (AI-enhanced digest scoring)
- `.planning/ROADMAP.md` — Phase 10 success criteria

### Prior Phase Context
- `.planning/phases/01-design-system-foundation/01-CONTEXT.md` — Design system decisions
- `.planning/phases/02-api-contracts-mock-layer/02-CONTEXT.md` — API contracts, hooks architecture, mock data
- `.planning/phases/05-dashboard-page/05-CONTEXT.md` — Portal-slot pattern, RoughCard, right panel injection
- `.planning/phases/09-predict-page/09-CONTEXT.md` — Recent phase patterns (portal-slot, animations, i18n)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/hooks/use-digest.ts` — useDigestLatest(), useDigestHistory() hooks with TanStack Query (Phase 2, ready to use)
- `frontend/lib/fixtures/digest.ts` — Mock data for 3 courses and 5 history entries
- `frontend/components/design-system/RoughCard.tsx` — Two-layer Rough.js card for right panel cards
- `frontend/components/design-system/ClientOnly.tsx` — withClientOnly() SSR safety wrapper for Rough.js components
- `frontend/components/dashboard/SkeletonCard.tsx` — Skeleton loading component with variants
- `frontend/lib/dashboard/course-colors.ts` — getCourseColor() for consistent course color mapping
- `frontend/lib/utils/grade-band.ts` — getGradeBand() utility (may be useful for grade highlights)
- `frontend/components/dashboard/ExternalLinkDialog.tsx` — External link confirmation dialog (for Ed Discussion links)

### Established Patterns
- Portal-slot: createPortal + #right-panel-slot for right panel content injection (Phase 5/7/9)
- withClientOnly() wrapper for Rough.js components (Phase 1)
- CSS slideUp staggered animations (d1-d10) for page entrance (all pages)
- TanStack Query hooks: keys-factory → queryOptions-factory → thin-wrapper (Phase 2)
- next-intl i18n with namespace per page (Phase 1+)
- Client-side filtering via useMemo (Phase 8 deadlines)
- CSS border + left color stripe for section cards (Phase 8 DeadlineCard, Phase 9 PredictCard)
- TanStack Query invalidation for refresh (standard pattern)

### Integration Points
- Page route: `app/[locale]/(dashboard)/digest/page.tsx`
- Sidebar "Digest" nav item should be active on this page (Radio icon in Sidebar.tsx)
- Right panel content injected via portal-slot into #right-panel-slot in AppShell
- Thread links navigate to Course Detail page: `/courses/[courseId]?tab=posts`

</code_context>

<specifics>
## Specific Ideas

- **Prototype is the primary visual spec**: digest.html defines exact layout, colors, spacing, icon choices — downstream agents should match it closely
- **Fixture data enrichment may be needed**: current fixture has only 3 courses and basic highlights. May need to add more diverse data (exam_info, deadline_change, endorsed_post types) and add source_thread_id to some entries for "View thread" link testing
- **Course color mapping**: prototype uses hardcoded colors per course (orange for COMP2017, blue for COMP3221, etc.). In the app, use getCourseColor() from course-colors utility for consistency
- **ROADMAP SC conflict**: SC says "date grouping" but user chose course grouping (matching prototype). SC says "expandable" but current API only has single-line summaries and user chose fully expanded. Update SC understanding accordingly — prototype takes precedence

</specifics>

<deferred>
## Deferred Ideas

- **Source filter (Canvas/Ed)**: requires backend to tag highlights with explicit source field. Deferred to M2 Phase 17
- **Date range filter**: requires backend to support historical digest queries with date parameters. Deferred to M2
- **Urgent Deadlines right panel card**: CSS styles exist in prototype but not rendered. Could add later if digest page feels too sparse
- **Weekly digest view toggle**: API supports `period: "daily" | "weekly"` but no weekly fixture data exists. Deferred to M2
- **Digest notification badge**: show unread digest count on sidebar nav item. Requires backend state tracking

</deferred>

---

*Phase: 10-digest-page*
*Context gathered: 2026-03-24*
