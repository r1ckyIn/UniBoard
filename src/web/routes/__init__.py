"""Router aggregation for the UniBoard API."""

from fastapi import APIRouter

from src.web.routes.auth import router as auth_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])

# users_router and health_router will be added in Task 3
