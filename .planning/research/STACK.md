# Technology Stack

**Project:** UniBoard v2.0 — GPA Maximization Dashboard
**Researched:** 2026-03-20
**Overall Confidence:** HIGH (majority verified via official docs + multiple sources)

---

## Recommended Stack

### Core Frontend Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.5.x (already installed) | Full-stack React framework | App Router with RSC, Turbopack bundler, streaming, `next/dynamic` for code splitting. Already configured in project. No reason to change. | HIGH |
| React | 19.1.x (already installed) | UI library | React 19 brings Server Components, `use()` hook, Actions. Already installed. | HIGH |
| TypeScript | 5.x (already installed) | Type safety | Strict mode for contract-first development. Already configured. | HIGH |
| Turbopack | Built into Next.js 15.5 | Dev/build bundler | Already configured via `next dev --turbopack` and `next build --turbopack`. ~10x faster HMR than Webpack. | HIGH |

### Styling & Design System

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x (already installed) | Utility-first CSS | Already installed. Tailwind v4 has CSS-first config, faster builds. Perfect for converting prototype inline styles to reusable utility classes. | HIGH |
| CSS Variables (custom) | N/A | Design tokens | The prototype's 30+ CSS variables (--orange, --cream, --card-bg, etc.) should be defined as Tailwind theme extensions AND raw CSS custom properties for Rough.js components that need direct access. | HIGH |
| Google Fonts (Inter + Source Serif 4) | N/A | Typography | Already specified in prototypes. Use `next/font/google` instead of CDN `<link>` tags for self-hosting, zero layout shift, and privacy. | HIGH |

### Rough.js / Hand-Drawn Aesthetic

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| roughjs | 4.6.6 (already installed) | Hand-drawn SVG/Canvas borders, charts, timelines | Core design differentiator. Must be client-only (`"use client"` components). Use `useRef` + `useEffect` pattern for DOM manipulation. | HIGH |
| react-rough-notation | 1.0.8 (already installed) | React wrapper for text annotations | Declarative `<RoughNotation>` component with `show` prop. Already installed. Works well in client components. | HIGH |
| rough-notation | 0.5.1 (already installed) | Underlying annotation engine | Peer dependency of react-rough-notation. Already installed. | HIGH |

**Rough.js Integration Strategy (Critical):**

Rough.js is inherently imperative (DOM manipulation via `rough.svg()` / `rough.canvas()`). In React/Next.js:

1. **All Rough.js components must be client components** (`"use client"`) — no SSR support, canvas/SVG APIs require browser DOM
2. **Use `useRef` + `useEffect` pattern** — get DOM reference, instantiate `rough.svg(svgRef.current)`, draw shapes in effect
3. **Wrap in `next/dynamic` with `ssr: false`** for any Rough.js component imported from a Server Component page
4. **ResizeObserver for responsive borders** — hand-drawn card borders need redrawing on resize. Debounce to 100ms.
5. **Performance**: Rough.js generates complex SVG paths. For lists with 20+ cards, consider virtualizing or lazy-drawing (IntersectionObserver). Each `rough.rectangle()` call generates ~4-8 SVG path elements.

**Already implemented components** (from Phase 04):
- `RoughCard.tsx` — hand-drawn border card wrapper
- `RoughDonut.tsx` — assessment weight donut chart
- `RoughProgressBar.tsx` — hand-drawn progress bars
- `RoughTimeline.tsx` — deadline timeline with dots
- `RoughNotationWrapper.tsx` — declarative annotation wrapper
- `HeroDoodles.tsx` — decorative background shapes

**NOT recommended:**
- `react-rough-fiber` — A React renderer that converts ALL SVG to hand-drawn. Overkill for UniBoard (only specific elements need hand-drawn style). Adds reconciler complexity. Last maintained for React 18 reconciler; React 19 compatibility unverified.

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TanStack Query | v5.90.x (already installed) | Server state (API data caching, sync) | Industry standard for async state. Already installed. Use `prefetchQuery` + `dehydrate` + `HydrationBoundary` for SSR hydration. | HIGH |
| Zustand | 5.x (already installed) | Client state (UI state, predictor sliders, notification panel) | Lightweight, no boilerplate. Already installed with stores for `predictor.ts`, `ui.ts`, `notifications.ts`. For SSR: client-only stores, `persist` middleware with `skipHydration: true` to avoid mismatches. | HIGH |

**NOT recommended:**
- Redux Toolkit — overkill for this app's client state needs. Zustand covers it with 1/10th the boilerplate.
- Jotai — fine alternative but Zustand already chosen and installed.

### HTTP Client

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ky | 1.14.x (already installed) | HTTP requests to backend API | Already installed. Lightweight fetch wrapper (~3KB). Retry, timeout, hooks, JSON parsing built-in. Works well with TanStack Query (returns Promises). | MEDIUM |

**Note on ky vs Axios:** ky is already chosen and installed. It's a modern, fetch-based client that's smaller than Axios (~3KB vs ~13KB). Works perfectly with TanStack Query since TQ is HTTP-client-agnostic. No reason to switch.

### Icons

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| lucide-react | 0.577.x (already installed) | SVG icon system | React components for all Lucide icons. Already used in prototypes (via CDN lucide.js) and installed as React package. Tree-shakable — only bundles used icons. | HIGH |

### Internationalization (i18n)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| next-intl | 4.8.x (already installed) | i18n for Next.js App Router | Already configured with `[locale]` routing, `request.ts`, `routing.ts`. Best-in-class for App Router + RSC. Supports static rendering with `setRequestLocale()`. 2 locales: `en` + `zh`. | HIGH |

### Date/Time

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| date-fns | 4.1.x (already installed) | Date formatting, relative time, calendar math | Tree-shakable, immutable, TypeScript-first. Already installed. Use for deadline countdowns, calendar grid, semester week calculations. | HIGH |

### Contract-First Mock API (M1)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js Route Handlers | Built-in | Mock API endpoints during M1 | **Recommended over MSW and JSON Server.** Route Handlers (`app/api/[...]/route.ts`) provide the simplest contract-first approach: define the exact URL paths and response shapes that M2's FastAPI will implement. Zero extra dependencies. Same URL structure the frontend already calls. Type-safe with TypeScript. | HIGH |
| OpenAPI spec (YAML) | N/A | API contract documentation | Write `openapi.yaml` defining all endpoints, request/response schemas. Frontend Route Handlers implement this spec for M1. Backend FastAPI implements same spec for M2. Ensures zero-change frontend integration. | HIGH |

**Why NOT MSW:**
- MSW intercepts at the network level — useful for testing but adds complexity for development mocking
- Requires separate browser + Node.js setup for App Router (SSR + CSR)
- MSW doesn't work in Edge Runtime (middleware)
- Route Handlers are simpler: same file system, same Next.js dev server, no extra process

**Why NOT JSON Server:**
- Separate process to manage
- Can't match complex response shapes or business logic
- No TypeScript type safety
- Less representative of the actual API contract

**M1 to M2 Transition Strategy:**
1. Define `openapi.yaml` with all API contracts
2. M1: Next.js Route Handlers return static/mock JSON matching the spec
3. M2: FastAPI implements the same endpoints
4. Frontend: Change `API_BASE_URL` environment variable from `/api` (local Route Handlers) to `http://backend:8000` (FastAPI)
5. Zero frontend code changes needed

### Testing (Frontend)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | 4.1.x (already installed) | Test runner | Already configured. Fast, Vite-native, ESM-first. | HIGH |
| Testing Library (React) | 16.3.x (already installed) | Component testing | Already installed. `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom`. | HIGH |
| jsdom | 29.x (already installed) | DOM environment for tests | Already installed. Note: jsdom lacks `scrollTo`, `scrollIntoView`, `ResizeObserver` — mock or guard these in Rough.js components. | HIGH |

### Linting & Formatting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | 9.x (already installed) | Linting | Already configured with `eslint-config-next`. `--max-warnings 0` in lint script. | HIGH |
| eslint-config-next | 15.5.x (already installed) | Next.js-specific ESLint rules | Already installed. | HIGH |

---

## Backend Stack (M2)

### Core Backend

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Python | 3.12+ | Runtime | Already specified in constraints. Type hints, `match` statement, performance improvements. | HIGH |
| FastAPI | 0.115.x+ | Web framework | Async-first, auto-generated OpenAPI docs, Pydantic v2 integration, dependency injection. Production-proven. | HIGH |
| SQLAlchemy | 2.0.x | ORM | Async engine via `create_async_engine()`, 2.0-style queries, type-annotated models. Use `AsyncSession` with FastAPI dependency injection. | HIGH |
| asyncpg | 0.30.x+ | PostgreSQL async driver | Highest-performance async PG driver. 3-5x throughput vs sync for concurrent requests. | HIGH |
| Pydantic | 2.x | Data validation / schemas | V2 is Rust-backed, 5-17x faster than V1. Shared validation between API schemas and adapter response parsing. | HIGH |
| Alembic | 1.14.x+ | Database migrations | Async migration support with `run_async()`. Use `op.execute()` for custom types (e.g., pgvector). | HIGH |
| PostgreSQL | 16 | Database | Docker for local, RDS for production. JSONB for flexible Ed API responses, full-text search for materials. | HIGH |
| uv | Latest | Package management | 10-100x faster than pip. Already specified in constraints. | HIGH |

### Backend Libraries

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| httpx | 0.28.x+ | HTTP client for external APIs | Async, connection pooling, timeout/retry. For Canvas API, Ed API calls. | HIGH |
| APScheduler | 3.11.x+ | Background sync scheduler | Cron triggers for grades (15min), deadlines (1h), modules (daily). Use `timezone="Australia/Sydney"` (not UTC offset). | HIGH |
| bcrypt | 4.x | Password hashing | JWT auth. Already specified in constraints. | HIGH |
| python-jose | 3.3.x | JWT token handling | Encode/decode JWT with HS256. | MEDIUM |
| cryptography | 44.x+ | AES-256-GCM token encryption | Encrypt Canvas/Ed API tokens at rest in PostgreSQL. | HIGH |
| beautifulsoup4 | 4.12.x | HTML parsing | Unit Outline HTML scraping from USYD website. | HIGH |
| ruff | Latest | Linting + formatting | Already specified. Single tool replaces flake8 + black + isort. | HIGH |
| mypy | Latest | Type checking | `--strict` mode. Already specified. | HIGH |
| pytest + pytest-asyncio | Latest | Testing | Already specified. Use `asyncio_mode = "auto"` for cleaner async test syntax. | HIGH |

### AI / MCP Stack (M3)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| anthropic | Latest PyPI | Claude API client | Official Python SDK. For Sonnet digest/scoring (Messages API with structured output). | HIGH |
| claude-agent-sdk | 0.1.48+ | MCP Agent runtime | Official Anthropic Agent SDK. Provides the agent loop, tool management, and MCP integration. For spawning Claude Opus 4.6 agents with MCP tools server-side. | MEDIUM |
| mcp | 1.7.x+ | MCP Python SDK | Official MCP protocol implementation. Build MCP server exposing Canvas/Ed tools. Use Streamable HTTP transport for production (replaces deprecated SSE transport). | HIGH |

**MCP Agent Architecture:**

```
User Request (e.g., "What's important for my COMP2017 exam?")
    |
    v
FastAPI Endpoint → claude-agent-sdk
    |                    |
    |                    v
    |              Claude Opus 4.6 (agent loop)
    |                    |
    |                    v  (MCP tool calls)
    |              MCP Server (Python, same process or separate)
    |                    |
    |          +---------+---------+
    |          |         |         |
    |          v         v         v
    |     Canvas     Ed Discussion  Ed Lessons
    |     Adapter     Adapter       Adapter
    |          |         |         |
    |          +---------+---------+
    |                    |
    |                    v
    |              Aggregated Context
    |                    |
    |                    v
    |              Claude Response (with citations)
    v
API Response → Frontend
```

**Key decisions:**
- Use `claude-agent-sdk` (not raw Messages API) for agent features — it handles the tool-use loop, retries, and context management
- Use raw `anthropic` SDK for simpler tasks (digest scoring, GPA predictions) where a single API call suffices
- MCP server can run in-process (same FastAPI app) or as a separate service. Start in-process for simplicity, split if performance requires it.

---

## Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker Compose | Latest | Local development | PostgreSQL 16 container. Already specified. | HIGH |
| pnpm | 9+ | Frontend package manager | Already specified and configured. Faster, deduplicates. | HIGH |
| Node.js | 20 LTS or 22 LTS | Frontend runtime | Next.js 15.5 requires Node 18.18+. Use LTS for stability. | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Mock API (M1) | Next.js Route Handlers | MSW 2.x | MSW adds complexity (dual browser/Node setup), doesn't work in Edge Runtime, extra dependency. Route Handlers are zero-config and represent the actual URL structure. |
| Mock API (M1) | Next.js Route Handlers | JSON Server | Separate process, no TypeScript safety, can't model complex response shapes, no middleware support. |
| Rough.js wrapper | Direct `useRef`+`useEffect` | react-rough-fiber | react-rough-fiber converts ALL SVGs to hand-drawn style (too aggressive). UniBoard needs selective hand-drawn elements. React 19 reconciler compatibility unverified. |
| State management | Zustand | Redux Toolkit | Overkill. UniBoard has ~3 small stores (UI, predictor, notifications). Zustand requires no providers, no actions, no reducers. |
| State management | Zustand | Jotai | Both are fine. Zustand already chosen and installed. Switching provides no benefit. |
| HTTP client | ky | Axios | ky already installed. Smaller (~3KB vs ~13KB), fetch-based (native), works everywhere. Axios would be redundant. |
| i18n | next-intl | i18next + react-i18next | next-intl is purpose-built for Next.js App Router + RSC. i18next requires more setup for server components. |
| CSS | Tailwind CSS | CSS Modules | Tailwind already chosen. Faster to convert prototypes (utility classes map 1:1 to inline styles). CSS Modules require naming conventions. |
| Agent SDK | claude-agent-sdk | Raw Messages API + manual tool loop | claude-agent-sdk handles retries, tool-use loop, context management. Manual implementation is error-prone for complex multi-tool agent flows. |
| MCP transport | Streamable HTTP | Deprecated SSE | SSE transport was deprecated March 2025. Streamable HTTP is the current standard — single endpoint, bidirectional, supports stateless deployments. |

---

## Fonts Configuration

**Replace CDN `<link>` tags with `next/font/google`:**

```typescript
// app/[locale]/layout.tsx
import { Inter, Source_Serif_4 } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
});

// Apply to <body>
<body className={`${inter.variable} ${sourceSerif.variable}`}>
```

```css
/* In Tailwind/CSS */
body { font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif; }
h1, h2, h3, h4, h5 { font-family: var(--font-source-serif), Georgia, serif; }
```

---

## Installation

### Frontend (already configured)

```bash
cd frontend
pnpm install
# All packages already in package.json
```

### Backend (M2 — new setup)

```bash
# Initialize with uv
uv init
uv add fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg alembic
uv add pydantic pydantic-settings
uv add httpx apscheduler bcrypt python-jose cryptography
uv add beautifulsoup4 lxml
uv add anthropic mcp claude-agent-sdk

# Dev dependencies
uv add --dev pytest pytest-asyncio httpx mypy ruff
uv add --dev types-beautifulsoup4
```

### Mock API OpenAPI Contract (M1)

```bash
# No extra packages needed — use Next.js Route Handlers
# Define contract in:
frontend/openapi.yaml
# Implement mock handlers in:
frontend/app/api/[...endpoint]/route.ts
```

---

## Version Pinning Strategy

| Layer | Strategy | Rationale |
|-------|----------|-----------|
| Frontend | `^` (caret) in package.json, pnpm lockfile | Caret allows patch/minor updates. Lockfile ensures reproducibility. |
| Backend | `>=X.Y,<X+1` in pyproject.toml, uv.lock | Pin major, allow minor/patch. Lock for reproducibility. |
| Docker | Exact tags (e.g., `postgres:16.4-alpine`) | Prevent surprise changes in infrastructure. |
| Node.js | LTS version in `.nvmrc` or `.node-version` | Consistency across dev machines and CI. |

---

## Sources

### Official Documentation (HIGH confidence)
- [Next.js App Router Guides](https://nextjs.org/docs/app/guides) — Rendering, data fetching, streaming
- [TanStack Query SSR Guide](https://tanstack.com/query/latest/docs/framework/react/guides/ssr) — Hydration patterns for App Router
- [TanStack Query Advanced SSR](https://tanstack.com/query/v5/docs/react/guides/advanced-ssr) — prefetchQuery + dehydrate pattern
- [next-intl App Router Setup](https://next-intl.dev/docs/getting-started/app-router) — i18n configuration
- [Rough.js Documentation](https://roughjs.com/) — API reference for SVG/Canvas rendering
- [MSW Source OpenAPI](https://source.mswjs.io/docs/integrations/open-api/) — MSW OpenAPI integration (evaluated, not recommended)
- [Anthropic MCP SDK (PyPI)](https://pypi.org/project/mcp/) — Python MCP protocol SDK
- [Claude Agent SDK (GitHub)](https://github.com/anthropics/claude-agent-sdk-python) — Official agent runtime
- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) — Production agent building guide
- [Anthropic Tool Use Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) — Tool use patterns

### Verified Articles (MEDIUM confidence)
- [FastAPI + Async SQLAlchemy 2.0 + asyncpg](https://leapcell.io/blog/building-high-performance-async-apis-with-fastapi-sqlalchemy-2-0-and-asyncpg) — Async patterns, 3-5x throughput
- [Setting up FastAPI with Async SQLAlchemy 2.0 & Pydantic V2](https://medium.com/@tclaitken/setting-up-a-fastapi-app-with-async-sqlalchemy-2-0-pydantic-v2-e6c540be4308)
- [Rough.js + React Hooks Pattern](https://christoshrousis.com/writing/04-how-to-combine-roughjs-and-react-hooks-to-draw-to-a-html-canvas-within-gatsby/) — useRef + useEffect pattern
- [react-rough-fiber (evaluated)](https://bowencodes.com/post/react-rough-fiber) — React renderer for SVG (decided against)
- [MSW + Next.js App Router Setup](https://gimbap.dev/blog/setting-msw-in-next) — MSW dual setup complexity (decided against)
- [MSW + Next.js 16 Integration Demo](https://github.com/laststance/next-msw-integration) — Comprehensive MSW setup reference
- [MCP Production Architecture](https://dev.to/lizechengnet/how-to-structure-claude-code-for-production-mcp-servers-subagents-and-claudemd-2026-guide-4gjn) — Layered MCP architecture
- [FastMCP + Anthropic API Integration](https://gofastmcp.com/integrations/anthropic) — FastAPI MCP server patterns
- [Zustand + Next.js App Router](https://www.dimasroger.com/blog/how-to-use-zustand-with-next-js-15) — SSR hydration patterns
- [Orval OpenAPI Codegen](https://orval.dev/) — Type-safe client + MSW mock generation from OpenAPI (evaluated for M2 integration)

### Package Documentation
- [react-rough-notation (npm)](https://www.npmjs.com/package/react-rough-notation) — React wrapper API
- [react-rough-notation (GitHub)](https://github.com/linkstrifer/react-rough-notation) — Source + examples
- [ky (npm)](https://www.npmjs.com/package/ky) — HTTP client API
