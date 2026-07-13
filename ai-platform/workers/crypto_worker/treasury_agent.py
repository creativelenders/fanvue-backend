from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "apps" / "api"))

from apps.api.app.agent.llm import llm_gateway


class TreasuryAgent:
    """Autonomous AI worker that manages creator yield strategies."""

    @classmethod
    async def evaluate_and_deploy_yield(cls, creator_id: str, idle_usdc_balance: float):
        """Uses Hermes to decide staking allocations for idle funds."""
        if idle_usdc_balance < 1000.00:
            return  # Balance too low to justify gas fees

        prompt = f"Creator {creator_id} has {idle_usdc_balance} idle USDC. Current APYs: Aave (4.2%), Compound (3.8%). Allocate funds to maximize safe yield. Output JSON strictly with target protocol and amount."

        # Route to highest reasoning model tier via OmniRoute
        strategy = await llm_gateway.generate_response(
            prompt=prompt,
            system_prompt="You are a conservative Web3 treasury manager. Output only JSON: {'protocol': 'Aave', 'amount': 1000}",
            model_combo="priority-thermonuclear",
            temperature=0.1,
        )

        print(f"[Treasury Agent] Deployed strategy for {creator_id}: {strategy}")
        # In production: Parse JSON and execute the smart contract deposit via Web3.py


async def treasury_loop():
    while True:
        # Fetch high-earning creators and run the evaluation
        await TreasuryAgent.evaluate_and_deploy_yield("creator_uuid_123", 2500.00)
        await asyncio.sleep(86400)  # Run daily


if __name__ == "__main__":
    asyncio.run(treasury_loop())
