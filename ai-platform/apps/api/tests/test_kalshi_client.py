import asyncio

from app.trading.kalshi_client import KalshiTradingClient


class FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None


def test_generate_headers_uses_kalshi_env(monkeypatch):
    monkeypatch.setenv("KALSHI_ACCESS_KEY", "kalshi-test-key")
    monkeypatch.setenv("KALSHI_PRIVATE_KEY", "kalshi-private-key")
    client = KalshiTradingClient()

    headers = client._generate_headers()

    assert headers["Content-Type"] == "application/json"
    assert headers["KALSHI-ACCESS-KEY"] == "kalshi-test-key"
    assert headers["KALSHI-ACCESS-SIGNATURE"] == "mock_rsa_pss_signature"
    assert headers["KALSHI-ACCESS-TIMESTAMP"].isdigit()


def test_place_order_returns_mock_success_without_network(monkeypatch, capsys):
    from app.trading import kalshi_client

    monkeypatch.setattr(kalshi_client.httpx, "AsyncClient", FakeAsyncClient)
    client = KalshiTradingClient()
    result = asyncio.run(client.place_order("KXTEST-26", "bid", 3, 0.56))

    captured = capsys.readouterr().out
    assert "[Kalshi Execution] Placing bid order for 3 contracts on KXTEST-26 @ 0.56c" in captured
    assert result["status"] == "success"
    assert result["ticker"] == "KXTEST-26"
    assert isinstance(result["order_id"], str)
