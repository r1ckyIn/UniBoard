# Phase 3: Frontend Dashboard - Research

**Researched:** 2026-03-16
**Domain:** Next.js frontend with custom design system (Rough.js, paper texture, TanStack Query, i18n)
**Confidence:** HIGH

## Summary

Phase 3 builds the complete UniBoard web frontend: a Next.js application with 7 pages (Dashboard, Timetable placeholder, Courses, Deadlines, Predict, Digest, Settings), plus login/register and a 3-step onboarding flow. The design system is fully custom -- no component library like shadcn/ui -- using Rough.js hand-drawn borders, paper grain texture, Rough Notation text annotations, and a warm color palette inspired by Anthropic's aesthetic.

The backend API (Phase 2) provides 12+ REST endpoints under `/api/v1/` with a `SuccessResponse<T>` wrapper pattern. The frontend must unwrap `{data: ..., meta: ...}` for every call and handle JWT authentication (Bearer token). A critical gap: the FastAPI backend currently has **no CORS middleware** -- this must be added as the first task or the frontend cannot connect during development.

**Primary recommendation:** Use Next.js 15 (stable, well-documented, pnpm 9+) with Tailwind CSS v4, TanStack Query v5 for data fetching, next-intl for i18n, and write all Rough.js components as client-only wrappers using `"use client"` + `dynamic(..., { ssr: false })`. Port CSS variables and layout directly from `prototype/dashboard.html`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Component library: **Pure custom components** -- no shadcn/ui, match prototype exactly
- Rough.js integration: **Canvas component wrapper** -- encapsulate `<RoughCard>`, `<RoughBorder>` etc. with internal canvas overlay for hand-drawn borders. Handle resize and SSR (client-only rendering)
- Rough Notation: **Auto-play on page load** -- staggered animation sequence on mount
- Paper texture: **CSS direct migration** -- SVG fractalNoise grain overlay + repeating-linear-gradient ruled lines from prototype
- Icons: **Lucide React** (`lucide-react` package)
- Fonts: **Inter** (body/UI) + **Source Serif 4** (headings/display) via Google Fonts
- Charts: **Rough.js hand-drawn charts** -- donut chart (pure arc), progress bars, trend lines
- CSS Variables: migrate all prototype CSS variables into Tailwind CSS config
- Dashboard Hero: **100vh first screen** -- greeting + date + encouragement + scroll prompt
- Onboarding: **3 steps** -- registration, token tutorial, paste tokens (both Canvas + Ed required)
- Login/Register: **Split-screen layout** -- left brand showcase, right form
- Navigation: **Three-column layout** -- narrow sidebar (68px -> 224px hover) | main | right panel (300px sticky)
- i18n: **next-intl** with App Router, URL prefix `/en/`, `/zh/`, default English
- Data: **TanStack Query v5** -- stale-while-revalidate, staleTime aligned with sync frequencies
- Empty states: **Skeleton + sync progress** with per-section error boundaries
- Page transitions: Simple fade in/out

### Claude's Discretion
- Right panel content per page
- Exact skeleton loading design patterns
- Exact Rough.js canvas component implementation details
- Responsive breakpoints and mobile layout specifics
- TanStack Query cache configuration details per endpoint
- Page transition animation timing and easing
- Digest page aggregation logic
- Rough.js chart implementation details (arc angles, roughness parameters)
- next-intl configuration and middleware setup

### Deferred Ideas (OUT OF SCOPE)
- AI-enhanced digest with urgency scoring -- Phase 4
- AI course material Q&A -- Phase 4
- Deadline reminder notifications -- Phase 4
- GPA risk alert display -- Phase 4
- Dark mode -- future
- Mobile-native app -- future
- Personalized dashboard layout -- v2
- AiStudyMate integration -- post-v1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAT-01 | User can complete registration and API token connection in 3 steps with visual guides | Onboarding flow design, auth API endpoints (POST /auth/register, PUT /users/me/tokens/{platform}), token validation pattern |
| PLAT-02 | User can access the full dashboard via web browser without installing anything | Next.js web application with all 7 pages, no native install required |
| UI-01 | Dashboard page with hero welcome, stats row, course grades table, deadline timeline, assessment weight chart | Dashboard layout from prototype, API: GET /gpa/summary, GET /deadlines, GET /gpa/trend |
| UI-02 | Courses page with grade overview, assessment breakdown, file navigation | API: GET /gpa/courses/{id}, GET /courses/{id}/materials, GET /courses/{id}/discussions |
| UI-03 | Deadlines page with calendar view and filterable timeline | API: GET /deadlines (with filters), GET /deadlines/conflicts, calendar component |
| UI-04 | Predict page with interactive What-if simulator | Client-side WAM calculation, sliders, API: GET /gpa/summary, POST/GET /gpa/what-if, POST /gpa/target |
| UI-05 | Digest page with daily intelligence digest | Client-side aggregation of grades, deadlines, discussions data |
| UI-06 | Settings page for token management, GPA target, profile | API: GET/PATCH /users/me, PUT/DELETE /users/me/tokens/{platform} |
| UI-07 | All pages follow Anthropic-inspired design system | Rough.js borders, paper texture, Source Serif 4 + Inter fonts, warm color palette |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x (latest 15.5+) | React framework with App Router | Stable, well-documented. TRD specifies 14+, 15 is the mature choice. Next.js 16 exists but has a breaking middleware->proxy rename that complicates next-intl setup -- 15 avoids this risk |
| react / react-dom | 19.x | UI library | Bundled with Next.js 15 |
| tailwindcss | 4.x | Utility-first CSS | v4 is production-ready (Jan 2025 release), CSS-native config, 5x faster builds. Use `@theme` directive for design tokens |
| @tanstack/react-query | 5.x | Server state management | Stale-while-revalidate, background refetch, error retry. TRD specifies v5 |
| roughjs | 4.6.6 | Hand-drawn graphics (SVG/Canvas) | Latest stable. No maintained React wrapper -- use raw API in client components |
| rough-notation | 0.5.1 | Hand-drawn text annotations | Latest stable. Use `react-rough-notation` (1.0.8) for React wrapper |
| next-intl | 3.x or 4.x | i18n with App Router | Native Server Component support, ~2KB bundle, URL-prefix routing |
| lucide-react | 0.577+ | Icons | Tree-shakeable, matches prototype's Lucide usage |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-rough-notation | 1.0.8 | React wrapper for rough-notation | For `<RoughNotation>` JSX components instead of imperative API |
| date-fns | 3.x | Date formatting/manipulation | Calendar component, deadline display, relative times |
| ky | 1.x | HTTP client (fetch-based) | API calls -- lightweight, auto-JSON, retry hooks. TRD specifies ky |
| zustand | 5.x | Client-side UI state | Sidebar open/close, predictor score state, active filters. TRD specifies Zustand |
| clsx | 2.x | Conditional class names | Combining Tailwind classes conditionally |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Next.js 15 | Next.js 16 | 16 is faster (Turbopack default) but has breaking middleware->proxy rename that complicates next-intl. 15 is safer for timeline |
| ky | axios / fetch | ky is lighter, fetch-based, better tree-shaking. TRD already chose ky |
| Zustand | React Context | Zustand avoids re-render cascades, no boilerplate |
| react-rough-notation | raw rough-notation | React wrapper provides declarative JSX. If issues arise, fall back to raw API in useEffect |
| Custom components | shadcn/ui | User decision: pure custom to match prototype exactly |

**Installation:**
```bash
cd frontend
pnpm create next-app@latest . --typescript --tailwind --eslint --app --turbopack --use-pnpm
pnpm add @tanstack/react-query roughjs rough-notation react-rough-notation next-intl lucide-react ky zustand date-fns clsx
pnpm add -D @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── app/
│   ├── [locale]/                    # i18n dynamic segment
│   │   ├── (auth)/                  # Auth pages (no sidebar layout)
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (onboarding)/            # Onboarding flow (standalone layout)
│   │   │   └── setup/
│   │   │       └── page.tsx         # 3-step onboarding (single page with steps)
│   │   ├── (dashboard)/             # Main app (sidebar + header layout)
│   │   │   ├── layout.tsx           # Sidebar + Header + RightPanel shell
│   │   │   ├── page.tsx             # Dashboard
│   │   │   ├── courses/page.tsx     # Course list
│   │   │   ├── courses/[id]/page.tsx # Course detail (expand)
│   │   │   ├── deadlines/page.tsx
│   │   │   ├── predict/page.tsx
│   │   │   ├── digest/page.tsx
│   │   │   ├── timetable/page.tsx   # Coming soon placeholder
│   │   │   └── settings/page.tsx
│   │   └── layout.tsx               # Root locale layout (providers)
│   ├── layout.tsx                   # HTML root
│   └── not-found.tsx
├── components/
│   ├── design-system/               # Core visual primitives
│   │   ├── RoughCard.tsx            # Card with hand-drawn SVG border
│   │   ├── RoughBorder.tsx          # Standalone rough border overlay
│   │   ├── RoughProgressBar.tsx     # Hand-drawn progress bar (canvas)
│   │   ├── RoughDonut.tsx           # Hand-drawn donut chart (SVG)
│   │   ├── RoughTimeline.tsx        # Timeline with rough line + dots
│   │   ├── RoughNotationWrapper.tsx # Staggered annotation animations
│   │   └── HeroDoodles.tsx          # Background doodle decorations
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── RightPanel.tsx
│   │   └── AppShell.tsx             # Assembles sidebar + header + content
│   ├── dashboard/                   # Dashboard-specific components
│   ├── courses/
│   ├── deadlines/
│   ├── predict/
│   ├── digest/
│   ├── settings/
│   ├── onboarding/
│   └── shared/                      # Buttons, inputs, skeleton, error boundary
├── lib/
│   ├── api/
│   │   ├── client.ts               # ky instance with auth interceptor
│   │   ├── types.ts                 # TypeScript types mirroring Pydantic schemas
│   │   └── endpoints.ts            # API endpoint constants
│   ├── hooks/                       # TanStack Query hooks
│   │   ├── useGPA.ts
│   │   ├── useDeadlines.ts
│   │   ├── useCourses.ts
│   │   ├── useSync.ts
│   │   ├── useAuth.ts
│   │   └── useUser.ts
│   ├── stores/                      # Zustand stores
│   │   ├── ui.ts                   # Sidebar state, active filters
│   │   └── predictor.ts            # What-if score state
│   ├── auth/
│   │   └── tokens.ts               # JWT storage/refresh logic
│   ├── i18n/
│   │   ├── routing.ts              # next-intl routing config
│   │   └── request.ts              # getRequestConfig
│   └── utils/
│       ├── gpa.ts                  # Client-side WAM/GPA calculation (for Predict)
│       └── dates.ts                # Date formatting helpers
├── messages/
│   ├── en.json                     # English translations
│   └── zh.json                     # Chinese translations
├── middleware.ts                    # next-intl middleware (locale detection + redirect)
├── app/globals.css                 # Tailwind v4 @import + @theme + paper texture
├── next.config.ts
├── tailwind.config.ts              # Minimal -- most config in globals.css @theme
├── tsconfig.json
└── package.json
```

### Pattern 1: Rough.js Client-Only Component Wrapper
**What:** Rough.js depends on browser DOM (SVG/Canvas). Must be client-only.
**When to use:** Every component that renders Rough.js graphics.
**Example:**
```typescript
// components/design-system/RoughCard.tsx
"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";

interface RoughCardProps {
  children: React.ReactNode;
  className?: string;
}

export function RoughCard({ children, className }: RoughCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drawBorder = useCallback(() => {
    const el = containerRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return;

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    svg.setAttribute("viewBox", `-4 -4 ${w + 8} ${h + 8}`);

    // Clear previous drawing
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    const node = rc.rectangle(0, 0, w, h, {
      stroke: "#d0cdc4",
      strokeWidth: 0.8,
      roughness: 1.0,
      bowing: 1,
      fill: "none",
    });
    svg.appendChild(node);
  }, []);

  useEffect(() => {
    // Double rAF for layout measurement (matches prototype pattern)
    requestAnimationFrame(() => {
      requestAnimationFrame(drawBorder);
    });

    const observer = new ResizeObserver(drawBorder);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [drawBorder]);

  return (
    <div ref={containerRef} className={className} style={{ position: "relative", overflow: "visible" }}>
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[2]"
        style={{ overflow: "visible" }}
      />
      {children}
    </div>
  );
}
```

### Pattern 2: API Client with Auth and Response Unwrapping
**What:** ky HTTP client configured with JWT auth and SuccessResponse unwrapping.
**When to use:** Every API call.
**Example:**
```typescript
// lib/api/client.ts
import ky from "ky";
import type { SuccessResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export const api = ky.create({
  prefixUrl: `${API_BASE}/api/v1`,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
  },
  retry: { limit: 2, methods: ["get"], statusCodes: [408, 502, 503, 504] },
  timeout: 15000,
});

// Unwrap SuccessResponse envelope
export async function unwrap<T>(promise: Promise<Response>): Promise<T> {
  const response: SuccessResponse<T> = await promise.then((r) => r.json());
  return response.data;
}
```

### Pattern 3: TanStack Query Hook with Stale-Time
**What:** Custom hook wrapping TanStack Query with correct staleTime per data type.
**When to use:** Every page that fetches data.
**Example:**
```typescript
// lib/hooks/useGPA.ts
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import type { GPASummaryResponse } from "../api/types";

export function useGPASummary() {
  return useQuery({
    queryKey: ["gpa", "summary"],
    queryFn: () => unwrap<GPASummaryResponse>(api.get("gpa/summary")),
    staleTime: 15 * 60 * 1000, // 15 min -- matches sync frequency for grades
  });
}
```

### Pattern 4: next-intl Locale Routing
**What:** URL-prefix i18n with `[locale]` segment.
**When to use:** All pages.
**Example:**
```typescript
// lib/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh"],
  defaultLocale: "en",
});

// middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

### Anti-Patterns to Avoid
- **Importing Rough.js in Server Components:** Rough.js touches the DOM. Always `"use client"` and if needed `dynamic(... { ssr: false })`.
- **Storing JWT in httpOnly cookies from the frontend:** The backend uses OAuth2PasswordRequestForm (form data), not cookie-based auth. Use localStorage for the access token and handle refresh manually.
- **Re-computing WAM on every render:** The Predict page should use `useMemo` or Zustand store for what-if calculations, not inline computation in JSX.
- **Fetching data in right panel independently:** The right panel shows summary data (WAM, calendar) that should share the same TanStack Query cache as the main content -- use the same query keys.
- **Building a custom calendar from scratch:** Use date-fns for date math and render a simple 7-column CSS grid (as prototype does). No heavy calendar library needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client with retry/auth | Custom fetch wrapper | ky with hooks | ky handles retry, timeout, JSON, auth hooks. 40+ edge cases |
| Server state cache | Manual useState + useEffect | TanStack Query v5 | Stale-while-revalidate, dedup, background refetch, error retry |
| i18n routing + locale detection | Manual URL parsing | next-intl middleware | Handles locale redirect, cookie preference, URL prefix, static generation |
| Date formatting / relative time | Custom date math | date-fns `format`, `formatDistanceToNow` | Locale-aware, edge cases (DST, timezone) |
| Calendar grid | Full calendar library | Simple 7-column CSS grid + date-fns | Prototype uses plain CSS grid. No need for react-big-calendar or similar |
| Client-side WAM calculation | Server round-trip | Port formula from `src/services/gpa.py` GPAService | Predict page needs instant feedback on slider drag. Download data once, compute locally |

**Key insight:** The design system is custom but the infrastructure (data fetching, routing, i18n) should use mature libraries. The Rough.js visual layer is pure client-side rendering that wraps standard HTML structure.

## Common Pitfalls

### Pitfall 1: No CORS on Backend
**What goes wrong:** Frontend at localhost:3000 calls backend at localhost:8000 -- browser blocks with CORS error.
**Why it happens:** FastAPI `main.py` currently has NO CORSMiddleware configured.
**How to avoid:** Add CORS middleware to backend as the very first task in Plan 03-01. Allow `http://localhost:3000` in development.
**Warning signs:** Network errors in browser console with "has been blocked by CORS policy."

### Pitfall 2: Rough.js SSR Crash
**What goes wrong:** Rough.js tries to access `document` or `window` during server-side rendering, causing a build/runtime error.
**Why it happens:** Next.js server-renders client components by default. Rough.js requires browser APIs.
**How to avoid:** All Rough.js components MUST use `"use client"` directive. For components that directly use `rough.canvas()` (which needs a real Canvas element), additionally use `next/dynamic` with `{ ssr: false }`. The SVG mode (`rough.svg()`) is safer but still needs client-only since it creates DOM nodes.
**Warning signs:** "document is not defined" or "window is not defined" errors during build.

### Pitfall 3: Tailwind v4 Config Migration
**What goes wrong:** Trying to use `tailwind.config.js` the v3 way with v4.
**Why it happens:** Tailwind v4 uses CSS-native configuration via `@theme` directive, not JS config file.
**How to avoid:** Define all design tokens in `globals.css` using `@theme { --color-*: ...; --font-*: ...; }`. The `tailwind.config.ts` file should be minimal or empty.
**Warning signs:** Custom colors/fonts not appearing, class names not generated.

### Pitfall 4: Login Form Data Format
**What goes wrong:** Frontend sends JSON body for login, backend expects form data.
**Why it happens:** Backend uses `OAuth2PasswordRequestForm` which expects `application/x-www-form-urlencoded`.
**How to avoid:** Login endpoint must send form data (not JSON). Use `URLSearchParams` or ky's `searchParams` option. Register endpoint uses JSON normally.
**Warning signs:** 422 Unprocessable Entity on login.

### Pitfall 5: next-intl Static Generation
**What goes wrong:** Build fails or locale routing broken in production.
**Why it happens:** Missing `generateStaticParams` for the `[locale]` segment.
**How to avoid:** Add `generateStaticParams` in `app/[locale]/layout.tsx` returning all locale values. Also configure the middleware matcher to exclude API routes and static files.
**Warning signs:** 404 on locale-prefixed routes, infinite redirects.

### Pitfall 6: ResizeObserver Loop in Rough.js Components
**What goes wrong:** Drawing Rough.js borders triggers resize which triggers redraw in an infinite loop.
**Why it happens:** Adding/modifying SVG can change layout dimensions, triggering ResizeObserver callback.
**How to avoid:** Compare previous dimensions before redrawing. Only redraw if width or height actually changed.
**Warning signs:** Console warnings about "ResizeObserver loop completed with undelivered notifications."

### Pitfall 7: TanStack Query SSR Hydration Mismatch
**What goes wrong:** Server-rendered content doesn't match client, causing flickering.
**Why it happens:** TanStack Query data not prefetched on server, or staleTime too low causing immediate refetch.
**How to avoid:** For this project, keep it simple -- do NOT use SSR prefetching for TanStack Query. All pages are behind auth, so there's no SEO benefit. Use client-side fetching with skeleton loading states. Set `staleTime` appropriately to avoid unnecessary refetches on page navigation.
**Warning signs:** Content flashes from empty to loaded, hydration mismatch warnings.

## Code Examples

### CSS Variables and Paper Texture (Tailwind v4)
```css
/* app/globals.css */
@import "tailwindcss";
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap");

@theme {
  /* Color palette from prototype */
  --color-dark: #e8ddd0;
  --color-cream: #faf9f5;
  --color-orange: #d97757;
  --color-orange-soft: rgba(217, 119, 87, 0.11);
  --color-blue: #6a9bcc;
  --color-blue-soft: rgba(106, 155, 204, 0.11);
  --color-green: #788c5d;
  --color-green-soft: rgba(120, 140, 93, 0.11);
  --color-amber: #b08968;
  --color-amber-soft: rgba(176, 137, 104, 0.11);

  --color-card-bg: #f6f5f0;
  --color-card-bg-hover: #efede6;
  --color-card-border: #e8e5dd;
  --color-text-1: #2d2d2a;
  --color-text-2: #6b6b65;
  --color-text-3: #9b9b94;
  --color-divider: #eae7e0;

  /* Typography */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: "Source Serif 4", Georgia, serif;

  /* Spacing / Sizing */
  --sidebar-w: 68px;
  --sidebar-w-expanded: 224px;
  --right-panel-w: 300px;
  --header-h: 56px;

  /* Radius */
  --radius-card: 14px;
  --radius-sm: 8px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(20, 20, 19, 0.04), 0 4px 14px rgba(20, 20, 19, 0.025);
  --shadow-card-hover: 0 2px 8px rgba(20, 20, 19, 0.06), 0 8px 24px rgba(20, 20, 19, 0.04);

  /* Transitions */
  --ease: 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  --ease-fast: 0.15s ease;
}

/* Paper grain overlay */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.12;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
}

/* Ruled lines */
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

### API Type Definitions (mirrors Pydantic schemas)
```typescript
// lib/api/types.ts

// Response envelope
export interface SuccessResponse<T> {
  data: T;
  meta: { request_id: string; timestamp: string };
}

export interface ErrorResponse {
  error: { code: string; message: string; details?: unknown };
  meta: { request_id: string; timestamp: string };
}

// GPA
export interface CourseSummary {
  course_id: string;
  course_name: string;
  course_code: string;
  semester: string;
  credit_points: number;
  wam: number;
  grade_band: string;
  gpa_point: number;
  pct_assessed: number;
  assessment_count: number;
  graded_count: number;
}

export interface GPASummaryResponse {
  cumulative_wam: number;
  cumulative_gpa: number;
  total_credit_points: number;
  course_count: number;
  courses: CourseSummary[];
}

export interface AssessmentDetail {
  id: string;
  name: string;
  score: number | null;
  max_score: number;
  weight: number;
  group_name: string;
}

export interface CourseDetailResponse {
  course_id: string;
  course_name: string;
  course_code: string;
  semester: string;
  credit_points: number;
  wam: number;
  grade_band: string;
  gpa_point: number;
  pct_assessed: number;
  assessments: AssessmentDetail[];
  weight_source: string;
}

// Deadlines
export interface DeadlineResponse {
  id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  title: string;
  due_date: string;
  source: string;
  source_tags: string[];
  weight: number | null;
  description: string | null;
  urgency: "urgent" | "warning" | "normal" | "past_due";
  is_confirmed: boolean;
}

// Auth
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterResponse {
  user_id: string;
  email: string;
  display_name: string;
}

// User
export interface TokenStatus {
  status: "active" | "invalid" | "not_configured";
  platform: string;
}

export interface UserResponse {
  id: string;
  email: string;
  display_name: string;
  gpa_target: number | null;
  gpa_scale: string;
  tokens: Record<string, TokenStatus>;
  created_at: string;
}

// Sync
export interface SyncStatusResponse {
  sources: Array<{
    platform: string;
    status: string;
    last_synced_at: string | null;
    token_status: string;
  }>;
  is_syncing: boolean;
}

// Materials
export interface FolderResponse {
  id: string;
  name: string;
  source: string;
  position: number;
  item_count: number;
  ai_description: string | null;
  items: Array<{
    id: string;
    title: string;
    type: string;
    url: string | null;
    source: string;
  }> | null;
}

// Intelligence
export interface HighValuePostResponse {
  id: string;
  ed_thread_id: string;
  title: string;
  category: string;
  content_summary: string;
  is_endorsed: boolean;
  is_staff_post: boolean;
  created_at: string;
}
```

### Backend API Endpoints Reference
```
Authentication:
  POST /api/v1/auth/register       -> RegisterResponse (JSON body)
  POST /api/v1/auth/login          -> LoginResponse (form data: username=email, password)
  POST /api/v1/auth/refresh        -> LoginResponse (JSON body: refresh_token)

User:
  GET  /api/v1/users/me            -> UserResponse
  PATCH /api/v1/users/me           -> UserResponse
  PUT  /api/v1/users/me/tokens/{platform} -> TokenConfigResponse
  DELETE /api/v1/users/me/tokens/{platform}

GPA:
  GET  /api/v1/gpa/summary         -> GPASummaryResponse
  GET  /api/v1/gpa/courses/{id}    -> CourseDetailResponse
  POST /api/v1/gpa/what-if         -> WhatIfScenarioResponse (201)
  GET  /api/v1/gpa/what-if         -> WhatIfScenarioResponse[]
  POST /api/v1/gpa/target          -> TargetPathResponse
  GET  /api/v1/gpa/trend           -> TrendResponse

Deadlines:
  GET  /api/v1/deadlines           -> DeadlineResponse[]
    Query: course_code, urgency, from_date, to_date, include_past, sort, order
  GET  /api/v1/deadlines/conflicts -> ConflictDay[]
  GET  /api/v1/deadlines/{id}      -> DeadlineDetailResponse

Materials:
  GET  /api/v1/courses/{id}/materials           -> CourseMaterialsResponse
  GET  /api/v1/courses/{id}/materials/{folderId} -> FolderResponse
  GET  /api/v1/search?q=...                      -> SearchResponse

Intelligence:
  GET  /api/v1/courses/{id}/discussions -> HighValuePostResponse[]

Sync:
  POST /api/v1/sync/trigger        -> SyncTriggerResponse
  GET  /api/v1/sync/status         -> SyncStatusResponse

Health:
  GET  /health                     -> HealthResponse (no auth required)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js (v3) | `@theme` directive in CSS (v4) | Jan 2025 | All design tokens defined in CSS, not JS. Faster builds |
| middleware.ts (Next.js 15) | proxy.ts (Next.js 16) | Oct 2025 | We stay on Next.js 15 to avoid this migration for next-intl |
| TanStack Query getServerSideProps | HydrationBoundary pattern | v5 (2024) | But we skip SSR prefetch since all pages are auth-gated |
| CSS Modules / styled-components | Tailwind CSS utility-first | 2023+ | Prototype already uses utility-style inline CSS. Natural fit |
| React.lazy + Suspense | next/dynamic with ssr: false | Next.js 13+ | Preferred way to client-only render canvas/SVG libs |

**Deprecated/outdated:**
- `tailwind.config.js` with full JS config -- v4 uses CSS-native `@theme`. Minimal JS config only for plugins
- `getServerSideProps` / `getStaticProps` -- replaced by App Router patterns (Server Components, generateStaticParams)
- `react-rough` / `react-roughjs` wrapper packages -- all abandoned (6 years old), use raw roughjs directly

## Open Questions

1. **Next.js 15 exact version**
   - What we know: 15.5+ is latest in 15.x line with good TypeScript + Turbopack support
   - What's unclear: Whether `create-next-app@latest` installs 15 or 16 by default
   - Recommendation: Pin with `pnpm create next-app@15` to ensure 15.x. If create-next-app no longer supports 15, use `next@^15` in package.json

2. **Token storage strategy (localStorage vs memory)**
   - What we know: Backend issues JWT access + refresh tokens. No httpOnly cookie support
   - What's unclear: Security posture for MVP. localStorage is vulnerable to XSS but simplest
   - Recommendation: Use localStorage for MVP (matches TRD). Add note for production to move to httpOnly cookie via backend proxy

3. **Rough.js performance with many cards**
   - What we know: Each card draws an SVG rectangle. Dashboard has ~8 cards, Courses page could have many
   - What's unclear: Performance impact of 20+ Rough.js SVG rectangles on a single page
   - Recommendation: Lazy-draw with IntersectionObserver for below-fold cards. Profile during development

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (via Next.js) or Vitest -- determine at scaffolding time |
| Config file | `frontend/jest.config.ts` or `frontend/vitest.config.ts` -- Wave 0 |
| Quick run command | `cd frontend && pnpm test` |
| Full suite command | `cd frontend && pnpm test --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAT-01 | 3-step onboarding completes registration + token setup | integration | `pnpm test -- --testPathPattern onboarding` | Wave 0 |
| PLAT-02 | Dashboard accessible via browser | smoke | `pnpm build` (ensures all pages compile) | Wave 0 |
| UI-01 | Dashboard renders hero, stats, grades, timeline, donut | unit | `pnpm test -- --testPathPattern dashboard` | Wave 0 |
| UI-02 | Courses page renders course list and detail expand | unit | `pnpm test -- --testPathPattern courses` | Wave 0 |
| UI-03 | Deadlines page renders calendar and filtered timeline | unit | `pnpm test -- --testPathPattern deadlines` | Wave 0 |
| UI-04 | Predict page slider changes update WAM in real-time | unit | `pnpm test -- --testPathPattern predict` | Wave 0 |
| UI-05 | Digest page aggregates and displays daily cards | unit | `pnpm test -- --testPathPattern digest` | Wave 0 |
| UI-06 | Settings page manages tokens and profile | unit | `pnpm test -- --testPathPattern settings` | Wave 0 |
| UI-07 | Design system components render correct Rough.js output | unit | `pnpm test -- --testPathPattern design-system` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm build && pnpm test`
- **Per wave merge:** `cd frontend && pnpm build && pnpm test --coverage && pnpm lint --max-warnings 0`
- **Phase gate:** Full suite green + build succeeds + lint clean before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/` directory -- entire Next.js project scaffolding
- [ ] Test framework setup (jest or vitest with React Testing Library)
- [ ] `@testing-library/react`, `@testing-library/jest-dom` dependencies
- [ ] Mock API handler setup (msw or manual fetch mocking for TanStack Query tests)
- [ ] Backend CORS middleware -- frontend cannot function without it

## Sources

### Primary (HIGH confidence)
- `prototype/dashboard.html` -- Complete CSS variable system, Rough.js usage, layout structure, animation patterns (local file, verified)
- `src/schemas/*.py` -- Exact API response shapes for TypeScript type generation (local files, verified)
- `src/web/routes/*.py` -- All 12+ API endpoints with parameters and auth requirements (local files, verified)
- `src/web/routes/__init__.py` -- Route prefix mapping: `/api/v1/auth`, `/api/v1/users`, `/api/v1/gpa`, etc. (local file, verified)
- [Tailwind CSS v4 Theme Docs](https://tailwindcss.com/docs/theme) -- `@theme` directive configuration
- [TanStack Query v5 SSR Docs](https://tanstack.com/query/v5/docs/react/guides/advanced-ssr) -- HydrationBoundary pattern
- [next-intl App Router Setup](https://next-intl.dev/docs/getting-started/app-router) -- Official i18n integration guide
- [Next.js App Router Docs](https://nextjs.org/docs/app) -- Server/Client Components, dynamic imports

### Secondary (MEDIUM confidence)
- [roughjs npm](https://www.npmjs.com/package/roughjs) -- v4.6.6, last publish 2 years ago but stable API
- [lucide-react npm](https://www.npmjs.com/package/lucide-react) -- v0.577+, actively maintained
- [react-rough-notation npm](https://www.npmjs.com/package/react-rough-notation) -- v1.0.8, wrapper for rough-notation
- Web search on Next.js 15 vs 16 -- multiple sources confirm 16 has middleware->proxy breaking change

### Tertiary (LOW confidence)
- Next.js 15 exact latest patch version -- may change by implementation time
- Rough.js performance at scale (20+ cards) -- needs empirical testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are established, versions verified via npm/docs
- Architecture: HIGH -- project structure follows Next.js App Router conventions, prototype provides exact visual reference
- Pitfalls: HIGH -- CORS gap verified from source code, Rough.js SSR issue well-documented, Tailwind v4 config verified from official docs

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (30 days -- frontend stack is stable)
