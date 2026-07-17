import os
import httpx
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class OrnithClient:
    """
    Client for Ornith-1.0 local OpenAI-compatible vLLM MCP planner.
    Implements robust API Key rotation for all providers and a multi-model fallback chain:
    Ornith-1.0 -> Hermes-3 -> OpenRouter -> Groq -> DeepSeek -> Kimi.
    """
    
    def __init__(self):
        self.base_url = os.getenv("ORNITH_BASE_URL", "http://localhost:8000/v1")
        self.model = os.getenv("ORNITH_MODEL", "Ornith-1.0")
        
        self.api_keys = self._parse_keys(os.getenv("ORNITH_API_KEY", "dummy-key-if-none"))
        self.enable_think_blocks = os.getenv("ORNITH_ENABLE_THINK_BLOCKS", "true").lower() == "true"
        
        # Fallback endpoints and keys
        self.omniroute_url = os.getenv("OMNIROUTE_BASE_URL", "http://localhost:20128/v1")
        self.omniroute_keys = self._parse_keys(os.getenv("OMNIROUTE_API_KEY", ""))
        self.hermes_model = os.getenv("HERMES_MODEL", "Nous-Hermes-3")
        
        self.openrouter_keys = self._parse_keys(os.getenv("OPENROUTER_API_KEY", ""))
        self.openrouter_model = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")
        
        self.groq_keys = self._parse_keys(os.getenv("GROQ_API_KEY", ""))
        self.groq_model = os.getenv("GROQ_MODEL", "llama3-70b-8192")
        
        self.deepseek_keys = self._parse_keys(os.getenv("DEEPSEEK_API_KEY", ""))
        self.kimi_keys = self._parse_keys(os.getenv("KIMI_API_KEY", ""))

        self._client = httpx.AsyncClient(timeout=30.0)
        logger.info(f"Initialized OrnithClient with multi-provider failover and key rotation.")

    def _parse_keys(self, raw: str) -> List[str]:
        return [k.strip() for k in raw.split(",") if k.strip()]

    def _build_payload(self, prompt: str, model_name: str) -> dict:
        system_prompt = (
            f"You are {model_name}, acting as the primary MCP planner.\n"
            "You MUST output a plan-only scaffold using Model Context Protocol (MCP).\n"
            "DO NOT execute treasury deposits, crypto transfers, Kalshi wagers, or outbound B2B emails directly.\n"
        )
        if self.enable_think_blocks and "Ornith" in model_name:
            system_prompt += "Use <think>...</think> blocks for reasoning before outputting the final plan.\n"
            
        return {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }

    async def _make_request(self, url: str, key: str, payload: dict) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {key}"} if key else {}
        response = await self._client.post(f"{url}/chat/completions", json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return self._parse_mcp_scaffold(content)

    async def _try_provider(self, provider_name: str, url: str, keys: List[str], payload: dict) -> Optional[Dict[str, Any]]:
        """Attempts to execute request across all available keys for a provider (Key Rotation)."""
        if not keys:
            # Try once without key (for local endpoints like OmniRoute that might not need auth)
            keys = [""]
            
        for idx, key in enumerate(keys):
            try:
                return await self._make_request(url, key, payload)
            except httpx.RequestError as e:
                logger.warning(f"[{provider_name}] HTTP Request Error with key idx {idx}: {e}")
            except httpx.HTTPStatusError as e:
                logger.warning(f"[{provider_name}] HTTP Status {e.response.status_code} with key idx {idx}")
                # 401/429 means we should try the next key, otherwise the model might be failing for other reasons but we still rotate to be safe
        return None

    async def generate_plan(self, prompt: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generates a plan-only MCP scaffold using a robust multi-model failover chain."""
        
        # --- 1. Ornith-1.0 (Primary) ---
        payload = self._build_payload(prompt, self.model)
        result = await self._try_provider("Ornith", self.base_url, self.api_keys, payload)
        if result: return result

        # --- 2. Hermes-3 via OmniRoute (Secondary) ---
        logger.info("Falling back to Hermes-3 via OmniRoute.")
        payload = self._build_payload(prompt, self.hermes_model)
        result = await self._try_provider("OmniRoute", self.omniroute_url, self.omniroute_keys, payload)
        if result: return result

        # --- 3. OpenRouter (Tertiary) ---
        logger.info("Falling back to OpenRouter.")
        payload = self._build_payload(prompt, self.openrouter_model)
        # OpenRouter uses a different header structure optionally, but standard Bearer works too.
        result = await self._try_provider("OpenRouter", "https://openrouter.ai/api/v1", self.openrouter_keys, payload)
        if result: return result

        # --- 4. Groq (Quaternary) ---
        logger.info("Falling back to Groq.")
        payload = self._build_payload(prompt, self.groq_model)
        result = await self._try_provider("Groq", "https://api.groq.com/openai/v1", self.groq_keys, payload)
        if result: return result

        # --- 5. DeepSeek (Quinary) ---
        logger.info("Falling back to DeepSeek.")
        payload = self._build_payload(prompt, "deepseek-chat")
        result = await self._try_provider("DeepSeek", "https://api.deepseek.com/v1", self.deepseek_keys, payload)
        if result: return result

        # --- 6. Kimi (Senary) ---
        logger.info("Falling back to Kimi (kimi-k3).")
        payload = self._build_payload(prompt, "kimi-k3")
        result = await self._try_provider("Kimi", "https://api.moonshot.cn/v1", self.kimi_keys, payload)
        if result: return result

        # --- 7. Ultimate Fallback Scaffold ---
        logger.error("All AI models and fallbacks failed. Returning default manual review scaffold.")
        return self._generate_fallback_plan(prompt)

    def _parse_mcp_scaffold(self, content: str) -> Dict[str, Any]:
        return {
            "status": "success",
            "scaffold": {"tasks": []},
            "raw_content": content
        }

    def _generate_fallback_plan(self, prompt: str) -> Dict[str, Any]:
        return {
            "status": "fallback",
            "scaffold": {
                "tasks": [{
                    "id": "task_1", 
                    "objective": prompt,
                    "acceptance": "Manual review completed.",
                    "depends_on": [],
                    "action": "manual_review"
                }]
            }
        }
