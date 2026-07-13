import os
import httpx
from typing import List, Dict, Any

class XSignalAnalyzer:
    """Fetches real-time social trends to cross-reference with platform data."""
    
    def __init__(self):
        self.bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
        # Standard X API v2 Trends endpoint using WOEID (1 = Worldwide)
        self.trends_url = "https://api.twitter.com/2/trends/by/woeid/1"

    async def fetch_global_trends(self) -> List[Dict[str, Any]]:
        """Retrieves the top 20 trending topics globally."""
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        
        print("[X Analytics] Fetching global macro trends...")
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.trends_url, headers=headers, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    # Parse and return the top 20 trends with their tweet volume
                    trends = data.get("data", [])[:20]
                    return [{"trend": t.get("name"), "volume": t.get("tweet_volume")} for t in trends]
                return []
            except Exception as e:
                print(f"[X API Error] Trend analysis failed: {str(e)}")
                return []
