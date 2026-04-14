"""Unit tests for Unit Outline URL resolution — SYNC-FIX-01 upstream fix.

Wave 2 (Plan 32.1-02) implements _resolve_unit_outline_url.
"""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

FIXTURES = Path(__file__).parent.parent / "fixtures" / "canvas"


@pytest.mark.asyncio
async def test_resolve_unit_outline_url_success() -> None:
    """Given tabs with Unit Outline entry + external_tool with custom_fields.url, return URL."""
    from src.sync.courses import _resolve_unit_outline_url

    tabs = json.loads((FIXTURES / "tabs_with_outline.json").read_text())
    tool = json.loads((FIXTURES / "external_tool_with_url.json").read_text())
    adapter = AsyncMock()
    adapter.get_tabs = AsyncMock(return_value=tabs)
    adapter.get_external_tool = AsyncMock(return_value=tool)

    url = await _resolve_unit_outline_url(adapter, "123")
    assert url == "https://sydney.edu.au/units/COMP2017/2026-S1C-ND-CC"
    adapter.get_tabs.assert_awaited_once_with("123")
    adapter.get_external_tool.assert_awaited_once_with("123", "98765")


@pytest.mark.asyncio
async def test_resolve_unit_outline_url_no_outline_tab() -> None:
    """If no tab starts with 'Unit Outline', return None."""
    from src.sync.courses import _resolve_unit_outline_url

    adapter = AsyncMock()
    adapter.get_tabs = AsyncMock(return_value=[{"id": "home", "label": "Home"}])
    url = await _resolve_unit_outline_url(adapter, "123")
    assert url is None
    adapter.get_external_tool.assert_not_called()


@pytest.mark.asyncio
async def test_resolve_unit_outline_url_tabs_api_raises() -> None:
    """If get_tabs raises, helper returns None (never raises)."""
    from src.sync.courses import _resolve_unit_outline_url

    adapter = AsyncMock()
    adapter.get_tabs = AsyncMock(side_effect=Exception("canvas down"))
    url = await _resolve_unit_outline_url(adapter, "123")
    assert url is None
    adapter.get_external_tool.assert_not_called()


@pytest.mark.asyncio
async def test_resolve_unit_outline_url_invalid_url_domain() -> None:
    """If custom_fields.url doesn't point at sydney.edu.au, return None."""
    from src.sync.courses import _resolve_unit_outline_url

    adapter = AsyncMock()
    adapter.get_tabs = AsyncMock(
        return_value=[
            {"id": "context_external_tool_42", "label": "Unit Outline"},
        ]
    )
    adapter.get_external_tool = AsyncMock(
        return_value={"custom_fields": {"url": "https://other-domain.com/x"}}
    )
    url = await _resolve_unit_outline_url(adapter, "123")
    assert url is None


@pytest.mark.asyncio
async def test_resolve_unit_outline_url_tab_id_wrong_prefix() -> None:
    """If the outline tab's id does not start with context_external_tool_, return None."""
    from src.sync.courses import _resolve_unit_outline_url

    adapter = AsyncMock()
    adapter.get_tabs = AsyncMock(
        return_value=[{"id": "some-other-id", "label": "Unit Outline"}]
    )
    adapter.get_external_tool = AsyncMock(
        return_value={
            "custom_fields": {
                "url": "https://sydney.edu.au/units/COMP2017/2026-S1C-ND-CC"
            }
        }
    )
    url = await _resolve_unit_outline_url(adapter, "123")
    assert url is None
    adapter.get_external_tool.assert_not_called()
