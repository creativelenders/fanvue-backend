import asyncio

from app.crypto.tokenization import ContentFractionalizer


def test_fractionalize_asset_returns_mock_contract_payload(capsys):
    result = asyncio.run(
        ContentFractionalizer.fractionalize_asset(
            asset_id="asset_123456789",
            creator_id="creator_1",
            total_shares=2000,
        )
    )

    captured = capsys.readouterr().out
    assert "[RWA Tokenization] Fractionalizing asset asset_123456789 into 2000 shares" in captured
    assert result == {
        "status": "success",
        "asset_id": "asset_123456789",
        "contract_address": "0x_frac_asset_12",
        "shares_minted": 2000,
        "implied_valuation": 1000.0,
    }


def test_fractionalize_asset_uses_default_share_count():
    result = asyncio.run(
        ContentFractionalizer.fractionalize_asset(
            asset_id="asset_abcdef",
            creator_id="creator_1",
        )
    )

    assert result["shares_minted"] == 1000
    assert result["implied_valuation"] == 500.0
