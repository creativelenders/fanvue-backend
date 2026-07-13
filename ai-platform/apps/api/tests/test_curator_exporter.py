import asyncio

from app.media import curator_exporter
from app.media.curator_exporter import MABCuratorExporter


class FakeBoostClient:
    last_request = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def post(self, url, json):
        FakeBoostClient.last_request = {"url": url, "json": json}
        return None


def test_generate_bounty_link_uses_clean_tracking_url():
    assert (
        MABCuratorExporter.generate_bounty_link("asset_123", "staker_456")
        == "https://fanvue.com/discovery/asset_123?curator=staker_456"
    )


def test_log_external_traffic_boost_posts_simulated_wins(monkeypatch, capsys):
    monkeypatch.setattr(curator_exporter.httpx, "AsyncClient", FakeBoostClient)

    result = asyncio.run(
        MABCuratorExporter.log_external_traffic_boost(
            asset_id="asset_123",
            staker_id="staker_456",
            external_clicks=27,
        )
    )

    captured = capsys.readouterr().out
    assert "[MAB Exporter] Curator staker_456 drove 27 external clicks to asset asset_123" in captured
    assert "[Elo Boosted] Added 2 wins to asset asset_123" in captured
    assert FakeBoostClient.last_request == {
        "url": "http://localhost:8000/api/platform/elo/artificial-boost",
        "json": {
            "asset_id": "asset_123",
            "staker_id": "staker_456",
            "simulated_wins": 2,
        },
    }
    assert result == {"status": "processed", "elo_wins_added": 2}


def test_log_external_traffic_boost_skips_post_when_clicks_under_threshold(monkeypatch):
    FakeBoostClient.last_request = None
    monkeypatch.setattr(curator_exporter.httpx, "AsyncClient", FakeBoostClient)

    result = asyncio.run(
        MABCuratorExporter.log_external_traffic_boost(
            asset_id="asset_123",
            staker_id="staker_456",
            external_clicks=9,
        )
    )

    assert FakeBoostClient.last_request is None
    assert result == {"status": "processed", "elo_wins_added": 0}


def test_log_external_traffic_boost_handles_post_failure(monkeypatch, capsys):
    class FailingBoostClient(FakeBoostClient):
        async def post(self, url, json):
            raise RuntimeError("boost endpoint unavailable")

    monkeypatch.setattr(curator_exporter.httpx, "AsyncClient", FailingBoostClient)

    result = asyncio.run(
        MABCuratorExporter.log_external_traffic_boost(
            asset_id="asset_123",
            staker_id="staker_456",
            external_clicks=10,
        )
    )

    captured = capsys.readouterr().out
    assert "[MAB Exporter Error] Failed to route Elo boost: boost endpoint unavailable" in captured
    assert result == {"status": "processed", "elo_wins_added": 1}
