from __future__ import annotations

from typing import Any

import httpx


class ComfyUIClient:
    def __init__(self, base_url: str = "http://127.0.0.1:8188", timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def queue_prompt(self, workflow: dict[str, Any], client_id: str = "fanvue-promotion-os") -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/prompt", json={"client_id": client_id, "prompt": workflow})
                response.raise_for_status()
                return response.json()
        except httpx.RequestError as e:
            raise RuntimeError(f"Failed to connect to ComfyUI GPU Server at {self.base_url}. Ensure the server is online. (Error: {e})")

    async def submit_workflow(self, workflow: dict[str, Any], client_id: str = "fanvue-promotion-os") -> str:
        result = await self.queue_prompt(workflow, client_id=client_id)
        return str(result.get("prompt_id") or result.get("job_id") or result.get("id") or "")


comfyui_gateway = ComfyUIClient()
