from __future__ import annotations

import hashlib
import hmac
import time
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, Request

from app.config import get_settings


@dataclass(frozen=True)
class AuthContext:
    workspace_id: str
    user_id: str
    role: str


def hash_api_key(raw_key: str, pepper: str = "") -> str:
    return hashlib.sha256((pepper + raw_key).encode("utf-8")).hexdigest()


def constant_time_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


async def require_workspace_context(
    request: Request,
    x_workspace_id: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
    x_user_role: str | None = Header(default=None),
    x_auth_timestamp: str | None = Header(default=None),
    x_auth_signature: str | None = Header(default=None),
) -> AuthContext:
    if not x_workspace_id or not x_user_id:
        raise HTTPException(status_code=401, detail="Missing workspace/user context")
    settings = get_settings()
    role = x_user_role or "viewer"
    if settings.allow_unsafe_dev_headers and settings.app_env.lower() == "development":
        return AuthContext(workspace_id=x_workspace_id, user_id=x_user_id, role=role)
    if not settings.api_auth_secret or not x_auth_timestamp or not x_auth_signature:
        raise HTTPException(status_code=401, detail="Signed authentication is required")
    try:
        timestamp = int(x_auth_timestamp)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication timestamp") from exc
    if abs(int(time.time()) - timestamp) > settings.auth_max_age_seconds:
        raise HTTPException(status_code=401, detail="Expired authentication signature")
    canonical = f"{timestamp}.{request.method}.{request.url.path}.{x_workspace_id}.{x_user_id}.{role}"
    expected = hmac.new(settings.api_auth_secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_auth_signature):
        raise HTTPException(status_code=401, detail="Invalid authentication signature")
    return AuthContext(workspace_id=x_workspace_id, user_id=x_user_id, role=role)


def require_roles(*allowed: str):
    async def dependency(auth: AuthContext = Depends(require_workspace_context)) -> AuthContext:
        if auth.role not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permission")
        return auth
    return dependency
