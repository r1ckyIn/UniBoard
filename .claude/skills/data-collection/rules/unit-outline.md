# Unit Outline Skills

Rules for parsing USYD Unit Outline HTML pages via `UnitOutlineParser` in `src/parsers/usyd_outline.py`.

---

## Rule 1: HTML Scraping with BeautifulSoup4 + lxml

Unit Outline pages are scraped from USYD's official website (not Canvas API, which may have incomplete data).

**Parser setup:**
```python
from bs4 import BeautifulSoup, Tag

soup = BeautifulSoup(html, "lxml")
```

**Table detection strategy (dual fallback):**
1. Try `soup.find(id="assessment-table")` (ID-based selector)
2. Fall back to `soup.find("table", class_="table-striped")` (CSS class selector)

**Row parsing strategy (dual fallback):**
1. Try CSS class selectors: `assessment-type`, `assessment-weight`, `assessment-due`, `assessment-length`, `assessment-description`, `assessment-use-of-ai`
2. Fall back to positional cell indexing if CSS classes not found

**Key points:**
- Uses `lxml` parser (not `html.parser`) for speed and robustness
- Header rows (`<th>`) are automatically skipped (only `<td>` rows processed)
- `isinstance(tag, Tag)` checks required because BeautifulSoup can return `NavigableString`
- HTTP fetch uses `httpx.AsyncClient` with 30s timeout
- Raw HTML is always stored in `UnitOutlineParseResult.raw_html` for future re-parsing

---

## Rule 2: Weight Validation — Sum Must Be 95%-105%

Assessment weights are extracted from percentage strings and validated against a tolerance band.

**Weight extraction:**
```python
_WEIGHT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*%")

def _parse_weight(self, text: str) -> float:
    match = _WEIGHT_RE.search(text)
    if match:
        return float(match.group(1)) / 100.0  # "30%" -> 0.30
    return 0.0
```

**Weight validation:**
```python
def validate_weights(self, items: list[AssessmentItem]) -> bool:
    total = sum(item.weight for item in items)
    return 0.95 <= total <= 1.05  # 95% to 105%
```

**Key points:**
- Weights stored as 0.0-1.0 floats (not percentages)
- 5% tolerance accounts for rounding in HTML display (e.g., "33%" + "33%" + "34%" = 1.00)
- If weight sum falls outside 95%-105%, the parse result should be flagged/rejected by the caller
- Some Unit Outline pages use non-standard weight formats; regex handles `30%`, `30.5%`, `30 %`
- Weight cell is found by scanning remaining cells for percentage pattern (not always at fixed position)

---

## Rule 3: Assessment Extraction — Name + Weight + Due Date

Each assessment row produces an `AssessmentItem` dataclass with structured fields.

**Data model:**
```python
@dataclass
class AssessmentItem:
    name: str              # Assessment name (required)
    weight: float = 0.0    # 0.0-1.0 scale
    description: str = ""  # Assessment description
    due_date: str | None = None  # Due date as text (not parsed to datetime)
    length: str = ""       # Length/duration requirement
    ai_policy: str = ""    # AI usage policy for this assessment
```

**Key points:**
- Name is the only required field; rows without a name are skipped (`return None`)
- Due dates are kept as raw text strings (not parsed to datetime) — USYD uses inconsistent date formats
- AI policy field (`assessment-use-of-ai`) is a USYD-specific addition to assessment tables
- Per-row error handling: failed rows are logged and skipped, never crash the batch

**Full parse result:**
```python
@dataclass
class UnitOutlineParseResult:
    assessments: list[AssessmentItem]   # Assessment table data
    learning_outcomes: list[str]        # Learning outcomes section
    course_description: str             # Unit description
    raw_html: str                       # Original HTML for re-parsing
```

---

## Rule 4: Additional Content Extraction

Beyond assessments, the parser extracts supplementary data:

**Learning outcomes:**
- Look for `#learning-outcomes` element, or heading containing "learning outcome"
- Extract `<li>` items from the next `<ul>` after the heading

**Course description:**
- Look for `#unit-description` element, or heading containing "description"
- Extract first `<p>` paragraph after the heading

**Key points:**
- Both use the dual-fallback pattern: ID selector first, then heading text search
- These are optional sections; empty results are valid
- `fetch_and_parse()` runs all extractors on a single `BeautifulSoup` parse (not re-parsing HTML multiple times)
