"""Tests for security headers on FastAPI responses."""
from __future__ import annotations

from fastapi.testclient import TestClient


class TestSecurityHeaders:
    """Verify all security headers are present on responses."""

    def test_hsts_header(self, client: TestClient) -> None:
        """Response includes Strict-Transport-Security header."""
        response = client.get("/health")
        assert response.headers.get("Strict-Transport-Security") == (
            "max-age=63072000; includeSubDomains"
        )

    def test_x_frame_options_header(self, client: TestClient) -> None:
        """Response includes X-Frame-Options DENY."""
        response = client.get("/health")
        assert response.headers.get("X-Frame-Options") == "DENY"

    def test_x_content_type_options_header(self, client: TestClient) -> None:
        """Response includes X-Content-Type-Options nosniff."""
        response = client.get("/health")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"

    def test_referrer_policy_header(self, client: TestClient) -> None:
        """Response includes Referrer-Policy header."""
        response = client.get("/health")
        assert response.headers.get("Referrer-Policy") == (
            "strict-origin-when-cross-origin"
        )

    def test_csp_header_present(self, client: TestClient) -> None:
        """Response includes Content-Security-Policy with default-src."""
        response = client.get("/health")
        csp = response.headers.get("Content-Security-Policy")
        assert csp is not None
        assert "default-src 'self'" in csp

    def test_csp_connect_src_includes_supabase(self, client: TestClient) -> None:
        """CSP connect-src includes Supabase domains."""
        response = client.get("/health")
        csp = response.headers.get("Content-Security-Policy", "")
        assert "https://*.supabase.co" in csp
        assert "wss://*.supabase.co" in csp
