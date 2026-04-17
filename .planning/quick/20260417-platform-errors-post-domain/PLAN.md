---
name: platform-errors-post-domain
slug: platform-errors-post-domain
date: 2026-04-17
type: quick
status: in-progress
branch: fix/platform-errors-post-domain
---

## Observed problems after uniboard.uk rollout

1. **Supabase Auth Site URL** was still `uni-board-tau.vercel.app` → Google login landed on vercel.app instead of uniboard.uk (one 404 mid-flow)
2. **`GET /api/v1/courses/{id}/deadlines` → 500** on 3 of 4 courses (`INTERNAL_ERROR`)
3. **`ed_course_id` = NULL** for every course → Ed sync loop short-circuits, UI shows empty
4. **Platform feels slow** — deadlines 500 retries x6 + `/digest/latest` 404 polling

## Root causes

### A. Supabase Auth config
- `SITE_URL` + `URI_ALLOW_LIST` still keyed on `uni-board-tau.vercel.app`
- Code uses `${window.location.origin}/auth/callback` but `/auth/callback` was not in the allowed redirect list → Supabase falls back to Site URL after OAuth

### B. Deadlines 500 — naive vs tz-aware datetime
- `UnifiedDeadline.due_date` is `DateTime(timezone=True)` (tz-aware)
- `src/web/routes/courses.py:265`, `src/web/routes/deadlines.py:138`, `src/services/deadline.py:154` use `datetime.utcnow()` (naive)
- Subtraction / comparison raises `TypeError: can't subtract offset-naive and offset-aware datetimes`
- Comments say "match TIMESTAMP WITHOUT TIME ZONE column" — misleading, schema is tz-aware

### C. Ed linking — data-shape mismatch (defer)
- Ed `/api/user` returns `{"courses": [{"course": {"code": "STAT2011", "year": "2026", "session": "Semester 1"}, "role": ...}]}`
- `link_courses` does `ec.get("name")` / `ec.get("id")` on the outer dict → always falls through to "no semester" branch, never populates `ed_course_id`
- Plus: Canvas course names lack semester pattern so `extract_semester(canvas_name)` returns None; linking logic's code-only fallback only triggers when Canvas has a semester
- **Scope note:** Deferred to a follow-up PR because fixing needs a round of actual e2e verification with user's real Ed account

### D. "localhost:3001" in network log
- Not in production code — confirmed by grep. Came from stale dev-tab timing or browser extension. Not a bug to fix here.

### E. `/digest/latest` 404
- Expected for new users with no digest generated yet. Frontend should treat 404 as "no data" (it does — the 404 is noise, not an error)

## Fixes shipped in this PR

1. `src/web/routes/courses.py` — `datetime.now(UTC)` + drop misleading comment
2. `src/web/routes/deadlines.py` — same fix for `/upcoming`
3. `src/services/deadline.py` — same fix for `include_past=False` filter

## Already resolved outside this PR

- Supabase Site URL + redirect URLs patched via Management API (session-cookie token) earlier in the session

## Not fixed here (tracked for follow-up)

- Ed course linking data-shape / Canvas-without-semester fallback
- `/digest/latest` frontend: consider silencing the 404 noise

## Verification

- Re-call `GET /api/v1/courses/{id}/deadlines` for COMP2017/MATH2021/STAT2011 → expect 200 with data array
- Dashboard stops flooding with 500 retries → perceived latency drops
