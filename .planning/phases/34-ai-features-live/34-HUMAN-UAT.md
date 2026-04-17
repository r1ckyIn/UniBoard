---
status: partial
phase: 34-ai-features-live
source: [34-VERIFICATION.md]
started: 2026-04-17T06:30:00Z
updated: 2026-04-17T06:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Dashboard hero renders study recommendation main_suggestion
expected: Dashboard /dashboard shows AI-generated "today's focus" line replacing static greeting when main_suggestion is non-empty; falls back to Top-3 ROI derivation when main_suggestion empty; falls back to defaultEncouragementProvider when no top_3 either (3-stage D-D1 chain)
result: [pending]

### 2. Predict page Top-3 list display
expected: Predict page /predict right rail mounts <StudyRecCard> showing Top-3 ranked assessments with course color dots, assessment name, course code, weight %, and days-left badge (matches RoiCard visual)
result: [pending]

### 3. Predict page MultiCoursePathCard verdict rendering
expected: After user saves remaining_credit_points in Settings, MultiCoursePathCard auto-fires mutation and renders: green "Reachable" badge + required_avg line when achievable; red "Unreachable" badge + suggested_target chip + max_reachable when unreachable; advisory paragraph hidden when advisory_text === null (D-D1)
result: [pending]

### 4. Settings GpaTargetSection 4-band chips + remaining_credit_points input + atomic save
expected: Settings /settings shows 4 quick-pick chips (P 50 / CR 65 / D 75 / HD 85) above existing slider; remaining_credit_points numeric input below; clicking Save persists BOTH gpa_target AND remaining_credit_points in a single useUpdateProfile mutation; values reload on page refresh via /users/me
result: [pending]

### 5. Sources panel collapse/expand UX
expected: When user asks question in AI chat (course detail or deadline pages), a collapsible <details> "Sources" panel renders below the LATEST assistant bubble only when sources.length > 0; clicking the summary toggles open/close; shows ordered list of cited sources with inline [N] marker, title (or source_type fallback for legacy mixed rows), optional anchor, score %, italic excerpt preview
result: [pending]

### 6. Inline [N] citation markers in AI answer
expected: AI streaming answer body contains inline [1], [2], etc. markers that visually correspond to Sources panel entries; markers arrive in token stream AFTER sources event has populated the panel
result: [pending]

### 7. Dashboard hero 3-stage fallback chain live
expected: Stage 1 (main_suggestion populated) shows AI prose; Stage 2 (main_suggestion empty, top_3 populated) shows formatted ROI fallback line; Stage 3 (no main_suggestion, no top_3) shows defaultEncouragementProvider with RoughNotation highlight animation
result: [pending]

### 8. Daily APScheduler 7am AEST cron fires in production
expected: After Railway deploy, next day 07:00 Australia/Sydney the generate_study_recommendations_daily job UPSERTs one row per user into study_recommendation_cache; verify via Supabase SQL: `SELECT COUNT(*) FROM study_recommendation_cache WHERE generated_for_date = CURRENT_DATE`
result: [pending]

### 9. Hot-set embedding worker fires every 30 min in production
expected: After Railway deploy, embed_hot_courses_worker runs every 30 minutes; structlog emits embed_hot_courses_worker_done events; Sentry voyage_usage context logged per successful embed. Verifiable in Railway logs + Sentry dashboard
result: [pending]

### 10. Real-data RAG harness end-to-end
expected: With RAG_REAL_DATA_COURSE_ID + RAG_REAL_DATA_BEARER env vars set, running `uv run pytest tests/integration/test_rag_real_data.py` opens SSE stream to /api/v1/courses/{id}/qa/stream, parses "sources" event, asserts len(sources) >= 1, each source has source_id/source_type and score in [0, 1]
result: [pending]

### 11. Settings remaining_credit_points PATCH/GET round-trip
expected: User enters 48 in remaining_credit_points input, clicks Save; wait for 200 response; refresh page; value reloads as 48 (verifies UserUpdateRequest accepts -> update_profile applies -> UserResponse returns -> frontend reads)
result: [pending]

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0
blocked: 0

## Gaps
