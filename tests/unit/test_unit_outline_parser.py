"""Unit tests for UnitOutlineParser: CSS selectors, positional fallback, weight validation, snapshot."""

from __future__ import annotations

from pathlib import Path

import pytest

from src.parsers.usyd_outline import AssessmentItem, UnitOutlineParser, UnitOutlineParseResult

# --- Load HTML snapshot fixture ---

FIXTURE_DIR = Path(__file__).parent.parent / "fixtures"
COMP2017_HTML = (FIXTURE_DIR / "usyd_comp2017_2026s1.html").read_text()


# --- HTML fixtures for specific tests ---

CSS_CLASS_HTML = """<html><body>
<table id="assessment-table" class="table table-striped table-bordered">
  <thead>
    <tr><th>Assessment</th><th>Weight</th><th>Due</th><th>Length</th><th>Description</th><th>Use of AI</th></tr>
  </thead>
  <tbody>
    <tr>
      <td class="assessment-type">Quiz 1</td>
      <td class="assessment-weight">10%</td>
      <td class="assessment-due">Week 3</td>
      <td class="assessment-length">30 minutes</td>
      <td class="assessment-description">Short quiz on basics</td>
      <td class="assessment-use-of-ai">Not permitted</td>
    </tr>
    <tr>
      <td class="assessment-type">Midterm</td>
      <td class="assessment-weight">25%</td>
      <td class="assessment-due">Week 7</td>
      <td class="assessment-length">1 hour</td>
      <td class="assessment-description">Covers weeks 1-6</td>
      <td class="assessment-use-of-ai">Not applicable</td>
    </tr>
    <tr>
      <td class="assessment-type">Project</td>
      <td class="assessment-weight">30%</td>
      <td class="assessment-due">Week 12</td>
      <td class="assessment-length">Group</td>
      <td class="assessment-description">Team project</td>
      <td class="assessment-use-of-ai">Permitted with attribution</td>
    </tr>
    <tr>
      <td class="assessment-type">Final Exam</td>
      <td class="assessment-weight">35%</td>
      <td class="assessment-due">Exam period</td>
      <td class="assessment-length">2 hours</td>
      <td class="assessment-description">Comprehensive final</td>
      <td class="assessment-use-of-ai">Not applicable</td>
    </tr>
  </tbody>
</table>
</body></html>"""

POSITIONAL_HTML = """<html><body>
<table class="table-striped">
  <thead><tr><th>Assessment</th><th>Weight</th></tr></thead>
  <tbody>
    <tr><td>Quiz 1</td><td>30%</td></tr>
    <tr><td>Final Exam</td><td>70%</td></tr>
  </tbody>
</table>
</body></html>"""

EMPTY_HTML = "<html><body></body></html>"

NO_TABLE_HTML = """<html><body>
<table><thead><tr><th>Name</th><th>Score</th></tr></thead>
<tbody><tr><td>Alice</td><td>95</td></tr></tbody></table>
</body></html>"""

MALFORMED_ROW_HTML = """<html><body>
<table id="assessment-table" class="table table-striped">
  <thead><tr><th>Assessment</th><th>Weight</th></tr></thead>
  <tbody>
    <tr><td class="assessment-type">Valid Item</td><td class="assessment-weight">50%</td></tr>
    <tr><th>Header-only row</th><th>Should be skipped</th></tr>
  </tbody>
</table>
</body></html>"""

LEARNING_OUTCOMES_HEADING_HTML = """<html><body>
<h2>Learning Outcomes</h2>
<ul>
  <li>Understand data structures</li>
  <li>Implement sorting algorithms</li>
  <li>Analyze time complexity</li>
</ul>
</body></html>"""

DESCRIPTION_HEADING_HTML = """<html><body>
<h2>Description</h2>
<p>An advanced course covering distributed systems and cloud computing.</p>
</body></html>"""


@pytest.fixture
def parser() -> UnitOutlineParser:
    """Create a UnitOutlineParser instance."""
    return UnitOutlineParser()


# --- CSS class selector tests ---


class TestCSSClassSelectors:
    """Test parsing with CSS class selectors."""

    def test_parse_css_class_selectors(self, parser: UnitOutlineParser) -> None:
        """HTML with CSS classes extracts 4 assessment items."""
        items = parser.parse(CSS_CLASS_HTML)
        assert len(items) == 4
        assert items[0].name == "Quiz 1"
        assert items[0].weight == pytest.approx(0.10)
        assert items[1].name == "Midterm"
        assert items[1].weight == pytest.approx(0.25)
        assert items[2].name == "Project"
        assert items[2].weight == pytest.approx(0.30)
        assert items[3].name == "Final Exam"
        assert items[3].weight == pytest.approx(0.35)

    def test_parse_description_and_length_fields(self, parser: UnitOutlineParser) -> None:
        """CSS class rows populate description and length fields."""
        items = parser.parse(CSS_CLASS_HTML)
        assert items[0].description == "Short quiz on basics"
        assert items[0].length == "30 minutes"
        assert items[1].description == "Covers weeks 1-6"
        assert items[1].length == "1 hour"

    def test_parse_ai_policy_field(self, parser: UnitOutlineParser) -> None:
        """CSS class rows populate ai_policy field."""
        items = parser.parse(CSS_CLASS_HTML)
        assert items[0].ai_policy == "Not permitted"
        assert items[2].ai_policy == "Permitted with attribution"
        assert items[3].ai_policy == "Not applicable"


# --- Positional fallback tests ---


class TestPositionalFallback:
    """Test parsing when CSS classes are absent."""

    def test_parse_positional_fallback(self, parser: UnitOutlineParser) -> None:
        """HTML WITHOUT CSS classes: positional fallback extracts items."""
        items = parser.parse(POSITIONAL_HTML)
        assert len(items) == 2
        assert items[0].name == "Quiz 1"
        assert items[0].weight == pytest.approx(0.30)
        assert items[1].name == "Final Exam"
        assert items[1].weight == pytest.approx(0.70)


# --- Weight validation tests ---


class TestWeightValidation:
    """Test validate_weights with various weight distributions."""

    def test_validate_weights_valid(self, parser: UnitOutlineParser) -> None:
        """4 items summing to 100% -> returns True."""
        items = [
            AssessmentItem(name="A1", weight=0.15),
            AssessmentItem(name="A2", weight=0.20),
            AssessmentItem(name="A3", weight=0.25),
            AssessmentItem(name="Exam", weight=0.40),
        ]
        assert parser.validate_weights(items) is True

    def test_validate_weights_invalid_low(self, parser: UnitOutlineParser) -> None:
        """Items summing to 80% -> returns False."""
        items = [
            AssessmentItem(name="A1", weight=0.30),
            AssessmentItem(name="A2", weight=0.30),
            AssessmentItem(name="A3", weight=0.20),
        ]
        assert parser.validate_weights(items) is False

    def test_validate_weights_invalid_high(self, parser: UnitOutlineParser) -> None:
        """Items summing to 120% -> returns False."""
        items = [
            AssessmentItem(name="A1", weight=0.50),
            AssessmentItem(name="A2", weight=0.50),
            AssessmentItem(name="A3", weight=0.20),
        ]
        assert parser.validate_weights(items) is False

    def test_validate_weights_close_to_100(self, parser: UnitOutlineParser) -> None:
        """Items summing to 99.5% -> returns True (within 95-105% tolerance)."""
        items = [
            AssessmentItem(name="A1", weight=0.33),
            AssessmentItem(name="A2", weight=0.33),
            AssessmentItem(name="A3", weight=0.335),
        ]
        assert parser.validate_weights(items) is True

    def test_parse_weight_percentage(self, parser: UnitOutlineParser) -> None:
        """_parse_weight converts percent strings correctly."""
        assert parser._parse_weight("30%") == pytest.approx(0.30)
        assert parser._parse_weight("15.5%") == pytest.approx(0.155)
        assert parser._parse_weight("no percent") == pytest.approx(0.0)


# --- Empty and malformed HTML tests ---


class TestEdgeCases:
    """Test graceful handling of empty and malformed HTML."""

    def test_parse_empty_html(self, parser: UnitOutlineParser) -> None:
        """Empty HTML body returns empty list (no table found)."""
        items = parser.parse(EMPTY_HTML)
        assert items == []

    def test_parse_no_assessment_table(self, parser: UnitOutlineParser) -> None:
        """HTML with tables but no #assessment-table and no .table-striped -> empty list."""
        items = parser.parse(NO_TABLE_HTML)
        assert items == []

    def test_parse_malformed_row_skipped(self, parser: UnitOutlineParser) -> None:
        """Table with one valid row and one header-only row -> returns 1 item."""
        items = parser.parse(MALFORMED_ROW_HTML)
        assert len(items) == 1
        assert items[0].name == "Valid Item"
        assert items[0].weight == pytest.approx(0.50)


# --- Snapshot tests ---


class TestSnapshot:
    """Test parsing with the real HTML snapshot fixture."""

    def test_parse_snapshot_comp2017(self, parser: UnitOutlineParser) -> None:
        """COMP2017 snapshot: extracts 4 assessments, weights sum to 100%."""
        items = parser.parse(COMP2017_HTML)
        assert len(items) == 4
        assert items[0].name == "Assignment 1: Bit Manipulation"
        assert items[0].weight == pytest.approx(0.15)
        assert items[1].name == "Assignment 2: Memory Allocator"
        assert items[1].weight == pytest.approx(0.20)
        assert items[2].name == "Assignment 3: Shell"
        assert items[2].weight == pytest.approx(0.25)
        assert items[3].name == "Final Exam"
        assert items[3].weight == pytest.approx(0.40)
        assert parser.validate_weights(items) is True

    def test_parse_result_stores_raw_html(self, parser: UnitOutlineParser) -> None:
        """UnitOutlineParseResult stores raw_html field."""
        items = parser.parse(COMP2017_HTML)
        result = UnitOutlineParseResult(
            assessments=items,
            raw_html=COMP2017_HTML,
        )
        assert result.raw_html == COMP2017_HTML
        assert len(result.raw_html) > 100


# --- Learning outcomes and description extraction ---


class TestExtractMetadata:
    """Test learning outcomes and description extraction."""

    def test_extract_learning_outcomes(self, parser: UnitOutlineParser) -> None:
        """COMP2017 snapshot: extracts 4 learning outcomes."""
        outcomes = parser._extract_learning_outcomes(COMP2017_HTML)
        assert len(outcomes) == 4
        assert "C programming" in outcomes[0]

    def test_extract_learning_outcomes_heading_fallback(
        self, parser: UnitOutlineParser
    ) -> None:
        """HTML with h2 'Learning Outcomes' + ul (no id) -> returns outcomes via heading."""
        outcomes = parser._extract_learning_outcomes(LEARNING_OUTCOMES_HEADING_HTML)
        assert len(outcomes) == 3
        assert "data structures" in outcomes[0]

    def test_extract_description(self, parser: UnitOutlineParser) -> None:
        """COMP2017 snapshot: extracts description containing 'C programming language'."""
        description = parser._extract_description(COMP2017_HTML)
        assert "C programming language" in description

    def test_extract_description_heading_fallback(
        self, parser: UnitOutlineParser
    ) -> None:
        """HTML with h2 'Description' + p (no id) -> returns description via heading."""
        description = parser._extract_description(DESCRIPTION_HEADING_HTML)
        assert "distributed systems" in description
