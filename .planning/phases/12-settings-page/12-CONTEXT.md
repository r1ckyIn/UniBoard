# Phase 12: Settings Page - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can manage their API tokens, notification preferences, GPA targets, and profile through a settings page with scroll-spy section navigation. This is the final M1 frontend page. Token management, notifications, course linking, profile, and danger zone are in scope. No backend logic — all operations use existing mock API layer.

</domain>

<decisions>
## Implementation Decisions

### Settings Internal Navigation
- Left-side scroll-spy secondary nav (170px), matching prototype exactly
- 6 sections: API Tokens → GPA Target → Notifications → Course Linking → Profile → Danger Zone
- Click triggers smooth scroll to corresponding section
- Active section highlights via scroll position tracking (IntersectionObserver or scroll listener)
- Below 900px: hide secondary nav entirely, vertical scroll only (matching prototype breakpoint)

### Notifications Section (New — not in prototype)
- New section added between GPA Target and Course Linking
- Contains 4 notification controls:
  - **Deadline reminders**: 3 independent toggles for 72h / 24h / 3h before due date
  - **GPA risk alert**: toggle for grade trajectory deviation warnings
  - **Digest frequency**: daily / weekly selector
  - **Email notifications**: global email toggle
- UI form: Claude's discretion (toggle switches vs checkboxes — choose what fits design system best)
- Backend not implemented: Claude decides whether controls are interactive with mock persistence or disabled with "Coming Soon" label

### API Tokens Section
- Reuse TokenInput component from Phase 04 setup page for token update fields
- Show connection status per platform (Canvas / Ed) with Active/Invalid/Not Configured badges
- "Last synced" timestamp from mock data
- Token visibility toggle (eye/eye-off icon)
- "Update" button per platform + "Sync Now" button with spinning animation
- Token validation uses existing validateCanvasToken/validateEdToken functions

### GPA Target Section
- Slider (0-100, step 0.5) + numeric input synced bidirectionally
- Current target display with large number + grade band badge (HD/D/CR/P/F)
- "Save Target" button with success feedback
- USYD 7-point scale reference text at bottom
- Uses existing useUpdateProfile mutation to save

### Course Linking Section
- Read-only table showing 5 real courses (COMP2017, COMP3221, STAT2011, EDGU1003, MATH2021)
- Columns: Course (code + name), Semester, Sources (Canvas + Ed / Canvas only), Status (Auto-linked)
- "Manual linking coming soon" note at bottom (matching prototype)

### Profile Section
- Display Name: editable text input
- Email: readonly input with "cannot be changed" hint
- Password: disabled with "coming soon" label (matching prototype)
- "Save Changes" button + account creation date
- Uses existing useUpdateProfile mutation

### Danger Zone Section
- **Disconnect all tokens**: Red outlined button. Claude decides confirmation level (simple dialog appropriate since reconnection is easy)
- **Delete account**: Red outlined button. Requires typing 'DELETE' in a confirmation dialog before the action is enabled. Uses existing useDeleteAccount mutation
- Red-themed section title with alert-triangle icon

### Right Panel (via portal-slot)
- **Account Card**: Avatar (gradient initials), name, email, stats row (Courses count / WAM / Band)
- **Sync Status Card**: Canvas, Ed Discussion, Unit Outlines — mock "12 min ago" / "3 days ago" / "OK" badges
- **Quick Actions Card**:
  - Force Full Sync: triggers POST /sync mock API with loading animation
  - Export My Data: triggers useExportData hook
  - Help & Support: links to placeholder URL (future independent marketing site)
  - Send Feedback: links to GitHub Issues (https://github.com/r1ckyIn/UniBoard/issues)
- **About Card**: Version (1.0.0-beta), member since date, data stored size, footer links (Terms/Privacy → '#' placeholder, GitHub → repo URL)

### Claude's Discretion
- Notification section UI pattern (toggle switches vs checkboxes)
- Notification controls: interactive with mock persistence vs disabled "Coming Soon"
- Disconnect tokens confirmation level (simple dialog recommended)
- Loading skeleton design for settings page
- Exact spacing and section card inner padding
- Animation stagger delays for section entrance

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Settings prototype
- `prototype/settings.html` — Complete HTML prototype with all 5 sections, right panel, scroll-spy nav, and JavaScript interactions

### API contracts
- `docs/UniBoard_TRD_v2.md` §12 — REST API spec including /users/me, /users/me/tokens/{platform}, /sync endpoints
- `frontend/src/app/api/v1/users/me/route.ts` — Mock API for user profile CRUD
- `frontend/src/app/api/v1/users/me/tokens/[platform]/route.ts` — Mock API for token management
- `frontend/src/app/api/v1/sync/route.ts` — Mock API for sync trigger

### Existing hooks
- `frontend/src/hooks/use-user.ts` — All settings-related TanStack Query hooks (useCurrentUser, useUpdateProfile, useConfigureToken, useVerifyToken, useDeleteToken, useDeleteAccount, useExportData)

### Reusable components
- `frontend/src/components/setup/TokenInput.tsx` — Token input with status indicator (idle/valid/invalid)
- `frontend/src/lib/validations/token.ts` — Canvas and Ed token validation regex functions

### Design system
- `docs/frontend_brief.md` — Design system colors, typography, spacing
- `prototype/DESIGN_SYSTEM.md` — Rough.js component patterns, paper texture spec

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **TokenInput** (`components/setup/TokenInput.tsx`): Fully self-contained token input with status icons, monospace font, focus styling. Reuse for settings token update fields
- **useCurrentUser / useUpdateProfile** (`hooks/use-user.ts`): Profile data fetching and mutation with query invalidation. Ready for settings form
- **useConfigureToken / useDeleteToken** (`hooks/use-user.ts`): Token CRUD mutations. Ready for token management section
- **useExportData** (`hooks/use-user.ts`): GDPR data export with `enabled: false` for on-demand fetching
- **validateCanvasToken / validateEdToken** (`lib/validations/token.ts`): Regex validation for token format
- **RoughCard** (`components/ui/RoughCard.tsx`): Two-layer hand-drawn border cards via withClientOnly wrapper
- **AnimatedEntry** (`components/ui/AnimatedEntry.tsx`): Motion entrance animation wrapper with configurable delay

### Established Patterns
- **Portal-slot right panel**: `createPortal` to `#right-panel-slot` for page-specific right panel content
- **i18n**: next-intl with namespace-based message files (`messages/en/*.json`, `messages/zh/*.json`)
- **Page structure**: 'use client' page component → hooks for data → AnimatedEntry wrapped sections → portal for right panel
- **Two-layer RoughCard**: outer div (10px padding, no bg) + inner div (bg + shadow), rough.js border drawn on outer

### Integration Points
- Route: `/app/[locale]/(dashboard)/settings/page.tsx` — new route file needed
- Sidebar nav: Settings nav item already exists in Sidebar component
- Right panel: portal-slot pattern established, use createPortal
- i18n: new `messages/en/settings.json` and `messages/zh/settings.json` files needed

</code_context>

<specifics>
## Specific Ideas

- Help & Support will eventually link to a separate marketing/SaaS site (independent from the app platform). For now, use placeholder URL
- Send Feedback links to GitHub Issues: https://github.com/r1ckyIn/UniBoard/issues
- Password change is disabled with "coming soon" — matching prototype's disabled-group pattern
- Manual course linking is "coming soon" — just an italic note below the table
- Notification section is an addition to the prototype; style it to match the existing section card pattern seamlessly

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-settings-page*
*Context gathered: 2026-03-25*
