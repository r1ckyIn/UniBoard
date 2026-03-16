"""Integration tests for Alembic migration lifecycle."""

import asyncio

from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command

TEST_DATABASE_URL = (
    "postgresql+asyncpg://uniboard:devpassword@localhost:5432/uniboard_dev"
)


def _get_alembic_config() -> Config:
    """Return an Alembic Config pointing to the project root."""
    config = Config("alembic.ini")
    config.set_main_option(
        "sqlalchemy.url",
        "postgresql+asyncpg://uniboard:devpassword@localhost:5432/uniboard_dev",
    )
    return config


async def _count_tables() -> int:
    """Count user tables in the public schema."""
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT count(*) FROM pg_tables "
                "WHERE schemaname='public' AND tablename != 'alembic_version'"
            )
        )
        count: int = result.scalar() or 0
    await engine.dispose()
    return count


async def _reset_alembic_state() -> None:
    """Drop all tables including alembic_version for clean state."""
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        # Get all table names
        result = await conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
        )
        tables = [row[0] for row in result.fetchall()]

        # Drop all tables with CASCADE
        if tables:
            table_list = ", ".join(tables)
            await conn.execute(text(f"DROP TABLE IF EXISTS {table_list} CASCADE"))
    await engine.dispose()


def test_alembic_upgrade_head() -> None:
    """Upgrade to head should create all 11 tables."""
    # Clean state: drop everything
    asyncio.run(_reset_alembic_state())

    config = _get_alembic_config()
    command.upgrade(config, "head")

    count = asyncio.run(_count_tables())
    assert count >= 11, f"Expected >=11 tables after upgrade, got {count}"


def test_alembic_downgrade_base() -> None:
    """Downgrade to base should drop all tables."""
    # Ensure clean state then upgrade
    asyncio.run(_reset_alembic_state())

    config = _get_alembic_config()
    command.upgrade(config, "head")
    command.downgrade(config, "base")

    count = asyncio.run(_count_tables())
    assert count == 0, f"Expected 0 tables after downgrade, got {count}"

    # Re-upgrade for other tests
    command.upgrade(config, "head")


def test_alembic_upgrade_then_downgrade() -> None:
    """Full cycle: upgrade -> verify -> downgrade -> verify -> re-upgrade."""
    # Clean state
    asyncio.run(_reset_alembic_state())

    config = _get_alembic_config()

    # Upgrade
    command.upgrade(config, "head")
    count = asyncio.run(_count_tables())
    assert count >= 11, f"Expected >=11 tables after upgrade, got {count}"

    # Downgrade
    command.downgrade(config, "base")
    count = asyncio.run(_count_tables())
    assert count == 0, f"Expected 0 tables after downgrade, got {count}"

    # Re-upgrade for test isolation
    command.upgrade(config, "head")
