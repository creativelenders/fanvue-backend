import os
import httpx
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class OrnithClient:
    """
    Client for Ornith-1.0 local OpenAI-compatible vLLM MCP planner.
    Implements robust API Key rotation and a multi-model fallback chain:
    Ornith-1.0 -> Hermes-3 -> DeepSeek -> Kimi.
    """
    
    def __init__(self):
        self.base_url = os.getenv("ORNITH_BASE_URL", "http://localhost:8000/v1")
        self.model = os.getenv("ORNITH_MODEL", "Ornith-1.0")
        
        # Key Rotation Setup (comma-separated keys)
        raw_keys = os.getenv("ORNITH_API_KEY", "dummy-key-if-none")
        self.api_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        self.current_key_idx = 0
        
        self.enable_think_blocks = os.getenv("ORNITH_ENABLE_THINK_BLOCKS", "true").lower() == "true"
        
        # Fallback endpoints and keys
        self.omniroute_url = os.getenv("OMNIROUTE_BASE_URL", "http://localhost:20128/v1")
        self.hermes_model = os.getenv("HERMES_MODEL", "Nous-Hermes-3")
        self.deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.kimi_key = os.getenv("KIMI_API_KEY", "")

        self._client = httpx.AsyncClient(timeout=30.0)
        logger.info(f"Initialized OrnithClient for model {self.model} at {self.base_url} with {len(self.api_keys)} keys.")

    def _get_current_key(self) -> str:
        if not self.api_keys:
            return ""
        return self.api_keys[self.current_key_idx]

    def _rotate_key(self):
        if self.api_keys:
            self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
            logger.info(f"Rotated Ornith API key. Now using index {self.current_key_idx}")

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

    async def generate_plan(self, prompt: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generates a plan-only MCP scaffold using a robust multi-model failover chain.
        """
        # --- 1. Ornith-1.0 (Primary) with Key Rotation ---
        for _ in range(max(1, len(self.api_keys))):
            current_key = self._get_current_key()
            payload = self._build_payload(prompt, self.model)
            try:
                return await self._make_request(self.base_url, current_key, payload)
            except httpx.RequestError as e:
                logger.warning(f"Ornith HTTP Request Error with key idx {self.current_key_idx}: {e}")
                self._rotate_key()
            except httpx.HTTPStatusError as e:
                logger.warning(f"Ornith HTTP Status Error {e.response.status_code} with key idx {self.current_key_idx}")
                if e.response.status_code in [401, 429]:
                    self._rotate_key()
                else:
                    break

        # --- 2. Hermes-3 via OmniRoute (Secondary) ---
        logger.info("Falling back to Hermes-3 via OmniRoute.")
        try:
            payload = self._build_payload(prompt, self.hermes_model)
            omni_key = os.getenv("OMNIROUTE_API_KEY", "")
            return await self._make_request(self.omniroute_url, omni_key, payload)
        except Exception as e:
            logger.warning(f"Hermes fallback failed: {e}")

        # --- 3. DeepSeek (Tertiary) ---
        if self.deepseek_key:
            logger.info("Falling back to DeepSeek.")
            try:
                payload = self._build_payload(prompt, "deepseek-chat")
                return await self._make_request("https://api.deepseek.com/v1", self.deepseek_key, payload)
            except Exception as e:
                logger.warning(f"DeepSeek fallback failed: {e}")

        # --- 4. Kimi (Quaternary) ---
        if self.kimi_key:
            logger.info("Falling back to Kimi.")
            try:
                payload = self._build_payload(prompt, "moonshot-v1-8k")
                return await self._make_request("https://api.moonshot.cn/v1", self.kimi_key, payload)
            except Exception as e:
                logger.warning(f"Kimi fallback failed: {e}")

        # --- 5. Ultimate Fallback Scaffold ---
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
