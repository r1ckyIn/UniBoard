"""Unit Outline HTML parser for USYD course assessment pages (TRD SS2.2)."""

import re
from dataclasses import dataclass, field

import httpx
import structlog
from bs4 import BeautifulSoup, Tag

logger = structlog.get_logger()

_WEIGHT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*%")


@dataclass
class AssessmentItem:
    """Parsed assessment component from a Unit Outline page."""

    name: str
    weight: float = 0.0  # 0.0-1.0 (30% -> 0.30)
    description: str = ""
    due_date: str | None = None
    length: str = ""
    ai_policy: str = ""


@dataclass
class UnitOutlineParseResult:
    """Complete parse result including raw HTML for re-parsing."""

    assessments: list[AssessmentItem] = field(default_factory=list)
    learning_outcomes: list[str] = field(default_factory=list)
    course_description: str = ""
    raw_html: str = ""


class UnitOutlineParser:
    """Parser for USYD Unit Outline HTML pages using BeautifulSoup4 + lxml."""

    async def fetch_and_parse(self, url: str) -> UnitOutlineParseResult:
        """Fetch a Unit Outline page and extract structured assessment data.

        Always stores raw_html in the result for future re-parsing.
        Parses HTML once and passes the soup object to all extraction methods.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            html = response.text

        soup = BeautifulSoup(html, "lxml")
        assessments = self._parse_soup(soup)
        learning_outcomes = self._extract_learning_outcomes_soup(soup)
        description = self._extract_description_soup(soup)

        return UnitOutlineParseResult(
            assessments=assessments,
            learning_outcomes=learning_outcomes,
            course_description=description,
            raw_html=html,
        )

    def parse(self, html: str) -> list[AssessmentItem]:
        """Extract assessment items from Unit Outline HTML.

        Looks for #assessment-table or table.table-striped.table-bordered.
        Skips rows that fail to parse (per-row error handling).
        """
        soup = BeautifulSoup(html, "lxml")
        return self._parse_soup(soup)

    def _parse_soup(self, soup: BeautifulSoup) -> list[AssessmentItem]:
        """Extract assessment items from a pre-parsed BeautifulSoup object."""

        # Try #assessment-table first, then fall back to class selectors
        table = soup.find(id="assessment-table")
        if table is None:
            table = soup.find("table", class_="table-striped")
        if table is None:
            logger.warning("unit_outline_no_assessment_table")
            return []

        if not isinstance(table, Tag):
            return []

        # Collect <th> text values from the thead (or first header row) so
        # _parse_row can fall back on positional header-index matching when
        # CSS-class selectors return empty (USYD HTML drift guard).
        headers = self._extract_headers(table)

        items: list[AssessmentItem] = []
        rows = table.find_all("tr")

        for row in rows:
            if not isinstance(row, Tag):
                continue
            raw_cells = row.find_all("td")
            if not raw_cells:
                # Skip header rows (they use <th>)
                continue
            cells: list[Tag] = [c for c in raw_cells if isinstance(c, Tag)]
            if not cells:
                continue

            try:
                item = self._parse_row(row, cells, headers)
                if item is not None:
                    items.append(item)
            except Exception:
                logger.warning(
                    "unit_outline_row_parse_error",
                    row_text=row.get_text(strip=True)[:100],
                )

        return items

    @staticmethod
    def _extract_headers(table: Tag) -> list[str]:
        """Return the list of <th> text values from the first header row.

        Scoped to the first <tr> (preferred inside <thead>) so row-header <th>
        cells in the body do not inflate the header list and misalign index
        lookups in ``_extract_by_header_index``.
        """
        thead = table.find("thead")
        header_row = (
            thead.find("tr") if isinstance(thead, Tag) else table.find("tr")
        )
        if not isinstance(header_row, Tag):
            return []
        return [
            th.get_text(strip=True)
            for th in header_row.find_all("th")
            if isinstance(th, Tag)
        ]

    @staticmethod
    def _extract_by_header_index(
        cells: list[Tag], headers: list[str], header_keywords: list[str]
    ) -> str:
        """Return the text of the cell whose column header matches any keyword.

        `headers` is the list of <th> text values extracted from the header row.
        `header_keywords` is a list of case-insensitive substrings to match
        (e.g. ["due", "deadline"] or ["length", "word", "duration"]).

        Returns empty string when no matching header or the cell is missing.
        """
        for idx, header in enumerate(headers):
            header_lower = header.lower()
            if any(kw.lower() in header_lower for kw in header_keywords):
                if idx < len(cells):
                    return cells[idx].get_text(strip=True)
                return ""
        return ""

    def _parse_row(
        self, row: Tag, cells: list[Tag], headers: list[str] | None = None
    ) -> AssessmentItem | None:
        """Parse a single assessment table row."""
        if headers is None:
            headers = []

        # Try CSS class selectors first, then fall back to positional
        name_el = row.find(class_="assessment-type")
        weight_el = row.find(class_="assessment-weight")
        due_el = row.find(class_="assessment-due")
        length_el = row.find(class_="assessment-length")
        desc_el = row.find(class_="assessment-description")
        ai_el = row.find(class_="assessment-use-of-ai")

        # Fallback to positional if CSS classes not found
        name = ""
        if name_el and isinstance(name_el, Tag):
            name = name_el.get_text(strip=True)
        elif len(cells) >= 1 and isinstance(cells[0], Tag):
            name = cells[0].get_text(strip=True)

        if not name:
            return None

        weight_text = ""
        if weight_el and isinstance(weight_el, Tag):
            weight_text = weight_el.get_text(strip=True)
        elif len(cells) >= 2:
            # Scan cells for percentage pattern
            for cell in cells[1:]:
                if not isinstance(cell, Tag):
                    continue
                text = cell.get_text(strip=True)
                if _WEIGHT_RE.search(text):
                    weight_text = text
                    break

        weight = self._parse_weight(weight_text)

        # Due date: CSS class first, then positional header-index fallback.
        due_text = ""
        if due_el and isinstance(due_el, Tag):
            due_text = due_el.get_text(strip=True)
        if not due_text:
            due_text = self._extract_by_header_index(
                cells, headers, ["due", "deadline"]
            )
        due_date: str | None = due_text or None

        # Length: CSS class first, then positional header-index fallback.
        length = ""
        if length_el and isinstance(length_el, Tag):
            length = length_el.get_text(strip=True)
        if not length:
            length = self._extract_by_header_index(
                cells, headers, ["length", "word", "duration"]
            )

        # Description: CSS class first, then positional header-index fallback.
        description = ""
        if desc_el and isinstance(desc_el, Tag):
            description = desc_el.get_text(strip=True)
        if not description:
            description = self._extract_by_header_index(
                cells, headers, ["description", "details"]
            )

        ai_policy = ""
        if ai_el and isinstance(ai_el, Tag):
            ai_policy = ai_el.get_text(strip=True)

        return AssessmentItem(
            name=name,
            weight=weight,
            description=description,
            due_date=due_date,
            length=length,
            ai_policy=ai_policy,
        )

    def _parse_weight(self, text: str) -> float:
        """Parse a weight string like '30%' into a float 0.30.

        Returns 0.0 if no percentage pattern found.
        """
        match = _WEIGHT_RE.search(text)
        if match:
            return float(match.group(1)) / 100.0
        return 0.0

    def validate_weights(self, items: list[AssessmentItem]) -> bool:
        """Validate that assessment weights sum to approximately 100% (95-105%)."""
        total = sum(item.weight for item in items)
        return 0.95 <= total <= 1.05

    def _extract_learning_outcomes(self, html: str) -> list[str]:
        """Extract learning outcomes section if present (public API)."""
        soup = BeautifulSoup(html, "lxml")
        return self._extract_learning_outcomes_soup(soup)

    def _extract_learning_outcomes_soup(self, soup: BeautifulSoup) -> list[str]:
        """Extract learning outcomes from a pre-parsed soup object."""
        outcomes: list[str] = []

        # Look for learning outcomes section
        section = soup.find(id="learning-outcomes")
        if section is None:
            # Try heading-based search
            heading = soup.find(
                lambda tag: isinstance(tag, Tag)
                and tag.name in ("h2", "h3")
                and "learning outcome" in tag.get_text(strip=True).lower()
            )
            if heading and isinstance(heading, Tag):
                section = heading.find_next("ul")

        if section and isinstance(section, Tag):
            for li in section.find_all("li"):
                text = li.get_text(strip=True)
                if text:
                    outcomes.append(text)

        return outcomes

    def _extract_description(self, html: str) -> str:
        """Extract course description section if present (public API)."""
        soup = BeautifulSoup(html, "lxml")
        return self._extract_description_soup(soup)

    def _extract_description_soup(self, soup: BeautifulSoup) -> str:
        """Extract course description from a pre-parsed soup object."""
        section = soup.find(id="unit-description")
        if section is None:
            heading = soup.find(
                lambda tag: isinstance(tag, Tag)
                and tag.name in ("h2", "h3")
                and "description" in tag.get_text(strip=True).lower()
            )
            if heading and isinstance(heading, Tag):
                next_el = heading.find_next("p")
                if next_el and isinstance(next_el, Tag):
                    return next_el.get_text(strip=True)

        if section and isinstance(section, Tag):
            return section.get_text(strip=True)

        return ""
