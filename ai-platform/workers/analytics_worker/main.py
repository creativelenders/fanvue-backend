from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "apps" / "api"))

from apps.api.app.analytics.twitter_trend_analyzer import XSignalAnalyzer
from apps.api.app.agent.llm import llm_gateway


async def execute_trend_synthesis():
    """Combines X macro trends with internal platform Elo data to optimize content."""
    print(f"[{datetime.utcnow()}] Initiating Social Signal Synthesis...")
    
    # 1. Fetch External Social Signals
    x_analyzer = XSignalAnalyzer()
    external_trends = await x_analyzer.fetch_global_trends()
    
    # 2. Fetch Internal Platform Signals
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8000/api/platform/content?state=exploiting&min_elo=1400")
            high_elo_assets = resp.json().get("assets", [])[:5] if resp.status_code == 200 else []
        except Exception:
            high_elo_assets = []

    # 3. Compile the cognitive payload for Hermes
    prompt_payload = f"""
<external_macro_trends>
{json.dumps(external_trends, indent=2)}
</external_macro_trends>

<internal_platform_performance>
{json.dumps(high_elo_assets, indent=2)}
</internal_platform_performance>

Analyze the external X trends against our internal high-Elo content. Identify 2 cross-over opportunities (e.g., if 'Cyberpunk' is trending externally and neon assets are performing well internally). Generate a direct, actionable prompt instruction we can feed to ComfyUI for our creators to capitalize on this traffic.
"""

    synthesis_report = await llm_gateway.generate_response(
        prompt=prompt_payload,
        system_prompt="You are a data-driven Chief Marketing Officer. Output clean Markdown directives.",
        model_combo="hermes-brain",
        temperature=0.3
    )
    
    print(f"=== MARKET ARBITRAGE DIRECTIVE ===\n{synthesis_report}\n==================================")
    # In production: Queue these generated ComfyUI prompts directly to the creator dashboards


async def analytics_loop():
    print("[Analytics Engine] Started macro trend optimization loop.")
    while True:
        try:
            await execute_trend_synthesis()
        except Exception as e:
            print(f"[Analytics Loop Error] {str(e)}")
        # Execute every 12 hours to stay ahead of X trends
        await asyncio.sleep(43200) 


if __name__ == "__main__":
    asyncio.run(analytics_loop())
