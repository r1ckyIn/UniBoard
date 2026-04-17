---
phase: 34-ai-features-live
reviewed: 2026-04-17T05:46:04Z
depth: standard
review_depth: standard
files_reviewed: 54
files_reviewed_list:
  - src/config.py
  - src/models/__init__.py
  - src/models/course.py
  - src/models/study_recommendation_cache.py
  - src/models/user.py
  - src/prompts/path_advisory.py
  - src/prompts/qa.py
  - src/prompts/study_recommendation.py
  - src/schemas/gpa.py
  - src/schemas/study_recommendation.py
  - src/schemas/user.py
  - src/services/ai_engine.py
  - src/services/embedding_worker.py
  - src/services/gpa.py
  - src/services/qa.py
  - src/services/study_recommendation.py
  - src/sync/__init__.py
  - src/sync/engine.py
  - src/sync/modules.py
  - src/sync/scheduled.py
  - src/web/routes/ai.py
  - src/web/routes/gpa.py
  - src/web/routes/users.py
  - supabase/migrations/00000000000008_phase34_ai_features.sql
  - tests/integration/test_ai_routes.py
  - tests/integration/test_gpa_routes.py
  - tests/integration/test_rag_real_data.py
  - tests/unit/test_embedding_worker.py
  - tests/unit/test_path_planner.py
  - tests/unit/test_study_recommendation_scheduler.py
  - tests/unit/test_study_recommendation_service.py
  - frontend/components/course-detail/AiCourseChat.tsx
  - frontend/components/dashboard/DashboardPage.tsx
  - frontend/components/dashboard/HeroSection.tsx
  - frontend/components/deadlines/DeadlineAiChat.tsx
  - frontend/components/predict/MultiCoursePathCard.tsx
  - frontend/components/predict/PredictPage.tsx
  - frontend/components/predict/StudyRecCard.tsx
  - frontend/components/settings/GpaTargetSection.tsx
  - frontend/components/settings/LanguageSection.tsx
  - frontend/components/shared/Sources.tsx
  - frontend/hooks/use-ai-stream.ts
  - frontend/hooks/use-multi-course-path.ts
  - frontend/hooks/use-study-recommendations.ts
  - frontend/lib/api/ai-stream.ts
  - frontend/lib/api/types.gen.d.ts
  - frontend/messages/en.json
  - frontend/messages/zh.json
  - frontend/openapi/openapi.yaml
  - frontend/__tests__/shared/Sources.test.tsx
  - frontend/__tests__/predict/MultiCoursePathCard.test.tsx
  - frontend/__tests__/predict/StudyRecCard.test.tsx
  - frontend/__tests__/predict/PredictPage.test.tsx
findings:
  critical: 0
  high: 1
  medium: 4
  warning: 4
  info: 4
  total: 13
status: needs_fixes
issues_found: 13
---

# Phase 34: Code Review Report

**Reviewed:** 2026-04-17T05:46:04Z
**Depth:** standard
**Files Reviewed:** 54
**Status:** needs_fixes

## Summary

Phase 34 delivers three AI features (cross-course Top-3 study recommendations,
production RAG with [N] citations, multi-course path planner) with generally
high code quality. The backend services use `Decimal` rigorously for GPA math,
APScheduler uses the mandatory `Australia/Sydney` timezone literal, RLS
policies on the new `study_recommendation_cache` table correctly scope SELECT
to the owning user, and the D-D1 silent-fallback contract is honoured end-to-end.

**Zero critical issues.** The dominant risk is a visible but non-crashing
frontend/backend contract drift on the RAG `sources` SSE payload: the frontend
`CitationSource` interface expects `title`, `module_id`, `anchor` fields that
the backend `retrieve_rag_sources` helper never emits, and `source_type` is
constrained to `"module_item" | "lesson"` yet the backend always emits
`"mixed"`. This renders the Sources panel with empty titles in production
without producing a TypeScript or runtime error — exactly the class of
"contract drift" flagged in `feedback_openapi_contract_drift` memory.

A secondary concern is the Sentry scope leakage in `embed_hot_courses_worker`:
`sentry_sdk.set_context("voyage_usage", ...)` is called on the global scope
rather than inside `sentry_sdk.new_scope()`, so unrelated errors will be
decorated with the last-processed course's telemetry.

The remaining findings are low-risk code-quality issues (localization drift
in the non-streaming QA path, optimistic save-state in the GPA target form,
missing cleanup of a timer, Pydantic enum tightening).

## High

### HI-01: RAG `sources` SSE payload contract drift — frontend renders empty titles in production

**File:** `src/services/qa.py:288-306` (backend emitter) / `frontend/lib/api/ai-stream.ts:10-18` (frontend type) / `frontend/components/shared/Sources.tsx:33-42` (renderer)

**Issue:**
The backend `QAService.retrieve_rag_sources` returns per-source dicts with
these keys only:

```python
{"index", "source_type", "source_id", "chunk_index", "score", "excerpt"}
```

- `source_type` is always the string `"mixed"` because `embed_course_materials`
  hard-codes `source_type="mixed"` on every `ContentEmbedding` row
  (`src/services/qa.py:505`).

The frontend `CitationSource` interface and `Sources.tsx` renderer expect:

```ts
{ index, module_id, title, source_type: "module_item" | "lesson", anchor, score, excerpt }
```

Consequences in production:
1. `Sources.tsx:34` renders `{s.title}` where `s.title` is `undefined` →
   citation line appears as `[1] ` (blank) ` 92%` with only the excerpt.
2. `Sources.tsx:35` `s.anchor` is always `undefined` → the middot separator
   is always hidden (silent data loss).
3. TypeScript accepts the runtime payload because the frontend types are not
   validated against the actual JSON schema of the SSE `sources` event;
   `"source_type": "mixed"` does not match the enum `"module_item" | "lesson"`
   but this is only caught at compile time.

The `test_sse_sources_event_order` integration test drives `_sse_wrap` with
a synthetic fixture that DOES include `"title": "Lecture 1"`
(`tests/integration/test_ai_routes.py:273-282`), so it never exercises the
actual backend emitter — the drift is not detected by the existing test
suite. The env-gated `test_rag_real_data` only asserts presence of
`source_id OR source_type` and `score` (lines 72-76) and would pass even
though the UI is degraded.

**Fix:**
Bring backend and frontend to a single canonical shape. Two options:

Option A (preferred — enrich backend): derive title/anchor/module_id from
the chunk's source record and emit them:

```python
# src/services/qa.py::retrieve_rag_sources
sources.append(
    {
        "index": idx + 1,
        "source_type": chunk.source_type,  # "module_item" | "lesson" once embed_course_materials stores real types
        "source_id": chunk.source_id,
        "title": <lookup from ModuleItem/Lesson>,
        "module_id": <lookup>,
        "anchor": None,  # wire when slide/heading anchors exist
        "chunk_index": chunk.chunk_index,
        "score": score,
        "excerpt": excerpt,
    }
)
```

and, in parallel, change `embed_course_materials` (qa.py:505) to write
per-chunk `source_type="module_item"` or `"lesson"` (and the correct
`source_id`) instead of `source_type="mixed"`.

Option B (narrow frontend to match backend): mark `title`, `module_id`,
`anchor` as omitted on the type, widen `source_type` to `string`, and render
a labeled fallback (`source_type` + `chunk_index`) in `Sources.tsx`. This is
faster but trades UX quality.

Regardless of direction, add a real-data integration assertion that the UI
renders a non-empty title (or a labelled fallback) for every retrieved
source. Also regenerate `types.gen.d.ts` from a `components/schemas/CitationSource`
added to `openapi.yaml` so the SSE payload is a first-class typed contract.

## Medium

### MD-01: Non-streaming `/courses/{id}/qa` ignores user language preference

**File:** `src/services/ai_engine.py:149` (hardcoded system prompt) / `src/services/qa.py:170-173` (call site)

**Issue:**
`AIEngine.ask_question` hardcodes `system=QA_SYSTEM_PROMPT` (English-only) and
does not accept a `language` parameter. Its sibling `AIEngine.stream_question`
accepts `language` and calls `get_qa_prompt(language)` (line 273). Phase 34
renamed the citation marker style in both prompts, but the
`POST /courses/{id}/qa` (non-streaming) path that feeds `AiCourseChat` would
still produce English-language answers for Chinese-preferred users.

In practice the primary chat UI uses `POST /courses/{id}/qa/stream` (streaming,
correct), so user impact is low today. But `QAService.answer_question` and
`_answer_rag` (qa.py:170-173, 214-217) are reachable if any callsite ever
uses the non-streaming endpoint — this is a latent i18n defect.

**Fix:**
Add `language: str = "en"` to `AIEngine.ask_question` and thread it through
`QAService.answer_question` / `_answer_direct` / `_answer_rag`:

```python
async def ask_question(
    self,
    question: str,
    context_text: str,
    model: str = "claude-opus-4-6",
    language: str = "en",
) -> QAResponse:
    ...
    response = await self._client.messages.create(
        model=model,
        max_tokens=1000,
        system=get_qa_prompt(language),
        messages=[{"role": "user", "content": user_message}],
    )
```

and pass the user's `language_preference` in `course_qa` in
`src/web/routes/ai.py:127-142` (fetch profile once, same pattern as
`_build_ai_gpa_service`).

### MD-02: `sentry_sdk.set_context("voyage_usage", ...)` leaks across courses

**File:** `src/services/embedding_worker.py:194-200`

**Issue:**
After a successful course embed, the worker calls:

```python
sentry_sdk.set_context(
    "voyage_usage",
    {"course_id": str(course_id), "chunks_embedded": chunk_count},
)
```

This mutates the GLOBAL Sentry scope (no `with sentry_sdk.new_scope():` wrapper),
so:
1. When Course B fails after Course A succeeds, the captured exception's
   `voyage_usage` context reports **Course A's** course_id + chunks, not the
   failing one.
2. The context persists past the worker's lifetime (unless a fresh scope is
   pushed), polluting later unrelated captures on the same process with stale
   course ids.

This was flagged to Gemini review as "Voyage Header Check" but implemented
with the wrong scope management.

**Fix:**
Either use `sentry_sdk.add_breadcrumb(...)` (scoped to the current event and
automatically purged by Sentry's own mechanisms) or wrap the per-course
telemetry in a fresh scope:

```python
with sentry_sdk.new_scope() as scope:
    scope.set_tag("phase", "34")
    scope.set_tag("feature", "rag_embedding")
    scope.set_context("voyage_usage", {
        "course_id": str(course_id),
        "chunks_embedded": chunk_count,
    })
    # optional: scope.capture_message("embed_hot_course_done", level="info")
```

Mirror the same pattern used in the exception path (embedding_worker.py:203-206)
for consistency.

### MD-03: RAG sources prefetch bypasses AI daily limit — potential Voyage cost leak

**File:** `src/web/routes/ai.py:185-189` (prefetch) / `src/services/qa.py:70-100` (limit check)

**Issue:**
`POST /courses/{course_id}/qa/stream` calls `svc.retrieve_rag_sources(...)`
BEFORE the streaming generator runs, so BEFORE `_check_and_increment_limit`
is invoked (that check happens inside `stream_answer_question`, qa.py:347).

`retrieve_rag_sources` makes a Voyage embedding API call per invocation
(voyageai `AsyncClient.embed(...)`, qa.py:262-266). A user who has exhausted
their 100 AI-calls/day quota can still trigger unlimited Voyage embedding
calls by hammering the stream endpoint (the slowapi `@limiter.limit("10/minute")`
IP rate limit caps burst but allows ~14k calls/day per IP).

Blast radius is bounded — Voyage embedding is cheap (~1e-4 USD per question)
and the slowapi cap is tight — so severity is medium rather than high.

**Fix:**
Call the daily-limit check as the first step of `course_qa_stream` (even if
synchronously, not yielding), before `retrieve_rag_sources`. Either:

- Extract `_check_and_increment_limit` into an awaitable pre-check the route
  can call directly, or
- Emit an `error` SSE event with a 429 reason if the user is over quota,
  matching the existing `RateLimitedError` handling convention.

### MD-04: `/gpa/multi-course-path` bypasses AI daily limit

**File:** `src/services/gpa.py:670-717` (`get_path_advisory`) / `src/web/routes/gpa.py:341-377`

**Issue:**
`GPAService.get_path_advisory` makes an Anthropic Sonnet call per
`/gpa/multi-course-path` invocation but does NOT increment the user's
`ai_calls_today` counter. The only backstop is the `@limiter.limit("10/minute")`
slowapi IP rate limit (gpa.py:342). This means:

1. Users who have exhausted their Q&A quota still get advisory generations
   (effectively raising the daily AI budget silently).
2. The counter is now a soft budget for the QA path only, not for all AI
   calls as its name suggests.

The frontend `useEffect` in `PredictPage.tsx:250-257` fires the mutation on
every change of `targetWam` or `remainingCp`, de-duplicated only by the
last-fired key — opening the page with valid inputs always fires 1 call.

**Fix:**
Call `QAService._check_and_increment_limit(user_id)` (or extract it into a
shared `RateLimitService`) at the start of `calculate_multi_course_path`
route handler, not inside `get_path_advisory` (since `advisory_text=None`
path is also a successful response). Alternatively, define a separate,
higher-budget counter for "low-cost" AI endpoints if the math-layer
frictionless-UX goal requires it — but make the policy explicit.

## Warnings

### WR-01: `Profile.language_preference` tolerates non-enum values, violating OpenAPI contract

**File:** `src/schemas/user.py:28` (`UserResponse`) / `src/schemas/user.py:42` (`UserUpdateRequest`)

**Issue:**
`UserResponse.language_preference: str = "en"` accepts any string. OpenAPI
(`frontend/openapi/openapi.yaml:316-318, 1366-1369`) and the generated
TypeScript type (`types.gen.d.ts:624`, `:1341`) restrict this to
`"en" | "zh"`. If a corrupted DB row has `language_preference="fr"`, the
backend returns it as-is and the frontend `useCurrentUser` typed read would
receive an unexpected value (TypeScript narrows on cast, runtime returns
silently).

The PATCH request in `users.py:94-97` does validate `("en", "zh")` via a
runtime `if` check but raises `ValidationError` manually instead of using
Pydantic's `Literal["en", "zh"]`.

**Fix:**
Tighten both schemas to use `Literal["en", "zh"]`:

```python
from typing import Literal

class UserResponse(BaseModel):
    ...
    language_preference: Literal["en", "zh"] = "en"

class UserUpdateRequest(BaseModel):
    ...
    language_preference: Literal["en", "zh"] | None = None
```

This lets Pydantic reject malformed DB rows at response time with a 500
(preferable to silently leaking non-enum values to the client) and drops the
manual `ValidationError` branch.

### WR-02: `GpaTargetSection.handleSave` sets "Saved!" before the mutation settles and leaks a timer

**File:** `frontend/components/settings/GpaTargetSection.tsx:77-85`

**Issue:**
```tsx
function handleSave() {
  updateProfile.mutate({...});
  setShowSaved(true);
  setTimeout(() => setShowSaved(false), 2000);
}
```

Two issues:
1. `setShowSaved(true)` fires unconditionally BEFORE the mutation resolves —
   "Saved!" pops up even if the PATCH request failed (e.g., 422 from a
   server-side validation bug).
2. The `setTimeout` is not cleared on unmount. If the user navigates away
   within 2 s, the setter runs on an unmounted component (React 18 logs a
   warning in dev; in tests jsdom may trigger "state update on unmounted").

**Fix:**

```tsx
function handleSave() {
  updateProfile.mutate(
    {...},
    {
      onSuccess: () => {
        setShowSaved(true);
      },
    },
  );
}

useEffect(() => {
  if (!showSaved) return;
  const t = setTimeout(() => setShowSaved(false), 2000);
  return () => clearTimeout(t);
}, [showSaved]);
```

### WR-03: `Profile.language_preference` returned verbatim in `UserResponse` may be `None` for legacy rows

**File:** `src/schemas/user.py:28`

**Issue:**
`Profile.language_preference` is declared `String(5), default="en", server_default="en"` in the ORM model
(`src/models/user.py:96-98`). Legacy rows created before the server default
was backfilled would have `NULL` in the column, but `UserResponse` declares
`language_preference: str = "en"` (non-optional). Pydantic's `from_attributes`
conversion would raise `ValidationError` on the non-nullable str when the
attribute is None. The frontend hooks (`use-user.ts:17-19`) already carry
`language_preference?: string` as an Omit-override, suggesting this has been
observed in practice.

**Fix:**
Either make the field `Optional` with a fallback in `_build_user_response`:

```python
language_preference=profile.language_preference or "en",
```

or backfill legacy NULLs via a migration before tightening the schema per WR-01.

### WR-04: `PredictPage` fires `/gpa/multi-course-path` with the default target WAM on page load

**File:** `frontend/components/predict/PredictPage.tsx:106` (`useState<number>(85)`) / `:250-257` (effect)

**Issue:**
`const [targetWam, setTargetWam] = useState<number>(85);` initializes the
target to 85 before the user's actual profile target has loaded. The useEffect
at 250-257 fires immediately once `remainingCp` is known, making an
`advisory_text`-enabled AI call with the placeholder target — NOT the user's
saved target. When the real target arrives via `gpaReport.data`
(`useEffect` at 110-115) `setTargetWam(...)` is called, which triggers
another effect cycle and another AI advisory call. Cost: 2× Sonnet calls per
page load instead of 1.

**Fix:**
Gate the path mutation on the `targetInitialized.current` flag (already used
at line 109):

```tsx
useEffect(() => {
  if (!targetInitialized.current) return;       // <-- add
  if (remainingCp === null || remainingCp === undefined) return;
  if (!Number.isFinite(targetWam)) return;
  const key = `${targetWam}|${remainingCp}`;
  if (key === lastFiredPathKey.current) return;
  lastFiredPathKey.current = key;
  pathMutate({...});
}, [targetWam, remainingCp, pathMutate]);
```

## Info

### IN-01: `_score_candidate` reserved `now` parameter is unused

**File:** `src/services/study_recommendation.py:58-75`

**Issue:**
The `now: datetime | None = None` parameter on `_score_candidate` is passed
through but never read (`_ = now` on line 65). The docstring says "reserved
for future time-based weighting". This is harmless but creates a dead
parameter in the pure-function API. Consider dropping until actually needed
or documenting with a TODO referencing a concrete follow-up ticket.

### IN-02: Type safety gap — `MultiCoursePathData` duplicated between hook and component

**File:** `frontend/components/predict/MultiCoursePathCard.tsx:16-25` / `frontend/hooks/use-multi-course-path.ts:18-19`

**Issue:**
`MultiCoursePathCard` redefines its own `MultiCoursePathData` interface
instead of re-exporting the OpenAPI-generated
`paths["/gpa/multi-course-path"]["post"]["responses"]["200"]["content"]["application/json"]["data"]`.
The manual definition currently agrees with the generated type, but any
future backend schema change (e.g. adding a field) will silently desync.

**Fix:**
Replace the local interface with a re-export from the generated types:

```ts
import type { components } from "@/lib/api/types.gen";
export type MultiCoursePathData = components["schemas"]["MultiCoursePath"];
```

Same consideration for `StudyRecItem` in `StudyRecCard.tsx:16-23` — reuse
`components["schemas"]["StudyCandidate"]`.

### IN-03: `embed_hot_courses_worker` silently caches hash when `voyageai` is unavailable

**File:** `src/services/qa.py:466-472` / `src/services/embedding_worker.py:176-182`

**Issue:**
`QAService.embed_course_materials` catches `ImportError` and returns `0` with
a warning log. The hot-set worker calls this and records a successful
re-embed (`re_embedded += 1` at embedding_worker.py:182) despite zero chunks.
On subsequent runs, the hash will already match (set at line 179), so the
worker STOPS re-processing the course even though no embeddings exist.

Users without `voyageai` installed (dev mode) get permanent staleness. Users
in prod where `voyageai` is installed are unaffected.

**Fix:**
Return early in the worker when `embed_course_materials` returns 0 chunks
AND there were source rows (i.e., something should have been embedded):

```python
chunk_count = await qa_svc.embed_course_materials(course_id)
if chunk_count == 0:
    # Either no content or voyageai unavailable -- don't cache the hash
    # so the next cycle retries.
    continue
course.content_hash = computed_hash
course.embedded_at = now
```

### IN-04: `_recompute_course_hashes` always re-hashes every course on every modules sync

**File:** `src/sync/modules.py:304-334`

**Issue:**
The conditional `if course.content_hash != new_hash:` prevents writes on
match (good). However every successful sync computes the hash by scanning
all module_items + lessons for the course — this is O(content_length) per
course per sync. For users with many courses, this could double sync
wall-clock time during module sync. Currently acceptable (sync runs at
03:00 daily), but worth monitoring.

**Fix:**
Not required. Consider a lightweight cheap check first (e.g. `max(updated_at)`
over child tables) before computing the full sha256 — out of scope for
Phase 34.

---

## Out-of-Scope Observations (not findings)

- `calculate_target_path` (the pre-Phase-34 `/gpa/target` endpoint) uses
  `score_needed = total_needed / (sum_raw_weights * cp)` in "smart" mode
  (gpa.py:472-475). This does not satisfy the target WAM identity and
  predates Phase 34 — retained for back-compat but worth a follow-up
  regression test in a later phase.
- The `retrieve_rag_sources` helper silently returns `None` on any voyageai
  `ImportError` (qa.py:258-259). Production should have voyageai installed;
  if it's missing, the UI silently drops the Sources panel. Pre-existing
  behavior aligned with the D-D1 fallback spec.
- `UserUpdateRequest.gpa_scale` accepts any `str | None` but the route
  only allows `"wam" | "gpa_4"` (users.py:87-89). Same pattern as WR-01;
  roll into the same fix batch.

---

_Reviewed: 2026-04-17T05:46:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
