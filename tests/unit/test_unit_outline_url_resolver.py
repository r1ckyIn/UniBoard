"""Unit tests for Unit Outline URL resolution — SYNC-FIX-01 upstream fix.

Stubs created in Wave 0. Wave 2 (Plan 32.1-02) implements _resolve_unit_outline_url.
"""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

FIXTURES = Path(__file__).parent.parent / "fixtures" / "canvas"


@pytest.mark.asyncio
@pytest.mark.xfail(reason="Wave 2: _resolve_unit_outline_url helper not implemented yet", strict=False)
async def test_resolve_unit_outline_url_success() -> None:
    """Given tabs with Unit Outline entry + external_tool with custom_fields.url, return URL."""
    from src.sync.courses import _resolve_unit_outline_url  # Wave 2 creates this

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
@pytest.mark.xfail(reason="Wave 2: _resolve_unit_outline_url helper not implemented yet", strict=False)
async def test_resolve_unit_outline_url_no_outline_tab() -> None:
    """If no tab starts with 'Unit Outline', return None."""
    from src.sync.courses import _resolve_unit_outline_url

    adapter = AsyncMock()
    adapter.get_tabs = AsyncMock(return_value=[{"id": "home", "label": "Home"}])
    url = await _resolve_unit_outline_url(adapter, "123")
    assert url is None
    adapter.get_external_tool.assert_not_called()
