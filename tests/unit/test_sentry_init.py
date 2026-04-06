"""Tests for Sentry SDK initialization and CSP configuration."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import src.config as config_module
from src.config import Settings


class TestSentryDsnSetting:
    """Verify sentry_dsn field defaults and behavior."""

    def test_sentry_dsn_setting_default_empty(self) -> None:
        """Settings should default sentry_dsn to an empty string."""
        settings = Settings(debug=True)
        assert settings.sentry_dsn == ""


class TestCspContainsSentryIngest:
    """Verify CSP header includes Sentry ingest domain."""

    def test_csp_contains_sentry_ingest(self) -> None:
        """GET /health response CSP header must include ingest.sentry.io."""
        # Reset settings cache to pick up test environment
        config_module._settings = None
        try:
            from src.web.main import create_app

            app = create_app()
            client = TestClient(app)
            response = client.get("/health")
            csp = response.headers.get("Content-Security-Policy", "")
            assert "ingest.sentry.io" in csp
        finally:
            config_module._settings = None


class TestCspContainsCorsOrigins:
    """Verify CSP header includes CORS origins in connect-src."""

    def test_csp_contains_cors_origin(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """CSP connect-src must include the configured CORS origin."""
        monkeypatch.setenv("CORS_ORIGINS", "https://uniboard.vercel.app")
        monkeypatch.setenv("DEBUG", "true")
        config_module._settings = None
        try:
            from src.web.main import create_app

            app = create_app()
            client = TestClient(app)
            response = client.get("/health")
            csp = response.headers.get("Content-Security-Policy", "")
            assert "https://uniboard.vercel.app" in csp
        finally:
            config_module._settings = None

    def test_csp_contains_multiple_cors_origins(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """CSP connect-src must include all comma-separated CORS origins."""
        monkeypatch.setenv(
            "CORS_ORIGINS",
            "https://uniboard.vercel.app,https://staging.uniboard.vercel.app",
        )
        monkeypatch.setenv("DEBUG", "true")
        config_module._settings = None
        try:
            from src.web.main import create_app

            app = create_app()
            client = TestClient(app)
            response = client.get("/health")
            csp = response.headers.get("Content-Security-Policy", "")
            assert "https://uniboard.vercel.app" in csp
            assert "https://staging.uniboard.vercel.app" in csp
        finally:
            config_module._settings = None

    def test_csp_retains_existing_entries_with_cors(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Adding CORS origins must not remove existing CSP entries."""
        monkeypatch.setenv("CORS_ORIGINS", "https://uniboard.vercel.app")
        monkeypatch.setenv("DEBUG", "true")
        config_module._settings = None
        try:
            from src.web.main import create_app

            app = create_app()
            client = TestClient(app)
            response = client.get("/health")
            csp = response.headers.get("Content-Security-Policy", "")
            assert "'self'" in csp
            assert "*.supabase.co" in csp
            assert "*.ingest.sentry.io" in csp
            assert "https://uniboard.vercel.app" in csp
        finally:
            config_module._settings = None


class TestSentryInitConditional:
    """Verify Sentry init is conditional on DSN presence."""

    def test_sentry_init_skipped_when_no_dsn(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """sentry_sdk.init must NOT be called when SENTRY_DSN is empty."""
        monkeypatch.setenv("DEBUG", "true")
        monkeypatch.setenv("SENTRY_DSN", "")
        config_module._settings = None
        try:
            with patch("src.web.main.sentry_sdk.init") as mock_init:
                from src.web.main import create_app

                create_app()
                mock_init.assert_not_called()
        finally:
            config_module._settings = None

    def test_sentry_init_called_when_dsn_set(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """sentry_sdk.init must be called with correct DSN when set."""
        test_dsn = "https://test@o1.ingest.sentry.io/1"
        monkeypatch.setenv("DEBUG", "true")
        monkeypatch.setenv("SENTRY_DSN", test_dsn)
        config_module._settings = None
        try:
            with patch("src.web.main.sentry_sdk.init") as mock_init:
                from src.web.main import create_app

                create_app()
                mock_init.assert_called_once()
                call_kwargs = mock_init.call_args[1]
                assert call_kwargs["dsn"] == test_dsn
        finally:
            config_module._settings = None
