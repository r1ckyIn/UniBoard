# Requirements: UniBoard

**Defined:** 2026-03-16
**Core Value:** Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### GPA Core

- [x] **GPA-01**: User can view real-time GPA/WAM for current semester, calculated from Canvas grades (data delay < 15 min)
- [x] **GPA-02**: User can perform What-if simulation by inputting hypothetical future assessment scores and seeing updated GPA in real-time
- [x] **GPA-03**: User can set a target GPA and see the minimum scores needed per remaining assessment to reach it
- [x] **GPA-04**: User can view assessment weight breakdown per course, parsed from Unit Outline HTML with visual donut chart
- [x] **GPA-05**: User can see per-course WAM with grade band indicator (HD/D/CR/P/F) and percentage of course assessed

### Deadlines

- [x] **DL-01**: User can view all upcoming deadlines in a unified timeline, aggregated from Canvas Assignments + Ed Lessons + Ed Discussion (deduplicated)
- [ ] **DL-02**: User receives tiered deadline reminders at 72h, 24h, and 3h before due date
- [ ] **DL-03**: User receives risk alert when their grade trajectory in a course deviates from their target GPA threshold

### Intelligence

- [x] **INTEL-01**: User can view Ed Discussion posts filtered by endorsed and staff-answered status (rule-based extraction)
- [ ] **INTEL-02**: User can view AI-extracted high-value information from Ed Discussion: exam scope hints, assignment clarifications, rubric details, deadline changes
- [ ] **INTEL-03**: User receives daily academic digest aggregating new deadlines, grades, announcements, and high-value Ed posts (rule-based)
- [ ] **INTEL-04**: User receives AI-enhanced digest with urgency scoring and GPA relevance ranking
- [x] **INTEL-05**: Deduplication across all data sources ensures no repeated information in digests or views

### Files & Materials

- [x] **FILE-01**: User can view all course folders with AI-generated one-sentence descriptions explaining folder contents (Canvas Modules + Ed Lessons unified)
- [x] **FILE-02**: User can search across all course materials by keyword, returning matching file names, locations, and content snippets
- [ ] **FILE-03**: User can ask AI questions about synced course materials and receive answers with cited sources (no hallucination)
- [ ] **FILE-04**: User can select a course unit and view AI-generated structured review summary (key concepts, common mistakes, exam scope) plus downloadable community cheatsheets

### Platform & Onboarding

- [x] **PLAT-01**: User can complete registration and API token connection in 3 steps with visual guides
- [x] **PLAT-02**: User can access the full dashboard via web browser without installing anything
- [ ] **PLAT-03**: Technical users can access UniBoard data via MCP server through Claude Desktop
- [x] **PLAT-04**: System displays token expiration warnings and guides re-authentication when Canvas/Ed tokens expire

### Skill System (MCP Agent)

- [ ] **SKILL-01**: After first successful API exploration for an operation, system auto-generates a prompt template skill capturing the optimal steps
- [ ] **SKILL-02**: Subsequent executions of the same operation load and follow the generated skill instead of re-exploring
- [ ] **SKILL-03**: Skills are per-course differentiated (different courses may have different material organization patterns)
- [ ] **SKILL-04**: ~50 skills covering data collection, data processing, AI analysis, and user action dimensions

### Frontend Pages

- [ ] **UI-01**: Dashboard page with hero welcome, stats row (WAM/Target/Alerts), course grades table, deadline timeline, assessment weight chart (prototype exists)
- [ ] **UI-02**: Courses page showing all enrolled courses with grade overview, assessment breakdown, and file navigation
- [ ] **UI-03**: Deadlines page with full calendar view and filterable timeline of all deadlines across courses
- [ ] **UI-04**: Predict page with interactive What-if GPA simulator (slider-based score input, real-time calculation)
- [ ] **UI-05**: Digest page showing daily/weekly intelligence digest with AI-scored relevance
- [ ] **UI-06**: Settings page for API token management, notification preferences, and GPA target configuration
- [x] **UI-07**: All pages follow Anthropic-inspired design system: warm colors, paper texture, Rough.js hand-drawn borders, Source Serif 4 + Inter fonts

### Infrastructure

- [x] **INFRA-01**: PostgreSQL database with schema for users, courses, grades, deadlines, Ed threads, course materials, skills, and encrypted tokens
- [x] **INFRA-02**: Background sync engine: grades every 15 min, deadlines hourly, modules daily, Unit Outline per semester
- [x] **INFRA-03**: Canvas adapter with rate limiting (sliding window from X-Rate-Limit-Remaining header), pagination, and circuit breaker
- [x] **INFRA-04**: Ed Discussion adapter with defensive Pydantic parsing, graceful degradation when API changes
- [x] **INFRA-05**: Ed Lessons adapter for lesson content and assignment extraction
- [x] **INFRA-06**: Unit Outline HTML parser with weight-sum validation and Canvas assignment_groups fallback
- [x] **INFRA-07**: Token encryption (AES-256-GCM) with key stored in environment variable
- [x] **INFRA-08**: Simple JWT + bcrypt authentication (not Cognito for MVP)
- [x] **INFRA-09**: Docker Compose for local PostgreSQL + backend + frontend development environment

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI Tutoring

- **TUTOR-01**: Interactive AI review Q&A — AI asks questions based on course materials, evaluates student answers, explains weak points
- **TUTOR-02**: AI homework coaching — guidance based on assignment outline, rubric, and Ed Discussion context
- **TUTOR-03**: Assignment ROI analysis — identify high-weight/low-difficulty assignments for effort optimization

### Personalization

- **PERS-01**: Onboarding questionnaire to customize dashboard layout and notification frequency
- **PERS-02**: Dynamic module weighting based on usage patterns

### External Integration

- **EXT-01**: AiStudyMate platform integration (https://aistudymate.it.com/zh) — connect to classmate's multimodal learning platform for assignment guidance. AiStudyMate provides: classroom transcription, review assistant (flashcards/mind maps/quizzes), problem-solving, interactive learning, paper/defense prep, whiteboard parsing, knowledge recycling. UniBoard provides data context (course materials, Ed discussions, assessment weights), AiStudyMate provides AI tutoring capabilities.

### Deployment

- **DEPLOY-01**: AWS deployment (Lambda + API Gateway + RDS + CDK)
- **DEPLOY-02**: AWS Cognito authentication migration

## Out of Scope

| Feature | Reason |
|---------|--------|
| Ed Discussion posting/replying | Read-only policy — avoid polluting Ed ecosystem |
| Canvas assignment submission | Academic integrity risk |
| Canvas quiz answering | Academic integrity risk |
| Homework ghostwriting / direct answers | Academic integrity violation |
| Social/chat features | Irrelevant to GPA |
| Course recommendations | Out of GPA tracking scope for v1 |
| Timetable page | Sidebar placeholder — not a GPA feature, defer |
| Mobile app | Web-first, mobile later |
| Real-time chat/messaging | High complexity, not core value |
| Multi-university support | USYD-only for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GPA-01 | Phase 2 | Complete |
| GPA-02 | Phase 2 | Complete |
| GPA-03 | Phase 2 | Complete |
| GPA-04 | Phase 2 | Complete |
| GPA-05 | Phase 2 | Complete |
| DL-01 | Phase 2 | Complete |
| DL-02 | Phase 4 | Pending |
| DL-03 | Phase 4 | Pending |
| INTEL-01 | Phase 2 | Complete |
| INTEL-02 | Phase 4 | Pending |
| INTEL-03 | Phase 4 | Pending |
| INTEL-04 | Phase 4 | Pending |
| INTEL-05 | Phase 2 | Complete |
| FILE-01 | Phase 2 | Complete |
| FILE-02 | Phase 2 | Complete |
| FILE-03 | Phase 4 | Pending |
| FILE-04 | Phase 4 | Pending |
| PLAT-01 | Phase 3 | Complete |
| PLAT-02 | Phase 3 | Complete |
| PLAT-03 | Phase 4 | Pending |
| PLAT-04 | Phase 2 | Complete |
| SKILL-01 | Phase 4 | Pending |
| SKILL-02 | Phase 4 | Pending |
| SKILL-03 | Phase 4 | Pending |
| SKILL-04 | Phase 4 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 3 | Pending |
| UI-06 | Phase 3 | Pending |
| UI-07 | Phase 3 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 2 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| INFRA-06 | Phase 1 | Complete |
| INFRA-07 | Phase 1 | Complete |
| INFRA-08 | Phase 1 | Complete |
| INFRA-09 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41/41
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation (all 41 requirements mapped)*
