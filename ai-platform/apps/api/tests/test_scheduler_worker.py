import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "apps" / "api"))

from workers.scheduler import main as scheduler


class FakeResponse:
    status_code = 200

    def json(self):
        return {"chats": [{"id": "chat_1", "text": "Loved the last set, any exclusive tonight?"}]}


class EmptyResponse:
    status_code = 200

    def json(self):
        return {"chats": []}


class FakeAsyncClient:
    response_cls = FakeResponse

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url, timeout):
        self.last_url = url
        return self.response_cls()


def test_load_thermonuclear_rubric_reads_file(monkeypatch):
    monkeypatch.chdir(ROOT)
    text = scheduler.load_thermonuclear_rubric()
    assert "Thermonuclear Review & QA Auditing" in text
    assert "Required Output Format" in text


def test_load_thermonuclear_rubric_fallback(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    text = scheduler.load_thermonuclear_rubric()
    assert "AI QA Auditor" in text


def test_execute_thermonuclear_audit_routes_priority(monkeypatch, capsys):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls.update(kwargs)
        return '{"overall_grade":"A","violations_detected":[]}'

    monkeypatch.chdir(ROOT)
    monkeypatch.setattr(scheduler.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(scheduler.llm_gateway, "generate_response", fake_generate_response)

    asyncio.run(scheduler.execute_thermonuclear_audit())
    captured = capsys.readouterr().out
    assert "THERMONUCLEAR AUDIT SCORECARD" in captured
    assert calls["model_combo"] == "priority-thermonuclear"
    assert calls["extra_headers"]["X-OmniRoute-Priority"] == "high-reasoning"
    assert "<sampled_interactions>" in calls["prompt"]


def test_execute_thermonuclear_audit_no_samples(monkeypatch, capsys):
    class NoSampleClient(FakeAsyncClient):
        response_cls = EmptyResponse

    monkeypatch.setattr(scheduler.httpx, "AsyncClient", NoSampleClient)
    asyncio.run(scheduler.execute_thermonuclear_audit())
    captured = capsys.readouterr().out
    assert "No chats found" in captured

