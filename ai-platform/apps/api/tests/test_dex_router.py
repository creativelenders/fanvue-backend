import asyncio

from app.crypto.dex_router import CrossChainRouter


def test_build_tip_transaction_returns_mock_route(capsys):
    result = asyncio.run(
        CrossChainRouter.build_tip_transaction(
            subscriber_chain="Base",
            source_token="USDC",
            creator_chain="Polygon",
            target_token="USDC",
            amount=25.5,
        )
    )

    captured = capsys.readouterr().out
    assert "[Cross-Chain] Routing 25.5 USDC (Base) -> USDC (Polygon)" in captured
    assert result == {
        "status": "route_found",
        "estimated_gas": "0.45",
        "exchange_rate": "1.02",
        "calldata": "0x000000000000",
    }
