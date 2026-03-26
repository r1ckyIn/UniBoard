"""Course materials and search REST endpoints."""

import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import SuccessResponse
from src.schemas.materials import CourseMaterialsResponse, FolderResponse, SearchResponse
from src.services.materials import CourseMaterialService
from src.web.deps import get_current_user_id, get_request_meta, get_session

router = APIRouter()


def get_materials_service(
    session: AsyncSession = Depends(get_session),
) -> CourseMaterialService:
    """FastAPI dependency: create CourseMaterialService with current session."""
    return CourseMaterialService(session)


@router.get("/courses/{course_id}/materials")
async def get_course_materials(
    course_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: CourseMaterialService = Depends(get_materials_service),
) -> SuccessResponse[CourseMaterialsResponse]:
    """Return unified folder view for a course."""
    result = await svc.get_course_materials(current_user_id, course_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/courses/{course_id}/materials/{folder_id}")
async def get_folder_items(
    course_id: uuid.UUID,
    folder_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: CourseMaterialService = Depends(get_materials_service),
) -> SuccessResponse[FolderResponse]:
    """Return folder items for a specific folder."""
    result = await svc.get_folder_items(current_user_id, course_id, folder_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/search")
async def search_materials(
    request: Request,
    q: str = Query(..., min_length=1),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: CourseMaterialService = Depends(get_materials_service),
) -> SuccessResponse[SearchResponse]:
    """Full-text search across course materials using PostgreSQL tsvector."""
    result = await svc.search(current_user_id, q)
    return SuccessResponse(data=result, meta=get_request_meta(request))
