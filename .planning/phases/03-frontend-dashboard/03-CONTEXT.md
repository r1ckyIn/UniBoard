# Phase 3: Frontend Dashboard - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete Next.js frontend with 7 pages (Dashboard, Timetable placeholder, Courses, Deadlines, Predict, Digest, Settings) + 3-step onboarding flow + login/register pages. All pages follow the Anthropic-inspired design system with paper texture, Rough.js hand-drawn borders, and warm color palette. English/Chinese bilingual UI.

Requirements: PLAT-01, PLAT-02, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07

</domain>

<decisions>
## Implementation Decisions

### Design System Translation
- Component library: **Pure custom components** — no shadcn/ui, match prototype exactly
- Rough.js integration: **Canvas component wrapper** — encapsulate `<RoughCard>`, `<RoughBorder>` etc. with internal canvas overlay for hand-drawn borders. Handle resize and SSR (client-only rendering)
- Rough Notation: **Auto-play on page load** — staggered animation sequence on mount (circle WAM, underline weekday, highlight encouragement text). Consistent with prototype behavior
- Paper texture: **CSS direct migration** — SVG fractalNoise grain overlay (opacity 0.12) + repeating-linear-gradient ruled lines from prototype, applied as global Tailwind styles
- Icons: **Lucide React** (`lucide-react` package)
- Fonts: **Inter** (body/UI) + **Source Serif 4** (headings/display) via Google Fonts
- Charts: **Rough.js hand-drawn charts** — donut chart (pure arc), progress bars (roughCanvas.rectangle), trend lines. All charts use hand-drawn aesthetic matching prototype
- CSS Variables: migrate all prototype CSS variables (--dark, --cream, --orange, --blue, --green, --amber, --card-bg, --radius, etc.) into Tailwind CSS config

### Page Content & Data

#### Dashboard
- Hero: **100vh first screen** — greeting + date + encouragement + "your dashboard ↓" scroll prompt with breathing animation. Data pushed below fold. Matches "stress-relief first, data second" philosophy
- Below fold: Stats row (WAM/Target/Alerts), Course Grades table (4 columns), Deadline timeline (urgency colors), Assessment weight donut chart
- All data from: GET /api/v1/gpa/summary, GET /api/v1/deadlines, GET /api/v1/gpa/trend

#### Courses
- **One-stop course view**: Card per course showing course name, current WAM, assessed progress %, Grade Band
- Click to expand: assessment breakdown (score + weight per assessment), file folder list (AI descriptions from materials API), Ed high-value posts (endorsed/staff-answered)
- Data from: GET /api/v1/gpa/courses/{id}, GET /api/v1/courses/{id}/materials, GET /api/v1/courses/{id}/discussions

#### Deadlines
- **Calendar + timeline dual view**: Top = month calendar with deadline dot markers (orange-soft background on deadline days), Bottom = filterable timeline list with urgency color coding (urgent ≤24h red, warning 24-72h amber, normal >72h default)
- Calendar and timeline interlinked — clicking a day filters the timeline
- Data from: GET /api/v1/deadlines (with multi-dimensional filters), GET /api/v1/deadlines/conflicts

#### Predict (What-if)
- **Slider + number input** per ungraded assessment: drag slider (0-100) or type exact number
- **Client-side real-time calculation**: download grade data once, compute WAM/GPA locally on every slider change. API call only when saving scenarios
- Target GPA path: display minimum required scores per assessment (uniform distribution default)
- Save/compare multiple named scenarios
- Data from: GET /api/v1/gpa/summary (initial data), POST /api/v1/gpa/what-if (save), GET /api/v1/gpa/what-if (list), POST /api/v1/gpa/target

#### Digest
- **Rule-engine version** (Phase 3): aggregate new grades, upcoming deadlines, new Ed high-value posts into daily cards
- Display as chronological card feed — each day is a card with sections for grades/deadlines/posts
- Phase 4 adds AI urgency scoring and GPA relevance ranking
- Data from: GET /api/v1/gpa/summary, GET /api/v1/deadlines, GET /api/v1/courses/{id}/discussions (aggregated client-side)

#### Settings
- **4 modules**: Token management (Canvas/Ed token view, update, status — valid/expired), GPA target setting (target WAM/GPA for Predict and Dashboard), Manual course linking (Canvas-Ed course matching for auto-match failures), User profile (name, email, password change)
- Data from: GET/PUT /api/v1/users/me, GET/PUT /api/v1/users/me/tokens, POST /api/v1/gpa/target

#### Timetable
- **Beautiful placeholder page**: "Coming Soon" with hand-drawn style illustration and brief description. Maintains visual consistency with other pages

### Empty States & Loading
- **Skeleton + sync progress**: Page structure shows skeleton loading placeholders, top bar shows "Syncing your course data..." with progress indicator. Auto-refresh when sync completes
- Per-section error boundaries: failed API call shows friendly hand-drawn style error card with "Retry" button, doesn't crash entire page

### Onboarding Flow
- **3 steps**: Step 1 = email + password registration. Step 2 = embedded screenshot tutorial for Canvas/Ed token retrieval (arrows + annotations showing exactly where to click). Step 3 = paste both tokens (Canvas + Ed), instant validation, trigger first sync on success
- **Both tokens required**: Canvas and Ed tokens are both mandatory. No skip option
- **Inline error handling**: Red error text below input field ("Token invalid, please check if copied completely"), page not locked — user can re-paste immediately
- Token validation: test API call on submission, immediate feedback

### Login/Register Page
- **Split-screen layout**: Left side = brand showcase (UniBoard logo + tagline + hand-drawn decorations), Right side = login/register form. Similar to Anthropic website login style

### Navigation & Layout
- **Next.js App Router** (14+): Server Components for initial load, Client Components for interactivity
- **Three-column layout**: narrow icon sidebar (68px → 224px on hover) | main content | right panel (300px, sticky)
- Sidebar: logo fixed position, icon-only with labels fade-in on hover, active item orange-tinted background
- **Right panel: per-page customized content** — Claude's discretion on what each page displays. Will iterate based on user feedback from real student testing
- **Responsive design**: Mobile = sidebar collapses to bottom navigation bar or hamburger menu, right panel folds below main content
- **Page transitions**: Simple fade in/out between pages. Restrained, consistent with paper aesthetic

### Internationalization
- **English + Chinese bilingual**: using `next-intl` with App Router integration
- URL prefix switching: `/en/dashboard`, `/zh/dashboard`
- Translation files in JSON format
- Default language: English

### Data & State Management
- **TanStack Query v5**: stale-while-revalidate strategy. staleTime aligned with sync frequencies (grades 15min, deadlines 1h)
- Show cached data immediately on page switch, silently refetch in background
- Error handling: per-query error states, retry with exponential backoff

### Claude's Discretion
- Right panel content per page — design based on available data and page context, iterate from user feedback
- Exact skeleton loading design patterns
- Exact Rough.js canvas component implementation details
- Responsive breakpoints and mobile layout specifics
- TanStack Query cache configuration details per endpoint
- Page transition animation timing and easing
- Digest page aggregation logic (which data to group per day)
- Rough.js chart implementation details (arc angles, roughness parameters)
- next-intl configuration and middleware setup

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System & Prototype
- `prototype/dashboard.html` — **Primary design reference**: complete Dashboard page with Rough.js borders, paper grain, ruled lines, CSS variables, sidebar, right panel, hero section, all component styles. MUST be the visual source of truth
- `docs/frontend_brief.md` — Design brief: color system, component specs, layout structure, design philosophy, inspiration sources

### Backend API (Phase 2 output — frontend will consume these)
- `src/web/routes/gpa.py` — 6 GPA endpoints (summary, course detail, what-if CRUD, target, trend)
- `src/web/routes/deadlines.py` — Deadline endpoints (list with filters, detail, conflicts)
- `src/web/routes/materials.py` — Course materials endpoints (folder list, file list, search)
- `src/web/routes/intelligence.py` — Ed intelligence endpoints (high-value posts)
- `src/web/routes/sync.py` — Sync trigger and status endpoints
- `src/web/routes/auth.py` — Authentication endpoints (register, login, token refresh)
- `src/web/routes/users.py` — User profile and token management endpoints
- `src/schemas/` — All Pydantic response/request schemas (gpa.py, deadline.py, materials.py, etc.)

### API Conventions (Phase 1 decisions)
- `src/schemas/common.py` — SuccessResponse[T], ErrorResponse, PaginationMeta response wrapper patterns
- `docs/UniBoard_TRD_v2.md` §12 — REST API specification (endpoint patterns, response format)
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture reference

### Business Requirements
- `docs/UniBoard_BRD_v2.md` — Business requirements, user personas (Emily, Kevin, Sarah), feature specs
- `.planning/REQUIREMENTS.md` — Requirements traceability (UI-01 through UI-07, PLAT-01, PLAT-02)

### Prior Phase Context
- `.planning/phases/01-foundation-data-acquisition/01-CONTEXT.md` — Global decisions: REST API conventions, logging, testing strategy, token management
- `.planning/phases/02-core-services-api/02-CONTEXT.md` — Service layer decisions: GPA calculation logic, deadline dedup, sync engine, API design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prototype/dashboard.html` — Complete CSS variable system, layout structure, Rough.js usage patterns, Rough Notation animation sequence. Direct port to Next.js/Tailwind
- `src/schemas/` — Pydantic schemas define exact API response shapes. Frontend TypeScript types should mirror these
- `src/web/routes/` — 8 route modules define all available API endpoints and their parameters

### Established Patterns
- REST API response: `{"data": ..., "meta": {"timestamp": ...}}` — frontend API client must unwrap this
- Authentication: JWT Bearer token in Authorization header — frontend must store and send with every request
- Pagination: cursor-based via PaginationMeta — frontend must handle cursor pagination
- Error format: `{"error": {"code": "...", "message": "...", "details": ...}}` — frontend error handling matches this

### Integration Points
- Frontend connects to backend at configurable API_URL (default http://localhost:8000)
- JWT token from /api/v1/auth/login stored client-side (httpOnly cookie or localStorage)
- All API calls require Authorization: Bearer <token> header (except register/login)
- Sync status endpoint for showing data freshness in UI
- Token management endpoints for onboarding and settings

</code_context>

<specifics>
## Specific Ideas

- Design philosophy (103 iterations): "学生书桌上最顺手的那本笔记" — stress-relief first, data second. Hero welcome occupies 100vh first screen
- Encouragement tone: casual friend, not slogan ("The COMP2017 lab and the stats quiz are done and behind you now.")
- Rough.js usage from prototype: hand-drawn card borders, progress bars (roughCanvas.rectangle), donut chart (pure arc), timeline line, background doodles (stars, waves, dots — fixed layer, low opacity, notebook-margin-doodle feel)
- Rough Notation usage from prototype: animated text annotations — underline weekday, circle "Week 3", highlight encouragement text, circle WAM number on hover. Staggered playback sequence
- Course Grades table from prototype: 4 columns (Course | Assessed progress bar + % | Earned weighted % | Target grade badge). Hover: Rough Notation circles the grade + fade-in "see predicted grade →" link
- Right panel from prototype: sticky, doesn't scroll with main content. Current WAM with hand-drawn circle annotation. Mini calendar with deadline dot indicators
- Sidebar from prototype: Logo fixed even when expanded. Active item: orange-tinted background. Labels: opacity 0→1 on hover with transition
- Users will test with real USYD students → right panel design will iterate based on feedback

</specifics>

<deferred>
## Deferred Ideas

- AI-enhanced digest with urgency scoring and GPA relevance — Phase 4
- AI course material Q&A — Phase 4
- Deadline reminder notifications (72h/24h/3h) — Phase 4 (backend notification system)
- GPA risk alert display — Phase 4 (backend intelligence)
- Dark mode — future enhancement
- Mobile-native app — future enhancement
- Personalized dashboard layout customization — v2 PERS-01
- AiStudyMate integration widget — post-v1

</deferred>

---

*Phase: 03-frontend-dashboard*
*Context gathered: 2026-03-16*
