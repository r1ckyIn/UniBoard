---
phase: 34
slug: ai-features-live
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `34-RESEARCH.md` §10 (Validation Architecture).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3 + pytest-asyncio 0.25 (backend), Vitest (frontend) |
| **Config file** | `pyproject.toml [tool.pytest.ini_options]`, `frontend/vitest.config.ts` |
| **Quick run command** | `uv run pytest tests/unit/ -x -q --timeout=30` |
| **Full suite command** | `uv run pytest tests/ -x -q --timeout=120 && cd frontend && pnpm test` |
| **Estimated runtime** | ~45s (unit) / ~180s (full backend + frontend) |

---

## Sampling Rate

- **After every task commit:** Run `uv run pytest tests/unit/ -x -q --timeout=30` (backend) or `cd frontend && pnpm test --run --bail` (frontend, when frontend file modified)
- **After every plan wave:** Run `uv run pytest tests/ -x -q --timeout=120 && cd frontend && pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30s (unit) / 180s (full)

---

## Per-Task Verification Map

> Task IDs (`{N}-{plan}-{task}`) finalized once `/gsd-planner` produces PLAN.md files. This table maps each REQ-ID to the test file that covers it; the planner will assign these tests to specific tasks during planning.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| AIFEAT-01 | Study rec generated for user with upcoming deadlines | unit | `uv run pytest tests/unit/test_study_recommendation_service.py::test_generate_and_cache -x` | ❌ W0 | ⬜ pending |
| AIFEAT-01 | Composite score ranks high-weight near-due items first | unit | `uv run pytest tests/unit/test_study_recommendation_service.py::test_score_candidate_ranking -x` | ❌ W0 | ⬜ pending |
| AIFEAT-01 | Cache UPSERT idempotent on same date | unit | `uv run pytest tests/unit/test_study_recommendation_service.py::test_cache_upsert_idempotent -x` | ❌ W0 | ⬜ pending |
| AIFEAT-01 | AI failure → fallback to ROI-only Top-3 (D-D1) | unit | `uv run pytest tests/unit/test_study_recommendation_service.py::test_ai_failure_fallback -x` | ❌ W0 | ⬜ pending |
| AIFEAT-01 | GET /ai/study-recommendations returns cached row | integration | `uv run pytest tests/integration/test_ai_routes.py::test_get_study_recommendations -x` | ⚠️ extend | ⬜ pending |
| AIFEAT-01 | Daily APScheduler job triggers at 7am Sydney | unit | `uv run pytest tests/unit/test_study_recommendation_scheduler.py -x` | ❌ W0 | ⬜ pending |
| AIFEAT-02 | Embedding worker re-embeds course when content_hash differs | unit | `uv run pytest tests/unit/test_embedding_worker.py::test_rehash_triggers_reembed -x` | ❌ W0 | ⬜ pending |
| AIFEAT-02 | Embedding worker skips cold-set courses (>7d unaccessed) | unit | `uv run pytest tests/unit/test_embedding_worker.py::test_skips_unaccessed_courses -x` | ❌ W0 | ⬜ pending |
| AIFEAT-02 | course_qa bumps Course.last_qa_access_at | integration | `uv run pytest tests/integration/test_ai_routes.py::test_qa_bumps_last_access -x` | ⚠️ extend | ⬜ pending |
| AIFEAT-02 | SSE emits sources event before first token | integration | `uv run pytest tests/integration/test_ai_routes.py::test_sse_sources_event_order -x` | ⚠️ extend | ⬜ pending |
| AIFEAT-02 | RAG with real USYD course returns ≥1 cited source (env-gated) | integration | `RAG_REAL_DATA_COURSE_ID=<uuid> uv run pytest tests/integration/test_rag_real_data.py -x` | ❌ W0 | ⬜ pending |
| AIFEAT-02 | Embedding worker honors Voyage rate limits (no 429 on burst) | unit | `uv run pytest tests/unit/test_embedding_worker.py::test_respects_rate_limits -x` | ❌ W0 | ⬜ pending |
| AIFEAT-03 | calculate_multi_course_path: math correctness with target=78, current=75 | unit | `uv run pytest tests/unit/test_path_planner.py::test_required_avg_math -x` | ❌ W0 | ⬜ pending |
| AIFEAT-03 | Unreachable target returns max_reachable + suggested_target | unit | `uv run pytest tests/unit/test_path_planner.py::test_unreachable_returns_suggestion -x` | ❌ W0 | ⬜ pending |
| AIFEAT-03 | 0 remaining cp returns null required_avg | unit | `uv run pytest tests/unit/test_path_planner.py::test_zero_remaining -x` | ❌ W0 | ⬜ pending |
| AIFEAT-03 | Already-met target returns required_avg=0 | unit | `uv run pytest tests/unit/test_path_planner.py::test_already_achieved -x` | ❌ W0 | ⬜ pending |
| AIFEAT-03 | POST /gpa/multi-course-path returns full payload | integration | `uv run pytest tests/integration/test_gpa_routes.py::test_multi_course_path -x` | ⚠️ extend | ⬜ pending |
| AIFEAT-03 | AI advisory failure → advisory_text=None, math still returned (D-D1) | integration | `uv run pytest tests/integration/test_gpa_routes.py::test_path_ai_fallback -x` | ⚠️ extend | ⬜ pending |
| Frontend | useAiStream parses sources event into state | unit | `cd frontend && pnpm test -- use-ai-stream` | ❌ W0 | ⬜ pending |
| Frontend | Sources panel renders [N] inline + collapsible list | unit | `cd frontend && pnpm test -- Sources` | ❌ W0 | ⬜ pending |
| Frontend | StudyRecCard renders Top-3 with course colors | unit | `cd frontend && pnpm test -- StudyRecCard` | ❌ W0 | ⬜ pending |
| Frontend | MultiCoursePathCard hides advisory when null | unit | `cd frontend && pnpm test -- MultiCoursePathCard` | ❌ W0 | ⬜ pending |
| Frontend | GpaTargetSection: 4-band quick-pick chips set Profile.gpa_target | unit | `cd frontend && pnpm test -- GpaTargetSection` | ⚠️ extend | ⬜ pending |
| Frontend | DashboardPage hero swap renders study rec main suggestion | unit | `cd frontend && pnpm test -- DashboardPage` | ⚠️ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*File: ❌ W0 = does not exist, must be created in Wave 0 · ⚠️ extend = file exists, add new tests*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_study_recommendation_service.py` — covers AIFEAT-01 service unit tests (4 cases)
- [ ] `tests/unit/test_study_recommendation_scheduler.py` — APScheduler job registration + cron timing
- [ ] `tests/unit/test_path_planner.py` — covers AIFEAT-03 math (4 cases: standard, unreachable, zero-remaining, already-met)
- [ ] `tests/unit/test_embedding_worker.py` — covers AIFEAT-02 worker (3 cases: re-embed, skip cold, rate limit)
- [ ] `tests/integration/test_rag_real_data.py` — env-gated real-data harness mirroring Phase 32.1 pattern (skip if `RAG_REAL_DATA_COURSE_ID` unset)
- [ ] `tests/integration/test_ai_routes.py` — extend with study-recommendations endpoint + sources-event ordering tests
- [ ] `tests/integration/test_gpa_routes.py` — extend with multi-course-path endpoint + AI fallback tests
- [ ] `frontend/hooks/use-ai-stream.test.ts` — sources-event parsing test (likely needs creation)
- [ ] `frontend/components/shared/Sources.test.tsx` — new component test
- [ ] `frontend/components/predict/StudyRecCard.test.tsx` — new component test
- [ ] `frontend/components/predict/MultiCoursePathCard.test.tsx` — new component test
- [ ] Migration: `supabase/migrations/<timestamp>_phase34_ai_features.sql` — adds `Profile.remaining_credit_points`, `Course.content_hash`, `Course.last_qa_access_at`, `Course.embedded_at`, `study_recommendation_cache` table + RLS

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI study suggestion is "actionable + 20-30 words" per Phase 18 style | AIFEAT-01 | LLM output quality is subjective; cannot fully automate | UAT: log into staging with test user; check Dashboard hero shows main suggestion that mentions specific course/assessment + verb (Focus, Review, Submit) |
| Citation `[N]` superscripts visually align with answer text | AIFEAT-02 | Visual rendering, not data correctness | UAT: open course detail page; ask QA question; verify `[1]` and `[2]` appear inline + Sources panel expands to show real Ed Lessons titles |
| AI advisory copy reads naturally in Chinese (zh) | AIFEAT-03 | Translation quality is subjective | UAT: switch language to zh; trigger path planner with target=85, current=72; verify advisory uses natural Chinese phrasing |
| Recommendation cache invalidates when assessment marked complete | AIFEAT-01 | Edge case timing-sensitive | UAT: complete a high-weight assessment; refresh dashboard within 1 minute; verify main suggestion updates (not stale) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for unit tests
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 completes)

**Approval:** pending
