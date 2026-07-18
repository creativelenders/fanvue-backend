from __future__ import annotations

import json
from collections.abc import Generator

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_session_factory
from app.platform.schemas import ApprovalDecision, CampaignCreate, MediaJobCreate, WebhookCreate, AutonomousOpCreate
from app.platform.service import PlatformService
from app.security import AuthContext, require_roles, require_workspace_context


router = APIRouter(prefix="/platform", tags=["platform"])


def session_dep(settings: Settings = Depends(get_settings)) -> Generator[Session, None, None]:
    try:
        session_factory = get_session_factory(settings.database_url)
    except Exception as e:
        import traceback
        raise HTTPException(status_code=400, detail=f"DB Init Error: {repr(e)}\n{traceback.format_exc()}")
        
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def service_dep(session: Session = Depends(session_dep)) -> PlatformService:
    return PlatformService(session)


@router.get("/dashboard")
async def dashboard(auth: AuthContext = Depends(require_workspace_context), service: PlatformService = Depends(service_dep)):
    return service.dashboard(auth)


@router.post("/campaigns")
async def create_campaign(payload: CampaignCreate, auth: AuthContext = Depends(require_roles("owner", "admin", "editor")), service: PlatformService = Depends(service_dep)):
    try:
        campaign = service.create_campaign(auth, payload)
        return {"id": campaign.id, "name": campaign.name, "status": campaign.status}
    except Exception as e:
        import traceback
        raise HTTPException(status_code=400, detail=f"Error: {repr(e)}\n{traceback.format_exc()}")


@router.get("/campaigns")
async def list_campaigns(auth: AuthContext = Depends(require_workspace_context), service: PlatformService = Depends(service_dep)):
    return [
        {
            "id": item.id,
            "name": item.name,
            "status": item.status,
            "objective": item.objective,
            "audience": item.audience,
            "offer": item.offer,
            "channels": json.loads(item.channels_json) if item.channels_json else [],
            "channels_json": item.channels_json,
        }
        for item in service.list_campaigns(auth)
    ]


@router.post("/media/jobs")
async def create_media_job(payload: MediaJobCreate, auth: AuthContext = Depends(require_roles("owner", "admin", "editor")), service: PlatformService = Depends(service_dep)):
    job = service.create_media_job(auth, payload)
    return {"id": job.id, "status": job.status}


@router.get("/media/jobs")
async def list_media_jobs(auth: AuthContext = Depends(require_workspace_context), service: PlatformService = Depends(service_dep)):
    return [
        {
            "id": item.id,
            "campaign_id": item.campaign_id,
            "status": item.status,
            "seed": item.seed,
            "ppv_price_usd": item.ppv_price_usd,
            "prompt": item.prompt,
            "result_json": item.result_json,
        }
        for item in service.list_media_jobs(auth)
    ]


@router.get("/approvals")
async def list_approvals(auth: AuthContext = Depends(require_workspace_context), service: PlatformService = Depends(service_dep)):
    return [{"id": item.id, "kind": item.kind, "title": item.title, "status": item.status} for item in service.list_approvals(auth)]


@router.post("/approvals/{approval_id}")
async def decide_approval(approval_id: str, payload: ApprovalDecision, auth: AuthContext = Depends(require_roles("owner", "admin")), service: PlatformService = Depends(service_dep)):
    item = service.update_approval(auth, approval_id, payload.status, payload.note)
    if not item:
        raise HTTPException(status_code=404, detail="Approval item not found")
    return {"id": item.id, "status": item.status}


@router.post("/webhooks")
async def create_webhook(payload: WebhookCreate, auth: AuthContext = Depends(require_roles("owner", "admin")), service: PlatformService = Depends(service_dep)):
    webhook = service.create_webhook(auth, payload)
    return {"id": webhook.id, "status": webhook.status}


@router.get("/webhooks")
async def list_webhooks(auth: AuthContext = Depends(require_workspace_context), service: PlatformService = Depends(service_dep)):
    return [{"id": item.id, "name": item.name, "status": item.status, "description": item.description} for item in service.list_webhooks(auth)]


@router.post("/autonomous_ops")
async def create_autonomous_op(payload: AutonomousOpCreate, auth: AuthContext = Depends(require_roles("owner", "admin")), service: PlatformService = Depends(service_dep)):
    op = service.create_autonomous_op(auth, payload)
    return {"id": op.id, "status": op.status}


@router.get("/autonomous_ops")
async def list_autonomous_ops(auth: AuthContext = Depends(require_workspace_context), service: PlatformService = Depends(service_dep)):
    return [{"id": item.id, "name": item.name, "status": item.status, "description": item.description} for item in service.list_autonomous_ops(auth)]
