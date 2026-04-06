---
phase: 30-bff-proxy-conversion
plan: 02
subsystem: api
tags: [bff, proxy, route-handlers, sse, courses, gpa, alerts]

requires:
  - phase: 30-bff-proxy-conversion
    plan: 01
    provides: proxyRequest() shared BFF utility
provides:
  - 13 Route Handlers converted from mock fixtures to backend proxy
  - Courses domain (7 GET + 2 SSE stream) fully proxied
  - GPA domain (1 GET + 2 POST) fully proxied
  - Alerts domain (1 GET) fully proxied
affects: [30-03-PLAN]

tech-stack:
  added: []
  patterns: [proxy-route-handler, sse-streaming-passthrough, post-body-forwarding]

key-files:
  created: []
  modified:
    - frontend/app/api/v1/courses/route.ts
    - frontend/app/api/v1/courses/[id]/route.ts
    - frontend/app/api/v1/courses/[id]/grades/route.ts
    - frontend/app/api/v1/courses/[id]/deadlines/route.ts
    - frontend/app/api/v1/courses/[id]/outline/route.ts
    - frontend/app/api/v1/courses/[id]/materials/route.ts
    - frontend/app/api/v1/courses/[id]/discussions/route.ts
    - frontend/app/api/v1/courses/[id]/qa/stream/route.ts
    - frontend/app/api/v1/courses/[id]/review/stream/route.ts
    - frontend/app/api/v1/gpa/route.ts
    - frontend/app/api/v1/gpa/predict/route.ts
    - frontend/app/api/v1/gpa/path/route.ts
    - frontend/app/api/v1/alerts/route.ts

key-decisions:
  - "Dynamic param routes use backendPath override to construct /api/v1/courses/${id}/... paths"
  - "SSE streaming routes (qa/stream POST, review/stream GET) use stream: true option"
  - "POST routes read body via request.text() for format-agnostic forwarding"
  - "Query params (semester, source, filter, cursor, limit, lang) forwarded automatically by proxyRequest URL construction"

patterns-established:
  - "Proxy route pattern: import NextRequest + proxyRequest, 3-6 lines per handler"
  - "Dynamic param routes: await params, pass backendPath with interpolated id"
  - "SSE POST routes: read body with request.text(), pass body + stream: true"

requirements-completed: [BFF-01, BFF-02]

duration: 3min
completed: 2026-04-06
---

# Phase 30 Plan 02: Courses, GPA & Alerts Route Conversion Summary

**13 Route Handlers converted from mock fixtures to proxyRequest calls -- courses domain (9), GPA (3), alerts (1), zero fixture imports remaining**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-06T05:02:40Z
- **Completed:** 2026-04-06T05:05:49Z
- **Tasks:** 2/2
- **Files modified:** 13

## Accomplishments
- Converted all 9 courses-domain Route Handlers from mock fixtures to proxyRequest proxy calls
- Converted 3 GPA Route Handlers (GET report, POST predict, POST path) to proxy
- Converted 1 alerts Route Handler (GET) to proxy
- SSE streaming routes (qa/stream POST, review/stream GET) use stream: true for passthrough
- POST routes (qa/stream, gpa/predict, gpa/path) forward body via request.text()
- Query params (semester, source, filter, cursor, limit, lang) forwarded automatically
- Zero fixture imports remain in courses/, gpa/, alerts/ route directories
- TypeScript compilation clean for all converted route files

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert courses domain routes (9 files)** - `42ec4be` (feat) - 7 GET + 2 SSE stream routes
2. **Task 2: Convert GPA and alerts routes (4 files)** - `c2e8b48` (feat) - 3 GPA + 1 alerts route

## Files Modified
- `frontend/app/api/v1/courses/route.ts` - GET courses list (simple proxy)
- `frontend/app/api/v1/courses/[id]/route.ts` - GET course detail (dynamic param)
- `frontend/app/api/v1/courses/[id]/grades/route.ts` - GET course grades (dynamic param)
- `frontend/app/api/v1/courses/[id]/deadlines/route.ts` - GET course deadlines (dynamic param)
- `frontend/app/api/v1/courses/[id]/outline/route.ts` - GET course outline (dynamic param)
- `frontend/app/api/v1/courses/[id]/materials/route.ts` - GET course materials (dynamic param, source query)
- `frontend/app/api/v1/courses/[id]/discussions/route.ts` - GET discussions (dynamic param, pagination query)
- `frontend/app/api/v1/courses/[id]/qa/stream/route.ts` - POST SSE streaming (body + stream: true)
- `frontend/app/api/v1/courses/[id]/review/stream/route.ts` - GET SSE streaming (stream: true)
- `frontend/app/api/v1/gpa/route.ts` - GET GPA report (simple proxy)
- `frontend/app/api/v1/gpa/predict/route.ts` - POST GPA prediction (body forwarding)
- `frontend/app/api/v1/gpa/path/route.ts` - POST GPA path (body forwarding)
- `frontend/app/api/v1/alerts/route.ts` - GET alerts (simple proxy)

## Decisions Made
- Dynamic param routes use `backendPath` override to construct `/api/v1/courses/${id}/...` paths since proxyRequest defaults to the incoming request URL pathname
- SSE streaming routes use `stream: true` option for passthrough Response with text/event-stream headers
- POST routes read body via `request.text()` (not `request.json()`) for format-agnostic forwarding
- Query params forwarded automatically by proxyRequest's URL construction (appends `url.search`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing test failures in CourseDetailPage, DeadlineCard, DeadlinesPage (3 test files, 15 tests) -- unrelated to route conversion, out of scope per deviation boundary rules.

## Known Stubs

None - all 13 routes are production-ready proxy calls.

## Next Phase Readiness
- Plan 02 routes complete; Plan 03 can proceed with remaining route domains (auth, tokens, sync, search, etc.)
- proxyRequest pattern proven across all route types: simple GET, dynamic params, POST with body, SSE streaming

## Self-Check: PASSED

- [x] frontend/app/api/v1/courses/route.ts contains proxyRequest
- [x] frontend/app/api/v1/courses/[id]/qa/stream/route.ts contains stream: true
- [x] frontend/app/api/v1/courses/[id]/review/stream/route.ts contains stream: true
- [x] frontend/app/api/v1/gpa/predict/route.ts contains request.text()
- [x] frontend/app/api/v1/alerts/route.ts contains proxyRequest
- [x] Zero fixture imports in courses/, gpa/, alerts/ directories
- [x] Commit 42ec4be exists
- [x] Commit c2e8b48 exists

---
*Phase: 30-bff-proxy-conversion*
*Completed: 2026-04-06*
