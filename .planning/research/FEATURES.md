# Feature Landscape

**Domain:** University Academic Dashboard (GPA Maximization, LMS Integration)
**Researched:** 2026-03-16

## Table Stakes

Features users expect from a GPA tracking + LMS aggregation dashboard. Missing any of these and the product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time GPA/WAM display | Core value proposition -- "how am I doing?" | Medium | Canvas grades API + USYD WAM formula + level weights. 15min sync. |
| Assessment weight visualization | Students need to know what matters most | Medium | Primary source: Unit Outline HTML parsing. Fallback: Canvas assignment_groups. |
| What-if GPA simulator | #1 differentiator from plain Canvas -- "what if I score X?" | Medium | Slider UI + weighted average recalculation. Pure frontend compute on cached data. |
| Unified deadline view | Students use 2-3 platforms; missing deadlines = grade impact | High | Three-source aggregation (Canvas + Ed Lessons + Ed Discussion) with SHA-256 dedup. Most complex table-stakes feature. |
| Course file/folder navigation | Students waste time finding materials across platforms | Medium | Canvas Modules + Ed Lessons unified view. AI-generated folder descriptions (P2). |
| High-value Ed Discussion posts | Staff/endorsed posts contain exam hints, rubric clarifications | Low-Medium | Rule-based: filter on is_endorsed + is_staff_answered. No AI needed for MVP. |
| 3-step onboarding | Non-technical students must connect Canvas/Ed tokens easily | Medium | Visual guide for token acquisition + validation + encrypted storage. |
| Zero-install web access | "Just open a browser" -- no extensions, no desktop apps | Low | Next.js static export, standard web stack. |
| User authentication | Multi-user support, token security | Medium | JWT + bcrypt for MVP. Each user's API tokens encrypted independently. |

## Differentiators

Features that set UniBoard apart from competitors. Not expected by default, but create the "aha" moment.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Target GPA path planner | Reverse-calculate: "you need 88+ on final exam to get HD" | Medium | Unique among competitors. Mathematical optimization across remaining assessments. |
| Daily/weekly academic digest | "One email with everything that matters for your grades today" | Medium | Rule-based aggregation for MVP. AI-enhanced prioritization later. |
| GPA risk alerts | Proactive warning when trajectory deviates from target | Medium | Threshold-based: (target - projected) > configurable delta. |
| Deadline tiered reminders | 72h / 24h / 3h escalating notifications | Medium | Requires notification infrastructure (web notifications for MVP, email later). |
| AI thread relevance scoring | Machine-extract exam tips from 100s of Ed posts | High | F1 quality gate with rule-based fallback. Deferred to post-MVP is acceptable. |
| AI Q&A on course materials | "Ask questions about your lecture slides" | High | RAG pattern over synced materials. Phase 3+ feature. |
| MCP server for Claude Desktop | Power users interact with university data via Claude | Medium | Shares service layer with web API. Differentiator for CS students. |
| Anthropic-inspired design aesthetic | "Warm, academic, trustworthy" vs typical EdTech neon | Low | Design system already defined in frontend_brief.md. Implementation is CSS/component work. |

## Anti-Features

Features to explicitly NOT build. These would harm the product or violate principles.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Ed Discussion posting/replying | Read-only policy prevents UniBoard from polluting Ed with auto-generated content | Display posts in read-only view with link to original on Ed |
| Canvas assignment submission | Academic integrity risk -- system should never submit work on student's behalf | Show submission status and deadline, link to Canvas for actual submission |
| Quiz answering / homework ghostwriting | Direct academic integrity violation | AI can explain concepts and reference course materials, never generate answers |
| Social/chat features | Irrelevant to GPA, distracts from core mission | Focus entirely on academic data aggregation |
| Course recommendations | Out of scope for GPA tracking, requires enrollment data UniBoard doesn't have | Stick to tracking enrolled courses |
| Real-time collaborative editing | Not a document tool | Link to original resources on Canvas/Ed |
| Push notifications to mobile | Requires native app or PWA service worker -- too complex for MVP | Web notifications + email digests are sufficient |
| Multi-university support in MVP | Different universities have different LMS configs, grading systems, Unit Outline formats | Hard-code USYD-specific logic. Abstract interfaces allow future expansion without over-engineering now. |

## Feature Dependencies

```
Authentication (JWT + bcrypt)
  |
  +-> Token Configuration (Canvas/Ed token storage)
  |     |
  |     +-> Canvas Adapter (requires Canvas token)
  |     |     |
  |     |     +-> Grade Sync -> GPA Calculation -> GPA Display
  |     |     +-> Module Sync -> Course Materials View
  |     |     +-> Assignment Sync -> Deadline Aggregation (source 1)
  |     |     +-> Tab URL -> Unit Outline URL -> Unit Outline Parsing -> Assessment Weights
  |     |
  |     +-> Ed Adapter (requires Ed token)
  |           |
  |           +-> Discussion Sync -> High-Value Posts (rule-based)
  |           +-> Lesson Sync -> Course Materials View
  |           +-> Lesson due_at -> Deadline Aggregation (source 2)
  |           +-> Discussion teacher mentions -> Deadline Aggregation (source 3, AI-assisted)
  |
  +-> GPA Calculation + Assessment Weights
  |     |
  |     +-> What-if Predictor (requires weights + current grades)
  |     +-> Target GPA Path Planner (requires weights + current grades)
  |     +-> GPA Risk Alerts (requires target GPA setting)
  |
  +-> Deadline Aggregation (all 3 sources)
  |     |
  |     +-> Unified Deadline View
  |     +-> Tiered Reminders (72h / 24h / 3h)
  |
  +-> High-Value Posts + New Grades + New Deadlines
  |     |
  |     +-> Daily Digest (rule-based aggregation)
  |
  +-> AI Engine (Anthropic API)
        |
        +-> AI Thread Scoring (enhances rule-based filtering)
        +-> AI Digest Generation (enhances rule-based digest)
        +-> AI Material Summarization
        +-> AI Q&A (Phase 3+)
```

## MVP Recommendation

Prioritize for the 2-week timeline:

### Must Ship (P0)

1. **Authentication + Token Setup** -- gate to everything else
2. **Canvas Adapter + Grade Sync** -- enables GPA tracking (core value)
3. **Unit Outline Parser** -- enables accurate assessment weights
4. **GPA/WAM Calculation + Display** -- the dashboard's headline number
5. **What-if GPA Simulator** -- #1 differentiator, high impact, medium complexity
6. **Canvas Assignments -> Deadline Aggregation** -- at minimum single-source deadlines
7. **Dashboard UI (GPA overview + deadline list)** -- users need to see the data
8. **3-step Onboarding Flow** -- without this, non-technical users cannot start

### Should Ship (P1)

9. **Ed Discussion Adapter + High-Value Post Filtering (rule-based)** -- adds Ed integration
10. **Ed Lessons Adapter + Lesson Sync** -- completes course materials view
11. **Three-source Deadline Aggregation** -- the full dedup pipeline
12. **Target GPA Path Planner** -- reverse-calculate required scores
13. **Course Detail Pages (grades/materials/discussions/outline tabs)**
14. **Daily Digest (rule-based)** -- aggregated email/web notification
15. **GPA Risk Alerts** -- threshold-based warnings

### Defer (P2 / Post-MVP)

- **AI thread relevance scoring** -- rule-based is sufficient initially
- **AI-enhanced digest** -- rule-based aggregation works for MVP
- **AI material summarization** -- nice-to-have, not critical
- **AI Q&A** -- Phase 3+ feature
- **MCP Server** -- the adapters exist but MCP tool wiring can wait
- **File content search (tsvector)** -- requires indexing pipeline
- **Unit review with community cheatsheets** -- Phase 3+ feature
- **Tiered reminder notifications (72h/24h/3h)** -- requires scheduling infrastructure

**Rationale:** Ship GPA tracking + deadlines + basic Ed integration first. These deliver the core "see everything in one place" value. AI features and MCP are enhancements that make the product better but aren't required for the first usable version.

## Sources

- UniBoard BRD v2.6 SS2 (user stories and priorities)
- UniBoard BRD v2.6 SS3 (competitive analysis)
- UniBoard PROJECT.md (active requirements)
- UniBoard TRD v2.5 SS3.3 (service layer design)
