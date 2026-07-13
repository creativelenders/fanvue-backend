from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

import httpx

try:
    from sqlalchemy import text
except ImportError:  # pragma: no cover - production dependency declared in pyproject
    def text(statement: str) -> str:
        return statement

from app.agent.llm import llm_gateway


class EloCalculationEngine:
    @staticmethod
    def calculate_expected_score(rating_a: float, rating_b: float) -> float:
        """Standard chess Elo expected win probability formula."""
        return 1.0 / (1.0 + math.pow(10.0, (rating_b - rating_a) / 400.0))

    @classmethod
    def update_ratings(cls, rating_a: float, rating_b: float, score_a: float, k_factor: float = 32.0) -> Tuple[float, float]:
        """
        Updates Elo ratings after a peer comparison event.
        score_a: 1.0 for win (swipe right), 0.0 for loss (swipe left), 0.5 for draw.
        """
        expected_a = cls.calculate_expected_score(rating_a, rating_b)
        expected_b = cls.calculate_expected_score(rating_b, rating_a)

        new_rating_a = rating_a + k_factor * (score_a - expected_a)
        new_rating_b = rating_b + k_factor * ((1.0 - score_a) - expected_b)

        return round(new_rating_a, 2), round(new_rating_b, 2)

    @staticmethod
    def calculate_ucb_score(empirical_mean: float, total_platform_impressions: int, item_impressions: int) -> float:
        """Upper Confidence Bound (UCB1) math for MAB exploration balancing."""
        if item_impressions == 0:
            return float("inf")
        safe_total = max(total_platform_impressions, 2)
        exploration_term = math.sqrt((2.0 * math.log(safe_total)) / item_impressions)
        return empirical_mean + exploration_term


@dataclass
class RatingEventResult:
    asset_id: str
    pre_event_elo: float
    post_event_elo: float
    state: str
    empirical_reward_mean: float
    upper_confidence_bound: float
    impressions: int


class ContentRatingRepository:
    """SQL-backed MAB/Elo updates for platform_content_ranking."""

    @staticmethod
    def record_rating_event(
        session,
        *,
        evaluator_subscriber_id: str,
        target_asset_id: str,
        action_type: str,
        dwell_time_ms: int,
        is_positive_signal: bool,
        total_platform_impressions: int,
        opponent_rating: float = 1200.0,
        k_factor: float = 32.0,
    ) -> RatingEventResult:
        row = session.execute(
            text(
                """
                SELECT asset_id, elo_rating, wins, losses, impressions, positive_swipes,
                       negative_swipes, total_dwell_time_ms, exploration_budget, state
                FROM platform_content_ranking
                WHERE asset_id = :asset_id
                FOR UPDATE
                """
            ),
            {"asset_id": target_asset_id},
        ).mappings().one()

        pre_elo = float(row["elo_rating"])
        score = 1.0 if is_positive_signal else 0.0
        post_elo, _ = EloCalculationEngine.update_ratings(pre_elo, opponent_rating, score, k_factor)

        impressions = int(row["impressions"]) + 1
        wins = int(row["wins"]) + (1 if is_positive_signal else 0)
        losses = int(row["losses"]) + (0 if is_positive_signal else 1)
        positive_swipes = int(row["positive_swipes"]) + (1 if is_positive_signal else 0)
        negative_swipes = int(row["negative_swipes"]) + (0 if is_positive_signal else 1)
        total_dwell_time_ms = int(row["total_dwell_time_ms"]) + int(dwell_time_ms)
        empirical_mean = round(positive_swipes / impressions, 4)
        ucb = EloCalculationEngine.calculate_ucb_score(empirical_mean, total_platform_impressions, impressions)
        exploration_budget = int(row["exploration_budget"])
        state = str(row["state"])
        if state == "exploring" and impressions >= exploration_budget:
            state = "exploiting"

        session.execute(
            text(
                """
                UPDATE platform_content_ranking
                SET elo_rating = :elo_rating,
                    total_matches = :total_matches,
                    wins = :wins,
                    losses = :losses,
                    impressions = :impressions,
                    positive_swipes = :positive_swipes,
                    negative_swipes = :negative_swipes,
                    total_dwell_time_ms = :total_dwell_time_ms,
                    empirical_reward_mean = :empirical_reward_mean,
                    upper_confidence_bound = :upper_confidence_bound,
                    state = :state
                WHERE asset_id = :asset_id
                """
            ),
            {
                "asset_id": target_asset_id,
                "elo_rating": post_elo,
                "total_matches": wins + losses,
                "wins": wins,
                "losses": losses,
                "impressions": impressions,
                "positive_swipes": positive_swipes,
                "negative_swipes": negative_swipes,
                "total_dwell_time_ms": total_dwell_time_ms,
                "empirical_reward_mean": empirical_mean,
                "upper_confidence_bound": ucb if math.isfinite(ucb) else 9999.0,
                "state": state,
            },
        )
        session.execute(
            text(
                """
                INSERT INTO community_rating_events (
                    evaluator_subscriber_id, target_asset_id, action_type, dwell_time_ms,
                    is_positive_signal, pre_event_elo, post_event_elo
                )
                VALUES (
                    :evaluator_subscriber_id, :target_asset_id, :action_type, :dwell_time_ms,
                    :is_positive_signal, :pre_event_elo, :post_event_elo
                )
                """
            ),
            {
                "evaluator_subscriber_id": evaluator_subscriber_id,
                "target_asset_id": target_asset_id,
                "action_type": action_type,
                "dwell_time_ms": dwell_time_ms,
                "is_positive_signal": is_positive_signal,
                "pre_event_elo": pre_elo,
                "post_event_elo": post_elo,
            },
        )
        session.commit()
        return RatingEventResult(
            asset_id=target_asset_id,
            pre_event_elo=pre_elo,
            post_event_elo=post_elo,
            state=state,
            empirical_reward_mean=empirical_mean,
            upper_confidence_bound=ucb,
            impressions=impressions,
        )


class PriceElasticityEngine:
    @staticmethod
    def sample_beta(conversions: int, impressions: int) -> float:
        """Samples from a Beta(alpha, beta) distribution for Thompson Sampling."""
        # alpha = successes + 1, beta = failures + 1
        alpha = conversions + 1
        beta_param = (impressions - conversions) + 1
        return random.betavariate(alpha, beta_param)

    @classmethod
    async def select_optimal_price(cls, subscriber_tier: str) -> float:
        """Selects the best price point to display based on expected revenue sampling."""
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(f"http://localhost:8000/api/pricing/bandits?tier={subscriber_tier}")
                arms = resp.json().get("arms", []) if resp.status_code == 200 else []
            except Exception:
                arms = []

        if not arms:
            return 19.99  # Safe default fallback

        best_price = 19.99
        max_sampled_revenue = -1.0

        for arm in arms:
            price = float(arm["price_point"])
            # Sample conversion probability from Beta distribution
            sampled_prob = cls.sample_beta(arm["conversions"], arm["impressions"])
            # Expected revenue = Sampled Probability * Price Point
            sampled_revenue = sampled_prob * price

            if sampled_revenue > max_sampled_revenue:
                max_sampled_revenue = sampled_revenue
                best_price = price

        return best_price

    @classmethod
    async def log_price_outcome(cls, subscriber_tier: str, price_point: float, did_convert: bool):
        """Updates the bandit arm after a subscriber purchases or ignores a PPV unlock."""
        payload = {
            "tier": subscriber_tier,
            "price": price_point,
            "converted": did_convert,
        }
        async with httpx.AsyncClient() as client:
            try:
                await client.post("http://localhost:8000/api/pricing/bandits/update", json=payload)
            except Exception as e:
                print(f"[Price Bandit Error] Failed to log outcome: {str(e)}")


class HermesCoachingPipeline:
    SYSTEM_PROMPT = """
<system_identity>
You are the Hermes 3 Content Strategy Brain for our creator platform. Your objective is to analyze real-world MAB algorithmic exploration metrics and community Elo ratings, translating complex data into actionable, encouraging, and highly technical creative advice for content creators.
</system_identity>

<analytical_guidelines>
1. Evaluate the difference between studio performance and community discovery feed results.
2. Translate dwell time and swipe ratios into visual critique (e.g., aspect ratios, lighting, wardrobe, pacing).
3. If an asset has cleared the MAB exploration budget and achieved an Elo > 1400, recommend wrapping it into an automated CRM Pay-Per-View (PPV) broadcast campaign.
4. Output must be direct, authoritative, and formatted in clean Markdown without conversational introductory padding.
</analytical_guidelines>
"""

    @classmethod
    async def generate_coaching_brief(cls, creator_name: str, asset_metrics: Dict[str, Any], recent_history: List[Dict[str, Any]]) -> str:
        prompt_payload = f"""
<creator_target>
Creator Name: {creator_name}
</creator_target>

<target_asset_metrics>
- Asset ID: {asset_metrics.get('asset_id')}
- Current Algorithmic State: {asset_metrics.get('state')} (Budget: {asset_metrics.get('impressions')}/{asset_metrics.get('exploration_budget')} impressions)
- Elo Rating: {asset_metrics.get('elo_rating')} (Wins: {asset_metrics.get('wins')} / Losses: {asset_metrics.get('losses')})
- Approval Rate: {asset_metrics.get('positive_swipes')} / {asset_metrics.get('impressions')}
- Average Dwell Time: {asset_metrics.get('avg_dwell_time_ms')} ms
- ComfyUI Preset Used: {asset_metrics.get('workflow_preset')}
- Aspect Ratio: {asset_metrics.get('aspect_ratio')}
</target_asset_metrics>

<historical_benchmark>
{json.dumps(recent_history, indent=2)}
</historical_benchmark>

Analyze these performance markers against the historical benchmarks. Provide 3 bulleted, high-impact optimization directives for the creator's next content generation session.
"""
        return await llm_gateway.generate_response(
            prompt=prompt_payload,
            system_prompt=cls.SYSTEM_PROMPT,
            model_combo="hermes-brain",
            temperature=0.4,
            extra_headers={"X-OmniRoute-Priority": "high-reasoning"},
        )
