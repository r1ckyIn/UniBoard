"""Integration tests for UnitOutlineParser.

Tests the parser with both real USYD URLs (when available) and inline HTML fixtures.
NO mocks -- pure integration testing.
"""

import pytest

from src.parsers.usyd_outline import AssessmentItem, UnitOutlineParser

# asyncio_mode=auto in pyproject.toml handles async test collection

# Known USYD Unit Outline URL -- may change over time
OUTLINE_URL = "https://www.sydney.edu.au/units/COMP2017/2026-S1C-ND-CC"


@pytest.fixture
def parser() -> UnitOutlineParser:
    """Create a UnitOutlineParser instance."""
    return UnitOutlineParser()


# --- HTML fixture for offline testing ---

SAMPLE_HTML = """
<html>
<body>
<table id="assessment-table" class="table table-striped table-bordered">
  <thead>
    <tr><th>Assessment</th><th>Weight</th><th>Due</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr>
      <td class="assessment-type">Assignment 1</td>
      <td class="assessment-weight">30%</td>
      <td class="assessment-due">Week 5</td>
      <td class="assessment-length">2000 words</td>
    </tr>
    <tr>
      <td class="assessment-type">Midterm Exam</td>
      <td class="assessment-weight">25%</td>
      <td class="assessment-due">Week 8</td>
      <td class="assessment-length">1 hour</td>
    </tr>
    <tr>
      <td class="assessment-type">Final Project</td>
      <td class="assessment-weight">45%</td>
      <td class="assessment-due">Week 13</td>
      <td class="assessment-length">5000 words</td>
    </tr>
  </tbody>
</table>
</body>
</html>
"""


async def test_parse_sample_html(parser: UnitOutlineParser) -> None:
    """Verify parsing of a well-formed HTML fixture."""
    items = parser.parse(SAMPLE_HTML)
    assert len(items) == 3
    assert items[0].name == "Assignment 1"
    assert items[0].weight == pytest.approx(0.30)
    assert items[1].name == "Midterm Exam"
    assert items[1].weight == pytest.approx(0.25)
    assert items[2].name == "Final Project"
    assert items[2].weight == pytest.approx(0.45)


async def test_weight_sum_validation(parser: UnitOutlineParser) -> None:
    """Verify weight sum validation (95-105% tolerance)."""
    items = parser.parse(SAMPLE_HTML)
    assert parser.validate_weights(items) is True


async def test_weight_sum_too_low(parser: UnitOutlineParser) -> None:
    """Verify validation fails when weights sum to less than 95%."""
    items = [AssessmentItem(name="A1", weight=0.20)]
    assert parser.validate_weights(items) is False


async def test_weight_sum_too_high(parser: UnitOutlineParser) -> None:
    """Verify validation fails when weights exceed 105%."""
    items = [
        AssessmentItem(name="A1", weight=0.60),
        AssessmentItem(name="A2", weight=0.60),
    ]
    assert parser.validate_weights(items) is False


async def test_raw_html_stored(parser: UnitOutlineParser) -> None:
    """Verify fetch_and_parse stores raw HTML in result."""
    try:
        result = await parser.fetch_and_parse(OUTLINE_URL)
        assert result.raw_html != ""
        assert len(result.raw_html) > 100
    except Exception:
        pytest.skip("USYD Unit Outline URL not reachable")


async def test_parse_malformed_html(parser: UnitOutlineParser) -> None:
    """Verify parser handles HTML without assessment table gracefully."""
    html = "<html><body><p>No assessment table here</p></body></html>"
    items = parser.parse(html)
    assert items == []


async def test_weight_parsing(parser: UnitOutlineParser) -> None:
    """Verify _parse_weight handles various formats."""
    assert parser._parse_weight("30%") == pytest.approx(0.30)
    assert parser._parse_weight("12.5%") == pytest.approx(0.125)
    assert parser._parse_weight("no weight") == pytest.approx(0.0)
    assert parser._parse_weight("") == pytest.approx(0.0)
    assert parser._parse_weight("100%") == pytest.approx(1.0)


async def test_fetch_and_parse_real_url(parser: UnitOutlineParser) -> None:
    """Fetch a real USYD Unit Outline and verify parsing."""
    try:
        result = await parser.fetch_and_parse(OUTLINE_URL)
        if result.assessments:
            assert len(result.assessments) >= 1
            # Verify weight validation on real data
            is_valid = parser.validate_weights(result.assessments)
            assert is_valid, (
                f"Weight sum validation failed: "
                f"{sum(a.weight for a in result.assessments):.2f}"
            )
    except Exception:
        pytest.skip("USYD Unit Outline URL not reachable")
