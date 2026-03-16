"""Router aggregation for the UniBoard API."""

from fastapi import APIRouter

from src.web.routes.auth import router as auth_router
from src.web.routes.gpa import router as gpa_router
from src.web.routes.health import router as health_router
from src.web.routes.users import router as users_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(gpa_router, prefix="/gpa", tags=["gpa"])

__all__ = ["api_router", "health_router"]
