import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "apps" / "api"))

from workers.crypto_worker import treasury_agent


def test_evaluate_and_deploy_yield_skips_small_balances(monkeypatch):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls["llm"] = kwargs
        return '{"protocol":"Aave","amount":1000}'

    monkeypatch.setattr(treasury_agent.llm_gateway, "generate_response", fake_generate_response)
    asyncio.run(treasury_agent.TreasuryAgent.evaluate_and_deploy_yield("creator_1", 999.99))
    assert calls == {}


def test_evaluate_and_deploy_yield_routes_priority_combo(monkeypatch, capsys):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls.update(kwargs)
        return '{"protocol":"Aave","amount":2500}'

    monkeypatch.setattr(treasury_agent.llm_gateway, "generate_response", fake_generate_response)
    asyncio.run(treasury_agent.TreasuryAgent.evaluate_and_deploy_yield("creator_1", 2500.00))

    captured = capsys.readouterr().out
    assert "[Treasury Agent] Deployed strategy for creator_1" in captured
    assert calls["model_combo"] == "priority-thermonuclear"
    assert calls["temperature"] == 0.1
    assert "idle USDC" in calls["prompt"]
    assert "conservative Web3 treasury manager" in calls["system_prompt"]
