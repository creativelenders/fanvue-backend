import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "apps" / "api"))

from workers.b2b_worker import lead_agent


def test_scout_target_brands_returns_mock_brand_leads(capsys):
    brands = asyncio.run(lead_agent.B2BLeadAgent.scout_target_brands("Beauty & Fitness", 250000))

    captured = capsys.readouterr().out
    assert "[B2B Agent] Scouting brands for niche: Beauty & Fitness (Audience: 250000)" in captured
    assert brands == [
        {"name": "Lumiere Cosmetics", "contact": "partnerships@lumiere.mock", "budget_tier": "High"},
        {"name": "Aura Fitness", "contact": "sponsorships@aurafit.mock", "budget_tier": "Medium"},
    ]


def test_draft_outreach_email_routes_to_hermes_brain(monkeypatch):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls.update(kwargs)
        return "Draft email"

    monkeypatch.setattr(lead_agent.llm_gateway, "generate_response", fake_generate_response)

    result = asyncio.run(
        lead_agent.B2BLeadAgent.draft_outreach_email(
            "Elena",
            {"name": "Lumiere Cosmetics", "contact": "partnerships@lumiere.mock", "budget_tier": "High"},
            {"followers": 250000, "engagement_rate": 8.4},
        )
    )

    assert result == "Draft email"
    assert calls["model_combo"] == "hermes-brain"
    assert calls["temperature"] == 0.7
    assert "Lumiere Cosmetics" in calls["prompt"]
    assert "250000 followers, 8.4% engagement" in calls["prompt"]
    assert "elite Hollywood talent manager" in calls["system_prompt"]
