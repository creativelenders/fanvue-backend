import asyncio

from app.media.hf_comfyui_client import HFComfyUIClient, hf_comfyui_gateway


class FakeResponse:
    def __init__(self, payload=None, status_code=200, text="OK"):
        self._payload = payload or {}
        self.status_code = status_code
        self.text = text

    def json(self):
        return self._payload


class FakeHFClient:
    response = FakeResponse({"job_id": "hf_job_123"}, 200)
    last_request = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def post(self, url, json, headers, timeout):
        FakeHFClient.last_request = {
            "url": url,
            "json": json,
            "headers": headers,
            "timeout": timeout,
        }
        return self.response


def test_global_hf_comfyui_gateway_exists():
    assert isinstance(hf_comfyui_gateway, HFComfyUIClient)


def test_submit_workflow_posts_to_hf_inputs_payload(monkeypatch, capsys):
    from app.media import hf_comfyui_client

    monkeypatch.setenv("HF_COMFYUI_ENDPOINT_URL", "https://hf.example.endpoint")
    monkeypatch.setenv("HF_PRO_TOKEN", "hf_test_token")
    monkeypatch.setattr(hf_comfyui_client.httpx, "AsyncClient", FakeHFClient)

    client = HFComfyUIClient()
    payload = {"prompt_text": "neon creator portrait", "preset_id": "viral_invite"}
    job_id = asyncio.run(client.submit_workflow(payload))

    captured = capsys.readouterr().out
    assert "[HF GPU Router] Dispatching media payload to dedicated endpoint" in captured
    assert job_id == "hf_job_123"
    assert FakeHFClient.last_request == {
        "url": "https://hf.example.endpoint",
        "json": {"inputs": payload},
        "headers": {
            "Authorization": "Bearer hf_test_token",
            "Content-Type": "application/json",
        },
        "timeout": 30.0,
    }


def test_submit_workflow_returns_unknown_job_when_missing_job_id(monkeypatch):
    from app.media import hf_comfyui_client

    class MissingJobClient(FakeHFClient):
        response = FakeResponse({}, 200)

    monkeypatch.setenv("HF_COMFYUI_ENDPOINT_URL", "https://hf.example.endpoint")
    monkeypatch.setenv("HF_PRO_TOKEN", "hf_test_token")
    monkeypatch.setattr(hf_comfyui_client.httpx, "AsyncClient", MissingJobClient)

    client = HFComfyUIClient()
    assert asyncio.run(client.submit_workflow({"prompt_text": "test"})) == "hf_job_unknown"


def test_submit_workflow_returns_failover_on_non_200(monkeypatch, capsys):
    from app.media import hf_comfyui_client

    class FailingHFClient(FakeHFClient):
        response = FakeResponse({}, 503, "GPU queue unavailable")

    monkeypatch.setenv("HF_COMFYUI_ENDPOINT_URL", "https://hf.example.endpoint")
    monkeypatch.setenv("HF_PRO_TOKEN", "hf_test_token")
    monkeypatch.setattr(hf_comfyui_client.httpx, "AsyncClient", FailingHFClient)

    client = HFComfyUIClient()
    result = asyncio.run(client.submit_workflow({"prompt_text": "test"}))

    captured = capsys.readouterr().out
    assert "[HF Gateway Error] Fallback triggered: HF Endpoint returned 503: GPU queue unavailable" in captured
    assert result == "error_failover"
