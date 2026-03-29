"""Simplified error classes for the standalone MCP server."""


class TokenInvalidError(Exception):
    """Raised when a platform API token is invalid or expired."""

    def __init__(self, platform: str) -> None:
        self.platform = platform
        super().__init__(f"{platform} API token is invalid or expired")


class UpstreamAPIError(Exception):
    """Raised when an upstream API returns an error."""

    def __init__(self, platform: str, detail: str = "") -> None:
        self.platform = platform
        self.detail = detail
        msg = f"{platform} API error: {detail}" if detail else f"{platform} API error"
        super().__init__(msg)


class RateLimitedError(Exception):
    """Raised when rate limit is exceeded."""

    def __init__(self, detail: str = "Too many requests") -> None:
        self.detail = detail
        super().__init__(detail)


class UpstreamUnavailableError(Exception):
    """Raised when an upstream service is unavailable."""

    def __init__(self, detail: str = "Upstream service unavailable") -> None:
        self.detail = detail
        super().__init__(detail)
