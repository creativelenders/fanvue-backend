from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from sqlalchemy import DateTime, Float, Integer, String, Text, Boolean, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class AttributionSource(StrEnum):
    AI_AGENT = "AI_AGENT"
    HUMAN_TEAM = "HUMAN_TEAM"
    CREATOR_DIRECT = "CREATOR_DIRECT"


class Subscriber(Base):
    __tablename__ = "subscribers"

    uuid: Mapped[str] = mapped_column(String(80), primary_key=True)
    status: Mapped[str] = mapped_column(String(40), default="active")
    total_spend_usd: Mapped[float] = mapped_column(Float, default=0.0)
    vip_tier: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MessageEvent(Base):
    __tablename__ = "message_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subscriber_uuid: Mapped[str] = mapped_column(String(80), index=True)
    text: Mapped[str] = mapped_column(Text, default="")
    media_json: Mapped[str] = mapped_column(Text, default="[]")
    ppv_price_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    purchased_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_by_user_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    attribution_source: Mapped[str] = mapped_column(String(40), default=AttributionSource.AI_AGENT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subscriber_uuid: Mapped[str] = mapped_column(String(80), index=True)
    amount_usd: Mapped[float] = mapped_column(Float)
    kind: Mapped[str] = mapped_column(String(40))
    fanvue_payment_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    provider_event_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(120), index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


def build_session_factory(database_url: str):
    engine = create_engine(database_url, future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(engine, expire_on_commit=False)
