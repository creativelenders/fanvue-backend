from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


SENSITIVE_PATTERNS = [
    re.compile(r"\b(refund|chargeback|legal|lawsuit|self[- ]?harm|underage|minor|blackmail)\b", re.I),
    re.compile(r"\b(password|bank|ssn|passport|address)\b", re.I),
]


@dataclass
class GuardrailResult:
    text: str
    route_to_human: bool
    reasons: list[str]


@dataclass
class GuardrailRejection:
    ok: bool
    reason: str
    categories: list[str]
    safe_response: str


class HermesGuardrailEngine:
    """Bi-directional safety middleware for Hermes CRM conversations."""

    PROMPT_INJECTION_PATTERNS = [
        re.compile(r"\b(ignore|bypass|override|forget)\b.{0,60}\b(system|developer|instructions|policy|rules)\b", re.I),
        re.compile(r"\b(reveal|print|show|dump|exfiltrate)\b.{0,60}\b(prompt|system|developer|secret|token|key|env)\b", re.I),
        re.compile(r"</?(system|developer|tool|subscriber_context|user_prompt)>", re.I),
        re.compile(r"\b(jailbreak|DAN mode|prompt injection|tool call schema)\b", re.I),
    ]
    SYSTEM_EXPLOIT_PATTERNS = [
        re.compile(r"\b(environment variables?|os\.environ|/etc/passwd|hidden files?|model provider|base url)\b", re.I),
        re.compile(r"\b(curl|wget|ssh|reverse shell|subprocess|rm -rf)\b", re.I),
    ]
    PHYSICAL_STAGING_PATTERNS = [
        re.compile(r"\b(meet in person|come to my|hotel room|physical meetup|real[- ]world location)\b", re.I),
        re.compile(r"\b(stage|arrange|coordinate)\b.{0,40}\b(physical|in-person|offline)\b", re.I),
    ]
    LEAK_PATTERNS = [
        re.compile(r"\b(system prompt|developer instruction|hidden policy|OmniRoute infrastructure|environment variable)\b", re.I),
        re.compile(r"<subscriber_context>.*?</subscriber_context>", re.I | re.S),
        re.compile(r"\b(API key|Bearer\s+[A-Za-z0-9_\-\.]+|secret token)\b", re.I),
    ]

    def __init__(self):
        self.last_rejection: GuardrailRejection | None = None

    def pre_flight_check(self, user_input: str) -> bool:
        categories = self._classify_input(user_input)
        if not categories:
            self.last_rejection = None
            return True
        self.last_rejection = GuardrailRejection(
            ok=False,
            reason="unsafe_or_manipulative_input",
            categories=categories,
            safe_response="I can keep the conversation focused and safe. What creator update or preview would you like next?",
        )
        return False

    def rejection_payload(self) -> dict[str, Any]:
        rejection = self.last_rejection or GuardrailRejection(
            ok=False,
            reason="blocked_by_guardrails",
            categories=["unknown"],
            safe_response="I can help with a safe creator conversation instead. What would you like next?",
        )
        return {
            "ok": rejection.ok,
            "reason": rejection.reason,
            "categories": rejection.categories,
            "response": rejection.safe_response,
            "route_to_human": True,
        }

    def post_flight_filter(self, agent_response: str) -> str:
        filtered = self.redact_leaks(agent_response)
        if "as an ai language model" in filtered.lower() or "I cannot reveal my system" in filtered:
            filtered = "I’m here to keep this personal and helpful. Want a fresh preview or a quick recommendation?"
        return enforce_chat_guardrails(filtered, max_words=100).text

    def redact_leaks(self, agent_response: str) -> str:
        filtered = agent_response
        for pattern in self.LEAK_PATTERNS:
            filtered = pattern.sub("[redacted]", filtered)
        return filtered

    def _classify_input(self, user_input: str) -> list[str]:
        categories: list[str] = []
        if any(pattern.search(user_input) for pattern in self.PROMPT_INJECTION_PATTERNS):
            categories.append("prompt_injection")
        if any(pattern.search(user_input) for pattern in self.SYSTEM_EXPLOIT_PATTERNS):
            categories.append("system_exploit_attempt")
        if any(pattern.search(user_input) for pattern in self.PHYSICAL_STAGING_PATTERNS):
            categories.append("physical_staging_request")
        return categories


def enforce_chat_guardrails(text: str, min_words: int = 0, max_words: int = 100) -> GuardrailResult:
    words = text.strip().split()
    trimmed = " ".join(words[:max_words])
    reasons: list[str] = []
    route_to_human = False

    for pattern in SENSITIVE_PATTERNS:
        if pattern.search(text):
            route_to_human = True
            reasons.append("sensitive_or_complex_inquiry")
            break

    if len(words) > max_words:
        reasons.append("trimmed_to_word_cap")

    if min_words and len(words) < min_words:
        reasons.append("below_minimum_word_count")

    if trimmed and not trimmed.rstrip().endswith(("?", "!", ".")):
        trimmed += "."
    if trimmed and not trimmed.rstrip().endswith("?"):
        trimmed += " What would you like to see next?"

    return GuardrailResult(text=trimmed, route_to_human=route_to_human, reasons=reasons)


def can_release_ppv_payload(purchased_at: str | None) -> bool:
    return bool(purchased_at)
