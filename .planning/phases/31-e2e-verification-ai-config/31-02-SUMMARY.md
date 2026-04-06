---
phase: 31-e2e-verification-ai-config
plan: 02
subsystem: ai
tags: [sse, bff-proxy, ai-config, railway, api-guard]

# Dependency graph
requires:
  - phase: 30-bff-proxy-conversion
    provides: BFF proxy routes for AI SSE streaming endpoints
  - phase: 19
    provides: AI route handlers and SSE streaming infrastructure
provides:
  - SSE streaming via BFF proxy (no direct Railway calls from browser)
  - AI API key guard returning 503 when not configured
  - ANTHROPIC_API_KEY configured in Railway production environment
affects: [34-ai-features-live]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BFF-only SSE streaming: client uses relative /api/v1/ URLs, never NEXT_PUBLIC_API_URL"
    - "AI availability guard: _require_ai_configured() returns 503 before engine creation"

key-files:
  created: []
  modified:
    - frontend/hooks/use-ai-stream.ts
    - frontend/components/course-detail/UnitReviewSection.tsx
    - src/web/routes/ai.py

key-decisions:
  - "Remove NEXT_PUBLIC_API_URL from client-side SSE code — all AI requests route through BFF proxy"
  - "Use 503 Service Unavailable (not 500) when API key missing — matches existing health endpoint pattern"
  - "VOYAGE_API_KEY optional — Q&A works without it via direct context approach"

patterns-established:
  - "AI route guard pattern: call _require_ai_configured() at top of each AI endpoint"
  - "SSE always through BFF: never expose Railway URL to browser"

requirements-completed: [AICONF-01, AICONF-02]

# Metrics
duration: 8min
completed: 2026-04-06
---

# Phase 31 Plan 02: SSE Dual-Path Fix & AI Configuration Summary

**AI SSE streaming routes through BFF proxy consistently; AI endpoints return 503 when API key not configured; ANTHROPIC_API_KEY set in Railway production**

## What Changed

### Task 1: Fix SSE dual-path and add AI API key guard (automated)

**use-ai-stream.ts**: Removed `process.env.NEXT_PUBLIC_API_URL || ""` fallback. SSE now always uses relative URL `/api/v1/courses/${courseId}/qa/stream`, routing through the Next.js BFF proxy.

**UnitReviewSection.tsx**: Same fix — removed direct Railway URL construction for unit review streaming. Now uses `/api/v1/courses/${courseId}/review/stream`.

**ai.py**: Added `_require_ai_configured()` helper that checks `settings.anthropic_api_key`. All 4 AI route handlers (`/qa/stream`, `/review/stream`, `/digest/generate`, `/qa`) call this guard first. Returns HTTP 503 with JSON body `{"detail": "AI features are not configured. Please set ANTHROPIC_API_KEY."}` when key is empty.

### Task 2: Configure Railway environment variables (human checkpoint)

User configured `ANTHROPIC_API_KEY` in Railway dashboard. Railway auto-redeployed.

## Deviations

None — executed as planned.

## Self-Check: PASSED

- [x] `use-ai-stream.ts` contains `/api/v1/courses/` (relative URL, no NEXT_PUBLIC_API_URL)
- [x] `UnitReviewSection.tsx` contains `/api/v1/courses/` (relative URL)
- [x] `ai.py` contains `_require_ai_configured` guard function
- [x] `ai.py` contains `status_code=503` for missing API key
- [x] ANTHROPIC_API_KEY configured in Railway (confirmed by user)
