import asyncio
import pytest

from app.media import pipeline
from app.media.pipeline import ContentVariantPipeline, IdentityAnchor, MediaRequest, TipToActionPipeline


class FakeQueueClient:
    def __init__(self):
        self.workflows = []

    async def queue_prompt(self, workflow, client_id="fanvue-promotion-os"):
        self.workflows.append(workflow)
        return {"prompt_id": f"job_{len(self.workflows)}"}


def test_dual_variant_uses_same_seed_and_price():
    client = FakeQueueClient()
    pipeline = ContentVariantPipeline(client)
    request = MediaRequest(prompt="vertical teaser", seed=123, identity=IdentityAnchor(lora_name="creator_lora"), ppv_price_usd=15)
    result = asyncio.run(pipeline.generate_dual_variant(request))
    assert result["seed"] == 123
    assert client.workflows[0]["seed"] == client.workflows[1]["seed"] == 123
    assert result["unlock"]["ppv_price_usd"] == 15


def test_lora_strength_range_is_enforced():
    pipeline = ContentVariantPipeline(FakeQueueClient())
    request = MediaRequest(prompt="x", seed=1, identity=IdentityAnchor(lora_name="bad", lora_strength=0.5))
    with pytest.raises(ValueError):
        pipeline.build_image_workflow(request, "teaser")


def test_tip_to_action_ignores_low_tip():
    result = asyncio.run(TipToActionPipeline.process_tip_action("sub_1", 5.0, "red dress"))
    assert result == {"status": "ignored", "reason": "Tip below threshold or no style requested."}


def test_tip_to_action_triggers_comfyui(monkeypatch):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls["llm"] = kwargs
        return "red dress, golden hour, soft light"

    async def fake_submit_workflow(payload):
        calls["comfyui"] = payload
        return "job_123"

    monkeypatch.setattr(pipeline.llm_gateway, "generate_response", fake_generate_response)
    monkeypatch.setattr(pipeline.comfyui_gateway, "submit_workflow", fake_submit_workflow)

    result = asyncio.run(TipToActionPipeline.process_tip_action("sub_1", 20.0, "Can you do red dress at sunset?"))

    assert result["status"] == "rendering"
    assert result["job_id"] == "job_123"
    assert result["modifiers_used"] == "red dress, golden hour, soft light"
    assert calls["llm"]["model_combo"] == "cost-optimized"
    assert calls["comfyui"]["dimensions"] == (819, 1024)
    assert calls["comfyui"]["priority"] == "instant_high"


def test_tip_to_action_handles_comfyui_error(monkeypatch):
    async def fake_generate_response(**kwargs):
        return "blue robe, studio light"

    async def fake_submit_workflow(payload):
        raise RuntimeError("queue full")

    monkeypatch.setattr(pipeline.llm_gateway, "generate_response", fake_generate_response)
    monkeypatch.setattr(pipeline.comfyui_gateway, "submit_workflow", fake_submit_workflow)

    result = asyncio.run(TipToActionPipeline.process_tip_action("sub_1", 25.0, "blue robe"))
    assert result["status"] == "error"
    assert "queue full" in result["message"]
