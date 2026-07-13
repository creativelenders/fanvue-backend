from __future__ import annotations

from pydantic import BaseModel, Field


class CampaignCreate(BaseModel):
    name: str
    objective: str = "conversion"
    audience: str = ""
    offer: str = ""
    channels: list[str] = Field(default_factory=list)


class MediaJobCreate(BaseModel):
    campaign_id: str | None = None
    prompt: str
    seed: int
    lora_name: str
    lora_strength: float = Field(default=0.78, ge=0.70, le=0.85)
    ppv_price_usd: float = 15.0


class ApprovalDecision(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
    note: str | None = None


class WebhookCreate(BaseModel):
    name: str
    description: str = ""


class AutonomousOpCreate(BaseModel):
    name: str
    description: str = ""

