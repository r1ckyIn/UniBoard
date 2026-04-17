---
phase: 34-ai-features-live
plan: 05
subsystem: frontend-ai-integration
tags: [frontend, tanstack-query, sse, citations, i18n, next-intl, vitest, tdd, openapi-regen]

# Dependency graph
requires:
  - phase: 34-ai-features-live/02
    provides: "GET /ai/study-recommendations (StudyRecommendationResponse) + main_suggestion D-D1 contract"
  - phase: 34-ai-features-live/03
    provides: "POST /gpa/multi-course-path (MultiCoursePathResponse) + advisory_text=null D-D1 silent fallback"
  - phase: 34-ai-features-live/04
    provides: "SSE 'event: sources' payload before first token + numeric [N] citation markers in answer body"
  - phase: 34-ai-features-live/00
    provides: "4 frontend Wave 0 it.todo stubs (use-ai-stream + Sources + StudyRecCard + MultiCoursePathCard)"
provides:
  - "frontend/openapi/openapi.yaml: 2 new endpoints + 4 new schemas + User/PATCH body extensions"
  - "frontend/lib/api/ai-stream.ts: CitationSource interface + SSEEvent 'sources' literal"
  - "frontend/hooks/use-ai-stream.ts: sources state + reset on sendMessage/clearMessages"
  - "frontend/hooks/use-study-recommendations.ts: TanStack Query hook (NEW)"
  - "frontend/hooks/use-multi-course-path.ts: TanStack Mutation hook (NEW)"
  - "frontend/components/shared/Sources.tsx: collapsible citation panel (NEW)"
  - "frontend/components/predict/StudyRecCard.tsx: Top-3 ROI card (NEW)"
  - "frontend/components/predict/MultiCoursePathCard.tsx: path verdict card (NEW)"
  - "Dashboard hero with 3-stage D-D1 fallback chain (AI prose > Top-3 ROI > default encouragement)"
  - "Predict page right-rail integration of both new cards (path mutation fires on stable-input change only)"
  - "GpaTargetSection: 4-band quick-pick chips + remaining_credit_points input + atomic save"
  - "AiCourseChat + DeadlineAiChat Sources panel below latest assistant bubble only"
  - "11 frontend tests pass (2 hook + 3 Sources + 3 StudyRecCard + 3 MultiCoursePathCard)"
  - "Bilingual i18n (en + zh) for: shared.sources, predict.studyRec, predict.path, settings.gpa.bandChips, settings.gpa.remainingCp, dashboard.hero.roiFallback"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OpenAPI-first contract regen: pnpm generate:types never hand-edit types.gen.d.ts (Phase 33 LEARNINGS / feedback_openapi_contract_drift.md)"
    - "useUpdateProfile accepts extended body with remaining_credit_points via ExtendedUpdateUserBody + language_preference mirror"
    - "Path mutation with last-fired-key ref guards against re-fire on render-only state changes (WARN-4)"
    - "3-stage hero fallback chain prefers AI prose then deterministic Top-3 ROI derivation before default encouragement (D-D1 graceful degrade)"
    - "Sources panel scoped to latest assistant bubble only (historical citations not shown — avoids stale-citation UX)"
    - "Native <details> for Sources panel — zero library cost, React-default escaping for XSS mitigation"
    - "vi.mock for component + hook stubs in PredictPage test — preserves legacy title assertion across namespace shuffling"

key-files:
  created:
    - frontend/hooks/use-study-recommendations.ts
    - frontend/hooks/use-multi-course-path.ts
    - frontend/components/shared/Sources.tsx
    - frontend/components/predict/StudyRecCard.tsx
    - frontend/components/predict/MultiCoursePathCard.tsx
    - .planning/phases/34-ai-features-live/34-05-SUMMARY.md
  modified:
    - frontend/openapi/openapi.yaml
    - frontend/lib/api/types.gen.d.ts
    - frontend/lib/api/ai-stream.ts
    - frontend/hooks/use-ai-stream.ts
    - frontend/components/settings/LanguageSection.tsx
    - frontend/components/dashboard/HeroSection.tsx
    - frontend/components/dashboard/DashboardPage.tsx
    - frontend/components/predict/PredictPage.tsx
    - frontend/components/settings/GpaTargetSection.tsx
    - frontend/components/course-detail/AiCourseChat.tsx
    - frontend/components/deadlines/DeadlineAiChat.tsx
    - frontend/messages/en.json
    - frontend/messages/zh.json
    - frontend/__tests__/hooks/use-ai-stream.test.ts
    - frontend/__tests__/shared/Sources.test.tsx
    - frontend/__tests__/predict/StudyRecCard.test.tsx
    - frontend/__tests__/predict/MultiCoursePathCard.test.tsx
    - frontend/__tests__/settings/GpaTargetSection.test.tsx
    - frontend/__tests__/predict/PredictPage.test.tsx

key-decisions:
  - "pnpm generate:types script already exists — used verbatim; types.gen.d.ts regenerated (not hand-edited) per CLAUDE.md/Phase 33 LEARNINGS."
  - "Course-color helper resolved as `import { getCourseColor } from \"@/lib/dashboard/course-colors\"` (returns {base, soft}); reused existing StudyRecCard visual."
  - "useUpdateProfile ALREADY accepted remaining_credit_points via ExtendedUpdateUserBody pattern (mirrors language_preference). Backend src/schemas/user.py:41 already wired it — no schema extension needed. Added to OpenAPI spec anyway so types.gen.d.ts reflects current reality (Rule 2 — fix contract drift)."
  - "i18n namespaces finalized: shared.sources, predict.studyRec, predict.path, settings.gpa.bandChips, settings.gpa.remainingCp, dashboard.hero.roiFallback. Chose to extend existing 'predict' namespace (not a new top-level) so next-intl scoping stays consistent with RoiCard's 'predict' pattern."
  - "HeroSection 3-stage fallback: strictly AI prose > Top-3 ROI derivation > defaultEncouragementProvider. RoughNotation highlight animation only engages on stage 3 (stages 1/2 render plain — no highlightPhrase available in AI prose or ROI derivation)."
  - "stream_answer_question hook ordering: setSources([]) happens in sendMessage BEFORE the stream loop, so stale citations from prior Q&A are always cleared. Sources event arrives BEFORE first token per 34-04 backend contract — frontend just consumes in receipt order."
  - "PredictPage path mutation: lastFiredPathKey ref prevents re-fire when (target_wam, remaining_credit_points) is unchanged but component re-renders for unrelated reasons. pathMutate (stable mutation reference) included in deps to satisfy React strict mode exhaustive-deps."
  - "Language enum tightening (language_preference: en|zh) forced a narrow-type fix in LanguageSection.tsx — added LanguageCode type alias over LANGUAGE_OPTIONS so the handler type matches the new strict union at the mutation boundary (Rule 1 — regression from my own spec change)."

patterns-established:
  - "vi.mock with React.createElement import at file top avoids 'React is not defined' inside hoisted mock factories — cleaner than require() or dynamic import."
  - "Extend PATCH schemas in openapi.yaml EVEN IF the frontend already has an Extended body pattern — keeps the contract single source of truth per feedback_openapi_contract_drift.md."

requirements-completed:
  - AIFEAT-01
  - AIFEAT-02
  - AIFEAT-03

# Metrics
duration: 18min
completed: 2026-04-17
---

# Phase 34 Plan 05: Frontend Wire-up Summary

**All three Phase 34 AI features wired end-to-end into production UI: Dashboard hero suggestion + Top-3 ROI fallback, Predict page Top-3 + multi-course path verdict, Settings 4-band chips + remaining_credit_points input, AI chat Sources panel with [N] citations. 11 frontend tests pass (2 hook + 9 component); tsc + lint clean. 4 Wave 0 it.todo stubs flipped to real bodies.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-17T05:14:40Z
- **Completed:** 2026-04-17T05:33:07Z
- **Tasks:** 3
- **Files created:** 6 (5 frontend + 1 SUMMARY.md)
- **Files modified:** 19

## Accomplishments

### Task 1: OpenAPI + types regen + ai-stream hooks

- **frontend/openapi/openapi.yaml**: Added `GET /ai/study-recommendations` + `POST /gpa/multi-course-path` endpoints (under new "AI Features (Phase 34)" comment block and extended existing `/gpa/path` section). Added 4 schemas: `StudyCandidate`, `StudyRecommendation`, `MultiCoursePathRequest`, `MultiCoursePath`. Extended `User` schema with `remaining_credit_points` (int|null, ge=0, le=500) and `language_preference` (en|zh enum). Extended `PATCH /users/me` request body with the same 2 fields.
- **frontend/lib/api/types.gen.d.ts**: Regenerated via `pnpm generate:types` — 19 new type references confirmed. NOT hand-edited.
- **frontend/lib/api/ai-stream.ts**: Added `CitationSource` interface (index, module_id, title, source_type, anchor, score, excerpt). Extended `SSEEvent.event` union to include `"sources"` literal.
- **frontend/hooks/use-ai-stream.ts**: Added `sources: CitationSource[]` state. Added sources event dispatch in the stream loop (BEFORE token branch). Added `setSources([])` reset in both sendMessage (clear stale) and clearMessages (fully reset). Extended `UseAiStreamReturn` interface.
- **frontend/hooks/use-study-recommendations.ts** (NEW): `useStudyRecommendation()` — TanStack Query wrapping `GET ai/study-recommendations`. Mirrors use-digest.ts naming convention (keys factory + options factory + hook).
- **frontend/hooks/use-multi-course-path.ts** (NEW): `useMultiCoursePath()` — TanStack Mutation wrapping `POST gpa/multi-course-path`; invalidates gpa cache on success (matches useGpaPath pattern).
- **frontend/components/settings/LanguageSection.tsx**: Rule 1 fix — narrowed `handleLanguageChange` parameter from `string` to `LanguageCode` union after my openapi.yaml change tightened `language_preference` from `string` to `en|zh` enum.

### Task 2: Sources, StudyRecCard, MultiCoursePathCard components

- **frontend/components/shared/Sources.tsx** (NEW): Collapsible native `<details>` element with plural-aware summary label, ordered `<ol>` listing each source with inline [N] marker, title, optional anchor, score percentage, and italic excerpt preview. Returns `null` when `sources.length === 0` (no empty shell). All user-controlled strings render as JSX children for React-default escape (T-34-05-01/02/03 XSS mitigation).
- **frontend/components/predict/StudyRecCard.tsx** (NEW): Mirrors RoiCard.tsx visual. 3 states: skeleton (isLoading), empty (`items.length === 0`), active (course color dot + assessment name + course code + weight pill + days-left badge). Imports `getCourseColor` from `@/lib/dashboard/course-colors` (reuses existing 5-course palette).
- **frontend/components/predict/MultiCoursePathCard.tsx** (NEW): 3 states: null-path (Settings empty state), reachable (green badge + required_avg line), unreachable (red badge + suggested_target chip + max_reachable + required_avg when not null). Advisory paragraph HIDDEN when `advisory_text === null` per D-D1 silent fallback. No `<p class="italic">` rendered when advisory empty — verified via test 2.
- **frontend/messages/en.json + zh.json**: Added 6 namespace additions atomically to both files — `shared.sources` (plural label), `predict.studyRec.{title,empty,weight,daysLeft}` (4 keys), `predict.path.{title,empty,reachable,unreachable,requiredAvg,maxReachable}` (6 keys), `settings.gpa.bandChips.{label,pass,credit,distinction,highDistinction}` (5 keys), `settings.gpa.remainingCp.{label,hint,placeholder}` (3 keys), `dashboard.hero.roiFallback` (1 key). All 19 keys present in BOTH locales.
- **Tests flipped (Wave 0 → real bodies)**:
  - `__tests__/hooks/use-ai-stream.test.ts`: 2 real tests pass — sources event parsing + clearMessages reset
  - `__tests__/shared/Sources.test.tsx`: 3 real tests pass — [N]+title+score render, empty returns null, italic excerpt
  - `__tests__/predict/StudyRecCard.test.tsx`: 3 real tests pass — Top-3 + weight pill, empty state, skeleton state
  - `__tests__/predict/MultiCoursePathCard.test.tsx`: 3 real tests pass — reachable badge, advisory hidden on null, unreachable + suggested_target

### Task 3: Page integrations

- **HeroSection.tsx**: Added `mainSuggestion?: string | null` + `top3Items?: [...]` props. Added pure `formatRoiFallbackLine` helper. Implemented 3-stage fallback chain (AI prose > Top-3 ROI > defaultEncouragementProvider). RoughNotation animated highlight only fires on stage 3 (the other stages render plain because their output has no `highlightPhrase`).
- **DashboardPage.tsx**: Imports `useStudyRecommendation`; passes `mainSuggestion={studyRec.data?.data?.main_suggestion ?? null}` + `top3Items={studyRec.data?.data?.top_3 ?? null}` to HeroSection.
- **PredictPage.tsx**: Imports new hooks + new cards. Added `lastFiredPathKey` ref to prevent re-fire of path mutation on unrelated renders. Mounts `<StudyRecCard>` + `<MultiCoursePathCard>` in right-rail portal (after RoiCard).
- **GpaTargetSection.tsx**: Added 4-chip band row above slider (HD 85, D 75, CR 65, P 50 descending). Added `remaining_credit_points` numeric input row below scale reference (min=0, max=500, step=6). `handleSave` now persists BOTH `gpa_target` AND `remaining_credit_points` in a single atomic `useUpdateProfile.mutate` call.
- **AiCourseChat.tsx** + **DeadlineAiChat.tsx**: Destructure `sources` from `useAiStream` return. Wrap message map in `<Fragment>` + render `<Sources sources={sources} />` AFTER the LATEST assistant bubble only (condition: `msg.role === "assistant" && isLatest && sources.length > 0`). Historical assistant messages do NOT carry stale citations.

### Test updates (for Task 3 integrations)

- **__tests__/settings/GpaTargetSection.test.tsx**: Updated mutate assertion to `{ gpa_target: 85, remaining_credit_points: null }` matching new atomic-save payload.
- **__tests__/predict/PredictPage.test.tsx**: Added vi.mock for `use-study-recommendations`, `use-multi-course-path`, `use-user`, and `StudyRecCard`/`MultiCoursePathCard` components (using `createElement` stubs) to prevent the test's global `title`→`"Grade Predictor"` i18n mapping from producing duplicate text nodes when the new cards render.

## Task Commits

| # | Stage | Commit | Files |
|---|-------|--------|-------|
| 1 | RED   | `84fb4f7` (test) | 1 test file (2 tests RED) |
| 1 | GREEN | `13281b3` (feat) | 7 files (2 new + 5 modified) |
| 2 | RED   | `a4418f9` (test) | 3 test files (9 tests RED) |
| 2 | GREEN | `0b9ddfd` (feat) | 6 files (3 new + 3 modified) |
| 3 | GREEN | `425ee67` (feat) | 8 files (page wiring + test updates) |

## Acceptance Criteria

- [x] `openapi.yaml` has `/ai/study-recommendations:` and `/gpa/multi-course-path:` path blocks
- [x] `openapi.yaml` has `StudyCandidate`, `StudyRecommendation`, `MultiCoursePathRequest`, `MultiCoursePath` schemas
- [x] `types.gen.d.ts` regenerated (19 new type references; auto-generated header intact)
- [x] `SSEEvent.event` union has `"sources"` literal + `CitationSource` exported
- [x] `use-ai-stream.ts` has `sources` in state + return value + clearMessages reset
- [x] `use-study-recommendations.ts` exports `useStudyRecommendation`
- [x] `use-multi-course-path.ts` exports `useMultiCoursePath`
- [x] 3 new components + 9 component tests + 2 hook tests — all GREEN
- [x] HeroSection 3-stage fallback chain wired (AI prose > Top-3 ROI > defaultEncouragementProvider)
- [x] DashboardPage imports and uses `useStudyRecommendation`
- [x] PredictPage mounts both `<StudyRecCard>` and `<MultiCoursePathCard>` in right-rail portal
- [x] GpaTargetSection: 4 chips + remaining-cp input + handleSave persisting both fields
- [x] AiCourseChat + DeadlineAiChat integrate Sources panel after LATEST assistant bubble only
- [x] en.json and zh.json have 19 new i18n keys
- [x] All Wave 0 `it.todo()` stubs flipped: `grep -c "it.todo" {4 files}` returns all 0
- [x] `pnpm tsc --noEmit` exits 0
- [x] `pnpm lint` exits 0 (eslint --max-warnings 0)
- [x] No unsafe HTML-injection JSX prop in new components (grep returns 0 matches)
- [x] Sources returns null when empty (verified by Sources test 2)
- [x] MultiCoursePathCard hides advisory paragraph when `advisory_text === null` (verified by test 2)
- [x] `defaultEncouragementProvider` still imported in HeroSection (D-D1 stage-3 fallback)
- [x] No "rule engine" / "fallback mode" user-facing copy leakage (only "degraded" hits are pre-existing setup flow)

## Decisions Made

### 1. types.gen.d.ts regenerated via pnpm generate:types (not hand-edited)

Phase 33 LEARNINGS + `feedback_openapi_contract_drift.md` make this a hard rule. The script exists in package.json as `generate:types: openapi-typescript openapi/openapi.yaml -o lib/api/types.gen.d.ts`. Ran after editing openapi.yaml — exit 0, 19 new type references verified.

### 2. Profile field extensions via OpenAPI spec (not just ExtendedUpdateUserBody)

`useUpdateProfile` already accepts `remaining_credit_points` via the `ExtendedUpdateUserBody` pattern that was established for `language_preference` (hooks/use-user.ts lines 33-39). Backend also already accepts it (`src/schemas/user.py:41`, `src/web/routes/users.py:91-92`). I could have relied on the same Extended pattern for frontend-only work. But contract drift is the Phase 33 LEARNING I'm explicitly avoiding, so I extended openapi.yaml too — User schema gets 2 new fields, PATCH body gets 2 new fields. This makes types.gen.d.ts the single source of truth.

### 3. 3-stage hero fallback, not 2-stage

Plan originally suggested 2-stage (AI prose → defaultEncouragementProvider). I implemented the explicit D-D1 "Top-3 ROI fallback" stage in between, because CONTEXT.md / the planner's acceptance criterion explicitly called it out: `formatRoiFallbackLine || top3Items?.[0]`. Without the intermediate ROI stage, a user who HAS top_3 data but happens to have an empty main_suggestion would see generic encouragement instead of actionable "Focus: COMP3221 — Quiz 3 (15%)" — defeats the purpose of the Top-3 cache existing.

### 4. Stable-input guard on path mutation

The planner flagged WARN-4: "useEffect re-fire on every render". I added `lastFiredPathKey.current = key` guard so the mutation only fires when `(target_wam, remaining_credit_points)` actually changes. `pathMutate` (stable mutation reference) is in deps for exhaustive-deps compliance — the guard ensures no duplicate fires.

### 5. Sources scoped to latest assistant bubble only

Plan explicitly called out the anti-pattern "Sources after EVERY message". I used `i === messages.length - 1 && msg.role === "assistant"` guard — historical assistant messages render WITHOUT the Sources panel. If a user asks Q1 then Q2, the Sources panel for Q1 disappears when Q2 arrives — this is intentional: the citations are ONLY for the current answer.

### 6. Native `<details>` for Sources (no library)

Native HTML `<details>` has built-in keyboard accessibility + focus handling. Zero JS, zero external cost. React-default child escaping covers T-34-05-01/02/03 XSS threats. Used `{s.title}` as JSX child — React escapes `<script>` tags automatically.

### 7. vi.mock component stubs using createElement (not JSX in factory)

`vi.mock()` hoists factory functions above the file's imports. JSX inside a factory doesn't work because the JSX transform expects React to be in scope. Solution: `import { createElement } from "react"` at top of test file + use `createElement("div", {...})` inside mock factories. Cleaner than `require()` (not always available in ESM vitest) and cleaner than `/** @jsxImportSource react */` pragma hacks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `language_preference` enum tightening broke LanguageSection.tsx**
- **Found during:** Task 1 tsc check
- **Issue:** My openapi.yaml change tightened the PATCH body's `language_preference` from generic `string` to `"en" | "zh"` union. LanguageSection.tsx was passing `string` (from LANGUAGE_OPTIONS) to the mutation — tsc flagged `Type 'string' is not assignable to type '"en" | "zh" | undefined'` on line 36.
- **Fix:** Added `LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["value"]` type alias + narrowed `handleLanguageChange` parameter from `(lang: string)` to `(lang: LanguageCode)`. LANGUAGE_OPTIONS is `as const` so this is a safe narrowing — no runtime behavior change.
- **Files modified:** `frontend/components/settings/LanguageSection.tsx`
- **Committed in:** `13281b3` (Task 1 GREEN)

**2. [Rule 1 - Bug] Sources test lookup failed on split text nodes**
- **Found during:** Task 2 first GREEN vitest run (1/9 failed)
- **Issue:** `screen.getByText("Lecture 1")` failed because React testing lib's default `getByText` matches the whole element text content. The `<li>` has `[1] Lecture 1 · Slide 8 92%` as concatenated children, not a pure "Lecture 1" text node.
- **Fix:** Changed to regex-based match `getByText(/Lecture 1/)` which matches the fragment within the compound text.
- **Files modified:** `frontend/__tests__/shared/Sources.test.tsx`
- **Committed in:** `0b9ddfd` (Task 2 GREEN)

**3. [Rule 1 - Bug] GpaTargetSection.test.tsx save assertion stale after atomic-save change**
- **Found during:** Task 3 full vitest run
- **Issue:** Pre-existing test asserted `mutate({ gpa_target: 85 })` but my Task 3 code changes payload to `mutate({ gpa_target: 85, remaining_credit_points: null })` for atomic save. Test is inherited from Phase 12 — legitimate regression from my scope.
- **Fix:** Updated assertion to include `remaining_credit_points: null` (mockUser has no `remaining_credit_points` → initial state is "" → payload sends null).
- **Files modified:** `frontend/__tests__/settings/GpaTargetSection.test.tsx`
- **Committed in:** `425ee67` (Task 3)

**4. [Rule 1 - Bug] PredictPage.test.tsx "Found multiple elements: Grade Predictor"**
- **Found during:** Task 3 full vitest run
- **Issue:** The existing test file's `useTranslations` mock maps any `title` key to `"Grade Predictor"` globally. My new `StudyRecCard` and `MultiCoursePathCard` also call `t("title")` → all 3 cards render `"Grade Predictor"` text, breaking 3 pre-existing `screen.getByText("Grade Predictor")` assertions.
- **Fix:** Added vi.mock for `use-study-recommendations`, `use-multi-course-path`, `use-user` (safe return stubs) + stubbed `StudyRecCard`/`MultiCoursePathCard` components using `createElement("div", {"data-testid": "..."})`. New cards now render as empty-testid stubs in this test, preserving the pre-existing title assertion. Imported `createElement` from `react` at the top of the test file.
- **Files modified:** `frontend/__tests__/predict/PredictPage.test.tsx`
- **Committed in:** `425ee67` (Task 3)

**5. [Rule 3 - Blocking] frontend node_modules missing**
- **Found during:** First vitest command after plan start
- **Issue:** `pnpm vitest run` failed with `Command "vitest" not found` — node_modules not installed in this worktree.
- **Fix:** Ran `pnpm install` once (7.6s). All subsequent commands worked.
- **Files modified:** None (node_modules/ is gitignored).

---

**Total deviations:** 5 auto-fixes. 4 Rule 1 (regression from own changes — language enum, Sources text matcher, GpaTargetSection test, PredictPage test). 1 Rule 3 (blocking install). No Rule 4 (architectural) — everything was scoped to the plan's surface.

## Issues Encountered

- **5 pre-existing test files fail on `next-intl` context setup** (SetupGuard, CourseDetailPage, DeadlineCard, DeadlinesPage, AppShell — 23 tests total). Verified pre-existing by stashing Task 3 changes and re-running: **same 5 files fail with same 23 tests pre-and-post Task 3**. Per CLAUDE.md SCOPE BOUNDARY rule, these are out of scope. Candidate for a future hardening plan.
- **PreToolUse:Edit / PreToolUse:Write hook advisories** fired repeatedly after successful edits/writes. Each edit/write succeeded — hooks appear advisory, not blocking. Documented in prior Phase 34 summaries.

## Known Stubs

None — all code paths are wired end-to-end:
- Hero uses real `useStudyRecommendation` data with 3-stage fallback
- StudyRecCard renders real `studyRec.data.top_3` slice (or empty state for new users)
- MultiCoursePathCard renders real `pathMutation.data` (or null-state for no-cp-configured users)
- Sources renders real `useAiStream().sources` populated from SSE event
- GpaTargetSection saves real `remaining_credit_points` via real `useUpdateProfile`
- i18n keys populate bilingually (en + zh) — no placeholder copy

`sources.length === 0` hiding the panel is **intentional production state** (non-RAG fallback paths don't produce sources), NOT a stub. `advisory_text === null` hiding the paragraph is **D-D1 silent fallback contract**, NOT a stub.

## Deferred Issues

1. **5 pre-existing test files fail on next-intl context setup** — inherited from main branch, not introduced by this plan. 23 tests total. Candidate: add `NextIntlClientProvider` wrapper fixture to those test setups in a future hardening plan.
2. **tests/integration/test_rag_real_data.py** — remains env-gated skipif (per 34-04 Summary). This plan does not touch it; intentional per the execution prompt's `<success_criteria>` note.

## User Setup Required

None for frontend — types regenerated at build time, all env vars inherited from prior phases.

## Cross-reference

- **Phase 34 all requirements closed by this plan's landing**: AIFEAT-01 (Dashboard hero + StudyRecCard surface the daily cached main_suggestion + Top-3 ROI), AIFEAT-02 (SSE sources event consumed by useAiStream; Sources panel rendered in AI chats with [N] citations), AIFEAT-03 (MultiCoursePathCard renders path verdict + advisory; GpaTargetSection captures remaining_credit_points).
- **Next steps per plan `<output>`:** `/gsd-code-review 34` + `/gsd-verify-work 34`. Phase 34 ready for review.

## Next Phase Readiness

- **Phase 34 complete** — no outstanding frontend work. Code review + UAT verification are the remaining orchestrator steps.
- **Backend unchanged by this plan** — all backend contracts (from 34-02/03/04) consumed unchanged.

---

*Phase: 34-ai-features-live*
*Plan: 34-05*
*Completed: 2026-04-17*

## Self-Check: PASSED

- `frontend/hooks/use-study-recommendations.ts` — FOUND
- `frontend/hooks/use-multi-course-path.ts` — FOUND
- `frontend/components/shared/Sources.tsx` — FOUND
- `frontend/components/predict/StudyRecCard.tsx` — FOUND
- `frontend/components/predict/MultiCoursePathCard.tsx` — FOUND
- `.planning/phases/34-ai-features-live/34-05-SUMMARY.md` — FOUND
- Commit `84fb4f7` (test Task 1 RED) — FOUND in `git log`
- Commit `13281b3` (feat Task 1 GREEN) — FOUND in `git log`
- Commit `a4418f9` (test Task 2 RED) — FOUND in `git log`
- Commit `0b9ddfd` (feat Task 2 GREEN) — FOUND in `git log`
- Commit `425ee67` (feat Task 3) — FOUND in `git log`
- All 4 Wave 0 `it.todo` stubs flipped: `grep -c "it.todo"` returns 0 on all 4 test files
- 11 new frontend tests pass (2 hook + 3 Sources + 3 StudyRecCard + 3 MultiCoursePathCard)
- Existing GpaTargetSection.test.tsx (5 tests) + PredictPage.test.tsx (9 tests) updated to accommodate new atomic-save payload and new card mounts — all 14 pass
- `pnpm tsc --noEmit` exits 0
- `pnpm lint` exits 0 (eslint --max-warnings 0)
- `pnpm vitest run`: 56/61 files pass with 417/514 tests green (+ 74 todo reserved for future plans). 5 pre-existing intl-context failures unchanged by this plan (out of scope per CLAUDE.md).
- `openapi.yaml` + `types.gen.d.ts` regenerated (not hand-edited) — auto-generated header intact; 19 new type references verified via grep.
