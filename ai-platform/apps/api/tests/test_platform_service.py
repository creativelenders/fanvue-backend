import pytest

sqlalchemy = pytest.importorskip("sqlalchemy")
pytest.importorskip("sqlalchemy.orm")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.crm.models import Base
from app.platform.models import Workspace
from app.platform.schemas import CampaignCreate, MediaJobCreate
from app.platform.service import PlatformService
from app.security import AuthContext


def make_service():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session = sessionmaker(engine, expire_on_commit=False)()
    session.add(Workspace(id="ws_test", name="Test Workspace"))
    session.commit()
    return PlatformService(session), AuthContext(workspace_id="ws_test", user_id="user_test", role="owner")


def test_campaign_and_dashboard_flow():
    service, auth = make_service()
    assert service.dashboard(auth)["campaigns"] == 0
    campaign = service.create_campaign(auth, CampaignCreate(name="VIP Push", channels=["fanvue"]))
    assert campaign.id.startswith("camp_")
    assert service.dashboard(auth)["campaigns"] == 1
    assert service.list_campaigns(auth)[0].name == "VIP Push"


def test_media_job_flow():
    service, auth = make_service()
    job = service.create_media_job(auth, MediaJobCreate(prompt="teaser", seed=42, lora_name="creator_lora"))
    assert job.id.startswith("media_")
    assert job.status == "queued"
    assert service.dashboard(auth)["media_jobs"] == 1
