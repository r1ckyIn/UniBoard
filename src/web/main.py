"""FastAPI application factory and entry point."""

import time
import uuid
from datetime import UTC, datetime

import sentry_sdk
import structlog
import structlog.contextvars
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.middleware import SlowAPIMiddleware

from src.config import get_settings
from src.logging import configure_logging
from src.schemas.common import ErrorDetail, ErrorResponse, MetaInfo, UniboardError
from src.sync.engine import lifespan
from src.web.rate_limit import limiter
from src.web.routes import api_router, health_router

logger = structlog.get_logger()


def _build_429_response(request: Request) -> JSONResponse:
    """Build a structured 429 response using ErrorResponse format."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=429,
        content=ErrorResponse(
            error=ErrorDetail(
                code="RATE_LIMITED",
                message="Too many requests. Please try again later.",
            ),
            meta=MetaInfo(request_id=request_id, timestamp=datetime.now(UTC)),
        ).model_dump(mode="json"),
    )


class _RateLimitMiddleware(SlowAPIMiddleware):
    """Custom rate-limit middleware that returns structured 429 responses."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await super().dispatch(request, call_next)
        if response.status_code == 429:
            return _build_429_response(request)
        return response


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    configure_logging()

    application = FastAPI(
        title="UniBoard API",
        version="0.1.0",
        description="University GPA Maximization Dashboard",
        lifespan=lifespan,
    )

    # CORS middleware -- origins configurable via CORS_ORIGINS env var
    settings = get_settings()

    # Sentry error tracking (conditional -- no-op when DSN is empty)
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            traces_sample_rate=0.1,
            send_default_pii=False,
            environment="production" if not settings.debug else "development",
        )

    origins = [o.strip() for o in settings.cors_origins.split(",")]
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # Rate limiting -- attach limiter to app state and add middleware
    application.state.limiter = limiter
    application.add_middleware(_RateLimitMiddleware)

    @application.middleware("http")
    async def access_log_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
        """Log HTTP request with method, path, status, duration; bind request_id."""
        structlog.contextvars.clear_contextvars()
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        structlog.contextvars.bind_contextvars(request_id=request_id)
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        response.headers["X-Request-ID"] = request_id
        return response

    # Dynamic CSP: include CORS origins in connect-src
    connect_src_parts = [
        "'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://*.ingest.sentry.io",
    ]
    connect_src_parts.extend(origins)
    connect_src = " ".join(connect_src_parts)

    # Keep in sync with frontend/next.config.ts securityHeaders
    _security_headers = {
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Content-Security-Policy": "; ".join([
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            f"connect-src {connect_src}",
        ]),
    }

    @application.middleware("http")
    async def security_headers_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        for header, value in _security_headers.items():
            response.headers[header] = value
        return response

    @application.exception_handler(UniboardError)
    async def uniboard_error_handler(request: Request, exc: UniboardError) -> JSONResponse:
        """Handle UniboardError subclasses with structured error response."""
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=ErrorDetail(code=exc.code, message=exc.message),
                meta=MetaInfo(request_id=request_id, timestamp=datetime.now(UTC)),
            ).model_dump(mode="json"),
        )

    @application.exception_handler(Exception)
    async def catch_all_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all handler -- never leak stack traces to clients."""
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(
            "unhandled_exception",
            request_id=request_id,
            exc_info=exc,
        )
        # Catch-all prevents ASGI-level propagation to Sentry middleware
        sentry_sdk.capture_exception(exc)
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="INTERNAL_ERROR",
                    message="An unexpected error occurred",
                ),
                meta=MetaInfo(request_id=request_id, timestamp=datetime.now(UTC)),
            ).model_dump(mode="json"),
        )

    # Include API routes
    application.include_router(api_router)

    # Health check at root level (not under /api/v1) per TRD SS12.10
    application.include_router(health_router)

    return application


app = create_app()
