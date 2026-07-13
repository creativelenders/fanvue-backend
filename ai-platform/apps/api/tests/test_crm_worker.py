import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "apps" / "api"))

from workers.crm_worker import main as crm_worker


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url, timeout=None):
        if "dormant-vips" in url:
            return FakeResponse({"users": [{"id": "sub_1", "name": "Mia"}]})
        if "churn-risk" in url:
            return FakeResponse({"users": [{"id": "sub_2", "name": "Lena"}]})
        if "catalog-completion" in url:
            return FakeResponse(
                {
                    "subscribers": [
                        {
                            "id": "sub_3",
                            "name": "Nora",
                            "current_creator_name": "Ava",
                            "recommended_creator_name": "Mia",
                        }
                    ]
                }
            )
        if "content" in url:
            return FakeResponse({"assets": [{"asset_id": "asset_123456"}]})
        return FakeResponse({}, status_code=404)


async def no_sleep(_seconds):
    return None


def test_process_dormant_vips(monkeypatch):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls["llm"] = kwargs
        return "Miss chatting with you 💕 Want a tiny preview?"

    async def fake_queue_checkin_message(subscriber_id, message_text):
        calls["queue"] = {"subscriber_id": subscriber_id, "message_text": message_text}
        return {"status": "queued"}

    monkeypatch.setattr(crm_worker.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(crm_worker.llm_gateway, "generate_response", fake_generate_response)
    monkeypatch.setattr(crm_worker.CRMWorkflowEngine, "queue_checkin_message", fake_queue_checkin_message)
    monkeypatch.setattr(crm_worker.asyncio, "sleep", no_sleep)

    asyncio.run(crm_worker.process_dormant_vips())
    assert calls["llm"]["model_combo"] == "cost-optimized"
    assert calls["queue"]["subscriber_id"] == "sub_1"


def test_promote_elite_elo_content(monkeypatch):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls["llm"] = kwargs
        return "Unlock the full VIP set for tonight only."

    async def fake_create_ppv_broadcast_campaign(**kwargs):
        calls["campaign"] = kwargs
        return {"status": "campaign_created"}

    monkeypatch.setattr(crm_worker.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(crm_worker.llm_gateway, "generate_response", fake_generate_response)
    monkeypatch.setattr(crm_worker.CRMWorkflowEngine, "create_ppv_broadcast_campaign", fake_create_ppv_broadcast_campaign)

    asyncio.run(crm_worker.promote_elite_elo_content())
    assert calls["llm"]["model_combo"] == "hermes-brain"
    assert calls["campaign"]["asset_id"] == "asset_123456"
    assert calls["campaign"]["price"] == 24.99


def test_scan_predictive_churn(monkeypatch):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls["llm"] = kwargs
        return "I saved you a private discount tonight."

    async def fake_create_ppv_broadcast_campaign(**kwargs):
        calls["campaign"] = kwargs
        return {"status": "campaign_created"}

    monkeypatch.setattr(crm_worker.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(crm_worker.llm_gateway, "generate_response", fake_generate_response)
    monkeypatch.setattr(crm_worker.CRMWorkflowEngine, "create_ppv_broadcast_campaign", fake_create_ppv_broadcast_campaign)
    monkeypatch.setattr(crm_worker.asyncio, "sleep", no_sleep)

    asyncio.run(crm_worker.scan_predictive_churn())
    assert calls["llm"]["model_combo"] == "hermes-brain"
    assert calls["campaign"] == {
        "asset_id": "winback_vault_01",
        "teaser_text": "I saved you a private discount tonight.",
        "price": 9.99,
        "target_tier": "USER_sub_2",
    }


def test_trigger_creator_collabs(monkeypatch):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls["llm"] = kwargs
        return "You have to meet Mia 💕 We took something cute together."

    async def fake_queue_cross_promotion(**kwargs):
        calls["cross_promo"] = kwargs
        return {"status": "queued"}

    monkeypatch.setattr(crm_worker.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(crm_worker.llm_gateway, "generate_response", fake_generate_response)
    monkeypatch.setattr(crm_worker.CRMWorkflowEngine, "queue_cross_promotion", fake_queue_cross_promotion)
    monkeypatch.setattr(crm_worker.asyncio, "sleep", no_sleep)

    asyncio.run(crm_worker.trigger_creator_collabs())
    assert calls["llm"]["model_combo"] == "hermes-brain"
    assert calls["cross_promo"] == {
        "subscriber_id": "sub_3",
        "source_creator": "Ava",
        "target_creator": "Mia",
        "intro_message": "You have to meet Mia 💕 We took something cute together.",
        "collab_image_url": "https://cdn.fanvue-platform.local/collabs/Ava_Mia_render.jpg",
    }
