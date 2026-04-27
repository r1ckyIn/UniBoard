# Roadmap: UniBoard v3.0

## Overview

UniBoard v3.0 begins after v2.0 — Production Foundation shipped (2026-04-25). v3.0 absorbs the three out-of-scope phases that accumulated during v2.0 closure (35 Push Notifications, 36 UX Polish, 37 Sidebar Refactor) and any new phases added after the v3.0 milestone is opened. v2.0 archive: `.planning/milestones/v2.0-ROADMAP.md`.

## Milestones

- ✅ **v2.0 — Production Foundation** — Phases 1-12, 11.1, 13-34, 32.1, 38, 38.1, 38.2 (39 phases shipped 2026-04-25) [archive](milestones/v2.0-ROADMAP.md)
- 📋 **v3.0 — UX Polish + Push Notifications + Sidebar Refactor** (planned — to be formalised via `/gsd-new-milestone v3.0`)

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

### 📋 v3.0 — Planned (formalise via `/gsd-new-milestone v3.0`)

These phases were declared during v2.0 but were **out of v2.0 scope** (zero plans, zero artifacts at v2.0 close). They become candidate scope for v3.0:

- [ ] **Phase 35: Push Notifications** — Browser push API or email notifications for deadline reminders. Requirement: AIFEAT-04. (0 plans)
- [ ] **Phase 36: UX Polish** — Fix accumulated UX rough edges across AI chat, setup flow, error handling. Requirements: UXPOL-01..04. (0 plans)
- [ ] **Phase 37: Sidebar Transform-Based Architecture Refactor** — Eliminate sidebar hover lag by replacing `transition: width` with GPU-composited `transform: translateX`. Two-layer DOM. Duplicate of backlog 999.1; **merge candidates when promoted**. (0 plans)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-12, 11.1 | v2.0 (M1) | 47/47 | Complete | 2026-03-25 |
| 13-17 | v2.0 (M2) | 13/13 | Complete | 2026-03-27 |
| 18-21 | v2.0 (M3) | 14/14 | Complete | 2026-03-29 |
| 22-28 | v2.0 (M4) | 21/21 | Complete | 2026-04-04 |
| 29-34, 32.1, 38, 38.1, 38.2 | v2.0 (production hardening) | ~45/45 | Complete | 2026-04-25 |
| 35. Push Notifications | v3.0 (planned) | 0/0 | Not started | - |
| 36. UX Polish | v3.0 (planned) | 0/0 | Not started | - |
| 37. Sidebar Refactor | v3.0 (planned) | 0/0 | Not started — duplicate of 999.1 | - |

## Backlog

### Phase 999.1: Sidebar transform-based architecture refactor (BACKLOG)
**Goal**: [Captured for future planning] Eliminate sidebar hover lag on content-heavy pages by replacing `transition: width` with GPU-composited `transform: translateX`. Two-layer DOM: outer 68 px container always visible + inner 224 px panel absolutely positioned with `translateX(-156 px)` by default, `translateX(0)` on hover. Bypasses per-frame layout cost that `width` animation incurs (non-composited property). Expected ~50 line refactor, requires reworking icon positioning logic and careful visual verification.
**Context**: Remaining issue from the 2026-04-17/18 5fps-lag investigation (.planning/debug/uniboard-5fps-lag-dashboard.md). PRs #80-87 drove INP 267→107 ms and cleared the Rough.js hotspots, but sidebar hover on dashboard/predict/settings/timetable still feels draggy because `transition: width` physically requires main-thread layout per frame.
**Status**: **Duplicate of Phase 37 — to be merged when v3.0 milestone formalised.**
**Requirements**: TBD
**Plans**: 0 plans
  - [ ] TBD (promote with /gsd-review-backlog when ready)

### ~~Phase 999.2: Page mount lazy loading~~ — PROMOTED to Phase 38 on 2026-04-20
Original scope ("viewport-driven progressive mount") superseded by Phase 38's eager-prefetch approach. Symptom and debug context preserved in Phase 38 archive.

**Post-ship verdict (2026-04-21, pending final UAT sign-off):** retained — provisional until Phase 38 P04 baselines are captured and the 6-page pixel-diff run is green on a fresh PR. The expected verdict after that run is **obsolete** (superseded by Phase 38 RSC prefetch: all 6 pages render real data on first paint, eliminating the viewport lazy-mount symptom at its source). Rubric for closing this backlog:
- If 0 of 6 pixel-diff baselines show any `SkeletonCard` pixels → flip status to `obsolete` and strike this backlog entry entirely.
- If any baseline shows residual skeleton in a specific sub-region (e.g., below-the-fold card, a particular state transition) → keep as `retained + residual case` with the exact sub-region documented, so a future micro-phase can address it with a narrow viewport-gated remount.
- If AI study-rec hero / deadline hero flashes despite RSC hydration → treat as Phase 38 bug (Rule 1), not a Phase 999.2 scope item; file a gap-closure plan against Phase 38.

---

*Roadmap reorganized 2026-04-27 by `/gsd-complete-milestone v2.0`. v2.0 archive: `.planning/milestones/v2.0-ROADMAP.md`.*
