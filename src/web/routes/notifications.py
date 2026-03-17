"""Notification REST endpoints."""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.common import SuccessResponse
from src.schemas.notification import NotificationResponse, UnreadCountResponse
from src.services.notification import NotificationService
from src.web.deps import get_current_user, get_request_meta, get_session

router = APIRouter()


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
    current_user: User = Depends(get_current_user),
    svc: NotificationService = Depends(get_notification_service),
) -> SuccessResponse[list[NotificationResponse]]:
    """Return list of notifications for the current user."""
    notifications = await svc.get_notifications(current_user.id, limit=limit, offset=offset)
    data = [
        NotificationResponse(
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
        for n in notifications
    ]
    return SuccessResponse(data=data, meta=get_request_meta(request))


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    svc: NotificationService = Depends(get_notification_service),
) -> SuccessResponse[NotificationResponse]:
    """Mark a notification as read."""
    from src.schemas.common import NotFoundError

    notification = await svc.mark_read(current_user.id, notification_id)
    if notification is None:
        raise NotFoundError("Notification")
    data = NotificationResponse(
        id=str(notification.id),
        type=notification.type,
        severity=notification.severity,
        title=notification.title,
        body=notification.body,
        is_read=notification.is_read,
        action_url=notification.action_url,
        created_at=notification.created_at.isoformat(),
        metadata_json=notification.metadata_json,
    )
    return SuccessResponse(data=data, meta=get_request_meta(request))


@router.get("/unread-count")
async def get_unread_count(
    request: Request,
    current_user: User = Depends(get_current_user),
    svc: NotificationService = Depends(get_notification_service),
) -> SuccessResponse[UnreadCountResponse]:
    """Return unread notification count."""
    count = await svc.get_unread_count(current_user.id)
    return SuccessResponse(
        data=UnreadCountResponse(count=count),
        meta=get_request_meta(request),
    )
