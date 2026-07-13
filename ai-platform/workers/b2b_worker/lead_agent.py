from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "apps" / "api"))

from apps.api.app.agent.llm import llm_gateway


class B2BLeadAgent:
    @staticmethod
    async def scout_target_brands(creator_niche: str, follower_count: int) -> list:
        """Mocks a web-scraping or API call to find brands actively spending in a niche."""
        print(f"[B2B Agent] Scouting brands for niche: {creator_niche} (Audience: {follower_count})")
        # In production: Integrate Apollo.io or Hunter.io APIs here
        return [
            {"name": "Lumiere Cosmetics", "contact": "partnerships@lumiere.mock", "budget_tier": "High"},
            {"name": "Aura Fitness", "contact": "sponsorships@aurafit.mock", "budget_tier": "Medium"}
        ]

    @staticmethod
    async def draft_outreach_email(creator_name: str, brand: dict, metrics: dict) -> str:
        """Uses Hermes 3 to draft a hyper-personalized pitch email."""
        prompt = f"""
Brand: {brand['name']}
Creator: {creator_name}
Metrics: {metrics['followers']} followers, {metrics['engagement_rate']}% engagement.
Draft a short, punchy 3-sentence email pitching a sponsored ComfyUI photoshoot integration.
"""
        return await llm_gateway.generate_response(
            prompt=prompt,
            system_prompt="You are an elite Hollywood talent manager. Be persuasive, professional, and concise.",
            model_combo="hermes-brain",
            temperature=0.7
        )


async def b2b_worker_loop():
    print("[B2B Worker] Started autonomous sponsorship scouting engine.")
    while True:
        try:
            # Mocking a creator profile fetch
            creator = {"id": "c_123", "name": "Elena", "niche": "Beauty & Fitness", "metrics": {"followers": 250000, "engagement_rate": 8.4}}
            
            brands = await B2BLeadAgent.scout_target_brands(creator["niche"], creator["metrics"]["followers"])
            
            for brand in brands:
                email_draft = await B2BLeadAgent.draft_outreach_email(creator["name"], brand, creator["metrics"])
                print(f"=== B2B DRAFT FOR {brand['name']} ===\nTo: {brand['contact']}\n{email_draft}\n=====================================")
                # In production: Save draft to database for the creator to 1-click approve and send
                await asyncio.sleep(2)
        except Exception as e:
            print(f"[B2B Worker Error] {str(e)}")
            
        await asyncio.sleep(86400) # Run daily scouting


if __name__ == "__main__":
    asyncio.run(b2b_worker_loop())
