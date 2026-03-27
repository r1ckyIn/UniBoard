"""Integration tests for deadline route contracts.

Tests: status/days_remaining fields, upcoming filter, past exclusion, status values.
"""

from typing import Any

import httpx
import pytest


def _headers(token: str) -> dict[str, str]:
    """Build auth headers from token."""
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_deadlines_have_status_and_days_remaining(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /deadlines returns items with status and days_remaining."""
    token = phase15_seed_data["token"]

    resp = await test_client.get(
        "/api/v1/deadlines",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert isinstance(data, list)

    for dl in data:
        assert "status" in dl, f"Missing status in deadline: {dl.get('title')}"
        assert "days_remaining" in dl, f"Missing days_remaining in deadline: {dl.get('title')}"
        assert isinstance(dl["days_remaining"], int)


@pytest.mark.asyncio
async def test_upcoming_deadlines_within_7_days(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /deadlines/upcoming returns only deadlines due within 7 days."""
    token = phase15_seed_data["token"]

    resp = await test_client.get(
        "/api/v1/deadlines/upcoming",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert isinstance(data, list)

    # "Assignment 2" (3 days) should be present, "Final Project" (10 days) should not
    titles = [dl["title"] for dl in data]
    assert "Assignment 2" in titles, "Expected 'Assignment 2' (3 days) in upcoming"
    assert "Final Project" not in titles, "Final Project (10 days) should not be in upcoming"


@pytest.mark.asyncio
async def test_upcoming_excludes_past_deadlines(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /deadlines/upcoming should exclude past deadlines."""
    token = phase15_seed_data["token"]

    resp = await test_client.get(
        "/api/v1/deadlines/upcoming",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    titles = [dl["title"] for dl in data]

    # "Quiz 2" is 2 days past, should not appear in upcoming
    assert "Quiz 2" not in titles, "Past deadline 'Quiz 2' should not be in upcoming"


@pytest.mark.asyncio
async def test_deadline_status_values(
    test_client: httpx.AsyncClient,
    phase15_seed_data: dict[str, Any],
) -> None:
    """GET /deadlines returns only valid status values."""
    token = phase15_seed_data["token"]

    resp = await test_client.get(
        "/api/v1/deadlines?include_past=true",
        headers=_headers(token),
    )
    assert resp.status_code == 200

    valid_statuses = {"upcoming", "submitted", "overdue", "completed"}
    data = resp.json()["data"]

    for dl in data:
        assert dl["status"] in valid_statuses, (
            f"Invalid status '{dl['status']}' for deadline '{dl['title']}'. "
            f"Expected one of {valid_statuses}"
        )
