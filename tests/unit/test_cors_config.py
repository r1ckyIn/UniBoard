"""Tests for environment-based CORS origin configuration."""

from src.config import Settings


class TestCorsConfig:
    """Verify CORS origins field reads from env and splits correctly."""

    def test_cors_origins_defaults_to_localhost(self) -> None:
        s = Settings(_env_file=None)
        assert s.cors_origins == "http://localhost:3001"

    def test_cors_origins_from_env(self) -> None:
        s = Settings(cors_origins="https://uniboard.vercel.app", _env_file=None)
        assert s.cors_origins == "https://uniboard.vercel.app"

    def test_cors_origins_comma_separated_stripped(self) -> None:
        s = Settings(
            cors_origins="https://a.com, https://b.com",
            _env_file=None,
        )
        origins = [o.strip() for o in s.cors_origins.split(",")]
        assert origins == ["https://a.com", "https://b.com"]
