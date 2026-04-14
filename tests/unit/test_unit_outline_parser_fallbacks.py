"""Unit tests for UnitOutlineParser positional fallbacks — SYNC-FIX-01 secondary fix.

Stubs created in Wave 0. Wave 2 (Plan 32.1-02) adds header-based positional fallbacks
for assessment-due, assessment-length, assessment-description fields.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from src.parsers.usyd_outline import UnitOutlineParser

FIXTURES = Path(__file__).parent.parent / "fixtures" / "usyd"


@pytest.mark.xfail(reason="Wave 2: parser positional fallback for due/length not implemented", strict=False)
def test_parser_positional_fallback_for_due_length() -> None:
    """Given HTML with only <th>Weight</th> / <th>Due</th> headers (no .assessment-* classes),
    parser must still extract due and length by column index.
    """
    html = (FIXTURES / "comp3221_current.html").read_text()
    parser = UnitOutlineParser()
    outline = parser.parse(html)
    assert len(outline.assessments) == 3
    a1 = outline.assessments[0]
    assert a1.name == "Assignment 1"
    assert a1.weight == 0.25
    assert a1.due_date == "Week 5"  # Positional fallback.
    assert a1.length == "1000 words"  # Positional fallback.


@pytest.mark.xfail(reason="Wave 2: parser positional fallback not implemented", strict=False)
def test_parser_still_works_with_css_classes() -> None:
    """Regression: existing fixture with .assessment-* classes continues to parse correctly."""
    html = (FIXTURES / "comp2017_current.html").read_text()
    parser = UnitOutlineParser()
    outline = parser.parse(html)
    assert len(outline.assessments) > 0
    assert sum(a.weight for a in outline.assessments) == pytest.approx(1.0, abs=0.01)
