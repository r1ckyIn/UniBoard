# Phase 3: Auth Page - Research

**Researched:** 2026-03-21
**Domain:** React auth page UI (form validation, animations, routing, i18n)
**Confidence:** HIGH

## Summary

Phase 3 builds a standalone authentication page with login and register flows, polished entrance/switching animations, and full i18n support. The existing codebase already provides most backend infrastructure: mock API Route Handlers for all auth endpoints, zustand auth store with persist, TanStack Query mutation hooks (useLogin, useRegister, useLogout, useRefreshToken), and the design system (RoughCard, HeroDoodles, withClientOnly). The phase is primarily a frontend UI implementation task.

The main technical challenges are: (1) achieving extremely fluid form-switching animation with height morphing and Rough.js border redraw, (2) comprehensive client-side form validation with custom inline error components matching UniBoard's aesthetic, and (3) auth guard middleware that integrates client-side zustand state with Next.js middleware. The existing `(auth)` route group layout already exists as a skeleton.

**Primary recommendation:** Use `motion` (v12.38.0) for form-switching animations (layout prop + AnimatePresence for height morphing), `react-hook-form` + `zod` + `@hookform/resolvers` for form validation, and `sonner` for the forgot-password placeholder toast. Auth guard should be client-side (zustand-based redirect in a wrapper component) since Next.js middleware runs on Edge and cannot access zustand's localStorage state.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two-panel layout: left brand showcase + right auth form card (from prototype)
- Remove Tab toggle at top -- use bottom link only ("Don't have an account? Create one" / "Already have an account? Sign in") following mainstream SaaS best practice
- Login form is default view; register form accessible via bottom link
- Left brand panel content: UniBoard logo, "Your GPA, Maximized." tagline, three feature highlights (GPA Tracking, Smart Digest, Deadline Intelligence)
- Standalone layout -- Auth page does NOT use AppShell (no Sidebar/Header)
- Colorful Dashboard-style Rough.js doodles (NOT the grey prototype doodles) -- orange stars (#d97757), blue/green dot clusters (#6a9bcc, #788c5d), sparkle flashes, wavy lines (#ddd8ce)
- Doodles scattered across full-screen background at lower opacity than Dashboard (~0.15-0.20)
- Paper texture (SVG fractalNoise grain + ruled lines) applied same as other pages
- Staggered layer-by-layer entrance: doodles fadeIn first -> brand logo slideUp -> tagline slideUp -> feature cards slideUp -> form card slideUp with Rough.js border draw
- Each element ~600ms duration, cubic-bezier(.16,1,.3,1), staggered delays ~80-100ms apart
- Smart routing after login: check tokenConfigured state -- if configured -> /dashboard, if not -> /setup
- Register flow: register API success -> auto-set auth state -> show success overlay ("Account Created!") -> click "Continue to Setup" -> /setup
- Auth guard: authenticated users visiting /auth are auto-redirected (smart routing based on tokenConfigured)
- Forgot password: placeholder toast -- "Password reset is not available in demo mode"
- Auth page fully supports EN/ZH via next-intl
- Language switcher: small button in top-right corner of the page
- Disable browser native validation (noValidate) -- replace with custom inline error components
- Email restricted to @uni.sydney.edu.au domain only
- Password strength meter (4-bar indicator) follows prototype behavior -- real-time update on input
- Single page: /[locale]/auth -- login is default, register switches via in-page animation
- File: app/[locale]/(auth)/auth/page.tsx
- Separate route group (auth) with its own layout (no AppShell)

### Claude's Discretion
- Form switching animation specifics (spring parameters, stagger timing, exit direction)
- Error display pattern per error type (inline, toast, button state)
- Form validation trigger timing (real-time, blur, submit, or hybrid)
- Loading state design during API calls (button spinner, skeleton, etc.)
- Exact Rough.js doodle placement and density on auth page background
- Password strength bar colors and labels

### Deferred Ideas (OUT OF SCOPE)
- Full password reset flow -- deferred to M2 backend implementation
- Multi-university email domain support -- future expansion (currently USYD-only)
- OAuth / social login -- out of scope (simple JWT for MVP)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-09 | Auth page with login and register flows | Full-page auth with two-panel layout, form validation, animations, i18n, success overlay -- all covered by stack research below |
| PLAT-02 | User can access the full dashboard via web browser without installing anything | Auth page is the entry gate to the web dashboard; login/register flow enables web-only access |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 (installed) | App Router, route groups, middleware | Already project foundation |
| roughjs | 4.6.6 (installed) | Hand-drawn card borders, doodle backgrounds | Already used for design system |
| zustand | 5.0.12 (installed) | Auth state (accessToken, refreshToken, user, tokenConfigured) | Already implemented in store.ts |
| @tanstack/react-query | 5.91.2 (installed) | Auth mutations (useLogin, useRegister, etc.) | Already implemented in hooks/use-auth.ts |
| next-intl | 4.8.3 (installed) | EN/ZH i18n for all auth text | Already configured with routing |
| ky | 1.14.3 (installed) | HTTP client for API calls | Already configured with auth token injection |
| lucide-react | 0.577.0 (installed) | Icons (Target, Radio, Calendar, Check, Eye, EyeOff, Globe, Loader2) | Already project standard |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| motion | 12.38.0 | Form-switching animation (layout, AnimatePresence, spring) | Form morph, entrance stagger, opacity crossfade |
| react-hook-form | 7.71.2 | Form state management, validation orchestration | Login + register form handling |
| @hookform/resolvers | 5.2.2 | Connect zod schemas to react-hook-form | Resolver bridge |
| zod | 4.3.6 | Validation schema (email, password, confirm) | Type-safe validation rules |
| sonner | 2.0.7 | Toast notifications | Forgot password placeholder, error toasts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| motion | CSS-only transitions | CSS `interpolate-size` for height:auto is Chromium-only (no Safari/Firefox). Motion gives cross-browser spring physics + AnimatePresence + layout prop -- critical for the "extremely high fluidity" requirement |
| react-hook-form + zod | Native React state + manual validation | RHF provides controlled re-render optimization, field-level error tracking, and mode: "onBlur"/"onChange" -- avoids reinventing validation orchestration |
| sonner | react-hot-toast | sonner has better Next.js App Router compatibility, smaller bundle, and UniBoard's warm aesthetic can style it easily |

**Installation:**
```bash
cd frontend && pnpm add motion react-hook-form @hookform/resolvers zod sonner
```

**Version verification:** All versions above verified via `npm view <package> version` on 2026-03-21.

## Architecture Patterns

### Recommended File Structure
```
frontend/
├── app/[locale]/(auth)/
│   ├── layout.tsx              # Auth layout (no AppShell, paper texture, doodles, language switcher, Toaster)
│   └── auth/
│       └── page.tsx            # Auth page component (orchestrates form state)
├── components/auth/
│   ├── AuthPage.tsx            # Main auth page (two-panel layout, entrance animation)
│   ├── BrandPanel.tsx          # Left panel (logo, tagline, feature highlights)
│   ├── AuthFormCard.tsx        # Right panel form card (RoughCard wrapper + switching logic)
│   ├── LoginForm.tsx           # Login form (react-hook-form + zod)
│   ├── RegisterForm.tsx        # Register form (react-hook-form + zod)
│   ├── PasswordStrengthMeter.tsx  # 4-bar visual indicator
│   ├── SuccessOverlay.tsx      # Post-registration success overlay
│   ├── AuthDoodles.tsx         # Colorful background doodles (adapted from HeroDoodles)
│   └── AuthGuard.tsx           # Client-side redirect for authenticated users
├── lib/validations/
│   └── auth.ts                 # Zod schemas: loginSchema, registerSchema
└── messages/
    ├── en.json                 # Add "auth" key with all EN strings
    └── zh.json                 # Add "auth" key with all ZH strings
```

### Pattern 1: Form Switching with Motion layout + AnimatePresence
**What:** Animate between login and register forms with smooth height morphing, opacity crossfade, and Rough.js border redraw.
**When to use:** When switching between login/register views.
**Example:**
```typescript
// AuthFormCard.tsx - form switching animation
import { motion, AnimatePresence } from "motion/react";

function AuthFormCard({ mode, onSwitch }: AuthFormCardProps) {
  return (
    <motion.div layout transition={{ layout: { type: "spring", stiffness: 300, damping: 30 } }}>
      <RoughCardAnimated> {/* Extends RoughCard with ResizeObserver-triggered border redraw */}
        <AnimatePresence mode="wait" initial={false}>
          {mode === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <LoginForm onSwitchToRegister={() => onSwitch("register")} />
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <RegisterForm onSwitchToLogin={() => onSwitch("login")} />
            </motion.div>
          )}
        </AnimatePresence>
      </RoughCardAnimated>
    </motion.div>
  );
}
```

### Pattern 2: Staggered Entrance Animation
**What:** Layer-by-layer entrance using motion's staggerChildren orchestration.
**When to use:** Page load animation.
**Example:**
```typescript
// AuthPage.tsx - entrance stagger
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};
```

### Pattern 3: Zod + React Hook Form Validation
**What:** Type-safe validation schemas with real-time inline errors.
**When to use:** Login and register form validation.
**Example:**
```typescript
// lib/validations/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .refine((e) => e.endsWith("@uni.sydney.edu.au"), {
      message: "Please use your USYD student email (@uni.sydney.edu.au)",
    }),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    displayName: z.string().min(1, "Display name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email format")
      .refine((e) => e.endsWith("@uni.sydney.edu.au"), {
        message: "Please use your USYD student email (@uni.sydney.edu.au)",
      }),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
```

### Pattern 4: Client-Side Auth Guard
**What:** Redirect authenticated users away from /auth using zustand state check.
**When to use:** Wrapping auth page content.
**Why not middleware:** Next.js middleware runs on Edge Runtime and cannot access zustand's localStorage-persisted state. The middleware only sees cookies/headers, not client state.
**Example:**
```typescript
// components/auth/AuthGuard.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, tokenConfigured } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(tokenConfigured ? "/dashboard" : "/setup");
    }
  }, [isAuthenticated, tokenConfigured, router]);

  if (isAuthenticated) return null; // or loading skeleton
  return <>{children}</>;
}
```

### Pattern 5: Password Strength Meter
**What:** Real-time 4-bar indicator matching prototype behavior.
**When to use:** Register form password field.
**Example:**
```typescript
// Scoring algorithm (from prototype)
function getPasswordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

// Bar colors: 1=red (#cc4455), 2=amber (#b08968), 3=amber (#b08968), 4=green (#788c5d)
// Labels: "Weak", "Fair", "Good", "Strong"
```

### Anti-Patterns to Avoid
- **Using Next.js middleware for auth guard with client state:** Middleware cannot access localStorage/zustand. Use a client-side wrapper component instead.
- **Animating height with CSS max-height hack:** Produces visible timing artifacts when estimated max-height is wrong. Use Motion's layout prop instead.
- **Re-implementing form state management:** Don't manually track touched/dirty/errors state -- react-hook-form handles this with optimized re-renders.
- **SSR rendering of Rough.js components:** Always wrap in `withClientOnly()` or use `"use client"` directive. Rough.js depends on DOM APIs.
- **Using browser native validation tooltips:** User explicitly requires `noValidate` and custom error components.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation orchestration | Manual useState per field + error tracking | react-hook-form + zod | Field-level re-render optimization, mode config (onBlur/onChange), automatic type inference |
| Height morphing animation | Manual RAF loop + getBoundingClientRect | Motion layout prop + AnimatePresence | Cross-browser spring physics, FLIP optimization, handles exit animations |
| Toast notifications | Custom toast component | sonner | Handles stacking, auto-dismiss, animation, accessibility |
| Password strength scoring | N/A (simple enough) | Custom function | Only 10 lines, matches prototype exactly -- library would be overkill |

**Key insight:** The prototype already has working animation logic (crossfade + height transition + border redraw) in vanilla JS. Translating this to React requires an animation library because React's declarative rendering model conflicts with imperative DOM measurement. Motion's `layout` prop solves this elegantly.

## Common Pitfalls

### Pitfall 1: Rough.js Border Not Redrawing During Height Animation
**What goes wrong:** When the form card morphs height (login -> register), the Rough.js SVG border remains at the old dimensions.
**Why it happens:** RoughCard's ResizeObserver fires, but if the animation is spring-based, the height changes continuously across many frames. A single ResizeObserver callback might miss intermediate states.
**How to avoid:** Use a `useMotionValueEvent` on the layout animation or a continuous ResizeObserver with rAF-debounced redraw (already implemented in RoughCard.tsx). Verify the existing ResizeObserver in RoughCard handles continuous size changes -- the current implementation already uses rAF debounce which is correct.
**Warning signs:** Border appears to "jump" at the end of the animation rather than smoothly tracking.

### Pitfall 2: Zustand Hydration Mismatch on Auth Guard
**What goes wrong:** On initial page load, zustand's `isAuthenticated` is `false` (default) until localStorage hydration completes. This causes a flash of auth page before redirect.
**Why it happens:** Zustand `persist` middleware hydrates asynchronously after first render.
**How to avoid:** Check hydration status before rendering. Use zustand's `onRehydrateStorage` callback or the `useHydration` pattern to show a loading state until hydration completes.
**Warning signs:** Brief flash of login form before redirect to dashboard for authenticated users.

### Pitfall 3: Motion + Next.js SSR Conflict
**What goes wrong:** Motion components attempt to measure layout during SSR, causing hydration mismatches.
**Why it happens:** Motion's layout animations need DOM measurements that don't exist during SSR.
**How to avoid:** Auth page components are already client-side (Rough.js requires it). Ensure the auth page.tsx uses `"use client"` or wraps animated content in ClientOnly/withClientOnly.
**Warning signs:** React hydration warning in console, layout shift on first load.

### Pitfall 4: Register Success Flow State Management
**What goes wrong:** After registration, the useRegister hook's onSuccess needs to: (1) call login API or set auth state directly, (2) show success overlay, (3) then navigate. Race conditions between state updates and navigation.
**Why it happens:** Multiple async operations need to be sequenced.
**How to avoid:** The existing useRegister hook does NOT auto-login (unlike useLogin). After register success, explicitly call `useAuthStore.getState().setAuth()` with mock tokens, then set local `showSuccess` state to true, then navigate on overlay button click (not automatically).
**Warning signs:** User is redirected before seeing success overlay, or success overlay appears but user is not authenticated.

### Pitfall 5: jsdom Limitations in Tests
**What goes wrong:** Tests fail because jsdom doesn't implement `scrollTo`, `ResizeObserver`, or `requestAnimationFrame` properly.
**Why it happens:** Auth page uses Rough.js (ResizeObserver), Motion animations (rAF), and potentially scroll behavior.
**How to avoid:** ResizeObserver polyfill already exists in test setup. May need to mock `motion/react` components as pass-through wrappers in tests, or use `vi.mock("motion/react")` to stub animations.
**Warning signs:** TypeError about undefined functions in test output.

### Pitfall 6: next-intl Message Key Collisions
**What goes wrong:** Adding auth-specific translations might conflict with existing keys.
**Why it happens:** Flat namespace structure in messages JSON.
**How to avoid:** Use `auth.` prefix for all new keys: `auth.login.title`, `auth.register.title`, `auth.validation.emailRequired`, etc. Follow existing pattern (nav.*, header.*, dashboard.*).
**Warning signs:** Wrong translation displayed, or missing translation fallback.

## Code Examples

### Existing Auth Store Integration
```typescript
// After login success (already in use-auth.ts):
useAuthStore.getState().setAuth(
  { access: access_token, refresh: refresh_token },
  { id: user.id, email: user.email, displayName: user.display_name }
);

// After register success (needs manual implementation):
// 1. Register API returns { user_id, pending_verification }
// 2. Auto-login: call login mutation OR directly set mock tokens
// 3. Show success overlay
// 4. Navigate to /setup on button click
```

### Existing (auth) Layout
```typescript
// frontend/app/[locale]/(auth)/layout.tsx — CURRENT (skeleton)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      {children}
    </div>
  );
}
// NEEDS: AuthDoodles background, language switcher, Sonner Toaster provider
```

### Mock API Response Shapes
```typescript
// POST /auth/login -> 200
{ access_token: "mock-jwt-...", refresh_token: "mock-jwt-...", expires_in: 900, user: mockUser }

// POST /auth/register -> 201
{ user_id: "usr_001", pending_verification: true }

// POST /auth/forgot-password -> 200
{ message: "Password reset code sent" }
```

### Sonner Toast for Forgot Password
```typescript
import { toast } from "sonner";

function handleForgotPassword() {
  toast("Password reset is not available in demo mode", {
    description: "This feature will be available in a future update.",
    duration: 4000,
  });
}
```

### AuthDoodles Adaptation from HeroDoodles
```typescript
// AuthDoodles.tsx — adapted from HeroDoodles.tsx
// Key differences from Dashboard HeroDoodles:
// 1. Lower opacity: 0.15-0.20 (vs 0.22-0.30 on dashboard)
// 2. Same colorful shapes (stars, dots, sparkles, waves)
// 3. Full-screen fixed positioning
// 4. Must use withClientOnly() wrapper for SSR safety
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion package | motion package (renamed) | 2024 v11+ | Import from "motion/react" not "framer-motion" |
| Manual height animation (measure + animate) | Motion layout prop | Motion v4+ (stable) | Single prop handles FLIP-based layout animation |
| Formik + Yup | react-hook-form + zod | 2023+ ecosystem shift | Better TypeScript inference, smaller bundle, fewer re-renders |
| CSS max-height hack for auto height | CSS interpolate-size / Motion layout | 2024-2025 | interpolate-size is Chromium-only; Motion is universal |
| next-intl v3 createSharedPathnamesNavigation | next-intl v4 defineRouting | 2024 | Project already uses v4 pattern |

**Deprecated/outdated:**
- `framer-motion` package name: Use `motion` instead (same library, renamed)
- `react-hook-form` v6 API: v7+ uses `register()` pattern, not `Controller` for basic fields
- CSS `transition: height` with fixed values: Use Motion layout or CSS `interpolate-size` (when browser support allows)

## Open Questions

1. **Register auto-login flow**
   - What we know: useRegister returns `{ user_id, pending_verification }`, useLogin returns tokens + user. Register mock doesn't return tokens.
   - What's unclear: Should we call the login mutation after register, or directly set mock tokens in zustand? The CONTEXT says "auto-set auth state (tokens + user in zustand store)".
   - Recommendation: After register success, call the login mutation with the same email/password (since mock login accepts any credentials). This tests the full flow and avoids hardcoding mock tokens in the register handler.

2. **Motion bundle size impact**
   - What we know: Motion (full) is ~32KB gzip. motion/react is tree-shakeable.
   - What's unclear: Whether this is acceptable for a project that currently has zero animation library dependencies.
   - Recommendation: Accept it. The "extremely high fluidity" requirement justifies a proper animation library. Motion will be reused across all future page transitions. Import only from "motion/react" for tree-shaking.

3. **Rough.js border redraw during spring animation**
   - What we know: RoughCard uses ResizeObserver with rAF debounce. Motion's spring transitions change height continuously over ~300-500ms.
   - What's unclear: Whether ResizeObserver fires frequently enough to produce smooth border redraw during spring animation.
   - Recommendation: Test during implementation. If ResizeObserver isn't smooth enough, use Motion's `onUpdate` callback to trigger border redraw on each animation frame. Fallback: use a fixed seed for rough.rectangle to avoid visual flicker from re-randomization.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | frontend/vitest.config.ts |
| Quick run command | `cd frontend && pnpm test -- --run __tests__/auth/` |
| Full suite command | `cd frontend && pnpm test -- --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-09-a | Login form renders with email + password fields | unit | `cd frontend && pnpm test -- --run __tests__/auth/LoginForm.test.tsx` | Wave 0 |
| UI-09-b | Register form renders with name + email + password + confirm fields | unit | `cd frontend && pnpm test -- --run __tests__/auth/RegisterForm.test.tsx` | Wave 0 |
| UI-09-c | Email validation rejects non-USYD domains | unit | `cd frontend && pnpm test -- --run __tests__/auth/validation.test.ts` | Wave 0 |
| UI-09-d | Password strength meter shows correct level | unit | `cd frontend && pnpm test -- --run __tests__/auth/PasswordStrengthMeter.test.tsx` | Wave 0 |
| UI-09-e | Form switching between login and register | unit | `cd frontend && pnpm test -- --run __tests__/auth/AuthFormCard.test.tsx` | Wave 0 |
| UI-09-f | Successful login stores JWT and redirects | unit | `cd frontend && pnpm test -- --run __tests__/auth/LoginForm.test.tsx` | Wave 0 |
| UI-09-g | Auth guard redirects authenticated users | unit | `cd frontend && pnpm test -- --run __tests__/auth/AuthGuard.test.tsx` | Wave 0 |
| UI-09-h | Success overlay after registration | unit | `cd frontend && pnpm test -- --run __tests__/auth/SuccessOverlay.test.tsx` | Wave 0 |
| PLAT-02 | Auth page accessible via browser at /auth | smoke | Manual browser check | N/A |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm test -- --run __tests__/auth/`
- **Per wave merge:** `cd frontend && pnpm test -- --run && pnpm lint && pnpm typecheck`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `__tests__/auth/LoginForm.test.tsx` -- covers UI-09-a, UI-09-f
- [ ] `__tests__/auth/RegisterForm.test.tsx` -- covers UI-09-b
- [ ] `__tests__/auth/validation.test.ts` -- covers UI-09-c (zod schemas)
- [ ] `__tests__/auth/PasswordStrengthMeter.test.tsx` -- covers UI-09-d
- [ ] `__tests__/auth/AuthFormCard.test.tsx` -- covers UI-09-e
- [ ] `__tests__/auth/AuthGuard.test.tsx` -- covers UI-09-g
- [ ] `__tests__/auth/SuccessOverlay.test.tsx` -- covers UI-09-h
- [ ] Motion mock setup: `vi.mock("motion/react")` in test files or shared mock

## Sources

### Primary (HIGH confidence)
- Existing project codebase: `frontend/hooks/use-auth.ts`, `frontend/lib/auth/store.ts`, `frontend/components/design-system/RoughCard.tsx`, `frontend/components/design-system/HeroDoodles.tsx`, `frontend/components/design-system/ClientOnly.tsx`
- Existing prototype: `prototype/auth.html` -- visual spec, animation behavior, form structure
- Existing mock APIs: `frontend/app/api/v1/auth/*/route.ts` -- all 6 endpoints
- Existing design system: `prototype/DESIGN_SYSTEM.md` -- CSS variables, animation patterns
- npm registry: verified all library versions via `npm view` on 2026-03-21

### Secondary (MEDIUM confidence)
- [Motion docs - Layout Animation](https://motion.dev/docs/react-layout-animations) -- layout prop, AnimatePresence, spring transitions
- [Motion docs - React Animation](https://motion.dev/docs/react-animation) -- variants, staggerChildren
- [React Hook Form docs](https://react-hook-form.com/docs/useform) -- useForm, register, validation modes
- [Contentful: react-hook-form + zod](https://www.contentful.com/blog/react-hook-form-validation-zod/) -- integration patterns
- [freeCodeCamp: zod + react-hook-form](https://www.freecodecamp.org/news/react-form-validation-zod-react-hook-form/) -- validation patterns
- [Next.js official auth guide](https://nextjs.org/docs/app/building-your-application/authentication) -- middleware + auth patterns

### Tertiary (LOW confidence)
- [CSS interpolate-size for height:auto](https://dev.to/srijan_karki/you-can-now-animate-height-auto-in-css-without-javascript-4o20) -- Chromium-only, not recommended for cross-browser yet

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core libraries already installed and proven; new deps are well-established ecosystem standards
- Architecture: HIGH -- follows existing project patterns (route groups, design system components, zustand store, i18n)
- Pitfalls: HIGH -- identified from real codebase analysis (jsdom setup, zustand hydration, Rough.js SSR) plus known issues from previous phases
- Animation approach: MEDIUM -- Motion layout + AnimatePresence is well-documented but Rough.js border redraw during spring animation needs runtime validation

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable libraries, no expected breaking changes)
