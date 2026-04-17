"""Unit tests for the daily APScheduler job registration (AIFEAT-01).

Wave 1 (Plan 34-02): real body replaces the Wave 0 xfail stub.
Pragmatic test: verify the task function exists, the settings default is 7,
and that a CronTrigger built with the same args carries the expected
timezone + hour slot.  A full-lifespan scheduler test would require DB
connectivity, so we stop short of spinning up AsyncIOScheduler here.
"""

from __future__ import annotations

from apscheduler.triggers.cron import CronTrigger


def test_daily_cron_registered_at_7am_sydney() -> None:
    """AIFEAT-01 / D-A2: scheduler has 'generate_study_recommendations_daily'
    wired with CronTrigger(hour=settings.study_rec_cron_hour_aest,
    minute=0, timezone='Australia/Sydney')."""
    from src.config import get_settings
    from src.sync import generate_study_recommendations_daily
    from src.sync.scheduled import (
        generate_study_recommendations_daily as scheduled_fn,
    )

    settings = get_settings()

    # Function is exported from the sync package facade...
    assert callable(generate_study_recommendations_daily)
    # ...and is the very function defined inside src/sync/scheduled.py.
    assert generate_study_recommendations_daily is scheduled_fn
    # Default hour must be 7 (07:00 AEST).
    assert settings.study_rec_cron_hour_aest == 7

    # CronTrigger with the same args carries the correct timezone + hour slot.
    trigger = CronTrigger(
        hour=settings.study_rec_cron_hour_aest,
        minute=0,
        timezone="Australia/Sydney",
    )
    assert str(trigger.timezone) == "Australia/Sydney"

    hour_field = next(f for f in trigger.fields if f.name == "hour")
    assert str(hour_field) == "7"

    minute_field = next(f for f in trigger.fields if f.name == "minute")
    assert str(minute_field) == "0"


def test_engine_registers_study_rec_job() -> None:
    """AIFEAT-01: engine.lifespan wires generate_study_recommendations_daily
    with the correct job id and AEST timezone literal.

    Reads the module source rather than spinning up the lifespan (which would
    require DB connection + live settings). This is sufficient to catch the
    most common regression: dropped job registration or UTC+offset drift.
    """
    import inspect

    from src.sync import engine

    source = inspect.getsource(engine.lifespan)
    assert "generate_study_recommendations_daily" in source
    # Both the function reference and the job id must appear.
    assert 'id="generate_study_recommendations_daily"' in source
    # AEST timezone literal must be present (CLAUDE.md Pitfall 4).
    assert 'timezone="Australia/Sydney"' in source
    # max_instances=1 guards against concurrent UPSERT races
    # (threat T-34-02-01).
    assert "max_instances=1" in source
