import os
import httpx
from typing import Dict, Any

class HFComfyUIClient:
    """Client for routing image generation to a Dedicated Hugging Face Endpoint."""
    
    def __init__(self):
        # Target the dedicated URL provided by the Hugging Face dashboard
        self.endpoint_url = os.getenv("HF_COMFYUI_ENDPOINT_URL")
        self.api_token = os.getenv("HF_PRO_TOKEN")

    async def submit_workflow(self, payload: Dict[str, Any]) -> str:
        """Submits a rendering job to the dedicated GPU cluster."""
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        print(f"[HF GPU Router] Dispatching media payload to dedicated endpoint...")
        
        async with httpx.AsyncClient() as client:
            try:
                # The custom Docker handler on HF expects the payload in the "inputs" key
                response = await client.post(
                    self.endpoint_url, 
                    json={"inputs": payload}, 
                    headers=headers, 
                    timeout=30.0
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("job_id", "hf_job_unknown")
                else:
                    raise Exception(f"HF Endpoint returned {response.status_code}: {response.text}")
            except Exception as e:
                print(f"[HF Gateway Error] Fallback triggered: {str(e)}")
                return "error_failover"

hf_comfyui_gateway = HFComfyUIClient()
