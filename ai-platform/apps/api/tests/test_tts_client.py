import asyncio

from app.media.tts_client import TTSGatewayClient


class FakeResponse:
    def __init__(self, status_code):
        self.status_code = status_code


class FakeTTSClient:
    status_code = 200
    last_request = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def post(self, url, json, headers, timeout):
        FakeTTSClient.last_request = {"url": url, "json": json, "headers": headers, "timeout": timeout}
        return FakeResponse(self.status_code)


def test_generate_voice_note_success(monkeypatch):
    monkeypatch.setenv("OMNIROUTE_TTS_URL", "http://tts.test/v1/audio/speech")
    monkeypatch.setenv("OMNIROUTE_API_KEY", "test-key")
    from app.media import tts_client

    monkeypatch.setattr(tts_client.httpx, "AsyncClient", FakeTTSClient)
    client = TTSGatewayClient()
    url = asyncio.run(client.generate_voice_note("hello fans", "voice_a"))
    assert url is not None
    assert url.endswith(".mp3")
    assert FakeTTSClient.last_request["url"] == "http://tts.test/v1/audio/speech"
    assert FakeTTSClient.last_request["json"]["voice"] == "voice_a"
    assert FakeTTSClient.last_request["headers"]["Authorization"] == "Bearer test-key"


def test_generate_voice_note_non_200_returns_none(monkeypatch):
    from app.media import tts_client

    class FailingTTSClient(FakeTTSClient):
        status_code = 500

    monkeypatch.setattr(tts_client.httpx, "AsyncClient", FailingTTSClient)
    client = TTSGatewayClient()
    assert asyncio.run(client.generate_voice_note("hello fans", "voice_a")) is None

