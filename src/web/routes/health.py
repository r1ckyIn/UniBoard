"""Health check endpoint with database connectivity status."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.web.deps import get_session

router = APIRouter()


@router.get("/health")
async def health_check(
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Return system health status including database connectivity.

    Always returns 200 -- the response body reports degraded state
    rather than failing the HTTP request.
    """
    db_status = "disconnected"
    try:
        await session.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        pass

    status = "healthy" if db_status == "connected" else "degraded"
    return {
        "status": status,
        "database": db_status,
        "timestamp": datetime.now(UTC).isoformat(),
    }
