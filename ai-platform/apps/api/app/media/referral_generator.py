from __future__ import annotations

from typing import Any, Dict

from app.agent.llm import llm_gateway
from app.media.comfyui_client import comfyui_gateway


class ViralMediaGenerator:
    """Generates personalized AI media to replace standard referral URLs."""

    @classmethod
    async def create_trojan_horse_invite(cls, subscriber_id: str, creator_name: str) -> Dict[str, Any]:
        """Generates a highly shareable, custom ComfyUI image embedded with a referral marker."""
        print(f"[Viral Engine] Generating Trojan Horse invite for subscriber: {subscriber_id}")

        # 1. Ask Hermes to design a highly clickable visual concept.
        prompt_system = (
            f"Design a visually striking, 1-sentence prompt for an AI image generator featuring {creator_name}. "
            "Make it highly clickable for social media (e.g., cinematic, cyberpunk, or neon lighting). "
            "Output the ComfyUI prompt only."
        )

        visual_modifier = await llm_gateway.generate_response(
            prompt="Generate the referral image concept.",
            system_prompt=prompt_system,
            model_combo="hermes-brain",
            temperature=0.8,
        )

        # 2. Append watermark/QR overlay instructions to the ComfyUI payload.
        referral_path = f"/r/{subscriber_id}"
        generation_payload: Dict[str, Any] = {
            "prompt_text": visual_modifier.strip(),
            "preset_id": "viral_invite",
            "dimensions": (1080, 1350),
            "priority": "viral_growth",
            "safety_tier": "teaser_sfw",
            "subscriber_id": subscriber_id,
            "creator_name": creator_name,
            "referral_path": referral_path,
            "overlay": {
                "watermark_text": f"Discover {creator_name}",
                "qr_payload": referral_path,
                "placement": "bottom_right",
            },
        }

        try:
            job_id = await comfyui_gateway.submit_workflow(generation_payload)
            return {
                "status": "rendering",
                "job_id": job_id,
                "subscriber_id": subscriber_id,
                "creator_name": creator_name,
                "referral_path": referral_path,
                "visual_prompt": visual_modifier.strip(),
            }
        except Exception as e:
            return {"status": "error", "message": f"Referral media generation failed: {str(e)}"}
