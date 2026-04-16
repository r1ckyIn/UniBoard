---
phase: 34
reviewers: [gemini]
reviewed_at: 2026-04-16T10:55:00Z
plans_reviewed: [34-00-PLAN.md, 34-01-PLAN.md, 34-02-PLAN.md, 34-03-PLAN.md, 34-04-PLAN.md, 34-05-PLAN.md]
---

# Cross-AI Plan Review — Phase 34

## Gemini Review

# Plan Review: UniBoard Phase 34 — AI Features Live

This review covers implementation plans **34-00** through **34-05** for the "AI Features Live" phase.

## 1. Summary
The implementation plan for Phase 34 is exceptionally robust, demonstrating a deep understanding of the existing codebase and a "test-first" engineering mindset. It successfully transitions AI capabilities from infrastructure to user-facing value by implementing daily cached study recommendations, a production-ready RAG pipeline with citations, and a multi-course GPA path planner. The plan effectively mitigates cost risks (Voyage AI tokens) through a "hot-set" embedding strategy and ensures high availability via rule-based fallbacks (D-D1). The dependency ordering is logical, and the use of the Wave 0 RED-state pattern provides a solid foundation for parallel development.

## 2. Strengths
*   **Test-Driven Foundation:** Wave 0 (34-00) scaffolds all test files upfront, ensuring that acceptance criteria are automated before implementation code is written.
*   **Precision Math:** Plan 34-03 correctly identifies the risks of floating-point drift in GPA calculations and mandates the use of `Decimal` with `ROUND_HALF_UP` at boundaries, preserving the project's "GPA maximization" accuracy.
*   **Cost & Performance Optimization:** The "hot-set" embedding worker (34-04) is well-designed to only embed courses accessed in the last 7 days, significantly reducing Voyage AI token consumption without sacrificing UX for active users.
*   **Observability:** Consistent use of `sentry_phase_scope("34")` and feature-specific tags ensures that the "silent fallbacks" requested by the user are visible to developers for debugging.
*   **Contract Integrity:** The plan mandates `openapi.yaml` updates and type regeneration before frontend implementation, preventing the "contract drift" identified in previous phase learnings.
*   **Edge Case Coverage:** Explicit handling for `cp_remain == 0`, already-achieved targets, and unreachable goals (suggesting next-best band) demonstrates a user-centric "dead-end-safe" design.

## 3. Concerns
*   **Profile Update Schema:** (**MEDIUM**) Plan 34-01 adds `remaining_credit_points` to the DB and ORM model, but does not explicitly mention updating the Pydantic `ProfileUpdate` schema (likely in `src/schemas/user.py`). Without this, the frontend `useUpdateProfile` call in Plan 34-05 may fail to persist the new field.
*   **Study Recommendation Staleness:** (**LOW**) The plan specifies a 7am daily cache for recommendations. If a user completes a major high-weight assessment at 10am, the "Today's Focus" will remain on that completed task until the next day. While acceptable per the "no objective ground truth" decision, it may occasionally feel "laggy" to high-velocity users.
*   **SSE Parser Resilience:** (**LOW**) Plan 34-05 Task 1 extends the `SSEEvent` union. Ensure the frontend parser in `ai-stream.ts` is verified to handle the `sources` event arrival even if it's interleaved or repeated by a proxy (BFF).
*   **Rate Limit Thresholds:** (**LOW**) The `/ai/study-recommendations` endpoint is set to 60/minute (34-02). While safe, it is significantly higher than the 10/minute for path planning. Ensure this doesn't become a vector for database scraping if usage grows.

## 4. Suggestions
*   **Explicit Schema Update:** Update the `ProfileUpdate` Pydantic schema in Plan 34-01 to include `remaining_credit_points: int | None`. This ensures the existing `PATCH /profile` logic picks up the new field automatically.
*   **Local UI Invalidation:** In `GpaTargetSection.tsx` (Plan 34-05), consider adding a small "Assessment recently completed?" hint if the Study Recommendation doesn't match the user's recent actions, or allow a manual cache-bust for power users.
*   **Voyage Header Check:** In Plan 34-04 (Worker), consider logging the current token usage headers from Voyage responses to Sentry as `extra` data to help monitor usage tiers in production.
*   **Math Guard:** In `calculate_multi_course_path` (Plan 34-03), explicitly guard against division by zero if `cp_remain` somehow passes Pydantic validation as 0 (handled in logic, but worth a specific unit test).

## 5. Risk Assessment
**Overall Risk: LOW**

### Justification:
The plan is highly procedural and relies on proven patterns (Digests for Study Recs, GPA math for Path Planner). The most complex technical task — the RAG pipeline — is an extension of an existing, verified service rather than a new implementation. The risk of breaking existing features is minimized by the use of new endpoints and nullable columns. The primary risk is simple integration "wiring" issues (e.g., missing a schema field), which the robust test suite in Wave 0 is designed to catch immediately.

---
**Reviewer:** Gemini CLI
**Date:** 2026-04-16
**Verdict:** APPROVED for execution.

---

## Consensus Summary

> Single-reviewer session (Gemini only). No cross-reviewer consensus applicable.

### Key Findings

- **MEDIUM concern:** Plan 34-01 adds `remaining_credit_points` to DB + ORM but does NOT update the `ProfileUpdate` Pydantic schema (`src/schemas/user.py`). Frontend `useUpdateProfile` will fail silently for the new field.
- **LOW concern:** Study recommendation staleness — 7am cache invalidation means completed assessments won't update hero until next day. Acceptable per D-A2 decision but worth noting.
- **LOW concern:** SSE parser resilience — ensure `sources` event handles interleaving/proxy repetition via BFF.
- **LOW concern:** `/ai/study-recommendations` rate limit at 60/min may be too generous for a DB read endpoint.

### Actionable Fix (before execution)

1. **34-01 Task 1 or Task 2** — add `remaining_credit_points: int | None = None` to `ProfileUpdateRequest` Pydantic schema in `src/schemas/user.py` (or wherever ProfileUpdate lives). Verify with: `grep -q 'remaining_credit_points' src/schemas/user.py`.

### Verdict

**APPROVED for execution** — LOW overall risk. Plan is highly procedural, relies on proven patterns, and the RAG pipeline extends existing verified code rather than building from scratch.
