"""Unit tests for UnitOutlineParser positional fallbacks — SYNC-FIX-01 secondary fix.

Wave 2 (Plan 32.1-02) adds header-based positional fallbacks for
assessment-due, assessment-length, assessment-description fields when the
CSS-class selectors return empty.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from src.parsers.usyd_outline import UnitOutlineParser

FIXTURES = Path(__file__).parent.parent / "fixtures" / "usyd"


def test_parser_positional_fallback_for_due_length() -> None:
    """Given HTML with only <th>Weight</th> / <th>Due</th> headers (no .assessment-* classes),
    parser must still extract due and length by column index.
    """
    html = (FIXTURES / "comp3221_current.html").read_text()
    parser = UnitOutlineParser()
    items = parser.parse(html)
    assert len(items) == 3
    a1 = items[0]
    assert a1.name == "Assignment 1"
    assert a1.weight == 0.25
    assert a1.due_date == "Week 5"  # Positional fallback.
    assert a1.length == "1000 words"  # Positional fallback.


def test_parser_still_works_with_css_classes() -> None:
    """Regression: existing fixture with .assessment-* classes continues to parse correctly."""
    html = (FIXTURES / "comp2017_current.html").read_text()
    parser = UnitOutlineParser()
    items = parser.parse(html)
    assert len(items) > 0
    assert sum(a.weight for a in items) == pytest.approx(1.0, abs=0.01)


def test_parser_handles_missing_header_gracefully() -> None:
    """HTML with assessment rows but NO <th>Due</th> header: due_date stays empty/None,
    no exception raised.
    """
    html = """<html><body>
    <table id="assessment-table">
      <thead><tr><th>Assessment</th><th>Weight</th></tr></thead>
      <tbody>
        <tr><td>Quiz 1</td><td>40%</td></tr>
        <tr><td>Final Exam</td><td>60%</td></tr>
      </tbody>
    </table>
    </body></html>"""
    parser = UnitOutlineParser()
    items = parser.parse(html)
    assert len(items) == 2
    # Due header absent -> due_date fallback returns empty string, stored as None.
    assert items[0].due_date in (None, "")
    assert items[0].length == ""
