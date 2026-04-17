# Phase 34: AI Features Live - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Mode:** `--analyze --chain` (gray areas resolved with all 💡 recommended defaults accepted)

<domain>
## Phase Boundary

Take v3.0's three AI differentiation features from "infrastructure exists" to "live with real data, surfaced to users":

1. **AIFEAT-01 — AI Study Recommendations**: Build a `StudyRecommendationService` that produces a daily-cached "today's focus" suggestion + Top-3 ranked actions, weighted by assessment value, due proximity, and ROI difficulty (reuses Phase 21 ROIService). Surfaced on Dashboard hero (1 main) + Predict page (Top-3 list).

2. **AIFEAT-02 — Course Material QA Live with Real Data**: Wire RAG end-to-end with real Ed Lessons / Canvas modules content. Auto-trigger embedding after sync (lazy hot-set: only courses accessed in last 7 days). Hash-diff re-embed on content change. Cited-source UX with inline `[1][2]` + collapsible Sources list.

3. **AIFEAT-03 — GPA Path Planner (Multi-Course)**: New service layer above existing `GPAService.calculate_target_path()` that plans across REMAINING units (not just current semester's assessments). User inputs remaining credits/units in Settings; planner computes required average; AI wraps math result into 30-50 word actionable advice.

**Out of scope (explicit deferrals):**
- Push notifications for deadline reminders → Phase 35
- AI prompt A/B testing framework → backlog
- Mobile-specific UX → out of scope (desktop-first)
- USYD degree audit OCR/parsing → infeasible, fall back to user input
- 👍/👎 feedback on study recommendations → no objective ground truth (D3 decision)
- Per-feature F1 quality gates → reuse global Phase 18 gate; per-feature graceful fallback only

</domain>

<decisions>
## Implementation Decisions

### A — Study Recommendation Surface (AIFEAT-01)

- **D-A1:** Two surfaces: (a) Dashboard hero — replace/augment current greeting with 1 main "today's focus" suggestion; (b) Predict page — Top-3 ranked actions list. Same backing service, different presentations.
- **D-A2:** Daily cache (7am Australia/Sydney via APScheduler `CronTrigger`, mirroring existing digest scheduler). Result persisted to a new `study_recommendation_cache` table keyed by `(user_id, generated_for_date)`. Frontend reads cached row, no realtime LLM call on page load.
- **D-A3:** Inputs are 100% automatic — no user mood/time-budget controls. Signal set: upcoming deadlines (next 14 days), assessment weights, ROIService scores, completion status. Keeps cognitive load low and aligns with project's "stress-relief first, data second" philosophy.

### B — RAG Embedding Strategy (AIFEAT-02)

- **D-B1:** Lazy hot-set scope. Only embed courses where `Module.last_user_access_at >= now() - 7 days` (or fallback: course appears in last 7 days of `intelligence_query_logs` / `qa_query_logs`). Adds a `Course.embedded_at` timestamp + a touched-courses tracker (or repurposes existing `last_sync_at`).
- **D-B2:** Hash-diff triggers re-embed. Compute `sha256(module.content + lesson.content)` on each module sync; compare to `Module.content_hash` column (new). On mismatch → enqueue re-embed.
- **D-B3:** Citation UX = inline numeric superscript markers `[1][2]` interleaved in answer body + collapsible "Sources" panel below. Each source shows `module.title → lesson_section_anchor` + relevance score. Reuses existing `AiCourseChat.tsx` and `DeadlineAiChat.tsx` shells.
- **Implementation surface:** Background worker added to existing APScheduler (e.g., `embed_hot_courses_job`, every 30 min). Calls existing `QAService.embed_course_materials(course_id)`. Worker respects Voyage rate limits (existing pattern in adapters).

### C — GPA Path Planner (AIFEAT-03)

- **D-C1:** New Settings field: "剩余学分 / Remaining credits" (numeric input, optional "剩余科目数 / Remaining units" alternative). Stored on `Profile` model as new column `remaining_credit_points` (default null → user is prompted to fill on first Path Planner visit). USYD typical Bachelor = 144 cp, planner does NOT auto-infer; user input is canonical source.
- **D-C2:** Hybrid target picker UI. 4 quick-pick chips (Pass 50 / Credit 65 / Distinction 75 / HD 85) — clicking sets `Profile.gpa_target` to that band's lower bound. User can manually edit the numeric value to anywhere between 50 and 100 (existing behavior preserved). Reuses existing GpaTargetSection component.
- **D-C3:** When target unreachable, planner returns `{ achievable: false, max_reachable_wam: float, suggested_target: float }`. Frontend shows: "HD (85) is no longer reachable. Distinction (75) still possible — needs avg X." Avoids dead-end UX.
- **D-C4:** AI wraps math output into 30-50 word actionable line in user's `language_preference`. Format: `[Verdict] + [Required avg] + [Concrete tactic referencing high-weight remaining unit type]`. Example: "可达 — 剩余 8 门平均需 78 分。Advanced units 权重最大，优先抓 3000-level capstone 的 group project。" Falls back to math-only on AI failure (per D-D1).

### D — Quality Gate & Fallback (Cross-cutting)

- **D-D1:** Per-feature graceful fallback (not global F1 gate for new features):
  - **Study recommendations** → AI unavailable → render Top-3 ROI ranking only (no AI prose), keep card visible.
  - **Course QA** → embedding/AI fail → keyword search across `module.title + module.content` (lucene-style ILIKE), no citations, banner-less.
  - **Path Planner** → AI fail → render math-only result, no advisory paragraph.
  - Phase 18's global F1 gate (Ed Discussion thread eval) remains unchanged.
- **D-D2:** Silent fallback. No "currently using rule engine" UI banner. Users see degraded but coherent output. Logged to Sentry with `feature` tag for ops visibility.
- **D-D3:** No 👍/👎 feedback button on study recommendations. Reason: there is no objective ground truth signal (study advice quality is subjective and lossy). Saves UI clutter; reduces feedback button proliferation. Phase 18 feedback buttons on Ed Discussion threads remain unchanged.

### Folded Todos

None — no matching todos in todo store (cross_reference_todos returned empty).

### Claude's Discretion

- Exact prompt wording for study recommendation generator (must follow Phase 18 "precise 20-30 word study guidance" rule)
- Cache table schema details (TTL strategy, eviction policy)
- Hot-set tracker implementation: dedicated table vs reusing `last_sync_at` heuristic
- Worker queue mechanism for embedding (in-DB queue vs APScheduler list scan)
- Frontend component structure (whether to extract a shared `RecommendationCard` or inline per page)
- i18n key naming for new strings
- Error retry policies on Voyage API (reuse existing adapter retry config)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 34 — Requirements & Roadmap
- `.planning/ROADMAP.md` §"Phase 34: AI Features Live" — three success criteria
- `.planning/REQUIREMENTS.md` — AIFEAT-01, AIFEAT-02, AIFEAT-03 acceptance bullets
- `docs/UniBoard_BRD_v2.md` — AIFEAT requirements business context
- `docs/UniBoard_TRD_v2.md` §6 — AI / prompt engineering specifications, quality gate F1 threshold
- `docs/UniBoard_TRD_v2.md` §12 — REST API specifications (intelligence + AI endpoints pattern)
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture

### Existing AI infrastructure (DO NOT rewrite — extend)
- `src/services/ai_engine.py` — AIEngine: Claude wrapper, agent_stream, AGENT_TOOLS — reuse for study rec generator + path advisor
- `src/services/qa.py` — QAService: `embed_course_materials()`, `_answer_rag()`, `stream_answer_question()` — auto-trigger from new background worker
- `src/services/roi.py` — ROIService: `_score_to_difficulty()`, ROI ranking — feed into study recommendation scoring
- `src/services/gpa.py` — GPAService: `calculate_target_path()` (per-assessment, single-course) — wrap with multi-course planner above
- `src/services/intelligence.py` — Quality gate fallback pattern reference
- `src/services/digest.py` — APScheduler daily-job pattern reference for D-A2
- `src/sync/scheduled.py` — Existing APScheduler hooks (extend for D-A2 daily 7am cache + D-B embedding worker)
- `src/web/routes/ai.py` — SSE streaming endpoint pattern (reuse for path planner streaming if needed)
- `src/web/routes/roi.py` — Existing ROI endpoint contract (study rec endpoint mirrors shape)
- `src/web/routes/gpa.py` — Existing target_path endpoint (multi-course planner adds new endpoint)
- `src/prompts/qa.py` — QA prompt with i18n variants
- `src/prompts/roi.py` — ROI difficulty inference prompts
- `src/prompts/digest.py` — Urgency scoring prompt template (reuse style for study rec)

### Data models (extension surfaces)
- `src/models/user.py` — `Profile`: add `remaining_credit_points` (D-C1), `study_recommendation_generated_at` if cached on profile (or new table)
- `src/models/module.py` — `Module`: add `content_hash` column (D-B2), `embedded_at` already exists or add
- `src/models/course.py` — `Course`: add `last_qa_access_at` for hot-set tracker (D-B1) OR repurpose `last_sync_at`
- `src/models/embedding.py` — `ContentEmbedding` (already wired to pgvector)
- New schema candidate: `study_recommendation_cache(user_id, generated_for_date, main_suggestion, top_3_jsonb, created_at)`

### Frontend (integration points)
- `frontend/components/dashboard/DashboardPage.tsx` — Hero area edit for D-A1 main suggestion
- `frontend/components/dashboard/HeroSection.tsx` — Existing hero component (modify or wrap)
- `frontend/components/predict/PredictPage.tsx` — Top-3 list location (D-A1)
- `frontend/components/predict/RoiCard.tsx` — Existing ROI card (Top-3 list lives near or replaces section)
- `frontend/components/predict/RequiredScoresCard.tsx` + `TargetWamCard.tsx` — Path planner extends/replaces these
- `frontend/components/settings/GpaTargetSection.tsx` — Add remaining-credits input + 4-band quick-pick chips (D-C1, D-C2)
- `frontend/components/course-detail/AiCourseChat.tsx` — Citation UX [1][2] + Sources panel (D-B3)
- `frontend/components/deadlines/DeadlineAiChat.tsx` — Same citation UX
- `frontend/lib/api/types.gen.d.ts` — Regenerate after backend OpenAPI updates
- `frontend/i18n/locales/{en,zh}/*.json` — New i18n keys for path planner verdict, citations panel, settings field

### Prior phase context (decisions to align with)
- `.planning/phases/18-ai-enhancement/18-CONTEXT.md` — Quality gate philosophy, AI text style ("precise 20-30 word"), bilingual prompt pattern
- `.planning/phases/19-mcp-agent-streaming/19-CONTEXT.md` — SSE streaming patterns, hybrid DB+MCP fallback, language_preference flow
- `.planning/phases/21-mcp-server-roi-analysis/21-CONTEXT.md` — ROI formula, difficulty estimation, predict page integration
- `.planning/phases/33-token-lifecycle-onboarding/33-CONTEXT.md` — APScheduler integration pattern, Sentry tagging convention

### External docs (planner research targets)
- Voyage AI embedding rate limits + batch best practices
- Anthropic Claude streaming + tool_use patterns (already in use)
- pgvector cosine_distance index tuning
- APScheduler `CronTrigger(timezone='Australia/Sydney')` (existing pattern, see digest scheduler)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AIEngine** (`src/services/ai_engine.py`): Full Claude wrapper with streaming + agent tools — direct reuse for study rec generator and path advisor. No new LLM client needed.
- **QAService.embed_course_materials()** (`src/services/qa.py:358`): Existing batch embedding pipeline (Voyage AI + chunking + pgvector insert) — background worker just needs to call this on hot-set courses.
- **ROIService** (`src/services/roi.py`): Difficulty estimation (historical + AI fallback) + ROI ranking — feeds study recommendation scoring; no recompute.
- **GPAService.calculate_target_path()** (`src/services/gpa.py:354`): Per-assessment target math — multi-course planner wraps this conceptually but operates at unit/credit level.
- **DigestService daily job pattern** (`src/services/digest.py` + APScheduler): Template for D-A2 daily 7am cache.
- **Quality gate fallback pattern** (`src/web/routes/intelligence.py`): `if ai_engine is None: fallback_to_rule_based()` — apply same shape per D-D1.
- **AiCourseChat / DeadlineAiChat shells** (`frontend/components/course-detail/`, `frontend/components/deadlines/`): Existing chat UI — citation UX bolts onto answer rendering.
- **GpaTargetSection** (`frontend/components/settings/`): Existing target input — add remaining-credits field + 4-band chips.

### Established Patterns
- **Service injection**: FastAPI `Depends()` → service constructor with session
- **Daily AI limit enforcement**: `Profile.ai_calls_today` increment/check (already in QAService, ROIService, IntelligenceService)
- **APScheduler timezone discipline**: `CronTrigger(hour=7, minute=0, timezone='Australia/Sydney')` (per CLAUDE.md "项目特有踩坑记录" — never compute UTC manually)
- **i18n bilingual prompts**: Two prompt files (en/zh) selected by `Profile.language_preference`
- **Pure-function gating**: `should_send_*` helpers + injected `now: datetime | None = None` for freezegun-free tests (Phase 33 pattern)
- **Sentry phase/feature tagging**: New code paths must instrument errors with `phase=34` or feature-scoped tag (Phase 29/33 pattern)
- **OpenAPI single source of truth**: `openapi.yaml` → regenerate `types.gen.d.ts` via `pnpm generate:types`, never hand-edit (Phase 33-03)

### Integration Points
- **APScheduler**: Add 2 jobs — `generate_study_recommendations_daily` (7am Sydney), `embed_hot_courses_worker` (every 30 min).
- **QAService → frontend**: Extend SSE response to carry `sources: [{module_id, title, anchor, score}]` payload (currently text-only stream).
- **GPAService → new MultiCoursePathService**: New service in `src/services/path_planner.py` (or extend GPAService); calls existing `_calculate_cumulative_wam()`.
- **Profile model**: Add `remaining_credit_points: int | None`. Migration adds nullable column with comment.
- **Module model**: Add `content_hash: str | None` for re-embed trigger.
- **Predict page → DashboardPage**: Both consume same `GET /ai/study-recommendations` endpoint, render different slices (1 vs Top-3).

</code_context>

<specifics>
## Specific Ideas

- **"Stress-relief first, data second"** (PROJECT.md hero design): Study recommendation main suggestion replaces the dashboard greeting line — same restful tone, but action-oriented. Not a new card competing with hero.
- **Citation UX reference**: Perplexity-style inline `[1][2]` superscripts work well visually; collapsible Sources panel keeps the answer readable. Frontend already has `withClientOnly` patterns for client-only rendering needed here.
- **Path planner verdict format**: Borrow Phase 18 digest urgency color scheme — green "可达 / Reachable", amber "勉强 / Tight", red "不可达 / Out of reach (suggesting [next-best])".
- **Hot-set rationale**: Voyage AI charges per token; embedding all 13+ courses on every sync would multiply cost ~10x for courses the user never queries. 7-day window is heuristic — adjust if telemetry shows misses.
- **No A/B framework yet**: Phase 18 deferred this to backlog — Phase 34 also defers. Single-prompt iteration loop is fine for solo-dev product.
- **Daily cache invalidation triggers** (Claude's discretion to detail in plan): user marks an assessment complete → invalidate today's cache and regenerate; or wait until next 7am cycle. Recommendation: invalidate on completion to keep recs accurate.

</specifics>

<deferred>
## Deferred Ideas

- **Push notifications for deadline reminders** → Phase 35 (already on roadmap)
- **AI prompt A/B testing framework** → backlog (deferred since Phase 18)
- **Per-course F1 quality gates** → backlog (deferred since Phase 18)
- **USYD degree audit auto-import (OCR / API)** → infeasible; user input is canonical
- **👍/👎 feedback on study recommendations** → no ground truth (D3); Phase 18 thread feedback unchanged
- **Mood / available-study-time inputs** (A3 alternatives) → out of scope; revisit if user telemetry shows recommendations feel off
- **"Currently using rule engine" UI banner** (D2 alternative) → out of scope; silent fallback chosen
- **Cross-semester trend visualization** for path planner → future enhancement (Phase 36 UX Polish or v4.0)

</deferred>

---

*Phase: 34-ai-features-live*
*Context gathered: 2026-04-16*
