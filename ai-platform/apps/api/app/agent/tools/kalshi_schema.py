KALSHI_WAGER_TOOL = {
    "type": "function",
    "function": {
        "name": "place_kalshi_wager",
        "description": "Places a financial wager on a real-world event via the Kalshi prediction market when a FanVue user requests to make a bet.",
        "parameters": {
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "The specific Kalshi market ticker symbol (e.g., HIGHNY-24JAN01-T60)."
                },
                "side": {
                    "type": "string",
                    "enum": ["bid", "ask"],
                    "description": "Whether the user is buying (bid) or selling (ask) the outcome."
                },
                "contract_count": {
                    "type": "integer",
                    "description": "The total number of event contracts the user wishes to purchase."
                },
                "price_cents": {
                    "type": "number",
                    "description": "The limit price in cents (e.g., 0.56) the user is willing to pay per contract."
                }
            },
            "required": ["ticker", "side", "contract_count", "price_cents"]
        }
    }
}
