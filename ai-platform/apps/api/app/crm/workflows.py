from __future__ import annotations

import datetime as dt
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, Dict, List
from uuid import uuid4

from pydantic import BaseModel

from app.crm.guardrails import GuardrailResult, enforce_chat_guardrails

if TYPE_CHECKING:
    from app.crm.repository import CRMRepository


class QueuedMessage(BaseModel):
    subscriber_id: str
    message_text: str
    is_ppv: bool = False
    price_usd: float = 0.0
    scheduled_for: dt.datetime


class CRMWorkflowEngine:
    @staticmethod
    async def queue_checkin_message(subscriber_id: str, message_text: str) -> Dict[str, Any]:
        """Queues an automated, AI-generated check-in message for a dormant VIP."""
        payload = QueuedMessage(
            subscriber_id=subscriber_id,
            message_text=message_text,
            is_ppv=False,
            scheduled_for=dt.datetime.utcnow() + dt.timedelta(minutes=5),
        )
        # In production: push `payload.dict()` to Redis or PostgreSQL queue table
        print(f"[CRM Queue] Scheduled check-in for {subscriber_id} at {payload.scheduled_for}")
        return {"status": "queued", "action": "dormant_vip_checkin", "payload": payload.dict()}

    @staticmethod
    async def create_ppv_broadcast_campaign(asset_id: str, teaser_text: str, price: float, target_tier: str = "VIP") -> Dict[str, Any]:
        """Creates a mass-DM broadcast campaign for top-rated Elo content."""
        campaign_id = f"ppv_elo_{asset_id[:8]}"
        print(f"[CRM Queue] Created PPV Broadcast Campaign '{campaign_id}' @ ${price}/unlock targeting {target_tier}s.")
        return {
            "status": "campaign_created",
            "campaign_id": campaign_id,
            "asset_id": asset_id,
            "teaser": teaser_text,
            "price_usd": price,
        }

    @staticmethod
    async def queue_cross_promotion(subscriber_id: str, source_creator: str, target_creator: str, intro_message: str, collab_image_url: str) -> Dict[str, Any]:
        """Dispatches an organic introduction DM from one creator persona to another."""
        payload = {
            "subscriber_id": subscriber_id,
            "sender_persona": source_creator,
            "target_persona_link": f"https://fanvue.com/{target_creator.lower()}",
            "message_text": intro_message,
            "attached_media_url": collab_image_url,
            "scheduled_for": dt.datetime.utcnow().isoformat(),
        }
        print(f"[Cross-Promo Queue] {source_creator} introducing {target_creator} to subscriber {subscriber_id}")
        return {"status": "queued", "action": "cross_creator_collab", "payload": payload}


@dataclass
class RetentionAction:
    subscriber_uuid: str
    message: str
    discount_code: str | None
    route_to_human: bool


@dataclass
class ScheduledDispatchAction:
    id: str
    workspace_id: str
    subscriber_uuid: str
    kind: str
    message: str
    ppv_price_usd: float | None
    scheduled_for: datetime


class ChurnPreventer:
    def __init__(self, repo: CRMRepository, retention_window_hours: int = 48):
        self.repo = repo
        self.retention_window_hours = retention_window_hours

    def scan(self) -> list[RetentionAction]:
        actions: list[RetentionAction] = []
        for sub in self.repo.expiring_subscribers(self.retention_window_hours):
            raw = (
                "I noticed your access is ending soon. I can send a renewal bundle with a loyalty discount "
                "and a fresh preview tailored to your favorites."
            )
            guarded = enforce_chat_guardrails(raw, max_words=90)
            actions.append(
                RetentionAction(
                    subscriber_uuid=sub.uuid,
                    message=guarded.text,
                    discount_code="LOYAL48",
                    route_to_human=guarded.route_to_human,
                )
            )
        return actions


class ChatResponseGuard:
    def prepare(self, draft: str) -> GuardrailResult:
        return enforce_chat_guardrails(draft, max_words=100)


def queue_retention_dispatch(
    session,
    *,
    workspace_id: str,
    subscriber_uuid: str,
    message: str,
    kind: str = "vip_checkin",
    ppv_price_usd: float | None = None,
    delay_minutes: int = 0,
    metadata: dict | None = None,
) -> ScheduledDispatchAction:
    from app.platform.models import ScheduledDispatch

    guarded = enforce_chat_guardrails(message, max_words=95)
    item = ScheduledDispatch(
        id=f"dispatch_{uuid4().hex[:16]}",
        workspace_id=workspace_id,
        subscriber_uuid=subscriber_uuid,
        kind=kind,
        message=guarded.text,
        ppv_price_usd=ppv_price_usd,
        metadata_json=json.dumps(metadata or {}),
        scheduled_for=datetime.now(timezone.utc) + timedelta(minutes=delay_minutes),
    )
    session.add(item)
    session.commit()
    return ScheduledDispatchAction(
        id=item.id,
        workspace_id=item.workspace_id,
        subscriber_uuid=item.subscriber_uuid,
        kind=item.kind,
        message=item.message,
        ppv_price_usd=item.ppv_price_usd,
        scheduled_for=item.scheduled_for,
    )


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
