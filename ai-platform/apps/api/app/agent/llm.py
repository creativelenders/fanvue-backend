from __future__ import annotations

import json
import os
from typing import Any, Awaitable, Callable, Protocol

import httpx

from app.crm.guardrails import HermesGuardrailEngine

DEFAULT_OMNIROUTE_BASE_URL = "http://localhost:20128/v1"


class LLMClient(Protocol):
    async def complete(self, prompt: str, *, response_format: str = "text", combo: str | None = None) -> str:
        ...


LLMCallable = Callable[[str], Awaitable[str]]


class NullLLMClient:
    """Safe default for tests and dry-runs."""

    async def complete(self, prompt: str, *, response_format: str = "text", combo: str | None = None) -> str:
        if response_format == "json":
            return json.dumps({"score": 0, "critical_issues": ["No LLM configured"], "fixes_required": []})
        return "No LLM configured. Provide an LLMClient implementation."


class OmniRouteLLMClient:
    """OpenAI-compatible OmniRoute client using Nous Hermes 3 by default."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 30.0,
        guardrails: HermesGuardrailEngine | None = None,
    ):
        self.base_url = (base_url or os.getenv("OMNIROUTE_BASE_URL") or os.getenv("OPEN_MODEL_BASE_URL") or DEFAULT_OMNIROUTE_BASE_URL).rstrip("/")
        self.api_key = api_key or os.getenv("OMNIROUTE_API_KEY") or os.getenv("OPEN_MODEL_API_KEY")
        self.model = model or os.getenv("HERMES_MODEL") or os.getenv("OPEN_MODEL_NAME") or "Nous-Hermes-3"
        self.timeout = timeout
        self.guardrails = guardrails or HermesGuardrailEngine()

    async def complete(self, prompt: str, *, response_format: str = "text", combo: str | None = None) -> str:
        return await generate_response(
            prompt,
            response_format=response_format,
            combo=combo,
            base_url=self.base_url,
            api_key=self.api_key,
            model=self.model,
            timeout=self.timeout,
            guardrails=self.guardrails,
        )


async def generate_response(
    user_input: str,
    *,
    system_prompt: str | None = None,
    response_format: str = "text",
    combo: str | None = None,
    base_url: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
    temperature: float = 0.2,
    extra_headers: dict[str, str] | None = None,
    timeout: float = 30.0,
    guardrails: HermesGuardrailEngine | None = None,
) -> str:
    engine = guardrails or HermesGuardrailEngine()
    if not engine.pre_flight_check(user_input):
        payload = engine.rejection_payload()
        return json.dumps(payload) if response_format == "json" else payload["response"]

    endpoint = (base_url or os.getenv("OMNIROUTE_BASE_URL") or os.getenv("OPEN_MODEL_BASE_URL") or DEFAULT_OMNIROUTE_BASE_URL).rstrip("/")
    if not endpoint:
        return json.dumps({"ok": False, "fallback": "missing_omniroute_base_url"}) if response_format == "json" else "I’m having trouble connecting right now. What would you like me to help with next?"

    headers = {"Content-Type": "application/json"}
    token = api_key or os.getenv("OMNIROUTE_API_KEY") or os.getenv("OPEN_MODEL_API_KEY")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if combo:
        headers["X-OmniRoute-Combo"] = combo
    if extra_headers:
        headers.update(extra_headers)

    messages: list[dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_input})

    payload: dict[str, Any] = {
        "model": model or os.getenv("HERMES_MODEL") or os.getenv("OPEN_MODEL_NAME") or "Nous-Hermes-3",
        "messages": messages,
        "temperature": temperature,
    }
    if response_format == "json":
        payload["response_format"] = {"type": "json_object"}

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(_chat_completions_url(endpoint), headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
    except Exception as exc:
        print("EXCEPTION IN PRIMARY LLM GATEWAY:", type(exc).__name__, exc)
        if hasattr(exc, "response") and hasattr(exc.response, "text"):
            print("ERROR BODY:", exc.response.text)
            
        # Robust Multi-Model Fallback Chain
        fallbacks = [
            {
                "name": "Groq",
                "key": os.getenv("GROQ_API_KEY"),
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "model": os.getenv("GROQ_MODEL", "llama3-70b-8192")
            },
            {
                "name": "OpenRouter",
                "key": os.getenv("OPENROUTER_API_KEY"),
                "url": "https://openrouter.ai/api/v1/chat/completions",
                "model": os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")
            },
            {
                "name": "DeepSeek",
                "key": os.getenv("DEEPSEEK_API_KEY"),
                "url": "https://api.deepseek.com/chat/completions",
                "model": "deepseek-chat"
            },
            {
                "name": "Kimi",
                "key": os.getenv("KIMI_API_KEY"),
                "url": "https://api.moonshot.cn/v1/chat/completions",
                "model": "kimi-k3"
            }
        ]
        
        for fb in fallbacks:
            if not fb["key"]:
                continue
                
            print(f"Attempting {fb['name']} fallback...")
            try:
                payload["model"] = fb["model"]
                async with httpx.AsyncClient(timeout=timeout) as client:
                    fb_response = await client.post(
                        fb["url"], 
                        headers={"Authorization": f"Bearer {fb['key']}", "Content-Type": "application/json"}, 
                        json=payload
                    )
                    fb_response.raise_for_status()
                    data = fb_response.json()
                    content = data["choices"][0]["message"]["content"]
                    print(f"{fb['name']} fallback successful!")
                    break  # Success! Exit fallback loop
            except Exception as fb_exc:
                print(f"{fb['name']} FALLBACK FAILED:", type(fb_exc).__name__, fb_exc)
        else:
            # If the loop finishes without breaking, ALL fallbacks failed
            fallback = {"ok": False, "fallback": "all_models_failed", "error_type": type(exc).__name__}
            return json.dumps(fallback) if response_format == "json" else "I’m having trouble generating that right now."

    if response_format == "json":
        filtered_json = engine.redact_leaks(str(content))
        return filtered_json if _looks_like_json(filtered_json) else json.dumps({"ok": True, "text": filtered_json})
    filtered = engine.post_flight_filter(str(content))
    return filtered


def parse_json_object(raw: str, fallback: dict[str, Any]) -> dict[str, Any]:
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else fallback
    except json.JSONDecodeError:
        return fallback


def _looks_like_json(value: str) -> bool:
    try:
        json.loads(value)
        return True
    except json.JSONDecodeError:
        return False


def _chat_completions_url(endpoint: str) -> str:
    return f"{endpoint}/chat/completions" if endpoint.endswith("/v1") else f"{endpoint}/v1/chat/completions"


class LLMGateway:
    async def generate_response(
        self,
        *,
        prompt: str,
        system_prompt: str | None = None,
        model_combo: str | None = None,
        temperature: float = 0.2,
        extra_headers: dict[str, str] | None = None,
        response_format: str = "text",
    ) -> str:
        return await generate_response(
            prompt,
            system_prompt=system_prompt,
            response_format=response_format,
            combo=model_combo,
            temperature=temperature,
            extra_headers=extra_headers,
        )


llm_gateway = LLMGateway()
