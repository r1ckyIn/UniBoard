"""Unit tests for Ed Discussion thread sync task and post-sync AI evaluation."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models.course import Course
from src.models.user import Profile


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
) -> Course:
    """Build a mock-friendly Course object."""
    course = MagicMock(spec=Course)
    course.id = uuid.uuid4()
    course.user_id = user_id
    course.canvas_course_id = canvas_course_id
    course.ed_course_id = ed_course_id
    course.code = code
    course.name = f"{code} Course"
    return course


def _mock_session_factory(
    profiles: list[Profile],
    courses: list[Course],
) -> MagicMock:
    """Create a mock async_sessionmaker that returns sessions with canned data."""
    profile_map = {p.id: p for p in profiles}

    def _make_mock_session() -> AsyncMock:
        mock_session = AsyncMock()

        async def _execute(stmt: object) -> MagicMock:
            stmt_str = str(stmt)
            result = MagicMock()
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
# Test 1: sync_ed_discussions fetches threads and UPSERTs into DB
# ===========================================================================


@pytest.mark.asyncio(loop_scope="session")
class TestSyncEdDiscussions:
    """Verify Ed Discussion thread sync task."""

    @patch("src.sync.discussions._record_sync_history", new_callable=AsyncMock)
    @patch("src.sync.discussions.get_encryption")
    @patch("src.sync.discussions._get_sync_session_factory")
    async def test_sync_fetches_and_upserts_threads(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """sync_ed_discussions fetches threads via adapter and UPSERTs into DB."""
        from src.sync.discussions import sync_ed_discussions

        profile = _make_profile()
        course = _make_course(profile.id, ed_course_id="67890")
        mock_factory_fn.return_value = _mock_session_factory([profile], [course])

        enc = MagicMock()
        enc.decrypt.return_value = "plain-token"
        mock_get_enc.return_value = enc

        sample_threads = [
            {
                "id": 101,
                "title": "Exam scope",
                "user": {"id": 1, "course_role": "student"},
                "category": "General",
                "content": "What is the exam scope?",
                "is_endorsed": True,
                "is_answered": True,
                "is_staff_answered": False,
                "created_at": "2026-03-25T10:00:00Z",
            },
        ]

        with (
            patch("src.adapters.ed_discussion.EdDiscussionAdapter") as MockAdapter,
            patch("src.sync.discussions.get_settings") as mock_settings,
            patch(
                "src.sync.discussions._evaluate_synced_threads", new_callable=AsyncMock
            ) as mock_eval,
        ):
            adapter_inst = AsyncMock()
            adapter_inst.get_threads.return_value = sample_threads
            MockAdapter.return_value = adapter_inst

            settings = MagicMock()
            settings.anthropic_api_key = ""
            mock_settings.return_value = settings

            await sync_ed_discussions()

            # Adapter should be called with the ed_course_id
            adapter_inst.get_threads.assert_called_once_with("67890")
            # Post-sync AI eval should NOT be called (no API key)
            mock_eval.assert_not_called()

    @patch("src.sync.discussions._record_sync_history", new_callable=AsyncMock)
    @patch("src.sync.discussions.get_encryption")
    @patch("src.sync.discussions._get_sync_session_factory")
    async def test_sync_sets_synced_at(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """sync_ed_discussions sets synced_at on each upserted thread."""
        from src.sync.discussions import sync_ed_discussions

        profile = _make_profile()
        course = _make_course(profile.id, ed_course_id="67890")
        mock_factory_fn.return_value = _mock_session_factory([profile], [course])

        enc = MagicMock()
        enc.decrypt.return_value = "plain-token"
        mock_get_enc.return_value = enc

        sample_threads = [
            {
                "id": 201,
                "title": "HW1",
                "user": {"id": 2, "course_role": "student"},
                "category": "Homework",
                "content": "HW1 details",
                "is_endorsed": False,
                "is_answered": False,
                "is_staff_answered": False,
                "created_at": "2026-03-26T12:00:00Z",
            },
        ]

        with (
            patch("src.adapters.ed_discussion.EdDiscussionAdapter") as MockAdapter,
            patch("src.sync.discussions.get_settings") as mock_settings,
            patch("src.sync.discussions.pg_insert") as mock_pg_insert,
        ):
            adapter_inst = AsyncMock()
            adapter_inst.get_threads.return_value = sample_threads
            MockAdapter.return_value = adapter_inst

            settings = MagicMock()
            settings.anthropic_api_key = ""
            mock_settings.return_value = settings

            # Capture pg_insert calls to inspect values
            mock_insert = MagicMock()
            mock_insert.values.return_value = mock_insert
            mock_insert.on_conflict_do_update.return_value = mock_insert
            mock_pg_insert.return_value = mock_insert

            await sync_ed_discussions()

            # pg_insert should have been called with synced_at
            mock_insert.values.assert_called_once()
            call_kwargs = mock_insert.values.call_args
            values = (
                call_kwargs[1]
                if call_kwargs[1]
                else call_kwargs[0][0] if call_kwargs[0] else {}
            )
            assert "synced_at" in values

    @patch("src.sync.discussions._record_sync_history", new_callable=AsyncMock)
    @patch("src.sync.discussions.get_encryption")
    @patch("src.sync.discussions._get_sync_session_factory")
    async def test_sync_skips_users_without_ed_token(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """sync_ed_discussions skips users with no ed_api_token_encrypted."""
        from src.sync.discussions import sync_ed_discussions

        # Empty user list simulates the SQL WHERE filter
        mock_factory_fn.return_value = _mock_session_factory([], [])

        enc = MagicMock()
        mock_get_enc.return_value = enc

        with (
            patch("src.adapters.ed_discussion.EdDiscussionAdapter") as MockAdapter,
            patch("src.sync.discussions.get_settings") as mock_settings,
        ):
            settings = MagicMock()
            settings.anthropic_api_key = ""
            mock_settings.return_value = settings

            await sync_ed_discussions()

            # No users returned by query -> adapter should NOT be instantiated
            MockAdapter.assert_not_called()

    @patch("src.sync.discussions._record_sync_history", new_callable=AsyncMock)
    @patch("src.sync.discussions.get_encryption")
    @patch("src.sync.discussions._get_sync_session_factory")
    async def test_sync_calls_evaluate_when_api_key_present(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """sync_ed_discussions calls _evaluate_synced_threads when API key is set."""
        from src.sync.discussions import sync_ed_discussions

        profile = _make_profile()
        course = _make_course(profile.id, ed_course_id="67890")
        mock_factory_fn.return_value = _mock_session_factory([profile], [course])

        enc = MagicMock()
        enc.decrypt.return_value = "plain-token"
        mock_get_enc.return_value = enc

        sample_threads = [
            {
                "id": 301,
                "title": "Thread",
                "user": {"id": 3, "course_role": "student"},
                "category": "General",
                "content": "Content",
                "is_endorsed": False,
                "is_answered": False,
                "is_staff_answered": False,
                "created_at": "2026-03-27T08:00:00Z",
            },
        ]

        with (
            patch("src.adapters.ed_discussion.EdDiscussionAdapter") as MockAdapter,
            patch("src.sync.discussions.get_settings") as mock_settings,
            patch(
                "src.sync.discussions._evaluate_synced_threads", new_callable=AsyncMock
            ) as mock_eval,
        ):
            adapter_inst = AsyncMock()
            adapter_inst.get_threads.return_value = sample_threads
            MockAdapter.return_value = adapter_inst

            settings = MagicMock()
            settings.anthropic_api_key = "sk-ant-test-key"
            mock_settings.return_value = settings

            await sync_ed_discussions()

            # _evaluate_synced_threads should be called
            mock_eval.assert_called_once()
            # Verify the synced_courses dict is passed
            call_args = mock_eval.call_args
            _session_factory_arg = call_args[0][0]
            synced_courses_arg = call_args[0][1]
            assert isinstance(synced_courses_arg, dict)
            assert profile.id in synced_courses_arg

    @patch("src.sync.discussions._record_sync_history", new_callable=AsyncMock)
    @patch("src.sync.discussions.get_encryption")
    @patch("src.sync.discussions._get_sync_session_factory")
    async def test_evaluate_synced_threads_calls_service(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """_evaluate_synced_threads calls evaluate_new_threads_ai per user/course."""
        from src.sync.discussions import _evaluate_synced_threads

        user_id = uuid.uuid4()
        course_id = uuid.uuid4()
        synced_courses = {user_id: [course_id]}

        factory = _mock_session_factory([], [])
        mock_factory_fn.return_value = factory

        with (
            patch("src.services.ai_engine.AIEngine"),
            patch("src.services.intelligence.EdIntelligenceService") as MockSvc,
            patch("src.sync.discussions.get_settings") as mock_settings,
        ):
            settings = MagicMock()
            settings.anthropic_api_key = "sk-ant-test"
            mock_settings.return_value = settings

            svc_inst = AsyncMock()
            svc_inst.evaluate_new_threads_ai.return_value = []
            MockSvc.return_value = svc_inst

            await _evaluate_synced_threads(factory, synced_courses)

            svc_inst.evaluate_new_threads_ai.assert_called_once()

    @patch("src.sync.discussions._record_sync_history", new_callable=AsyncMock)
    @patch("src.sync.discussions.get_encryption")
    @patch("src.sync.discussions._get_sync_session_factory")
    async def test_sync_records_sync_history(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """sync_ed_discussions records sync_history with domain='ed_discussions'."""
        from src.sync.discussions import sync_ed_discussions

        profile = _make_profile()
        course = _make_course(profile.id, ed_course_id="67890")
        mock_factory_fn.return_value = _mock_session_factory([profile], [course])

        enc = MagicMock()
        enc.decrypt.return_value = "plain-token"
        mock_get_enc.return_value = enc

        with (
            patch("src.adapters.ed_discussion.EdDiscussionAdapter") as MockAdapter,
            patch("src.sync.discussions.get_settings") as mock_settings,
        ):
            adapter_inst = AsyncMock()
            adapter_inst.get_threads.return_value = []
            MockAdapter.return_value = adapter_inst

            settings = MagicMock()
            settings.anthropic_api_key = ""
            mock_settings.return_value = settings

            await sync_ed_discussions()

            # _record_sync_history should be called with domain="ed_discussions"
            mock_record.assert_called()
            call_args = mock_record.call_args
            assert call_args[0][2] == "ed_discussions"

    @patch("src.sync.discussions._record_sync_history", new_callable=AsyncMock)
    @patch("src.sync.discussions.get_encryption")
    @patch("src.sync.discussions._get_sync_session_factory")
    async def test_sync_handles_token_invalid_error(
        self,
        mock_factory_fn: MagicMock,
        mock_get_enc: MagicMock,
        mock_record: AsyncMock,
    ) -> None:
        """sync_ed_discussions handles TokenInvalidError by setting status=degraded."""
        from src.schemas.common import TokenInvalidError
        from src.sync.discussions import sync_ed_discussions

        profile = _make_profile()
        course = _make_course(profile.id, ed_course_id="67890")
        mock_factory_fn.return_value = _mock_session_factory([profile], [course])

        enc = MagicMock()
        enc.decrypt.return_value = "plain-token"
        mock_get_enc.return_value = enc

        with (
            patch("src.adapters.ed_discussion.EdDiscussionAdapter") as MockAdapter,
            patch("src.sync.discussions.get_settings") as mock_settings,
        ):
            adapter_inst = AsyncMock()
            adapter_inst.get_threads.side_effect = TokenInvalidError("Ed Discussion")
            MockAdapter.return_value = adapter_inst

            settings = MagicMock()
            settings.anthropic_api_key = ""
            mock_settings.return_value = settings

            # Should NOT raise
            await sync_ed_discussions()

            # Profile should have degraded status
            assert profile.ed_token_status == "expired"
            assert profile.ed_sync_status == "degraded"
