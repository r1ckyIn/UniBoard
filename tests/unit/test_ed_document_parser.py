"""Unit tests for Ed XML document parser (parse_ed_document)."""

from src.parsers.ed_document import parse_ed_document

# --- Test XML content ---

SIMPLE_DOC = '<document version="2.0"><paragraph>Hello world</paragraph></document>'

HEADING_DOC = '<document version="2.0"><heading>Title</heading></document>'

BOLD_ITALIC_DOC = (
    '<document version="2.0">'
    "<paragraph><bold>important</bold> text</paragraph>"
    "</document>"
)

CODE_BLOCK_DOC = (
    '<document version="2.0">'
    '<code-block>print("hello")</code-block>'
    "</document>"
)

LIST_DOC = (
    '<document version="2.0">'
    "<list><list-item>A</list-item><list-item>B</list-item></list>"
    "</document>"
)

IMAGE_DOC = '<document version="2.0"><image alt="diagram"/></document>'

CALLOUT_DOC = (
    '<document version="2.0">'
    "<callout>Note: important</callout>"
    "</document>"
)

NESTED_INLINE_DOC = (
    '<document version="2.0">'
    "<paragraph><bold><italic>deep</italic></bold></paragraph>"
    "</document>"
)

COMPLEX_DOC = """<document version="2.0">
  <heading>Assignment 1</heading>
  <paragraph>This is the <bold>first</bold> assignment.</paragraph>
  <code-block>def solution(): pass</code-block>
  <list>
    <list-item>Item A</list-item>
    <list-item>Item B</list-item>
  </list>
  <callout>Important: submit by Friday</callout>
</document>"""


# --- Tests ---


class TestParseEdDocument:
    """Test parse_ed_document with various XML element types."""

    def test_parse_simple_paragraph(self) -> None:
        """Simple paragraph extracts clean text."""
        result = parse_ed_document(SIMPLE_DOC)
        assert result == "Hello world"

    def test_parse_heading(self) -> None:
        """Heading produces text on its own line."""
        result = parse_ed_document(HEADING_DOC)
        assert "Title" in result

    def test_parse_bold_italic(self) -> None:
        """Inline bold element extracted as text."""
        result = parse_ed_document(BOLD_ITALIC_DOC)
        assert "important" in result
        assert "text" in result

    def test_parse_code_block(self) -> None:
        """Code block content preserved."""
        result = parse_ed_document(CODE_BLOCK_DOC)
        assert 'print("hello")' in result

    def test_parse_list(self) -> None:
        """List items extracted as separate lines."""
        result = parse_ed_document(LIST_DOC)
        assert "A" in result
        assert "B" in result

    def test_parse_image_with_alt(self) -> None:
        """Image with alt text produces [Image: alt] placeholder."""
        result = parse_ed_document(IMAGE_DOC)
        assert "[Image: diagram]" in result

    def test_parse_callout(self) -> None:
        """Callout content extracted as text."""
        result = parse_ed_document(CALLOUT_DOC)
        assert "Note: important" in result

    def test_parse_nested_inline(self) -> None:
        """Nested inline elements (bold > italic) produce text."""
        result = parse_ed_document(NESTED_INLINE_DOC)
        assert "deep" in result

    def test_parse_empty_content(self) -> None:
        """Empty string returns empty string."""
        assert parse_ed_document("") == ""

    def test_parse_malformed_xml(self) -> None:
        """Malformed XML returns raw content as fallback."""
        raw = "<not valid xml"
        result = parse_ed_document(raw)
        assert result == raw

    def test_parse_mixed_content(self) -> None:
        """Complex document with multiple element types produces multi-line text."""
        result = parse_ed_document(COMPLEX_DOC)
        assert "Assignment 1" in result
        assert "first" in result
        assert "def solution(): pass" in result
        assert "Item A" in result
        assert "Item B" in result
        assert "Important: submit by Friday" in result
