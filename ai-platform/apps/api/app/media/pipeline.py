from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Protocol

from app.agent.llm import llm_gateway
from app.media.comfyui_client import comfyui_gateway


class QueueClient(Protocol):
    async def queue_prompt(self, workflow: dict[str, Any], client_id: str = "fanvue-promotion-os") -> dict[str, Any]:
        ...


@dataclass
class IdentityAnchor:
    lora_name: str
    lora_strength: float = 0.78
    face_reference_asset_id: str | None = None


@dataclass
class MediaRequest:
    prompt: str
    seed: int
    identity: IdentityAnchor
    ppv_price_usd: float = 15.0
    motion_prompt: str | None = None
    aspect_ratio: str = "9:16"


class ContentVariantPipeline:
    """Builds synchronized teaser/unlock branches using identical seed and spatial noise."""

    def __init__(self, queue_client: QueueClient):
        self.queue_client = queue_client

    def build_image_workflow(self, request: MediaRequest, variant: str) -> dict[str, Any]:
        if not 0.70 <= request.identity.lora_strength <= 0.85:
            raise ValueError("LoRA identity strength must stay in the 0.70–0.85 range")
        return {
            "variant": variant,
            "seed": request.seed,
            "aspect_ratio": request.aspect_ratio,
            "prompt": request.prompt,
            "identity": {
                "lora_name": request.identity.lora_name,
                "lora_strength": request.identity.lora_strength,
                "ip_adapter_face_id_asset": request.identity.face_reference_asset_id,
            },
            "safety_tier": "teaser_sfw" if variant == "teaser" else "locked_ppv",
        }

    def build_i2v_workflow(self, frame_0_asset_id: str, request: MediaRequest, variant: str) -> dict[str, Any]:
        return {
            "variant": variant,
            "mode": "image_to_video",
            "frame_0": frame_0_asset_id,
            "seed": request.seed,
            "motion_prompt": request.motion_prompt or "subtle camera movement, natural lighting shift, stable face",
            "lock_identity": True,
        }

    async def generate_dual_variant(self, request: MediaRequest) -> dict[str, Any]:
        teaser_workflow = self.build_image_workflow(request, "teaser")
        unlock_workflow = self.build_image_workflow(request, "unlock")
        teaser_job = await self.queue_client.queue_prompt(teaser_workflow)
        unlock_job = await self.queue_client.queue_prompt(unlock_workflow)
        return {
            "seed": request.seed,
            "teaser": {"job": teaser_job, "distribution": "social_funnel"},
            "unlock": {"job": unlock_job, "distribution": "fanvue_locked_message", "ppv_price_usd": request.ppv_price_usd},
        }


class TipToActionPipeline:
    TIP_THRESHOLD_USD = 15.00

    @classmethod
    async def process_tip_action(cls, subscriber_id: str, tip_amount: float, tip_message: str, base_preset: str = "casual_selfie") -> Dict[str, Any]:
        """Evaluates incoming tips and immediately triggers ComfyUI media generation if qualified."""
        if tip_amount < cls.TIP_THRESHOLD_USD or not tip_message:
            return {"status": "ignored", "reason": "Tip below threshold or no style requested."}

        print(f"[Tip-to-Action] Intercepted ${tip_amount} tip from {subscriber_id}: '{tip_message}'")

        # 1. Use Hermes to clean the subscriber's raw message into a clean visual prompt modifier
        prompt_cleaning_system = "Extract visual styling cues, clothing, lighting, or setting details from the user's tip message. Output ONLY comma-separated ComfyUI prompt keywords."
        clean_modifiers = await llm_gateway.generate_response(
            prompt=tip_message,
            system_prompt=prompt_cleaning_system,
            model_combo="cost-optimized",
            temperature=0.3,
        )

        # 2. Build payload and trigger ComfyUI rendering node
        generation_payload = {
            "prompt_text": clean_modifiers,
            "preset_id": base_preset,
            "dimensions": (819, 1024),  # Standard 4:5 aspect ratio
            "priority": "instant_high",
        }

        try:
            job_id = await comfyui_gateway.submit_workflow(generation_payload)
            return {
                "status": "rendering",
                "job_id": job_id,
                "subscriber_id": subscriber_id,
                "modifiers_used": clean_modifiers,
                "message": f"Thank you for the ${tip_amount} tip! I am taking that custom picture for you right now 💕",
            }
        except Exception as e:
            return {"status": "error", "message": f"Media pipeline busy: {str(e)}"}
