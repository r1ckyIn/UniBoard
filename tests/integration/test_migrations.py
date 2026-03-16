"""Integration tests for Alembic migration lifecycle.

Runs alembic commands via subprocess to avoid destroying pytest-asyncio's
event loop (alembic async env.py uses asyncio.run() internally).
"""

import subprocess

from sqlalchemy import create_engine, text

# Synchronous URL for table counting
SYNC_DATABASE_URL = (
    "postgresql+psycopg2://uniboard:devpassword@localhost:5432/uniboard_dev"
)


def _count_tables() -> int:
    """Count user tables in the public schema (synchronous)."""
    engine = create_engine(SYNC_DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(
            text(
                "SELECT count(*) FROM pg_tables "
                "WHERE schemaname='public' AND tablename != 'alembic_version'"
            )
        )
        count: int = result.scalar() or 0
    engine.dispose()
    return count


def _reset_alembic_state() -> None:
    """Drop all tables including alembic_version for clean state (synchronous)."""
    engine = create_engine(SYNC_DATABASE_URL)
    with engine.begin() as conn:
        result = conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
        )
        tables = [row[0] for row in result.fetchall()]

        if tables:
            table_list = ", ".join(tables)
            conn.execute(text(f"DROP TABLE IF EXISTS {table_list} CASCADE"))
    engine.dispose()


def _run_alembic(command: str) -> None:
    """Run an alembic command via subprocess to isolate event loop."""
    result = subprocess.run(
        ["alembic", command, "head" if command == "upgrade" else "base"],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, (
        f"alembic {command} failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    )


def test_alembic_upgrade_head() -> None:
    """Upgrade to head should create all 11 tables."""
    _reset_alembic_state()
    _run_alembic("upgrade")

    count = _count_tables()
    assert count >= 11, f"Expected >=11 tables after upgrade, got {count}"


def test_alembic_downgrade_base() -> None:
    """Downgrade to base should drop all tables."""
    _reset_alembic_state()
    _run_alembic("upgrade")
    _run_alembic("downgrade")

    count = _count_tables()
    assert count == 0, f"Expected 0 tables after downgrade, got {count}"

    # Re-upgrade for other tests
    _run_alembic("upgrade")


def test_alembic_upgrade_then_downgrade() -> None:
    """Full cycle: upgrade -> verify -> downgrade -> verify -> re-upgrade."""
    _reset_alembic_state()

    # Upgrade
    _run_alembic("upgrade")
    count = _count_tables()
    assert count >= 11, f"Expected >=11 tables after upgrade, got {count}"

    # Downgrade
    _run_alembic("downgrade")
    count = _count_tables()
    assert count == 0, f"Expected 0 tables after downgrade, got {count}"

    # Re-upgrade for test isolation
    _run_alembic("upgrade")
