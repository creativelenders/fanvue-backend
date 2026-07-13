import asyncio
import hashlib

from app.crypto import zk_coprocessor
from app.crypto.zk_coprocessor import ZKInferenceCoprocessor


def test_generate_inference_proof_returns_deterministic_payload(monkeypatch, capsys):
    monkeypatch.setattr(zk_coprocessor.time, "sleep", lambda _seconds: None)

    prompt_hash = "0x_prompt_hash"
    model_output = '{"protocol":"Aave","amount":2500}'
    weights_commitment = "0x_hermes3_v1_hash"

    result = asyncio.run(
        ZKInferenceCoprocessor.generate_inference_proof(
            prompt_hash=prompt_hash,
            model_output=model_output,
            weights_commitment=weights_commitment,
        )
    )

    expected_proof = hashlib.sha256(f"{prompt_hash}:{model_output}:{weights_commitment}".encode()).hexdigest()
    expected_output_hash = hashlib.sha256(model_output.encode()).hexdigest()

    captured = capsys.readouterr().out
    assert "[ZK Coprocessor] Generating cryptographic proof of AI inference" in captured
    assert result == {
        "proof_type": "groth16",
        "model_commitment": weights_commitment,
        "public_inputs": [prompt_hash, expected_output_hash],
        "zk_proof_data": f"0x{expected_proof}",
    }


def test_submit_proof_onchain_returns_mock_tx_hash(capsys):
    proof = {"zk_proof_data": "0xabcdef1234567890"}
    tx_hash = asyncio.run(
        ZKInferenceCoprocessor.submit_proof_onchain(
            zk_proof_payload=proof,
            target_contract="0x_kalshi_treasury_vault",
        )
    )

    captured = capsys.readouterr().out
    assert "[ZK Gateway] Submitting proof to 0x_kalshi_treasury_vault" in captured
    assert "[ZK Gateway] Transaction confirmed: 0x_tx_0xabcdef1234" in captured
    assert tx_hash == "0x_tx_0xabcdef1234"
