"""Ed XML document parser shared by Discussion + Lessons (Pitfall 20).

Ed thread content and lesson slide content use a custom XML dialect:
``<document version="2.0">`` with elements like ``<paragraph>``, ``<heading>``,
``<code>``, ``<code-block>``, ``<bold>``, ``<italic>``, ``<link>``, ``<image>``,
``<list>``, ``<list-item>``, ``<callout>``, ``<math>``.

This parser extracts clean structured text from that XML for indexing and display.
"""

import xml.etree.ElementTree as ET  # noqa: N817

import structlog

logger = structlog.get_logger()


def _extract_text(element: ET.Element) -> str:
    """Recursively extract text from an XML element tree."""
    parts: list[str] = []

    tag = element.tag

    # Block-level elements that should be on their own line
    block_tags = {
        "paragraph",
        "heading",
        "code-block",
        "callout",
        "list-item",
        "blockquote",
    }

    # Inline tags that just contribute text
    inline_tags = {"bold", "italic", "link", "code", "math", "underline", "strikethrough"}

    if tag in block_tags:
        # Collect text from this element and all children
        inner = _gather_inline_text(element)
        if inner.strip():
            parts.append(inner.strip())

    elif tag == "list":
        # Process each list-item child
        for child in element:
            child_text = _extract_text(child)
            if child_text.strip():
                parts.append(child_text.strip())

    elif tag == "image":
        alt = element.get("alt", "")
        if alt:
            parts.append(f"[Image: {alt}]")

    elif tag in inline_tags:
        inner = _gather_inline_text(element)
        if inner.strip():
            parts.append(inner.strip())

    elif tag == "document":
        # Top-level: recurse into children
        for child in element:
            child_text = _extract_text(child)
            if child_text.strip():
                parts.append(child_text.strip())

    else:
        # Unknown tag: recurse into children to extract any text
        inner = _gather_inline_text(element)
        if inner.strip():
            parts.append(inner.strip())

    return "\n".join(parts)


def _gather_inline_text(element: ET.Element) -> str:
    """Gather text content from an element and its inline children."""
    parts: list[str] = []

    if element.text:
        parts.append(element.text)

    for child in element:
        child_tag = child.tag

        if child_tag == "image":
            alt = child.get("alt", "")
            if alt:
                parts.append(f"[Image: {alt}]")
        elif child_tag in {"list", "paragraph", "heading", "code-block", "callout"}:
            # Block element inside inline context: extract recursively
            extracted = _extract_text(child)
            if extracted.strip():
                parts.append(extracted.strip())
        else:
            # Inline child: gather its text
            inline_text = _gather_inline_text(child)
            if inline_text:
                parts.append(inline_text)

        # Tail text (text after the closing tag of a child)
        if child.tail:
            parts.append(child.tail)

    return "".join(parts)


def parse_ed_document(xml_content: str) -> str:
    """Parse Ed XML ``<document version="2.0">`` content into clean structured text.

    Returns plain text suitable for search indexing and display.
    On malformed XML, logs a warning and returns the raw content as fallback.
    """
    if not xml_content or not xml_content.strip():
        return ""

    try:
        root = ET.fromstring(xml_content)  # noqa: S314
    except ET.ParseError:
        logger.warning("ed_xml_parse_error", content_preview=xml_content[:200])
        return xml_content

    return _extract_text(root)
