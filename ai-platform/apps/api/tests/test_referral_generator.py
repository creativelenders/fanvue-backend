import asyncio

from app.media import referral_generator
from app.media.referral_generator import ViralMediaGenerator


def test_create_trojan_horse_invite_submits_comfyui_payload(monkeypatch, capsys):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls["llm"] = kwargs
        return "cinematic neon portrait, high contrast, viral social teaser"

    async def fake_submit_workflow(payload):
        calls["comfyui"] = payload
        return "job_viral_123"

    monkeypatch.setattr(referral_generator.llm_gateway, "generate_response", fake_generate_response)
    monkeypatch.setattr(referral_generator.comfyui_gateway, "submit_workflow", fake_submit_workflow)

    result = asyncio.run(ViralMediaGenerator.create_trojan_horse_invite("sub_123", "Elena"))

    captured = capsys.readouterr().out
    assert "[Viral Engine] Generating Trojan Horse invite for subscriber: sub_123" in captured
    assert calls["llm"]["model_combo"] == "hermes-brain"
    assert calls["llm"]["temperature"] == 0.8
    assert "featuring Elena" in calls["llm"]["system_prompt"]

    payload = calls["comfyui"]
    assert payload["preset_id"] == "viral_invite"
    assert payload["prompt_text"] == "cinematic neon portrait, high contrast, viral social teaser"
    assert payload["referral_path"] == "/r/sub_123"
    assert payload["overlay"]["qr_payload"] == "/r/sub_123"
    assert payload["overlay"]["watermark_text"] == "Discover Elena"
    assert payload["safety_tier"] == "teaser_sfw"

    assert result == {
        "status": "rendering",
        "job_id": "job_viral_123",
        "subscriber_id": "sub_123",
        "creator_name": "Elena",
        "referral_path": "/r/sub_123",
        "visual_prompt": "cinematic neon portrait, high contrast, viral social teaser",
    }


def test_create_trojan_horse_invite_handles_comfyui_failure(monkeypatch):
    async def fake_generate_response(**kwargs):
        return "neon creator teaser"

    async def failing_submit_workflow(payload):
        raise RuntimeError("queue unavailable")

    monkeypatch.setattr(referral_generator.llm_gateway, "generate_response", fake_generate_response)
    monkeypatch.setattr(referral_generator.comfyui_gateway, "submit_workflow", failing_submit_workflow)

    result = asyncio.run(ViralMediaGenerator.create_trojan_horse_invite("sub_123", "Elena"))

    assert result == {"status": "error", "message": "Referral media generation failed: queue unavailable"}
