from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.crm.models import AttributionSource, MessageEvent, PaymentEvent, Subscriber, WebhookEvent


class CRMRepository:
    def __init__(self, session: Session, vip_threshold_usd: float = 50.0):
        self.session = session
        self.vip_threshold_usd = vip_threshold_usd

    def webhook_event_seen(self, provider_event_id: str) -> bool:
        return self.session.get(WebhookEvent, provider_event_id) is not None

    def record_webhook_event(self, provider_event_id: str, event_type: str, payload_json: str) -> None:
        self.session.add(WebhookEvent(provider_event_id=provider_event_id, event_type=event_type, payload_json=payload_json))
        self.session.flush()

    def upsert_subscription(self, uuid: str, status: str = "active", expires_at: datetime | None = None) -> Subscriber:
        sub = self.session.get(Subscriber, uuid) or Subscriber(uuid=uuid)
        sub.status = status
        sub.expires_at = expires_at
        sub.updated_at = datetime.now(timezone.utc)
        self.session.add(sub)
        self.session.commit()
        return sub

    def record_message(
        self,
        subscriber_uuid: str,
        text: str,
        media: list[dict],
        ppv_price_usd: float | None,
        purchased_at: datetime | None,
        sent_by_user_id: str | None,
        attribution_source: AttributionSource = AttributionSource.AI_AGENT,
    ) -> MessageEvent:
        event = MessageEvent(
            subscriber_uuid=subscriber_uuid,
            text=text,
            media_json=json.dumps(media),
            ppv_price_usd=ppv_price_usd,
            purchased_at=purchased_at,
            sent_by_user_id=sent_by_user_id,
            attribution_source=attribution_source.value,
        )
        self.session.add(event)
        self.session.commit()
        return event

    def record_payment(self, subscriber_uuid: str, amount_usd: float, kind: str, fanvue_payment_id: str | None = None) -> PaymentEvent:
        payment = PaymentEvent(
            subscriber_uuid=subscriber_uuid,
            amount_usd=amount_usd,
            kind=kind,
            fanvue_payment_id=fanvue_payment_id,
        )
        sub = self.session.get(Subscriber, subscriber_uuid) or Subscriber(uuid=subscriber_uuid)
        sub.total_spend_usd = float(sub.total_spend_usd or 0) + amount_usd
        sub.vip_tier = sub.total_spend_usd >= self.vip_threshold_usd
        sub.updated_at = datetime.now(timezone.utc)
        self.session.add_all([payment, sub])
        self.session.commit()
        return payment

    def expiring_subscribers(self, within_hours: int) -> list[Subscriber]:
        now = datetime.now(timezone.utc)
        cutoff = now + timedelta(hours=within_hours)
        return (
            self.session.query(Subscriber)
            .filter(Subscriber.status == "active")
            .filter(Subscriber.expires_at.is_not(None))
            .filter(Subscriber.expires_at <= cutoff)
            .all()
        )

    def dormant_vip_subscribers(self, dormant_hours: int, high_affinity_threshold_usd: float | None = None) -> list[Subscriber]:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=dormant_hours)
        threshold = high_affinity_threshold_usd or self.vip_threshold_usd
        latest_messages = (
            self.session.query(
                MessageEvent.subscriber_uuid.label("subscriber_uuid"),
                func.max(MessageEvent.created_at).label("last_interaction_at"),
            )
            .group_by(MessageEvent.subscriber_uuid)
            .subquery()
        )
        return (
            self.session.query(Subscriber)
            .outerjoin(latest_messages, Subscriber.uuid == latest_messages.c.subscriber_uuid)
            .filter(Subscriber.status == "active")
            .filter(or_(Subscriber.vip_tier.is_(True), Subscriber.total_spend_usd >= threshold))
            .filter(or_(latest_messages.c.last_interaction_at.is_(None), latest_messages.c.last_interaction_at < cutoff))
            .all()
        )
