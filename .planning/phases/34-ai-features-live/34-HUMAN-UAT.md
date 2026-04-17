---
status: complete
phase: 34-ai-features-live
source: [34-VERIFICATION.md]
started: 2026-04-17T06:30:00Z
updated: 2026-04-17T07:30:00Z
---

## Current Test

[all tests complete]

## Tests

### 1. Dashboard hero renders study recommendation main_suggestion
expected: Dashboard /en shows AI-generated "today's focus" line replacing static greeting when main_suggestion is non-empty
result: pass — hero shows "Focus the next 3 hours on the COMP3222 Project -- 40% weight, due in 45 days..." in italic under the "Good afternoon," greeting. GET /api/v1/ai/study-recommendations → 200 with seeded cache row.
evidence: /tmp/uniboard-uat/08-dashboard-full.png

### 2. Predict page Top-3 list display
expected: Predict page /en/predict right rail mounts <StudyRecCard> showing Top-3 ranked assessments
result: pass — StudyRecCard renders "Today's focus" with 3 rows: Project (COMP3222 40% weight, 45 days left), Final Exam (COMP2123 45% weight, 59 days left), Sprint 2 (SOFT2412 30% weight, 29 days left).
evidence: /tmp/uniboard-uat/14-studyrec-closeup.png

### 3. Predict page MultiCoursePathCard verdict rendering
expected: After user saves remaining_credit_points, MultiCoursePathCard auto-fires mutation and renders verdict badge
result: pass — card renders "Multi-course path / Reachable / Need avg 0.0 across remaining 48 cp" (already-met branch — current WAM 79.4 ≥ target 75, so remaining avg can be 0). POST /api/v1/gpa/multi-course-path → 200.
evidence: /tmp/uniboard-uat/15-multicourse-card.png

### 4. Settings GpaTargetSection 4-band chips + remaining_credit_points input + atomic save
expected: Settings /en/settings shows 4 quick-pick chips + remaining_credit_points field; Save persists both atomically
result: pass — HD 85 / D 75 / CR 65 / P 50 chips visible. Clicking HD 85 updates slider + numeric input to 85 + display to "85.0". Save Target triggers PATCH /api/v1/users/me → 200, DB shows gpa_target=85 + remaining_credit_points=72 in single atomic commit.
evidence: /tmp/uniboard-uat/17-settings.png

### 5. Sources panel collapse/expand UX
expected: AI chat renders <details> Sources panel below latest assistant bubble
result: pass — after SSE "sources" event delivers 2 CitationSource objects, <details summary="2 sources"> renders with title + score % + excerpt per source. det.open toggles body visibility.
evidence: /tmp/uniboard-uat/20-sources-open.png, /tmp/uniboard-uat/21-sources-collapsed.png
caveat: exercised via mocked SSE fetch interceptor (no VOYAGE_API_KEY in local .env for real embeddings); backend code paths verified independently in REVIEW + VERIFICATION.

### 6. Inline [N] citation markers in AI answer
expected: AI answer body contains inline [1], [2], etc. markers corresponding to Sources panel entries
result: pass — streamed answer rendered "weights the Lab Report at 15% [1] and Project at 40% [2]" with markers visible.
evidence: /tmp/uniboard-uat/20-sources-open.png
caveat: same mocked-SSE caveat as UAT 5.

### 7. Dashboard hero 3-stage fallback chain live
expected: Stage 1 = AI prose; Stage 2 = formatted ROI fallback from top_3; Stage 3 = defaultEncouragementProvider
result: pass (all 3 stages exercised via DB state manipulation):
  - Stage 1 (main_suggestion populated): "Focus the next 3 hours on the COMP3222 Project..."
  - Stage 2 (main_suggestion='', top_3 populated): "Focus: COMP3222 — Project (40%)"
  - Stage 3 (no cache row): "The COMP2017 lab and the stats quiz are done and behind you now..."
evidence: /tmp/uniboard-uat/08-dashboard-full.png (stage 1), /tmp/uniboard-uat/22-hero-stage2.png (stage 2)

### 8. Daily APScheduler 7am AEST cron fires in production
expected: After Railway deploy, next day 07:00 AEST the generate_study_recommendations_daily job UPSERTs one row per user
result: deferred — requires prod deploy + 1 real day of observation. Local APScheduler registration verified (src/sync/engine.py + src/sync/scheduled.py, timezone="Australia/Sydney", max_instances=1).

### 9. Hot-set embedding worker fires every 30 min in production
expected: After Railway deploy, embed_hot_courses_worker runs every 30 min; structlog emits worker_done; Sentry voyage_usage context logged
result: deferred — requires prod deploy + Railway logs / Sentry dashboard access. Local APScheduler registration verified (IntervalTrigger(minutes=30)).

### 10. Real-data RAG harness end-to-end
expected: With RAG_REAL_DATA_COURSE_ID + RAG_REAL_DATA_BEARER env vars set, SSE stream returns sources event
result: deferred — requires env vars + live course with synced materials + Voyage embeddings. Not blocking since UAT 5/6 exercised rendering via mocked SSE.

### 11. Settings remaining_credit_points PATCH/GET round-trip
expected: User enters value, saves, page refresh reloads same value
result: pass — entered 72 in input (was 48), clicked Save Target → PATCH /api/v1/users/me → 200, DB shows remaining_credit_points=72; page reload, input reads back "72".
evidence: verified via DB query + agent-browser input value inspection after reload.

## Summary

total: 11
passed: 8
issues: 0
pending: 0
skipped: 0
deferred: 3 (items 8, 9, 10 — production observation / env-gated)
blocked: 0

## Gaps

### Frontend BFF proxy missing for Phase 34 AI endpoints

**Discovered during UAT:** `GET /api/v1/ai/study-recommendations` and `POST /api/v1/gpa/multi-course-path` returned 404 from the Next.js app because BFF proxy route handlers were never created. Plan 34-05 covered OpenAPI spec + types + hooks + components but did not add the proxy route files alongside them.

**Status:** resolved — added two Next.js route files mirroring the existing `/api/v1/gpa/path/route.ts` pattern, committed as `fix(34): add missing BFF proxy routes for /ai/study-recommendations and /gpa/multi-course-path` (6b40494). tsc clean, UAT 1-3 subsequently passed.

**Root cause:** the code review + verifier checked backend code and frontend component wiring but did not enumerate the Next.js `app/api/v1/` proxy layer introduced by Phase 30. Future phases touching new API endpoints should validate BFF coverage in PATTERNS.md / plan frontmatter.

## Local UAT Environment Setup (for future reruns)

1. local Supabase running (`supabase start`) with all 8 migrations applied via `supabase db reset --local`
2. recreate admin user in auth.users with known password + empty-string token fields (see /tmp/uniboard-uat/session.json flow)
3. seed profile: tokens valid, gpa_target=75, remaining_credit_points=48
4. seed 3 courses + 4 grades + 3 deadlines + 1 study_recommendation_cache row with Phase 34-shaped top_3 (weight 0-1, include score)
5. swap backend .env DATABASE_URL from `localhost:5432/uniboard_dev` → `localhost:54322/postgres` (local Supabase postgres)
6. restart uvicorn
7. inject fresh Supabase session cookie into Chrome via `document.cookie = 'sb-127-auth-token=base64-...'`

.env backed up to /tmp/uniboard-uat/.env.backup — restore if reverting DATABASE_URL change.
