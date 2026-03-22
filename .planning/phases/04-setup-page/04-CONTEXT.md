# Phase 4: Setup Page - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the 3-step API token onboarding page — new users complete token setup after registration. Flow: Welcome → Token Tutorial (how to get Canvas/Ed tokens) → Paste & Validate Tokens → Success (sync simulation → Dashboard). Standalone centered layout, no AppShell.

Requirements: UI-10, PLAT-01

</domain>

<decisions>
## Implementation Decisions

### Token Validation Logic
- Format pattern matching — Canvas tokens validated against numeric pattern (~70 digits), Ed tokens validated as shorter alphanumeric strings
- Validation triggers on "Validate & Connect" button click (not real-time input)
- Sequential validation: Canvas validated first (show ✅/❌), wait ~0.8s, then Ed validated. If first fails, stop — don't continue to second
- Specific format error messages: "Canvas token should be a numeric string (~70 characters)" / "Ed token should be a shorter alphanumeric string"

### Post-Completion Flow
- Enhanced sync simulation: call mock sync API (POST /api/v1/sync/trigger), display real mock course names (e.g., COMP2123, INFO1110) instead of fixed "5 courses"
- Spinner + "Syncing your data…" → after ~3s → ✅ "{N} courses synced successfully" with actual course names from mock data
- Manual "Go to Dashboard" button click to navigate (no auto-redirect)
- State updates on success: `useAuthStore.setTokenConfigured(true)` + success toast on Dashboard arrival: "Welcome! Your accounts are connected."

### Access Control & Re-entry
- Setup page is a one-time onboarding flow
- Already-configured users (`tokenConfigured === true`) visiting /setup → auto-redirect to /dashboard
- Unauthenticated users visiting /setup → redirect to /auth (login), then back to /setup after login
- Token management after setup belongs to Phase 12 Settings page

### Background & Doodles
- Colorful Rough.js doodles (same as Auth page) — orange stars, blue/green dot clusters, sparkle flashes, wavy lines
- Reuse AuthDoodles component directly
- Same opacity (0.15-0.20) and density as Auth page — consistent visual identity across onboarding flow
- Paper texture (SVG fractalNoise grain + ruled lines) applied same as other pages

### Step Transitions & Animations
- Use Motion library (framer-motion) — consistent with Phase 3 Auth page animation approach
- AnimatePresence for step crossfade transitions with height morphing
- RoughCard ResizeObserver handles border redraw during height transitions
- Entrance animation: layered stagger matching Auth page — doodles fadeIn → step indicator slideUp → card slideUp with Rough.js border draw. ~80-100ms stagger, cubic-bezier(.16,1,.3,1)

### Tutorial Guide Cards
- Both Canvas and Ed guides default expanded (user can see all steps immediately)
- Independent fold/unfold control (not accordion — both can be open simultaneously)
- Collapsible with smooth height animation + Rough.js border redraw during transition

### Step Indicator
- Step circles are display-only, not clickable
- Navigation only through buttons: "Get Started" / "Back" / "I have my tokens" / "Validate & Connect"
- Linear guided flow — no step skipping

### i18n & Tutorial Content
- Full Chinese translation of all tutorial steps, buttons, descriptions, error messages
- Platform names kept in English: "Canvas LMS", "Ed Discussion"
- **Ed tutorial updated to real flow** (differs from prototype):
  1. Visit edstem.org/eu/login
  2. Select region → **Australia** (critical step — default may be wrong)
  3. Log in with student credentials
  4. Navigate to API Tokens settings
  5. Generate and copy token

### Route Structure
- Single page: `/[locale]/setup`
- File: `app/[locale]/(auth)/setup/page.tsx` (same route group as auth — standalone layout, no AppShell)
- Auth guard: must be logged in + tokenConfigured === false

### Claude's Discretion
- Exact Motion animation parameters (spring configs, duration, easing)
- Token format regex patterns (Canvas numeric, Ed alphanumeric)
- Sync simulation timing and mock course data selection
- Welcome page feature badge layout and icons
- Security note styling details
- Step 2 tutorial step icon choices
- Rough.js border seed and styling parameters

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Specification (PRIMARY — this IS the spec)
- `prototype/setup.html` — Setup page prototype (3-step flow, step indicator, guide cards, token form, success state, Rough.js border, background doodles). NOTE: Ed tutorial steps must be updated to real flow (region selection → Australia → login)
- `prototype/DESIGN_SYSTEM.md` — Reusable CSS patterns, color vars, card styles, paper texture

### Design Philosophy (reference only)
- `docs/frontend_brief.md` — Aesthetic direction, color system rationale

### Technical Architecture
- `docs/UniBoard_TRD_v2.md` §12.3 — User & Token endpoints (token CRUD, verify)
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification

### Requirements
- `.planning/REQUIREMENTS.md` — UI-10 (setup page), PLAT-01 (3-step onboarding)
- `.planning/ROADMAP.md` — Phase 4 success criteria

### Prior Phase Context
- `.planning/phases/03-auth-page/03-CONTEXT.md` — Auth page decisions (post-auth routing, success overlay → setup navigation, doodle style, animation patterns)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/components/auth/AuthDoodles.tsx` — Full-screen colorful Rough.js doodles, reuse directly for Setup background
- `frontend/components/auth/AuthGuard.tsx` — Auth guard logic, extend for setup-specific guard (must be logged in + !tokenConfigured)
- `frontend/components/auth/LanguageSwitcher.tsx` — Top-right language switcher, reuse on Setup page
- `frontend/components/auth/AnimatedEntry.tsx` — Staggered entrance animation component, reuse for Setup page entrance
- `frontend/components/design-system/RoughCard.tsx` — Rough.js card with ResizeObserver border redraw
- `frontend/components/design-system/ClientOnly.tsx` — Client-only wrapper for Rough.js SSR safety
- `frontend/hooks/use-auth.ts` — Auth mutations (already implemented)
- `frontend/hooks/use-user.ts` — User/token management hooks
- `frontend/hooks/use-sync.ts` — Sync trigger hook (for post-setup sync simulation)
- `frontend/lib/auth/store.ts` — zustand auth store with `setTokenConfigured()` method ready to use

### Established Patterns
- Motion (framer-motion) for animations — AnimatePresence, layoutId (Phase 3)
- `withClientOnly()` wrapper for Rough.js components (Phase 1)
- `next-intl` for i18n with `app/[locale]/` route structure (Phase 1)
- `(auth)` route group with standalone layout, no AppShell (Phase 3)
- URL search params for state persistence across locale switches (Phase 3)

### Integration Points
- Auth middleware in `frontend/middleware.ts` — extend to handle setup guard (logged in + !tokenConfigured → /setup, configured → /dashboard)
- After register success in Auth page → SuccessOverlay → "Continue to Setup" → `/setup`
- After setup success → setTokenConfigured(true) → "Go to Dashboard" → `/dashboard`
- Mock token endpoints: `POST /api/v1/users/me/tokens/{platform}` for storing tokens
- Mock sync endpoint: `POST /api/v1/sync/trigger` for sync simulation

</code_context>

<specifics>
## Specific Ideas

- Ed tutorial MUST include the Australia region selection step — users cannot find API tokens without selecting the correct region first. The login URL is `edstem.org/eu/login?redirect=/eu/settings/api-tokens&auth=1`
- Setup and Auth pages share the same visual identity (colorful doodles, centered card, standalone layout) — they are one continuous onboarding flow
- Token format validation provides specific guidance so users know what went wrong, not just "invalid token"
- Sync simulation should feel real — show actual mock course names to build confidence that tokens worked

</specifics>

<deferred>
## Deferred Ideas

- Token management / editing after initial setup — Phase 12 Settings page
- Real token validation against Canvas/Ed APIs — M2 backend implementation
- Token expiration warnings — Phase 17 Notifications
- Screenshot/GIF visual guides showing Canvas/Ed settings pages — future enhancement

</deferred>

---

*Phase: 04-setup-page*
*Context gathered: 2026-03-22*
