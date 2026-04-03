"""Health check endpoint with database connectivity status."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.web.deps import get_session

router = APIRouter()


@router.get("/health")
async def health_check(
    session: AsyncSession = Depends(get_session),
) -> JSONResponse:
    """Return system health status including database connectivity.

    Returns HTTP 200 when healthy, HTTP 503 when degraded.
    Load balancers and monitoring tools should check the status code.
    """
    db_status = "disconnected"
    try:
        await session.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        pass

    status = "healthy" if db_status == "connected" else "degraded"
    status_code = 200 if status == "healthy" else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "database": db_status,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    )
