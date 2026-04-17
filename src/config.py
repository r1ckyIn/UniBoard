"""Application configuration via pydantic-settings."""

from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict

_KNOWN_UNSAFE_JWT_SECRETS = frozenset({
    "super-secret-jwt-token-with-at-least-32-characters-long",
})

_KNOWN_UNSAFE_ENCRYPTION_KEYS = frozenset({
    "0000000000000000000000000000000000000000000000000000000000000000",
    "",
})


class Settings(BaseSettings):
    """UniBoard application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database (Supabase PostgreSQL via asyncpg)
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:54322/postgres"
    )

    # Supabase
    supabase_url: str = "http://localhost:54321"
    supabase_jwt_secret: str = (
        "super-secret-jwt-token-with-at-least-32-characters-long"
    )
    supabase_service_role_key: str = ""

    # Platform API tokens
    canvas_api_token: str = ""
    ed_api_token: str = ""

    # API base URLs
    canvas_base_url: str = "https://canvas.sydney.edu.au/api/v1"
    ed_base_url: str = "https://edstem.org/api"

    # Encryption
    encryption_key: str = ""

    # Sync engine intervals
    sync_grades_interval_min: int = 15
    sync_deadlines_interval_min: int = 60
    sync_modules_cron_hour: int = 3
    sync_outline_cron_months: str = "3,8"
    sync_outline_cron_day: int = 1

    # AI (Anthropic)
    anthropic_api_key: str = ""
    ai_daily_limit_per_user: int = 100

    # RAG / Embeddings (Voyage AI)
    voyage_api_key: str = ""
    rag_token_threshold: int = 100_000  # switch to RAG above this
    rag_chunk_size: int = 512
    rag_chunk_overlap: int = 50
    rag_top_k: int = 15

    # MCP fallback
    mcp_fallback_token_threshold: int = 500  # trigger agent fallback below this

    # Translation
    translation_enabled: bool = True  # enable AI batch translation during sync

    # AWS SES
    ses_sender_email: str = "digest@uniboard.uk"
    ses_region: str = "ap-southeast-2"
    email_notifications_enabled: bool = True

    # Digest -- uses Australia/Sydney timezone, NOT static UTC offset
    digest_cron_hour_aest: int = 7  # 07:00 AEST (APScheduler handles DST)

    # Phase 34 -- Study recommendations daily cache (AIFEAT-01 / D-A2)
    study_rec_cron_hour_aest: int = 7  # 07:00 AEST (APScheduler handles DST)

    # Phase 34 -- Hot-set embedding worker interval (AIFEAT-02 / D-B1)
    embedding_worker_interval_min: int = 30

    # Reminder check interval
    reminder_check_interval_min: int = 30

    # Debug (default True for local dev; production sets DEBUG=false explicitly)
    debug: bool = True
    log_level: str = "INFO"

    # Sentry
    sentry_dsn: str = ""

    # CORS
    cors_origins: str = "http://localhost:3001"

    def model_post_init(self, __context: Any) -> None:
        """Reject known-insecure defaults in production mode."""
        if self.debug:
            return  # Allow defaults in dev mode

        errors: list[str] = []
        if self.supabase_jwt_secret in _KNOWN_UNSAFE_JWT_SECRETS:
            errors.append("SUPABASE_JWT_SECRET uses a known default value")
        if self.encryption_key in _KNOWN_UNSAFE_ENCRYPTION_KEYS:
            errors.append("ENCRYPTION_KEY is missing or uses a known default")
        if "localhost" in self.database_url:
            errors.append("DATABASE_URL points to localhost in production")
        if errors:
            raise ValueError(
                "Production config validation failed:\n"
                + "\n".join(f"  - {e}" for e in errors)
            )


_settings: Settings | None = None


def get_settings() -> Settings:
    """Return cached Settings singleton."""
    global _settings  # noqa: PLW0603
    if _settings is None:
        _settings = Settings()
    return _settings
