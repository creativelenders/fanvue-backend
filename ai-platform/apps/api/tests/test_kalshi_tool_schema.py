from app.agent.tools.kalshi_schema import KALSHI_WAGER_TOOL


def test_kalshi_wager_tool_schema_shape():
    assert KALSHI_WAGER_TOOL["type"] == "function"
    fn = KALSHI_WAGER_TOOL["function"]
    assert fn["name"] == "place_kalshi_wager"

    params = fn["parameters"]
    assert params["type"] == "object"
    assert params["properties"]["side"]["enum"] == ["bid", "ask"]
    assert params["properties"]["contract_count"]["type"] == "integer"
    assert params["properties"]["price_cents"]["type"] == "number"
    assert set(params["required"]) == {"ticker", "side", "contract_count", "price_cents"}
