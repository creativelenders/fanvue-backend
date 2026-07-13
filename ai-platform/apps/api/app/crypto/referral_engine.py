import httpx
from typing import Dict, Any

class PoDRoyaltyEngine:
    """Manages perpetual 1% royalty distributions for network evangelists."""
    
    @staticmethod
    async def process_transaction_split(buyer_id: str, creator_id: str, amount_usd: float) -> Dict[str, Any]:
        """Intercepts a purchase and routes 1% to the original referrer if they exist."""
        print(f"[PoD Engine] Processing ${amount_usd} transaction from {buyer_id}...")
        
        async with httpx.AsyncClient() as client:
            try:
                # Check if the buyer was referred by an early evangelist
                resp = await client.get(f"http://localhost:8000/api/referrals/lookup?user={buyer_id}")
                referral_data = resp.json() if resp.status_code == 200 else None
            except Exception:
                referral_data = None

        if not referral_data:
            return {"status": "standard_split", "creator_payout": amount_usd * 0.90}

        # Calculate the 1% viral evangelist royalty
        referrer_id = referral_data["referrer_subscriber_id"]
        royalty_amount = amount_usd * float(referral_data["royalty_percentage"])
        creator_payout = amount_usd * 0.89  # Platform takes 10%, Referrer takes 1%

        print(f"[PoD Royalty Triggered] Routing ${royalty_amount} USDC to Evangelist: {referrer_id}")
        
        # In production: Trigger Web3 session key transfer to `referrer_id`
        return {
            "status": "royalty_split",
            "creator_payout": creator_payout,
            "evangelist_payout": royalty_amount,
            "evangelist_id": referrer_id
        }
