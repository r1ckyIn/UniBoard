# Domain Pitfalls

**Domain:** University GPA maximization dashboard — HTML prototype to Next.js conversion, contract-first Mock API, MCP Agent in production, i18n with canvas rendering
**Researched:** 2026-03-20

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Rough.js Hydration Mismatch in Next.js SSR

**What goes wrong:** Rough.js generates SVG paths with randomized seed values — every call to `rc.rectangle()` or `rc.circle()` produces slightly different output. When Next.js renders on the server, the SVG output differs from what the client generates, causing React hydration errors ("Text content does not match server-rendered HTML"). Suppressing with `suppressHydrationWarning` hides the symptom but causes visible flickers as the client re-renders.

**Why it happens:** Rough.js uses `Math.random()` internally for its "hand-drawn" aesthetic. Server and client produce different random seeds, so the SVG paths never match between SSR and CSR.

**Consequences:** Hundreds of console errors in development, visual flashing on page load, SEO impact if the initial render is broken, and potential layout shift (CLS penalty).

**Prevention:**
- **All Rough.js components must be client-only.** Use `next/dynamic` with `{ ssr: false }` for every component that uses Rough.js or Rough Notation.
- Create a `<RoughBorder>` wrapper component that renders a placeholder `<div>` on server, then draws the Rough.js border after mount via `useEffect`.
- Use `rough.svg()` (not `rough.canvas()`) in React for DOM-retained SVG elements that React can manage — but still render client-side only.
- The `react-rough-notation` npm package exists but has limited maintenance; `@turahe/react-rough-notation` advertises SSR-ready support and React 19 compatibility — evaluate before writing custom wrappers.

**Detection:** Hydration mismatch warnings in browser console. CLS > 0.1 in Lighthouse. Visual "pop-in" of hand-drawn borders after page load.

**Phase mapping:** M1 (Frontend App) — must be solved in the very first component sprint.

**Confidence:** HIGH — well-documented pattern for any randomized rendering library in SSR frameworks.

---

### Pitfall 2: Contract Drift Between M1 Mock API and M2 Real Backend

**What goes wrong:** M1 defines OpenAPI contracts and implements them as mock responses. M2 builds the real backend months later. During M2 development, the backend deviates from the original contract (field renames, type changes, new required fields, different pagination format). The frontend breaks silently — 67% of developers report production bugs caused by mismatched API contracts.

**Why it happens:** Without automated enforcement, the contract exists as a document that developers reference manually. Backend developers "improve" the API during implementation (changing snake_case to camelCase, wrapping responses in `{data: ...}`, adding `meta` fields). These changes seem harmless but break frontend type expectations.

**Consequences:** M2 integration phase becomes a debugging marathon. Frontend "zero-change" promise fails. Every API endpoint requires manual frontend adjustment. Estimated 2-3 weeks of unplanned integration work.

**Prevention:**
1. **Single-source OpenAPI spec** — Write `openapi.yaml` in M1, generate both mock server responses AND TypeScript types from it. Use `openapi-ts` (by hey-api) to generate TanStack Query hooks directly from the spec.
2. **Contract tests in CI** — When M2 implements an endpoint, run contract tests that validate the real response against the OpenAPI spec. Use `schemathesis` (Python) for FastAPI contract testing.
3. **Automated drift detection** — Add `oasdiff` to CI pipeline. Any PR that modifies an API response must also update the OpenAPI spec, and the diff is flagged for frontend review.
4. **Type generation, not manual types** — Never hand-write TypeScript interfaces for API responses. Always generate from OpenAPI spec. When the spec changes, TypeScript compilation fails immediately at every usage site.
5. **Response envelope convention** — Decide the response wrapper format (`{data, meta, error}` vs flat) in M1 and codify it in the OpenAPI spec. This is the #1 source of drift.

**Detection:** TypeScript compilation errors after regenerating types from updated spec. Contract test failures in CI. Frontend `undefined` errors when accessing renamed fields.

**Phase mapping:** M1 (define contracts) + M2 (enforce contracts). The OpenAPI spec file and codegen pipeline must be set up in M1 Phase 1.

**Confidence:** HIGH — contract drift is the most documented failure mode of contract-first development.

---

### Pitfall 3: MCP Agent Cost Explosion with Opus 4.6

**What goes wrong:** Each MCP Agent query (Deadline AI chat, File Q&A, Ed Discussion intelligence) invokes Claude Opus 4.6 with MCP tools. A single user question triggers 5-12 tool calls, each appending to the conversation context. With the full conversation context growing per turn, a single complex query can consume 50K-200K input tokens + 5K-15K output tokens. At $5/M input + $25/M output, a single query costs $0.25-$1.38. With 100 active students asking 5 questions/day, monthly AI cost reaches $3,750-$20,700.

**Why it happens:** MCP tool descriptions alone consume significant context window space (40-50% reported in production deployments). Each tool call result (Canvas assignment data, Ed Discussion threads, course materials) adds thousands of tokens. The agent's "thinking" across multiple tool calls compounds input costs because each subsequent API call includes all prior context.

**Consequences:** Project becomes financially unsustainable. A single student's heavy usage day could cost more than the entire infrastructure budget. No cost ceiling without explicit controls.

**Prevention:**
1. **Tiered model strategy** — Use Sonnet 4.6 ($0.30/$1.50 per M tokens) for routine queries (deadline lookups, material search). Reserve Opus 4.6 only for complex multi-source research that requires deep reasoning. Implement a query classifier that routes based on complexity.
2. **Pre-collected data pattern for digest** — Already planned in PROJECT.md: scheduled sync + Claude API scoring. Extend this pattern to more features. Pre-aggregate Ed Discussion highlights, deadline summaries, and material indexes during background sync. Serve from database, not live MCP queries.
3. **Token budget per query** — Set `max_tokens` limit (e.g., 4096) on output. Implement a conversation turn limit (max 5 tool calls per query). Truncate tool results to essential fields before passing to the model.
4. **Caching layer** — Cache MCP tool results for identical queries within a time window (e.g., "What are my deadlines?" is the same for 15 minutes). Cache AI responses for common question patterns.
5. **Rate limiting per user** — Daily query quota (e.g., 20 AI queries/day free, then degraded to Sonnet). Weekly cost cap per user.
6. **Prompt caching** — Use Anthropic's prompt caching (cache hit costs 10% of input price). System prompts, tool definitions, and static course context should be cached across queries.

**Detection:** Monthly API bill exceeds budget. Average tokens-per-query metrics trending upward. User complaints about slow responses (latency correlates with token count).

**Phase mapping:** M3 (AI/MCP/Skills) — but cost architecture decisions must be made in M2 (data pre-collection patterns) and M1 (UI must support graceful degradation when AI is unavailable).

**Confidence:** HIGH — Anthropic's own documentation confirms these cost dynamics. Opus 4.6 pricing is verified at $5/$25 per million tokens.

---

### Pitfall 4: Losing Prototype Animation/Interaction Fidelity During Conversion

**What goes wrong:** The 10 HTML prototypes contain 6,930 lines of hand-tuned CSS animations, JavaScript interactions, and Rough.js rendering. During React conversion, developers translate the visual layout but lose the micro-interactions: staggered entrance animations (.anim .d1-.d10), breathing scroll hint, hover-triggered Rough Notation circles on grade cells, donut chart leader lines, hand-drawn timeline dots, and slider-based WAM recalculation. The final product "looks similar" but "feels dead."

**Why it happens:**
- Inline event handlers (`onclick`, `onmouseenter`) get refactored into React event handlers but the timing/sequencing logic is lost.
- CSS animations with specific delays (.d1 through .d10 at 40-720ms intervals) get simplified to a generic `fade-in`.
- `requestAnimationFrame(function(){ requestAnimationFrame(function(){ ... })})` double-RAF pattern (used for Rough.js border drawing) isn't understood and gets replaced with a simple `useEffect`.
- `setTimeout` sequences for Rough Notation annotation groups (900ms delay, then sequential show) are hard to express in React's declarative model.
- The predict page's WAM calculation has imperative DOM manipulation (`scoreEl.textContent = ...`, `iconWrap.className = ...`) that must be restructured into React state.

**Consequences:** 103 design iterations wasted. The product's core differentiator (the "notebook on a student's desk" aesthetic) is compromised. Users perceive the app as "just another dashboard."

**Prevention:**
1. **Animation inventory document** — Before converting any page, create a spreadsheet listing every animation, its trigger, timing, and the exact CSS/JS that implements it. Cross-reference against the converted React component.
2. **Side-by-side visual regression** — Open the HTML prototype and the React version side-by-side during development. Use Playwright screenshot comparison for automated regression.
3. **Convert page-by-page, not component-by-component** — Each HTML prototype is self-contained. Convert one complete page, verify all interactions match, then move to the next. Do not extract shared components until 3+ pages are converted and patterns are clear.
4. **Preserve the double-RAF pattern** — Create a `useRoughBorder` hook that replicates the double `requestAnimationFrame` timing. This is critical for Rough.js borders to render after layout is complete.
5. **Animation delay system** — Create a `useStaggeredAnimation` hook that maps `.d1` through `.d10` delay classes. The delays (40ms to 720ms in non-linear steps) are intentionally designed — don't linearize them.
6. **Predict page state machine** — The predict page's WAM calculation (`recalcAll → computeWAM → updateTarget → updateRequired → computeRequired`) is a complex state machine with ~15 derived values. Model it explicitly with `useReducer` + `useMemo`, not scattered `useState` calls.

**Detection:** Visual diff between prototype HTML and React output shows missing animations. User feedback mentions the app feels "static" or "plain." Animation count in React version is lower than prototype inventory.

**Phase mapping:** M1 (Frontend App) — every phase within M1 must include animation verification as acceptance criteria.

**Confidence:** HIGH — based on direct analysis of the 6,930-line prototype codebase with specific patterns identified.

---

### Pitfall 5: Rough.js Performance Degradation with Many Elements

**What goes wrong:** Each card with `data-hand-border` creates an SVG element with randomized paths. The dashboard page alone has 10+ cards, each with a Rough.js border. Add the donut chart (4 slices + 4 leader lines + 8 labels + 4 dots = ~20 Rough elements), timeline (vertical line + dots), progress bars (canvas elements), and hero doodles (11 decorative shapes). A single page renders 50-80 Rough.js elements. In React, if any parent state changes, all these elements re-render, causing Rough.js to regenerate all randomized SVG paths — visible as borders "flickering" and 200-500ms jank.

**Why it happens:** Rough.js generates new random paths on every call. React's reconciliation sees different SVG `d` attributes and updates the DOM. Unlike static SVGs, Rough.js output is never stable between renders.

**Consequences:** Janky scrolling, border flickering on any state update, high CPU usage on pages with many cards (dashboard, courses, course-detail). Mobile performance is especially impacted.

**Prevention:**
1. **Memoize Rough.js output** — Generate Rough.js SVG paths once on mount, store the serialized SVG string in a ref, and only regenerate when the element's dimensions actually change.
2. **Use a fixed seed** — Rough.js supports a `seed` option: `rc.rectangle(0, 0, w, h, { seed: 42 })`. Pass a deterministic seed per component instance so the same element always generates the same paths. This prevents re-render flickering AND helps with potential future SSR.
3. **Isolate Rough.js from React's render cycle** — Wrap each Rough.js element in `React.memo` with a custom comparator that only allows re-render on dimension changes.
4. **Prefer Canvas mode for non-interactive Rough elements** — Progress bars and weight bars are already using `rough.canvas()`. For elements that don't need DOM event handling (borders, decorative shapes), canvas is more performant because it doesn't create DOM nodes that React needs to reconcile.
5. **Virtualize on scroll-heavy pages** — If a page has 20+ cards (courses list), only render Rough.js borders for visible cards. Use Intersection Observer to draw borders as cards enter viewport.

**Detection:** React DevTools Profiler shows Rough.js components taking >16ms per render. Chrome Performance tab shows long "Recalculate Style" tasks. Visible border flickering when typing in search or toggling filters.

**Phase mapping:** M1 (Frontend App) — the `<RoughBorder>` component design in Phase 1 must include memoization from day one.

**Confidence:** HIGH — SVG performance degradation with many elements is well-documented; Rough.js compounds it with randomized regeneration.

---

## Moderate Pitfalls

### Pitfall 6: i18n Text in Rough.js Canvas/SVG Elements

**What goes wrong:** The donut chart renders text labels as SVG `<text>` elements (e.g., "Assignment 1", "Final Exam", "15%"). The Rough.js timeline renders deadline names as HTML text. When i18n switches to Chinese, SVG text width calculations change (Chinese characters are wider/taller), breaking leader line positioning and label overlap. Canvas-rendered text doesn't participate in React's i18n system at all — `useTranslation()` can't reach into canvas draw calls.

**Prevention:**
1. **Separate data from rendering** — Chart labels should come from React state (translated), not be hardcoded in Rough.js draw functions. Pass translated strings as props to chart components.
2. **Use SVG `<text>` over canvas text** — SVG text can be styled with CSS and measured with `getBBox()` for layout. Canvas text measurement (`ctx.measureText()`) is less reliable across fonts/languages.
3. **Dynamic leader line positioning** — Calculate leader line endpoints based on actual rendered text width, not static offsets. Chinese "期末考试" is wider than English "Final Exam."
4. **Font loading guard** — Source Serif 4 and Inter must be loaded before Rough.js draws text. Use `document.fonts.ready` or `next/font` preloading. Measuring text width with a fallback font produces incorrect positions.

**Phase mapping:** M1 — i18n must be integrated into chart components from the start, not bolted on after.

**Confidence:** MEDIUM — based on general i18n + canvas/SVG text challenges; no UniBoard-specific evidence yet.

---

### Pitfall 7: Ed Discussion API Instability and Missing Documentation

**What goes wrong:** Ed Discussion has no public API documentation. The API is reverse-engineered from the Ed web app and referenced via the hschafer/edstem OSS library. API endpoints can change without notice. Authentication tokens expire or change format. Response schemas have undocumented fields that vary between Ed courses (some courses have `is_endorsed`, others don't).

**Prevention:**
1. **Defensive Pydantic parsing** — Already planned. Every field should have a default value. Use `model_config = ConfigDict(extra="ignore")` to silently drop unknown fields.
2. **Response schema versioning** — Store raw API responses alongside parsed data. When parsing fails, log the raw response for debugging without losing the data.
3. **Circuit breaker per adapter** — If Ed API returns 5 consecutive errors, stop polling for 30 minutes. Don't let one broken adapter cascade to the entire sync engine.
4. **Fallback content strategy** — If Ed data is unavailable, the UI must still function. Deadline page shows Canvas-only deadlines. Intelligence features show "Ed data temporarily unavailable" rather than crashing.

**Phase mapping:** M2 (Backend Core) — adapter resilience patterns.

**Confidence:** HIGH — this is a known constraint documented in TRD and CLAUDE.md. The project already experienced this in v1.0.

---

### Pitfall 8: Over-Componentizing During Prototype Conversion

**What goes wrong:** Developer sees 10 HTML prototypes sharing sidebar, header, and card patterns. They immediately extract a `<Card>`, `<Sidebar>`, `<Header>`, `<StatCard>`, `<Timeline>`, `<RoughBorder>`, `<GradeBadge>`, `<CalendarGrid>`, etc. before converting a single page. The abstractions are designed based on assumptions about how components should be shared, not actual usage patterns. Later, page-specific variations (dashboard cards need donut charts, course cards need progress bars, predict cards need input fields) don't fit the premature abstractions.

**Prevention:**
1. **Three-page rule** — Do not extract a shared component until you've implemented the same pattern in 3 different pages. Copy-paste is acceptable during M1.
2. **Convert pages in complexity order** — Start with simpler pages (auth, setup, settings) → medium (courses, timetable, digest) → complex (dashboard, course-detail, predict, deadline). Shared patterns emerge naturally.
3. **Layout-first, features-second** — Extract layout components (sidebar, header, main content area, right panel) first because they're truly shared. Page-specific components (donut chart, predict sliders, deadline timeline) stay local to their pages.

**Phase mapping:** M1 — component architecture decisions in Phase 1.

**Confidence:** MEDIUM — general React best practice, amplified by the prototype-to-React conversion context.

---

### Pitfall 9: MCP Agent Latency Ruining UX

**What goes wrong:** User asks "What do I need to score on my final to get a Distinction?" in the Deadline AI chat. The MCP Agent makes 5 sequential tool calls: (1) list courses → (2) get assignments for course → (3) get grades → (4) get unit outline weights → (5) synthesize answer. Each tool call is a separate API round-trip to Canvas/Ed. Total latency: 8-15 seconds. User has already left the page.

**Prevention:**
1. **Streaming responses** — Use Anthropic's streaming API to show partial responses as they arrive. Show "Checking your Canvas grades..." during tool execution.
2. **Pre-computed answers** — For common questions (grade requirements, deadline summaries), pre-compute during background sync and serve from database. Only invoke MCP Agent for genuinely novel queries.
3. **Parallel tool calls** — When multiple tools are independent (get grades + get unit outline), execute them in parallel, not sequentially. MCP protocol supports this.
4. **Progress indicators** — Show each tool call as a step: "Reading your grades... Reading assignment weights... Calculating..." Users tolerate 10-second waits when they see progress.
5. **Optimistic UI** — Show pre-collected data immediately (cached grades, known deadlines) while the AI processes the full answer. The AI response enriches what's already displayed.

**Phase mapping:** M3 (AI/MCP/Skills) — but M1 UI must include loading state designs for AI-powered features.

**Confidence:** MEDIUM — latency estimates are based on typical API round-trip times; actual MCP Agent latency depends on tool implementation.

---

### Pitfall 10: Unit Outline HTML Parser Fragility

**What goes wrong:** USYD Unit Outline pages are rendered HTML pages with no stable schema. Different faculties use different HTML templates. Assessment tables have inconsistent column headers ("Assessment Task" vs "Task" vs "Assessment Item"). Weight columns may use "%" or not. Some pages use `<table>`, others use `<dl>` or styled `<div>` grids. The parser works for the 5 courses tested in development, then breaks for 20% of courses in production.

**Prevention:**
1. **Weight-sum validation** — Already planned in TRD. If parsed weights don't sum to 100% (within tolerance), flag the unit outline for manual review rather than serving incorrect data.
2. **Multiple parser strategies** — Implement 2-3 parsing strategies (table-based, definition-list-based, regex-based) and use the one that produces a valid result (weights sum to ~100%).
3. **Graceful degradation** — If parsing fails, show "Assessment weights not available for this course" rather than incorrect percentages. GPA predictions should still work with user-entered weights as fallback.
4. **Parser test suite** — Collect HTML samples from 20+ different faculties/courses during development. Each is a test case. Run regression tests when parser logic changes.
5. **Once-per-semester tolerance** — Unit outlines change once per semester. A parser failure is not urgent. Log failures for manual investigation, don't block the user.

**Phase mapping:** M2 (Backend Core) — adapter/parser implementation.

**Confidence:** HIGH — HTML scraping fragility is a universal problem; USYD's inconsistent templates are confirmed from v1.0 experience.

---

## Minor Pitfalls

### Pitfall 11: Canvas Token Special Characters in Environment Variables

**What goes wrong:** Canvas API tokens and Ed API tokens contain special characters (`+`, `/`, `=`) that get mangled by shell escaping when stored in `.env` files or exported via `zsh export`. The token works in browser but fails when passed through environment variable pipelines.

**Prevention:** Already documented in CLAUDE.md. Use direct inline tokens in development curl tests. In production, store tokens encrypted in PostgreSQL (AES-256-GCM as planned), never in environment variables.

**Phase mapping:** M2 — already a known issue.

**Confidence:** HIGH — confirmed from v1.0 development.

---

### Pitfall 12: Next.js App Router i18n Static Export Limitation

**What goes wrong:** Next.js App Router's i18n support has constraints with static export. If the project later needs static export (e.g., for S3/CloudFront hosting without Lambda@Edge), the internationalized routing (`/en/dashboard`, `/zh/dashboard`) won't work with `next export`.

**Prevention:**
1. Use `next-intl` with App Router — it supports both SSR and static generation modes.
2. Design routing for middleware-based locale detection, not filesystem-based routing.
3. Since the deployment plan is AWS Lambda + API Gateway (server-rendered), this is not an immediate blocker — but avoid architectural choices that assume static export.

**Phase mapping:** M1 — i18n setup decision in early phases.

**Confidence:** MEDIUM — constraint documented in Next.js docs; impact depends on deployment strategy.

---

### Pitfall 13: Background Sync Race Conditions

**What goes wrong:** Multiple sync tasks run on different schedules (grades every 15min, deadlines every 1h, modules daily). If a user's Canvas token expires mid-sync, some tasks succeed and others fail, leaving the database in an inconsistent state. A grade sync succeeds but the deadline sync fails, so the user sees updated grades but stale deadlines.

**Prevention:**
1. **Token validation before sync batch** — Check token validity once at the start of each sync cycle, not per-task.
2. **Atomic sync transactions** — Each sync task either fully succeeds or fully rolls back. Use database transactions.
3. **Last-synced timestamps per data type** — Store `grades_synced_at`, `deadlines_synced_at`, etc. separately. Show "Deadlines last updated 2h ago" in the UI when sync is stale.
4. **Sync health dashboard** — Track per-user, per-data-type sync status. Alert when a user's sync has failed 3+ consecutive times.

**Phase mapping:** M2 (Backend Core) — sync engine design.

**Confidence:** MEDIUM — standard distributed sync challenge.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| M1: Rough.js integration | Hydration mismatch (#1), Performance (#5) | Client-only rendering, memoization with seed |
| M1: Prototype conversion | Animation fidelity loss (#4), Over-componentizing (#8) | Animation inventory, three-page rule |
| M1: Contract definition | Contract drift setup (#2) | OpenAPI spec + codegen pipeline in Phase 1 |
| M1: i18n | Canvas/SVG text (#6), Static export (#12) | SVG text over canvas, next-intl |
| M2: API implementation | Contract drift enforcement (#2) | schemathesis contract tests in CI |
| M2: Adapters | Ed API instability (#7), HTML parser fragility (#10), Token issues (#11) | Defensive parsing, multiple strategies, circuit breakers |
| M2: Sync engine | Race conditions (#13) | Token pre-validation, atomic transactions |
| M3: MCP Agent | Cost explosion (#3), Latency (#9) | Tiered models, pre-computed answers, streaming |
| M3: Skill system | Token budget | Per-query limits, caching, prompt caching |

---

## Sources

- [Next.js Hydration Error Documentation](https://nextjs.org/docs/messages/react-hydration-error)
- [Evil Martians: API Contracts Frontend Survival Guide](https://evilmartians.com/chronicles/api-contracts-and-everything-i-wish-i-knew-a-frontend-survival-guide)
- [SmartBear: API-First Development and Mocking](https://smartbear.com/blog/api-first-development-and-the-case-for-api-mocking/)
- [hey-api/openapi-ts: OpenAPI to TypeScript Codegen](https://github.com/hey-api/openapi-ts)
- [Anthropic API Pricing (2026)](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic Rate Limits Documentation](https://platform.claude.com/docs/en/api/rate-limits)
- [MCP vs API: When to Use Each (2026)](https://atlan.com/know/when-to-use-mcp-vs-api/)
- [Anthropic: Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [From SVG to Canvas: Performance Analysis](https://www.felt.com/blog/from-svg-to-canvas-part-1-making-felt-faster)
- [Rough.js Official Documentation](https://roughjs.com/)
- [react-rough-notation on npm](https://www.npmjs.com/package/react-rough-notation)
- [@turahe/react-rough-notation (SSR-ready)](https://www.npmjs.com/package/@turahe/react-rough-notation)
- [Next.js Lazy Loading / Dynamic Import](https://nextjs.org/docs/pages/guides/lazy-loading)
- [next-intl Documentation](https://next-intl.dev/)
- UniBoard v1.0 CLAUDE.md (project-specific learnings)
- UniBoard prototype source code analysis (6,930 lines across 10 files)
