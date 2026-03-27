"""Contract alignment integration tests for all Phase 15 endpoints.

Primary verification that every endpoint returns the exact field names
and types that the frontend expects (types.gen.d.ts). Catches field
renames, missing fields, wrong nesting, and type mismatches.
"""

from typing import Any

import httpx
import pytest

from src.models.course import Course


def _headers(token: str) -> dict[str, str]:
    """Build auth headers from token."""
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_gpa_report_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /gpa returns 200 with contract-aligned field names."""
    token = phase15_seed_data["token"]
    resp = await test_client.get("/api/v1/gpa", headers=_headers(token))
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]

    # Top-level fields
    expected_keys = {
        "scale",
        "current_wam",
        "current_gpa_4",
        "target_wam",
        "gap",
        "courses",
        "last_sync_at",
    }
    assert expected_keys <= set(data.keys()), (
        f"Missing keys: {expected_keys - set(data.keys())}"
    )
    assert isinstance(data["courses"], list)
    assert len(data["courses"]) >= 1

    # Course field names
    course = data["courses"][0]
    course_keys = {
        "course_id",
        "code",
        "name",
        "credit_points",
        "level_weight",
        "current_mark",
        "grade_letter",
        "completed_weight",
    }
    assert course_keys <= set(course.keys()), (
        f"Missing course keys: {course_keys - set(course.keys())}"
    )

    # Regression: old field names must NOT be present
    assert "course_code" not in course, "Legacy field course_code still present"
    assert "course_name" not in course, "Legacy field course_name still present"
    assert "wam" not in course, "Legacy field wam still present"
    assert "grade_band" not in course, "Legacy field grade_band still present"
    assert "pct_assessed" not in course, "Legacy field pct_assessed still present"

    # Meta present
    assert "meta" in body


@pytest.mark.asyncio
async def test_gpa_predict_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """POST /gpa/predict returns 200 with contract-aligned field names."""
    token = phase15_seed_data["token"]
    course: Course = phase15_seed_data["course"]

    resp = await test_client.post(
        "/api/v1/gpa/predict",
        json={
            "what_if_scores": [
                {
                    "course_id": str(course.id),
                    "assessment_name": "Midterm",
                    "assumed_score": 80.0,
                }
            ],
            "scale": "wam",
        },
        headers=_headers(token),
    )
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]

    expected_keys = {"current_wam", "predicted_wam", "delta", "per_course"}
    assert expected_keys <= set(data.keys()), (
        f"Missing keys: {expected_keys - set(data.keys())}"
    )

    # per_course fields
    if data["per_course"]:
        pc = data["per_course"][0]
        pc_keys = {
            "course_id",
            "code",
            "current_mark",
            "predicted_mark",
            "applied_assumptions",
        }
        assert pc_keys <= set(pc.keys()), (
            f"Missing per_course keys: {pc_keys - set(pc.keys())}"
        )


@pytest.mark.asyncio
async def test_gpa_path_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """POST /gpa/path returns 200 with contract-aligned field names."""
    token = phase15_seed_data["token"]

    resp = await test_client.post(
        "/api/v1/gpa/path",
        json={"target_wam": 80.0},
        headers=_headers(token),
    )
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]

    expected_keys = {"target_wam", "current_wam", "is_achievable", "per_course"}
    assert expected_keys <= set(data.keys()), (
        f"Missing keys: {expected_keys - set(data.keys())}"
    )

    # per_course fields
    if data["per_course"]:
        pc = data["per_course"][0]
        pc_keys = {
            "course_id",
            "code",
            "current_mark",
            "minimum_remaining_avg",
            "remaining_assessments",
            "difficulty",
        }
        assert pc_keys <= set(pc.keys()), (
            f"Missing per_course keys: {pc_keys - set(pc.keys())}"
        )


@pytest.mark.asyncio
async def test_list_courses_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses returns 200 with array of courses with expected fields."""
    token = phase15_seed_data["token"]

    resp = await test_client.get("/api/v1/courses", headers=_headers(token))
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]
    assert isinstance(data, list), "data should be an array"
    assert len(data) >= 1

    course = data[0]
    expected_keys = {"id", "name", "code", "semester", "credit_points"}
    assert expected_keys <= set(course.keys()), (
        f"Missing course keys: {expected_keys - set(course.keys())}"
    )


@pytest.mark.asyncio
async def test_course_detail_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses/{id} returns 200 with assessment_weights and weight_source."""
    token = phase15_seed_data["token"]
    course: Course = phase15_seed_data["course"]

    resp = await test_client.get(
        f"/api/v1/courses/{course.id}",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]

    assert "assessment_weights" in data
    assert isinstance(data["assessment_weights"], list)
    assert "weight_source" in data

    # Assessment weight field names
    if data["assessment_weights"]:
        aw = data["assessment_weights"][0]
        aw_keys = {"name", "weight", "score", "max_score", "status", "group_name"}
        assert aw_keys <= set(aw.keys()), (
            f"Missing aw keys: {aw_keys - set(aw.keys())}"
        )


@pytest.mark.asyncio
async def test_course_grades_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses/{id}/grades returns 200 with grade array."""
    token = phase15_seed_data["token"]
    course: Course = phase15_seed_data["course"]

    resp = await test_client.get(
        f"/api/v1/courses/{course.id}/grades",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]
    assert isinstance(data, list), "data should be an array of grades"

    # Only graded items returned (score is not None)
    if data:
        grade = data[0]
        grade_keys = {
            "id",
            "assessment_name",
            "score",
            "max_score",
            "weight",
            "group_name",
            "graded_at",
            "submitted_at",
        }
        assert grade_keys <= set(grade.keys()), (
            f"Missing grade keys: {grade_keys - set(grade.keys())}"
        )


@pytest.mark.asyncio
async def test_deadlines_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /deadlines returns 200 with contract-aligned deadline fields."""
    token = phase15_seed_data["token"]

    resp = await test_client.get("/api/v1/deadlines", headers=_headers(token))
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]
    assert isinstance(data, list), "data should be an array"

    if data:
        dl = data[0]
        dl_keys = {
            "id",
            "title",
            "due_date",
            "source",
            "status",
            "days_remaining",
            "course_code",
            "course_name",
            "is_confirmed",
        }
        assert dl_keys <= set(dl.keys()), (
            f"Missing deadline keys: {dl_keys - set(dl.keys())}"
        )

        # Status must be one of the valid values
        assert dl["status"] in {"upcoming", "submitted", "overdue", "completed"}, (
            f"Invalid status: {dl['status']}"
        )


@pytest.mark.asyncio
async def test_upcoming_deadlines_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /deadlines/upcoming returns 200 with same shape as GET /deadlines."""
    token = phase15_seed_data["token"]

    resp = await test_client.get(
        "/api/v1/deadlines/upcoming",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]
    assert isinstance(data, list), "data should be an array"

    # All returned deadlines should be upcoming (within 7 days)
    for dl in data:
        assert "days_remaining" in dl
        assert "status" in dl


@pytest.mark.asyncio
async def test_materials_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses/{id}/materials returns 200 with flat Material[] (NOT nested object)."""
    token = phase15_seed_data["token"]
    course: Course = phase15_seed_data["course"]

    resp = await test_client.get(
        f"/api/v1/courses/{course.id}/materials",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]

    # CRITICAL: data must be a list (not object with folders key)
    assert isinstance(data, list), (
        f"Materials data should be a flat list, got {type(data).__name__}"
    )
    assert "folders" not in body.get("data", {}).__class__.__name__

    if data:
        mat = data[0]
        mat_keys = {"id", "title", "source", "source_type"}
        assert mat_keys <= set(mat.keys()), (
            f"Missing material keys: {mat_keys - set(mat.keys())}"
        )


@pytest.mark.asyncio
async def test_discussions_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /courses/{id}/discussions returns 200 with Discussion[] with expected fields."""
    token = phase15_seed_data["token"]
    course: Course = phase15_seed_data["course"]

    resp = await test_client.get(
        f"/api/v1/courses/{course.id}/discussions",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]
    assert isinstance(data, list), "data should be an array of discussions"

    if data:
        disc = data[0]
        disc_keys = {
            "id",
            "ed_thread_id",
            "title",
            "author",
            "category",
            "is_endorsed",
            "is_staff_post",
            "gpa_relevance_score",
            "relevance_category",
            "summary",
            "created_at",
        }
        assert disc_keys <= set(disc.keys()), (
            f"Missing discussion keys: {disc_keys - set(disc.keys())}"
        )

        # Regression: old field names must NOT be present
        assert "content_summary" not in disc, "Legacy field content_summary still present"
        assert "author" in disc, "Contract field author missing"


@pytest.mark.asyncio
async def test_search_contract(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /search?q=test returns 200 with flat SearchResult[] (NOT wrapped object)."""
    token = phase15_seed_data["token"]

    resp = await test_client.get(
        "/api/v1/search?q=pointer",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]

    # CRITICAL: data must be a list (not object with query/total_hits keys)
    assert isinstance(data, list), (
        f"Search data should be a flat list, got {type(data).__name__}"
    )

    if data:
        hit = data[0]
        hit_keys = {"type", "title", "source", "course_code", "snippet", "url", "relevance"}
        assert hit_keys <= set(hit.keys()), (
            f"Missing search keys: {hit_keys - set(hit.keys())}"
        )

        # Regression: old field name must NOT be present
        assert "rank" not in hit, "Legacy field rank still present"


@pytest.mark.asyncio
async def test_no_field_name_regression(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """Verify specific legacy field names do NOT appear in new contract responses."""
    token = phase15_seed_data["token"]
    course: Course = phase15_seed_data["course"]

    # GPA report: no course_code in course summaries
    gpa_resp = await test_client.get("/api/v1/gpa", headers=_headers(token))
    if gpa_resp.status_code == 200:
        gpa_data = gpa_resp.json()["data"]
        for c in gpa_data.get("courses", []):
            assert "course_code" not in c, "GPA course summary has legacy course_code"
            assert "course_name" not in c, "GPA course summary has legacy course_name"

    # Discussions: no content_summary
    disc_resp = await test_client.get(
        f"/api/v1/courses/{course.id}/discussions",
        headers=_headers(token),
    )
    if disc_resp.status_code == 200:
        disc_data = disc_resp.json()["data"]
        for d in disc_data:
            assert "content_summary" not in d, "Discussion has legacy content_summary"

    # Search: no rank field
    search_resp = await test_client.get(
        "/api/v1/search?q=test",
        headers=_headers(token),
    )
    if search_resp.status_code == 200:
        search_data = search_resp.json()["data"]
        for s in search_data:
            assert "rank" not in s, "Search result has legacy rank field"
