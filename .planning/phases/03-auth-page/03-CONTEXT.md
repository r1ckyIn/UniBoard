# Phase 3: Auth Page - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the authentication page — login and register flows with form validation. This is a standalone full-page layout (no Sidebar/Header from AppShell). Users can sign in or create an account through a polished auth interface matching UniBoard's hand-drawn paper aesthetic.

Requirements: UI-09, PLAT-02

</domain>

<decisions>
## Implementation Decisions

### Page Layout & Visual Design
- Two-panel layout: left brand showcase + right auth form card (from prototype)
- **Remove Tab toggle** at top — use bottom link only ("Don't have an account? Create one" / "Already have an account? Sign in") following mainstream SaaS best practice (Stripe, Notion, Vercel pattern)
- Login form is the default view; register form accessible via bottom link
- Left brand panel: keep prototype content (UniBoard logo, "Your GPA, Maximized." tagline, three feature highlights: GPA Tracking, Smart Digest, Deadline Intelligence)
- Standalone layout — Auth page does NOT use AppShell (no Sidebar/Header)

### Background & Doodles
- **Colorful Dashboard-style Rough.js doodles** (NOT the grey prototype doodles) — orange stars (#d97757), blue/green dot clusters (#6a9bcc, #788c5d), sparkle flashes, wavy lines (#ddd8ce)
- Doodles scattered across full-screen background at lower opacity than Dashboard (~0.15-0.20) to avoid competing with the form
- Paper texture (SVG fractalNoise grain + ruled lines) applied same as other pages

### Entrance Animations
- **Staggered layer-by-layer entrance**: doodles fadeIn first → brand logo slideUp → tagline slideUp → feature cards slideUp → form card slideUp with Rough.js border draw
- Each element ~600ms duration, cubic-bezier(.16,1,.3,1), staggered delays ~80-100ms apart
- Must feel cohesive with the rest of UniBoard's page transitions

### Form Switching Animation
- **Claude's Discretion** — must satisfy these constraints:
  - Match UniBoard's hand-drawn paper aesthetic (organic, not mechanical)
  - **Extremely high fluidity** is a hard requirement — no jank, no frame drops
  - Cohesive with the entrance animation style
  - Card height must morph naturally (register form is taller than login)
  - Rough.js border must redraw to match card size during transition
- Reference patterns: Clerk-style spring morphing, staggered field reveals, container breathing — Claude picks the best blend

### Post-Auth Navigation
- **Smart routing after login**: check `tokenConfigured` state — if configured → `/dashboard`, if not → `/setup`
- **Register flow**: register API success → auto-set auth state (tokens + user in zustand store) → show success overlay ("Account Created!") → click "Continue to Setup" → `/setup` (already logged in)
- **Auth guard**: authenticated users visiting `/auth` are auto-redirected (smart routing based on tokenConfigured)

### Forgot Password
- **Placeholder toast** — clicking "Forgot password?" shows a styled toast: "Password reset is not available in demo mode". No navigation, stays on current page
- Full reset flow deferred to backend implementation (M2)

### i18n
- Auth page fully supports EN/ZH via next-intl, consistent with all other pages
- **Language switcher**: small button in top-right corner of the page (since Auth has no Sidebar/Header)
- All form labels, error messages, success overlay text, brand panel content have both EN and ZH translations

### Form Validation
- **Disable browser native validation** (`noValidate` on form) — replace with custom inline error components using UniBoard's warm-color aesthetic
- Email: currently restricted to `@uni.sydney.edu.au` domain only (USYD students). Friendly error for other domains: "Please use your USYD student email (@uni.sydney.edu.au)". Domain whitelist will expand for multi-university support later
- Password strength meter (4-bar indicator) follows prototype behavior — real-time update on input
- Other validations (email format, password length, password match, required fields): Claude decides optimal trigger timing (blur/submit/hybrid) per best practices

### Error States
- **Claude's Discretion** — login failure, registration failure, network errors: Claude designs error display using UniBoard's aesthetic components. Must feel consistent with the hand-drawn design system, not generic browser/framework defaults

### Route Structure
- Single page: `/[locale]/auth` — login is default, register switches via in-page animation
- File: `app/[locale]/(auth)/auth/page.tsx`
- Separate route group `(auth)` with its own layout (no AppShell)

### Claude's Discretion
- Form switching animation specifics (spring parameters, stagger timing, exit direction)
- Error display pattern per error type (inline, toast, button state — whatever best fits the aesthetic)
- Form validation trigger timing (real-time, blur, submit, or hybrid)
- Loading state design during API calls (button spinner, skeleton, etc.)
- Exact Rough.js doodle placement and density on auth page background
- Password strength bar colors and labels

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Specification (PRIMARY — this IS the spec)
- `prototype/auth.html` — Auth page prototype (two-panel layout, form structure, animations, Rough.js border). NOTE: remove Tab toggle and use bottom link only per discussion decision
- `prototype/dashboard.html` — Reference for colorful Rough.js background doodles (stars, dots, sparkles, waves) to adapt for Auth page background
- `prototype/DESIGN_SYSTEM.md` — Reusable CSS patterns, color vars, card styles, paper texture

### Design Philosophy (reference only)
- `docs/frontend_brief.md` — Aesthetic direction, color system rationale

### Technical Architecture
- `docs/UniBoard_TRD_v2.md` §12.2 — Auth endpoints (register, login, refresh, logout, forgot/confirm password)
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification

### Requirements
- `.planning/REQUIREMENTS.md` — UI-09 (auth page), PLAT-02 (web access)
- `.planning/ROADMAP.md` — Phase 3 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/hooks/use-auth.ts` — useLogin, useRegister, useLogout, useRefreshToken mutations already implemented
- `frontend/lib/auth/store.ts` — zustand auth store with persist (accessToken, refreshToken, user, isAuthenticated, tokenConfigured)
- `frontend/app/api/v1/auth/` — All mock Route Handlers ready (login, register, logout, refresh, forgot-password, confirm-password)
- `frontend/components/design-system/RoughCard.tsx` — Rough.js card component (may need adaptation for auth form card)
- `frontend/components/design-system/HeroDoodles.tsx` — Dashboard doodles component (adapt pattern for auth page background)
- `frontend/components/design-system/ClientOnly.tsx` — Client-only wrapper for Rough.js SSR safety

### Established Patterns
- `withClientOnly()` wrapper for Rough.js components to avoid hydration mismatches (Phase 1)
- `next-intl` for i18n with `app/[locale]/` route structure (Phase 1)
- `ky` HTTP client configured with base URL and auth token injection (Phase 2)
- `useAuthStore.getState()` pattern for mutations outside render cycle (Phase 2)
- Route groups: `app/[locale]/(dashboard)/` established in Phase 1 — auth page uses parallel `(auth)` group

### Integration Points
- Auth middleware in `frontend/middleware.ts` — extend to handle auth guard (redirect authenticated users away from /auth, redirect unauthenticated from protected routes)
- After login success → smart routing checks `tokenConfigured` → Dashboard or Setup
- Register success → auto-login (setAuth) → success overlay → Setup page

</code_context>

<specifics>
## Specific Ideas

- Auth page currently feels "too plain" — user wants richer visual treatment with colorful doodles and entrance animations (reference dashboard.html background)
- Form switching must be extremely fluid — no jank tolerance. Research Clerk/Apple/Linear auth transitions for inspiration
- Browser native validation tooltips are unacceptable — all validation must use custom components matching UniBoard aesthetic
- Email placeholder should suggest USYD format: "you@uni.sydney.edu.au"
- Success overlay after registration follows prototype: green checkmark icon, "Account Created!", "Welcome to UniBoard. Let's connect your Canvas and Ed accounts to get started.", "Continue to Setup" button

</specifics>

<deferred>
## Deferred Ideas

- Full password reset flow — deferred to M2 backend implementation
- Multi-university email domain support — future expansion (currently USYD-only)
- OAuth / social login — out of scope (simple JWT for MVP)

</deferred>

---

*Phase: 03-auth-page*
*Context gathered: 2026-03-21*
