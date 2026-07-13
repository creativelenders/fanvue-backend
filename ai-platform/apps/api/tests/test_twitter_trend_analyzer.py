import asyncio

from app.analytics import twitter_trend_analyzer
from app.analytics.twitter_trend_analyzer import XSignalAnalyzer


class FakeResponse:
    def __init__(self, payload=None, status_code=200):
        self._payload = payload or {}
        self.status_code = status_code

    def json(self):
        return self._payload


class FakeXClient:
    response = FakeResponse(
        {
            "data": [
                {"name": f"Trend {idx}", "tweet_volume": idx * 1000}
                for idx in range(1, 25)
            ]
        },
        200,
    )
    last_request = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url, headers, timeout):
        FakeXClient.last_request = {"url": url, "headers": headers, "timeout": timeout}
        return self.response


def test_fetch_global_trends_returns_top_20(monkeypatch, capsys):
    monkeypatch.setenv("TWITTER_BEARER_TOKEN", "x_test_token")
    monkeypatch.setattr(twitter_trend_analyzer.httpx, "AsyncClient", FakeXClient)

    analyzer = XSignalAnalyzer()
    trends = asyncio.run(analyzer.fetch_global_trends())

    captured = capsys.readouterr().out
    assert "[X Analytics] Fetching global macro trends" in captured
    assert len(trends) == 20
    assert trends[0] == {"trend": "Trend 1", "volume": 1000}
    assert trends[-1] == {"trend": "Trend 20", "volume": 20000}
    assert FakeXClient.last_request == {
        "url": "https://api.twitter.com/2/trends/by/woeid/1",
        "headers": {"Authorization": "Bearer x_test_token"},
        "timeout": 10.0,
    }


def test_fetch_global_trends_returns_empty_on_non_200(monkeypatch):
    class Non200XClient(FakeXClient):
        response = FakeResponse({}, 429)

    monkeypatch.setenv("TWITTER_BEARER_TOKEN", "x_test_token")
    monkeypatch.setattr(twitter_trend_analyzer.httpx, "AsyncClient", Non200XClient)

    analyzer = XSignalAnalyzer()
    assert asyncio.run(analyzer.fetch_global_trends()) == []


def test_fetch_global_trends_returns_empty_on_exception(monkeypatch, capsys):
    class FailingXClient(FakeXClient):
        async def get(self, url, headers, timeout):
            raise RuntimeError("x api unavailable")

    monkeypatch.setenv("TWITTER_BEARER_TOKEN", "x_test_token")
    monkeypatch.setattr(twitter_trend_analyzer.httpx, "AsyncClient", FailingXClient)

    analyzer = XSignalAnalyzer()
    assert asyncio.run(analyzer.fetch_global_trends()) == []
    captured = capsys.readouterr().out
    assert "[X API Error] Trend analysis failed: x api unavailable" in captured
