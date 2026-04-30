# Requirements: UniBoard v3.0 — UI Polish & Cohesion (Claude 美学叠加层)

**Defined:** 2026-04-27
**Re-scoped:** 2026-04-27 (from auto-bootstrapped "UX Polish + Notifications + Sidebar Refactor" to UI-focused milestone per user direction)
**Roadmapped:** 2026-04-27 (5 phases derived: 39 / 40 / 41 / 42 / 43)
**Core Value:** Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place, eliminating the need to switch between platforms.

**Milestone Goal:** 在保留 v2.0 已验证的 Rough.js 手绘美学（边框、Rough Notation 高亮、纸张纹理、103 次原型迭代验证的"学生书桌笔记"气质）前提下，把 Anthropic/Claude 美学的其他维度（设计令牌 oklch 化、cubic-bezier 缓动、衬线层次、a11y polish、暖深棕 dark mode、新功能视觉收口）叠加上去，让整体气质从"学生笔记本"演化为"学生笔记本 × thoughtful product"。

> **Prior milestones:** v2.0 (39 phases shipped 2026-04-25) — see `.planning/milestones/v2.0-REQUIREMENTS.md` for the 105 satisfied requirements.

## Hard Constraints (preserved across all v3.0 work)

These are NOT touched by v3.0:

| Constraint | Reason |
|---|---|
| Rough.js 手绘边框 | 103 次原型迭代验证的差异化灵魂，UniBoard 视觉身份核心 |
| Rough Notation 高亮 | 同上，配套手绘语言 |
| 纸张纹理（fractalNoise grain + ruled lines） | 同上，"学生书桌笔记"气质载体 |
| 10 页主体视觉布局 | 已通过 v2.0 UAT，结构稳定 |
| TanStack Query hooks 接口 | 0 变动 — UI 重构不破坏数据层契约 |
| 后端 FastAPI / Supabase API | 0 变动 — UI 重构不影响 backend |
| i18n（en/zh） | 100% 保持 — Chinese international student community 是核心用户 |

## v3.0 Requirements

8 REQ categories. Each maps to exactly one phase via the roadmapper (see Traceability section).

### Design Tokens

- [ ] **DESIGN-01**: All color tokens migrated to oklch space (light + dark variants); existing hsl values preserved as fallback for unsupported browsers
- [ ] **DESIGN-02**: Spacing scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px) and elevation/shadow tokens defined as CSS variables and applied across shared components
- [x] **DESIGN-03
**: Motion timing constants (`cubic-bezier(0.165, 0.85, 0.45, 1)` ease-out + 150 / 250 / 400 ms duration tiers) defined as CSS variables

### Motion

- [~] **MOTION-01** (partial): All hover / focus / active state transitions use the motion constants (zero inline `transition: all 0.3s ease`)
  - **Sweep + ESLint enforcement:** COMPLETE — 56 raw `transition-{all|colors} duration-{N|[Xs]}` occurrences (across 36 files) plus 21 Form C `transition-[<property>] duration-N` cases plus 8 `ease-in-out` adjacency conflicts migrated to `var(--motion-fast|base|slow)` + `var(--ease-claude-out)` (Phase 39 plan-04, commits `40b6501` + `29f6cf9`). ESLint `no-restricted-syntax` rule from plan-3 blocks future regressions in CI; `pnpm lint` exits 0.
  - **Pixel-diff visual regression coverage:** DEFERRED — D-11 specifies Playwright snapshot diff across 10 pages at `maxDiffPixelRatio: 0.005` per page. Baselines not generated this plan per user decision (defer to production visual UAT on Vercel preview). Tracked in `.planning/seeds/SEED-39-playwright-baselines.md`. Spec at `frontend/tests/e2e/phase39-transition-parity.spec.ts` is in-tree and env-gated; closing the seed flips this REQ to complete.
- [x] **MOTION-02
**: SSE streaming components (Digest, Predict, Deadlines AI chat) have unified streaming-cursor animation + chunk-arrival fade-in

### Typography

- [x] **TYPO-01
**: 4-tier serif type scale defined (hero / section / body / caption) with consistent line-height + letter-spacing tokens
- [x] **TYPO-02
**: Serif vs Inter usage clarified in design system doc — serif for narrative content, Inter for UI chrome and data labels

### Shared Components Polish

(Rough.js outer borders preserved, only internal details unified)

- [ ] **SHARED-01**: Card / Button / Input / Modal / Tooltip internal padding, focus ring, disabled state unified to design tokens
- [ ] **SHARED-02**: AI reply visual style (Digest, Deadlines, Predict) adopts no-bubble Claude-style flowing text + typing cursor (reference: assistant-ui Claude Clone)
- [ ] **SHARED-03**: Sidebar uses transform-based positioning (`translateX`) — eliminates layout-thrashing hover lag, achieves 60fps animation on Intel Mac
  - Subsumes: REFACTOR-01 (transform-based positioning) + REFACTOR-02 (60fps Intel Mac)
  - Subsumes: backlog Phase 999.1 (sidebar transform refactor — already deduplicated)
  - Approach: Two-layer DOM (outer 68 px container always visible + inner 224 px panel absolutely positioned). Default `translateX(-156px)`, `translateX(0)` on hover. GPU-composited.

### State Coverage

- [ ] **STATES-01**: Loading skeletons for all 10 pages styled in Rough.js aesthetic (no off-the-shelf shimmer libraries)
- [ ] **STATES-02**: Empty states (no courses / no deadlines / no Ed posts) styled with restraint-first illustration + actionable CTA
- [ ] **STATES-03**: Error states (network failure / 401 expired / 500 backend) styled with helpful recovery actions

### Accessibility

- [ ] **A11Y-01**: Focus visible ring on all interactive elements (currently inconsistent across pages)
- [ ] **A11Y-02**: Color contrast meets AAA on body text and AA on UI chrome (audit + fix violations)
- [ ] **A11Y-03**: Aria-label / aria-describedby on icon-only buttons and complex widgets
- [ ] **A11Y-04**: Keyboard navigation working on all 10 pages (no mouse-only interactions)
- [ ] **A11Y-05**: `prefers-reduced-motion` media query honored — animations replaced with instant transitions when set

### New-Feature Visual Coverage

(Subsumes auto-bootstrapped Phase 36 UX Polish UXPOL-01..04)

- [ ] **NEWVIS-01**: Setup TokenStep skip-revalidate cached state UI styled per design tokens
  - Source: Phase 36 UXPOL-03 (memory: project_ux_improvements_backlog.md)
- [ ] **NEWVIS-02**: Setup SuccessStep per-domain (Canvas / Ed) sync progress bars styled per design tokens
  - Source: Phase 36 UXPOL-04 (memory: project_sync_progress_ux.md)
- [ ] **NEWVIS-03**: AI Chat client-side validation message (input < 3 chars) styled per design tokens, no raw 422 leaked
  - Source: Phase 36 UXPOL-01
- [ ] **NEWVIS-04**: AI request failure shows specific backend error message in toast/inline, styled per design tokens
  - Source: Phase 36 UXPOL-02

### Dark Mode (optional — roadmapper evaluates work cost vs benefit)

- [ ] **DARK-01**: Dark mode root tokens (warm-deep-brown `#2b2a27` background per Anthropic spec) defined as CSS variables
- [ ] **DARK-02**: Rough.js stroke color adapts to dark mode (currently hardcoded for light backgrounds — would need dynamic stroke generation)
- [ ] **DARK-03**: Paper texture (fractalNoise grain + ruled lines) opacity adapts for dark backgrounds (current 0.12 / 0.02 opacity tuned for cream, may need 0.06 / 0.01 on warm-deep-brown)

## Future Requirements (Deferred)

Tracked but not in v3.0 scope. Promote during a future `/gsd-new-milestone` cycle.

### v3.1 — Notifications & Lifecycle (next)

- **NOTIFY-01**: Users can opt-in to deadline reminder notifications via browser Push API or email channel
  - Source: auto-bootstrapped Phase 35 NOTIFY-01 (deferred from v3.0 — out of UI scope)
- **NOTIFY-02**: Notifications fire at configurable intervals before deadline (24h, 6h, 1h)
  - Source: auto-bootstrapped Phase 35 NOTIFY-02
- **NOTIFY-03**: Notification preferences persist across sessions and sync cycles
  - Source: auto-bootstrapped Phase 35 NOTIFY-03
- **SEED-002**: Resolve ORM-vs-DB parent-table drift on 5 user_id FKs
- **SEED-003**: passive_deletes=True + remove _CASCADE_LOAD_OPTIONS selectinload

### v3.2+ — AI Differentiation

- **AI-EXPAND-01**: AI agent expansion (additional MCP tools, multi-step research)
- **AI-EXPAND-02**: AI study suggestions based on assessment weights
- **AI-EXPAND-03**: GPA path planning with specific score targets
- **AI-EXPAND-04**: Course material RAG with cited sources improvements

### v4.0+ — Platform Expansion

- **PLATFORM-01**: Mobile app / PWA support
- **PLATFORM-02**: Multi-university support (currently USYD-only)
- **PLATFORM-03**: OAuth Canvas integration (currently manual token)

### Schema Evolution (deferred)

- **SCHEMA-01**: Major DB schema migrations (deferred — v2.0 schema is stable)

## Out of Scope (v3.0)

Explicitly excluded from v3.0. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Touching Rough.js / Rough Notation / paper texture | Hard constraint — preserved差异化灵魂 |
| 10-page main visual layout changes | Hard constraint — already UAT-validated |
| Backend API / FastAPI / Supabase changes | Hard constraint — UI-only milestone |
| TanStack Query hooks signature changes | Hard constraint — preserves data layer contracts |
| Push Notifications (NOTIFY-01..03) | Deferred to v3.1 — not UI-layer work |
| AI agent expansion / new MCP tools | Deferred to v3.2+ — not visual scope |
| Mobile / PWA / multi-university | Deferred to v4.0+ — out of current scope |
| Ed Discussion posting/replying | Permanent — read-only policy |
| Canvas assignment submission | Permanent — academic integrity risk |
| Canvas quiz answering | Permanent — academic integrity risk |
| Homework ghostwriting / direct answers | Permanent — academic integrity violation |

### Reference Materials Out of Scope

5 of 9 libraries from `~/Downloads/claude-ui-libraries.html` curated gallery — explicitly NOT used in v3.0:

| Library | Reason for exclusion |
|---|---|
| `jnahian/vscode-claude-theme` | VS Code theme, irrelevant to web UI |
| `Damienchakma/Open-claude` | Already have SSE chat infra (v2.0 Phase 19) |
| `chihebnabil/claude-ui` | Nuxt.js stack incompatible with Next.js |
| `VoltAgent/awesome-claude-design` | No new pages added in v3.0 = no DESIGN.md template need |
| `OpenCoworkAI/open-codesign` | UniBoard does not generate slides / PDF |

## Reference Materials In Scope

4 of 9 libraries from gallery — used in v3.0:

| Tier | Resource | Role | Maps to REQs |
|---|---|---|---|
| 🟢 Direct adoption | `anthropics/skills/skills/brand-guidelines` | Source of truth for color palette, font specs (一手数据) | DESIGN-01, DESIGN-02, TYPO-01, TYPO-02 |
| 🟡 Strong reference | [shadcn.io/theme/claude](https://www.shadcn.io/theme/claude) | hsl→oklch conversion formulas + dark mode color values | DESIGN-01, DARK-01 |
| 🟡 Strong reference | [assistant-ui Claude Clone](https://www.assistant-ui.com/examples/claude) | AI no-bubble flowing reply pattern | SHARED-02, MOTION-02 |
| 🔵 Light reference | [tweakcn](https://tweakcn.com/) | Online oklch tuning tool (spike-time only, no code import) | DESIGN-01 |

External inspiration docs (Context only, not code dependencies):
- `~/Downloads/compass_artifact_wf-69687d8e-7507-4007-8393-a96ef153519f_text_markdown.md` — Anthropic 美学深度解析
- `~/Downloads/claude-ui-libraries.html` — 9-library curated gallery (4 used / 5 unused)

## Traceability

Each v3.0 requirement maps to exactly one phase. 5 phases (39-43) derived by roadmapper on 2026-04-27.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DESIGN-01 | Phase 39 | Pending |
| DESIGN-02 | Phase 39 | Pending |
| DESIGN-03 | Phase 39 | Pending |
| MOTION-01 | Phase 39 | Pending |
| MOTION-02 | Phase 39 | Pending |
| TYPO-01 | Phase 39 | Pending |
| TYPO-02 | Phase 39 | Pending |
| SHARED-01 | Phase 40 | Pending |
| SHARED-02 | Phase 40 | Pending |
| SHARED-03 | Phase 40 | Pending |
| STATES-01 | Phase 41 | Pending |
| STATES-02 | Phase 41 | Pending |
| STATES-03 | Phase 41 | Pending |
| A11Y-01 | Phase 41 | Pending |
| A11Y-02 | Phase 41 | Pending |
| A11Y-03 | Phase 41 | Pending |
| A11Y-04 | Phase 41 | Pending |
| A11Y-05 | Phase 41 | Pending |
| NEWVIS-01 | Phase 42 | Pending |
| NEWVIS-02 | Phase 42 | Pending |
| NEWVIS-03 | Phase 42 | Pending |
| NEWVIS-04 | Phase 42 | Pending |
| DARK-01 | Phase 43 (optional) | Pending |
| DARK-02 | Phase 43 (optional) | Pending |
| DARK-03 | Phase 43 (optional) | Pending |

**Coverage:**
- v3.0 requirements: 25 total (22 core + 3 optional dark mode)
- Mapped to phases: 25 / 25 ✓
- Unmapped: 0

**Phase distribution:**
- Phase 39 (Design Token Foundation): 7 REQs (DESIGN-01..03 + MOTION-01..02 + TYPO-01..02)
- Phase 40 (Shared Component Polish): 3 REQs (SHARED-01..03)
- Phase 41 (State Coverage & A11y Pass): 8 REQs (STATES-01..03 + A11Y-01..05)
- Phase 42 (New-Feature Visual Coverage): 4 REQs (NEWVIS-01..04)
- Phase 43 (Dark Mode, optional): 3 REQs (DARK-01..03)

**Category distribution:**
- Design Tokens: 3
- Motion: 2
- Typography: 2
- Shared Components Polish: 3 (incl. SHARED-03 absorbing REFACTOR-01..02 + backlog 999.1)
- State Coverage: 3
- Accessibility: 5
- New-Feature Visual: 4 (subsumes Phase 36 UXPOL-01..04)
- Dark Mode: 3 (optional)

## Candidate Promotions (Seeds)

The following seeds were planted during v2.0 closure and are dormant. They are NOT in v3.0 scope but listed for awareness.

| Seed ID | Title | Status | Disposition |
|---------|-------|--------|----------|
| SEED-001 | react-hooks v7 strict-rule cleanup | dormant | Defer to v4.0+ (low priority) |
| SEED-002 | Resolve ORM-vs-DB parent-table drift on 5 user_id FKs | dormant | Promote to v3.1 (Notifications & Lifecycle) |
| SEED-003 | passive_deletes=True + remove _CASCADE_LOAD_OPTIONS selectinload | dormant | Promote to v3.1 (Notifications & Lifecycle) |

> Seeds are not deleted. They remain in `.planning/seeds/` and are reviewed via `/gsd-review-backlog` when ready to promote.

---
*Requirements defined: 2026-04-27 during `/gsd-new-milestone v3.0` re-scope.*
*Last updated: 2026-04-27 — roadmapper assigned 25 REQs to 5 phases (39-43). Coverage 25/25 ✓. Phase 39 owns the design token foundation (7 REQs across DESIGN/MOTION/TYPO since they share the same dependency profile and are all "establish CSS variables" work). Phase 40 absorbs Phase 37 sidebar refactor via SHARED-03. Phase 42 absorbs Phase 36 UXPOL via NEWVIS-01..04. Phase 43 dark mode is optional (cost-benefit gate before kickoff).*
