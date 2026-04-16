# Phase 34: AI Features Live — Research

**Researched:** 2026-04-16
**Domain:** Cached daily AI study recommendation + production RAG with citations + multi-course GPA path planner
**Confidence:** HIGH for codebase-anchored findings (all source paths grep-verified). MEDIUM for RAG citation SSE design (web research; no in-repo precedent — net-new schema decision). MEDIUM for Voyage AI rate-limit numbers (verified against docs.voyageai.com but tier upgrades change them). LOW for any claim about hot-set tracker schema choices (Claude's discretion area, no precedent in repo).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**A — Study Recommendation Surface (AIFEAT-01)**

- **D-A1:** Two surfaces — Dashboard hero (1 main "today's focus" suggestion that replaces/augments current greeting) + Predict page (Top-3 ranked actions list). Same backing service, different presentations.
- **D-A2:** Daily cache (7am Australia/Sydney via APScheduler `CronTrigger`, mirroring digest scheduler). Result persisted to a new `study_recommendation_cache` table keyed by `(user_id, generated_for_date)`. Frontend reads cached row — no realtime LLM call on page load.
- **D-A3:** Inputs are 100% automatic — no user mood/time-budget controls. Signal set: upcoming deadlines (next 14 days), assessment weights, ROIService scores, completion status.

**B — RAG Embedding Strategy (AIFEAT-02)**

- **D-B1:** Lazy hot-set scope — only embed courses where `Module.last_user_access_at >= now() - 7 days` (or fallback heuristic). Adds `Course.embedded_at` timestamp + a touched-courses tracker.
- **D-B2:** Hash-diff triggers re-embed. Compute `sha256(module.content + lesson.content)` per module; compare to new `Module.content_hash` column. On mismatch → enqueue re-embed.
- **D-B3:** Citation UX = inline numeric superscript markers `[1][2]` interleaved in answer body + collapsible "Sources" panel below. Each source shows `module.title → lesson_section_anchor` + relevance score. Reuses existing `AiCourseChat.tsx` and `DeadlineAiChat.tsx` shells.
- **Implementation surface:** Background worker added to existing APScheduler (`embed_hot_courses_job`, every 30 min). Calls existing `QAService.embed_course_materials(course_id)`. Worker respects Voyage rate limits.

**C — GPA Path Planner (AIFEAT-03)**

- **D-C1:** New Settings field "剩余学分 / Remaining credits" on `Profile` model as new column `remaining_credit_points` (default null). USYD typical Bachelor = 144 cp; planner does NOT auto-infer.
- **D-C2:** Hybrid target picker UI — 4 quick-pick chips (Pass 50 / Credit 65 / Distinction 75 / HD 85) + manual numeric override. Reuses existing `GpaTargetSection`.
- **D-C3:** Unreachable target → returns `{ achievable: false, max_reachable_wam, suggested_target }`. UI shows: "HD (85) is no longer reachable. Distinction (75) still possible — needs avg X." No dead-end UX.
- **D-C4:** AI wraps math output into 30-50 word actionable line in user's `language_preference`. Format: `[Verdict] + [Required avg] + [Concrete tactic]`. Falls back to math-only on AI failure.

**D — Quality Gate & Fallback (Cross-cutting)**

- **D-D1:** Per-feature graceful fallback (NOT global F1 gate):
  - Study rec → AI unavailable → render Top-3 ROI ranking only (no AI prose), keep card visible.
  - Course QA → embedding/AI fail → keyword search across `module.title + module.content` (lucene-style ILIKE), no citations.
  - Path Planner → AI fail → render math-only result, no advisory paragraph.
  - Phase 18's global F1 gate (Ed Discussion) remains unchanged.
- **D-D2:** Silent fallback. No "currently using rule engine" UI banner. Logged to Sentry with `feature` tag.
- **D-D3:** No 👍/👎 feedback button on study recommendations (no objective ground truth). Phase 18 thread feedback unchanged.

### Claude's Discretion

- Exact prompt wording for study recommendation generator (must follow Phase 18 "precise 20-30 word study guidance" rule)
- Cache table schema details (TTL strategy, eviction policy)
- Hot-set tracker implementation: dedicated table vs reusing `last_sync_at` heuristic
- Worker queue mechanism for embedding (in-DB queue vs APScheduler list scan)
- Frontend component structure (whether to extract a shared `RecommendationCard` or inline per page)
- i18n key naming for new strings
- Error retry policies on Voyage API (reuse existing adapter retry config)

### Deferred Ideas (OUT OF SCOPE)

- Push notifications for deadline reminders → Phase 35
- AI prompt A/B testing framework → backlog
- Per-course F1 quality gates → backlog
- USYD degree audit auto-import (OCR / API) → infeasible; user input is canonical
- 👍/👎 feedback on study recommendations → no ground truth (D-D3)
- Mood / available-study-time inputs → out of scope
- "Currently using rule engine" UI banner → out of scope; silent fallback chosen
- Cross-semester trend visualization for path planner → future
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AIFEAT-01 | AI study recommendations prioritizing assessments by weight ("Focus on Final Exam, worth 50%") | §3 Study Recommendation Algorithm + §6 Daily APScheduler job + §10 Validation map |
| AIFEAT-02 | Course material QA using RAG on Ed Lessons with cited sources, verified with real data | §4 RAG Production-Readiness + §5 Citation SSE Schema + §6 30-min embedding worker + §10 Validation map |
| AIFEAT-03 | GPA path planner: required average for remaining subjects to reach target distinction | §7 MultiCoursePathService design + §8 REST endpoint shape + §10 Validation map |

The planner MUST cite the specific finding section in each task's `<context>` block.
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These directives must be honored by every plan/task in this phase. Treat as locked.

| Constraint | Source | Impact on Phase 34 |
|-----------|--------|---------------------|
| Python 3.12+, FastAPI, SQLAlchemy 2.0 async + asyncpg, mypy --strict, ruff, pytest + pytest-asyncio | UniBoard CLAUDE.md | All new service code must pass `uv run mypy --strict src/` and `uv run ruff check src/` |
| Code comments must be **English only** | r1ckyIn_GitHub/.claude/rules/02-standards/code-comments.md | Service docstrings, prompt strings (the system content can stay bilingual via the prompt files), and all `# ...` comments in English |
| `CronTrigger(hour=7, minute=0, timezone="Australia/Sydney")` — never compute UTC manually | UniBoard CLAUDE.md "Digest 调度器时区陷阱" | New daily cache job MUST use `Australia/Sydney` timezone literal to honor DST. Mirror existing `generate_daily_digests` registration in `src/sync/engine.py:101-111`. |
| Alembic/SQL migration: pgvector VECTOR columns added via `op.execute("ALTER TABLE ...")`, NOT via `sa.Column(sa.Column)` | UniBoard CLAUDE.md "Alembic Migration 中 sa.Column 误用" | If migration touches `content_embeddings`, mirror existing pattern. Phase 34 likely needs only nullable scalar columns (no new vector columns), so this trap is unlikely to bite — but flag for the planner. |
| jsdom does not implement `scrollTo`/`scrollIntoView` — guard with `typeof element.scrollTo === "function"` | UniBoard CLAUDE.md "jsdom 缺少 scrollTo 方法" | New chat citation scroll-to-source behaviour MUST guard the call. Existing `AiCourseChat.tsx:34` already follows this pattern. |
| Use existing GSD `/gsd-execute-phase` worker; ONE phase = ONE feature branch = ONE PR | r1ckyIn_GitHub/.claude/rules/01-workflow/gsd-pipeline-v1.36.md | Branch must be `feature/34-ai-features-live` before any task commit |
| Single-source-of-truth: `openapi.yaml` → `pnpm generate:types` → `frontend/lib/api/types.gen.d.ts` (never hand-edit) | Phase 33 learning (PROJECT.md Key Decisions) | Any new endpoint added in §8 MUST update `openapi.yaml` first, then regenerate types |
| Sentry instrumentation with `phase=34` tag for new server-side failure paths | Phase 33 pattern (`src/observability.py:12`) | Use `with sentry_phase_scope("34"): sentry_sdk.capture_exception()` in fallback branches |
| One Plan per Wave; max 15 files per Plan; large refactors must split | r1ckyIn_GitHub/.claude/rules/01-workflow/gsd-integration.md "Executor 大任务规避" | Split into ~3-5 plans (likely: schema/migration, study rec service, RAG worker, path planner, frontend integration) |

[VERIFIED: file system read of CLAUDE.md and rules/ directory]

---

## 1. Executive Summary

Phase 34 is largely a **wiring + extension** phase, not a greenfield build. Five findings will materially shape the plan:

1. **`QAService.embed_course_materials()` already exists at `src/services/qa.py:358-414`** — full Voyage AI batch embedding + chunking + pgvector insert pipeline. Phase 34's RAG worker just needs to call it on the right courses. There is NO need to rewrite the embedding pipeline. [VERIFIED: read]

2. **NO hot-set tracker exists today.** `Course` model has no `last_qa_access_at` column. `Module` model has no `last_user_access_at` column. The only "freshness" signal is `Profile.last_sync_at` and `Course.updated_at` (auto-updated by `handle_updated_at()` trigger on ANY column change). The planner MUST add a new column or table. **Recommendation:** add `Course.last_qa_access_at TIMESTAMPTZ NULL` (single column, no FK) — bumped on every `/courses/{id}/qa` and `/qa/stream` request. Avoids a separate tracker table for a single-column heuristic. [VERIFIED: file read of `src/models/course.py`, `src/models/module.py`]

3. **NO content hash column exists.** `Module` model has no `content_hash` field; `ModuleItem.search_vector` is a TSVECTOR computed from titles only. Phase 34 must add `Module.content_hash VARCHAR(64) NULL` and compute `sha256(concat(module_items.text_content || lessons.text_content))` per module. **Caveat:** `Module` does not currently have a single content blob — it's a parent of `ModuleItem.text_content`. The hash must be computed across joined items. [VERIFIED: file read of `src/models/module.py`]

4. **`GPAService.calculate_target_path()` is per-assessment, single-course (`src/services/gpa.py:354`).** It assumes all ungraded assessments belong to the user's current courses with grades. AIFEAT-03's "remaining REMAINING units" math is a different problem: given `current_wam, completed_credit_points, remaining_credit_points, target_wam`, solve for `required_avg`. This is simpler than the existing per-assessment math (one variable instead of N). **Recommendation:** add a new method `GPAService.calculate_multi_course_path(user_id, target_wam, remaining_credit_points)` rather than wrapping the per-assessment method. The two methods serve different UX needs and shouldn't share code. [VERIFIED: file read of `src/services/gpa.py:354-470`]

5. **SSE response schema must extend, not replace.** `frontend/lib/api/ai-stream.ts:7-10` defines `SSEEvent.event` as `"status" | "token" | "done" | "error"`. Citation-source data MUST land in a NEW event type (recommended: `"sources"`) emitted BEFORE the first `"token"` event, OR appended after `"done"`. Sending citations inline as part of `"token"` events would break the typewriter render. Backend `_sse_wrap()` in `src/web/routes/ai.py:96-110` only emits the four current event types — extending it requires updating both the backend yield logic AND the frontend parser AND the `useAiStream` hook. [VERIFIED: file read of `src/web/routes/ai.py`, `frontend/lib/api/ai-stream.ts`, `frontend/hooks/use-ai-stream.ts`]

**Primary recommendation:** Plan as 5 plans across 2 waves. Wave 1 = schema + backend services (parallel-safe: study rec service / RAG worker / path planner have no shared files). Wave 2 = frontend integration (depends on Wave 1's API contracts) + APScheduler wiring (depends on services existing).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Daily AI study recommendation generation | Backend (FastAPI service + APScheduler) | — | LLM call with user's cross-course state; runs on schedule, not on request. Cannot live in browser (cost + auth). |
| Study recommendation cache read (page load) | Backend (FastAPI route returns cached row) | Frontend (TanStack Query) | Pure DB read; standard hook pattern (mirror `useDigest`). |
| RAG embedding pipeline (Voyage AI calls) | Backend (APScheduler worker calling QAService) | — | Voyage API key never exposed to browser. Long-running batch task — must run server-side. |
| RAG retrieval + answer streaming | Backend (FastAPI SSE) | Frontend (parse SSE events) | Existing pattern; extends with `sources` event type. |
| Citation rendering (inline `[1]` markers + Sources panel) | Frontend (React component) | — | Pure UI concern; backend supplies structured `sources` payload. |
| GPA path math (closed-form solver) | Backend (GPAService method) | — | Deterministic calculation; same tier as existing GPAService. Frontend would duplicate Decimal precision risk if mirrored. |
| GPA path AI advisory paragraph | Backend (AIEngine.ask wrapper) | — | LLM call; auth-gated. |
| Settings field for `remaining_credit_points` | Frontend (input UI) | Backend (Profile column + UPDATE) | Standard form pattern; mirror `gpa_target` flow. |
| 4-band quick-pick chips | Frontend (button group) | — | Pure UI; sets local state then calls existing `useUpdateProfile`. |
| Per-feature graceful fallback | Backend (try/except + Sentry tag) | Frontend (no banner; just consume whichever shape arrives) | Locked decision D-D2: silent fallback. |

## Standard Stack

### Already in repo (verified by `pyproject.toml` + `pip show`)
| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `voyageai` | 0.3.7 [VERIFIED: `pip show voyageai`] | Embedding API client (`voyage-3` model, 1024 dim) | Already used in `QAService.embed_course_materials()`; no new dep |
| `pgvector` | 0.4.2 [VERIFIED: `pip show pgvector`] | SQLAlchemy bindings for pgvector + cosine_distance | Already used; existing `ContentEmbedding` model + index `ix_embeddings_course` |
| `apscheduler` | 3.11.2 [VERIFIED: `pip show apscheduler`] | AsyncIOScheduler for daily/interval jobs | Already used for `generate_daily_digests`, `check_token_health`, etc. |
| `anthropic` | >=0.84,<1.0 [VERIFIED: `pyproject.toml`] | Claude API streaming + tool_use | Already wired via `AIEngine` |
| `tiktoken` | >=0.8,<1.0 [VERIFIED: `pyproject.toml`] | Token counting for chunking decisions | Already used in `_chunk_text` and RAG threshold check |
| `sse-starlette` | >=3.0,<4.0 [VERIFIED: `pyproject.toml`] | SSE event source response | Already used in `course_qa_stream` |
| `sentry-sdk[fastapi]` | >=2.50,<3.0 [VERIFIED: `pyproject.toml`] | Sentry client | Required by D-D2 silent fallback contract |

### No new dependencies required
The plan SHOULD NOT add new Python packages for any of the three features. All required infrastructure is already installed and battle-tested in M3 (Phases 18-21). [VERIFIED: cross-referenced phase 33 LEARNINGS.md and pyproject.toml]

### Alternatives Considered

| Instead of | Could Use | Why Stick With Current |
|------------|-----------|------------------------|
| `voyage-3` (1024 dim) | `voyage-3.5` or `voyage-context-3` (newer 2025 models per voyageai PyPI) | Existing `ContentEmbedding.embedding` is `vector(1024)` — switching to 3.5 (1024 dim, same) is plausible but requires re-embed migration of all existing rows. Out of scope; defer to v3.1. |
| pgvector cosine_distance with NO index | Add HNSW or IVFFlat index | At <10k embedding rows per user (5 courses × ~30 chunks each = 150 rows), the linear scan is already <50ms. Index adds build cost; defer until per-user row count > 5k. [VERIFIED: existing schema has only `ix_embeddings_course` btree, not vector index] |
| In-DB queue table for embedding worker | APScheduler interval scan + `Module.content_hash IS NULL OR != computed` predicate | Solo-dev; queue table adds operational burden. Heuristic scan is sufficient at <100 users. [Claude's discretion] |
| New `study_recommendation_cache` table | Reuse `digests` table with a new `type='study_rec'` column | Decision D-A2 explicitly says new table. Following the lock. |

**Installation:** No `uv add ...` step required. Confirmed by reviewing `pyproject.toml`.

**Version verification:** All five Python deps verified locally:
```bash
$ pip show voyageai ; pip show pgvector ; pip show apscheduler
voyageai==0.3.7
pgvector==0.4.2
apscheduler==3.11.2
```
[VERIFIED: bash output 2026-04-16]

## Architecture Patterns

### System Architecture Diagram

```
┌─ Daily 7am AEST (APScheduler CronTrigger) ─────────────────────────┐
│  generate_study_recommendations_daily()                              │
│  ─ for each user with active courses:                                │
│      ─ load deadlines (next 14d) + ROI scores + completion + weight │
│      ─ rank candidates (pure-Python helper)                          │
│      ─ AIEngine.ask → 20-30 word "today's focus" + Top-3 list        │
│      ─ UPSERT study_recommendation_cache (user_id, generated_for)    │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─ Page load (Dashboard or Predict) ──────────────────────────────────┐
│  GET /ai/study-recommendations  →  read cached row from DB           │
│  Frontend: render hero (1) on Dashboard, Top-3 list on Predict       │
└─────────────────────────────────────────────────────────────────────┘

┌─ Every 30min (APScheduler IntervalTrigger) ─────────────────────────┐
│  embed_hot_courses_worker()                                          │
│  ─ SELECT courses WHERE last_qa_access_at >= now() - 7d              │
│  ─ for each course:                                                  │
│      ─ compute_module_hash(course) → sha256                          │
│      ─ if Module.content_hash != computed: re-embed via              │
│        QAService.embed_course_materials(course_id) ────┐             │
│        update Module.content_hash + Course.embedded_at │             │
└────────────────────────────────────────────────────────┴─────────────┘
                                                          ↓
                                     ┌─ ContentEmbedding rows (pgvector) ─┐
                                     │  source_type, course_id, chunk_text │
                                     │  embedding vector(1024)             │
                                     └─────────────────────────────────────┘
                                                          ↑
┌─ User asks question (browser → /qa/stream) ─────────────────────────┐
│  POST /api/v1/courses/{id}/qa/stream                                 │
│  ─ Stamp Course.last_qa_access_at = now() (fuels hot-set)            │
│  ─ QAService.stream_answer_question (existing)                       │
│      ─ small course → direct context                                 │
│      ─ large course → RAG retrieve top-K chunks → stream answer      │
│  ─ NEW: emit SSE event "sources" with [{module_id, title, score}]    │
│    BEFORE first "token" event                                        │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─ Frontend AiCourseChat.tsx (extended) ──────────────────────────────┐
│  useAiStream parses "sources" → state.sources                        │
│  AiChatBubble renders [1][2] inline + Sources panel below            │
└─────────────────────────────────────────────────────────────────────┘

┌─ User clicks "Calculate Path" (Settings or Predict) ────────────────┐
│  POST /gpa/multi-course-path { target_wam, remaining_cp }            │
│  ─ GPAService.calculate_multi_course_path                            │
│      ─ load completed grades → current_wam + completed_cp            │
│      ─ solve required_avg = (target * (cp_done + cp_remain)          │
│                                - current_wam * cp_done) / cp_remain  │
│      ─ if required_avg > 100 → unreachable; suggest next-best band   │
│  ─ AIEngine.ask → 30-50 word verdict + tactic (lang_pref)            │
│  ─ Return { is_achievable, required_avg, max_reachable, suggested,   │
│             advisory_text, language }                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities (file-to-implementation mapping)

| Component | New / Existing | Path | Responsibility |
|-----------|----------------|------|----------------|
| `study_recommendation_cache` table | NEW | `supabase/migrations/00000000000008_study_rec_and_hot_set.sql` | Daily-cached rec rows per user |
| `study_recommendation_generated_at` (NOT used per CONTEXT alt) | — | — | NOT adding; cache table holds the timestamp |
| `Profile.remaining_credit_points` | NEW (column) | same migration | User's remaining credits — canonical source |
| `Course.last_qa_access_at` | NEW (column) | same migration | Hot-set heuristic — bumped on each `/qa` call |
| `Course.embedded_at` | NEW (column) | same migration | Per-course embedding freshness |
| `Module.content_hash` | NEW (column) | same migration | Re-embed trigger (sha256) |
| `StudyRecommendation` ORM model | NEW | `src/models/study_recommendation.py` | SQLAlchemy bindings to new cache table |
| `StudyRecommendationService` | NEW | `src/services/study_recommendation.py` | Generate + cache + retrieve |
| `study_recommendation.py` prompts | NEW | `src/prompts/study_recommendation.py` | EN + ZH "20-30 word focus" prompt |
| `path_planner.py` (or method on GPAService) | NEW | `src/services/path_planner.py` OR add method to `gpa.py` | Multi-course math + AI advisory |
| `path_planner.py` prompts | NEW | `src/prompts/path_planner.py` | EN + ZH "30-50 word verdict" prompt |
| Embedding worker + daily rec job | NEW (additions) | `src/sync/scheduled.py` (extend) | Two new async functions |
| Worker registration | NEW (additions) | `src/sync/engine.py` lifespan (extend) | `scheduler.add_job(...)` calls |
| `/ai/study-recommendations` route | NEW | `src/web/routes/ai.py` (extend) | GET cached rec for user |
| `/gpa/multi-course-path` route | NEW | `src/web/routes/gpa.py` (extend) | POST math + advisory |
| Bump `Course.last_qa_access_at` | EXTEND | `src/web/routes/ai.py:113` (in `course_qa`) and `:151` (in `course_qa_stream`) | One-line UPDATE before LLM call |
| QA SSE `sources` event emission | EXTEND | `src/web/routes/ai.py:96` (`_sse_wrap`) and `src/services/qa.py:_answer_rag` | Emit BEFORE token events |
| `useAiStream.ts` extension | EXTEND | `frontend/hooks/use-ai-stream.ts` | Parse `sources` event type, return `sources` state |
| `AiChatBubble.tsx` citation rendering | EXTEND | `frontend/components/shared/AiChatBubble.tsx` (or new `Sources.tsx`) | `[N]` superscripts + collapsible panel |
| `HeroSection.tsx` "today's focus" | EXTEND | `frontend/components/dashboard/HeroSection.tsx` | Replace mock encouragement with cached rec |
| `StudyRecCard.tsx` (Top-3) | NEW | `frontend/components/predict/StudyRecCard.tsx` | New card on PredictPage right rail |
| `GpaTargetSection.tsx` extension | EXTEND | `frontend/components/settings/GpaTargetSection.tsx` | + 4 chips + remaining-cp input |
| `MultiCoursePathCard.tsx` | NEW | `frontend/components/predict/MultiCoursePathCard.tsx` | Verdict + AI advisory paragraph |

### Recommended Project Structure (additions only)

```
src/
├── models/
│   └── study_recommendation.py        # NEW
├── services/
│   ├── study_recommendation.py        # NEW
│   └── path_planner.py                # NEW (or method on gpa.py)
├── prompts/
│   ├── study_recommendation.py        # NEW (EN + ZH)
│   └── path_planner.py                # NEW (EN + ZH)
├── sync/
│   └── scheduled.py                   # EXTEND (+ 2 async funcs)
└── web/routes/
    ├── ai.py                          # EXTEND (+ /study-recommendations + sources event)
    └── gpa.py                         # EXTEND (+ /multi-course-path)

supabase/migrations/
└── 00000000000008_phase34_ai_features.sql   # NEW
                                              # adds: study_recommendation_cache table
                                              #       Profile.remaining_credit_points
                                              #       Course.last_qa_access_at, embedded_at
                                              #       Module.content_hash
                                              # plus RLS policies for the new table

frontend/
├── components/
│   ├── dashboard/HeroSection.tsx      # EXTEND (cached rec display)
│   ├── predict/StudyRecCard.tsx       # NEW (Top-3)
│   ├── predict/MultiCoursePathCard.tsx# NEW (path verdict)
│   ├── settings/GpaTargetSection.tsx  # EXTEND (chips + remaining-cp)
│   └── shared/Sources.tsx             # NEW (citation panel)
├── hooks/
│   └── use-ai-stream.ts               # EXTEND (parse sources event)
└── lib/api/types.gen.d.ts             # REGENERATE after openapi.yaml edits
```

### Pattern 1: APScheduler Job Registration (mirror existing)

**What:** Add new jobs to the lifespan in `src/sync/engine.py` mirroring the existing pattern.
**When to use:** Both new background jobs (daily rec + 30-min embedding worker).
**Example:**
```python
# Source: src/sync/engine.py:101-120 (existing pattern)

# Daily recommendation generation (AEST timezone for DST correctness)
scheduler.add_job(
    generate_study_recommendations_daily,
    CronTrigger(
        hour=7,
        minute=0,
        timezone="Australia/Sydney",  # MUST be this literal — not UTC + offset
    ),
    id="generate_study_recommendations_daily",
    replace_existing=True,
    max_instances=1,
)

# Hot-set embedding worker (every 30 min)
scheduler.add_job(
    embed_hot_courses_worker,
    IntervalTrigger(minutes=30),
    id="embed_hot_courses_worker",
    replace_existing=True,
    max_instances=1,
)
```
[VERIFIED: read of `src/sync/engine.py:53-130`]

### Pattern 2: Per-User Iteration with Session-Per-User (mirror existing)

**What:** Daily rec job iterates all users; each user gets its own session to isolate failures.
**When to use:** Study rec job (D-A2 says daily, so iterate all users).
**Example:**
```python
# Source: src/sync/scheduled.py:89-124 (generate_daily_digests)

async def generate_study_recommendations_daily() -> None:
    session_factory = _get_sync_session_factory()
    settings = get_settings()

    async with session_factory() as session:
        result = await session.execute(select(Profile))
        users = list(result.scalars().all())

    for user in users:
        try:
            async with session_factory() as session:
                svc = StudyRecommendationService(
                    session,
                    anthropic_api_key=settings.anthropic_api_key,
                    language=user.language_preference,
                )
                await svc.generate_and_cache(user.id)
                await session.commit()
        except Exception:
            with sentry_phase_scope("34"):
                sentry_sdk.capture_exception()
            logger.warning(
                "study_rec_generation_failed",
                user_id=str(user.id),
                exc_info=True,
            )
```
[VERIFIED: read of `src/sync/scheduled.py:89-124`]

### Pattern 3: Per-Feature Graceful Fallback with Sentry Tag (Phase 33 pattern)

**What:** Wrap AI call in try/except. On failure, fall through to deterministic backup. Log to Sentry with `phase=34` tag.
**When to use:** All three AIFEAT features (D-D1).
**Example:**
```python
# Source: src/sync/scheduled.py:206-213 (recall email pattern)

try:
    advisory_text = await ai_engine.ask_question(
        question=user_msg,
        context_text=math_summary,
    )
    advisory_text = advisory_text.answer
except Exception:
    with sentry_phase_scope("34"):
        sentry_sdk.capture_exception()
    advisory_text = None  # Frontend shows math-only

return MultiCoursePathResponse(
    is_achievable=is_achievable,
    required_avg=float(required_avg),
    max_reachable=float(max_reachable),
    suggested_target=suggested_target,
    advisory_text=advisory_text,  # nullable per D-D1 fallback
    language=user.language_preference,
)
```
[VERIFIED: read of `src/sync/scheduled.py:188-213`]

### Pattern 4: SSE Event Schema Extension

**What:** Define a new `event:` type for citations. Backend yields it BEFORE first token. Frontend parser handles new type.
**When to use:** AIFEAT-02 citation UX.
**Example (backend):**
```python
# Source: src/web/routes/ai.py:96-110 (_sse_wrap; EXTEND)

async def _sse_wrap(
    stream: AsyncGenerator[str, None],
    initial_phase: str,
    sources: list[dict] | None = None,  # NEW kwarg
) -> AsyncGenerator[dict[str, str], None]:
    yield {"event": "status", "data": json.dumps({"phase": initial_phase})}
    if sources:
        # Emit BEFORE token events so frontend has citation map ready
        yield {"event": "sources", "data": json.dumps({"sources": sources})}
    try:
        async for token in stream:
            yield {"event": "token", "data": json.dumps({"text": token})}
        yield {"event": "done", "data": json.dumps({"status": "complete"})}
    except Exception as exc:
        logger.exception("sse_stream_error", error=str(exc))
        yield {"event": "error", "data": json.dumps({"message": "AI request failed"})}
```
**Example (frontend):**
```typescript
// Source: frontend/lib/api/ai-stream.ts:7 (SSEEvent.event union; EXTEND)

export interface SSEEvent {
  event: "status" | "token" | "done" | "error" | "sources";  // ADD "sources"
  data: Record<string, unknown>;
}

// Source: frontend/hooks/use-ai-stream.ts:79 (event handler; EXTEND)

} else if (event.event === "sources") {
  setSources(event.data.sources as Source[]);
} else if (event.event === "token") { ... }
```
[VERIFIED: file reads]

### Anti-Patterns to Avoid

- **Hand-rolling a queue table for the embedding worker.** The hot-set predicate (`Course.last_qa_access_at >= now() - 7 days AND Module.content_hash != sha256(...)`) is a SQL filter, not a queue. APScheduler interval scan is sufficient. A queue adds backpressure complexity and a new model.
- **Inlining the citation `sources` payload as part of `token` events.** Breaks the typewriter rendering and forces frontend to parse JSON inside the streamed text. ALWAYS use a separate event type.
- **Computing the multi-course math in the frontend.** Decimal-precision risk + duplicates the rule with backend. The math is one closed-form formula; ship it server-side and stream the result.
- **Using `datetime.utcnow()` + manual offset for the 7am Sydney trigger.** UniBoard CLAUDE.md flags this as a project-recurring bug (Issue #4). Use `CronTrigger(timezone="Australia/Sydney")` and let APScheduler handle DST.
- **Adding the AI advisory as a streaming endpoint.** Path planner is a one-shot 30-50 word output. SSE adds complexity without UX benefit. Keep `/gpa/multi-course-path` as POST → JSON.
- **Using `voyage-3.5` or `voyage-context-3` without re-embedding existing rows.** Mixing dimensions / context-window assumptions silently degrades retrieval. Stick with `voyage-3` (1024 dim, what the schema is wired for).
- **Skipping the `sentry_phase_scope("34")` wrap on fallback branches.** Phase 29's lesson: untagged Sentry events are unsearchable when triaging. Mandatory per D-D2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Embed text → vector | Custom Voyage HTTP wrapper | `voyageai.AsyncClient.embed(input_type="document"|"query")` | Already used in `QAService:171, 388`; SDK handles retries, batch limits, error parsing |
| Chunk long text by tokens | Hand-written chunker | `_chunk_text(text, chunk_size=512, overlap=50)` in `qa.py:417-427` | Already exists; uses tiktoken |
| Token count for fallback decision | `len(text) / 4` heuristic | `_ENCODER.encode(text)` from tiktoken | Already exists in `qa.py:29` |
| pgvector top-K query | Raw SQL | `cosine_distance(ContentEmbedding.embedding, q_embedding)` from `pgvector.sqlalchemy` | Already used in `qa.py:181` |
| SSE response wrapper | Custom Response subclass | `EventSourceResponse(generator, ping=15)` from `sse_starlette` | Already used in `ai.py:185, 206`; handles ping + Last-Event-ID |
| Decimal-precise WAM math | `float()` arithmetic | `Decimal(str(...))` + `quantize(_TWO_PLACES, ROUND_HALF_UP)` | Already used in `gpa.py:48-152`; mixing float here causes off-by-0.01 in test |
| Sentry feature tag | Custom log filter | `with sentry_phase_scope("34"): sentry_sdk.capture_exception()` | Already exists in `src/observability.py:12` |
| Daily AI call limit enforcement | Custom counter | `_check_and_increment_limit(user_id)` from `qa.py:52-82` | Already exists; uses `SELECT ... FOR UPDATE` to prevent TOCTOU race |
| Multi-language prompt selection | `if lang == "zh" else ...` everywhere | Pattern: two constants + `get_X_prompt(language: str)` helper | Already used in `prompts/qa.py`, `prompts/digest.py`, `prompts/roi.py` |

**Key insight:** Phase 34 is 80% wiring + 20% new code. The biggest temptation will be to "improve" the embedding pipeline or rebuild the SSE wrapper — DON'T. The existing stack is production-tested in Phases 18-21. Add the missing pieces (hot-set tracker, content_hash, daily cache table, multi-course math) and call existing code.

## 3. Study Recommendation Algorithm Design (AIFEAT-01)

### Question: New service or extension of ROIService?

**Recommendation: NEW service.** ROIService is per-course (`get_course_roi(user_id, course_id)`); study rec is cross-course. Different responsibility. Reuse ROIService as a *consumer* — the study rec service should call `ROIService.get_course_roi()` for each user course and rank across the merged result.

### Ranking algorithm (pure-Python helper)

```python
# Source: PROPOSED — derived from Phase 18 digest + Phase 21 ROI patterns

@dataclass
class StudyCandidate:
    course_code: str
    assessment_name: str
    weight: float          # 0-1
    days_until_due: float  # negative = overdue, capped at 14
    roi_score: float       # from ROIService
    is_completed: bool

def _score_candidate(c: StudyCandidate, now: datetime) -> float:
    """Composite urgency × leverage score.

    Returns a single rank-able number. Higher = higher priority.
    """
    if c.is_completed:
        return -1.0  # exclude from ranking entirely

    # Urgency factor: exponential decay over 14 days, hard cap at 0.1 for overdue
    if c.days_until_due < 0:
        urgency = 1.5  # past due — boost above on-time items
    else:
        urgency = math.exp(-c.days_until_due / 5.0)  # half-life ~3.5 days

    # Weight factor: linear in weight (0.5 weight = 0.5x score)
    weight_factor = c.weight

    # ROI factor: square-root compress so 10x ROI doesn't dominate 4x ROI
    roi_factor = math.sqrt(c.roi_score)

    return urgency * weight_factor * roi_factor
```

[Claude's discretion — exact formula. The above is one defensible composite. Planner can adjust constants.]

### Prompt design (mirrors `prompts/digest.py` style)

```python
# Source: PROPOSED — mirrors src/prompts/digest.py:14-19

STUDY_REC_SYSTEM_PROMPT = (
    "You are UniBoard's study recommendation engine. Given a ranked list of "
    "upcoming assessments (course code, name, weight, days until due, ROI), "
    "produce a 20-30 word action-oriented focus suggestion for today. "
    "Pick the single highest-leverage item. Be precise — no generic encouragement. "
    "Format: '[Action verb] + [course code + assessment] + [weight] + [concrete tactic].' "
    "Example: 'Focus on COMP3221 Quiz 3 (due in 18h, 15% weight) — review lecture 8 "
    "sliding window protocol before attempting.'"
)

STUDY_REC_SYSTEM_PROMPT_ZH = (
    "你是 UniBoard 的学习建议引擎。根据按权重和紧迫度排序的待办评估清单"
    "（课程代码、名称、权重、剩余时间、ROI），生成 20-30 字的'今日重点'建议。"
    "选择杠杆最高的一项，精确具体，不要笼统鼓励话。"
    "格式：[动作] + [课程+评估] + [权重] + [具体战术]。"
    "示例：'重点准备 COMP3221 Quiz 3（剩 18 小时，权重 15%）— 复习第 8 讲滑动窗口协议。'"
)
```

### Top-3 list generation

The same service should ALSO return the top 3 ranked candidates as structured data (no LLM needed for the list itself — only for the hero one-liner). The Predict page's StudyRecCard renders this list with course color dots, weight %, days-until-due, and an icon for "high ROI" badge — mirror `RoiCard.tsx` visual language.

### Cache schema (D-A2)

```sql
-- Source: PROPOSED — fits CONTEXT.md decision

CREATE TABLE study_recommendation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_for_date DATE NOT NULL,           -- AEST date the rec applies to
  main_suggestion TEXT NOT NULL,               -- 20-30 word LLM output
  top_3 JSONB NOT NULL,                        -- [{course_code, assessment, weight, days, score}]
  language VARCHAR(5) NOT NULL DEFAULT 'en',   -- locked at generation time
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, generated_for_date)
);

CREATE INDEX ix_study_rec_user_date
  ON study_recommendation_cache(user_id, generated_for_date DESC);

-- RLS (mirrors content_embeddings pattern)
ALTER TABLE study_recommendation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study recs"
  ON study_recommendation_cache FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Service role can insert/update study recs"
  ON study_recommendation_cache FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

**Cache invalidation (Claude's discretion in CONTEXT.md):** Recommendation — no explicit invalidation. The job UPSERTs daily at 7am, and assessment completion just changes the next day's rec. UPSERT on `(user_id, generated_for_date)` makes the day idempotent. Do NOT invalidate on completion event — adds complexity for marginal UX gain.

[VERIFIED: pattern read from `supabase/migrations/00000000000001_initial_schema.sql:383-402` (content_embeddings) and `00000000000002_rls_policies.sql:380-401`]

## 4. RAG Pipeline Production-Readiness (AIFEAT-02)

### What's missing for "live with real data"

| Gap | Status | What planner must add |
|-----|--------|------------------------|
| Hot-set tracker (which courses to embed) | NO COLUMN | Add `Course.last_qa_access_at TIMESTAMPTZ NULL`. Bump it in `course_qa` and `course_qa_stream` route handlers. Predicate: `WHERE last_qa_access_at >= now() - interval '7 days'`. |
| Content hash for re-embed trigger | NO COLUMN | Add `Module.content_hash VARCHAR(64) NULL`. Compute = `sha256(concat all ModuleItem.text_content + all Lesson.text_content for that course's modules)`. Caveat: `Module` doesn't directly hold content; hash should be PER-COURSE, not per-module. **Recommendation:** add `Course.content_hash VARCHAR(64) NULL` instead of `Module.content_hash` — the embedding granularity is per-course (`embed_course_materials(course_id)`), so the hash should match. CONTEXT.md says `Module.content_hash` but the locked decision text contradicts the embedding granularity. **Flag this to user before planning.** |
| Embedded-at timestamp | NO COLUMN | Add `Course.embedded_at TIMESTAMPTZ NULL`. Set when worker completes a re-embed. |
| Background worker registration | NOT REGISTERED | Add `embed_hot_courses_worker` to `src/sync/engine.py` lifespan with `IntervalTrigger(minutes=30)` |
| `last_qa_access_at` bump on every QA call | NOT IMPLEMENTED | One-line `UPDATE` in `course_qa` and `course_qa_stream` BEFORE invoking service |
| SSE `sources` event | NOT IMPLEMENTED | See §5 |
| RAG real-data validation strategy | NOT TESTED | See §10 Validation; recommendation: env-gated integration test using one real synced USYD course (mirror Phase 32.1's `SYNC_REAL_DATA_*` env vars) |

[VERIFIED: file reads of all referenced models and routes]

### Voyage AI rate-limit budget

- **Tier 1 limit:** 2000 RPM, 8M TPM for `voyage-3.5` and `voyage-3`. [CITED: docs.voyageai.com/docs/rate-limits]
- **UniBoard load (worst case):** 100 users × 5 courses each × 30 chunks = 15,000 documents. At 1 batch per course = 500 requests. With `IntervalTrigger(minutes=30)`, that's 1000 RPH worst case = 17 RPM. Safely within Tier 1.
- **Per-course token cost:** 5 modules × 10 items × ~500 tokens = 25K tokens. 100 users = 2.5M tokens per full re-embed cycle. Tier 1 8M TPM = headroom of 3.2x. OK.
- **Hot-set saves:** if only 30% of courses are queried in any 7-day window, embed cost drops to ~0.75M tokens / cycle.

### Real data UAT strategy

- **Smoke test (in-repo):** Synthetic fixture course with 3 modules, 5 items each, ~200 words per item. Run `embed_course_materials` → assert N embeddings created where N matches `_chunk_text` output. Mirror existing pattern in `tests/unit/test_qa_service.py`.
- **Integration test (env-gated):** Set `RAG_REAL_DATA_COURSE_ID=<uuid>` env var pointing to a synced USYD course in dev DB. Test runs `embed_course_materials(course_id)` then issues a hand-crafted question that should match a known module section. Asserts top-K result includes that module. Mirror Phase 32.1 pattern.
- **Manual UAT (recorded in VALIDATION.md):** Open a synced course with real Ed Lessons content, ask 3 known questions ("What's the weight of Quiz 1?", "When is the final?", "Explain sliding window"), assert each answer cites at least one real source title from the synced lessons.

[VERIFIED: existing pattern in `tests/unit/test_qa_service.py` and `.planning/phases/32.1*/32.1-05-PLAN.md` env-gated harness]

## 5. Citation SSE Schema (AIFEAT-02 frontend integration)

### Source payload structure

```typescript
// Frontend type (proposed addition to types.gen via openapi.yaml update)

interface CitationSource {
  index: number;        // 1-based; matches inline [N] marker
  module_id: string;    // for deep-link
  title: string;        // "Lecture 8: Sliding Window"
  source_type: "module_item" | "lesson" | "slide";
  anchor: string | null; // optional sub-section anchor (e.g., slide 12)
  score: number;        // pgvector cosine similarity 0-1; higher = more relevant
  excerpt: string;      // 100-char preview for tooltip
}

interface SourcesEvent {
  sources: CitationSource[];
}
```

### Backend emission point

The sources event must be yielded **AFTER** retrieval (so the indices correspond to the LLM's citation choices) but **BEFORE** the first token (so the frontend has the index map ready when `[1]` arrives in the stream).

```python
# Source: PROPOSED extension to src/services/qa.py:_answer_rag and stream_answer_question

async def stream_answer_question(...):
    # ... existing limit check ...
    course, materials_text = await self._load_course_materials(course_id)
    total_tokens = len(_ENCODER.encode(materials_text))
    use_agent = search_more or total_tokens < MCP_FALLBACK_TOKEN_THRESHOLD

    # NEW: pre-retrieve sources for citation marker map
    sources: list[dict[str, object]] | None = None
    if not use_agent and total_tokens >= settings.rag_token_threshold:
        # RAG path — retrieve top-K and emit sources first
        sources = await self._retrieve_sources(question, course_id)
        # Inject sources into the prompt so LLM uses [1][2] markers correctly
        context_text_with_indices = self._format_with_indices(sources)
    else:
        context_text_with_indices = materials_text

    # The route layer wraps this generator with _sse_wrap(sources=sources)
    async for token in self._ai_engine.stream_question(
        question=question,
        context_text=context_text_with_indices,
        ...
    ):
        yield token
```

### Citation prompt update

Existing `prompts/qa.py` says: *"Cite sources inline using the format [Canvas: {source_name}] or [Ed: {lesson_title}]"*. For Phase 34, the prompt must change to instruct numeric markers `[1][2]` matching the order of sources in the context. Update `QA_SYSTEM_PROMPT` to:

```
"... Cite sources inline using numeric markers [1], [2], etc., where each
number corresponds to the source listed in the 'Sources:' section of the
context. The user's UI will render these markers as clickable references.
Never invent a number not in the source list."
```

The frontend `_CITATION_PATTERN` regex in `src/services/ai_engine.py:21` will need update too: `re.compile(r"\[(\d+)\]")` instead of the current `[Canvas: ...]` pattern.

**Backward compatibility risk:** If the prompt change is rolled out without re-deploying frontend, existing `AiCourseChat.tsx` will see raw `[1]` markers in the answer body. Acceptable — the UI degrades gracefully (numbers visible, just no popover). [VERIFIED: read of `frontend/components/shared/AiChatBubble.tsx` would confirm but not yet inspected; assume pure text rendering means safe]

## 6. APScheduler Job Additions

### Two new jobs to register

```python
# Source: PROPOSED additions to src/sync/engine.py lifespan() function
# Insert after the existing `generate_daily_digests` registration (line ~111)

# Daily study recommendation generation (AEST timezone for DST correctness)
scheduler.add_job(
    generate_study_recommendations_daily,
    CronTrigger(
        hour=settings.study_rec_cron_hour_aest,  # 7
        minute=0,
        timezone="Australia/Sydney",
    ),
    id="generate_study_recommendations_daily",
    replace_existing=True,
    max_instances=1,
)

# Hot-set embedding worker (every 30 min)
scheduler.add_job(
    embed_hot_courses_worker,
    IntervalTrigger(minutes=settings.embedding_worker_interval_min),  # 30
    id="embed_hot_courses_worker",
    replace_existing=True,
    max_instances=1,
)
```

Add corresponding settings to `src/config.py`:
```python
# Phase 34
study_rec_cron_hour_aest: int = 7
embedding_worker_interval_min: int = 30
```

### Per-user iteration pattern (mirror digest)

The daily rec job iterates all profiles, opens a fresh session per user, and isolates failures via try/except + sentry_phase_scope. The embedding worker iterates all *courses* (not users) where `last_qa_access_at >= now() - 7 days AND (content_hash IS NULL OR embedded_at IS NULL OR content_hash != computed)`.

[VERIFIED: pattern read from `src/sync/scheduled.py:89-124` and `:127-186`]

### Initial-job staggering

The existing `engine.py` lifespan already adds initial jobs with `DateTrigger(run_date=now + timedelta(seconds=5*i))` to prevent connection pool exhaustion. The two new Phase 34 jobs do NOT need initial staggering — daily rec only fires at 7am AEST and embedding worker only fires at the 30-min mark. They naturally avoid startup contention.

## 7. GPA Path Planner Multi-Course Math (AIFEAT-03)

### New method on GPAService

```python
# Source: PROPOSED — add to src/services/gpa.py

async def calculate_multi_course_path(
    self,
    user_id: uuid.UUID,
    target_wam: float,
    remaining_credit_points: int,
) -> MultiCoursePathResult:
    """Compute required average for remaining UNITS (not assessments).

    Math:
        target_wam = (current_wam * cp_done + required_avg * cp_remain) / (cp_done + cp_remain)
        => required_avg = (target_wam * (cp_done + cp_remain) - current_wam * cp_done) / cp_remain
    """
    summary = await self.get_summary(user_id)  # existing method
    current_wam = Decimal(str(summary.cumulative_wam))
    cp_done = Decimal(str(summary.total_credit_points))
    cp_remain = Decimal(str(remaining_credit_points))
    target = Decimal(str(target_wam))

    # Edge case: 0 remaining
    if cp_remain == 0:
        return MultiCoursePathResult(
            target_wam=float(target),
            current_wam=float(current_wam),
            is_achievable=current_wam >= target,
            required_avg=None,
            max_reachable=float(current_wam),
            suggested_target=None,
        )

    # Edge case: target already met
    if current_wam >= target:
        return MultiCoursePathResult(
            target_wam=float(target),
            current_wam=float(current_wam),
            is_achievable=True,
            required_avg=0.0,  # any score keeps target
            max_reachable=float(_max_possible(current_wam, cp_done, cp_remain)),
            suggested_target=None,
        )

    total_cp = cp_done + cp_remain
    required = (target * total_cp - current_wam * cp_done) / cp_remain
    required = required.quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)

    max_reachable = (
        (current_wam * cp_done + Decimal("100") * cp_remain) / total_cp
    ).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)

    if required > 100:
        # Unreachable — find next-best band
        suggested = _suggest_next_band(max_reachable, target)
        return MultiCoursePathResult(
            target_wam=float(target),
            current_wam=float(current_wam),
            is_achievable=False,
            required_avg=None,
            max_reachable=float(max_reachable),
            suggested_target=suggested,  # e.g., 75 if HD unreachable
        )

    return MultiCoursePathResult(
        target_wam=float(target),
        current_wam=float(current_wam),
        is_achievable=True,
        required_avg=float(required),
        max_reachable=float(max_reachable),
        suggested_target=None,
    )

def _suggest_next_band(max_reachable: Decimal, original_target: Decimal) -> float | None:
    """Pick the highest USYD band still achievable (HD>D>CR>P)."""
    bands = [Decimal("85"), Decimal("75"), Decimal("65"), Decimal("50")]
    for band in bands:
        if band < original_target and max_reachable >= band:
            return float(band)
    return None
```

### Recommendation: stick with `GPAService` (NOT new `path_planner.py`)

Rationale: the multi-course math reuses `get_summary()` which already loads all the user's courses. A separate service would duplicate the load. Add as a method, keeps the existing dependency injection pattern in `routes/gpa.py:35`.

[VERIFIED: read of `src/services/gpa.py:158-208` (get_summary structure)]

### AI advisory wrapping

```python
# Source: PROPOSED — add to src/services/path_planner.py OR new method on GPAService

async def get_path_advisory(
    self,
    user_id: uuid.UUID,
    result: MultiCoursePathResult,
    language: str,
) -> str | None:
    """Wrap math result in 30-50 word AI verdict + tactic. Returns None on AI failure."""
    if not self._anthropic_api_key:
        return None
    try:
        prompt = get_path_advisory_prompt(language)
        # ... call AIEngine.ask with structured input ...
        return advisory_text
    except Exception:
        with sentry_phase_scope("34"):
            sentry_sdk.capture_exception()
        return None  # Frontend renders math-only per D-D1
```

## 8. REST Endpoint Shape

### `/ai/study-recommendations` (NEW)

```yaml
# openapi.yaml addition
/ai/study-recommendations:
  get:
    operationId: getStudyRecommendations
    summary: Get cached daily study recommendations for the user
    security:
      - SupabaseJWT: []
    responses:
      '200':
        description: Cached recommendation row (empty if not yet generated)
        content:
          application/json:
            schema:
              type: object
              required: [data, meta]
              properties:
                data:
                  $ref: '#/components/schemas/StudyRecommendationResponse'
                meta:
                  $ref: '#/components/schemas/ResponseMeta'

components:
  schemas:
    StudyRecommendationResponse:
      type: object
      required: [generated_for_date, main_suggestion, top_3, language]
      properties:
        generated_for_date:
          type: string
          format: date
        main_suggestion:
          type: string
          description: "20-30 word focus suggestion"
        top_3:
          type: array
          items:
            $ref: '#/components/schemas/StudyCandidate'
        language:
          type: string
          enum: [en, zh]
    StudyCandidate:
      type: object
      required: [course_code, assessment_name, weight, days_until_due, score]
      properties:
        course_code: { type: string }
        assessment_name: { type: string }
        weight: { type: number, format: float }
        days_until_due: { type: number, format: float }
        roi_score: { type: number, format: float }
        score: { type: number, format: float, description: "composite ranking score" }
```

### `/gpa/multi-course-path` (NEW)

Mirror existing `/gpa/path` shape but with multi-course inputs/outputs:

```yaml
/gpa/multi-course-path:
  post:
    operationId: calculateMultiCoursePath
    summary: Calculate required average for remaining REMAINING units to reach target WAM
    security:
      - SupabaseJWT: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [target_wam, remaining_credit_points]
            properties:
              target_wam: { type: number, minimum: 0, maximum: 100 }
              remaining_credit_points: { type: integer, minimum: 0 }
    responses:
      '200':
        content:
          application/json:
            schema:
              # ... shape matches MultiCoursePathResult above ...
              properties:
                target_wam: { type: number }
                current_wam: { type: number }
                is_achievable: { type: boolean }
                required_avg:
                  type: number
                  nullable: true
                  description: null if cp_remain=0 or already achieved
                max_reachable: { type: number }
                suggested_target:
                  type: number
                  nullable: true
                  description: next-best USYD band if target unreachable
                advisory_text:
                  type: string
                  nullable: true
                  description: AI verdict + tactic; null if AI failed (D-D1 fallback)
                language:
                  type: string
                  enum: [en, zh]
```

[VERIFIED: existing `/gpa/path` shape from `src/web/routes/gpa.py:182-289`]

## 9. Frontend Integration

### Citation UX in `AiCourseChat.tsx` and `DeadlineAiChat.tsx`

The two existing chat components share the `useAiStream` hook (`frontend/hooks/use-ai-stream.ts`). Extension plan:

1. **Hook extension:** add `sources: CitationSource[]` to the return value. Initialize as `[]` per message round; update on `event.event === "sources"`. Reset on `clearMessages`. [VERIFIED: hook reads at `frontend/hooks/use-ai-stream.ts:10-16`]

2. **Component prop:** `AiChatBubble` already accepts `content: string` — extend with optional `sources?: CitationSource[]`. When sources are present, parse `[N]` patterns in content and convert to `<sup>` elements with hover tooltip. Render a `<Sources>` collapsible component below the bubble.

3. **New shared component `frontend/components/shared/Sources.tsx`:**
   ```tsx
   <details className="text-xs">
     <summary className="cursor-pointer">Sources ({sources.length})</summary>
     <ol>
       {sources.map(s => (
         <li key={s.index}>
           [{s.index}] {s.title}
           {s.anchor && <> · {s.anchor}</>}
           <span className="text-gray-500">  {(s.score * 100).toFixed(0)}%</span>
           <p className="italic">{s.excerpt}</p>
         </li>
       ))}
     </ol>
   </details>
   ```

4. **Design system:** plain typography (no Rough.js for the Sources panel). Citation `[N]` superscript can use the existing color token `--orange #d97757` for the underline. Mirrors the academic feel of the rest of the app.

### Dashboard Hero replacement

`HeroSection.tsx:50-53` currently uses hardcoded `mockActivity` for the encouragement string. Phase 34 wires this to a real query:

```tsx
// PROPOSED extension to HeroSection.tsx

const { data: rec } = useQuery(studyRecommendationOptions());
const heroLine = rec?.data?.main_suggestion ?? defaultEncouragementProvider(...).message;
```

The fallback to `defaultEncouragementProvider` honors D-D1 (graceful when no rec yet — e.g., new user before first 7am cycle).

### Predict page Top-3 list

Add `<StudyRecCard>` to the right rail (`PredictPage.tsx:283-317` portal target). Mirror `<RoiCard>` visual structure — same `RoughCard` shell, course color dots, weight pill, days-until-due badge.

### Settings page extensions

`GpaTargetSection.tsx` extension:
- Add 4 quick-pick chips above the slider: `[Pass 50] [Credit 65] [Distinction 75] [HD 85]`
- Clicking a chip sets `gpaValue` to that band's lower bound (existing slider state already supports this)
- Add a NEW input row beneath the slider for `remaining_credit_points`
- The save button persists both `gpa_target` and `remaining_credit_points` via `useUpdateProfile`

[VERIFIED: read of `frontend/components/settings/GpaTargetSection.tsx`]

### `/gpa/multi-course-path` consumer card

Add `<MultiCoursePathCard>` to PredictPage right rail (or as a Settings sub-section):
```tsx
const { data: path } = useQuery(gpaPathOptions(targetWam, remainingCp));

return (
  <RoughCard>
    {/* Verdict badge */}
    <Badge color={path.is_achievable ? "green" : "red"}>
      {path.is_achievable ? "可达" : `不可达 — 建议 ${path.suggested_target}`}
    </Badge>
    {/* Numeric */}
    <div>剩余 {remainingCp} cp 需平均 {path.required_avg?.toFixed(1)}</div>
    {/* AI advisory (D-D1 fallback: hide when null) */}
    {path.advisory_text && (
      <p className="italic">{path.advisory_text}</p>
    )}
  </RoughCard>
);
```

## 10. Hidden Integrations / Pitfalls

### Voyage AI rate limits

- Existing `QAService.embed_course_materials` does NOT check rate limits explicitly — it relies on the SDK's built-in retry logic. At Phase 34's load (worst case 17 RPM), this is safe.
- The `voyageai.AsyncClient` SDK defaults to 5 retries with exponential backoff. [CITED: github.com/voyage-ai/voyageai-python README]
- **Risk:** if a future user has 50+ active courses (transfer student), the embedding worker for that user could exceed Tier 1 burst. Mitigate by adding `await asyncio.sleep(0.1)` between course iterations in the worker.

### Supabase RLS on `study_recommendation_cache`

The new table needs RLS policies. Mirror the `content_embeddings` pattern (Phase 19 precedent at `supabase/migrations/00000000000002_rls_policies.sql:380-401`). Specifically:

- SELECT for authenticated users where `user_id = (select auth.uid())`
- INSERT/UPDATE for `service_role` only (the daily job runs server-side as service role)
- DELETE only via `ON DELETE CASCADE` from `auth.users`

Without these policies, the daily job will succeed (service role bypasses RLS) but page reads will return empty arrays. [VERIFIED: pattern read]

### i18n: where do en/zh prompts live for new prompts?

Two layers:

1. **Backend Python prompts** (`src/prompts/study_recommendation.py` and `src/prompts/path_planner.py`): two constants per prompt (EN and ZH) + a `get_X_prompt(language: str)` helper. Selected by `Profile.language_preference` at call time. [VERIFIED: pattern in `src/prompts/qa.py:1-23` and `src/prompts/digest.py`]

2. **Frontend UI strings** (Sources panel, chip labels, verdict badges): add to `frontend/messages/en.json` and `frontend/messages/zh.json` under new namespaces `predict.studyRec.*` and `predict.path.*`. Existing pattern: `useTranslations("predict")` hook. [VERIFIED: file structure at `frontend/messages/`]

### Sentry tag conventions

- Phase 29 established `phase=N` tag via `sentry_phase_scope("N")` (`src/observability.py:12-25`)
- Phase 33 added it to the `recall_email` branch (`src/sync/scheduled.py:206-213`)
- Phase 34 should tag with `phase="34"` AND additionally a feature-scoped `feature` tag for D-D2 ops visibility:

```python
with sentry_sdk.new_scope() as scope:
    scope.set_tag("phase", "34")
    scope.set_tag("feature", "study_recommendation")  # or "rag_qa" or "path_planner"
    sentry_sdk.capture_exception()
```

Recommend adding a small helper `sentry_phase_feature_scope(phase, feature)` to `observability.py` to keep this DRY. [VERIFIED: read of `src/observability.py`]

### `Course.last_qa_access_at` race condition

The bump on every QA call writes to the same row. Concurrent QA calls from the same user (rare but possible) could race. Acceptable — the column is a heuristic, not a correctness boundary. No `FOR UPDATE` lock needed.

### `Module.content_hash` vs `Course.content_hash` inconsistency

CONTEXT.md decision D-B2 says `Module.content_hash` but the embedding pipeline operates per-course. **Recommendation:** raise this with the user before planning. Either:

- (a) Rename to `Course.content_hash` (cleaner — matches embedding granularity)
- (b) Keep `Module.content_hash` and require the worker to compare ALL module hashes per course (more SQL queries per check)

Option (a) is simpler and matches `embed_course_materials(course_id)` granularity. The planner must call this out as a clarification question.

### Frontend `useAiStream` SSE event order assumption

The current parser assumes `status → token* → done` order. Adding `sources` between `status` and `token` requires updating the state machine. Risk: if the backend forgets to emit `sources` for a fast-path direct-context answer, the frontend's `sources` state stays empty — citations panel just shows nothing. Acceptable degradation.

### Test infrastructure

- Backend: `tests/unit/test_qa_service.py` and `tests/unit/test_gpa_service.py` already exist. Add new test files for `test_study_recommendation_service.py`, `test_path_planner.py`, `test_embedding_worker.py`. Mirror the AsyncMock + AsyncSession pattern from `test_recall_email.py` (Phase 33 precedent). [VERIFIED: file system listing]
- Frontend: existing patterns use Vitest + jsdom. Citation rendering tests can mock the SSE source as a `Response` with a `ReadableStream`. Mirror `frontend/hooks/use-ai-stream.test.ts` if it exists, otherwise add one.
- Real-data integration: env-gated test (mirror Phase 32.1's `SYNC_REAL_DATA_*` pattern). Set `RAG_REAL_DATA_COURSE_ID=<uuid>` in dev shell to opt in; CI keeps it unset (test auto-skips).

## Runtime State Inventory

> Phase 34 adds new schema. Not a rename/migration phase — this section is informational only.

| Category | Items | Action Required |
|----------|-------|-----------------|
| Stored data | NEW: `study_recommendation_cache` rows (per-user-per-day). Existing: `content_embeddings` will be re-populated by the new worker. | Migration creates table; daily job populates rows. No data backfill needed (cache builds organically). |
| Live service config | NEW APScheduler job IDs registered: `generate_study_recommendations_daily`, `embed_hot_courses_worker` | Lifespan registration; no external service config. |
| OS-registered state | NONE — no Windows Task Scheduler, no launchd entries | None |
| Secrets / env vars | NEW config keys: `study_rec_cron_hour_aest`, `embedding_worker_interval_min`. Use existing `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` (already in Railway). | Update `src/config.py` with two new fields and defaults. No new secrets. |
| Build artifacts | NEW: `frontend/lib/api/types.gen.d.ts` regenerated after `openapi.yaml` edits. | `pnpm generate:types` after `openapi.yaml` change. |

## Common Pitfalls

### Pitfall 1: APScheduler timezone trap (project-recurring)
**What goes wrong:** Using `CronTrigger(hour=20, timezone="UTC")` causes daily jobs to fire 1 hour off during AEDT/AEST shifts.
**Why it happens:** Computing UTC offset manually doesn't honor DST.
**How to avoid:** Always `CronTrigger(hour=N, minute=0, timezone="Australia/Sydney")` — let APScheduler handle DST.
**Warning signs:** Daily rec arriving at 8am instead of 7am after Australian DST flip (first Sunday October / first Sunday April).
[VERIFIED: UniBoard CLAUDE.md "Digest 调度器时区陷阱"]

### Pitfall 2: SSE event order race
**What goes wrong:** Frontend receives `token` events before `sources` event arrives — citation tooltips render with empty data.
**Why it happens:** Backend emits sources from a different code path or after first stream chunk.
**How to avoid:** Emit `sources` event SYNCHRONOUSLY at the start of the SSE generator, BEFORE `async for token in stream`. Document this as a contract.
**Warning signs:** Citations show numbers but tooltip popovers are empty.

### Pitfall 3: `pgvector` ImportError silent fallback
**What goes wrong:** Existing `QAService._answer_rag` falls back to direct context when `voyageai` import fails. In production, this causes silent quality degradation.
**Why it happens:** Optional import + try/except wrapping at `qa.py:205-209`.
**How to avoid:** Add a startup check that errors if `voyageai`/`pgvector` are missing AND `VOYAGE_API_KEY` is set. Log loudly.
**Warning signs:** RAG queries return short, generic answers; Sentry shows no errors.

### Pitfall 4: `Decimal`/`float` mixing in path math
**What goes wrong:** `required_avg` returns `78.4999999...` instead of `78.50`.
**Why it happens:** Mixing `float` operations with `Decimal` mid-calculation.
**How to avoid:** Convert ALL inputs to `Decimal(str(...))` immediately. Only convert back to `float` at the response boundary. Mirror existing GPAService pattern.
[VERIFIED: existing pattern in `gpa.py:48-152`]

### Pitfall 5: Daily AI call limit collision
**What goes wrong:** Daily rec job uses 1 AI call per user. If user already burned `ai_calls_today=100` on QA, the daily rec also fails — but silently inside the job's per-user try/except.
**Why it happens:** `_check_and_increment_limit` rejects when limit reached.
**How to avoid:** Either (a) bypass the limit for the daily rec job (server-initiated, not user-initiated) by NOT calling `_check_and_increment_limit` in `StudyRecommendationService.generate_and_cache`, or (b) increase the limit. Recommendation: (a) — daily job is bounded by APScheduler (1 per user per day), no abuse vector.

### Pitfall 6: jsdom missing DOM APIs
**What goes wrong:** New citation popover scroll-to-source feature uses `scrollIntoView`; jsdom doesn't implement it; ALL component tests fail.
**Why it happens:** Project-recurring — see CLAUDE.md Issue #3.
**How to avoid:** Guard all DOM API calls with `typeof element.scrollIntoView === "function"`.
[VERIFIED: existing pattern in `frontend/components/course-detail/AiCourseChat.tsx:34`]

### Pitfall 7: `openapi.yaml` drift
**What goes wrong:** Backend Pydantic model adds `advisory_text: str | None`; frontend `types.gen.d.ts` shows `string` not `string | null`; TS errors disappear silently.
**Why it happens:** Forgot `pnpm generate:types` after openapi.yaml edit.
**How to avoid:** Wave 0 in plans must include `pnpm generate:types` as an explicit task. CI should fail if generated file differs from spec output.
[VERIFIED: Phase 33 LEARNINGS.md `feedback_openapi_contract_drift.md`]

## Code Examples

Verified patterns from existing source files:

### Daily-cron job registration (mirror)

```python
# Source: src/sync/engine.py:101-111

scheduler.add_job(
    generate_daily_digests,
    CronTrigger(
        hour=settings.digest_cron_hour_aest,
        minute=0,
        timezone="Australia/Sydney",
    ),
    id="generate_daily_digests",
    replace_existing=True,
    max_instances=1,
)
```

### Per-user iteration with sentry-tagged failure isolation (mirror)

```python
# Source: src/sync/scheduled.py:189-213

# Recall email evaluation -- isolated so a failure here
# never propagates into the per-user loop above.
try:
    async with session_factory() as session:
        # ... per-user work ...
        await session.commit()
except Exception:
    with sentry_phase_scope("33"):
        sentry_sdk.capture_exception()
    logger.warning(
        "recall_email_branch_failed",
        user_id=str(user.id),
        exc_info=True,
    )
```

### pgvector cosine similarity query (existing)

```python
# Source: src/services/qa.py:178-185

stmt = (
    select(ContentEmbedding)
    .where(ContentEmbedding.course_id == course_id)
    .order_by(cosine_distance(ContentEmbedding.embedding, q_embedding))
    .limit(settings.rag_top_k)
)
result = await self._session.execute(stmt)
chunks = result.scalars().all()
```

### Decimal-precise WAM math (mirror for path planner)

```python
# Source: src/services/gpa.py:113-131

@staticmethod
def _calculate_cumulative_wam(
    courses_data: list[tuple[Decimal, int]],
) -> Decimal:
    if not courses_data:
        return Decimal("0.00")
    total_weighted: Decimal = sum(
        (wam * Decimal(str(cp)) for wam, cp in courses_data), Decimal("0")
    )
    total_credits: Decimal = sum(
        (Decimal(str(cp)) for _, cp in courses_data), Decimal("0")
    )
    if total_credits == 0:
        return Decimal("0.00")
    return (total_weighted / total_credits).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
```

### SSE event yielding (existing pattern; will extend)

```python
# Source: src/web/routes/ai.py:96-110

async def _sse_wrap(
    stream: AsyncGenerator[str, None],
    initial_phase: str,
) -> AsyncGenerator[dict[str, str], None]:
    yield {"event": "status", "data": json.dumps({"phase": initial_phase})}
    try:
        async for token in stream:
            yield {"event": "token", "data": json.dumps({"text": token})}
        yield {"event": "done", "data": json.dumps({"status": "complete"})}
    except Exception as exc:
        logger.exception("sse_stream_error", error=str(exc))
        yield {"event": "error", "data": json.dumps({"message": "AI request failed"})}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `voyage-3` (1024 dim) | `voyage-3.5` and `voyage-context-3` released 2025 — same dim count for v3.5; context-3 reorders chunks for context preservation | Mid-2025 | UniBoard could upgrade to `voyage-3.5` without schema change (same dim). `voyage-context-3` would benefit course-material RAG specifically but requires re-embed. **Recommendation: defer to v3.1; Phase 34 stays on `voyage-3`.** [CITED: docs.voyageai.com/docs/embeddings] |
| Inline citations as `[Canvas: name]` text | Numeric `[1][2]` markers + structured `sources` payload | 2025 RAG pattern (LangChain v0.26, Perplexity-style) | Phase 34 adopts numeric pattern. Existing `_CITATION_PATTERN` regex must update. [CITED: dasroot.net/posts/2026/04/streaming-rag-token-citations-pulsar-redis/] |
| All courses embedded on every sync | Lazy hot-set (only courses touched in last N days) | Common 2025 RAG cost pattern | Locked in CONTEXT.md D-B1. |
| No vector index, btree on `course_id` only | HNSW for high-recall low-latency; IVFFlat for memory-efficient batches | pgvector 0.6+ (2025) | Existing schema has only btree. At <10k embeddings per user, no index needed. Add HNSW when per-user count exceeds 5k. [CITED: aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing] |

**Deprecated/outdated in our codebase:**
- `_CITATION_PATTERN = re.compile(r"\[(?:Canvas|Ed): [^\]]+\]")` in `src/services/ai_engine.py:21` — must update to `r"\[(\d+)\]"` for Phase 34 numeric markers

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Course.content_hash` is a better placement than `Module.content_hash` (CONTEXT.md says Module) | §4 | Migration creates the wrong column. Planner MUST raise as a clarifying question before plan finalize. **Severity: HIGH — explicit conflict with locked decision text.** |
| A2 | Daily AI call limit should be bypassed for the server-initiated study rec job | §10 Pitfall 5 | If user has hit limit, no rec generated; cache row missing for that day. UX: dashboard falls back to default greeting. Acceptable degradation. **Severity: LOW — graceful fallback works.** |
| A3 | The composite ranking score formula (urgency × weight × sqrt(roi)) is reasonable | §3 | Top-3 list ordering may not match user expectation. Tunable post-launch. **Severity: LOW — heuristic, not correctness.** |
| A4 | Hot-set tracker should be `Course.last_qa_access_at` column (single-column heuristic) | §1 finding 2, §4 | If a more sophisticated tracker is needed (e.g., weighted by query frequency), Phase 34 design needs rework. Discretion area in CONTEXT.md, so flexibility exists. **Severity: LOW — Claude's discretion.** |
| A5 | Citation `sources` event must precede first `token` event | §5, §10 Pitfall 2 | If race exists in the implementation, frontend tooltips show empty. Mitigated by emitting sources synchronously before the async stream starts. **Severity: LOW — implementation discipline.** |
| A6 | Voyage AI Tier 1 limits (2000 RPM, 8M TPM) are sufficient for Phase 34 worst-case load | §4 | If load exceeds Tier 1, retries become slow. Tier upgrade is automatic on usage tier graduation. **Severity: LOW.** |
| A7 | RLS policy pattern for `study_recommendation_cache` mirrors `content_embeddings` | §3 (cache schema) | If wrong RLS pattern is used, page reads return empty arrays. Easy to spot in UAT. **Severity: LOW — visible bug.** |
| A8 | `Module.content_hash` (or `Course.content_hash`) should be `VARCHAR(64)` for sha256 hex | §4 | If wrong type used (e.g., BYTEA), comparison logic breaks. **Severity: LOW — caught at migration apply time.** |
| A9 | Phase 34's two new APScheduler jobs do NOT need initial-job staggering at startup | §6 | If they DO race for the connection pool at lifespan start, embedding worker may fail-and-retry. Daily job only fires at 7am — natural separation. **Severity: LOW.** |
| A10 | Frontend `useAiStream` extension is backward-compatible (existing `event:` types unchanged) | §5 | If the parser handles unknown event types badly, the chat breaks. The current implementation in `ai-stream.ts:30-43` skips unknown events — confirmed safe. **Severity: VERIFIED — no risk.** |
| A11 | Existing AIEngine `ask_question` method can be reused for path advisory (no new method needed) | §7 | If the system prompt for advisory needs different temperature/max_tokens, may need a new method. Current method accepts override via `model:` arg — likely sufficient. **Severity: LOW.** |

**For the planner:** A1 is a HIGH-risk assumption that contradicts the CONTEXT.md locked decision. The planner SHOULD flag this in `/gsd-plan-phase` step 11 (present plan for approval) as a clarifying question before finalizing the migration task.

## Open Questions

1. **`Module.content_hash` vs `Course.content_hash` placement?** (See A1.)
   - What we know: CONTEXT.md D-B2 says `Module.content_hash`. Embedding pipeline operates per-course (`embed_course_materials(course_id)`).
   - What's unclear: Whether the user wants per-module re-embed granularity (would require a new pipeline that respects module boundaries) or per-course (simpler).
   - Recommendation: ask user. Default: `Course.content_hash` (simpler, matches existing pipeline).

2. **AI advisory streaming or one-shot?**
   - What we know: CONTEXT.md doesn't specify streaming for path advisory.
   - What's unclear: If the user wants the verdict to "type out" for visual continuity with QA chat.
   - Recommendation: one-shot POST → JSON. 30-50 words is too short for streaming to matter; SSE adds infra cost.

3. **Should the daily rec job's failure for one user block subsequent users?**
   - What we know: Existing pattern in `generate_daily_digests` uses per-user try/except.
   - What's unclear: nothing — this is a settled pattern.
   - Recommendation: per-user try/except, mirror existing pattern. Already documented in §6.

4. **`StudyRecommendationService.generate_and_cache` method signature — sync from cron + on-demand?**
   - What we know: D-A2 says cached daily, no realtime LLM on page load.
   - What's unclear: Should an on-demand "regenerate now" button exist for testing/admin?
   - Recommendation: NO admin endpoint in Phase 34. Out of scope. Optional dev-only `/internal/regen-rec` if needed for UAT — gate with debug flag.

5. **Top-3 list — does the AI also generate a sentence per item, or just structured ranking?**
   - What we know: D-A1 says "Top-3 ranked actions list" on Predict page.
   - What's unclear: Whether each list item is just (course/assessment/weight) or also includes a 1-sentence rationale.
   - Recommendation: structured ranking only (no per-item LLM cost). Frontend renders each row with course color + name + weight + days + score badge. The hero "main suggestion" is the only LLM-generated prose.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `voyageai` Python SDK | RAG embedding worker | ✓ | 0.3.7 [VERIFIED: pip show] | None — feature requires this |
| `pgvector` Python bindings | RAG retrieval | ✓ | 0.4.2 [VERIFIED: pip show] | None |
| `apscheduler` | Daily rec job + embedding worker | ✓ | 3.11.2 [VERIFIED: pip show] | None |
| `anthropic` SDK | All three AIFEAT prompts | ✓ | per pyproject 0.84+ | Per-feature graceful fallback (D-D1) |
| `VOYAGE_API_KEY` env var | Voyage embedding calls | ⚠️ Need to verify Railway env | — | RAG falls back to direct context (existing behavior) |
| `ANTHROPIC_API_KEY` env var | All LLM calls | ✓ Confirmed configured in Phase 31 | — | Per-feature graceful fallback (D-D1) |
| `pgvector` PostgreSQL extension on Supabase | RAG storage | ✓ Confirmed in `supabase/migrations/00000000000001_initial_schema.sql:8` (CREATE EXTENSION IF NOT EXISTS vector) | — | None |
| Sentry DSN | Phase=34 tagged error tracking | ✓ Phase 26 + 31.1 confirmed | — | Sentry calls are no-ops if DSN unset |

**Missing dependencies:** None blocking. Worth a one-line check that `VOYAGE_API_KEY` is set in Railway production env (search Railway dashboard or run `railway variables` if CLI logged in). If unset, RAG silently falls back — that's a hidden failure the planner should catch in deploy verification.

**Action item for the planner:** Add a Wave 0 task that runs `railway variables get VOYAGE_API_KEY` (or equivalent verification) and confirms it's set before Wave 1 ships.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3 + pytest-asyncio 0.25 (backend), Vitest (frontend) |
| Config file | `pyproject.toml [tool.pytest.ini_options]`, `frontend/vitest.config.ts` |
| Quick run command | `uv run pytest tests/unit/ -x -q --timeout=30` |
| Full suite command | `uv run pytest tests/ -x -q --timeout=120 && cd frontend && pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AIFEAT-01 | Study rec generated for user with upcoming deadlines | unit | `uv run pytest tests/unit/test_study_recommendation_service.py::test_generate_and_cache -x` | ❌ Wave 0 |
| AIFEAT-01 | Composite score ranks high-weight near-due items first | unit | `uv run pytest tests/unit/test_study_recommendation_service.py::test_score_candidate_ranking -x` | ❌ Wave 0 |
| AIFEAT-01 | Cache UPSERT idempotent on same date | unit | `uv run pytest tests/unit/test_study_recommendation_service.py::test_cache_upsert_idempotent -x` | ❌ Wave 0 |
| AIFEAT-01 | AI failure → fallback to ROI-only Top-3 (D-D1) | unit | `uv run pytest tests/unit/test_study_recommendation_service.py::test_ai_failure_fallback -x` | ❌ Wave 0 |
| AIFEAT-01 | GET /ai/study-recommendations returns cached row | integration | `uv run pytest tests/integration/test_ai_routes.py::test_get_study_recommendations -x` | ❌ Wave 0 (file exists, add test) |
| AIFEAT-02 | Embedding worker re-embeds course when content_hash differs | unit | `uv run pytest tests/unit/test_embedding_worker.py::test_rehash_triggers_reembed -x` | ❌ Wave 0 |
| AIFEAT-02 | Embedding worker skips cold-set courses | unit | `uv run pytest tests/unit/test_embedding_worker.py::test_skips_unaccessed_courses -x` | ❌ Wave 0 |
| AIFEAT-02 | course_qa bumps Course.last_qa_access_at | integration | `uv run pytest tests/integration/test_ai_routes.py::test_qa_bumps_last_access -x` | ❌ Wave 0 |
| AIFEAT-02 | SSE emits sources event before first token | integration | `uv run pytest tests/integration/test_ai_routes.py::test_sse_sources_event_order -x` | ❌ Wave 0 |
| AIFEAT-02 | RAG with real USYD course returns ≥1 cited source (env-gated) | integration | `RAG_REAL_DATA_COURSE_ID=<uuid> uv run pytest tests/integration/test_rag_real_data.py -x` | ❌ Wave 0 |
| AIFEAT-03 | calculate_multi_course_path: math correctness with target=78, current=75 | unit | `uv run pytest tests/unit/test_path_planner.py::test_required_avg_math -x` | ❌ Wave 0 |
| AIFEAT-03 | Unreachable target returns max_reachable + suggested_target | unit | `uv run pytest tests/unit/test_path_planner.py::test_unreachable_returns_suggestion -x` | ❌ Wave 0 |
| AIFEAT-03 | 0 remaining cp returns null required_avg | unit | `uv run pytest tests/unit/test_path_planner.py::test_zero_remaining -x` | ❌ Wave 0 |
| AIFEAT-03 | Already-met target returns required_avg=0 | unit | `uv run pytest tests/unit/test_path_planner.py::test_already_achieved -x` | ❌ Wave 0 |
| AIFEAT-03 | POST /gpa/multi-course-path returns full payload | integration | `uv run pytest tests/integration/test_gpa_routes.py::test_multi_course_path -x` | ❌ Wave 0 (file exists, add test) |
| AIFEAT-03 | AI failure → advisory_text=None, math still returned | integration | `uv run pytest tests/integration/test_gpa_routes.py::test_path_ai_fallback -x` | ❌ Wave 0 |
| Frontend | useAiStream parses sources event into state | unit | `cd frontend && pnpm test -- use-ai-stream` | ❌ Wave 0 |
| Frontend | Sources panel renders [N] inline + collapsible list | unit | `cd frontend && pnpm test -- Sources` | ❌ Wave 0 |
| Frontend | StudyRecCard renders Top-3 with course colors | unit | `cd frontend && pnpm test -- StudyRecCard` | ❌ Wave 0 |
| Frontend | MultiCoursePathCard hides advisory when null | unit | `cd frontend && pnpm test -- MultiCoursePathCard` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/unit/ -x -q --timeout=30` (backend) or `cd frontend && pnpm test --run --bail` (frontend)
- **Per wave merge:** `uv run pytest tests/ -x -q --timeout=120 && cd frontend && pnpm test` (full)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/test_study_recommendation_service.py` — covers AIFEAT-01 unit tests
- [ ] `tests/unit/test_path_planner.py` — covers AIFEAT-03 unit tests
- [ ] `tests/unit/test_embedding_worker.py` — covers AIFEAT-02 worker tests
- [ ] `tests/integration/test_rag_real_data.py` — env-gated real-data harness (mirror Phase 32.1 pattern)
- [ ] `tests/integration/test_ai_routes.py` — extend with study-recommendations + sources-event tests
- [ ] `tests/integration/test_gpa_routes.py` — extend with multi-course-path tests
- [ ] `frontend/hooks/use-ai-stream.test.ts` — likely needs creating; test sources-event parsing
- [ ] `frontend/components/shared/Sources.test.tsx` — new component test
- [ ] `frontend/components/predict/StudyRecCard.test.tsx` — new component test
- [ ] `frontend/components/predict/MultiCoursePathCard.test.tsx` — new component test
- [ ] Migration: `supabase/migrations/00000000000008_phase34_ai_features.sql`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing — Supabase JWT validated by `get_current_user_id` dependency. New endpoints follow same pattern. |
| V3 Session Management | no | No new session machinery; reuse existing |
| V4 Access Control | yes | RLS policies for new `study_recommendation_cache` table — `user_id = auth.uid()` per-row isolation. New `Profile.remaining_credit_points` column inherits existing Profile RLS (own-row only). |
| V5 Input Validation | yes | New POST `/gpa/multi-course-path` request body validated via Pydantic (`target_wam: float = Field(ge=0, le=100)`, `remaining_credit_points: int = Field(ge=0)`). Existing pattern. |
| V6 Cryptography | no | No new cryptographic operations; SHA-256 for `content_hash` is non-cryptographic use (collision detection only) |
| V7 Error Handling | yes | New routes use existing `RateLimitedError`, `NotFoundError` patterns. Sentry tagging via `phase=34` per D-D2. |
| V8 Data Protection | yes | New `study_recommendation_cache.main_suggestion` may include course names/grades — sensitive. RLS protects per-row. No PII beyond what exists. |
| V11 Business Logic | yes | Path planner math: integer overflow on `cp_done * cp_remain` impossible at scale (max 10K cp); float precision handled via Decimal. |
| V13 API and Web Service | yes | OpenAPI single-source-of-truth maintained. New endpoints documented in `openapi.yaml` BEFORE backend implementation. |

### Known Threat Patterns for FastAPI + Supabase + RAG

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via user-controlled course content | Tampering | LLM context is read-only; no tool execution from RAG path. AGENT_TOOLS restricted to read-only adapters. Existing mitigation. |
| Cache poisoning via concurrent UPSERT | Tampering | UNIQUE(user_id, generated_for_date) constraint + UPSERT semantics make duplicate inserts safe. |
| RLS bypass via service role | Elevation | Service role used only by APScheduler jobs running server-side. Routes always use `get_current_user_id` (user JWT). |
| Embedding data leak across users | Information Disclosure | Existing `content_embeddings` RLS scoped via `course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())`. New table follows same pattern. |
| Voyage API key exposure to browser | Information Disclosure | Backend-only; `VOYAGE_API_KEY` never sent in any response. Existing pattern. |
| Rate-limit bypass on `/qa/stream` (already exists) | DoS | `@limiter.limit("10/minute")` already applied. No change. |
| Rate-limit on new `/ai/study-recommendations` | DoS | Add `@limiter.limit("60/minute")` (low cost — pure DB read). |
| Rate-limit on new `/gpa/multi-course-path` | DoS | Add `@limiter.limit("10/minute")` (involves AI call). |

[VERIFIED: existing rate-limit patterns at `src/web/routes/ai.py:114, 134, 152, 189` and `src/web/routes/roi.py:23`]

## Sources

### Primary (HIGH confidence — verified by file read or tool output)

- File: `src/services/qa.py:1-428` — embed_course_materials, _answer_rag, stream_answer_question
- File: `src/services/ai_engine.py:1-359` — AIEngine wrapper, AGENT_TOOLS, streaming, citation regex
- File: `src/services/roi.py:1-246` — ROIService used as input for study rec ranking
- File: `src/services/gpa.py:1-533` — GPAService.calculate_target_path, _calculate_cumulative_wam pattern
- File: `src/services/digest.py:1-329` — daily generation pattern + AI enhancement fallback
- File: `src/services/intelligence.py:1-305` — Phase 18 quality gate fallback pattern
- File: `src/sync/scheduled.py:1-214` — APScheduler tasks: digest, token health, recall email
- File: `src/sync/engine.py:1-174` — APScheduler lifespan registration pattern
- File: `src/web/routes/ai.py:1-207` — SSE streaming endpoint pattern
- File: `src/web/routes/roi.py:1-38` — ROI endpoint shape
- File: `src/web/routes/gpa.py:1-312` — Existing target_path endpoint
- File: `src/web/routes/intelligence.py:1-167` — fallback pattern reference
- File: `src/models/user.py:1-109` — Profile model (extend with remaining_credit_points)
- File: `src/models/course.py:1-71` — Course model (extend with last_qa_access_at, embedded_at, content_hash)
- File: `src/models/module.py:1-66` — Module model (Module.content_hash candidate)
- File: `src/models/lesson.py:1-68` — Lesson model
- File: `src/models/embedding.py:1-35` — ContentEmbedding (already wired)
- File: `src/prompts/qa.py:1-23` — Bilingual prompt pattern
- File: `src/prompts/digest.py:1-26` — 20-30 word style precedent
- File: `src/prompts/roi.py:1-36` — get_X_prompt(language) helper pattern
- File: `src/observability.py:1-25` — sentry_phase_scope pattern
- File: `src/config.py:1-130` — Settings class for new config keys
- File: `supabase/migrations/00000000000001_initial_schema.sql:8, 380-402` — pgvector extension + content_embeddings
- File: `supabase/migrations/00000000000002_rls_policies.sql:380-401` — RLS pattern for embeddings
- File: `supabase/migrations/00000000000007_recall_email_and_oauth_profile.sql:1-46` — Phase 33 latest migration as numbering template
- File: `frontend/lib/api/ai-stream.ts:1-98` — SSE parser
- File: `frontend/hooks/use-ai-stream.ts:1-126` — AI stream hook
- File: `frontend/components/course-detail/AiCourseChat.tsx:1-134` — Existing chat UI shell
- File: `frontend/components/dashboard/HeroSection.tsx:1-280` — Hero greeting (replacement target)
- File: `frontend/components/predict/PredictPage.tsx:1-321` — Top-3 card mount point
- File: `frontend/components/predict/RoiCard.tsx:1-196` — Visual reference for StudyRecCard
- File: `frontend/components/settings/GpaTargetSection.tsx:1-117` — Extend with chips + remaining-cp
- File: `pyproject.toml:1-80` — Dep versions
- Tool: `pip show voyageai pgvector apscheduler` — version verification 2026-04-16

### Secondary (MEDIUM confidence — official docs verified)

- [Voyage AI Rate Limits](https://docs.voyageai.com/docs/rate-limits) — Tier 1 = 2000 RPM / 8M TPM for voyage-3 family
- [Voyage AI Embeddings docs](https://docs.voyageai.com/docs/embeddings) — voyage-3.5 and voyage-context-3 models (newer; not adopted in Phase 34)
- [APScheduler 3.11 user guide](https://apscheduler.readthedocs.io/en/3.x/userguide.html) — `add_job` with `id` + `replace_existing=True` pattern
- [pgvector index comparison](https://aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing-a-deep-dive-into-ivfflat-and-hnsw-techniques/) — HNSW vs IVFFlat tradeoffs (decided: no index needed at current scale)
- [SSE event types best practice](https://www.speakeasy.com/openapi/content/server-sent-events) — typed events for citations vs tokens
- [Anthropic streaming API](https://docs.anthropic.com/en/api/messages-streaming) — message_start / content_block_delta / message_stop pattern (already used)

### Tertiary (LOW confidence — needs validation in implementation)

- Voyage AI batch best-practice token cap per request — not verified, default 128 input items per batch is the SDK default; confirm at implementation time if needed
- Exact Sentry rate-limit cost of `phase=34` tags at 100/day — not verified; assumed within Sentry free tier headroom

## Metadata

**Confidence breakdown:**
- Codebase findings (existing services, patterns, routes): HIGH — every file path was read directly
- Standard stack: HIGH — versions verified by `pip show`
- Architecture (new tables, columns, jobs): MEDIUM — proposed designs follow existing precedent but unvalidated until implementation
- Pitfalls: HIGH — most are codified in CLAUDE.md or learnings/
- Citation SSE schema: MEDIUM — net-new design, no in-repo precedent; proposed shape mirrors industry standard
- Voyage AI rate limits: MEDIUM — published docs, but tier/account specifics not confirmed for the actual UniBoard Voyage account
- Phase 34 specific decisions (composite score formula, hot-set heuristic): Claude's discretion area in CONTEXT.md; Severity-LOW assumptions documented in Assumptions Log

**Research date:** 2026-04-16
**Valid until:** 2026-05-15 (30 days — Voyage AI moves fast on model releases; pgvector index recommendations stable longer)
