import asyncio

from app.crypto import referral_engine
from app.crypto.referral_engine import PoDRoyaltyEngine


class FakeResponse:
    def __init__(self, payload=None, status_code=200):
        self._payload = payload or {}
        self.status_code = status_code

    def json(self):
        return self._payload


class FakeReferralClient:
    response = FakeResponse()
    last_url = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url):
        FakeReferralClient.last_url = url
        return self.response


def test_process_transaction_split_standard_when_no_referral(monkeypatch, capsys):
    class NoReferralClient(FakeReferralClient):
        response = FakeResponse({}, 404)

    monkeypatch.setattr(referral_engine.httpx, "AsyncClient", NoReferralClient)
    result = asyncio.run(PoDRoyaltyEngine.process_transaction_split("buyer_1", "creator_1", 100.0))

    captured = capsys.readouterr().out
    assert "[PoD Engine] Processing $100.0 transaction from buyer_1" in captured
    assert NoReferralClient.last_url == "http://localhost:8000/api/referrals/lookup?user=buyer_1"
    assert result == {"status": "standard_split", "creator_payout": 90.0}


def test_process_transaction_split_royalty_when_referral_exists(monkeypatch, capsys):
    class ReferralClient(FakeReferralClient):
        response = FakeResponse(
            {
                "referrer_subscriber_id": "evangelist_1",
                "royalty_percentage": "0.010",
            },
            200,
        )

    monkeypatch.setattr(referral_engine.httpx, "AsyncClient", ReferralClient)
    result = asyncio.run(PoDRoyaltyEngine.process_transaction_split("buyer_2", "creator_1", 250.0))

    captured = capsys.readouterr().out
    assert "[PoD Royalty Triggered] Routing $2.5 USDC to Evangelist: evangelist_1" in captured
    assert result == {
        "status": "royalty_split",
        "creator_payout": 222.5,
        "evangelist_payout": 2.5,
        "evangelist_id": "evangelist_1",
    }


def test_process_transaction_split_standard_on_lookup_failure(monkeypatch):
    class FailingReferralClient(FakeReferralClient):
        async def get(self, url):
            raise RuntimeError("lookup unavailable")

    monkeypatch.setattr(referral_engine.httpx, "AsyncClient", FailingReferralClient)
    result = asyncio.run(PoDRoyaltyEngine.process_transaction_split("buyer_3", "creator_1", 50.0))

    assert result == {"status": "standard_split", "creator_payout": 45.0}
