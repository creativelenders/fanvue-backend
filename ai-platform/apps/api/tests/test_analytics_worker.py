import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "apps" / "api"))

from workers.analytics_worker import main as analytics_worker


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


class FakeAsyncClient:
    last_url = None
    response = FakeResponse(
        {
            "assets": [
                {"asset_id": f"asset_{idx}", "elo_rating": 1450 + idx, "workflow_preset": "neon"}
                for idx in range(1, 8)
            ]
        },
        200,
    )

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url):
        FakeAsyncClient.last_url = url
        return self.response


class FakeXSignalAnalyzer:
    async def fetch_global_trends(self):
        return [{"trend": "Cyberpunk", "volume": 100000}, {"trend": "Neon Fitness", "volume": 75000}]


def test_execute_trend_synthesis_routes_combined_payload_to_hermes(monkeypatch, capsys):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls.update(kwargs)
        return "- Generate neon cyberpunk creator fitness prompts."

    monkeypatch.setattr(analytics_worker, "XSignalAnalyzer", FakeXSignalAnalyzer)
    monkeypatch.setattr(analytics_worker.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(analytics_worker.llm_gateway, "generate_response", fake_generate_response)

    asyncio.run(analytics_worker.execute_trend_synthesis())

    captured = capsys.readouterr().out
    assert "Initiating Social Signal Synthesis" in captured
    assert "MARKET ARBITRAGE DIRECTIVE" in captured
    assert FakeAsyncClient.last_url == "http://localhost:8000/api/platform/content?state=exploiting&min_elo=1400"
    assert calls["model_combo"] == "hermes-brain"
    assert calls["temperature"] == 0.3
    assert "Chief Marketing Officer" in calls["system_prompt"]
    assert "<external_macro_trends>" in calls["prompt"]
    assert "Cyberpunk" in calls["prompt"]
    assert "<internal_platform_performance>" in calls["prompt"]
    assert "asset_1" in calls["prompt"]
    assert "asset_5" in calls["prompt"]
    assert "asset_6" not in calls["prompt"]


def test_execute_trend_synthesis_handles_internal_signal_failure(monkeypatch):
    calls = {}

    class FailingAsyncClient(FakeAsyncClient):
        async def get(self, url):
            raise RuntimeError("api unavailable")

    async def fake_generate_response(**kwargs):
        calls.update(kwargs)
        return "Directive"

    monkeypatch.setattr(analytics_worker, "XSignalAnalyzer", FakeXSignalAnalyzer)
    monkeypatch.setattr(analytics_worker.httpx, "AsyncClient", FailingAsyncClient)
    monkeypatch.setattr(analytics_worker.llm_gateway, "generate_response", fake_generate_response)

    asyncio.run(analytics_worker.execute_trend_synthesis())

    assert "Cyberpunk" in calls["prompt"]
    assert "<internal_platform_performance>\n[]" in calls["prompt"]
