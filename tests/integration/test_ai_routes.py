"""Integration tests for AI API routes."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.schemas.ai import QAResponse, UnitReviewResponse
from src.web.deps import get_current_user_id

# Fixed user ID for dependency override
_TEST_USER_ID = uuid.uuid4()


@pytest.mark.asyncio(loop_scope="session")
async def test_post_course_qa_returns_200(
    test_client: httpx.AsyncClient,
) -> None:
    """POST /courses/{id}/qa returns 200 with QAResponse."""
    course_id = uuid.uuid4()

    qa_response = QAResponse(
        answer="The answer is 42 [Canvas: Week 1 Notes].",
        citations=["[Canvas: Week 1 Notes]"],
        method="direct_context",
        tokens_used=100,
    )

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    with patch("src.web.routes.ai._build_qa_service") as mock_build:
        mock_svc = AsyncMock()
        mock_svc.answer_question = AsyncMock(return_value=qa_response)
        mock_build.return_value = mock_svc

        resp = await test_client.post(
            f"/api/v1/courses/{course_id}/qa",
            json={"question": "What is the answer?"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.pop(get_current_user_id, None)

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert "answer" in body
    assert "citations" in body


@pytest.mark.asyncio(loop_scope="session")
async def test_get_course_review_returns_200(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /courses/{id}/review returns 200 with UnitReviewResponse."""
    course_id = uuid.uuid4()

    review_response = UnitReviewResponse(
        course_id=str(course_id),
        course_name="Algorithms",
        key_concepts=["Binary search", "Sorting"],
        common_mistakes=["Off-by-one errors"],
        exam_scope="Chapters 1-5",
        study_tips=["Practice past exams"],
        generated_at=datetime.now(UTC).isoformat(),
    )

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    with patch("src.web.routes.ai._build_qa_service") as mock_build:
        mock_svc = AsyncMock()
        mock_svc.generate_review = AsyncMock(return_value=review_response)
        mock_build.return_value = mock_svc

        resp = await test_client.get(
            f"/api/v1/courses/{course_id}/review",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.pop(get_current_user_id, None)

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert "key_concepts" in body
    assert "common_mistakes" in body


@pytest.mark.asyncio(loop_scope="session")
async def test_get_intelligence_ai_returns_200(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /courses/{id}/intelligence/ai returns 200 with AI-scored posts."""
    course_id = uuid.uuid4()

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    with patch(
        "src.web.routes.intelligence._build_ai_engine"
    ) as mock_build_ai:
        mock_build_ai.return_value = None  # No AI key -> fallback to rule-based
        resp = await test_client.get(
            f"/api/v1/courses/{course_id}/intelligence/ai",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.pop(get_current_user_id, None)

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert isinstance(body, list)


# ---------------------------------------------------------------------------
# Phase 34 Wave 0 RED-state stubs (AIFEAT-01, AIFEAT-02)
# xfail(strict=False) - flipped to real bodies by Wave 1 plans (34-02, 34-04).
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_get_study_recommendations(test_client: httpx.AsyncClient) -> None:
    """AIFEAT-01: GET /ai/study-recommendations returns cached row.

    Wave 1 (Plan 34-02) flipped the Wave 0 xfail stub to a real body.
    Mocks StudyRecommendationService via the dependency factory so no DB
    round-trip is required (mirrors test_post_course_qa_returns_200 pattern).
    """
    from src.schemas.study_recommendation import (
        StudyCandidate,
        StudyRecommendationResponse,
    )
    from src.web.routes.ai import _build_study_rec_service

    fixture = StudyRecommendationResponse(
        generated_for_date="2026-04-16",
        main_suggestion="Focus on COMP3221 Quiz 3 (15% weight) -- review lecture 8.",
        top_3=[
            StudyCandidate(
                course_code="COMP3221",
                assessment_name="Quiz 3",
                weight=0.15,
                days_until_due=1.0,
                roi_score=4.0,
                score=0.6,
            ),
        ],
        language="en",
    )

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    mock_svc = AsyncMock()
    mock_svc.get_latest = AsyncMock(return_value=fixture)
    app.dependency_overrides[_build_study_rec_service] = lambda: mock_svc

    resp = await test_client.get(
        "/api/v1/ai/study-recommendations",
        headers={"Authorization": "Bearer fake-token"},
    )

    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(_build_study_rec_service, None)

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["main_suggestion"].startswith("Focus")
    assert body["data"]["language"] == "en"
    assert len(body["data"]["top_3"]) == 1
    assert body["data"]["top_3"][0]["course_code"] == "COMP3221"


@pytest.mark.asyncio(loop_scope="session")
async def test_get_study_recommendations_returns_null_when_not_yet_generated(
    test_client: httpx.AsyncClient,
) -> None:
    """AIFEAT-01 / D-D1: endpoint returns 200 + data=null for users without cached row.

    Covers the new-user-before-first-cron-cycle path. Frontend falls back to
    defaultEncouragementProvider when data is null.
    """
    from src.web.routes.ai import _build_study_rec_service

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    mock_svc = AsyncMock()
    mock_svc.get_latest = AsyncMock(return_value=None)
    app.dependency_overrides[_build_study_rec_service] = lambda: mock_svc

    resp = await test_client.get(
        "/api/v1/ai/study-recommendations",
        headers={"Authorization": "Bearer fake-token"},
    )

    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(_build_study_rec_service, None)

    assert resp.status_code == 200
    assert resp.json()["data"] is None


@pytest.mark.xfail(strict=False, reason="Phase 34: implementation pending (34-04)")
def test_qa_bumps_last_access() -> None:
    """AIFEAT-02: POST /courses/{id}/qa bumps Course.last_qa_access_at column."""
    pytest.xfail("Phase 34: implementation pending")


@pytest.mark.xfail(strict=False, reason="Phase 34: implementation pending (34-04)")
def test_sse_sources_event_order() -> None:
    """AIFEAT-02: SSE stream emits sources event before first token."""
    pytest.xfail("Phase 34: implementation pending")
