"""Rate limiting configuration using slowapi.

Provides a Limiter instance and user-ID-based key extraction from JWT.
Extracted to its own module to avoid circular imports between main.py
and route modules.
"""

import jwt as pyjwt
from fastapi import Request
from slowapi import Limiter

from src.config import get_settings


def get_user_id_or_ip(request: Request) -> str:
    """Extract rate-limit key: user:{uuid} from JWT or ip:{address} fallback."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            token = auth_header[7:]
            payload = pyjwt.decode(
                token,
                get_settings().supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            sub = payload.get("sub", "unknown")
            return f"user:{sub}"
        except Exception:
            pass
    client_host = request.client.host if request.client else "unknown"
    return f"ip:{client_host}"


limiter = Limiter(key_func=get_user_id_or_ip, default_limits=["60/minute"])
