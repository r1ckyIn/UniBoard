"""Unit tests for sync task wiring logic: Ed sources, outline sync, sync_history."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

from src.models.course import Course
from src.models.sync_history import SyncHistory
from src.models.user import Profile
from src.sync.tasks import (
    _record_sync_history,
    sync_all_deadlines,
    sync_all_grades,
    sync_all_outlines,
)


def _make_profile(
    *,
    canvas_token: str | None = "enc-canvas",
    ed_token: str | None = "enc-ed",
    canvas_status: str = "active",
    ed_status: str = "active",
) -> Profile:
    """Build a mock-friendly Profile with sync-relevant fields."""
    profile = MagicMock(spec=Profile)
    profile.id = uuid.uuid4()
    profile.canvas_api_token_encrypted = canvas_token
    profile.ed_api_token_encrypted = ed_token
    profile.canvas_token_status = canvas_status
    profile.ed_token_status = ed_status
    profile.canvas_sync_status = "pending"
    profile.ed_sync_status = "pending"
    profile.canvas_last_synced_at = None
    profile.ed_last_synced_at = None
    profile.last_manual_sync_at = None
    return profile


def _make_course(
    user_id: uuid.UUID,
    *,
    canvas_course_id: str = "12345",
    ed_course_id: str | None = "67890",
    code: str = "COMP2017",
    unit_outline_url: str | None = None,
) -> Course:
    """Build a mock-friendly Course object."""
    course = MagicMock(spec=Course)
    course.id = uuid.uuid4()
    course.user_id = user_id
    course.canvas_course_id = canvas_course_id
    course.ed_course_id = ed_course_id
    course.code = code
    course.name = f"{code} Course"
    course.unit_outline_url = unit_outline_url
    return course


# ---------------------------------------------------------------------------
# Helpers: mock session factory
# ---------------------------------------------------------------------------


def _mock_session_factory(
    profiles: list[Profile],
    courses: list[Course],
) -> MagicMock:
    """Create a mock async_sessionmaker that returns sessions with canned data.

    The mock session supports:
    - session.execute(select(Profile)...) -> profiles
    - session.execute(select(Course)...) -> courses
    - session.get(Profile, id) -> matching profile
    - session.commit() / session.flush() -> no-op
    - session.add() -> no-op
    """
    profile_map = {p.id: p for p in profiles}

    def _make_mock_session() -> AsyncMock:
        mock_session = AsyncMock()

        async def _execute(stmt: object) -> MagicMock:
            stmt_str = str(stmt)
            result = MagicMock()
            # Distinguish between Profile and Course queries
            if "profiles" in stmt_str.lower():
                result.scalars.return_value.all.return_value = profiles
            elif "courses" in stmt_str.lower():
                result.scalars.return_value.all.return_value = courses
            else:
                result.scalars.return_value.all.return_value = []
            return result

        mock_session.execute = AsyncMock(side_effect=_execute)

        async def _get(model_cls: type, pk: uuid.UUID) -> Profile | None:
            return profile_map.get(pk)

        mock_session.get = AsyncMock(side_effect=_get)
        mock_session.commit = AsyncMock()
        mock_session.flush = AsyncMock()
        mock_session.add = MagicMock()

        return mock_session

    # async context manager factory
    factory = MagicMock()

    class _SessionCtx:
        def __init__(self) -> None:
            self.session = _make_mock_session()

        async def __aenter__(self) -> AsyncMock:
            return self.session

        async def __aexit__(self, *args: object) -> None:
            pass

    factory.side_effect = lambda: _SessionCtx()
    return factory


# ===========================================================================
# Test 1-3: sync_all_deadlines wires Ed sources
# ===========================================================================


class TestSyncAllDeadlinesEdWiring:
    """Verify Ed Lessons and Discussion data flows into deadline aggregation."""

    @patch("src.sync.tasks._record_sync_history", new_callable=AsyncMock)
    @patch("src.sync.tasks.get_encryption")
    @patch("src.sync.tasks._get_sync_session_factory")
    async def test_sync_all_deadlines_wires_ed_lessons(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """Ed Lessons data is passed to aggregate_and_dedup (not empty list)."""
        profile = _make_profile()
        course = _make_course(profile.id, ed_course_id="67890")

        mock_factory_fn.return_value = _mock_session_factory([profile], [course])

        enc = MagicMock()
        enc.decrypt.return_value = "plain-token"
        mock_get_enc.return_value = enc

        sample_lessons = [
            {"id": 1, "title": "L1", "due_at": "2024-04-01T23:59:00Z", "slide_count": 0}
        ]

        # Patch adapters at their source modules (lazy imports inside sync tasks)
        with (
            patch("src.adapters.canvas.CanvasAdapter") as MockCanvas,
            patch("src.adapters.ed_lessons.EdLessonsAdapter") as MockEdLessons,
            patch("src.adapters.ed_discussion.EdDiscussionAdapter") as MockEdDisc,
        ):
            canvas_inst = AsyncMock()
            canvas_inst.get_assignments.return_value = []
            MockCanvas.return_value = canvas_inst

            ed_inst = AsyncMock()
            ed_inst.get_lessons.return_value = (sample_lessons, [])
            MockEdLessons.return_value = ed_inst

            ed_disc_inst = AsyncMock()
            ed_disc_inst.get_threads.return_value = []
            MockEdDisc.return_value = ed_disc_inst

            with patch("src.sync.tasks.DeadlineService") as MockSvc:
                svc_inst = AsyncMock()
                svc_inst.aggregate_and_dedup.return_value = 1
                MockSvc.return_value = svc_inst

                await sync_all_deadlines()

                # Verify aggregate_and_dedup was called with non-empty ed_lessons_data
                svc_inst.aggregate_and_dedup.assert_called_once()
                call_kwargs = svc_inst.aggregate_and_dedup.call_args
                ed_lessons_arg = call_kwargs.kwargs.get("ed_lessons_data", [])
                assert len(ed_lessons_arg) > 0, (
                    "Ed Lessons data should be passed to aggregate_and_dedup"
                )

    @patch("src.sync.tasks._record_sync_history", new_callable=AsyncMock)
    @patch("src.sync.tasks.get_encryption")
    @patch("src.sync.tasks._get_sync_session_factory")
    async def test_sync_all_deadlines_wires_ed_discussion(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """Ed Discussion texts are passed to aggregate_and_dedup as list[tuple[str, str]]."""
        profile = _make_profile()
        course = _make_course(profile.id, ed_course_id="67890")

        mock_factory_fn.return_value = _mock_session_factory([profile], [course])

        enc = MagicMock()
        enc.decrypt.return_value = "plain-token"
        mock_get_enc.return_value = enc

        sample_threads = [
            {"id": "t1", "content": "Submit by 2024-04-15", "title": "HW1"},
        ]

        with (
            patch("src.adapters.canvas.CanvasAdapter") as MockCanvas,
            patch("src.adapters.ed_lessons.EdLessonsAdapter") as MockEdLessons,
            patch("src.adapters.ed_discussion.EdDiscussionAdapter") as MockEdDisc,
        ):
            canvas_inst = AsyncMock()
            canvas_inst.get_assignments.return_value = []
            MockCanvas.return_value = canvas_inst

            ed_inst = AsyncMock()
            ed_inst.get_lessons.return_value = ([], [])
            MockEdLessons.return_value = ed_inst

            ed_disc_inst = AsyncMock()
            ed_disc_inst.get_threads.return_value = sample_threads
            MockEdDisc.return_value = ed_disc_inst

            with patch("src.sync.tasks.DeadlineService") as MockSvc:
                svc_inst = AsyncMock()
                svc_inst.aggregate_and_dedup.return_value = 1
                MockSvc.return_value = svc_inst

                await sync_all_deadlines()

                svc_inst.aggregate_and_dedup.assert_called_once()
                call_kwargs = svc_inst.aggregate_and_dedup.call_args
                ed_disc_arg = call_kwargs.kwargs.get("ed_discussion_texts", [])
                assert len(ed_disc_arg) > 0, (
                    "Ed Discussion texts should be passed to aggregate_and_dedup"
                )
                # Verify items are tuples of (content, id)
                first = ed_disc_arg[0]
                assert isinstance(first, tuple)
                assert len(first) == 2

    @patch("src.sync.tasks._record_sync_history", new_callable=AsyncMock)
    @patch("src.sync.tasks.get_encryption")
    @patch("src.sync.tasks._get_sync_session_factory")
    async def test_sync_all_deadlines_ed_token_expired(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """Ed token expiry sets ed_token_status='expired' and sync continues."""
        from src.schemas.common import TokenInvalidError

        profile = _make_profile()
        course = _make_course(profile.id, ed_course_id="67890")

        mock_factory_fn.return_value = _mock_session_factory([profile], [course])

        enc = MagicMock()
        enc.decrypt.return_value = "plain-token"
        mock_get_enc.return_value = enc

        with (
            patch("src.adapters.canvas.CanvasAdapter") as MockCanvas,
            patch("src.adapters.ed_lessons.EdLessonsAdapter") as MockEdLessons,
            patch("src.adapters.ed_discussion.EdDiscussionAdapter") as MockEdDisc,
        ):
            canvas_inst = AsyncMock()
            canvas_inst.get_assignments.return_value = [
                {"id": 1, "name": "A1", "due_at": "2024-04-01T00:00:00Z"}
            ]
            MockCanvas.return_value = canvas_inst

            # Ed Lessons raises TokenInvalidError
            ed_inst = AsyncMock()
            ed_inst.get_lessons.side_effect = TokenInvalidError("Ed Lessons")
            MockEdLessons.return_value = ed_inst

            ed_disc_inst = AsyncMock()
            ed_disc_inst.get_threads.return_value = []
            MockEdDisc.return_value = ed_disc_inst

            with patch("src.sync.tasks.DeadlineService") as MockSvc:
                svc_inst = AsyncMock()
                svc_inst.aggregate_and_dedup.return_value = 0
                MockSvc.return_value = svc_inst

                # Should NOT raise -- sync continues after Ed token failure
                await sync_all_deadlines()

                # Verify aggregate_and_dedup was still called (with empty ed_lessons_data)
                svc_inst.aggregate_and_dedup.assert_called_once()


# ===========================================================================
# Test 4-5: sync_all_outlines
# ===========================================================================


class TestSyncAllOutlines:
    """Verify outline sync calls UnitOutlineParser and handles retries."""

    @patch("src.sync.tasks._get_sync_session_factory")
    async def test_sync_all_outlines_calls_parser(
        self,
        mock_factory_fn: MagicMock,
    ) -> None:
        """sync_all_outlines calls fetch_and_parse for each course with outline URL."""
        from src.parsers.usyd_outline import AssessmentItem, UnitOutlineParseResult

        profile = _make_profile()
        course = _make_course(
            profile.id,
            unit_outline_url="https://www.sydney.edu.au/units/COMP2017/2024-S1",
        )

        factory = _mock_session_factory([], [course])
        mock_factory_fn.return_value = factory

        parse_result = UnitOutlineParseResult(
            assessments=[AssessmentItem(name="Final Exam", weight=0.5)],
            learning_outcomes=["LO1: Design algorithms"],
            raw_html="<html>test</html>",
        )

        with patch("src.parsers.usyd_outline.UnitOutlineParser") as MockParser:
            parser_inst = AsyncMock()
            parser_inst.fetch_and_parse.return_value = parse_result
            MockParser.return_value = parser_inst

            await sync_all_outlines()

            parser_inst.fetch_and_parse.assert_called_once_with(
                "https://www.sydney.edu.au/units/COMP2017/2024-S1"
            )

    @patch("src.sync.tasks._get_sync_session_factory")
    async def test_sync_all_outlines_retries_on_error(
        self,
        mock_factory_fn: MagicMock,
    ) -> None:
        """sync_all_outlines retries up to 3 times on transient errors."""
        from src.parsers.usyd_outline import AssessmentItem, UnitOutlineParseResult

        profile = _make_profile()
        course = _make_course(
            profile.id,
            unit_outline_url="https://www.sydney.edu.au/units/COMP2017/2024-S1",
        )

        factory = _mock_session_factory([], [course])
        mock_factory_fn.return_value = factory

        parse_result = UnitOutlineParseResult(
            assessments=[AssessmentItem(name="Final Exam", weight=0.5)],
            learning_outcomes=[],
            raw_html="<html>ok</html>",
        )

        call_count = 0

        async def _fetch_side_effect(url: str) -> UnitOutlineParseResult:
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("network error")
            return parse_result

        with (
            patch("src.parsers.usyd_outline.UnitOutlineParser") as MockParser,
            patch("src.sync.tasks.asyncio.sleep", new_callable=AsyncMock),
        ):
            parser_inst = AsyncMock()
            parser_inst.fetch_and_parse.side_effect = _fetch_side_effect
            MockParser.return_value = parser_inst

            await sync_all_outlines()

            # Should have been called 3 times (2 failures + 1 success)
            assert parser_inst.fetch_and_parse.call_count == 3


# ===========================================================================
# Test 6-7: _record_sync_history and sync_all_grades integration
# ===========================================================================


class TestRecordSyncHistory:
    """Verify sync_history recording logic."""

    async def test_record_sync_history_success(self) -> None:
        """_record_sync_history inserts a SyncHistory row with correct fields."""
        user_id = uuid.uuid4()
        started = datetime.now(UTC)

        mock_session = AsyncMock()
        added_objects: list[SyncHistory] = []
        mock_session.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        mock_session.commit = AsyncMock()

        class _SessionCtx:
            async def __aenter__(self) -> AsyncMock:
                return mock_session

            async def __aexit__(self, *args: object) -> None:
                pass

        mock_factory = MagicMock(side_effect=lambda: _SessionCtx())

        await _record_sync_history(
            mock_factory,
            user_id,
            "grades",
            "success",
            records_updated=5,
            started_at=started,
        )

        # Verify a SyncHistory instance was added
        assert len(added_objects) == 1
        entry = added_objects[0]
        assert isinstance(entry, SyncHistory)
        assert entry.domain == "grades"
        assert entry.status == "success"
        assert entry.records_updated == 5
        assert entry.user_id == user_id
        assert entry.started_at == started
        assert entry.completed_at is not None
        mock_session.commit.assert_awaited_once()

    @patch("src.sync.tasks._record_sync_history", wraps=_record_sync_history)
    @patch("src.sync.tasks.get_encryption")
    @patch("src.sync.tasks._get_sync_session_factory")
    async def test_sync_all_grades_records_history(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """After grade sync, _record_sync_history is called with domain='grades'."""
        profile = _make_profile(ed_token=None)
        course = _make_course(profile.id, ed_course_id=None)

        mock_factory_fn.return_value = _mock_session_factory([profile], [course])

        enc = MagicMock()
        enc.decrypt.return_value = "plain-token"
        mock_get_enc.return_value = enc

        with patch(
            "src.sync.tasks._sync_user_grades", new_callable=AsyncMock, return_value=1
        ):
            await sync_all_grades()

        # _record_sync_history should have been called for domain="grades"
        mock_record.assert_called()
        call_args = mock_record.call_args
        assert call_args[0][2] == "grades"  # domain positional arg
        assert call_args[0][3] == "success"  # status positional arg
