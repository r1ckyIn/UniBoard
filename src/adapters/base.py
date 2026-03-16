"""Abstract adapter interfaces per TRD SS3.2."""

from abc import ABC, abstractmethod


class LMSAdapter(ABC):
    """Interface for Learning Management System adapters (e.g. Canvas)."""

    @abstractmethod
    async def get_courses(self) -> list[dict[str, object]]:
        """Fetch all enrolled courses."""

    @abstractmethod
    async def get_grades(self, course_id: str) -> list[dict[str, object]]:
        """Fetch grade/enrollment data for a course."""

    @abstractmethod
    async def get_assignments(self, course_id: str) -> list[dict[str, object]]:
        """Fetch assignments for a course."""

    @abstractmethod
    async def get_modules(self, course_id: str) -> list[dict[str, object]]:
        """Fetch modules (with items) for a course."""

    @abstractmethod
    async def get_tabs(self, course_id: str) -> list[dict[str, object]]:
        """Fetch navigation tabs for a course."""

    @abstractmethod
    async def validate_token(self) -> bool:
        """Check whether the configured API token is valid."""

    @abstractmethod
    async def close(self) -> None:
        """Release underlying HTTP resources."""


class DiscussionAdapter(ABC):
    """Interface for discussion forum adapters (e.g. Ed Discussion)."""

    @abstractmethod
    async def get_threads(
        self,
        course_id: str,
        *,
        filter: str | None = None,
        sort: str = "new",
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, object]]:
        """Fetch discussion threads for a course."""

    @abstractmethod
    async def get_thread(self, thread_id: str) -> dict[str, object]:
        """Fetch a single thread by ID."""

    @abstractmethod
    async def search_threads(
        self, course_id: str, query: str
    ) -> list[dict[str, object]]:
        """Search threads within a course."""

    @abstractmethod
    async def validate_token(self) -> bool:
        """Check whether the configured API token is valid."""

    @abstractmethod
    async def close(self) -> None:
        """Release underlying HTTP resources."""


class LessonAdapter(ABC):
    """Interface for lesson/slide adapters (e.g. Ed Lessons)."""

    @abstractmethod
    async def get_lessons(
        self, course_id: str
    ) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
        """Fetch lessons and module groupings for a course.

        Returns (lessons, modules).
        """

    @abstractmethod
    async def get_lesson(self, lesson_id: str) -> dict[str, object]:
        """Fetch a single lesson with slides populated."""

    @abstractmethod
    async def validate_token(self) -> bool:
        """Check whether the configured API token is valid."""

    @abstractmethod
    async def close(self) -> None:
        """Release underlying HTTP resources."""
