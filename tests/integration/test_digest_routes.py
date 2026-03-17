"""Integration tests for digest and alerts API routes."""

import uuid

import httpx
import pytest


@pytest.mark.asyncio
async def test_get_digest_latest_returns_401_without_auth(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/digest/latest returns 401 without auth."""
    resp = await test_client.get("/api/v1/digest/latest")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_digest_history_returns_401_without_auth(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/digest/history returns 401 without auth."""
    resp = await test_client.get("/api/v1/digest/history")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_alerts_returns_401_without_auth(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/alerts returns 401 without auth."""
    resp = await test_client.get("/api/v1/alerts")
    assert resp.status_code in (401, 403)
