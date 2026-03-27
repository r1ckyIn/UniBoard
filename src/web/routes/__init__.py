"""Router aggregation for the UniBoard API."""

from fastapi import APIRouter

from src.web.routes.ai import router as ai_router
from src.web.routes.alerts import router as alerts_router
from src.web.routes.auth import router as auth_router
from src.web.routes.courses import router as courses_router
from src.web.routes.deadlines import router as deadlines_router
from src.web.routes.digest import router as digest_router
from src.web.routes.gpa import router as gpa_router
from src.web.routes.health import router as health_router
from src.web.routes.intelligence import router as intelligence_router
from src.web.routes.materials import router as materials_router
from src.web.routes.notifications import router as notifications_router
from src.web.routes.sync import router as sync_router
from src.web.routes.users import router as users_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(gpa_router, prefix="/gpa", tags=["gpa"])
api_router.include_router(courses_router, prefix="/courses", tags=["courses"])
api_router.include_router(deadlines_router, prefix="/deadlines", tags=["deadlines"])
api_router.include_router(materials_router, prefix="", tags=["materials"])
api_router.include_router(sync_router, prefix="/sync", tags=["sync"])
api_router.include_router(intelligence_router, prefix="", tags=["intelligence"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
api_router.include_router(digest_router, prefix="/digest", tags=["digest"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["alerts"])
api_router.include_router(ai_router, prefix="", tags=["ai"])

__all__ = ["ai_router", "api_router", "health_router"]
