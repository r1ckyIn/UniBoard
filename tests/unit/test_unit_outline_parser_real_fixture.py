"""Parser regression tests against a fresh USYD COMP2017 page fixture.

Prior to this fixture the test suite only exercised a synthetic
``assessment-type``/``assessment-weight`` schema that never matched the
live USYD template. The production drift was invisible until users saw
5000% weight rows and "Outcomes assessed: LO1..." masquerading as
assessments on the course detail page.

``comp2017_real.html`` is a verbatim snapshot of the ``#assessment-table``
served by sydney.edu.au on 2026-04-23, captured with a logged-in browser
session. If USYD rolls out a new template, regenerate the fixture by
pointing playwright / agent-browser at the live page and re-exporting
``document.getElementById("assessment-table").outerHTML`` into this file.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from src.parsers.usyd_outline import UnitOutlineParser

FIXTURES = Path(__file__).parent.parent / "fixtures" / "usyd"


@pytest.fixture
def comp2017_real_html() -> str:
    return (FIXTURES / "comp2017_real.html").read_text()


@pytest.fixture
def parser() -> UnitOutlineParser:
    return UnitOutlineParser()


class TestCOMP2017Snapshot:
    """Pin parser behaviour against the real 2026 USYD COMP2017 outline."""

    def test_only_five_assessments_are_extracted(
        self, parser: UnitOutlineParser, comp2017_real_html: str
    ) -> None:
        """tr.primary filter must exclude outcomes + glossary rows."""
        items = parser.parse(comp2017_real_html)
        assert len(items) == 5
        names = [i.name for i in items]
        # Outcome metadata rows must not appear in the output.
        assert not any("Outcomes assessed" in n for n in names)
        assert not any("hurdle task" in n.lower() for n in names)
        assert not any("= " in n for n in names)

    def test_name_and_description_are_split(
        self, parser: UnitOutlineParser, comp2017_real_html: str
    ) -> None:
        """<b> is the short name; <div> is the description -- no concat."""
        items = parser.parse(comp2017_real_html)
        by_name = {i.name: i for i in items}
        assert "Final Exam" in by_name
        assert by_name["Final Exam"].description == "Pen and paper examination"

        assert "T0" in by_name
        assert by_name["T0"].description.startswith("Complete a test")

        assert "P1" in by_name
        assert "Write, debug" in by_name["P1"].description

        assert "Weekly tasks" in by_name
        assert by_name["Weekly tasks"].description == (
            "Activity to complete outside of class"
        )

    def test_weights_are_fractions_summing_to_one(
        self, parser: UnitOutlineParser, comp2017_real_html: str
    ) -> None:
        """Weights must be returned as fractions (0.5 == 50%)."""
        items = parser.parse(comp2017_real_html)
        weights = {i.name: i.weight for i in items}
        assert weights["Final Exam"] == pytest.approx(0.5)
        assert weights["T0"] == pytest.approx(0.05)
        assert weights["P1"] == pytest.approx(0.125)
        assert weights["P2"] == pytest.approx(0.125)
        assert weights["Weekly tasks"] == pytest.approx(0.2)
        assert sum(weights.values()) == pytest.approx(1.0)

    def test_due_dates_are_iso_or_none(
        self, parser: UnitOutlineParser, comp2017_real_html: str
    ) -> None:
        """dueDate span must round-trip through fromisoformat; week-only
        and "Formal exam period" entries must be None, not "2 hours"."""
        from datetime import datetime

        items = parser.parse(comp2017_real_html)
        by_name = {i.name: i for i in items}

        # Final Exam has no concrete date (Formal exam period) -> None
        assert by_name["Final Exam"].due_date is None
        # Weekly tasks just says "Weekly" -> None
        assert by_name["Weekly tasks"].due_date is None

        # T0 / P1 / P2 all have concrete ISO dates
        for key, expected_date in [
            ("T0", "2026-03-15T23:59"),
            ("P1", "2026-04-02T23:59"),
            ("P2", "2026-05-20T23:59"),
        ]:
            due = by_name[key].due_date
            assert due is not None, f"{key} missing due_date"
            assert due.startswith(expected_date), f"{key} = {due!r}"
            # Must round-trip through datetime.fromisoformat -- protects
            # the frontend date-fns path from RangeError.
            datetime.fromisoformat(due)

    def test_length_column_is_not_confused_with_due(
        self, parser: UnitOutlineParser, comp2017_real_html: str
    ) -> None:
        """Length strings like '2 hours' belong to the length field only."""
        items = parser.parse(comp2017_real_html)
        by_name = {i.name: i for i in items}
        assert by_name["Final Exam"].length == "2 hours"
        assert by_name["T0"].length == "50 minutes"
        assert by_name["P1"].length == "21 days"
        # None of these strings must leak into due_date.
        for item in items:
            if item.due_date:
                assert "hour" not in item.due_date.lower()
                assert "minute" not in item.due_date.lower()
                assert "day" not in item.due_date.lower()

    def test_ai_policy_is_populated(
        self, parser: UnitOutlineParser, comp2017_real_html: str
    ) -> None:
        items = parser.parse(comp2017_real_html)
        by_name = {i.name: i for i in items}
        assert by_name["Final Exam"].ai_policy == "AI prohibited"
        assert by_name["T0"].ai_policy == "AI allowed"

    def test_weights_validate(
        self, parser: UnitOutlineParser, comp2017_real_html: str
    ) -> None:
        """validate_weights must accept the real 100% sum."""
        items = parser.parse(comp2017_real_html)
        assert parser.validate_weights(items) is True
