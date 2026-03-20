# Phase 1: Design System & Foundation - Research

**Researched:** 2026-03-20
**Domain:** Next.js frontend scaffolding, Rough.js design system, Tailwind CSS v4, i18n
**Confidence:** HIGH

## Summary

Phase 1 establishes the visual foundation and app shell for UniBoard. The project will start from a fresh `create-next-app` (deleting existing `frontend/`), building Next.js 15 with App Router, Tailwind CSS v4 (CSS-first configuration), next-intl v4 for i18n routing (EN/ZH), and a custom design system using Rough.js hand-drawn graphics. The core deliverables are: three-column layout (sidebar + main + right panel), paper texture background, warm color palette via Tailwind @theme, font loading (Source Serif 4 + Inter via next/font), and shared Rough.js design system components.

The biggest technical challenge is Rough.js SSR hydration -- Rough.js generates random-looking SVG paths that differ between server and client renders. The solution is to use `"use client"` directives with `next/dynamic` (ssr: false) for all Rough.js components, since these are purely decorative/visual and carry no SEO value.

**Primary recommendation:** Use `next/dynamic` with `ssr: false` for all Rough.js/RoughNotation components. Define the complete color system and layout tokens in Tailwind v4 `@theme`. Build only the 3 multi-page DS components (RoughCard, RoughNotationWrapper, HeroDoodles) in Phase 1; defer page-specific components (RoughDonut, RoughProgressBar, RoughTimeline) to their respective page phases.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Delete entire existing frontend/ directory and start fresh with create-next-app
- Completely reinitialize -- no dependency reuse from previous scaffolding
- All packages (roughjs, next-intl, TanStack Query, etc.) will be added fresh during setup
- HTML prototype files (prototype/) are preserved as the definitive visual reference
- HTML prototypes are the REAL implementation specification -- 1:1 pixel-perfect replication required
- All animations, transitions, hover effects, interactions from prototypes must be faithfully reproduced
- Every page Phase (3-12) must match its corresponding HTML prototype exactly
- Design documents (frontend_brief.md, DESIGN_SYSTEM.md) are aesthetic philosophy references only, not implementation specs
- Phase 1 has no page data -- it's pure infrastructure (shell, components, theme)
- Default language: auto-detect from browser language, fallback to English
- Two languages: English + Chinese (zh)
- Desktop-only -- faithfully replicate prototype's three-column layout
- Target users: university students on MacBooks (1440x900) and standard laptops (1366x768)
- Minimum supported width: ~1280px
- No mobile/tablet layouts (MOBILE-01 deferred to v2)

### Claude's Discretion
- Which DS components to build in Phase 1 vs defer to page Phases
- Rough.js SSR hydration strategy
- Mock data approach for future page Phases
- i18n key organization and Phase 1 translation scope
- Project directory structure within frontend/
- Exact Tailwind v4 theme configuration approach
- Minor visual refinements over prototype baseline

### Deferred Ideas (OUT OF SCOPE)
- Mobile/tablet responsive layout -- MOBILE-01 (v2)
- Page-specific functionality logic -- to be discussed in Phase 3-12
- Dark mode -- not in requirements
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-07 | All pages follow Anthropic-inspired design system: warm colors, paper texture, Rough.js hand-drawn borders, Source Serif 4 + Inter fonts | Tailwind @theme color system, globals.css paper texture, next/font setup, RoughCard/RoughNotationWrapper components |
| INFRA-10 | i18n support (English + Chinese) with next-intl | next-intl v4 routing setup, [locale] segment, middleware, message files, useTranslations hook |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.x (latest 15.x) | Framework -- App Router, SSR, routing | Project spec (TRD s13.1), React 19 compatible |
| react / react-dom | 19.1.0 | UI library | Required by Next.js 15 |
| tailwindcss | 4.2.x | Utility-first CSS with @theme configuration | CSS-first approach, no config.js needed |
| @tailwindcss/postcss | 4.x | PostCSS plugin for Tailwind v4 | Required for Next.js integration |
| next-intl | 4.8.3 | i18n routing, translations, locale detection | Project spec, App Router native support |
| roughjs | 4.6.6 | Hand-drawn SVG/Canvas graphics | Prototype spec -- all cards use hand-drawn borders |
| rough-notation | 0.5.1 | Hand-drawn text annotations | Prototype spec -- hero annotations, hover circles |
| react-rough-notation | 1.0.8 | React wrapper for rough-notation | Provides React component API for annotations |
| lucide-react | 0.577.x | Icon library (React components) | Prototype uses Lucide icons throughout |
| clsx | 2.1.1 | Conditional className utility | Standard React pattern for dynamic classes |

### Supporting (install now, used by page phases)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.91.x | Server state management | Phase 2+ (API data fetching) |
| zustand | 5.0.x | Client UI state | Phase 3+ (sidebar state, predictor store) |
| ky | 1.14.x | HTTP client (fetch-based) | Phase 2+ (API calls) |
| date-fns | 4.1.0 | Date formatting/manipulation | Phase 5+ (deadlines, calendar) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| roughjs (direct) | react-rough, react-roughjs | React wrappers are poorly maintained (last update 2+ years ago); direct roughjs with custom React wrappers gives full control |
| next-intl | next-i18next | next-intl is purpose-built for App Router; next-i18next was designed for Pages Router |
| @import url() fonts | next/font/google | next/font is recommended -- self-hosts fonts, eliminates external requests, auto-optimizes. Use next/font. |

**Installation:**
```bash
# Delete existing frontend and create fresh
rm -rf frontend
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --turbopack

# Install core dependencies
cd frontend
pnpm add roughjs@4.6.6 rough-notation@0.5.1 react-rough-notation@1.0.8 next-intl@4.8.3 lucide-react clsx

# Install supporting dependencies (used by later phases)
pnpm add @tanstack/react-query zustand ky date-fns

# Install dev dependencies
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Version verification (confirmed 2026-03-20):**
| Package | Registry Version | Status |
|---------|-----------------|--------|
| next | 16.2.0 (latest), 15.5.12 (v15 latest) | Use 15.x per existing package.json; v16 is available but migration not required |
| tailwindcss | 4.2.2 | Current |
| next-intl | 4.8.3 | Current |
| roughjs | 4.6.6 | Current (latest, stable since 2023) |
| rough-notation | 0.5.1 | Current |
| vitest | 4.1.0 | Current |
| lucide-react | 0.577.0 | Current |

**Note on Next.js version:** The existing package.json uses Next.js 15.5.12. The latest is 16.2.0, but since the TRD specifies 14+ and the existing scaffolding was 15.x, stick with 15.x to avoid migration complexity. create-next-app@latest may generate v16 -- if so, explicitly use `npx create-next-app@15` or pin in package.json after creation.

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── app/
│   ├── [locale]/                    # i18n routing segment
│   │   ├── layout.tsx               # Root locale layout (NextIntlClientProvider)
│   │   ├── (auth)/                  # Auth pages (no sidebar layout)
│   │   │   ├── layout.tsx           # Auth layout (full-page, no sidebar)
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (onboarding)/            # Onboarding flow (no sidebar)
│   │   │   └── setup/
│   │   │       └── page.tsx
│   │   └── (dashboard)/             # Dashboard pages (three-column layout)
│   │       ├── layout.tsx           # AppShell: Sidebar + Header + RightPanel
│   │       ├── page.tsx             # Dashboard home
│   │       ├── courses/
│   │       ├── deadlines/
│   │       ├── predict/
│   │       ├── digest/
│   │       ├── timetable/
│   │       └── settings/
│   ├── globals.css                  # Tailwind @theme, paper texture, base styles
│   ├── layout.tsx                   # Root layout (html, body, fonts)
│   └── not-found.tsx
├── components/
│   ├── design-system/               # Phase 1 DS components
│   │   ├── RoughCard.tsx            # Card with hand-drawn border
│   │   ├── RoughNotationWrapper.tsx # Wrapper for rough-notation annotations
│   │   ├── HeroDoodles.tsx          # Decorative Rough.js background shapes
│   │   └── ClientOnly.tsx           # SSR bypass wrapper (next/dynamic helper)
│   ├── layout/                      # App shell components
│   │   ├── Sidebar.tsx              # Collapsible icon sidebar
│   │   ├── Header.tsx               # Sticky header with search, notifications, avatar
│   │   ├── RightPanel.tsx           # Right sticky panel (profile, calendar, activity)
│   │   └── AppShell.tsx             # Three-column layout composition
│   └── shared/                      # Shared UI primitives
│       └── AnimatedEntry.tsx        # Staggered entrance animation wrapper
├── lib/
│   ├── i18n/
│   │   ├── routing.ts              # defineRouting config
│   │   ├── request.ts              # getRequestConfig
│   │   └── navigation.ts           # createNavigation (Link, useRouter, etc.)
│   └── utils/
│       └── cn.ts                   # clsx + twMerge helper
├── messages/
│   ├── en.json                     # English translations
│   └── zh.json                     # Chinese translations
├── middleware.ts                    # next-intl middleware
├── vitest.config.ts
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── tailwind.css → globals.css      # (Tailwind v4 uses @import "tailwindcss")
└── package.json
```

### Pattern 1: Rough.js SSR Hydration Strategy
**What:** All Rough.js components MUST be client-only to avoid hydration mismatches. Rough.js generates random SVG paths using `Math.random()` internally, producing different output on server vs client.
**When to use:** Every component that calls `rough.svg()`, `rough.canvas()`, or uses `RoughNotation`.
**Example:**
```typescript
// Source: Next.js docs + verified pattern
// components/design-system/ClientOnly.tsx
"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Wrap any component that uses Rough.js or browser APIs
 * to skip SSR entirely, preventing hydration mismatches.
 */
export function withClientOnly<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  return dynamic(importFn, {
    ssr: false,
    loading: () => <>{fallback ?? null}</>,
  });
}

// Usage in a page:
// const RoughCard = withClientOnly(() => import("@/components/design-system/RoughCard"));
```

### Pattern 2: Tailwind v4 @theme Color System
**What:** Define the entire UniBoard color palette, spacing, shadows, and fonts using Tailwind v4's CSS-first `@theme` directive.
**When to use:** globals.css -- single source of truth for all design tokens.
**Example:**
```css
/* Source: Tailwind CSS v4 docs + prototype/DESIGN_SYSTEM.md */
@import "tailwindcss";

@theme {
  /* Brand colors from prototype */
  --color-orange: #d97757;
  --color-orange-soft: rgba(217, 119, 87, 0.11);
  --color-blue: #6a9bcc;
  --color-blue-soft: rgba(106, 155, 204, 0.11);
  --color-green: #788c5d;
  --color-green-soft: rgba(120, 140, 93, 0.11);
  --color-amber: #b08968;
  --color-amber-soft: rgba(176, 137, 104, 0.11);

  /* Neutral palette */
  --color-dark: #e8ddd0;
  --color-cream: #faf9f5;
  --color-card-bg: #f6f5f0;
  --color-card-bg-hover: #efede6;
  --color-card-border: #e8e5dd;
  --color-text-1: #2d2d2a;
  --color-text-2: #6b6b65;
  --color-text-3: #9b9b94;
  --color-divider: #eae7e0;

  /* Fonts */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: "Source Serif 4", Georgia, serif;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(20, 20, 19, 0.04), 0 4px 14px rgba(20, 20, 19, 0.025);
  --shadow-card-hover: 0 2px 8px rgba(20, 20, 19, 0.06), 0 8px 24px rgba(20, 20, 19, 0.04);

  /* Border radius */
  --radius-card: 14px;
  --radius-sm: 8px;

  /* Custom animations */
  --animate-slide-up: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
```
This generates utility classes like `bg-orange`, `text-text-1`, `shadow-card`, `rounded-card`, etc.

### Pattern 3: next/font with Tailwind v4
**What:** Use `next/font/google` to self-host fonts and integrate with Tailwind via CSS variables.
**When to use:** Root layout.tsx.
**Example:**
```typescript
// Source: Next.js docs + Tailwind v4 docs
import { Inter, Source_Serif_4 } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif-4",
  display: "swap",
});

// In layout:
<html className={`${inter.variable} ${sourceSerif4.variable}`}>
```
Then in globals.css `@theme`:
```css
@theme inline {
  --font-sans: var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: var(--font-source-serif-4), Georgia, serif;
}
```

### Pattern 4: next-intl v4 with App Router
**What:** Locale-based routing with `[locale]` segment, middleware, and server/client translation hooks.
**When to use:** All pages and components that display user-facing text.
**Example:**
```typescript
// lib/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh"],
  defaultLocale: "en",
});

// lib/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);

// middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

### Pattern 5: Three-Column Layout (AppShell)
**What:** Fixed sidebar (68px collapsed, 224px on hover) + scrollable main content + sticky right panel (300px).
**When to use:** All `(dashboard)` route group pages.
**Example:**
```typescript
// Source: prototype/dashboard.html layout
// app/[locale]/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-5 px-6">
          <div className="flex gap-6">
            <div className="flex-1 flex flex-col gap-4">
              {children}
            </div>
            <RightPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Do NOT import roughjs in Server Components:** Rough.js accesses `document` and `Math.random()` -- always use `"use client"` + `ssr: false`.
- **Do NOT use @import url() for Google Fonts in globals.css:** Use `next/font/google` instead for self-hosting, performance, and privacy. The old scaffolding used `@import url(...)` which triggers external requests.
- **Do NOT create a tailwind.config.js:** Tailwind v4 is CSS-first. All theme configuration goes in `@theme` blocks inside globals.css.
- **Do NOT use `useRouter` from `next/navigation`:** Use `useRouter` from `@/lib/i18n/navigation` (created by `createNavigation(routing)`) to ensure locale-aware routing.
- **Do NOT mix raw CSS variables with @theme variables:** Use `@theme` for tokens that need utility classes (colors, fonts, shadows). Use `:root` or inline `style` only for non-utility values.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading + optimization | Manual `<link>` tags or `@import url()` | `next/font/google` (Inter, Source_Serif_4) | Self-hosting, CLS prevention, privacy, caching |
| i18n routing + middleware | Custom locale detection + redirects | next-intl `createMiddleware` + `defineRouting` | Handles Accept-Language, cookies, redirects, static params |
| Locale-aware Link/Router | Manual `/${locale}/path` construction | `createNavigation(routing)` from next-intl | Automatic locale prefix, type-safe paths |
| CSS variable-based design tokens | Raw `:root` CSS variables | Tailwind v4 `@theme` | Generates utility classes automatically (bg-orange, text-text-1) |
| Conditional class merging | Manual template literals | `clsx()` | Handles falsy values, arrays, objects cleanly |
| SSR-safe dynamic imports | Custom `typeof window` checks | `next/dynamic` with `ssr: false` | Official Next.js API, handles loading states |

**Key insight:** The prototype uses CDN-loaded libraries (Rough.js, Lucide, Rough Notation) with vanilla JS. In the React/Next.js version, every one of these must be wrapped in a client component boundary. Don't try to make them work with SSR -- they access browser APIs and produce non-deterministic output.

## Common Pitfalls

### Pitfall 1: Rough.js Hydration Mismatch
**What goes wrong:** Rough.js uses `Math.random()` internally to generate "sketchy" paths. Server render produces path A, client render produces path B -- React throws hydration error.
**Why it happens:** Rough.js is designed for browser-only use. There's no seed-based determinism option.
**How to avoid:** Use `next/dynamic` with `ssr: false` for ALL components that call rough.svg() or rough.canvas(). Accept that these components will flash-in on client load.
**Warning signs:** Console error "Text content does not match server-rendered HTML" or "Hydration failed because the initial UI does not match."

### Pitfall 2: Paper Grain z-index Blocking Interactions
**What goes wrong:** The paper grain overlay uses `z-index: 9999` with `pointer-events: none`. If `pointer-events: none` is accidentally removed or overridden, no clicks work anywhere.
**Why it happens:** The `body::before` pseudo-element covers the entire viewport at the highest z-index.
**How to avoid:** Never modify the paper grain overlay's `pointer-events` property. Test click interactions after implementing the background effects.
**Warning signs:** Buttons and links stop responding to clicks.

### Pitfall 3: Sidebar Width Transition Breaking Main Layout
**What goes wrong:** The sidebar expands from 68px to 224px on hover. If the main content uses `margin-left: var(--sidebar-w)` (68px), expanding the sidebar overlaps content.
**Why it happens:** The prototype uses `position: fixed` for the sidebar, so it overlaps naturally. But the main content still needs the correct left margin.
**How to avoid:** Sidebar is `position: fixed` -- it floats above content. Main wrapper uses `margin-left: var(--sidebar-w)` (68px constant). The sidebar expansion overlays on top of content, matching the prototype behavior.
**Warning signs:** Content shifts right when hovering over sidebar.

### Pitfall 4: next-intl Missing setRequestLocale
**What goes wrong:** Pages using next-intl hooks without `setRequestLocale(locale)` fail in static rendering / production builds.
**Why it happens:** next-intl needs to know the current locale during static generation. Without `setRequestLocale`, it can't determine which translations to use.
**How to avoid:** Call `setRequestLocale(locale)` at the top of every layout and page component that uses translation hooks. Include `generateStaticParams()` returning all locales.
**Warning signs:** Build errors mentioning "Unable to find locale" or translations showing wrong language.

### Pitfall 5: Tailwind v4 @theme vs :root Confusion
**What goes wrong:** Defining custom CSS variables in `:root` instead of `@theme` means no utility classes are generated.
**Why it happens:** Tailwind v4 changed from config.js to CSS-first. Old Tailwind v3 habits don't apply.
**How to avoid:** Use `@theme` for ALL design tokens that should have utility classes. Use `@theme inline` when referencing CSS variables from next/font or other runtime sources.
**Warning signs:** Writing `bg-[var(--color-orange)]` instead of `bg-orange` everywhere.

### Pitfall 6: jsdom Missing scrollTo/scrollIntoView (from CLAUDE.md)
**What goes wrong:** Component tests crash with "scrollTo is not a function" when testing components that use scroll APIs.
**Why it happens:** jsdom doesn't implement scroll APIs.
**How to avoid:** Guard scroll calls with `typeof element.scrollTo === "function"` in components. Or mock in test setup.
**Warning signs:** Test failures in sidebar, right panel, or any scrolling component.

### Pitfall 7: create-next-app Generating Next.js 16 Instead of 15
**What goes wrong:** Running `npx create-next-app@latest` may generate a Next.js 16 project, which has different file conventions (e.g., `proxy.ts` instead of `middleware.ts`).
**Why it happens:** Latest Next.js is 16.2.0 as of March 2026.
**How to avoid:** Explicitly use `npx create-next-app@15` or check the generated `package.json` version after creation and pin to 15.x if needed. Alternatively, accept v16 if feature-compatible.
**Warning signs:** Unfamiliar file structure, `proxy.ts` file, different routing conventions.

## Code Examples

Verified patterns from official sources:

### RoughCard Component (Client-Only)
```typescript
// Source: roughjs docs + Next.js dynamic import pattern
// components/design-system/RoughCard.tsx
"use client";

import { useRef, useEffect, type ReactNode } from "react";
import rough from "roughjs";

interface RoughCardProps {
  children: ReactNode;
  className?: string;
}

export default function RoughCard({ children, className }: RoughCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return;

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    svg.setAttribute("viewBox", `-4 -4 ${w + 8} ${h + 8}`);

    // Clear previous paths
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    const rect = rc.rectangle(0, 0, w, h, {
      stroke: "#d0cdc4",
      strokeWidth: 0.8,
      roughness: 1.0,
      bowing: 1,
      fill: "none",
    });
    svg.appendChild(rect);
  }, []);

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative overflow-visible bg-card-bg rounded-card shadow-card",
        "transition-shadow duration-[var(--ease)]",
        "hover:shadow-card-hover hover:-translate-y-px",
        className
      )}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[2] overflow-visible"
      />
      {children}
    </div>
  );
}
```

### Staggered Animation Entry
```typescript
// Source: prototype/DESIGN_SYSTEM.md section 7
// components/shared/AnimatedEntry.tsx
"use client";

import { type ReactNode } from "react";
import clsx from "clsx";

const DELAY_MAP: Record<number, string> = {
  1: "delay-[0.04s]",
  2: "delay-[0.09s]",
  3: "delay-[0.14s]",
  4: "delay-[0.19s]",
  5: "delay-[0.28s]",
  6: "delay-[0.38s]",
  7: "delay-[0.48s]",
  8: "delay-[0.56s]",
  9: "delay-[0.64s]",
  10: "delay-[0.72s]",
};

interface AnimatedEntryProps {
  children: ReactNode;
  delay?: number; // 1-10
  className?: string;
}

export default function AnimatedEntry({
  children,
  delay = 1,
  className,
}: AnimatedEntryProps) {
  return (
    <div
      className={clsx(
        "opacity-0 animate-slide-up",
        DELAY_MAP[delay] || "",
        className
      )}
      style={{ animationFillMode: "forwards" }}
    >
      {children}
    </div>
  );
}
```

### Paper Texture Background (CSS)
```css
/* Source: prototype/dashboard.html -- exact CSS from prototype */
/* This goes in globals.css AFTER @theme block */

body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.12;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
}

body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 31px,
    rgba(139, 115, 85, 0.02) 31px,
    rgba(139, 115, 85, 0.02) 32px
  );
}
```

## DS Component Phase Assignment (Claude's Discretion)

Based on analysis of which prototype pages use each component:

| Component | Used In Pages | Decision | Rationale |
|-----------|--------------|----------|-----------|
| **RoughCard** | ALL 8 dashboard pages | **Phase 1** | Universal -- every page has cards with hand-drawn borders |
| **RoughNotationWrapper** | Dashboard, Predict, Digest (3 pages) | **Phase 1** | Multi-page, annotation patterns vary but wrapper is shared |
| **HeroDoodles** | Dashboard, Auth (2 pages) | **Phase 1** | Shared decorative element, needed by Phase 3 (Auth) and Phase 5 (Dashboard) |
| **RoughDonut** | Dashboard, Course-detail (2 pages) | **Defer to Phase 5** (Dashboard page) | Complex chart component, tightly coupled to assessment data |
| **RoughProgressBar** | Dashboard, Courses, Course-detail, Predict (4 pages) | **Defer to Phase 5** (Dashboard page) | Despite multi-page use, implementation is simple (<30 lines) and data-dependent |
| **RoughTimeline** | Dashboard, Deadline (2 pages) | **Defer to Phase 5** (Dashboard page) | Data-dependent (deadline items), better built with real data shape |

**Phase 1 builds:** RoughCard, RoughNotationWrapper, HeroDoodles (3 components)
**Deferred:** RoughDonut, RoughProgressBar, RoughTimeline (3 components -- built in page phases where data shapes are known)

## i18n Scope for Phase 1 (Claude's Discretion)

Phase 1 i18n should include:
1. **Full routing infrastructure** -- middleware, [locale] segment, routing config, navigation utilities
2. **Nav/common labels** -- sidebar navigation items, header elements, common actions (loading, error, retry, save, cancel)
3. **Language switcher component** -- in header or settings area
4. **Placeholder page text** -- minimal text for shell components

Page-specific translations are added in each page phase (Phase 3-12).

```json
// messages/en.json -- Phase 1 scope
{
  "nav": {
    "dashboard": "Dashboard",
    "timetable": "Timetable",
    "courses": "Courses",
    "deadlines": "Deadlines",
    "predict": "Predict",
    "digest": "Digest",
    "settings": "Settings"
  },
  "header": {
    "search": "Search...",
    "notifications": "Notifications",
    "viewAll": "View all"
  },
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Retry",
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js (JS) | @theme in CSS (CSS-first) | Tailwind v4 (Jan 2025) | No config.js needed, define tokens directly in CSS |
| @import url() Google Fonts | next/font/google | Next.js 13+ (stable) | Self-hosted, no external requests, auto CLS optimization |
| React.lazy + Suspense | next/dynamic with ssr: false | Next.js 13+ App Router | Built-in SSR control, loading component support |
| Pages Router i18n | next-intl v4 with App Router | 2024-2025 | Native server component support, ~2KB bundle |
| middleware.ts | proxy.ts (Next.js 16) | Next.js 16 (2026) | Naming change only -- functionally identical. Use middleware.ts for v15. |

**Deprecated/outdated:**
- `tailwind.config.js` -- replaced by `@theme` in Tailwind v4 (still works but not recommended for new projects)
- `@import url()` for fonts in CSS -- replaced by `next/font` for optimization
- `next-i18next` -- designed for Pages Router, not recommended for App Router projects

## Open Questions

1. **Next.js 15 vs 16 for create-next-app**
   - What we know: Latest is 16.2.0. Existing scaffolding used 15.5.12. TRD says "14+".
   - What's unclear: Whether `create-next-app@latest` generates v16 by default and whether that causes breaking changes.
   - Recommendation: Try `create-next-app@latest` -- if it generates v16, check if next-intl v4 supports it (likely yes based on web search showing next-intl tutorial for Next.js 16). If incompatible, fall back to `create-next-app@15`.

2. **Right Panel Content in Phase 1**
   - What we know: Right panel has profile card, calendar, and activity feed -- all data-dependent.
   - What's unclear: Should Phase 1 render the right panel with placeholder/skeleton content, or leave it as a structural placeholder?
   - Recommendation: Build the right panel structure with static placeholder content (hardcoded name, empty calendar grid, empty activity list). Page phases will populate with real data.

3. **Rough.js ResizeObserver for Card Borders**
   - What we know: Hand-drawn borders are drawn based on element dimensions. If card resizes (e.g., content loads), borders become misaligned.
   - What's unclear: Whether ResizeObserver redraw is needed in Phase 1 or can be deferred.
   - Recommendation: Implement ResizeObserver in RoughCard from the start -- it's cheap and prevents a class of visual bugs in all page phases.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x + @testing-library/react 16.x |
| Config file | `frontend/vitest.config.ts` (created in Wave 0 setup) |
| Quick run command | `cd frontend && pnpm test -- --run` |
| Full suite command | `cd frontend && pnpm test -- --run --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-07-a | RoughCard renders without hydration error | unit | `cd frontend && pnpm vitest run __tests__/design-system/RoughCard.test.tsx` | Wave 0 |
| UI-07-b | Paper texture pseudo-elements present | smoke | Visual check (CSS pseudo-elements not testable in jsdom) | manual-only |
| UI-07-c | Font CSS variables applied to html element | unit | `cd frontend && pnpm vitest run __tests__/layout/fonts.test.tsx` | Wave 0 |
| UI-07-d | Three-column layout renders correctly | unit | `cd frontend && pnpm vitest run __tests__/layout/AppShell.test.tsx` | Wave 0 |
| UI-07-e | Sidebar collapses/expands (68px/224px) | unit | `cd frontend && pnpm vitest run __tests__/layout/Sidebar.test.tsx` | Wave 0 |
| INFRA-10-a | i18n routing redirects to /en by default | unit | `cd frontend && pnpm vitest run __tests__/i18n/routing.test.tsx` | Wave 0 |
| INFRA-10-b | Switching locale updates all nav labels | unit | `cd frontend && pnpm vitest run __tests__/i18n/translations.test.tsx` | Wave 0 |
| INFRA-10-c | Both en.json and zh.json have matching keys | unit | `cd frontend && pnpm vitest run __tests__/i18n/message-keys.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm test -- --run`
- **Per wave merge:** `cd frontend && pnpm test -- --run && pnpm lint && pnpm typecheck`
- **Phase gate:** Full suite green + `pnpm build` success before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/vitest.config.ts` -- test framework configuration
- [ ] `frontend/src/test/setup.ts` -- jsdom setup with @testing-library/jest-dom matchers
- [ ] `frontend/__tests__/design-system/` -- test directory for DS components
- [ ] `frontend/__tests__/layout/` -- test directory for layout components
- [ ] `frontend/__tests__/i18n/` -- test directory for i18n
- [ ] Framework install: `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS v4 Theme Variables](https://tailwindcss.com/docs/theme) -- @theme syntax, namespace conventions, verified via WebFetch
- [next-intl v4 App Router setup](https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing) -- routing, middleware, request config, verified via WebFetch
- [Next.js Font Optimization](https://nextjs.org/docs/app/getting-started/fonts) -- next/font/google, CSS variable integration
- [Next.js Dynamic Imports](https://nextjs.org/docs/app/getting-started/server-and-client-components) -- ssr: false pattern for client-only components
- [roughjs npm](https://www.npmjs.com/package/roughjs) -- v4.6.6, API documentation
- [rough-notation npm](https://www.npmjs.com/package/rough-notation) -- v0.5.1, annotate/annotationGroup API
- prototype/DESIGN_SYSTEM.md -- complete CSS variables, component patterns, JS initialization code (PRIMARY visual spec)

### Secondary (MEDIUM confidence)
- [Google Fonts in Next.js 15 + Tailwind v4](https://www.buildwithmatija.com/blog/how-to-use-custom-google-fonts-in-next-js-15-and-tailwind-v4) -- CSS variable + @theme inline pattern
- [next-intl complete guide 2026](https://intlpull.com/blog/next-intl-complete-guide-2026) -- v4 features, App Router integration
- [Next.js Hydration Errors guide](https://nextjs.org/docs/messages/react-hydration-error) -- official troubleshooting

### Tertiary (LOW confidence)
- Next.js 16 compatibility with next-intl v4 -- web search suggests it works (tutorials exist) but not officially verified in next-intl docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on npm registry with current versions
- Architecture: HIGH -- patterns derived from official docs (Next.js, Tailwind v4, next-intl) and cross-verified
- Pitfalls: HIGH -- Rough.js hydration issue is well-documented; other pitfalls from prototype analysis and CLAUDE.md recorded issues
- DS component assignment: MEDIUM -- based on prototype file analysis (grep counts), but page phase implementation may reveal additional sharing needs

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable ecosystem, no fast-moving dependencies)
