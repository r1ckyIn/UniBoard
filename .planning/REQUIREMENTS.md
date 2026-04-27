# Requirements: UniBoard v3.0

**Defined:** 2026-04-27
**Core Value:** Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place, eliminating the need to switch between platforms.

**Milestone Goal:** Polish v2.0's user experience (notifications, UX rough edges, sidebar architecture) before adding new product features. Focus on reducing user friction and modernizing frontend internals.

> **Prior milestones:** v2.0 (39 phases shipped 2026-04-25) — see `.planning/milestones/v2.0-REQUIREMENTS.md` for the 105 satisfied requirements.

## v3.0 Requirements

Requirements for the v3.0 release. Each maps to one of three active phases (35, 36, 37).

### Notifications

- [ ] **NOTIFY-01**: Users can opt-in to deadline reminder notifications via browser Push API or email channel
- [ ] **NOTIFY-02**: Notifications fire at configurable intervals before deadline (24h, 6h, 1h)
- [ ] **NOTIFY-03**: Notification preferences persist across sessions and sync cycles

### UX Polish

- [ ] **UXPOL-01**: AI Chat shows client-side validation when input < 3 chars (no raw 422)
- [ ] **UXPOL-02**: AI request failures show specific backend error message (not generic "AI request failed")
- [ ] **UXPOL-03**: Setup TokenStep skips re-validation for tokens that already passed (memory: project_ux_improvements_backlog.md)
- [ ] **UXPOL-04**: Setup SuccessStep shows per-domain sync progress bars (memory: project_sync_progress_ux.md)

### Frontend Architecture Refactor

- [ ] **REFACTOR-01**: Sidebar uses transform-based positioning (no layout-thrashing on toggle)
- [ ] **REFACTOR-02**: 60fps animation on Intel Mac (per memory: project_backdrop_filter_intel_mac.md GPU paint-cost family)

## v4.0+ Requirements (Deferred)

Tracked but not in v3.0 scope. Promote during a future `/gsd-new-milestone` cycle.

### AI Differentiation

- **AI-EXPAND-01**: AI agent expansion (additional MCP tools, multi-step research)
- **AI-EXPAND-02**: Social/collaborative features (study group AI Q&A) — pending product validation

### Platform Expansion

- **PLATFORM-01**: Mobile app / PWA support
- **PLATFORM-02**: Multi-university support (currently USYD-only)
- **PLATFORM-03**: OAuth Canvas integration (currently manual token)

### Schema Evolution

- **SCHEMA-01**: Major DB schema migrations (deferred — v2.0 schema is stable)

## Out of Scope (v3.0)

Explicitly excluded from v3.0. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New product features (AI agent expansion, social) | v3.0 is polish + refactor only; product features queued for v4.0+ |
| Major refactors beyond sidebar | v3.0 sidebar refactor is the only architectural change in scope |
| DB schema changes | v2.0 schema is stable; SEED-002/SEED-003 FK hygiene tracked separately |
| Ed Discussion posting/replying | Permanent — read-only policy (avoid polluting Ed ecosystem) |
| Canvas assignment submission | Permanent — academic integrity risk |
| Canvas quiz answering | Permanent — academic integrity risk |
| Homework ghostwriting / direct answers | Permanent — academic integrity violation |
| Course recommendations | Permanent — out of GPA tracking scope |

## Traceability

Each v3.0 requirement is mapped to its assigned phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NOTIFY-01 | Phase 35 | Pending |
| NOTIFY-02 | Phase 35 | Pending |
| NOTIFY-03 | Phase 35 | Pending |
| UXPOL-01 | Phase 36 | Pending |
| UXPOL-02 | Phase 36 | Pending |
| UXPOL-03 | Phase 36 | Pending |
| UXPOL-04 | Phase 36 | Pending |
| REFACTOR-01 | Phase 37 | Pending |
| REFACTOR-02 | Phase 37 | Pending |

**Coverage:**
- v3.0 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

**Phase distribution:**
- Phase 35 (Push Notifications): 3 requirements
- Phase 36 (UX Polish): 4 requirements
- Phase 37 (Sidebar Transform-Based Refactor): 2 requirements

## Candidate Promotions (Seeds)

The following seeds were planted during v2.0 closure and may be promoted into v3.0 scope after `/gsd-discuss-phase` review. Currently dormant.

| Seed ID | Title | Status | v3.0 Fit |
|---------|-------|--------|----------|
| SEED-001 | react-hooks v7 strict-rule cleanup | dormant | low — defer to v4.0 |
| SEED-002 | Resolve ORM-vs-DB parent-table drift on 5 user_id FKs | dormant | medium — could fold into Phase 37 if scope permits |
| SEED-003 | passive_deletes=True + remove _CASCADE_LOAD_OPTIONS selectinload | dormant | medium — could fold into Phase 37 if scope permits |

> Seeds are not deleted. They remain in `.planning/seeds/` and are reviewed via `/gsd-review-backlog` when ready to promote.

---
*Requirements defined: 2026-04-27 during `/gsd-new-milestone v3.0` bootstrap.*
*Last updated: 2026-04-27 — initial v3.0 milestone setup.*
