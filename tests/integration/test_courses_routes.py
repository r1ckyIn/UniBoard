"""Integration tests for the /courses router endpoints.

Tests: list, detail, grades, deadlines, outline, and 404 handling.
"""

import uuid
from typing import Any

import httpx
import pytest

from src.models.course import Course


def _headers(token: str) -> dict[str, str]:
    """Build auth headers from token."""
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_courses_returns_array(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses returns an array of courses with basic fields."""
    token = phase15_seed_data["token"]
    resp = await test_client.get("/api/v1/courses", headers=_headers(token))
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert isinstance(data, list)
    assert len(data) >= 1

    course = data[0]
    assert "id" in course
    assert "name" in course
    assert "code" in course
    assert "semester" in course
    assert "credit_points" in course
    assert course["code"] == "COMP2017"


@pytest.mark.asyncio
async def test_course_detail_has_assessment_weights(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses/{id} returns assessment_weights and weight_source."""
    token = phase15_seed_data["token"]
    course: Course = phase15_seed_data["course"]

    resp = await test_client.get(
        f"/api/v1/courses/{course.id}",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert "assessment_weights" in data
    assert isinstance(data["assessment_weights"], list)
    assert len(data["assessment_weights"]) == 3  # 3 grades seeded
    assert "weight_source" in data
    assert data["weight_source"] in {"unit_outline", "canvas_assignment_groups"}


@pytest.mark.asyncio
async def test_course_grades_has_graded_at(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses/{id}/grades returns only graded items with graded_at."""
    token = phase15_seed_data["token"]
    course: Course = phase15_seed_data["course"]

    resp = await test_client.get(
        f"/api/v1/courses/{course.id}/grades",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert isinstance(data, list)
    # Only 2 graded (Assignment 1 and Quiz 1), Midterm has score=None
    assert len(data) == 2

    for grade in data:
        assert "graded_at" in grade
        assert "submitted_at" in grade
        assert grade["score"] is not None


@pytest.mark.asyncio
async def test_course_deadlines_has_status(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses/{id}/deadlines returns items with status and days_remaining."""
    token = phase15_seed_data["token"]
    course: Course = phase15_seed_data["course"]

    resp = await test_client.get(
        f"/api/v1/courses/{course.id}/deadlines",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert isinstance(data, list)
    assert len(data) == 3  # 3 deadlines seeded

    for dl in data:
        assert "status" in dl
        assert "days_remaining" in dl
        assert dl["status"] in {"upcoming", "submitted", "overdue", "completed"}


@pytest.mark.asyncio
async def test_course_outline_has_learning_outcomes(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses/{id}/outline returns learning_outcomes and assessments."""
    token = phase15_seed_data["token"]
    course: Course = phase15_seed_data["course"]

    resp = await test_client.get(
        f"/api/v1/courses/{course.id}/outline",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert "learning_outcomes" in data
    assert isinstance(data["learning_outcomes"], list)
    assert len(data["learning_outcomes"]) == 4  # 4 outcomes seeded

    assert "assessments" in data
    assert isinstance(data["assessments"], list)
    assert len(data["assessments"]) == 3  # 3 assessments in outline

    assert "course_id" in data
    assert "source" in data


@pytest.mark.asyncio
async def test_course_not_found_returns_404(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses/{random_uuid} returns 404."""
    token = phase15_seed_data["token"]
    fake_id = str(uuid.uuid4())

    resp = await test_client.get(
        f"/api/v1/courses/{fake_id}",
        headers=_headers(token),
    )
    assert resp.status_code == 404
