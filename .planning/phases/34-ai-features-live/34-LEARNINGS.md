---
phase: 34
phase_name: "ai-features-live"
project: "UniBoard"
generated: "2026-04-17T07:50:00Z"
counts:
  decisions: 8
  lessons: 9
  patterns: 6
  surprises: 5
missing_artifacts: []
---

# Phase 34 Learnings: ai-features-live

## Decisions

### D-A1: Split study recommendations across two UI surfaces
Dashboard hero renders the single "today's focus" main_suggestion; Predict page right rail renders the Top-3 ranked list. Same backing `StudyRecommendationService`, different presentations.

**Rationale:** Hero needs a one-line anchor; Predict page has room for drill-down. Shared service avoids double-LLM cost.
**Source:** 34-CONTEXT.md §Implementation Decisions D-A1

### D-A2: Daily-cached recommendation (no realtime LLM on page load)
`study_recommendation_cache` table with `UNIQUE(user_id, generated_for_date)`. APScheduler cron at 7am Australia/Sydney UPSERTs per user; frontend reads the cached row.

**Rationale:** Budget-conscious (avoids 1 LLM call per dashboard visit). User's focus is static over a day anyway.
**Source:** 34-CONTEXT.md D-A2; 34-02-PLAN.md

### D-B1: Lazy hot-set scope for embeddings
Worker only embeds courses where `courses.last_qa_access_at >= now() - 7d`. `/qa` routes bump the timestamp before the LLM call.

**Rationale:** Embedding every course on every sync burns Voyage quota on courses the user never asks about.
**Source:** 34-CONTEXT.md D-B1; 34-04-SUMMARY.md

### D-B2 deviation: content_hash stored on Course, not Module
Plan originally specified `Module.content_hash` — executor kept it on `courses` table because the embedding pipeline (`QAService.embed_course_materials(course_id)`) operates per-course.

**Rationale:** Hash granularity must match invalidation granularity. Approved during 34-01 migration.
**Source:** 34-01-SUMMARY.md; supabase/migrations/00000000000008 header comment

### D-C1: remaining_credit_points is canonical user input
USYD typical Bachelor = 144 cp, but the planner never auto-infers. User enters value in Settings; NULL triggers a first-visit prompt on Predict.

**Rationale:** Degree-audit OCR was ruled infeasible during discuss. User input is the only reliable source.
**Source:** 34-CONTEXT.md D-C1; 34-03-PLAN.md

### D-D1: 3-stage fallback chain for Dashboard hero
Stage 1 `main_suggestion` (AI prose) > Stage 2 ROI derivation from `top_3[0]` > Stage 3 `defaultEncouragementProvider` (static). RoughNotation highlight animation only engages on stage 3.

**Rationale:** "AI Features Live" can't degrade to a blank hero when the LLM fails or the cron misses.
**Source:** 34-CONTEXT.md D-D1; 34-05-SUMMARY.md

### Citation pattern switch: `[Platform: Name]` → numeric `[N]`
Phase 34 HI-01 fix rewrote `_CITATION_PATTERN` in `src/services/ai_engine.py` to `r"\[(\d+)\]"`. Numeric markers correlate 1:1 with `sources[N-1]` entries emitted by the SSE `sources` event.

**Rationale:** Frontend needs a stable map from inline marker → Sources panel row. Named citations couldn't be reliably parsed back to structured source metadata.
**Source:** 34-REVIEW.md §HI-01; commit d67a6db

### AsyncAnthropic inline pattern for custom-prompt AI calls
New services (`StudyRecommendationService`, `GPAService.get_path_advisory`) call `AsyncAnthropic` directly instead of `AIEngine.ask_question`, which hard-wires `QA_SYSTEM_PROMPT` and returns `QAResponse`.

**Rationale:** Extending `ask_question` with a `system_prompt` kwarg would ripple into every QA caller. Inlining mirrors `ROIService._ai_difficulty` (same decision made earlier for the same reason).
**Source:** 34-02-SUMMARY.md, 34-03-SUMMARY.md (both cite ROIService precedent)

---

## Lessons

### Plan-documented interfaces drift from reality
5 of 6 Phase 34 plans hit Rule 1/2 auto-fixes where the plan described a function signature, class name, or field that didn't match the actual codebase: `ROIResponse.assessments` (actual `.assignments`), `AIEngine.ask_question(system_prompt=...)` (no such kwarg), `GPASummary` (actual `GPASummaryResponse`), `ContentEmbedding.module_id` (only has `source_type`/`source_id`), `mypy` invariant `list[object]` (needed `Sequence[object]`).

**Context:** Planner writes the plan by inferring from adjacent code; without reading the exact target functions it fabricates plausible-but-wrong interfaces. Executor auto-fixes land correctly but cost 2-5 minutes per hit.
**Source:** 34-02-SUMMARY.md, 34-03-SUMMARY.md, 34-04-SUMMARY.md

### FastAPI `Depends()` cannot be intercepted by `unittest.mock.patch`
Plan 34-03 specified `patch("src.web.routes.gpa.get_gpa_service")` to substitute the GPA service in tests. FastAPI resolves `Depends` via its own dependency graph at request time — `patch()` replaces the module attribute but `Depends` holds the original reference. Correct mechanism: `app.dependency_overrides[get_gpa_service] = lambda: mock_svc`, or introduce a route-local helper (`_build_ai_gpa_service`) and patch that.

**Context:** Executor picked the route-local helper approach (matches `test_ai_routes.py::_build_qa_service` pattern used in 34-04).
**Source:** 34-03-SUMMARY.md §Deviations

### Vitest `include` filter applies to explicit CLI paths, not just discovery
`frontend/vitest.config.ts` has `include: ["__tests__/**/*.test.{ts,tsx}"]`. Running `pnpm vitest run <path outside __tests__/>` returns "No test files found" even with the explicit path. Plan 34-00 specified `frontend/hooks/use-ai-stream.test.ts` (next to the source); executor moved it to `frontend/__tests__/hooks/use-ai-stream.test.ts`.

**Context:** Fails silently (test file exists but never runs) — only the acceptance criterion "vitest exits 0" would have caught it.
**Source:** 34-00-SUMMARY.md §Deviations

### Changing `_CITATION_PATTERN` silently broke a pre-Phase-34 unit test
The HI-01 review fix updated `_CITATION_PATTERN` from the legacy named format to numeric. No search was done for existing callers/tests. `tests/unit/test_ai_engine.py::test_ask_question_returns_answer_with_citations` still asserted `[Canvas: Week 3 Lecture Notes]` in citations — surfaced only at CI after PR open.

**Context:** Fixed via `/gsd-quick` (commit e42cb73) by rewriting test to use `[1]`/`[2]` markers and asserting `"1"` / `"2"` in citations. Lesson: regex/schema contract changes need a grep-all-callers pass before commit.
**Source:** GH Actions run 24553758352; .planning/quick/2026-04-17-fix-test-ai-engine-citation-pattern/SUMMARY.md

### Frontend BFF proxy routes are a separate wiring layer that plans often miss
Plan 34-05 wired OpenAPI spec + `types.gen.d.ts` + hooks + components for new backend endpoints (`/ai/study-recommendations`, `/gpa/multi-course-path`), but never created the Next.js `app/api/v1/*/route.ts` files. Frontend `ky` client hits `/api/v1/...` (same-origin BFF proxy per Phase 30), so the endpoints returned 404 from the Next.js app despite being live on the backend. Gap surfaced only in browser UAT.

**Context:** Code review + gsd-verifier both missed this because they inspected backend Python + frontend components separately, not the proxy-routing contract between them.
**Source:** 34-HUMAN-UAT.md §Gaps; commit 6b40494

### `sentry_sdk.set_context` mutates global scope
Code review MD-02: `embed_hot_courses_worker` called `sentry_sdk.set_context("voyage_usage", ...)` per successful course — the context persisted to later captures across course boundaries. Fix: wrap in `sentry_sdk.new_scope()` context manager.

**Context:** Caught by review before merge. Sentry docs recommend `new_scope` for any contextual telemetry that should not leak.
**Source:** 34-REVIEW.md §MD-02; commit 18fc162

### RAG source prefetch is an AI call and must respect the daily limit
MD-03/MD-04: `retrieve_rag_sources` (invoked before `stream_answer_question` to pre-populate the sources event) and `get_path_advisory` (multi-course path planner's AI wrapper) both skipped the `ai_calls_today` increment. Paired with WR-04 (PredictPage double-fire of `/multi-course-path` on load), real usage could have doubled traffic silently past the 100-call/day budget.

**Context:** Any new AI call site must go through the same `_check_and_increment_ai_limit` gate as `answer_question`. Code review caught all three before prod.
**Source:** 34-REVIEW.md §MD-03, MD-04, WR-04; commits 418ca4e, bc6dd9f, 0e0a96b

### Local dev has three independent databases
`DATABASE_URL=postgresql+asyncpg://uniboard:devpassword@localhost:5432/uniboard_dev` (legacy dev DB, never gets Supabase migrations) vs `postgres:postgres@localhost:54322/postgres` (local Supabase postgres where migrations land) vs prod Supabase (`brcsgbxnflyxbmijwbte.supabase.co`). During UAT the backend was configured for the legacy DB, so `/users/me` 500'd with `relation "profiles" does not exist` until `.env` was swapped to point at Supabase-local.

**Context:** `.env.example` already uses the Supabase-local form. User's `.env` still has the legacy form from before the Supabase migration — a documentation drift that bites first-time local UAT.
**Source:** UAT session; .env.example comparison

### Supabase legacy `SERVICE_ROLE_KEY` (HS256 JWT) rejected by modern GoTrue admin API
`supabase status -o env` still emits the legacy JWT-format `SERVICE_ROLE_KEY`, but modern GoTrue expects the new `SECRET_KEY` (`sb_secret_*`) format for admin operations. Legacy key returns `{"code":403,"error_code":"bad_jwt"}` even against a fresh local Supabase. Workaround during UAT: direct `UPDATE auth.users SET encrypted_password` via postgres on :54322.

**Context:** Workaround worked. GoTrue 2.188+ treats the new sb_secret_* format as canonical. `supabase status` output needs updating or the JWT admin path needs a fallback.
**Source:** UAT session `SECRET_KEY` vs `SERVICE_ROLE_KEY` attempts

---

## Patterns

### Wave 0 RED-state scaffolding
Phase 34 mirrored Phase 32.1: Wave 0 created all test files as `xfail(strict=False)` or `it.todo()` stubs so collection passes green. Waves 1-3 flipped stubs to strict tests as implementation landed. This kept CI green throughout the phase even when partial features were merged.

**When to use:** Multi-wave phases where early waves provide scaffolding and later waves fill in logic. Avoids "tests broken for 3 days" windows mid-phase.
**Source:** 34-00-PLAN.md; 34-00-SUMMARY.md

### Worktree-parallel execution with EXPECTED_BASE reset
Each `gsd-executor` received its wave's HEAD commit as `EXPECTED_BASE`. First action: `git merge-base HEAD $EXPECTED_BASE`; if mismatch, `git reset --hard $EXPECTED_BASE`. Protects against Claude Code's `EnterWorktree` creating branches off stale `main` instead of the feature branch tip.

**When to use:** Every worktree-parallel wave. Already built into the workflow. Do not disable.
**Source:** execute-phase.md `<worktree_branch_check>` block; applied in all 6 Wave agent prompts

### Atomic PATCH for related settings fields
`useUpdateProfile.mutate({ gpa_target, remaining_credit_points })` sends both fields in a single PATCH. Backend diff-updates (only changed fields hit SQL `UPDATE`). "Saved!" indicator flips on mutation success, auto-dismisses via `useEffect` cleanup timer.

**When to use:** Settings forms where multiple related fields share a Save button. Avoids partial-success inconsistency (WR-02 gave the WR-02 pattern: show success only `onSuccess`, cleanup timer on unmount).
**Source:** 34-05-PLAN.md; commit f497281

### SSE sources-before-first-token ordering contract
Backend `_sse_wrap(sources=...)` emits `event: sources` BEFORE the first `event: token`. Frontend pre-allocates `sources` state on receipt so inline `[N]` markers render against populated metadata. `setSources([])` in `sendMessage` clears stale citations from prior Q&A.

**When to use:** Any streamed AI response that must correlate inline markers with structured metadata.
**Source:** 34-04-SUMMARY.md; src/web/routes/ai.py `_sse_wrap`

### Decimal + ROUND_HALF_UP discipline for grade math
`GPAService.calculate_multi_course_path` uses `Decimal(str(float_val))` + `ROUND_HALF_UP` throughout — 25× Decimal conversions and 14× explicit rounds in the implementation. Never mixes float math into the pipeline.

**When to use:** Any calculation that surfaces a grade, WAM, or GPA band to the user. Float rounding inside an arithmetic chain compounds and can flip band boundaries (75.00 vs 74.999...).
**Source:** 34-03-SUMMARY.md; src/services/gpa.py

### BFF proxy = mirror existing `route.ts` for every new backend endpoint
Next.js app under `frontend/app/api/v1/*/route.ts` is the same-origin BFF layer. Adding a new backend endpoint without a matching route file returns 404 from the frontend. Pattern:
```ts
import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";
export async function GET(request: NextRequest) { return proxyRequest(request); }
// or for POST: const body = await request.text(); return proxyRequest(request, { body });
```

**When to use:** Every plan that adds a backend endpoint (not just extends an existing one). Include BFF route in the plan's `files_modified` list and acceptance criteria.
**Source:** 34-HUMAN-UAT.md §Gaps; commit 6b40494; frontend/app/api/v1/gpa/path/route.ts

---

## Surprises

### Phase 34 broke a pre-Phase-34 unit test — only CI caught it
`_CITATION_PATTERN` rewrite was an intentional change at the core-service level, but no grep-all-callers pass was done. `tests/unit/test_ai_engine.py` still asserted the legacy format. Local pytest passed during development because the failing test was outside Phase 34's scope and wasn't in the focused test set. CI ran the full suite and failed.

**Impact:** CI cycle added ~3 minutes for the `/gsd-quick` fix + re-push + re-run. Low blast radius but easily avoided with a grep for `\[Canvas:` or `_CITATION_PATTERN` callers before committing the regex change.
**Source:** GH Actions run 24553758352; commit e42cb73

### BFF proxy gap not caught by code review or gsd-verifier
Both the code reviewer agent and the verifier agent inspected backend Python + frontend components separately. Neither enumerated the Next.js BFF layer. Gap surfaced only when the browser actually tried to hit the endpoint and got 404. Suggests: verifier should grep `frontend/app/api/v1/` against new backend routes as a must-have check for any phase that adds endpoints.

**Impact:** 3 minutes to diagnose (network tab → 404 → grep → add 2 route.ts files) but reputational — "code review passed 9/9" + "verifier 30/30 must-haves" + still a production-blocking gap surfaced in UAT.
**Source:** 34-HUMAN-UAT.md §Root cause; 34-REVIEW.md; 34-VERIFICATION.md

### Local pgvector missing blocks DB-session tests (pre-existing)
`CREATE EXTENSION IF NOT EXISTS vector` in `00000000000001_initial_schema.sql` fails when applied against stock Postgres 14 (no pgvector). Test session fixtures apply migrations from scratch, so every DB-session test errors locally. Predates Phase 34 but surfaces on every Phase 34 integration test. `brew install pgvector` is blocked by unrelated long-running brew install in user's shell.

**Impact:** Reduced local signal during UAT — 6 of 8 Phase 34 DB tests errored, forcing reliance on CI (where pgvector is present) and mocked SSE for UAT 5/6. Non-blocking because prod Supabase has pgvector.
**Source:** Initial UAT probe; 34-00-SUMMARY.md §local_env_caveat

### Database state split between Supabase-local and legacy uniboard_dev
Backend `.env` DATABASE_URL points at `:5432/uniboard_dev` (not used by Supabase-local), so backend fresh-install has no schema. `.env.example` has the correct Supabase-local URL (`:54322/postgres`). UAT required manually swapping before `/users/me` worked.

**Impact:** First-time UAT run blocked until `.env` was patched. Future developers will hit this. Worth updating the project's dev setup doc or `.env` defaults.
**Source:** UAT session; .env.example

### Plan-frontmatter `files_modified` is a planning contract, but downstream agents (reviewer, verifier) don't validate it against actual diff
Plan 34-05's `files_modified` listed 20+ frontend files but did NOT list the 2 BFF route files that actually had to be created. Review + verify agents read the listed files but didn't cross-check "what paths does `prefixUrl: /api/v1` imply must exist". A static contract-coverage check could prevent this class of gap.

**Impact:** See BFF gap above. Also, any plan can claim "wires X endpoint" without actually creating the route file — and nothing fails until runtime.
**Source:** 34-05-PLAN.md frontmatter; 34-HUMAN-UAT.md §Gaps
