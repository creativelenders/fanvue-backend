from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.crm.models import Base

# Import platform models so they register with the shared SQLAlchemy Base.
from app.platform import models as _platform_models  # noqa: F401


@lru_cache
def get_session_factory(database_url: str):
    engine = create_engine(database_url, future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(engine, expire_on_commit=False)

