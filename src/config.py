"""Application configuration via pydantic-settings."""

from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """UniBoard application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = (
        "postgresql+asyncpg://uniboard:devpassword@localhost:5432/uniboard_dev"
    )

    # Platform API tokens
    canvas_api_token: str = ""
    ed_api_token: str = ""

    # API base URLs
    canvas_base_url: str = "https://canvas.sydney.edu.au/api/v1"
    ed_base_url: str = "https://edstem.org/api"

    # Encryption
    encryption_key: str = ""

    # Auth
    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Sync engine intervals
    sync_grades_interval_min: int = 15
    sync_deadlines_interval_min: int = 60
    sync_modules_cron_hour: int = 3

    # AI (Anthropic)
    anthropic_api_key: str = ""
    ai_daily_limit_per_user: int = 100

    # Debug (default True for local dev; production sets DEBUG=false explicitly)
    debug: bool = True
    log_level: str = "INFO"

    @model_validator(mode="after")
    def _check_production_secret_key(self) -> Self:
        """Reject default secret_key when running in production mode."""
        if not self.debug and self.secret_key == "dev-secret-change-in-production":
            raise ValueError(
                "SECRET_KEY must be changed from default in production (debug=False)"
            )
        return self


_settings: Settings | None = None


def get_settings() -> Settings:
    """Return cached Settings singleton."""
    global _settings  # noqa: PLW0603
    if _settings is None:
        _settings = Settings()
    return _settings
