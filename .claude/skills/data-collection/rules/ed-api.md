# Ed API Skills

Rules for working with Ed Discussion and Ed Lessons APIs via `EdDiscussionAdapter` and `EdLessonsAdapter`.

---

## Rule 1: Field Naming — Verified Mappings from TRD SS9.4

Ed API field names differ from the hschafer/edstem OSS library. The correct mappings (verified via curl testing) are defined in `src/adapters/ed_lessons.py`:

```python
ED_FIELD_MAP = {
    "content": "content",    # NOT "passage" (hschafer/edstem error)
    "number": "number",      # NOT "lesson_number"
    "user_id": "user_id",    # NOT "creator_id"
}
```

**Key points:**
- Ed slide content field is `content`, not `passage` -- the hschafer/edstem library uses wrong name
- Lesson ordering field is `number`, not `lesson_number`
- Module creator field is `user_id`, not `creator_id`
- Thread content is Ed XML `<document version="2.0">` format (not HTML or plain text)
- Thread response wraps data in `{"threads": [...]}` — use `data.get("threads", [])`
- Lesson detail wraps data in `{"lesson": {...}}` — validated via `EdLessonDetailResponse`
- Lesson list returns both `{"lessons": [...], "modules": [...]}` in single response

**Reference:** TRD SS9.4 contains the full verification results. The only public reference for Ed API is the hschafer/edstem OSS repository, but it has field naming errors.

---

## Rule 2: Graceful Degradation — Return Empty on Failure

Ed adapters NEVER raise exceptions to callers. All network and parsing errors are caught and empty results returned.

**Pattern in `get_threads()`:**
```python
async def get_threads(self, course_id, ...) -> list[dict]:
    try:
        response = await self._request("GET", f"/courses/{course_id}/threads", ...)
        if response.status_code != 200:
            logger.warning("ed_threads_error", course_id=course_id, status=response.status_code)
            return []
        data = response.json()
        raw_threads = data.get("threads", [])
        return self._parse_threads(raw_threads)
    except (httpx.RequestError, UpstreamUnavailableError) as exc:
        logger.error("ed_threads_network_error", error=str(exc))
        return []
```

**Key points:**
- Non-200 status: log warning, return empty list (not raise)
- Network error (`httpx.RequestError`): log error, return empty list
- Circuit breaker open (`UpstreamUnavailableError`): log, return empty list
- `get_thread()` returns empty dict `{}` on failure
- `get_lessons()` returns tuple `([], [])` on failure
- This differs from Canvas adapter which raises typed errors -- design choice per TRD

---

## Rule 3: Ed XML Parsing via parse_ed_document()

Ed thread content and lesson slide content use a custom XML dialect. The shared parser is in `src/parsers/ed_document.py`.

**Usage:**
```python
from src.parsers.ed_document import parse_ed_document

plain_text = parse_ed_document(thread["content"])
```

**XML structure:**
```xml
<document version="2.0">
  <paragraph>Text content</paragraph>
  <heading level="2">Section Title</heading>
  <code-block language="python">code here</code-block>
  <list><list-item>Item 1</list-item></list>
  <callout type="info">Note text</callout>
  <bold>emphasized</bold>
  <image alt="description" src="url"/>
  <math>LaTeX expression</math>
</document>
```

**Key points:**
- Block tags (`paragraph`, `heading`, `code-block`, `callout`, `list-item`) produce newlines
- Inline tags (`bold`, `italic`, `link`, `code`, `math`) contribute text inline
- Images produce `[Image: alt_text]` placeholders
- On malformed XML (`ET.ParseError`): logs warning, returns raw content as fallback
- Empty or whitespace-only input returns empty string

---

## Rule 4: No Public Documentation — Reference Sources

Ed API has NO public documentation. All knowledge comes from:

1. **hschafer/edstem** OSS library — only public reference, but has field naming errors (see Rule 1)
2. **TRD SS9.4** — curl-verified field mappings for UniBoard
3. **CLAUDE.md** — documented pitfalls (zsh token escaping, etc.)

**Endpoint discovery process:**
- Base URL: `https://edstem.org/api`
- Auth: `Authorization: Bearer {token}` header
- Token obtained from Ed Discussion web UI (browser DevTools network tab)
- Test with `curl -H "Authorization: Bearer $TOKEN" https://edstem.org/api/courses`

---

## Rule 5: Per-Item Pydantic Validation

Both Ed adapters use Pydantic models with `extra='ignore'` and per-item error handling.

**Pattern in `_parse_threads()`:**
```python
class EdThreadResponse(BaseModel):
    model_config = ConfigDict(extra="ignore", strict=False)
    id: int
    title: str
    content: str = ""
    is_endorsed: bool = False
    # ... other fields with defaults

def _parse_threads(self, items: list[dict]) -> list[dict]:
    parsed = []
    for item in items:
        try:
            thread = EdThreadResponse.model_validate(item)
            parsed.append(thread.model_dump())
        except ValidationError:
            logger.warning("ed_thread_parse_error", thread_id=item.get("id", "unknown"))
    return parsed
```

**Key points:**
- `extra="ignore"`: unknown fields from undocumented API are silently dropped
- `strict=False`: allows type coercion (e.g., string "123" accepted as int)
- All optional fields have defaults — only `id` and `title` are required
- Failed items are logged and skipped, never crash the batch
- Same pattern used for `EdLessonResponse`, `EdSlideResponse`, `EdModuleResponse`
