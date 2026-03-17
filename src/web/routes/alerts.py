"""Risk alerts REST endpoints."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.user import User
from src.schemas.common import SuccessResponse
from src.schemas.notification import NotificationResponse
from src.services.risk_alert import RiskAlertService
from src.web.deps import get_current_user, get_request_meta, get_session

router = APIRouter()


def get_risk_alert_service(
    session: AsyncSession = Depends(get_session),
) -> RiskAlertService:
    """FastAPI dependency: create RiskAlertService with current session."""
    settings = get_settings()
    return RiskAlertService(session, anthropic_api_key=settings.anthropic_api_key)


@router.get("")
async def get_alerts(
    request: Request,
    current_user: User = Depends(get_current_user),
    svc: RiskAlertService = Depends(get_risk_alert_service),
) -> SuccessResponse[list[NotificationResponse]]:
    """Return recent GPA risk alert notifications."""
    notifications = await svc.get_alerts(current_user.id)
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
