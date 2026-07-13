from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from app.config import get_settings
from app.db import get_session_factory
from app.agent.llm import llm_gateway
from app.platform.models import Campaign


async def generate_campaign_plan(campaign: Campaign) -> list[dict]:
    """Generates a marketing plan for the campaign using LLM."""
    prompt = f"""
    Create a promotional campaign plan for a creator platform.
    Objective: {campaign.objective}
    Target Audience: {campaign.audience}
    Offer: {campaign.offer}
    
    Output a JSON object with a single key "channels" which contains an array of 3 distinct promotional channels/actions. Each object in the array must have:
    - "type": "post" or "direct_message" or "story"
    - "message": the actual text copy (include emojis, make it highly converting)
    - "suggested_price": number (if it's a PPV message, otherwise 0)
    
    Output ONLY valid JSON without markdown formatting.
    """
    
    response = await llm_gateway.generate_response(
        prompt=prompt,
        system_prompt="You are an elite top 1% creator marketing strategist. Output ONLY raw JSON.",
        model_combo="cost-optimized",
        temperature=0.7,
        response_format="json",
    )
    
    try:
        # Try to parse the response as JSON
        # In case the LLM wrapped it in ```json ... ```, strip it
        clean_json = response.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        parsed = json.loads(clean_json.strip())
        return parsed.get("channels", parsed)
    except Exception as e:
        print(f"[Campaign Worker] Failed to parse JSON from LLM: {e}")
        # Fallback plan
        return [
            {
                "type": "post",
                "message": f"Hey loves! {campaign.offer}. Don't miss out! 💕",
                "suggested_price": 0
            }
        ]


async def process_once(limit: int = 5) -> int:
    settings = get_settings()
    session_factory = get_session_factory(settings.database_url)
    session = session_factory()
    processed = 0
    try:
        campaigns = (
            session.query(Campaign)
            .filter(Campaign.status == "draft")
            .order_by(Campaign.created_at.asc())
            .limit(limit)
            .all()
        )
        
        for campaign in campaigns:
            print(f"[Campaign Worker] Processing campaign: {campaign.id}")
            # Generate the plan
            plan = await generate_campaign_plan(campaign)
            
            # Save it
            campaign.channels_json = json.dumps(plan)
            campaign.status = "active"
            campaign.updated_at = datetime.now(timezone.utc)
            session.commit()
            processed += 1
            
            await asyncio.sleep(1) # Small delay between API calls
            
        return processed
    finally:
        session.close()


async def main() -> None:
    print("[Campaign Worker] Started polling for draft campaigns...")
    while True:
        try:
            count = await process_once()
            if count > 0:
                print({"worker": "campaign", "processed": count})
        except Exception as e:
            print(f"[Campaign Worker] Error: {e}")
        await asyncio.sleep(10)


if __name__ == "__main__":
    asyncio.run(main())
