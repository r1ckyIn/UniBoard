# Phase 1: Design System & Foundation - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the visual foundation and app shell that all 10 pages depend on. Deliverables: Next.js project from scratch (create-next-app), three-column layout (Sidebar + main + right panel), Rough.js design system components, Tailwind theme matching prototype color system, paper texture/ruled lines background, i18n scaffolding (EN/ZH), font loading (Source Serif 4 + Inter).

This phase does NOT build any page content — only the shared infrastructure that Phase 3-12 pages will consume.

Requirements: UI-07, INFRA-10

</domain>

<decisions>
## Implementation Decisions

### Existing Code Handling
- Delete entire existing frontend/ directory and start fresh with create-next-app
- Completely reinitialize — no dependency reuse from previous scaffolding
- All packages (roughjs, next-intl, TanStack Query, etc.) will be added fresh during setup
- HTML prototype files (prototype/) are preserved as the definitive visual reference

### Prototype Fidelity (Global Decision — applies to all page Phases)
- HTML prototypes are the REAL implementation specification — 1:1 pixel-perfect replication required
- All animations, transitions, hover effects, interactions from prototypes must be faithfully reproduced
- Every page Phase (3-12) must match its corresponding HTML prototype exactly
- Design documents (frontend_brief.md, DESIGN_SYSTEM.md) are aesthetic philosophy references only, not implementation specs

### Rough.js Component Design
- Claude decides which of the 6 DS components (RoughCard, RoughDonut, RoughProgressBar, RoughTimeline, RoughNotationWrapper, HeroDoodles) to implement in Phase 1 vs defer to page Phases — based on analyzing which are multi-page shared vs page-specific
- Visual style follows HTML prototypes as baseline, with minor tweaks allowed to improve UX (e.g., animation timing, subtle refinements)
- SSR hydration strategy: Claude decides best approach (dynamic import, client-only wrapper, seed-based determinism, etc.)

### Data Handling in Phase 1
- Phase 1 has no page data — it's pure infrastructure (shell, components, theme)
- For page Phases (3-12): Claude decides optimal approach for mock data, with MCP tools available to fetch real Canvas/Ed data if needed

### i18n Configuration
- Claude decides scope based on best practices (likely: scaffolding + nav/common labels in Phase 1, page text added in each page Phase)
- Default language: auto-detect from browser language, fallback to English
- Two languages: English + Chinese (zh)

### Responsive Strategy
- Desktop-only — faithfully replicate prototype's three-column layout
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Specification (PRIMARY — these ARE the spec)
- `prototype/dashboard.html` — Dashboard page prototype (largest, defines most shared components)
- `prototype/auth.html` — Auth page prototype
- `prototype/setup.html` — Setup/onboarding page prototype
- `prototype/courses.html` — Courses list page prototype
- `prototype/course-detail.html` — Course detail page prototype
- `prototype/deadline.html` — Deadlines page prototype
- `prototype/predict.html` — Predict/What-if page prototype
- `prototype/digest.html` — Digest page prototype
- `prototype/timetable.html` — Timetable page prototype
- `prototype/settings.html` — Settings page prototype
- `prototype/DESIGN_SYSTEM.md` — Reusable CSS patterns extracted from prototypes (color vars, card styles, paper texture, Rough.js patterns)

### Design Philosophy (reference only, not implementation spec)
- `docs/frontend_brief.md` — Aesthetic direction, color system rationale, component design principles

### Technical Architecture
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture specification
- `docs/UniBoard_TRD_v2.md` §12 — REST API specification (for understanding data shape, not implemented in Phase 1)

### Requirements
- `.planning/REQUIREMENTS.md` — UI-07 (design system requirement), INFRA-10 (i18n requirement)
- `.planning/ROADMAP.md` — Phase 1 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No source code will exist — Phase 1 starts from create-next-app
- 10 HTML prototype files are the visual source of truth for extracting shared patterns

### Established Patterns
- No patterns established yet — Phase 1 will set conventions for all subsequent phases
- prototype/DESIGN_SYSTEM.md contains CSS variable system, card patterns, paper texture, and Rough.js usage patterns to replicate

### Integration Points
- Phase 2 will add OpenAPI spec + mock API layer on top of Phase 1's foundation
- Phase 3-12 will import design system components and use AppShell layout to build each page
- i18n message files will grow as each page Phase adds its translations

</code_context>

<specifics>
## Specific Ideas

- HTML prototypes must be replicated 1:1 — all animations, hover effects, transitions, interactive elements
- User will clarify specific page logic/functionality during each page Phase (3-12), not in Phase 1
- MCP tools (Canvas/Ed API) are available for fetching real data when building page Phases
- Users are USYD students on MacBooks/laptops — optimize for that viewport

</specifics>

<deferred>
## Deferred Ideas

- Mobile/tablet responsive layout — MOBILE-01 (v2)
- Page-specific functionality logic — to be discussed in Phase 3-12
- Dark mode — not in requirements

</deferred>

---

*Phase: 01-design-system-foundation*
*Context gathered: 2026-03-20*
