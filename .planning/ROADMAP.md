# Roadmap: UniBoard

## Overview

UniBoard v2.0 shipped across 4 milestones (28 phases) delivering a full-stack GPA dashboard with AI/MCP features. v3.0 takes the deployed app from mock-data-with-Sentry to a fully functional production system: error tracking hardened, all 17 mock Route Handlers replaced with real backend proxies, custom email for multi-user, and AI features running against live student data. Fine granularity applied across 7 phases (29-35).

## Milestones

- ✅ **M1: Frontend App** — Phases 1-12, 11.1 (shipped 2026-03-25)
- ✅ **M2: Backend Core** — Phases 13-17 (shipped 2026-03-27)
- ✅ **M3: AI/MCP/Skills** — Phases 18-21 (shipped 2026-03-29)
- ✅ **M4: Hardening & Polish** — Phases 22-28 (shipped 2026-04-04)
- 🚧 **v3.0: Production Ready + AI Core** — Phases 29-35 (active)

## Phases

<details>
<summary>✅ M1: Frontend App (Phases 1-12, 11.1) — SHIPPED 2026-03-25</summary>

- [x] Phase 1: Design System & Foundation (2/2 plans) — completed 2026-03-20
- [x] Phase 2: API Contracts & Mock Layer (5/5 plans) — completed 2026-03-20
- [x] Phase 3: Auth Page (4/4 plans) — completed 2026-03-21
- [x] Phase 4: Setup Page (5/5 plans) — completed 2026-03-21
- [x] Phase 5: Dashboard Page (11/11 plans) — completed 2026-03-22
- [x] Phase 6: Courses Page (2/2 plans) — completed 2026-03-23
- [x] Phase 7: Course Detail Page (4/4 plans) — completed 2026-03-23
- [x] Phase 8: Deadlines Page (3/3 plans) — completed 2026-03-23
- [x] Phase 9: Predict Page (3/3 plans) — completed 2026-03-24
- [x] Phase 10: Digest Page (3/3 plans) — completed 2026-03-24
- [x] Phase 11: Timetable Page (3/3 plans) — completed 2026-03-25
- [x] Phase 11.1: Real Data & UAT Gap Closure (3/3 plans) — completed 2026-03-25
- [x] Phase 12: Settings Page (4/4 plans) — completed 2026-03-25

</details>

<details>
<summary>✅ M2: Backend Core (Phases 13-17) — SHIPPED 2026-03-27</summary>

- [x] Phase 13: Supabase Foundation (3/3 plans) — completed 2026-03-26
- [x] Phase 14: Platform Adapters (3/3 plans) — completed 2026-03-26
- [x] Phase 15: Core Services & API Routes (3/3 plans) — completed 2026-03-27
- [x] Phase 16: Sync Engine (2/2 plans) — completed 2026-03-27
- [x] Phase 17: Notifications & Digest (2/2 plans) — completed 2026-03-27

</details>

<details>
<summary>✅ M3: AI/MCP/Skills (Phases 18-21) — SHIPPED 2026-03-29</summary>

- [x] Phase 18: AI Enhancement (3/3 plans) — completed 2026-03-28
- [x] Phase 19: MCP Agent & Streaming (5/5 plans) — completed 2026-03-28
- [x] Phase 20: Skill System (3/3 plans) — completed 2026-03-29
- [x] Phase 21: MCP Server & ROI Analysis (3/3 plans) — completed 2026-03-29

</details>

<details>
<summary>✅ M4: Hardening & Polish (Phases 22-28) — SHIPPED 2026-04-04</summary>

- [x] Phase 22: Critical Fixes & Config Hardening (3/3 plans) — completed 2026-04-01
- [x] Phase 23: Code Quality Refactor (3/3 plans) — completed 2026-04-01
- [x] Phase 24: Build Health Green (3/3 plans) — completed 2026-04-01
- [x] Phase 25: Security & Observability (3/3 plans) — completed 2026-04-03
- [x] Phase 26: CI/CD & Production Deployment (3/3 plans) — completed 2026-04-04
- [x] Phase 27: Frontend UX Fixes & Course Materials Preview (3/3 plans) — completed 2026-04-04
- [x] Phase 28: Deadlines Page Enhancement (3/3 plans) — completed 2026-04-04

</details>

### v3.0: Production Ready + AI Core (Active)

- [x] **Phase 29: Sentry Hardening** - Configure Sentry projects for Python + Next.js with DSN env vars and CSP update (completed 2026-04-06)
- [ ] **Phase 30: BFF Proxy Conversion** - Replace 17 mock Route Handlers with proxies to Railway Python backend
- [ ] **Phase 31: E2E Verification & AI Config** - Validate full user journey with real data and enable AI features in production
- [ ] **Phase 32: Production Email** - Custom SMTP via Resend with branded email templates
- [ ] **Phase 33: Token Lifecycle & Onboarding** - Token expiry reminders, re-auth flow, and first-login experience polish
- [ ] **Phase 34: AI Features Live** - AI study suggestions, course QA, and GPA path planning with real student data
- [ ] **Phase 35: Push Notifications** - Browser Push API for deadline reminders

## Phase Details

### Phase 29: Sentry Hardening
**Goal**: Error tracking captures both backend and frontend errors in production with correct CSP policies
**Depends on**: Phase 28 (M4 complete)
**Requirements**: OBS-01, OBS-02, OBS-03
**Success Criteria** (what must be TRUE):
  1. Sentry Python project (FastAPI) is created under org yuan-qin with DSN configured in Railway environment variables
  2. Sentry Next.js project is created under org yuan-qin with DSN configured in Vercel environment variables
  3. Frontend CSP connect-src includes both the Railway backend domain and Sentry ingest domain (no CSP violations in browser console)
**Plans:** 2/2 plans complete
Plans:
- [ ] 29-01-PLAN.md — Frontend Sentry SDK setup, config files, CSP dynamic API URL, error boundary integration
- [ ] 29-02-PLAN.md — Backend CSP CORS origins update, Sentry project creation & env var verification

### Phase 30: BFF Proxy Conversion
**Goal**: All frontend data requests flow through to the real Python backend instead of returning mock fixtures
**Depends on**: Phase 29
**Requirements**: BFF-01, BFF-02, BFF-03
**Success Criteria** (what must be TRUE):
  1. All 17 previously-mock Route Handlers proxy requests to the Railway Python backend and return real data
  2. Every proxied request includes the Supabase JWT in the Authorization header (authenticated users see their own data)
  3. Backend error responses (4xx/5xx) are transformed into user-friendly error messages in the frontend (no raw error JSON shown to users)
**Plans:** 1/3 plans executed
Plans:
- [x] 30-01-PLAN.md — Shared proxyRequest utility + comprehensive unit tests (BFF-01/02/03 foundation)
- [ ] 30-02-PLAN.md — Convert courses domain (9 routes) + GPA (3 routes) + alerts (1 route)
- [ ] 30-03-PLAN.md — Convert deadlines domain (4 routes) + user/digest/search/sync/notifications (8 routes) + spot-check tests

### Phase 31: E2E Verification & AI Config
**Goal**: A new user can complete the full journey from registration to seeing real data, and AI features return real results
**Depends on**: Phase 30
**Requirements**: BFF-04, AICONF-01, AICONF-02
**Success Criteria** (what must be TRUE):
  1. A new user can register, set up Canvas/Ed tokens, trigger first sync, and see their real course/grade/deadline data on the dashboard
  2. ANTHROPIC_API_KEY is configured in Railway and AI endpoints accept requests without returning config errors
  3. Deadline Chat, Course QA, and Unit Review all return real AI-generated results (not placeholders or mock data)
**Plans**: TBD

### Phase 32: Production Email
**Goal**: Users receive branded, reliable emails for signup confirmation and password reset via custom SMTP
**Depends on**: Phase 29
**Requirements**: EMAIL-01, EMAIL-02
**Success Criteria** (what must be TRUE):
  1. Supabase Auth sends emails via Resend SMTP instead of the built-in email service (verifiable in Resend dashboard delivery logs)
  2. Signup confirmation email uses UniBoard-branded template with logo, colors, and clear CTA button
  3. Password reset email uses UniBoard-branded template with secure reset link and expiry notice
**Plans**: TBD

### Phase 33: Token Lifecycle & Onboarding
**Goal**: Users are proactively warned about expiring API tokens and guided through a polished first-login experience
**Depends on**: Phase 31, Phase 32
**Requirements**: EMAIL-03, ONBD-01, ONBD-02
**Success Criteria** (what must be TRUE):
  1. Users receive an email or in-app notification when their Canvas/Ed tokens are approaching expiration, with a direct link to re-authorize
  2. First-time users see a guided onboarding flow after login that explains what UniBoard does and walks them through token setup
  3. Setup page handles error states gracefully (invalid token, API unreachable, sync failure) with specific error messages and retry options
**Plans**: TBD
**UI hint**: yes

### Phase 34: AI Features Live
**Goal**: AI-powered study guidance uses real student data to provide actionable GPA optimization advice
**Depends on**: Phase 31
**Requirements**: AIFEAT-01, AIFEAT-02, AIFEAT-03
**Success Criteria** (what must be TRUE):
  1. AI study suggestions analyze real assessment weights and recommend where to focus effort (e.g., "Focus on Final Exam worth 50%, not Quiz 3 worth 5%")
  2. Course material QA answers questions about Ed Lessons content with cited sources from real synced materials
  3. GPA path planner calculates specific score targets needed for remaining assessments to reach a user-defined GPA goal (e.g., "You need 78+ average on remaining subjects for Distinction")
**Plans**: TBD

### Phase 35: Push Notifications
**Goal**: Users receive timely deadline reminders without needing to open the app
**Depends on**: Phase 33
**Requirements**: AIFEAT-04
**Success Criteria** (what must be TRUE):
  1. User can opt in to browser push notifications from the Settings page
  2. Deadline reminders (72h/24h/3h tiers) are delivered as browser push notifications to opted-in users
  3. Users without push notification support (or who decline) fall back to email-based deadline reminders
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 29 → 30 → 31 → 32 → 33 → 34 → 35
Note: Phase 32 can run in parallel with Phases 30-31 (independent dependency chain).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Design System & Foundation | M1 | 2/2 | Complete | 2026-03-20 |
| 2. API Contracts & Mock Layer | M1 | 5/5 | Complete | 2026-03-20 |
| 3. Auth Page | M1 | 4/4 | Complete | 2026-03-21 |
| 4. Setup Page | M1 | 5/5 | Complete | 2026-03-21 |
| 5. Dashboard Page | M1 | 11/11 | Complete | 2026-03-22 |
| 6. Courses Page | M1 | 2/2 | Complete | 2026-03-23 |
| 7. Course Detail Page | M1 | 4/4 | Complete | 2026-03-23 |
| 8. Deadlines Page | M1 | 3/3 | Complete | 2026-03-23 |
| 9. Predict Page | M1 | 3/3 | Complete | 2026-03-24 |
| 10. Digest Page | M1 | 3/3 | Complete | 2026-03-24 |
| 11. Timetable Page | M1 | 3/3 | Complete | 2026-03-25 |
| 11.1. Real Data & UAT | M1 | 3/3 | Complete | 2026-03-25 |
| 12. Settings Page | M1 | 4/4 | Complete | 2026-03-25 |
| 13. Supabase Foundation | M2 | 3/3 | Complete | 2026-03-26 |
| 14. Platform Adapters | M2 | 3/3 | Complete | 2026-03-26 |
| 15. Core Services & API Routes | M2 | 3/3 | Complete | 2026-03-27 |
| 16. Sync Engine | M2 | 2/2 | Complete | 2026-03-27 |
| 17. Notifications & Digest | M2 | 2/2 | Complete | 2026-03-27 |
| 18. AI Enhancement | M3 | 3/3 | Complete | 2026-03-28 |
| 19. MCP Agent & Streaming | M3 | 5/5 | Complete | 2026-03-28 |
| 20. Skill System | M3 | 3/3 | Complete | 2026-03-29 |
| 21. MCP Server & ROI Analysis | M3 | 3/3 | Complete | 2026-03-29 |
| 22. Critical Fixes & Config Hardening | M4 | 3/3 | Complete | 2026-04-01 |
| 23. Code Quality Refactor | M4 | 3/3 | Complete | 2026-04-01 |
| 24. Build Health Green | M4 | 3/3 | Complete | 2026-04-01 |
| 25. Security & Observability | M4 | 3/3 | Complete | 2026-04-03 |
| 26. CI/CD & Production Deployment | M4 | 3/3 | Complete | 2026-04-04 |
| 27. Frontend UX Fixes & Materials Preview | M4 | 3/3 | Complete | 2026-04-04 |
| 28. Deadlines Page Enhancement | M4 | 3/3 | Complete | 2026-04-04 |
| 29. Sentry Hardening | v3.0 | 0/2 | Complete    | 2026-04-06 |
| 30. BFF Proxy Conversion | v3.0 | 1/3 | In Progress|  |
| 31. E2E Verification & AI Config | v3.0 | 0/TBD | Not started | - |
| 32. Production Email | v3.0 | 0/TBD | Not started | - |
| 33. Token Lifecycle & Onboarding | v3.0 | 0/TBD | Not started | - |
| 34. AI Features Live | v3.0 | 0/TBD | Not started | - |
| 35. Push Notifications | v3.0 | 0/TBD | Not started | - |
