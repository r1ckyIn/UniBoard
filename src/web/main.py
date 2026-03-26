"""FastAPI application factory and entry point."""

import uuid
from datetime import UTC, datetime

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.logging import configure_logging
from src.schemas.common import ErrorDetail, ErrorResponse, MetaInfo, UniboardError
from src.sync.engine import lifespan
from src.web.routes import api_router, health_router

logger = structlog.get_logger()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    configure_logging()

    application = FastAPI(
        title="UniBoard API",
        version="0.1.0",
        description="University GPA Maximization Dashboard",
        lifespan=lifespan,
    )

    # CORS middleware -- allow frontend dev server to connect
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3001"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    @application.middleware("http")
    async def request_id_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
        """Inject request_id into every request and response."""
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
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
