# Feature Landscape

**Domain:** Academic GPA maximization dashboard (Canvas + Ed Discussion aggregator)
**Researched:** 2026-03-20
**Overall confidence:** HIGH

---

## Table Stakes

Features users expect from an academic dashboard. Missing any = product feels incomplete compared to Better Canvas (1.5M users), Atlas (800K users), or even Canvas Student App.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time GPA/WAM display | Better Canvas and Canvas GPA Extension both do this. Students' #1 question is "what's my current grade?" | Low | Canvas API provides grades directly; compute WAM from weighted scores. Prototype: `dashboard.html` stats row |
| Per-course grade breakdown | Every competitor shows per-course scores. Atlas and Better Canvas both surface this | Low | Canvas assignment_groups API. Prototype: `courses.html` card grid |
| Assessment weight visualization | Students need to know what's worth how much. Canvas GPA Extension does this at basic level | Med | Unit Outline HTML parsing is the differentiator — more accurate than Canvas-only data. Prototype: `course-detail.html` donut chart |
| Unified deadline view | MyStudyLife (4.7/5 rating), Better Canvas todo list, Canvas Student App all provide this. Core pain point | Med | Three-source aggregation (Canvas + Ed Lessons + Ed Discussion) is unique; rendering is standard. Prototype: `deadline.html` |
| Deadline reminders/notifications | Every student planner app has tiered reminders (72h/24h/3h). Expected by all user personas | Low | Notification bell in header + notification panel. Prototype: `dashboard.html` header dropdown |
| 3-step onboarding flow | Atlas achieves zero-config Canvas sync. UniBoard needs token paste but must be equally frictionless | Med | Token acquisition requires screenshots/guides for non-technical users (Persona C: Sarah). Prototype: `setup.html` |
| Search across course materials | Atlas and Better Canvas provide course search. Students expect to find files without navigating folder trees | Med | Keyword search across synced Canvas Modules + Ed Lessons content |
| User authentication (JWT + register/login) | Any multi-user web app requires auth. Zero-install web access is a stated requirement | Low | Simple JWT + bcrypt; no OAuth complexity. Prototype: `auth.html` |
| Settings & token management | Token expiration is a real operational issue. Users must be able to update tokens, set preferences | Low | Prototype: `settings.html` with token fields, notification toggles, GPA target |
| Responsive three-column layout | Desktop-first is decided, but the layout must work well at various desktop widths | Med | Sidebar (68px→224px hover) + main + right panel (300px sticky). All prototypes implement this |
| Staggered entrance animations | Prototype has 10 delay classes (.d1-.d10) with slideUp. Removing these would feel "broken" vs prototypes | Low | CSS keyframe animations with cubic-bezier easing. Already fully specced in DESIGN_SYSTEM.md |
| Paper texture + ruled lines | Core to the "notebook on your desk" aesthetic. Removing it makes the app look like any other SaaS | Low | SVG fractalNoise overlay + repeating-linear-gradient. Two CSS pseudo-elements |

## Differentiators

Features that set UniBoard apart. No competitor combines all of these.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **What-if GPA simulator** (slider-based) | Better Canvas has a basic GPA calculator, but UniBoard's slider-based per-assessment prediction with real-time WAM update is uniquely interactive | High | Core differentiator. Prototype: `predict.html` with expandable per-course cards, sliders per assessment, instant recalculation. Requires assessment weights from Unit Outline |
| **Canvas + Ed dual-platform integration** | Zero competitors integrate Ed Discussion or Ed Lessons. This is UniBoard's unique moat — USYD heavily uses Ed | High | Three adapters: CanvasAdapter, EdDiscussionAdapter, EdLessonsAdapter. Undocumented Ed API adds complexity |
| **Rough.js hand-drawn aesthetic** | No competitor uses hand-drawn UI. This creates instant visual recognition and reduces academic stress. Validated through 103 prototype iterations | Med | Rough.js 4.6.6 for card borders, donut charts, timeline dots, progress bars. React wrapper (`rough-react-wrapper`) exists with Next.js support |
| **AI-powered daily digest** | No competitor aggregates cross-platform academic intelligence into a single daily briefing. Atlas has AI Q&A but no daily synthesis | High | Rule-based aggregation (P0) + Claude API urgency scoring (P1). Prototype: `digest.html` with urgency badges, grade alerts, deadline warnings, Ed highlights |
| **Ed Discussion high-value post filtering** | No competitor mines Ed Discussion for exam scope, rubric details, assignment clarifications. This is invisible gold for GPA | Med | Rule-based first (is_endorsed + is_staff_answered), then AI extraction. Critical for Persona B (Kevin — can't read all Ed posts) |
| **AI-generated folder descriptions** | Atlas does AI Q&A on materials but doesn't help students understand file organization. UniBoard explains "what's in each folder" | Med | MCP Agent reads folder contents, generates one-line descriptions. Especially valuable for Persona C (Sarah — lost freshman) |
| **Target GPA path planner** | Reverse-calculate required scores per remaining assessment. Better Canvas only shows current GPA, not what you need | Med | Requires assessment weights + current scores + remaining assessments. Pure math once data is available |
| **MCP Agent cross-platform research** | AI that autonomously searches across Canvas + Ed to answer student questions with full context and cited sources | High | Claude Opus 4.6 + MCP tools architecture. Streaming chat interface in deadline page. Prototype: `deadline.html` AI chat panel |
| **Rough Notation text annotations** | Interactive highlights, underlines, and circles that animate on hover/load. Unique micro-interaction pattern | Low | rough-notation library. Used on hero text, grade cells (hover circle), WAM value (persistent circle) |
| **Hero section (data below fold)** | Counter-intuitive: push data below fold, greet student with encouragement first. Reduces anxiety before showing grades | Low | Prototype: `dashboard.html` hero with greeting, breathing scroll hint, Rough.js doodle decorations |
| **Timetable weekly view** | Competitors focus on deadlines; UniBoard also shows class schedule in a visual weekly grid | Med | Prototype: `timetable.html`. Requires class schedule data (manual input or Canvas calendar sync) |
| **i18n (English + Chinese)** | Targets Chinese international student community at USYD — significant demographic that competitors ignore | Med | next-intl with App Router `[locale]` segment. ~2KB bundle. Server Component translations add zero client JS |
| **Skill system (MCP Agent)** | Auto-generate reusable prompt templates per operation/course. No competitor has self-improving AI skills | High | ~50 skills across data collection, processing, AI analysis, user actions. Per-course customization. M3 feature |

## Anti-Features

Features to explicitly NOT build. Each has a clear reason tied to product principles or risk.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Ed Discussion posting/replying | Read-only policy: avoid polluting Ed ecosystem. Writing to Ed creates spam risk and potential university policy violations | Display high-value posts read-only with source links back to Ed |
| Canvas assignment submission | Academic integrity risk. Handling submissions creates liability and regulatory exposure | Link to Canvas for submission; show deadline countdown only |
| Canvas quiz/exam answering | Direct academic integrity violation. University could ban the platform | Never access quiz content. Only show quiz deadlines |
| Homework ghostwriting / direct answers | Violates academic integrity. Contradicts GPA *maximization* through *learning* | AI guides learning: "here's how to approach this" not "here's the answer" |
| Social/chat features | Irrelevant to GPA. Adds moderation burden. Ed Discussion already serves this need | Focus all UI real estate on grade-relevant information |
| Course recommendations / enrollment advice | Out of scope for GPA tracking. Requires different data (course reviews, workload estimates) | Only show enrolled courses. Let students use RateMyProfessors etc. separately |
| Mobile-first / native mobile app | Desktop-first decision for MVP. Mobile adds 2x surface area with different interaction patterns | Responsive desktop-first. PWA consideration in Phase 5 |
| Multi-university support (Phase 1-4) | USYD-only simplifies Unit Outline parsing, Ed API patterns, and user acquisition | Abstract Platform Adapter layer for future expansion, but don't build adapters yet |
| OAuth / AWS Cognito (Phase 1-3) | Simple JWT is faster to implement. Cognito adds AWS dependency for auth flow | JWT + bcrypt for MVP. Migrate to Cognito only if scaling demands it |
| Interactive AI tutoring (real-time Q&A mode) | High complexity, high API cost, unclear value vs simpler AI features. Deferred to v2 | Focus on AI digest, folder descriptions, and material Q&A first |
| Personalized dashboard questionnaire | Requires statistically significant user data to be useful. Premature before product-market fit | Ship one good default layout. Personalization after 500+ users |
| Real-time collaboration / shared notes | Feature creep. Competes with Google Docs, Notion. Not grade-relevant | Focus on individual GPA tracking. Students can share screenshots |
| Grade history / semester comparison | Adds data complexity (multi-semester sync) without immediate GPA improvement value | Show current semester only. Historical tracking in Phase 5+ |

## Feature Dependencies

```
Unit Outline HTML parsing
  → Assessment weight visualization
  → What-if GPA simulator (needs weights)
  → Target GPA path planner (needs weights + remaining assessments)

Canvas grades API
  → Real-time GPA/WAM display
  → Per-course grade breakdown
  → GPA risk alerts

Three-source deadline aggregation
  → Canvas adapter (assignments)
  → Ed Lessons adapter (lesson assignments)
  → Ed Discussion adapter (teacher-mentioned deadlines)
  → SHA-256 deduplication across sources

Auth + Token management
  → All data sync features (Canvas, Ed)
  → Onboarding flow

Design system (Tailwind + Rough.js)
  → All page components
  → All visual features

Mock API (MSW + OpenAPI contracts)
  → All frontend pages (M1)
  → Zero-change backend integration (M2)

i18n (next-intl)
  → All user-facing text across 10 pages
  → Should be set up in M1 Phase 1 to avoid retrofitting
```

## Feature-to-Page Mapping

| Page | Primary Features | Milestone |
|------|-----------------|-----------|
| Auth | Login, register, JWT | M1 |
| Setup | 3-step token onboarding, token validation | M1 |
| Dashboard | Hero greeting, WAM stats, course grades, deadline timeline, assessment weights, Rough.js doodles | M1 |
| Courses | Course card grid, grade overview per course, search | M1 |
| Course Detail | Assessment breakdown (donut chart), materials list, Ed Discussion posts, AI folder descriptions | M1 (mock), M2 (real), M3 (AI) |
| Deadlines | Calendar view, filterable timeline, urgency badges, AI chat panel (placeholder M1, MCP Agent M3) | M1 |
| Predict | Slider-based What-if simulator, per-course cards, real-time WAM recalculation | M1 |
| Digest | Daily intelligence digest, urgency scoring, grade alerts, Ed highlights, refresh button | M1 (mock), M2 (rule-based), M3 (AI) |
| Timetable | Weekly class schedule grid, color-coded courses | M1 |
| Settings | Token management, notification preferences, GPA target, profile, language switch | M1 |

## MVP Recommendation

### Must ship in M1 (frontend with Mock API):

1. **All 10 pages converted from HTML prototypes** — the prototypes are the product spec; every interaction must be preserved pixel-perfect
2. **Design system fully ported** — Rough.js hand-drawn borders, paper texture, Rough Notation, all animations
3. **Mock API via MSW** — contract-first OpenAPI specs that M2 backend will implement; frontend zero-change on integration
4. **i18n scaffolding** — next-intl with `[locale]` routing, EN + CN translations for all pages
5. **Auth flow (mock)** — login/register/setup pages functional with mock JWT

### Must ship in M2 (backend):

1. **Canvas adapter** — grades, assignments, modules with rate limiting + circuit breaker
2. **Ed Discussion adapter** — threads, posts, with defensive Pydantic parsing
3. **Ed Lessons adapter** — lesson content and assignments
4. **Unit Outline parser** — USYD HTML scraping with weight-sum validation
5. **Sync engine** — grades 15min, deadlines 1h, modules daily, Unit Outline per semester
6. **All API contracts from M1** — implement the same OpenAPI specs the mock used

### Defer to M3 (AI/MCP):

- AI digest scoring (use rule-based in M2)
- AI folder descriptions (show raw folder names in M1-M2)
- MCP Agent Q&A (show placeholder chat in M1)
- Skill system
- AI-extracted Ed Discussion insights

### Defer to M4+ or never:

- Mobile responsiveness
- Multi-university
- Interactive AI tutoring
- Personalized dashboard questionnaire
- Grade history / semester comparison

## Competitive Position Summary

| Capability | UniBoard | Better Canvas (1.5M users) | Atlas (800K users) | Canvas Student App |
|------------|----------|---------------------------|--------------------|--------------------|
| GPA tracking | Real-time WAM + What-if simulator | Basic GPA calculator | None | Grade view only |
| Ed Discussion integration | Full (endorsed, staff, AI extraction) | None | None | None |
| Ed Lessons integration | Full (assignments, materials) | None | None | None |
| Deadline aggregation | 3-source (Canvas + Ed Lessons + Ed Discussion) | Enhanced todo list | Canvas only | Canvas only |
| AI features | MCP Agent, digest scoring, folder descriptions | None | AI Q&A, study guides, flashcards | None |
| Assessment weights | Unit Outline HTML parsing (accurate) | None | None | Partial |
| Visual design | Hand-drawn Rough.js aesthetic | Dark mode themes | Standard EdTech | Standard mobile |
| Platform | Web (desktop-first) | Chrome extension | Web + Chrome extension | Mobile app |
| Price | Free | Free | Free | Free (with Canvas) |
| USYD-specific | Yes (Ed + Unit Outline + USYD HTML) | No | No | No |

**UniBoard's moat: No competitor does Canvas + Ed integration. The Ed ecosystem (Discussion + Lessons) contains ~40% of grade-relevant information at USYD, and UniBoard is the only product that touches it.**

## Sources

- [Better Canvas Features](https://www.better-canvas.com/features) — 1.5M+ users, GPA calculator, custom dashboard, enhanced todo list
- [Atlas AI Student Platform](https://www.atlas.org/) — 800K+ users, Canvas LTI integration, AI Q&A, study guides
- [Canvas GPA Calculator Extension](https://chromewebstore.google.com/detail/canvas-gpa-calculator/einableffeiagahfigklikcgfnphihib) — Browser extension for Canvas grade calculation
- [MSW + OpenAPI Contract-First Mocking](https://dev.to/michaliskout/supercharge-frontend-development-with-msw-openapi-and-ai-generated-mocks-1bfo) — MSW + OpenAPI for contract-first frontend development
- [rough-react-wrapper](https://github.com/fsefidabi/rough-react-wrapper) — React 18 + Next.js App Router support for Rough.js
- [next-intl App Router Guide](https://next-intl.dev/docs/getting-started/app-router) — ~2KB bundle, native Server Component support
- [AI Agent UX Patterns (Smashing Magazine)](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/) — Progressive disclosure, streaming responses, consent patterns
- [UX for Agents (LangChain)](https://www.blog.langchain.com/ux-for-agents-part-1-chat-2/) — Streaming chat moving beyond traditional chat UX
- [MyStudyLife Student Planner](https://mystudylife.com/) — 4.7/5 rating, benchmark for deadline management UX
- [U Michigan MyLA Dashboard](https://www.insidehighered.com/news/student-success/academic-life/2024/03/27/u-michigan-grade-dashboard-promotes-student-learning) — Student-facing analytics embedded in Canvas
