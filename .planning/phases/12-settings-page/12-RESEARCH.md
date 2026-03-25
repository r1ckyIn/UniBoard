# Phase 12: Settings Page - Research

**Researched:** 2026-03-25
**Domain:** Next.js settings page with scroll-spy navigation, form management, token CRUD, portal-slot right panel
**Confidence:** HIGH

## Summary

Phase 12 is the final M1 frontend page. It requires building a settings page with 6 sections (API Tokens, GPA Target, Notifications, Course Linking, Profile, Danger Zone), a left-side scroll-spy secondary nav (170px), and a right panel injected via the established portal-slot pattern. All data operations use existing mock API routes and TanStack Query hooks -- no new backend or API work is needed.

The codebase has strong established patterns from 11 prior phases: page route files delegate to 'use client' page components, data is fetched via custom hooks from `hooks/`, right panel content is injected via `createPortal` to `#right-panel-slot`, sections are wrapped in `RoughCard` with `AnimatedEntry` stagger, and i18n uses `next-intl` with namespace keys in `messages/en.json` and `messages/zh.json`. All reusable assets (TokenInput, useCurrentUser, useUpdateProfile, useConfigureToken, useDeleteToken, useDeleteAccount, useExportData, useSyncTrigger, validateCanvasToken, validateEdToken, getGradeBand) already exist.

**Primary recommendation:** Follow the established page pattern (route file + page component + portal), reuse existing hooks and components, implement scroll-spy with IntersectionObserver, and add a "settings" namespace to i18n messages.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Left-side scroll-spy secondary nav (170px), matching prototype exactly
- 6 sections: API Tokens -> GPA Target -> Notifications -> Course Linking -> Profile -> Danger Zone
- Click triggers smooth scroll to corresponding section
- Active section highlights via scroll position tracking (IntersectionObserver or scroll listener)
- Below 900px: hide secondary nav entirely, vertical scroll only
- Notifications section: 4 controls (deadline reminders 72h/24h/3h, GPA risk alert, digest frequency, email toggle)
- API Tokens: Reuse TokenInput from Phase 04, show connection status per platform, eye toggle, Update + Sync Now buttons
- GPA Target: Slider 0-100 step 0.5 + numeric input bidirectional sync, grade band badge, Save Target button, USYD scale reference
- Course Linking: Read-only table with 5 courses, "Manual linking coming soon" note
- Profile: Display Name editable, Email readonly, Password disabled "coming soon", Save Changes + account creation date
- Danger Zone: Disconnect all tokens (red outlined, simple dialog), Delete account (red outlined, type DELETE confirmation)
- Right Panel: Account Card, Sync Status Card, Quick Actions Card, About Card (via portal-slot)
- Quick Actions: Force Full Sync, Export My Data, Help & Support (placeholder URL), Send Feedback (GitHub Issues)
- About Card: Version 1.0.0-beta, member since, data stored, Terms/Privacy/GitHub links

### Claude's Discretion
- Notification section UI pattern (toggle switches vs checkboxes)
- Notification controls: interactive with mock persistence vs disabled "Coming Soon"
- Disconnect tokens confirmation level (simple dialog recommended)
- Loading skeleton design for settings page
- Exact spacing and section card inner padding
- Animation stagger delays for section entrance

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-06 | Settings page for API token management, notification preferences, and GPA target configuration | All 6 sections documented with existing hooks (useCurrentUser, useUpdateProfile, useConfigureToken, useDeleteToken, useDeleteAccount, useExportData, useSyncTrigger), reusable TokenInput component, getGradeBand utility, and established portal-slot / RoughCard / AnimatedEntry patterns |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.14 | App framework, route handlers | Project foundation |
| react | 19.1.0 | UI library | Project foundation |
| @tanstack/react-query | ^5.91.2 | Server state, mutations | All hooks use this |
| next-intl | 4.8.3 | i18n (en/zh) | Established pattern |
| tailwindcss | ^4 | Styling (CSS-first config) | Project standard |
| roughjs | 4.6.6 | Hand-drawn borders (RoughCard) | Design system |
| lucide-react | ^0.577.0 | Icons | Project standard |
| date-fns | ^4.1.0 | Date formatting | Used across pages |
| ky | HTTP client | API calls | api client wrapper |

### Supporting (No New Packages Needed)
This phase requires **zero new npm packages**. All functionality is achievable with existing dependencies:
- Scroll-spy: native `IntersectionObserver` API
- Toggle switches: Tailwind CSS custom styling on `<input type="checkbox">`
- Slider: native `<input type="range">` with Tailwind styling
- Confirmation dialog: native HTML `<dialog>` element (established in Phase 05)
- Form state: React `useState` (no form library needed for simple fields)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| IntersectionObserver | scroll event + getBoundingClientRect | IO is more performant, avoids scroll jank, standard modern API |
| Native HTML dialog | Custom modal component | dialog has built-in focus trap + Escape; already used in Phase 05 |
| useState for forms | react-hook-form | Overkill for 2-3 simple fields; no complex validation needed |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── app/[locale]/(dashboard)/settings/
│   └── page.tsx                      # Route file (server component, setRequestLocale)
├── components/settings/
│   ├── SettingsPage.tsx               # Main orchestrator ('use client', portal, state)
│   ├── SettingsNav.tsx                # Left scroll-spy nav (170px)
│   ├── TokensSection.tsx              # API Tokens section
│   ├── GpaTargetSection.tsx           # GPA Target section
│   ├── NotificationsSection.tsx       # Notifications section (new, not in prototype)
│   ├── CourseLinkingSection.tsx       # Course Linking read-only table
│   ├── ProfileSection.tsx             # Profile form
│   ├── DangerZoneSection.tsx          # Danger zone actions
│   ├── SettingsAccountCard.tsx        # Right panel: Account card
│   ├── SettingsSyncCard.tsx           # Right panel: Sync status card
│   ├── SettingsQuickActions.tsx       # Right panel: Quick actions card
│   └── SettingsAboutCard.tsx          # Right panel: About card
├── messages/
│   ├── en.json                        # Add "settings" namespace
│   └── zh.json                        # Add "settings" namespace
└── __tests__/settings/
    ├── SettingsPage.test.tsx           # Page-level integration test
    ├── TokensSection.test.tsx          # Token CRUD interactions
    ├── GpaTargetSection.test.tsx       # Slider/input sync, save
    └── DangerZoneSection.test.tsx      # Delete confirmation flow
```

### Pattern 1: Route File + Client Page Component (Established)
**What:** Next.js 15 async route file delegates to 'use client' page component wrapped in Suspense
**When to use:** Every dashboard page
**Example:**
```typescript
// Source: frontend/app/[locale]/(dashboard)/digest/page.tsx (established pattern)
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import SettingsPage from "@/components/settings/SettingsPage";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}
```

### Pattern 2: Portal-Slot Right Panel (Established)
**What:** Page components inject right panel content via `createPortal` to `#right-panel-slot`
**When to use:** Every dashboard page that needs right panel content
**Example:**
```typescript
// Source: DigestPage.tsx / DashboardPage.tsx (established pattern)
const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

useEffect(() => {
  setPortalTarget(document.getElementById("right-panel-slot"));
}, []);

// In JSX return:
{portalTarget && createPortal(
  <>
    <SettingsAccountCard user={userData} />
    <SettingsSyncCard />
    <SettingsQuickActions />
    <SettingsAboutCard user={userData} />
  </>,
  portalTarget
)}
```

### Pattern 3: Scroll-Spy with IntersectionObserver
**What:** Track which settings section is in viewport, highlight corresponding nav item
**When to use:** Settings page left nav active state
**Example:**
```typescript
// Scroll-spy via IntersectionObserver
const SECTION_IDS = [
  "sec-tokens", "sec-gpa", "sec-notifications",
  "sec-courses", "sec-profile", "sec-danger"
] as const;

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    },
    { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
  );

  SECTION_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

  return () => observer.disconnect();
}, []);
```

### Pattern 4: Two-Layer RoughCard for Section Cards (Established)
**What:** Outer div (10px padding, no bg) + inner div (bg + shadow), rough.js border on outer
**When to use:** All settings section cards, matching `section-card` + `section-card-inner` from prototype
**Example:**
```typescript
// Use RoughCard component directly -- it already implements the two-layer pattern
<RoughCard>
  <div className="section-title">...</div>
  <div className="section-desc">...</div>
  {/* Section content */}
</RoughCard>
```

### Anti-Patterns to Avoid
- **Don't create a new modal component**: Use native HTML `<dialog>` (Phase 05 precedent)
- **Don't use framer-motion**: Project uses CSS animations via AnimatedEntry + Tailwind; framer-motion is not installed
- **Don't fetch data in child sections**: Fetch all data in SettingsPage orchestrator, pass as props (established pattern from Phase 05 NotificationPanel)
- **Don't use separate i18n message files per namespace**: Project uses single `en.json` / `zh.json` with nested keys, not file-per-namespace

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token input with status | Custom token input | Existing `TokenInput` from `components/setup/TokenInput.tsx` | Already styled, tested, supports idle/valid/invalid states |
| Token validation | Regex from scratch | `validateCanvasToken` / `validateEdToken` from `lib/validations/token.ts` | Already handles real Canvas format (numeric~alphanumeric) and Ed format |
| Grade band calculation | if/else chain | `getGradeBand()` from `lib/utils/grade-band.ts` | Already handles null/NaN, matches USYD 7-point scale |
| Token CRUD mutations | Direct API calls | `useConfigureToken` / `useDeleteToken` / `useVerifyToken` from `hooks/use-user.ts` | Already wired with query invalidation |
| Profile update | Direct API call | `useUpdateProfile` from `hooks/use-user.ts` | Already handles PATCH /users/me with cache invalidation |
| Account deletion | Direct API call | `useDeleteAccount` from `hooks/use-user.ts` | Already handles DELETE /users/me + clearAuth |
| Data export | Custom fetch | `useExportData` from `hooks/use-user.ts` | Already configured with `enabled: false` for on-demand |
| Sync trigger | Custom fetch | `useSyncTrigger` from `hooks/use-sync.ts` | Already handles POST /sync/trigger with cache invalidation |
| Platform icon config | Inline icon colors | `PLATFORM_CONFIG` from `components/setup/platform-config.ts` | Already has Canvas red / Ed blue icon + bg config |
| Hand-drawn card borders | Custom SVG drawing | `RoughCard` component | Handles ResizeObserver, rAF burst, seed-based determinism |

**Key insight:** This phase is primarily a composition exercise. Nearly all data operations, UI primitives, and design system components already exist. The new work is layout (scroll-spy nav, section composition) and the Notifications section (new form controls).

## Common Pitfalls

### Pitfall 1: Scroll-Spy + Smooth Scroll Race Condition
**What goes wrong:** Clicking a nav item triggers smooth scroll, which fires IntersectionObserver entries for intermediate sections, causing nav to flash through multiple active states
**Why it happens:** Smooth scroll traverses multiple sections, each triggering observer callbacks
**How to avoid:** Disable observer updates during programmatic scroll (set a `isScrolling` flag, clear after scroll completes via `setTimeout` ~800ms), OR use `scrollIntoView({ behavior: 'smooth' })` with a click-driven override that forces the target section active immediately
**Warning signs:** Nav item flickering when clicking distant sections

### Pitfall 2: TokenInput Reuse -- Different Context Than Setup
**What goes wrong:** TokenInput from setup page may have setup-specific behavior (e.g., auto-advance to next step)
**Why it happens:** TokenInput in setup is used within a multi-step wizard with different state management
**How to avoid:** Review TokenInput props interface -- it's actually a clean, self-contained component with `platform`, `value`, `onChange`, `status`, `error`, `onClear`. No setup-specific coupling. Safe to reuse directly.
**Warning signs:** None -- TokenInput is well-isolated

### Pitfall 3: GPA Slider + Numeric Input Bidirectional Sync
**What goes wrong:** Circular updates where slider change triggers numeric input change which triggers slider change
**Why it happens:** Both inputs share state and both have onChange handlers
**How to avoid:** Use single `useState` for the GPA value, both inputs read from and write to the same state. React batches state updates, so no infinite loop occurs naturally. Ensure `step={0.5}` on both inputs.
**Warning signs:** Laggy slider movement, infinite re-renders

### Pitfall 4: Portal Target Not Found on SSR
**What goes wrong:** `document.getElementById("right-panel-slot")` returns null during SSR or before mount
**Why it happens:** Portal target exists in `RightPanel` component which renders in `AppShell` -- it may not be in DOM during initial render
**How to avoid:** Use `useEffect` to set portal target (established pattern). Already solved in every prior page.
**Warning signs:** Right panel content not appearing

### Pitfall 5: jsdom Missing scrollTo/scrollIntoView in Tests
**What goes wrong:** Tests crash with `scrollIntoView is not a function`
**Why it happens:** jsdom does not implement scroll APIs
**How to avoid:** Add guard `if (typeof element.scrollIntoView === 'function')` in component code (project CLAUDE.md documents this pattern), or mock in tests: `Element.prototype.scrollIntoView = vi.fn()`
**Warning signs:** Test failures mentioning scrollTo/scrollIntoView

### Pitfall 6: Native Dialog in jsdom
**What goes wrong:** `<dialog>` `showModal()` method not available in jsdom
**Why it happens:** jsdom has incomplete dialog element support
**How to avoid:** Mock `HTMLDialogElement.prototype.showModal` and `close` in test setup, or use ref-based approach with conditional rendering
**Warning signs:** Test errors about showModal not being a function

### Pitfall 7: Settings Nav Hidden Below 900px -- Use min-[900px] Not md
**What goes wrong:** Using Tailwind `md:` breakpoint (768px) instead of prototype's 900px breakpoint
**Why it happens:** Developers default to standard Tailwind breakpoints
**How to avoid:** Use arbitrary value `min-[900px]:flex` (established in Phase 03 BrandPanel). The prototype CSS explicitly uses `@media(max-width:900px){.settings-nav{display:none}}`
**Warning signs:** Nav visible/hidden at wrong breakpoint

## Code Examples

Verified patterns from the existing codebase:

### Existing Hook Usage -- User Profile
```typescript
// Source: frontend/hooks/use-user.ts
const { data: userData, isLoading } = useCurrentUser();
const updateProfile = useUpdateProfile();

// Save GPA target
updateProfile.mutate({ gpa_target: 75.0 });

// Save display name
updateProfile.mutate({ display_name: "New Name" });
```

### Existing Hook Usage -- Token Management
```typescript
// Source: frontend/hooks/use-user.ts
const configureToken = useConfigureToken();
const deleteToken = useDeleteToken();

// Update token
configureToken.mutate({
  platform: "canvas",
  body: { token: "12345~AbCdEfGhIjKlMnOpQrStUv" },
});

// Delete all tokens (disconnect)
deleteToken.mutate({ platform: "canvas" });
deleteToken.mutate({ platform: "ed" });
```

### Existing Hook Usage -- Sync Trigger
```typescript
// Source: frontend/hooks/use-sync.ts
const syncTrigger = useSyncTrigger();

// Force full sync
syncTrigger.mutate({ scope: "all" });
```

### Existing Hook Usage -- Data Export
```typescript
// Source: frontend/hooks/use-user.ts
const { data: exportData, refetch: triggerExport } = useExportData();

// On-demand trigger (enabled: false means it won't auto-fetch)
triggerExport();
```

### Existing Hook Usage -- Delete Account
```typescript
// Source: frontend/hooks/use-user.ts
const deleteAccount = useDeleteAccount();

// After user confirms by typing DELETE
deleteAccount.mutate(undefined);
```

### Token Validation
```typescript
// Source: frontend/lib/validations/token.ts
import { validateCanvasToken, validateEdToken } from "@/lib/validations/token";

validateCanvasToken("12345~AbCdEfGhIjKlMnOp"); // true
validateEdToken("abc-123_token"); // true
```

### Grade Band for GPA Target Display
```typescript
// Source: frontend/lib/utils/grade-band.ts
import { getGradeBand } from "@/lib/utils/grade-band";

getGradeBand(85);  // "HD"
getGradeBand(75);  // "D"
getGradeBand(65);  // "CR"
getGradeBand(50);  // "P"
getGradeBand(49);  // "F"
```

### Platform Config for Token Section Icons
```typescript
// Source: frontend/components/setup/platform-config.ts
import { PLATFORM_CONFIG } from "@/components/setup/platform-config";

// Canvas: red icon bg, GraduationCap icon
// Ed: blue icon bg, MessageCircle icon
const config = PLATFORM_CONFIG["canvas"];
// { icon: LayoutDashboard, iconBg: "rgba(217,60,50,.08)", iconColor: "#d93c32" }
```

### User Schema (OpenAPI Generated Types)
```typescript
// Source: frontend/lib/api/types.gen.d.ts
// User has: id, email, display_name, gpa_target (number|null), gpa_scale, tokens.canvas, tokens.ed, created_at
// TokenStatus has: status ("active"|"invalid"|"not_configured"), last_verified_at (string|null)
```

### Mock User Fixture
```typescript
// Source: frontend/lib/fixtures/users.ts
// mockUser has:
// - gpa_target: 85.0
// - tokens.canvas.status: "active", tokens.ed.status: "active"
// - created_at: "2026-02-01T00:00:00Z"
// - display_name: "Alex Chen", email: "student@sydney.edu.au"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scroll event listener + manual offset calc | IntersectionObserver | Widely supported since 2020+ | More performant, no jank, declarative |
| Custom modal overlays | Native HTML `<dialog>` | Baseline 2022+ | Built-in focus trap, Escape, backdrop |
| Form libraries for all forms | useState for simple forms | N/A | Less bundle size, no over-abstraction for 2-3 fields |

**Deprecated/outdated:**
- None applicable -- this phase uses established project patterns only

## Open Questions

1. **Notification Controls: Interactive or Coming Soon?**
   - What we know: CONTEXT.md leaves this to Claude's discretion. Backend notification infrastructure does not exist yet.
   - What's unclear: Whether mock persistence (localStorage or in-memory) adds enough value for M1 demo
   - Recommendation: Make controls **interactive with localStorage persistence**. This provides a better demo experience and the component structure will be reused when backend is ready. Toggle state saved to localStorage under a `uniboard-notification-prefs` key. Simpler than disabled "Coming Soon" labels and more impressive for stakeholders.

2. **Notification UI Pattern: Toggles vs Checkboxes?**
   - What we know: CONTEXT.md leaves this to Claude's discretion.
   - Recommendation: Use **toggle switches** (styled `<input type="checkbox">` with Tailwind). Toggles are the standard pattern for settings pages and match the warm/organic design system better than checkboxes. The deadline reminder toggles (72h/24h/3h) naturally fit as independent on/off switches.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.0 + @testing-library/react |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run __tests__/settings/ --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-06-a | Token management shows connection status (Active/Invalid/Not Configured) | unit | `cd frontend && npx vitest run __tests__/settings/TokensSection.test.tsx -x` | Wave 0 |
| UI-06-b | Notification preferences with toggleable deadline reminders (72h/24h/3h) | unit | `cd frontend && npx vitest run __tests__/settings/NotificationsSection.test.tsx -x` | Wave 0 |
| UI-06-c | GPA target slider + numeric input save and persist | unit | `cd frontend && npx vitest run __tests__/settings/GpaTargetSection.test.tsx -x` | Wave 0 |
| UI-06-d | Profile displays email, allows display name edit | unit | `cd frontend && npx vitest run __tests__/settings/ProfileSection.test.tsx -x` | Wave 0 |
| UI-06-e | Danger zone: disconnect tokens, delete account with DELETE confirmation | unit | `cd frontend && npx vitest run __tests__/settings/DangerZoneSection.test.tsx -x` | Wave 0 |
| UI-06-f | Scroll-spy nav highlights active section | unit | `cd frontend && npx vitest run __tests__/settings/SettingsPage.test.tsx -x` | Wave 0 |
| UI-06-g | Right panel shows account card, sync status, quick actions, about | unit | `cd frontend && npx vitest run __tests__/settings/SettingsPage.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run __tests__/settings/ --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/settings/SettingsPage.test.tsx` -- page-level integration (portal, nav, sections rendering)
- [ ] `frontend/__tests__/settings/TokensSection.test.tsx` -- token CRUD, status badges, visibility toggle
- [ ] `frontend/__tests__/settings/GpaTargetSection.test.tsx` -- slider/input sync, grade band display, save
- [ ] `frontend/__tests__/settings/NotificationsSection.test.tsx` -- toggle interactions, localStorage persistence
- [ ] `frontend/__tests__/settings/DangerZoneSection.test.tsx` -- disconnect dialog, delete account with DELETE confirmation
- [ ] `frontend/__tests__/settings/ProfileSection.test.tsx` -- display name edit, email readonly, save
- [ ] Mock `scrollIntoView` in test setup: `Element.prototype.scrollIntoView = vi.fn()` in setup.ts or per-file
- [ ] Mock `IntersectionObserver` if not already polyfilled (check existing setup.ts -- ResizeObserver is polyfilled but IntersectionObserver may need addition)

## Sources

### Primary (HIGH confidence)
- Project codebase on `main` branch -- all hooks, components, patterns verified via `git show`
- `prototype/settings.html` -- complete HTML/CSS/JS prototype with all sections, right panel, scroll-spy nav
- `frontend/lib/api/types.gen.d.ts` -- OpenAPI generated types for User, TokenStatus schemas
- `frontend/lib/fixtures/users.ts` -- mock user data structure
- `frontend/hooks/use-user.ts` -- all user-related TanStack Query hooks
- `frontend/hooks/use-sync.ts` -- sync status and trigger hooks
- `frontend/components/setup/TokenInput.tsx` -- reusable token input component
- `frontend/lib/validations/token.ts` -- Canvas/Ed token regex validation
- `frontend/lib/utils/grade-band.ts` -- USYD grade band calculation

### Secondary (MEDIUM confidence)
- IntersectionObserver API -- well-documented MDN standard, widely supported
- Native HTML `<dialog>` -- baseline support since 2022, used in Phase 05

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already in project, zero new dependencies
- Architecture: HIGH -- follows 11 prior phases of established patterns (route file, page component, portal-slot, RoughCard, AnimatedEntry, i18n)
- Pitfalls: HIGH -- scroll-spy race condition and jsdom limitations are well-documented; other pitfalls derived from project-specific CLAUDE.md learned patterns

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable -- no external dependencies, all internal codebase)
