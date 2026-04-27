# Roadmap: UniBoard v3.0

## Overview

UniBoard v3.0 begins after v2.0 — Production Foundation shipped (2026-04-25). v3.0 polishes v2.0's user experience (notifications, UX rough edges, sidebar architecture) before adding new product features. Three active phases (35 / 36 / 37) — focus on reducing user friction and modernizing frontend internals. v2.0 archive: `.planning/milestones/v2.0-ROADMAP.md`.

## Milestones

- ✅ **v2.0 — Production Foundation** — Phases 1-12, 11.1, 13-34, 32.1, 38, 38.1, 38.2 (39 phases shipped 2026-04-25) [archive](milestones/v2.0-ROADMAP.md)
- 🚧 **v3.0 UX Polish + Notifications + Sidebar Refactor** — Phases 35-37 (active)

## Phases

<details>
<summary>✅ v2.0 — Production Foundation (39 phases) — SHIPPED 2026-04-25</summary>

**Sub-milestones absorbed:**

- M1 Frontend App (Phases 1-12, 11.1) — shipped 2026-03-25
- M2 Backend Core (Phases 13-17) — shipped 2026-03-27
- M3 AI/MCP/Skills (Phases 18-21) — shipped 2026-03-29
- M4 Hardening (Phases 22-28) — shipped 2026-04-04
- Production Hardening — Phases 29, 30, 31, 31.1, 32, 32.1, 33, 34, 38, 38.1, 38.2 — shipped 2026-04-04 → 2026-04-25

**Phase list (collapsed; full detail in [archive](milestones/v2.0-ROADMAP.md)):**

- [x] Phase 1: Design System & Foundation (2/2 plans) — 2026-03-20
- [x] Phase 2: API Contracts & Mock Layer (5/5 plans) — 2026-03-20
- [x] Phase 3: Auth Page (4/4 plans) — 2026-03-21
- [x] Phase 4: Setup Page (5/5 plans) — 2026-03-21
- [x] Phase 5: Dashboard Page (11/11 plans) — 2026-03-22
- [x] Phase 6: Courses Page (2/2 plans) — 2026-03-23
- [x] Phase 7: Course Detail Page (4/4 plans) — 2026-03-23
- [x] Phase 8: Deadlines Page (3/3 plans) — 2026-03-23
- [x] Phase 9: Predict Page (3/3 plans) — 2026-03-24
- [x] Phase 10: Digest Page (3/3 plans) — 2026-03-24
- [x] Phase 11: Timetable Page (3/3 plans) — 2026-03-25
- [x] Phase 11.1: Real Data & UAT Gap Closure (3/3 plans) — 2026-03-25
- [x] Phase 12: Settings Page (4/4 plans) — 2026-03-25
- [x] Phase 13: Supabase Foundation (3/3 plans) — 2026-03-26
- [x] Phase 14: Platform Adapters (3/3 plans) — 2026-03-26
- [x] Phase 15: Core Services & API Routes (3/3 plans) — 2026-03-27
- [x] Phase 16: Sync Engine (2/2 plans) — 2026-03-27
- [x] Phase 17: Notifications & Digest (2/2 plans) — 2026-03-27
- [x] Phase 18: AI Enhancement (3/3 plans) — 2026-03-28
- [x] Phase 19: MCP Agent & Streaming (5/5 plans) — 2026-03-28
- [x] Phase 20: Skill System (3/3 plans) — 2026-03-29
- [x] Phase 21: MCP Server & ROI Analysis (3/3 plans) — 2026-03-29
- [x] Phase 22: Critical Fixes & Config Hardening (3/3 plans) — 2026-04-01
- [x] Phase 23: Code Quality Refactor (3/3 plans) — 2026-04-01
- [x] Phase 24: Build Health Green (3/3 plans) — 2026-04-01
- [x] Phase 25: Security & Observability (3/3 plans) — 2026-04-03
- [x] Phase 26: CI/CD & Production Deployment (3/3 plans) — 2026-04-04
- [x] Phase 27: Frontend UX Fixes & Course Materials Preview (3/3 plans) — 2026-04-04
- [x] Phase 28: Deadlines Page Enhancement (3/3 plans) — 2026-04-04
- [x] Phase 29: Sentry Hardening (2/2 plans) — 2026-04-05
- [x] Phase 30: BFF Proxy Conversion (3/3 plans) — 2026-04-06
- [x] Phase 31: E2E Verification & AI Config (3/3 plans) — 2026-04-13
- [x] Phase 31.1: Observability Pipeline & Sentry Hardening (2/3 plans; 31.1-03 deferred) — 2026-04-11
- [x] Phase 32: Production Email (3/3 plans; 32-03 strategically resolved — confirmation OFF) — 2026-04-14
- [x] Phase 32.1: Sync Integration Fixes (6/6 plans) — 2026-04-14
- [x] Phase 33: Token Lifecycle & Onboarding with Auth Hardening (8/8 plans) — 2026-04-16
- [x] Phase 34: AI Features Live (6/6 plans) — 2026-04-17
- [x] Phase 38: First-Load Performance — RSC Prefetch + HydrationBoundary (4/4 plans) — 2026-04-21
- [x] Phase 38.1: Server-Prefetch ↔ Client-Consumer Parity (3/3 plans) — 2026-04-21
- [x] Phase 38.2: Navigation-Cache ↔ Skeleton-Free Parity (2/2 plans) — 2026-04-22

</details>

### 🚧 v3.0 — Active (bootstrapped 2026-04-27 via `/gsd-new-milestone v3.0`)

Three active phases continuing numbering from v2.0. Each requirement maps via `.planning/REQUIREMENTS.md` traceability table.

#### Phase 35: Push Notifications

**Goal:** Browser push (Push API) or email-based deadline reminders to notify users at configurable intervals before each deadline.

**Requirements:**
- NOTIFY-01: Users can opt-in to deadline reminder notifications via browser Push API or email channel
- NOTIFY-02: Notifications fire at configurable intervals before deadline (24h, 6h, 1h)
- NOTIFY-03: Notification preferences persist across sessions and sync cycles

**Success criteria:**
- User can opt in/out via Settings page; preference round-trips through API and persists
- At least one notification channel (browser push OR email) delivers reliably in production
- Configurable interval set lands at the chosen time (no silent drops)
- Preferences survive logout/login cycle

**Depends on:** Phase 34 (AI Features Live, shipped in v2.0)
**Plans:** TBD (promote via `/gsd-discuss-phase 35` → `/gsd-plan-phase 35`)

#### Phase 36: UX Polish

**Goal:** Fix accumulated UX rough edges across AI chat, setup flow, and error handling — reduce friction observed during v2.0 production walkthroughs.

**Requirements:**
- UXPOL-01: AI Chat shows client-side validation when input < 3 chars (no raw 422)
- UXPOL-02: AI request failures show specific backend error message (not generic "AI request failed")
- UXPOL-03: Setup TokenStep skips re-validation for tokens that already passed (memory: project_ux_improvements_backlog.md)
- UXPOL-04: Setup SuccessStep shows per-domain sync progress bars (memory: project_sync_progress_ux.md)

**Success criteria:**
- AI Chat input < 3 chars shows inline guidance, never returns 422 to user-facing UI
- AI failures display the specific backend error string in toast/inline message
- Setup retry skips re-validation for already-validated tokens (verified in dev with throttle test)
- Setup SuccessStep renders per-domain progress (Canvas / Ed) instead of single composite indicator

**Depends on:** Phase 31 (E2E Verification, shipped in v2.0)
**Plans:** TBD (promote via `/gsd-discuss-phase 36` → `/gsd-plan-phase 36`)

#### Phase 37: Sidebar Transform-Based Architecture Refactor

**Goal:** Refactor sidebar from current `transition: width` implementation to transform-based architecture for better animation perf and modularity. Eliminates sidebar hover lag on content-heavy pages.

**Requirements:**
- REFACTOR-01: Sidebar uses transform-based positioning (no layout-thrashing on toggle)
- REFACTOR-02: 60fps animation on Intel Mac (per memory: project_backdrop_filter_intel_mac.md GPU paint-cost family)

**Approach (from absorbed backlog 999.1):**
- Two-layer DOM: outer 68 px container always visible + inner 224 px panel absolutely positioned
- Default `translateX(-156 px)`, `translateX(0)` on hover — GPU-composited, no per-frame layout
- Carefully rework icon positioning logic and run pixel-diff visual verification

**Success criteria:**
- DevTools Performance panel shows zero layout thrashing on hover toggle
- Intel Mac (user's primary device) measures 60fps stable during animation
- Visual parity with current sidebar (pixel-diff regression test green on dashboard / predict / settings / timetable)

**Depends on:** Phase 36 (UX Polish)
**Merge note:** Backlog Phase 999.1 was duplicate scope — absorbed into Phase 37 on 2026-04-27 (this milestone bootstrap). 999.1 entry removed from backlog.
**Plans:** TBD (promote via `/gsd-discuss-phase 37` → `/gsd-plan-phase 37`)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-12, 11.1 | v2.0 (M1) | 47/47 | Complete | 2026-03-25 |
| 13-17 | v2.0 (M2) | 13/13 | Complete | 2026-03-27 |
| 18-21 | v2.0 (M3) | 14/14 | Complete | 2026-03-29 |
| 22-28 | v2.0 (M4) | 21/21 | Complete | 2026-04-04 |
| 29-34, 32.1, 38, 38.1, 38.2 | v2.0 (production hardening) | ~45/45 | Complete | 2026-04-25 |
| 35. Push Notifications | v3.0 | 0/0 | Not started | - |
| 36. UX Polish | v3.0 | 0/0 | Not started | - |
| 37. Sidebar Transform Refactor | v3.0 | 0/0 | Not started — absorbs backlog 999.1 | - |

## Backlog

### ~~Phase 999.1: Sidebar transform-based architecture refactor~~ — ABSORBED into Phase 37 on 2026-04-27

Original scope merged verbatim into Phase 37 during v3.0 milestone bootstrap (`/gsd-new-milestone v3.0`). Two-layer DOM `translateX` approach is now Phase 37's implementation strategy. See Phase 37 details above.

### ~~Phase 999.2: Page mount lazy loading~~ — PROMOTED to Phase 38 on 2026-04-20
Original scope ("viewport-driven progressive mount") superseded by Phase 38's eager-prefetch approach. Symptom and debug context preserved in Phase 38 archive.

**Post-ship verdict (2026-04-21, pending final UAT sign-off):** retained — provisional until Phase 38 P04 baselines are captured and the 6-page pixel-diff run is green on a fresh PR. The expected verdict after that run is **obsolete** (superseded by Phase 38 RSC prefetch: all 6 pages render real data on first paint, eliminating the viewport lazy-mount symptom at its source). Rubric for closing this backlog:
- If 0 of 6 pixel-diff baselines show any `SkeletonCard` pixels → flip status to `obsolete` and strike this backlog entry entirely.
- If any baseline shows residual skeleton in a specific sub-region (e.g., below-the-fold card, a particular state transition) → keep as `retained + residual case` with the exact sub-region documented, so a future micro-phase can address it with a narrow viewport-gated remount.
- If AI study-rec hero / deadline hero flashes despite RSC hydration → treat as Phase 38 bug (Rule 1), not a Phase 999.2 scope item; file a gap-closure plan against Phase 38.

---

*Roadmap reorganized 2026-04-27 by `/gsd-complete-milestone v2.0`. v3.0 milestone bootstrapped same day via `/gsd-new-milestone v3.0` — Phases 35/36/37 active; backlog 999.1 absorbed into Phase 37. v2.0 archive: `.planning/milestones/v2.0-ROADMAP.md`.*
