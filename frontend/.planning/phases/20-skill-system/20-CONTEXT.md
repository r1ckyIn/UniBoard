# Phase 20: Skill System - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a runtime skill system that auto-generates and reuses MCP Agent workflow templates. A "skill" captures the optimal tool call sequence, system prompt, and course-specific parameters from successful AI interactions — so subsequent requests skip exploration and run the cached workflow directly.

**Also in scope:** Connect the `_execute_tool` placeholder (qa.py:256) to real adapters (Canvas, Ed Discussion, Ed Lessons), completing the MCP Agent's tool execution pipeline.

</domain>

<decisions>
## Implementation Decisions

### Storage & Model
- **D-01:** PostgreSQL `skills` table with JSONB columns for `workflow_steps`, `tool_sequence`, and `parameters`. Follows existing ORM pattern (UUIDMixin + TimestampMixin + Base). Alembic migration required.
- **D-02:** Key columns: `operation_type` (enum string for matching), `course_id` (FK nullable — NULL=global, set=per-course), `system_prompt` (text), `is_seeded` (bool), `version` (int), `success_count`/`failure_count` (int), `last_used_at` (datetime nullable).
- **D-03:** Category taxonomy mirrors existing `.claude/skills/` structure: `data_collection`, `data_processing`, `ai_analysis`, `user_action`.

### Skill Granularity
- **D-04:** A skill = a complete multi-step workflow (inspired by `/check-deadlines` pattern). Includes: tool call sequence with parameter templates, system prompt, course-specific parameters, output format specification.

### Matching & Selection
- **D-05:** Two-phase lookup: (1) exact match on `(operation_type, course_id)` → per-course skill, (2) fallback to `(operation_type, course_id=NULL)` → global skill, (3) no match → full exploration via `agent_stream()`.
- **D-06:** No embedding-based semantic matching — operation_type enum is sufficient for UniBoard's bounded domain (~50 operations).

### Auto-generation Trigger
- **D-07:** Trigger after `agent_stream()` completes with: stop_reason="end_turn" AND 2+ tool_use calls AND response contains citations. Captures tool call names, input patterns, effective prompt.
- **D-08:** Quality gate: compatible with Phase 18 F1 monitoring. Skills auto-generated from low-quality interactions (no citations, user retry) are marked `is_active=False`.
- **D-09:** Dedup: if `(operation_type, course_id)` already exists, increment `version` and update rather than create duplicate.

### Pre-seeded vs Emergent
- **D-10:** Hybrid approach. Pre-seed ~10-15 core skills from existing `src/prompts/*.py` (thread_eval, qa_direct, qa_rag, unit_review, digest_scoring, risk_analysis, translation) + 3-5 workflow skills from `/check-deadlines` pattern (deadline_check, course_overview, assessment_analysis). Auto-generation fills to ~50 over time.

### Course-Specific Quirks
- **D-11:** Hybrid discovery: auto-detect course characteristics during first sync (no due_at, no Ed Lessons, Ed category variance, module structure type), store in skill `parameters` JSONB. Users can override/supplement via Settings page.

### Student Visibility
- **D-12:** Skill system is backend-invisible. Students see faster responses but no skill metadata in UI. No frontend changes needed for this phase.

### Tool Execution (Core Integration)
- **D-13:** Connect `_execute_tool` stub in `qa.py:256` to real adapters via a `ToolExecutor` class that routes tool names to adapter methods:
  - `search_canvas_modules` → `CanvasAdapter.get_modules()` + text search filter
  - `search_ed_threads` → `EdDiscussionAdapter.get_threads()` + content filter
  - `get_ed_lesson_content` → `EdLessonsAdapter.get_lesson()` with slide text extraction
- **D-14:** `ToolExecutor` requires user's decrypted tokens + course context. Injected via the same `Depends()` DI pattern as other services.

### Skill Lifecycle
- **D-15:** Version column tracks evolution. `superseded_by` UUID points to newer version when updated. `is_active=False` for deprecated skills. `last_used_at` enables stale skill cleanup.

### Claude's Discretion
- Specific pre-seeded skill definitions (exact prompts, tool sequences) — researcher/planner can determine optimal configurations
- Migration seeding strategy (Alembic data migration vs app startup seeder)
- ToolExecutor error handling details (retry, fallback to direct context)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & API
- `docs/UniBoard_TRD_v2.md` §2 — MCP tool specifications (tool names, input schemas)
- `docs/UniBoard_TRD_v2.md` §6 — AI / prompt engineering (system prompts, model selection)
- `docs/UniBoard_TRD_v2.md` §12 — REST API spec (endpoint contracts)
- `docs/UniBoard_BRD_v2.md` — Business requirements (SKILL-01 through SKILL-04)

### Existing Code (must integrate with)
- `src/services/ai_engine.py` — AIEngine class, `AGENT_TOOLS` list, `agent_stream()` method with tool_use loop
- `src/services/qa.py:256` — `_execute_tool` placeholder marked "full adapter integration in Phase 20"
- `src/prompts/` — All 6 existing prompt files (qa.py, review.py, thread_eval.py, digest.py, translation.py, risk_analysis.py)
- `src/models/base.py` — UUIDMixin, TimestampMixin, Base patterns
- `src/models/ai_feedback.py` — AIFeedback + AIQualityMetrics (quality gate integration)

### Adapters (tool execution targets)
- `src/adapters/canvas.py` — CanvasAdapter (7 endpoints, rate limiter, circuit breaker)
- `src/adapters/ed_discussion.py` — EdDiscussionAdapter (graceful degradation pattern)
- `src/adapters/ed_lessons.py` — EdLessonsAdapter (field mapping from TRD §9.4)

### Proven Pattern
- `~/.claude/commands/check-deadlines.md` — Validated multi-step workflow skill (6-phase: collect→deep-read→cross-validate→update→verify→summarize). This is the reference implementation for runtime workflow skills.

### Existing Skill Documentation
- `.claude/skills/data-collection/SKILL.md` — Adapter patterns, endpoint reference, pitfalls
- `.claude/skills/ai-analysis/SKILL.md` — AI pipeline patterns, model selection, rate limiting
- `.claude/skills/data-processing/SKILL.md` — Dedup, GPA math, parsing patterns
- `.claude/skills/courses/SKILL.md` — Per-course differentiation patterns (Ed structure variance, Canvas module org, weight source hierarchy)
- `.claude/skills/user-actions/SKILL.md` — API response patterns, DI patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AIEngine.agent_stream()` — Already implements tool_use loop with max 5 iterations. Skill system wraps this with pre-loaded tool sequence.
- `src/prompts/*.py` — 6 prompt files with bilingual support (`get_*_prompt(language)` pattern). Convert to seeded skills.
- `src/models/base.py` — UUIDMixin + TimestampMixin ready for new Skill model.
- `QAService._check_and_increment_limit()` — Rate limiting pattern reusable for skill-based calls.
- `CircuitBreaker` + `CanvasRateLimiter` + `RetryConfig` — Resilience patterns for ToolExecutor.

### Established Patterns
- **JSONB for flexible data:** Not yet used in existing models, but PostgreSQL + SQLAlchemy 2.0 fully supports it. Use `mapped_column(JSON)`.
- **Service DI:** `Depends(get_xxx_service)` factory pattern in `src/web/deps.py`. ToolExecutor and SkillService follow same pattern.
- **Per-item error handling:** Adapters use try/except per item, never crash batch. ToolExecutor should follow same pattern.
- **Bilingual prompts:** All existing prompts have EN + ZH variants. Pre-seeded skills inherit this.

### Integration Points
- **ToolExecutor → Adapters:** New class routes tool names to adapter methods. Needs user tokens from `Profile.canvas_token_encrypted` / `Profile.ed_token_encrypted`.
- **SkillService → AIEngine:** Loads skill before calling `agent_stream()`, injects optimized prompt + pre-ordered tool list.
- **SkillService → QAService:** Replace `_execute_tool` stub with real ToolExecutor.
- **Auto-generation hook:** After `agent_stream()` returns, SkillService captures successful workflow.
- **Quality gate integration:** AIQualityMetrics F1 score affects skill `is_active` status.

</code_context>

<specifics>
## Specific Ideas

### `/check-deadlines` as Reference Architecture
The user's Claude Code command `~/.claude/commands/check-deadlines.md` is the gold standard for what a runtime skill should look like:
- **6-phase workflow:** data collection (parallel) → deep content read → cross-validation → dashboard update → verification → summary
- **Course-specific data:** Canvas IDs, Ed IDs, known quirks (COMP3221 no due_at), semester week structure
- **Multi-source confidence:** ✅ confirmed (2+ sources) / 🟡 possible (1 source) / ❓ uncertain
- **Structured output:** Obsidian-formatted dashboard with sections, callouts, tables

The runtime equivalent: pre-seeded `deadline_check` skill that orchestrates adapters to produce structured deadline data with cross-validation confidence levels.

### Existing Prompt → Skill Migration Path
Current `src/prompts/*.py` files become the `system_prompt` field of seeded skills. The `tool_sequence` and `workflow_steps` fields add the orchestration layer that pure prompts lack.

</specifics>

<deferred>
## Deferred Ideas

- **Skill marketplace/sharing** — Let students share effective skills across courses (belongs in v2+)
- **Skill analytics dashboard** — Admin view of skill usage, success rates, auto-generation activity (belongs in M4: Operations)

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 20-skill-system*
*Context gathered: 2026-03-29*
