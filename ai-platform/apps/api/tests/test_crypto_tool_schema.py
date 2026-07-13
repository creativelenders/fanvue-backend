from app.agent.tools.crypto_schema import CRYPTO_TRANSFER_TOOL


def test_crypto_transfer_tool_schema_shape():
    assert CRYPTO_TRANSFER_TOOL["type"] == "function"
    fn = CRYPTO_TRANSFER_TOOL["function"]
    assert fn["name"] == "execute_session_key_transfer"
    params = fn["parameters"]
    assert params["type"] == "object"
    assert params["properties"]["token_symbol"]["enum"] == ["USDC", "SOL", "ETH", "POL"]
    assert params["properties"]["token_symbol"]["default"] == "USDC"
    assert set(params["required"]) == {"subscriber_id", "creator_wallet_address", "amount_tokens", "token_symbol"}
