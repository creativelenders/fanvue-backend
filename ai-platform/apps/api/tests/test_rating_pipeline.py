import asyncio
import math

from app.media import rating_pipeline
from app.media.rating_pipeline import ContentRatingRepository, EloCalculationEngine, HermesCoachingPipeline, PriceElasticityEngine


def test_elo_expected_score_equal_ratings():
    assert EloCalculationEngine.calculate_expected_score(1200, 1200) == 0.5


def test_elo_update_win_loss_pair():
    winner, loser = EloCalculationEngine.update_ratings(1200, 1200, 1.0)
    assert winner == 1216.0
    assert loser == 1184.0


def test_ucb_first_impression_is_infinite():
    assert math.isinf(EloCalculationEngine.calculate_ucb_score(0.25, 100, 0))


def test_ucb_score_is_above_empirical_mean():
    score = EloCalculationEngine.calculate_ucb_score(0.4, 1000, 10)
    assert score > 0.4


class FakeScalarResult:
    def __init__(self, row):
        self.row = row

    def one(self):
        return self.row


class FakeMappingResult:
    def __init__(self, row):
        self.row = row

    def mappings(self):
        return FakeScalarResult(self.row)


class FakeSession:
    def __init__(self):
        self.committed = False
        self.update_params = None
        self.insert_params = None
        self.row = {
            "asset_id": "asset-1",
            "elo_rating": 1200.0,
            "wins": 0,
            "losses": 0,
            "impressions": 99,
            "positive_swipes": 50,
            "negative_swipes": 49,
            "total_dwell_time_ms": 1000,
            "exploration_budget": 100,
            "state": "exploring",
        }

    def execute(self, statement, params=None):
        statement_text = str(statement)
        if "SELECT asset_id" in statement_text:
            return FakeMappingResult(self.row)
        if "UPDATE platform_content_ranking" in statement_text:
            self.update_params = params
        if "INSERT INTO community_rating_events" in statement_text:
            self.insert_params = params
        return FakeMappingResult(self.row)

    def commit(self):
        self.committed = True


def test_record_rating_event_transitions_to_exploiting_at_budget():
    session = FakeSession()
    result = ContentRatingRepository.record_rating_event(
        session,
        evaluator_subscriber_id="00000000-0000-0000-0000-000000000001",
        target_asset_id="asset-1",
        action_type="swipe_right",
        dwell_time_ms=1200,
        is_positive_signal=True,
        total_platform_impressions=5000,
    )
    assert result.state == "exploiting"
    assert result.impressions == 100
    assert session.update_params["state"] == "exploiting"
    assert session.insert_params["post_event_elo"] == result.post_event_elo
    assert session.committed is True


def test_hermes_coaching_pipeline_routes_high_reasoning(monkeypatch):
    calls = {}

    async def fake_generate_response(**kwargs):
        calls.update(kwargs)
        return "- Improve lighting\n- Keep vertical pacing\n- Promote as PPV"

    monkeypatch.setattr(rating_pipeline.llm_gateway, "generate_response", fake_generate_response)
    result = asyncio.run(
        HermesCoachingPipeline.generate_coaching_brief(
            "Creator A",
            {
                "asset_id": "asset-1",
                "state": "exploiting",
                "impressions": 120,
                "exploration_budget": 100,
                "elo_rating": 1450,
                "wins": 75,
                "losses": 25,
                "positive_swipes": 75,
                "avg_dwell_time_ms": 3100,
                "workflow_preset": "portrait",
                "aspect_ratio": "9:16",
            },
            [{"asset_id": "asset-0", "elo_rating": 1300}],
        )
    )
    assert result.startswith("- Improve")
    assert calls["model_combo"] == "hermes-brain"
    assert calls["extra_headers"]["X-OmniRoute-Priority"] == "high-reasoning"
    assert "Hermes 3 Content Strategy Brain" in calls["system_prompt"]


def test_price_elasticity_sample_beta_is_bounded(monkeypatch):
    monkeypatch.setattr("random.betavariate", lambda alpha, beta: 0.42)
    assert PriceElasticityEngine.sample_beta(3, 10) == 0.42


class FakePricingResponse:
    status_code = 200

    def json(self):
        return {
            "arms": [
                {"price_point": 14.99, "conversions": 2, "impressions": 10},
                {"price_point": 29.99, "conversions": 3, "impressions": 10},
            ]
        }


class EmptyPricingResponse:
    status_code = 200

    def json(self):
        return {"arms": []}


class FakePricingClient:
    response_cls = FakePricingResponse
    posted_payload = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url):
        self.last_url = url
        return self.response_cls()

    async def post(self, url, json):
        FakePricingClient.posted_payload = {"url": url, "json": json}
        return FakePricingResponse()


def test_select_optimal_price_uses_sampled_revenue(monkeypatch):
    samples = iter([0.9, 0.5])
    monkeypatch.setattr(rating_pipeline.httpx, "AsyncClient", FakePricingClient)
    monkeypatch.setattr(PriceElasticityEngine, "sample_beta", staticmethod(lambda conversions, impressions: next(samples)))
    price = asyncio.run(PriceElasticityEngine.select_optimal_price("VIP"))
    assert price == 29.99


def test_select_optimal_price_fallback(monkeypatch):
    class EmptyPricingClient(FakePricingClient):
        response_cls = EmptyPricingResponse

    monkeypatch.setattr(rating_pipeline.httpx, "AsyncClient", EmptyPricingClient)
    price = asyncio.run(PriceElasticityEngine.select_optimal_price("VIP"))
    assert price == 19.99


def test_log_price_outcome_posts_payload(monkeypatch):
    monkeypatch.setattr(rating_pipeline.httpx, "AsyncClient", FakePricingClient)
    asyncio.run(PriceElasticityEngine.log_price_outcome("VIP", 24.99, True))
    assert FakePricingClient.posted_payload == {
        "url": "http://localhost:8000/api/pricing/bandits/update",
        "json": {"tier": "VIP", "price": 24.99, "converted": True},
    }
