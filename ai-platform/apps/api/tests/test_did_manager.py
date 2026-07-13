import asyncio

from app.crypto.did_manager import DecentralizedIdentityManager


class FakeResponse:
    def __init__(self, status_code):
        self.status_code = status_code


class FakeRelayClient:
    status_code = 200
    last_request = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def post(self, url, json):
        FakeRelayClient.last_request = {"url": url, "json": json}
        return FakeResponse(self.status_code)


def test_register_creator_did_returns_mock_tx_hash():
    manager = DecentralizedIdentityManager()
    tx_hash = asyncio.run(manager.register_creator_did("creator_12345678", "alice"))
    assert tx_hash == "0x_did_mint_creator_"


def test_anchor_follower_connection_success(monkeypatch):
    from app.crypto import did_manager

    monkeypatch.setattr(did_manager.httpx, "AsyncClient", FakeRelayClient)
    manager = DecentralizedIdentityManager()
    result = asyncio.run(manager.anchor_follower_connection("0xFollower", "did:fanvue:creator"))
    assert result is True
    assert FakeRelayClient.last_request["url"] == "http://localhost:8000/api/web3/relay/social"
    assert FakeRelayClient.last_request["json"] == {
        "follower_address": "0xFollower",
        "target_did": "did:fanvue:creator",
        "action": "follow",
    }


def test_anchor_follower_connection_failure(monkeypatch):
    from app.crypto import did_manager

    class FailingRelayClient(FakeRelayClient):
        status_code = 500

    monkeypatch.setattr(did_manager.httpx, "AsyncClient", FailingRelayClient)
    manager = DecentralizedIdentityManager()
    assert asyncio.run(manager.anchor_follower_connection("0xFollower", "did:fanvue:creator")) is False
