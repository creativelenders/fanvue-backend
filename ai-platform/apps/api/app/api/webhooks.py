from __future__ import annotations

import hmac
import hashlib
from collections.abc import Generator
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.crm.guardrails import can_release_ppv_payload
from app.crm.models import AttributionSource
from app.crm.repository import CRMRepository
from app.crm.workflows import parse_iso_datetime
from app.db import get_session_factory


router = APIRouter(prefix="/webhooks/fanvue", tags=["fanvue-webhooks"])


class FanvueEvent(BaseModel):
    type: str
    data: dict[str, Any] = Field(default_factory=dict)


def verify_signature(secret: str | None, body: bytes, signature: str | None) -> None:
    if not secret:
        raise HTTPException(status_code=503, detail="Webhook verification is not configured")
    if not signature:
        raise HTTPException(status_code=401, detail="Missing webhook signature")
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    supplied = signature.removeprefix("sha256=")
    if not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")


def repo_dep(settings: Settings = Depends(get_settings)) -> Generator[CRMRepository, None, None]:
    session_factory = get_session_factory(settings.database_url)
    session = session_factory()
    try:
        yield CRMRepository(session, vip_threshold_usd=settings.vip_threshold_usd)
    finally:
        session.close()


@router.post("")
async def ingest_fanvue_webhook(
    request: Request,
    x_fanvue_signature: str | None = Header(default=None),
    x_fanvue_event_id: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
    repo: CRMRepository = Depends(repo_dep),
):
    body = await request.body()
    verify_signature(settings.fanvue_webhook_secret, body, x_fanvue_signature)
    try:
        event = FanvueEvent.model_validate_json(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook payload") from exc
    event_id = x_fanvue_event_id or str(event.data.get("id") or "")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing webhook event ID")
    if repo.webhook_event_seen(event_id):
        return {"ok": True, "duplicate": True}
    repo.record_webhook_event(event_id, event.type, body.decode("utf-8", errors="replace"))

    if event.type == "creator.subscription.activated":
        uuid = event.data["uuid"]
        sub = repo.upsert_subscription(uuid=uuid, status="active", expires_at=parse_iso_datetime(event.data.get("expiresAt")))
        return {"ok": True, "subscriber_uuid": sub.uuid, "stable_key": "uuid"}

    if event.type == "creator.message.received":
        uuid = event.data["uuid"]
        message = event.data.get("message", {})
        purchased_at = message.get("purchasedAt")
        ppv_price = message.get("ppvPriceUsd")
        release_allowed = can_release_ppv_payload(purchased_at)
        repo.record_message(
            subscriber_uuid=uuid,
            text=message.get("text", ""),
            media=message.get("media", []),
            ppv_price_usd=ppv_price,
            purchased_at=parse_iso_datetime(purchased_at),
            sent_by_user_id=message.get("sentByUserId"),
            attribution_source=AttributionSource(message.get("sentByUserId", "AI_AGENT")) if message.get("sentByUserId") in AttributionSource._value2member_map_ else AttributionSource.AI_AGENT,
        )
        return {"ok": True, "subscriber_uuid": uuid, "release_high_res": release_allowed}

    if event.type == "creator.payment.succeeded":
        uuid = event.data["uuid"]
        payment = event.data.get("payment", {})
        repo.record_payment(
            subscriber_uuid=uuid,
            amount_usd=float(payment.get("amountUsd") or 0),
            kind=payment.get("kind", "unknown"),
            fanvue_payment_id=payment.get("id"),
        )
        return {"ok": True, "subscriber_uuid": uuid}

    repo.session.commit()
    return {"ok": True, "ignored": event.type}
