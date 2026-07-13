from app.crm.guardrails import can_release_ppv_payload, enforce_chat_guardrails


def test_guardrails_caps_words_and_adds_cta():
    draft = " ".join(["word"] * 130)
    result = enforce_chat_guardrails(draft, max_words=80)
    assert len(result.text.split()) <= 87
    assert result.text.endswith("?")
    assert "trimmed_to_word_cap" in result.reasons


def test_guardrails_routes_sensitive_inquiry():
    result = enforce_chat_guardrails("Can I get a refund and chargeback details?")
    assert result.route_to_human is True
    assert "sensitive_or_complex_inquiry" in result.reasons


def test_ppv_release_requires_purchase_timestamp():
    assert can_release_ppv_payload(None) is False
    assert can_release_ppv_payload("2026-07-09T00:00:00Z") is True

