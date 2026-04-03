"""Tests for fail-fast config validation in production mode."""

import pytest

from src.config import Settings


class TestConfigValidation:
    """Verify that known-insecure defaults are rejected when debug=False."""

    def test_rejects_default_jwt_secret_in_production(self) -> None:
        with pytest.raises(ValueError, match="SUPABASE_JWT_SECRET"):
            Settings(
                debug=False,
                supabase_jwt_secret="super-secret-jwt-token-with-at-least-32-characters-long",
                encryption_key="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
                database_url="postgresql+asyncpg://user:pass@db.supabase.co:5432/postgres",
                _env_file=None,
            )

    def test_rejects_empty_encryption_key_in_production(self) -> None:
        with pytest.raises(ValueError, match="ENCRYPTION_KEY"):
            Settings(
                debug=False,
                supabase_jwt_secret="real-production-secret-must-be-at-least-32-chars",
                encryption_key="",
                database_url="postgresql+asyncpg://user:pass@db.supabase.co:5432/postgres",
                _env_file=None,
            )

    def test_rejects_allzeros_encryption_key_in_production(self) -> None:
        with pytest.raises(ValueError, match="ENCRYPTION_KEY"):
            Settings(
                debug=False,
                supabase_jwt_secret="real-production-secret-must-be-at-least-32-chars",
                encryption_key="0" * 64,
                database_url="postgresql+asyncpg://user:pass@db.supabase.co:5432/postgres",
                _env_file=None,
            )

    def test_rejects_localhost_database_in_production(self) -> None:
        with pytest.raises(ValueError, match="DATABASE_URL"):
            Settings(
                debug=False,
                supabase_jwt_secret="real-production-secret-must-be-at-least-32-chars",
                encryption_key="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
                database_url="postgresql+asyncpg://postgres:postgres@localhost:54322/postgres",
                _env_file=None,
            )

    def test_allows_defaults_in_debug_mode(self) -> None:
        # Should NOT raise -- debug=True allows all defaults
        s = Settings(debug=True, _env_file=None)
        assert s.debug is True

    def test_allows_real_values_in_production(self) -> None:
        # Should NOT raise -- all values are real production values
        s = Settings(
            debug=False,
            supabase_jwt_secret="real-prod-secret-at-least-32chars-long!!",
            encryption_key="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
            database_url="postgresql+asyncpg://user:pass@db.supabase.co:5432/postgres",
            _env_file=None,
        )
        assert s.debug is False
