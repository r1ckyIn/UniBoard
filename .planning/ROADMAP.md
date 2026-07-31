# Roadmap: UniBoard v3.0 (CANCELLED 2026-05-04)

> ⚠️ **v3.0 CANCELLED** — Phase 39 (Design Token Foundation, PR #127) and Phase 40 (Shared Component Polish, PR #128) shipped to production then **reverted via PR #133 (12e218b) on 2026-05-04** after a UI regression on `uniboard.uk`. UI work paused indefinitely; user is prioritizing functional/backend stability. Phases 41/42/43 deferred to backlog (see Backlog section). All Phase 39+40 planning artifacts (CONTEXT/PLAN/SUMMARY/REVIEW/LEARNINGS) preserved on `chore/milestone-v3.0-init` branch (pushed to origin; planning docs also synced into main) for future reference.

## Overview

UniBoard v3.0 begins after v2.0 — Production Foundation shipped (2026-04-25). v3.0 was scoped as a UI Polish & Cohesion milestone (Claude 美学叠加层) — preserving v2.0's validated Rough.js hand-drawn aesthetic while overlaying Anthropic/Claude design dimensions (oklch tokens, cubic-bezier motion, serif hierarchy, a11y polish, optional warm-deep-brown dark mode, new-feature visual coverage). 5 phases derived from 8 REQ categories (25 REQs total). Phase 35 Push Notifications deferred to v3.1; Phase 36 UX Polish subsumed into Phase 42 NEWVIS; Phase 37 Sidebar Refactor subsumed into Phase 40 SHARED-03. **v3.0 cancelled mid-flight on 2026-05-04 — see banner above.** v2.0 archive: `.planning/milestones/v2.0-ROADMAP.md`.

## Milestones

- ✅ **v2.0 — Production Foundation** — Phases 1-12, 11.1, 13-34, 32.1, 38, 38.1, 38.2 (39 phases shipped 2026-04-25) [archive](milestones/v2.0-ROADMAP.md)
- ❌ **v3.0 — UI Polish & Cohesion (Claude 美学叠加层)** — CANCELLED 2026-05-04. Phases 39+40 reverted; Phases 41-43 deferred indefinitely.

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

### 🚧 v3.0 — UI Polish & Cohesion (active, opened 2026-04-27)

5 phases. Phase numbering continues from v2.0's last phase (38.2) → v3.0 starts at Phase 39. Each REQ from `.planning/REQUIREMENTS.md` maps to exactly one phase. Hard constraints preserved across all phases: Rough.js hand-drawn borders, Rough Notation highlights, paper texture, 10-page main visual layout, TanStack Query hooks signatures (0 changes), backend API (0 changes), i18n en/zh (100%).

- [ ] **Phase 39: Design Token Foundation** — Establish oklch color, spacing, shadow, motion, and serif typography token system as CSS variables (no component changes yet)
- [x] **Phase 40: Shared Component Polish** — Unify Card/Button/Input/Modal/Tooltip internals to design tokens, refactor Sidebar to transform-based positioning, adopt Claude no-bubble AI reply pattern (completed 2026-05-02)
- [ ] **Phase 41: State Coverage & Accessibility Pass** — Loading/Empty/Error states styled in Rough.js aesthetic across 10 pages + full a11y audit (focus, contrast, aria, keyboard, reduced-motion)
- [ ] **Phase 42: New-Feature Visual Coverage** — TokenStep cached-state UI, SuccessStep per-domain progress bars, AI Chat client-side validation, AI failure error messages (subsumes auto-bootstrapped Phase 36 UX Polish)
- [ ] **Phase 43: Dark Mode (optional)** — Warm-deep-brown root tokens, Rough.js stroke adaptation, paper texture opacity tuning. Cost-benefit gate before kickoff; defer to v3.1 if work cost exceeds value

## Phase Details

### ~~Phase 39: Design Token Foundation~~ — REVERTED 2026-05-04

> Shipped 2026-04-30 (PR #127 / `c86b07f`); **reverted via PR #133 (`12e218b`) on 2026-05-04** with the v3.0 milestone cancellation. Original goal preserved below for reference.

**Goal:** Establish a complete design token system (color in oklch, spacing scale, elevation/shadow, motion timing, serif type scale) as CSS variables that every downstream phase consumes. No component visual changes in this phase — only the token layer is added; legacy hsl values remain as fallback.

**Depends on:** Nothing (first phase of v3.0; v2.0 design system from Phase 1 remains intact)

**Requirements:** DESIGN-01, DESIGN-02, DESIGN-03, MOTION-01, MOTION-02, TYPO-01, TYPO-02

**Success Criteria** (what must be TRUE):
  1. Color picker on shadcn.io/theme/claude produces the same hue on UniBoard's deepest button-primary state when verified in DevTools (oklch values match within ΔE < 1.0)
  2. Every `transition: all 0.3s ease` inline style is replaced with a `var(--motion-*)` reference; grep on `transition: all` returns zero matches across `frontend/src/`
  3. SSE streaming components (Digest, Predict, Deadlines AI chat) all use the same streaming-cursor + chunk-arrival animation primitive (single shared motion module)
  4. Source Serif 4 4-tier scale (hero/section/body/caption) renders with consistent line-height and letter-spacing across the dashboard hero, section headings, body copy, and small captions — visual diff with prototype reference shows no regression
  5. brand-guidelines skill values (color/font specs from anthropics/skills/skills/brand-guidelines) are quoted as the single source of truth in CSS variable comments

**Plans:** 4 plans (4/4 complete; Task 3 of plan-04 deferred to production visual UAT — see SEED-39-playwright-baselines.md)
- [x] 39-01-PLAN.md — Color (oklch + @supports hsl fallback) + 8-point spacing + dark-mode reservation (DESIGN-01, DESIGN-02)
- [x] 39-02-PLAN.md — 4-tier serif typography scale (text-hero/section/body/caption) + TYPO-USAGE.md reference doc (TYPO-01, TYPO-02)
- [x] 39-03-PLAN.md — Motion tokens + SSE keyframes (no alternate per Q7) + ESLint guard rule + Wave 0 test scaffolds (DESIGN-03, MOTION-02 keyframes, MOTION-01 rule install)
- [x] 39-04-PLAN.md — Transition className migration sweep (56 occurrences across 36 files + 21 Form C + 8 ease-in-out adjacencies) — Tasks 1+2 complete; Task 3 (Playwright visual regression baselines) **deferred to production visual UAT** per user decision 2026-04-30 (see 39-04-SUMMARY.md "Deferred Work" + SEED-39-playwright-baselines.md). MOTION-01 status: **partial** (sweep + ESLint enforcement complete; pixel-diff coverage deferred).

**UI hint**: yes

### ~~Phase 40: Shared Component Polish~~ — REVERTED 2026-05-04

> Shipped 2026-05-02 (PR #128 / `5eded11`); **reverted via PR #133 (`12e218b`) on 2026-05-04** with the v3.0 milestone cancellation. Original goal preserved below for reference. Production UI regression on `uniboard.uk/zh` (greeting username + dashboard widgets disappeared) drove the rollback.

**Goal:** Unify the internal details (padding, focus ring, disabled state) of Card/Button/Input/Modal/Tooltip to the new design tokens, refactor the Sidebar to transform-based positioning to eliminate hover lag on Intel Mac, and adopt the assistant-ui Claude Clone no-bubble flowing AI reply pattern across Digest/Deadlines/Predict. Rough.js outer borders preserved — only internals change.

**Depends on:** Phase 39 (tokens must exist before components can consume them)

**Requirements:** SHARED-01, SHARED-02, SHARED-03

**Success Criteria** (what must be TRUE):
  1. Card/Button/Input/Modal/Tooltip across all 10 pages render with identical internal padding, focus ring color, and disabled state styling — pixel-diff regression test green against new token snapshots
  2. AI reply visual style on Digest, Deadlines, and Predict pages renders Claude-style flowing text with typing cursor (no chat bubbles); user can read AI output as continuous narrative rather than discrete message blocks
  3. Sidebar hover toggle shows zero layout-thrashing in DevTools Performance panel; animation measures 60fps stable on Intel Mac (user's primary device)
  4. Sidebar visual parity with v2.0 implementation: pixel-diff regression on dashboard / predict / settings / timetable pages green; backlog Phase 999.1 scope fully absorbed (sidebar transform refactor done)
  5. Rough.js hand-drawn borders remain visible and unchanged on every component (hard constraint check — visual smoke test)

**Plans:** 3/3 plans complete
- [x] 40-01-PLAN.md — SHARED-01: cva primitives (Button + Input) + SEED-40 @utility motion shorthands + 56-caller verbose-form sweep + ESLint extension (Wave 1)
- [x] 40-02-PLAN.md — SHARED-02: useStreamingText hook + StreamingAssistant + UserMessage + 2-caller migration + AiChatBubble.tsx deletion (Wave 2)
- [x] 40-03-PLAN.md — SHARED-03: Sidebar two-layer transform-based DOM rewrite + env-gated 60fps Playwright stub (Wave 2, depends_on plan-01)

**UI hint**: yes

### ~~Phase 41: State Coverage & Accessibility Pass~~ — DEFERRED INDEFINITELY (2026-05-04)

> Cancelled with v3.0 milestone. Original goal preserved below for reference if a future a11y-focused milestone wants to absorb STATES-01..03 + A11Y-01..05 REQs. Note: the underlying STATES/A11Y REQs are still real product gaps — they should be picked up under a future functional milestone (not as UI polish).

**Goal:** Add Rough.js-styled Loading/Empty/Error states across all 10 pages (no off-the-shelf shimmer libraries) and complete a full a11y pass — focus visible rings, AAA text contrast / AA UI chrome, aria-label on icon-only widgets, keyboard navigation across all pages, prefers-reduced-motion honored.

**Depends on:** Phase 40 (state styles consume the same shared component tokens; a11y focus rings depend on the unified focus-ring token from SHARED-01)

**Requirements:** STATES-01, STATES-02, STATES-03, A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05

**Success Criteria** (what must be TRUE):
  1. All 10 pages render Loading skeletons in Rough.js aesthetic (verified via 10-page screenshot reel during initial load); zero off-the-shelf shimmer library imports detected
  2. Empty states (no courses / no deadlines / no Ed posts) display restraint-first illustration + actionable CTA on every applicable page; user can recover from each empty state without navigating away
  3. Error states (network failure / 401 expired / 500 backend) display helpful recovery actions (retry, re-auth, contact support); user can complete recovery action inline without page reload
  4. Tabbing through any page lands on visible focus rings on every interactive element; keyboard-only user can complete the full register → setup → dashboard → settings → predict → digest workflow without touching mouse
  5. Lighthouse / axe-core a11y audit reports zero AAA contrast violations on body text and zero AA violations on UI chrome across all 10 pages; all icon-only buttons have aria-label or aria-describedby
  6. With `prefers-reduced-motion: reduce` set in OS, all transitions become instant; Rough Notation highlight animation collapses to instant render; SSE streaming-cursor still animates (essential to AI feedback) but chunk-arrival fade is replaced with instant append

**Plans:** TBD (promote via `/gsd-discuss-phase 41` → `/gsd-plan-phase 41`)
**UI hint**: yes

### ~~Phase 42: New-Feature Visual Coverage~~ — DEFERRED INDEFINITELY (2026-05-04)

> Cancelled with v3.0 milestone. The 4 Phase 36 UXPOL gaps (TokenStep cached-state, SuccessStep per-domain sync, AI Chat input validation, AI failure error display) are still real UX issues but should be addressed individually via `/gsd-quick` patches under whatever functional milestone is active, NOT as a coordinated "visual coverage" phase.

**Goal:** Apply the design tokens + shared component polish to the four v2.0-residual UX gaps that the auto-bootstrapped Phase 36 originally targeted — TokenStep cached-state UI, SuccessStep per-domain sync progress bars, AI Chat client-side validation, AI request failure error display. This phase closes the loop on Phase 36 UXPOL-01..04 with the new visual vocabulary.

**Depends on:** Phase 39 (tokens) + Phase 40 (Shared component polish, especially SHARED-01 input/modal styling and SHARED-02 AI reply patterns)

**Requirements:** NEWVIS-01, NEWVIS-02, NEWVIS-03, NEWVIS-04

**Success Criteria** (what must be TRUE):
  1. Setup TokenStep retry shows a styled "Token already validated — skipping re-check" cached-state card per design tokens (← absorbs Phase 36 UXPOL-03); session-storage 5-min TTL skip-revalidate works as documented in v2.0 Phase 33-07
  2. Setup SuccessStep renders two distinct per-domain progress bars (Canvas / Ed) styled per design tokens — user sees Canvas at 60% while Ed is at 40% during sync (← absorbs Phase 36 UXPOL-04); single composite indicator removed
  3. AI Chat input < 3 chars never shows a raw 422 error to the end user; instead a styled inline guidance message ("Please enter at least 3 characters to continue") appears below the input field (← absorbs Phase 36 UXPOL-01)
  4. AI request failures display the specific backend error message in a toast or inline notice styled per design tokens (e.g., "Anthropic API rate limit reached, retrying in 30s") rather than the generic "AI request failed" string (← absorbs Phase 36 UXPOL-02)

**Plans:** TBD (promote via `/gsd-discuss-phase 42` → `/gsd-plan-phase 42`)
**UI hint**: yes

### ~~Phase 43: Dark Mode (optional)~~ — DEFERRED INDEFINITELY (2026-05-04)

> Cancelled with v3.0 milestone. Was already optional/cost-gated. Original goal preserved below for reference.

**Goal:** Apply warm-deep-brown (`#2b2a27` per Anthropic spec) dark mode root tokens, adapt Rough.js stroke generation for dark backgrounds, and re-tune paper texture (fractalNoise grain + ruled lines) opacity for dark surfaces. Optional milestone — kickoff conditional on cost-benefit review (Rough.js dynamic stroke generation may be expensive); deferable to v3.1.

**Depends on:** Phase 39 (color tokens must exist in oklch with light/dark slots), Phase 40 (shared components must already be tokenized so dark variants apply uniformly), Phase 41 (state styles must already be tokenized so error/loading/empty work in dark mode)

**Requirements:** DARK-01, DARK-02, DARK-03

**Success Criteria** (what must be TRUE):
  1. User toggles dark mode in Settings → root surface turns warm-deep-brown (`#2b2a27`); all 10 pages render in dark mode with zero contrast regressions per axe-core re-audit
  2. Rough.js hand-drawn borders remain visible against the warm-deep-brown background — stroke color adapts dynamically (e.g., light cream stroke on dark) rather than hardcoded dark stroke disappearing
  3. Paper texture (fractalNoise grain + ruled lines) renders with adjusted opacity (~0.06 grain / ~0.01 lines) on warm-deep-brown surface — texture visible but not overwhelming; switching back to light mode restores original 0.12 / 0.02 opacity

**Plans:** TBD (promote via `/gsd-discuss-phase 43` → `/gsd-plan-phase 43`)

**Cost-benefit gate:** Before kickoff, evaluate Rough.js dynamic stroke generation cost. If implementation cost > 2 plans worth of effort and user-facing benefit is marginal, defer entire phase to v3.1 (carry DARK-01..03 forward as deferred REQs).

**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-12, 11.1 | v2.0 (M1) | 47/47 | Complete | 2026-03-25 |
| 13-17 | v2.0 (M2) | 13/13 | Complete | 2026-03-27 |
| 18-21 | v2.0 (M3) | 14/14 | Complete | 2026-03-29 |
| 22-28 | v2.0 (M4) | 21/21 | Complete | 2026-04-04 |
| 29-34, 32.1, 38, 38.1, 38.2 | v2.0 (production hardening) | ~45/45 | Complete | 2026-04-25 |
| 39. Design Token Foundation | v3.0 | 4/4 | **REVERTED 2026-05-04** (PR #133 / 12e218b) — was Complete 2026-04-30 (PR #127 / c86b07f); reverted with v3.0 cancellation | 2026-04-30 → reverted 2026-05-04 |
| 40. Shared Component Polish | v3.0 | 3/3 | **REVERTED 2026-05-04** (PR #133 / 12e218b) — was Complete 2026-05-02 (PR #128 / 5eded11); reverted with v3.0 cancellation | 2026-05-02 → reverted 2026-05-04 |
| ~~41. State Coverage & Accessibility Pass~~ | ~~v3.0~~ | 0/0 | **DEFERRED INDEFINITELY** (v3.0 cancelled) | - |
| ~~42. New-Feature Visual Coverage~~ | ~~v3.0~~ | 0/0 | **DEFERRED INDEFINITELY** (v3.0 cancelled) | - |
| ~~43. Dark Mode (optional)~~ | ~~v3.0~~ | 0/0 | **DEFERRED INDEFINITELY** (v3.0 cancelled) | - |

## Backlog

### ~~Phase 35: Push Notifications~~ — DEFERRED to v3.1 on 2026-04-27

NOTIFY-01..03 (browser Push API + email + persistence) is not UI-layer work; deferred to v3.1 — Notifications & Lifecycle milestone. v2.0-residual scope, was auto-bootstrapped during initial v3.0 milestone creation but explicitly removed during v3.0 re-scope to UI Polish & Cohesion.

### ~~Phase 36: UX Polish~~ — SUBSUMED into Phase 42 on 2026-04-27

Auto-bootstrapped UXPOL-01..04 fully mapped to NEWVIS-01..04 in REQUIREMENTS.md and consolidated into Phase 42 (New-Feature Visual Coverage). Mapping:
- UXPOL-01 (AI Chat client-side validation) → NEWVIS-03
- UXPOL-02 (AI request failure backend error) → NEWVIS-04
- UXPOL-03 (TokenStep skip-revalidate) → NEWVIS-01
- UXPOL-04 (SuccessStep per-domain progress) → NEWVIS-02

### ~~Phase 37: Sidebar Transform-Based Architecture Refactor~~ — SUBSUMED into Phase 40 on 2026-04-27

REFACTOR-01 (transform-based positioning) + REFACTOR-02 (60fps Intel Mac) fully absorbed into SHARED-03 in REQUIREMENTS.md and folded into Phase 40 (Shared Component Polish). The two-layer DOM `translateX(-156px)` → `translateX(0)` approach from absorbed backlog 999.1 is now Phase 40's SHARED-03 implementation strategy.

### ~~Phase 999.1: Sidebar transform-based architecture refactor~~ — ABSORBED into SHARED-03 / Phase 40 on 2026-04-27

Originally absorbed into auto-bootstrapped Phase 37; on v3.0 re-scope (2026-04-27) further consolidated into SHARED-03 / Phase 40.

### ~~Phase 999.2: Page mount lazy loading~~ — PROMOTED to Phase 38 on 2026-04-20

Original scope ("viewport-driven progressive mount") superseded by Phase 38's eager-prefetch approach. See v2.0 archive for full disposition rubric.

---

*Roadmap reorganized 2026-04-27 by `/gsd-complete-milestone v2.0`. v3.0 milestone bootstrapped same day via `/gsd-new-milestone v3.0`, then re-scoped 2026-04-27 from "UX Polish + Notifications + Sidebar Refactor" (Phases 35/36/37) to **UI Polish & Cohesion (Claude 美学叠加层)** — 5 phases (39-43), 25 REQs across 8 categories. Phase 35 NOTIFY → v3.1, Phase 36 UXPOL → Phase 42 NEWVIS, Phase 37 REFACTOR → Phase 40 SHARED-03. v2.0 archive: `.planning/milestones/v2.0-ROADMAP.md`.*
