"""Course materials and search REST endpoints."""

import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import SuccessResponse
from src.schemas.materials import (
    ContractSearchResultResponse,
    CourseMaterialsResponse,
    FolderResponse,
    MaterialItemResponse,
    MaterialResponse,
    SearchResponse,
)
from src.services.materials import CourseMaterialService
from src.web.deps import get_current_user_id, get_request_meta, get_session

router = APIRouter()


def get_materials_service(
    session: AsyncSession = Depends(get_session),
) -> CourseMaterialService:
    """FastAPI dependency: create CourseMaterialService with current session."""
    return CourseMaterialService(session)


def _folder_to_material(folder: FolderResponse) -> MaterialResponse:
    """Convert legacy FolderResponse to contract-aligned MaterialResponse.

    Maps canvas -> module, ed_lessons -> lesson for source_type.
    Flattens folder.items into MaterialItemResponse list.
    """
    # Determine source and source_type from folder.source
    if folder.source == "ed_lessons":
        source = "ed"
        source_type = "lesson"
    else:
        source = "canvas"
        source_type = "module"

    # Convert items if present
    items: list[MaterialItemResponse] | None = None
    if folder.items is not None:
        items = [
            MaterialItemResponse(
                title=item.title,
                type=item.type,
                url=item.url or "",
            )
            for item in folder.items
        ]

    # Count lesson-type items for slide_count
    slide_count: int | None = None
    if source_type == "lesson" and folder.item_count > 0:
        slide_count = folder.item_count

    return MaterialResponse(
        id=folder.id,
        title=folder.name,
        source=source,
        source_type=source_type,
        items=items,
        slide_count=slide_count,
        url=None,
    )


def _search_hit_to_contract(
    hit_type: str,
    title: str,
    source: str,
    course_code: str,
    snippet: str,
    rank: float,
) -> ContractSearchResultResponse:
    """Convert legacy SearchHit fields to contract SearchResult.

    Maps module_item/lesson -> material for type.
    Maps rank -> relevance.
    """
    # Map internal type to contract type
    contract_type = "discussion" if hit_type == "discussion" else "material"
    # Map source to contract source
    contract_source = "ed" if source == "ed_lessons" else source

    return ContractSearchResultResponse(
        type=contract_type,
        title=title,
        source=contract_source,
        course_code=course_code,
        snippet=snippet,
        url="",  # No direct URL available from tsvector search
        relevance=rank,
    )


@router.get("/courses/{course_id}/materials")
async def get_course_materials(
    course_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: CourseMaterialService = Depends(get_materials_service),
) -> SuccessResponse[list[MaterialResponse]]:
    """Return flat material list for a course."""
    result: CourseMaterialsResponse = await svc.get_course_materials(
        current_user_id, course_id
    )
    materials = [_folder_to_material(folder) for folder in result.folders]
    return SuccessResponse(data=materials, meta=get_request_meta(request))


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
) -> SuccessResponse[list[ContractSearchResultResponse]]:
    """Full-text search across course materials, returning flat SearchResult[] array."""
    legacy_result: SearchResponse = await svc.search(current_user_id, q)
    results = [
        _search_hit_to_contract(
            hit_type=hit.type,
            title=hit.title,
            source=hit.source,
            course_code=hit.course_code,
            snippet=hit.snippet,
            rank=hit.rank,
        )
        for hit in legacy_result.results
    ]
    return SuccessResponse(data=results, meta=get_request_meta(request))
