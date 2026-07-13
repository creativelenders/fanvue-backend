from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.platform.models import ApprovalItem, AuditLog, Campaign, MediaGenerationJob, WebhookEndpoint, AutonomousOp
from app.platform.schemas import CampaignCreate, MediaJobCreate, WebhookCreate, AutonomousOpCreate
from app.security import AuthContext


class PlatformService:
    def __init__(self, session: Session):
        self.session = session

    def dashboard(self, auth: AuthContext) -> dict:
        campaigns = self.session.query(Campaign).filter(Campaign.workspace_id == auth.workspace_id).count()
        media_jobs = self.session.query(MediaGenerationJob).filter(MediaGenerationJob.workspace_id == auth.workspace_id).count()
        approvals = (
            self.session.query(ApprovalItem)
            .filter(ApprovalItem.workspace_id == auth.workspace_id)
            .filter(ApprovalItem.status == "pending")
            .count()
        )
        return {"campaigns": campaigns, "media_jobs": media_jobs, "pending_approvals": approvals}

    def create_campaign(self, auth: AuthContext, payload: CampaignCreate) -> Campaign:
        campaign = Campaign(
            id=f"camp_{uuid4().hex[:16]}",
            workspace_id=auth.workspace_id,
            name=payload.name,
            objective=payload.objective,
            audience=payload.audience,
            offer=payload.offer,
            channels_json=json.dumps(payload.channels),
        )
        self.session.add(campaign)
        self.audit(auth, "campaign.create", "campaign", campaign.id, {"name": payload.name})
        self.session.commit()
        return campaign

    def list_campaigns(self, auth: AuthContext) -> list[Campaign]:
        return self.session.query(Campaign).filter(Campaign.workspace_id == auth.workspace_id).order_by(Campaign.created_at.desc()).all()

    def create_media_job(self, auth: AuthContext, payload: MediaJobCreate) -> MediaGenerationJob:
        if payload.campaign_id:
            campaign = self.session.get(Campaign, payload.campaign_id)
            if not campaign or campaign.workspace_id != auth.workspace_id:
                raise ValueError("Campaign does not belong to this workspace")
        job = MediaGenerationJob(
            id=f"media_{uuid4().hex[:16]}",
            workspace_id=auth.workspace_id,
            campaign_id=payload.campaign_id,
            prompt=payload.prompt,
            seed=payload.seed,
            lora_name=payload.lora_name,
            lora_strength=payload.lora_strength,
            ppv_price_usd=payload.ppv_price_usd,
            status="awaiting_approval",
        )
        self.session.add(job)
        self.session.add(ApprovalItem(
            id=f"approval_{uuid4().hex[:16]}", workspace_id=auth.workspace_id,
            kind="media_generation", title=f"Review media job {job.id}",
            payload_json=json.dumps({"media_job_id": job.id, "ppv_price_usd": payload.ppv_price_usd}),
        ))
        self.audit(auth, "media_job.create", "media_generation_job", job.id, {"campaign_id": payload.campaign_id})
        self.session.commit()
        return job

    def list_media_jobs(self, auth: AuthContext) -> list[MediaGenerationJob]:
        return self.session.query(MediaGenerationJob).filter(MediaGenerationJob.workspace_id == auth.workspace_id).order_by(MediaGenerationJob.created_at.desc()).all()

    def list_approvals(self, auth: AuthContext) -> list[ApprovalItem]:
        return self.session.query(ApprovalItem).filter(ApprovalItem.workspace_id == auth.workspace_id).order_by(ApprovalItem.created_at.desc()).all()

    def update_approval(self, auth: AuthContext, approval_id: str, status: str, note: str | None) -> ApprovalItem | None:
        item = self.session.get(ApprovalItem, approval_id)
        if not item or item.workspace_id != auth.workspace_id:
            return None
        item.status = status
        if item.kind == "media_generation":
            job_id = json.loads(item.payload_json).get("media_job_id")
            job = self.session.get(MediaGenerationJob, job_id) if job_id else None
            if job and job.workspace_id == auth.workspace_id:
                job.status = "queued" if status == "approved" else "rejected"
        self.audit(auth, f"approval.{status}", "approval_item", approval_id, {"note": note})
        self.session.commit()
        return item

    def audit(self, auth: AuthContext, action: str, entity_type: str, entity_id: str | None, metadata: dict) -> None:
        self.session.add(
            AuditLog(
                workspace_id=auth.workspace_id,
                actor_user_id=auth.user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                metadata_json=json.dumps(metadata),
                created_at=datetime.now(timezone.utc),
            )
        )

    def create_webhook(self, auth: AuthContext, payload: WebhookCreate) -> WebhookEndpoint:
        webhook = WebhookEndpoint(
            id=f"wh_{uuid4().hex[:16]}",
            workspace_id=auth.workspace_id,
            name=payload.name,
            description=payload.description,
            status="active",
        )
        self.session.add(webhook)
        self.audit(auth, "webhook.create", "webhook", webhook.id, {"name": payload.name})
        self.session.commit()
        return webhook

    def list_webhooks(self, auth: AuthContext) -> list[WebhookEndpoint]:
        return self.session.query(WebhookEndpoint).filter(WebhookEndpoint.workspace_id == auth.workspace_id).order_by(WebhookEndpoint.created_at.desc()).all()

    def create_autonomous_op(self, auth: AuthContext, payload: AutonomousOpCreate) -> AutonomousOp:
        op = AutonomousOp(
            id=f"op_{uuid4().hex[:16]}",
            workspace_id=auth.workspace_id,
            name=payload.name,
            description=payload.description,
            status="running",
        )
        self.session.add(op)
        self.audit(auth, "autonomous_op.start", "autonomous_op", op.id, {"name": payload.name})
        self.session.commit()
        return op

    def list_autonomous_ops(self, auth: AuthContext) -> list[AutonomousOp]:
        return self.session.query(AutonomousOp).filter(AutonomousOp.workspace_id == auth.workspace_id).order_by(AutonomousOp.created_at.desc()).all()
