"""Application configuration via pydantic-settings."""

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

    # Debug
    debug: bool = False
    log_level: str = "INFO"


_settings: Settings | None = None


def get_settings() -> Settings:
    """Return cached Settings singleton."""
    global _settings  # noqa: PLW0603
    if _settings is None:
        _settings = Settings()
    return _settings
