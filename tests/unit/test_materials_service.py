"""Unit tests for CourseMaterialService rule-based description."""

from src.services.materials import _rule_based_description


class TestRuleBasedDescription:
    """Tests for rule-based folder description generation."""

    def test_pdf_and_ppt_files(self) -> None:
        items = [
            "lecture1.pdf", "lecture2.pdf", "lecture3.pdf",
            "slides1.ppt", "slides2.ppt",
            "notes1.pdf", "notes2.pdf", "notes3.pdf",
            "lab1.pdf", "lab2.pdf",
            "tutorial.pptx", "extra.pdf",
        ]
        result = _rule_based_description(items)
        assert "12" in result
        assert "PDF" in result

    def test_empty_list(self) -> None:
        result = _rule_based_description([])
        assert result == "Empty folder"

    def test_no_extensions(self) -> None:
        items = ["Introduction", "Week 1 Overview", "Resources"]
        result = _rule_based_description(items)
        assert "3 items" in result

    def test_single_type(self) -> None:
        items = ["file1.py", "file2.py", "file3.py"]
        result = _rule_based_description(items)
        assert "3 files" in result
        assert "PY" in result

    def test_mixed_types(self) -> None:
        items = ["doc.pdf", "code.py", "data.csv"]
        result = _rule_based_description(items)
        assert "3 files" in result
