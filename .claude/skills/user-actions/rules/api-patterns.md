# API Patterns Rules

Rules for creating REST endpoints in the UniBoard FastAPI backend.

## Rule 1: Router Registration
Create `APIRouter()` in `src/web/routes/<domain>.py`. Register in `src/web/routes/__init__.py`:
```python
from src.web.routes.xxx import router as xxx_router
api_router.include_router(xxx_router, prefix="/xxx", tags=["xxx"])
```
All routes live under `/api/v1/` prefix.

## Rule 2: Response Envelope
Every endpoint returns `SuccessResponse[T]`:
```python
return SuccessResponse(data=result, meta=get_request_meta(request))
```
Never return raw data — always wrap in the envelope.

## Rule 3: Service Factory
Inject services via Depends():
```python
def get_xxx_service(session: AsyncSession = Depends(get_session)) -> XxxService:
    return XxxService(session)
```
B008 ruff suppression is configured for `src/web/**` in `pyproject.toml`.

## Rule 4: Auth Guard
Protected endpoints use `current_user: User = Depends(get_current_user)`. Public endpoints (health, login, register) omit this dependency.
Source: `src/web/deps.py`, `src/security/auth.py`
