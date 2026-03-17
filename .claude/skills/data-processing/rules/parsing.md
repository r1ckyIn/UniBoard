# Parsing Rules

Rules for Ed XML/HTML parsing, Pydantic resilience, and per-item error handling.

## Rule 1: Ed XML Content
Use `parse_ed_document()` shared parser from `src/parsers/ed_document.py` for Ed Discussion content. Ed stores rich content as XML — strip tags for plain text, preserve structure for display.

## Rule 2: Pydantic Resilience
All API response models use `ConfigDict(extra='ignore', strict=False)`. Ed and Canvas APIs may add undocumented fields at any time. The `extra='ignore'` setting prevents validation errors from unknown fields.

## Rule 3: Per-Item Error Handling
When processing batches (grades, threads, modules), catch `ValidationError` per-item, log the error with structlog, and skip the item. Never crash the entire batch for one malformed item.
```python
for raw in items:
    try:
        parsed = ResponseModel.model_validate(raw)
        results.append(parsed)
    except ValidationError as e:
        logger.warning("parse_failed", item_id=raw.get("id"), error=str(e))
```

## Rule 4: HTML Parsing
Use BeautifulSoup4 with lxml parser for Unit Outline HTML. CSS class selectors are primary, positional cell index is fallback. Source: `src/parsers/unit_outline.py`
