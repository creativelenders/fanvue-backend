import asyncio
from datetime import datetime

from app.crm.workflows import CRMWorkflowEngine, QueuedMessage


def test_queue_checkin_message_payload():
    result = asyncio.run(CRMWorkflowEngine.queue_checkin_message("sub_123", "A fresh preview is ready."))
    assert result["status"] == "queued"
    assert result["action"] == "dormant_vip_checkin"
    assert result["payload"]["subscriber_id"] == "sub_123"
    assert result["payload"]["message_text"] == "A fresh preview is ready."
    assert result["payload"]["is_ppv"] is False
    assert datetime.fromisoformat(str(result["payload"]["scheduled_for"]))


def test_create_ppv_broadcast_campaign_payload():
    result = asyncio.run(CRMWorkflowEngine.create_ppv_broadcast_campaign("assetabcdef", "Unlock the full set.", 19.0))
    assert result == {
        "status": "campaign_created",
        "campaign_id": "ppv_elo_assetabc",
        "asset_id": "assetabcdef",
        "teaser": "Unlock the full set.",
        "price_usd": 19.0,
    }


def test_queued_message_defaults():
    msg = QueuedMessage(subscriber_id="sub_1", message_text="Hi", scheduled_for=datetime.utcnow())
    assert msg.is_ppv is False
    assert msg.price_usd == 0.0


def test_queue_cross_promotion_payload():
    result = asyncio.run(
        CRMWorkflowEngine.queue_cross_promotion(
            subscriber_id="sub_123",
            source_creator="Ava",
            target_creator="Mia",
            intro_message="You would love Mia’s new set.",
            collab_image_url="https://cdn.test/collab.jpg",
        )
    )
    assert result["status"] == "queued"
    assert result["action"] == "cross_creator_collab"
    assert result["payload"]["subscriber_id"] == "sub_123"
    assert result["payload"]["sender_persona"] == "Ava"
    assert result["payload"]["target_persona_link"] == "https://fanvue.com/mia"
    assert result["payload"]["attached_media_url"] == "https://cdn.test/collab.jpg"
    assert datetime.fromisoformat(result["payload"]["scheduled_for"])
