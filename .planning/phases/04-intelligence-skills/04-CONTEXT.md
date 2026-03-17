# Phase 4 Context: Intelligence, Skills & MCP

## Phase Goal

UniBoard delivers proactive intelligence (AI-enhanced digests, risk alerts, notifications), AI-powered course material Q&A, and a self-improving skill system for development.

## Decisions from Discussion

### 1. Notification & Reminder System

- **Channels**: Email (AWS SES) + in-app dual-channel
- **Email service**: AWS SES (consistent with existing AWS stack)
- **Digest time**: Daily at 07:00 AEST
- **GPA risk trigger**: Trend detection primary → invoke Claude Opus 4.6 for deep analysis when risk signal detected
- **Notification UI**: Sidebar bell icon + unread badge + dropdown notification list

### 2. AI Intelligence Layer

- **LLM**: Claude Opus 4.6 (for risk analysis and other deep tasks)
- **Q&A architecture**: Hybrid — small courses use direct context, large courses auto-switch to RAG/pgvector
- **Citation format**: Inline citations `[Canvas: Week 3 Lecture Notes]`
- **Digest AI**: Urgency scoring (1-5) + intelligent summary (both required)
- **Quality gate**: TRD §6 — F1 < 75% auto-fallback to rule engine

### 3. MCP Server

- **Status**: DEFERRED to v1.1+
- **Reason**: Phase 4 focuses on AI intelligence + notifications. MCP open-source packaging is additive value, not core product
- **Student access channels**: Email notifications + Web Dashboard (two channels only)

### 4. Skill System

- **Positioning**: Uses Claude Code's skills system (`.claude/skills/`), NOT database templates
- **Purpose**: Teach AI the most precise data acquisition paths and error handling approaches
- **Implementation**: Auto-generate SKILL.md after first successful operation; error handling experience also written to skill
- **Timing**: Included in Phase 4

## Requirements Covered

| Requirement | Description | Status |
|-------------|-------------|--------|
| DL-02 | Tiered deadline reminders (72h/24h/3h) | Plan 04-01 |
| DL-03 | GPA risk alert on trajectory deviation | Plan 04-01 |
| INTEL-02 | AI-extracted high-value Ed Discussion info | Plan 04-02 |
| INTEL-03 | Daily digest (rule-based aggregation) | Plan 04-01 |
| INTEL-04 | AI-enhanced digest with urgency scoring | Plan 04-01 |
| FILE-03 | AI Q&A on course materials with citations | Plan 04-02 |
| FILE-04 | AI unit review summaries | Plan 04-02 |
| PLAT-03 | MCP server for Claude Desktop | DEFERRED to v1.1+ |
| SKILL-01–04 | Skill auto-generation system | .claude/skills/ approach |

## Deferred Items

- MCP Server open-source packaging → v1.1+
- Password change functionality → future version
- i18n page content translation → future optimization

## Existing Infrastructure to Build On

### Backend (Phase 1–2)

- `src/services/intelligence.py` — Rule-based EdIntelligenceService (endorsed + staff posts)
- `src/services/gpa.py` — GPA/WAM calculation, What-if simulator
- `src/services/deadline.py` — Deadline aggregation with SHA-256 dedup
- `src/services/materials.py` — Course materials with AI descriptions + tsvector search
- `src/sync/engine.py` — APScheduler-based sync engine (grades 15min, deadlines 1h, modules daily)
- `src/config.py` — Settings with `anthropic_api_key` and `ai_daily_limit_per_user` already configured
- `src/models/` — All 11 ORM models (User, Course, Grade, Deadline, DiscussionThread, Module, etc.)

### Frontend (Phase 3)

- `frontend/components/digest/` — DigestCard + DigestFeed (rule-based, Phase 3 version)
- `frontend/components/layout/Sidebar.tsx` — Navigation sidebar (bell icon needs adding)
- `frontend/components/layout/RightPanel.tsx` — Sticky right panel
- `frontend/lib/api/` — API client with JWT auth, types, endpoints
- `frontend/lib/hooks/` — Custom hooks for courses, deadlines, GPA, sync, etc.

## Plan Structure (Proposed)

- **04-01**: Notifications backend (deadline reminders, GPA risk alerts) + daily digest (rule-based + AI-enhanced) + notification API + frontend notification UI
- **04-02**: AI course material Q&A (cited answers) + AI unit review summaries + AI high-value Ed post extraction + frontend AI components

## Technical Notes

- Anthropic SDK already in `pyproject.toml` (`anthropic>=0.84,<1.0`)
- mypy overrides for `anthropic.*` already configured (follow_untyped_imports=false)
- APScheduler already running — digest/notification jobs can be added to existing scheduler
- `UNIBOARD_DISABLE_SYNC` env var disables scheduler in tests
- pgvector extension needed for RAG on large courses (new dependency)
