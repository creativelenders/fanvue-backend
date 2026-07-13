from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "apps" / "api"))

from apps.api.app.agent.llm import llm_gateway  # OmniRoute Universal Gateway Client
from apps.api.app.crm.workflows import CRMWorkflowEngine


async def process_dormant_vips():
    """Finds VIP subscribers inactive > 72 hours and triggers automated check-ins."""
    print("[CRM Worker] Scanning for dormant VIP subscribers...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8000/api/crm/dormant-vips?hours=72", timeout=5.0)
            dormant_users = resp.json().get("users", []) if resp.status_code == 200 else []
        except Exception:
            dormant_users = []

    for user in dormant_users:
        prompt = f"Write a sweet, highly personalized check-in message for VIP subscriber {user.get('name', 'babe')}. Mention we miss chatting with them."
        response = await llm_gateway.generate_response(
            prompt=prompt,
            system_prompt="You are a warm, attentive FanVue creator persona. Keep it under 2 sentences. Use emojis.",
            model_combo="cost-optimized",
            temperature=0.8,
        )
        await CRMWorkflowEngine.queue_checkin_message(user["id"], response)
        await asyncio.sleep(1.0)  # Rate limit protection


async def promote_elite_elo_content():
    """Identifies content in 'exploiting' state with Elo > 1400 and creates PPV campaigns."""
    print("[CRM Worker] Scanning for elite Elo assets to wrap into PPV campaigns...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8000/api/platform/content?state=exploiting&min_elo=1400", timeout=5.0)
            elite_assets = resp.json().get("assets", []) if resp.status_code == 200 else []
        except Exception:
            elite_assets = []

    for asset in elite_assets:
        prompt = "Create an enticing 1-sentence PPV teaser broadcast for an asset with a 95% community rating. Suggest a price between $15 and $30."
        teaser = await llm_gateway.generate_response(
            prompt=prompt,
            system_prompt="You are a top 1% FanVue creator sales strategist. Be alluring and direct.",
            model_combo="hermes-brain",
            temperature=0.7,
        )
        await CRMWorkflowEngine.create_ppv_broadcast_campaign(
            asset_id=str(asset["asset_id"]),
            teaser_text=teaser,
            price=24.99,  # Standardized VIP unlock price
        )


async def scan_predictive_churn():
    """Identifies active users exhibiting early disengagement (latency widening > 50%)."""
    print("[CRM Worker] Scanning for predictive churn markers...")
    async with httpx.AsyncClient() as client:
        try:
            # Endpoint returns users whose average reply time jumped from e.g. 2 hours to 12+ hours
            resp = await client.get("http://localhost:8000/api/crm/analytics/churn-risk?latency_spike=1.5")
            at_risk_users = resp.json().get("users", []) if resp.status_code == 200 else []
        except Exception:
            at_risk_users = []

    for user in at_risk_users:
        prompt = f"VIP subscriber {user['name']} is slipping away. Write an alluring, urgent message offering a special private picture discount to pull them back into chat."
        winback_msg = await llm_gateway.generate_response(
            prompt=prompt,
            system_prompt="You are a warm, playful FanVue creator persona. Keep it irresistible. Under 2 sentences.",
            model_combo="hermes-brain",
            temperature=0.8,
        )

        # Queue message with an attached 30% discounted PPV unlock
        await CRMWorkflowEngine.create_ppv_broadcast_campaign(
            asset_id="winback_vault_01",
            teaser_text=winback_msg,
            price=9.99,  # Aggressive retention pricing
            target_tier=f"USER_{user['id']}",
        )
        print(f"[Predictive Churn] Deployed win-back campaign to at-risk user: {user['id']}")
        await asyncio.sleep(1.0)


async def trigger_creator_collabs():
    """Finds VIP users who exhausted >80% of a creator's PPV catalog and initiates introductions."""
    print("[CRM Worker] Scanning for catalog completion whales...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8000/api/crm/analytics/catalog-completion?threshold=0.80")
            whales = resp.json().get("subscribers", []) if resp.status_code == 200 else []
        except Exception:
            whales = []

    for whale in whales:
        source_name = whale["current_creator_name"]
        target_name = whale["recommended_creator_name"]

        prompt = f"Write a casual, exciting message from {source_name} telling subscriber {whale['name']} about your gorgeous best friend {target_name}. Say you took a picture together and think they would love her page."
        intro_text = await llm_gateway.generate_response(
            prompt=prompt,
            system_prompt="You are an enthusiastic, friendly creator sharing the spotlight with a creator friend. Use emojis.",
            model_combo="hermes-brain",
            temperature=0.7,
        )

        # Dispatch workflow with a multi-subject ComfyUI collaboration render
        await CRMWorkflowEngine.queue_cross_promotion(
            subscriber_id=whale["id"],
            source_creator=source_name,
            target_creator=target_name,
            intro_message=intro_text,
            collab_image_url=f"https://cdn.fanvue-platform.local/collabs/{source_name}_{target_name}_render.jpg",
        )
        await asyncio.sleep(1.0)


async def main_worker_loop():
    print("[CRM Worker Engine] Started full-stack background orchestration loop.")
    while True:
        try:
            await scan_predictive_churn()
            await trigger_creator_collabs()
            await process_dormant_vips()
            await promote_elite_elo_content()
        except Exception as e:
            print(f"[CRM Worker Error] Loop iteration failed: {str(e)}")

        await asyncio.sleep(3600)


if __name__ == "__main__":
    asyncio.run(main_worker_loop())
