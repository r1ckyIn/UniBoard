"""Notification REST endpoints."""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notification import Notification
from src.schemas.common import SuccessResponse
from src.schemas.notification import NotificationResponse, UnreadCountResponse
from src.services.notification import NotificationService
from src.web.deps import get_current_user_id, get_request_meta, get_session

router = APIRouter()


def _serialize(n: Notification) -> NotificationResponse:
    """Convert Notification ORM instance to response schema."""
    return NotificationResponse(
        id=str(n.id),
        type=n.type,
        severity=n.severity,
        title=n.title,
        body=n.body,
        is_read=n.is_read,
        action_url=n.action_url,
        created_at=n.created_at.isoformat(),
        metadata_json=n.metadata_json,
    )


def get_notification_service(
    session: AsyncSession = Depends(get_session),
) -> NotificationService:
    """FastAPI dependency: create NotificationService with current session."""
    return NotificationService(session)


@router.get("")
async def get_notifications(
    request: Request,
    limit: int = 50,
    offset: int = 0,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: NotificationService = Depends(get_notification_service),
) -> SuccessResponse[list[NotificationResponse]]:
    """Return list of notifications for the current user."""
    notifications = await svc.get_notifications(current_user_id, limit=limit, offset=offset)
    data = [_serialize(n) for n in notifications]
    return SuccessResponse(data=data, meta=get_request_meta(request))


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: NotificationService = Depends(get_notification_service),
) -> SuccessResponse[NotificationResponse]:
    """Mark a notification as read."""
    from src.schemas.common import NotFoundError

    notification = await svc.mark_read(current_user_id, notification_id)
    if notification is None:
        raise NotFoundError("Notification")
    return SuccessResponse(data=_serialize(notification), meta=get_request_meta(request))


@router.get("/unread-count")
async def get_unread_count(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: NotificationService = Depends(get_notification_service),
) -> SuccessResponse[UnreadCountResponse]:
    """Return unread notification count."""
    count = await svc.get_unread_count(current_user_id)
    return SuccessResponse(
        data=UnreadCountResponse(count=count),
        meta=get_request_meta(request),
    )
