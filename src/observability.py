"""Cross-cutting observability helpers (Sentry tagging, etc.)."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

import sentry_sdk


@contextmanager
def sentry_phase_scope(phase: str) -> Iterator[sentry_sdk.Scope]:
    """Tag Sentry events inside the block with phase=<phase> without leaking
    the tag into subsequent events on the same async/thread context.

    Usage:
        with sentry_phase_scope("33"):
            sentry_sdk.capture_exception()
    """
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("phase", phase)
        yield scope
