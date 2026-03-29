"""Unit Outline HTML parser for USYD course assessment pages (standalone)."""

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
        """Fetch a Unit Outline page and extract structured assessment data."""
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
        """Extract assessment items from Unit Outline HTML."""
        soup = BeautifulSoup(html, "lxml")
        return self._parse_soup(soup)

    def _parse_soup(self, soup: BeautifulSoup) -> list[AssessmentItem]:
        """Extract assessment items from a pre-parsed BeautifulSoup object."""
        table = soup.find(id="assessment-table")
        if table is None:
            table = soup.find("table", class_="table-striped")
        if table is None:
            logger.warning("unit_outline_no_assessment_table")
            return []

        if not isinstance(table, Tag):
            return []

        items: list[AssessmentItem] = []
        rows = table.find_all("tr")

        for row in rows:
            if not isinstance(row, Tag):
                continue
            raw_cells = row.find_all("td")
            if not raw_cells:
                continue
            cells: list[Tag] = [c for c in raw_cells if isinstance(c, Tag)]
            if not cells:
                continue

            try:
                item = self._parse_row(row, cells)
                if item is not None:
                    items.append(item)
            except Exception:
                logger.warning(
                    "unit_outline_row_parse_error",
                    row_text=row.get_text(strip=True)[:100],
                )

        return items

    def _parse_row(self, row: Tag, cells: list[Tag]) -> AssessmentItem | None:
        """Parse a single assessment table row."""
        name_el = row.find(class_="assessment-type")
        weight_el = row.find(class_="assessment-weight")
        due_el = row.find(class_="assessment-due")
        length_el = row.find(class_="assessment-length")
        desc_el = row.find(class_="assessment-description")
        ai_el = row.find(class_="assessment-use-of-ai")

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
            for cell in cells[1:]:
                if not isinstance(cell, Tag):
                    continue
                text = cell.get_text(strip=True)
                if _WEIGHT_RE.search(text):
                    weight_text = text
                    break

        weight = self._parse_weight(weight_text)

        due_date: str | None = None
        if due_el and isinstance(due_el, Tag):
            due_date = due_el.get_text(strip=True) or None

        length = ""
        if length_el and isinstance(length_el, Tag):
            length = length_el.get_text(strip=True)

        description = ""
        if desc_el and isinstance(desc_el, Tag):
            description = desc_el.get_text(strip=True)

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
        """Parse a weight string like '30%' into a float 0.30."""
        match = _WEIGHT_RE.search(text)
        if match:
            return float(match.group(1)) / 100.0
        return 0.0

    def validate_weights(self, items: list[AssessmentItem]) -> bool:
        """Validate that assessment weights sum to approximately 100% (95-105%)."""
        total = sum(item.weight for item in items)
        return 0.95 <= total <= 1.05

    def _extract_learning_outcomes_soup(self, soup: BeautifulSoup) -> list[str]:
        """Extract learning outcomes from a pre-parsed soup object."""
        outcomes: list[str] = []

        section = soup.find(id="learning-outcomes")
        if section is None:
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
