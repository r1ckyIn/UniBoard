"""Integration tests for GPA REST endpoints.

All tests run against real PostgreSQL via test_client with per-test transaction rollback.
Auth tokens obtained via register + login endpoints.
"""

import uuid

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.grade import Grade

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _unique_email() -> str:
    """Generate a unique test email."""
    return f"gpa-route-{uuid.uuid4().hex[:8]}@test.com"


async def _register_and_login(
    client: httpx.AsyncClient,
) -> tuple[str, str]:
    """Register a user, login, return (user_id, access_token)."""
    email = _unique_email()
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "testpass123", "display_name": "GPA Tester"},
    )
    assert reg.status_code == 201
    user_id = reg.json()["data"]["user_id"]

    login = await client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "testpass123"},
    )
    assert login.status_code == 200
    token: str = login.json()["data"]["access_token"]
    return user_id, token


async def _seed_data(
    client: httpx.AsyncClient,
    user_id: str,
) -> list[str]:
    """Seed courses + grades into the test session. Returns course IDs."""
    from src.database import get_session

    app = client._transport.app  # type: ignore[union-attr]
    override_fn = app.dependency_overrides[get_session]
    gen = override_fn()
    test_session: AsyncSession = await gen.__anext__()

    uid = uuid.UUID(user_id)

    # Course 1: COMP2017, 6cp, 2026S1 — fully graded
    c1 = Course(
        user_id=uid,
        name="Systems Programming",
        code="COMP2017",
        semester="2026S1",
        credit_points=6,
    )
    test_session.add(c1)
    await test_session.flush()

    g1a = Grade(
        course_id=c1.id,
        assessment_name="Assignment 1",
        score=80.0,
        max_score=100.0,
        weight=0.30,
        group_name="Assignments",
    )
    g1b = Grade(
        course_id=c1.id,
        assessment_name="Final Exam",
        score=90.0,
        max_score=100.0,
        weight=0.70,
        group_name="Exams",
    )
    test_session.add_all([g1a, g1b])

    # Course 2: COMP2123, 6cp, 2025S2 — partially graded (for target path test)
    c2 = Course(
        user_id=uid,
        name="Data Structures",
        code="COMP2123",
        semester="2025S2",
        credit_points=6,
    )
    test_session.add(c2)
    await test_session.flush()

    g2a = Grade(
        course_id=c2.id,
        assessment_name="Midterm",
        score=70.0,
        max_score=100.0,
        weight=0.40,
        group_name="Exams",
    )
    g2b = Grade(
        course_id=c2.id,
        assessment_name="Final Exam",
        score=None,  # Ungraded — used by target path tests
        max_score=100.0,
        weight=0.60,
        group_name="Exams",
    )
    test_session.add_all([g2a, g2b])
    await test_session.flush()

    return [str(c1.id), str(c2.id)]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_gpa_summary_returns_200(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/gpa/summary returns 200 with cumulative data."""
    user_id, token = await _register_and_login(test_client)
    await _seed_data(test_client, user_id)

    resp = await test_client.get(
        "/api/v1/gpa/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert "cumulative_wam" in data
    assert "cumulative_gpa" in data
    assert "courses" in data
    assert data["course_count"] == 2
    assert isinstance(data["courses"], list)


@pytest.mark.asyncio
async def test_gpa_summary_requires_auth(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/gpa/summary without auth returns 401."""
    resp = await test_client.get("/api/v1/gpa/summary")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_gpa_course_detail_returns_200(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/gpa/courses/{id} returns course with assessments."""
    user_id, token = await _register_and_login(test_client)
    course_ids = await _seed_data(test_client, user_id)

    resp = await test_client.get(
        f"/api/v1/gpa/courses/{course_ids[0]}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert data["course_code"] == "COMP2017"
    assert "assessments" in data
    assert len(data["assessments"]) == 2


@pytest.mark.asyncio
async def test_gpa_course_detail_404(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/gpa/courses/{random_uuid} returns 404."""
    user_id, token = await _register_and_login(test_client)
    fake_id = str(uuid.uuid4())

    resp = await test_client.get(
        f"/api/v1/gpa/courses/{fake_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_whatif_create_and_list(
    test_client: httpx.AsyncClient,
) -> None:
    """POST /api/v1/gpa/what-if creates scenario; GET lists it."""
    user_id, token = await _register_and_login(test_client)
    course_ids = await _seed_data(test_client, user_id)

    # Get assessment IDs from course detail
    detail_resp = await test_client.get(
        f"/api/v1/gpa/courses/{course_ids[0]}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assessments = detail_resp.json()["data"]["assessments"]
    exam = next(a for a in assessments if a["name"] == "Final Exam")

    # Create what-if scenario
    resp = await test_client.post(
        "/api/v1/gpa/what-if",
        json={
            "name": "Best Case",
            "scores": [
                {"assessment_id": exam["id"], "hypothetical_score": 95.0},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    scenario = resp.json()["data"]
    assert scenario["name"] == "Best Case"
    assert "result_wam" in scenario

    # List scenarios
    list_resp = await test_client.get(
        "/api/v1/gpa/what-if",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_resp.status_code == 200
    scenarios = list_resp.json()["data"]
    assert isinstance(scenarios, list)
    assert any(s["name"] == "Best Case" for s in scenarios)


@pytest.mark.asyncio
async def test_target_path_achievable(
    test_client: httpx.AsyncClient,
) -> None:
    """POST /api/v1/gpa/target with reachable target returns is_achievable=true."""
    user_id, token = await _register_and_login(test_client)
    await _seed_data(test_client, user_id)

    resp = await test_client.post(
        "/api/v1/gpa/target",
        json={"target_wam": 80.0, "mode": "uniform"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["is_achievable"] is True
    assert "required_scores" in data


@pytest.mark.asyncio
async def test_target_path_unreachable(
    test_client: httpx.AsyncClient,
) -> None:
    """POST /api/v1/gpa/target with unreachable target returns is_achievable=false."""
    user_id, token = await _register_and_login(test_client)
    await _seed_data(test_client, user_id)

    resp = await test_client.post(
        "/api/v1/gpa/target",
        json={"target_wam": 100.0, "mode": "uniform"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["is_achievable"] is False
    assert "max_achievable_wam" in data


@pytest.mark.asyncio
async def test_trend_returns_semesters(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/gpa/trend returns semester trend data."""
    user_id, token = await _register_and_login(test_client)
    await _seed_data(test_client, user_id)

    resp = await test_client.get(
        "/api/v1/gpa/trend",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "semesters" in data
    semesters = data["semesters"]
    assert len(semesters) == 2  # 2025S2 and 2026S1
    # Verify chronological order
    assert semesters[0]["semester"] == "2025S2"
    assert semesters[1]["semester"] == "2026S1"
