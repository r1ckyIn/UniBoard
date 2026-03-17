"""Integration tests for AI API routes."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.user import User
from src.schemas.ai import QAResponse, UnitReviewResponse
from src.security.password import hash_password


@pytest_asyncio.fixture(loop_scope="session")
async def _seed_ai_data(session: AsyncSession) -> dict[str, Any]:
    """Seed user and course for AI route tests."""
    user = User(
        email=f"ai-test-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("testpass123"),
        display_name="AI Tester",
    )
    session.add(user)
    await session.flush()

    course = Course(
        user_id=user.id,
        name="Algorithms",
        code="COMP2017",
        semester="2026S1",
    )
    session.add(course)
    await session.flush()

    return {
        "user_id": user.id,
        "course_id": course.id,
        "email": user.email,
    }


async def _get_token(client: httpx.AsyncClient, email: str) -> str:
    """Authenticate and return access token."""
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "testpass123"},
    )
    return str(resp.json()["data"]["access_token"])


@pytest.mark.asyncio(loop_scope="session")
async def test_post_course_qa_returns_200(
    test_client: httpx.AsyncClient,
    _seed_ai_data: dict[str, Any],
) -> None:
    """POST /courses/{id}/qa returns 200 with QAResponse."""
    data = _seed_ai_data
    token = await _get_token(test_client, str(data["email"]))

    qa_response = QAResponse(
        answer="The answer is 42 [Canvas: Week 1 Notes].",
        citations=["[Canvas: Week 1 Notes]"],
        method="direct_context",
        tokens_used=100,
    )

    with patch("src.web.routes.ai._build_qa_service") as mock_build:
        mock_svc = AsyncMock()
        mock_svc.answer_question = AsyncMock(return_value=qa_response)
        mock_build.return_value = mock_svc

        resp = await test_client.post(
            f"/api/v1/courses/{data['course_id']}/qa",
            json={"question": "What is the answer?"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert "answer" in body
    assert "citations" in body


@pytest.mark.asyncio(loop_scope="session")
async def test_get_course_review_returns_200(
    test_client: httpx.AsyncClient,
    _seed_ai_data: dict[str, Any],
) -> None:
    """GET /courses/{id}/review returns 200 with UnitReviewResponse."""
    data = _seed_ai_data
    token = await _get_token(test_client, str(data["email"]))

    review_response = UnitReviewResponse(
        course_id=str(data["course_id"]),
        course_name="Algorithms",
        key_concepts=["Binary search", "Sorting"],
        common_mistakes=["Off-by-one errors"],
        exam_scope="Chapters 1-5",
        study_tips=["Practice past exams"],
        generated_at=datetime.now(UTC).isoformat(),
    )

    with patch("src.web.routes.ai._build_qa_service") as mock_build:
        mock_svc = AsyncMock()
        mock_svc.generate_review = AsyncMock(return_value=review_response)
        mock_build.return_value = mock_svc

        resp = await test_client.get(
            f"/api/v1/courses/{data['course_id']}/review",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert "key_concepts" in body
    assert "common_mistakes" in body


@pytest.mark.asyncio(loop_scope="session")
async def test_get_intelligence_ai_returns_200(
    test_client: httpx.AsyncClient,
    _seed_ai_data: dict[str, Any],
) -> None:
    """GET /courses/{id}/intelligence/ai returns 200 with AI-scored posts."""
    data = _seed_ai_data
    token = await _get_token(test_client, str(data["email"]))

    with patch(
        "src.web.routes.intelligence._build_ai_engine"
    ) as mock_build_ai:
        mock_build_ai.return_value = None  # No AI key -> fallback to rule-based
        resp = await test_client.get(
            f"/api/v1/courses/{data['course_id']}/intelligence/ai",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert isinstance(body, list)
