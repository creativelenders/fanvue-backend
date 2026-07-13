CRYPTO_TRANSFER_TOOL = {
    "type": "function",
    "function": {
        "name": "execute_session_key_transfer",
        "description": "Executes an on-chain cryptocurrency transfer from the subscriber's session wallet to the creator when initiated via natural language chat.",
        "parameters": {
            "type": "object",
            "properties": {
                "subscriber_id": {
                    "type": "string",
                    "description": "The UUID of the subscriber initiating the tip."
                },
                "creator_wallet_address": {
                    "type": "string",
                    "description": "The destination EVM or Solana wallet address of the creator."
                },
                "amount_tokens": {
                    "type": "number",
                    "description": "The numerical amount of cryptocurrency to transfer."
                },
                "token_symbol": {
                    "type": "string",
                    "enum": ["USDC", "SOL", "ETH", "POL"],
                    "default": "USDC",
                    "description": "The ticker symbol of the asset being transferred."
                },
                "associated_message": {
                    "type": "string",
                    "description": "The chat message or sentiment accompanying the financial transfer."
                }
            },
            "required": ["subscriber_id", "creator_wallet_address", "amount_tokens", "token_symbol"]
        }
    }
}
