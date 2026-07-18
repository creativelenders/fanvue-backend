from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.agent.open_model_loop import OpenModelLoopEngine
from app.api.platform import router as platform_router
from app.api.webhooks import router as fanvue_webhooks
from app.config import get_settings
from app.orchestration.scheduler import AsyncScheduler
from app.skills.registry import SparkSkillRegistry


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Fanvue Promotion OS Backend", version="0.1.0", debug=True)
    allowed_origins = [origin.strip().strip('"').strip("'") for origin in settings.allowed_origins.split(",") if origin.strip()]
    if allowed_origins:
        app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_methods=["GET", "POST"], allow_headers=["content-type", "x-fanvue-signature", "x-fanvue-event-id"], allow_credentials=False)
    app.include_router(fanvue_webhooks)
    app.include_router(platform_router)

    registry = SparkSkillRegistry("./skills")
    scheduler = AsyncScheduler()
    loop_engine = OpenModelLoopEngine(workspace=".")

    from contextlib import asynccontextmanager
    import asyncio
    from app.platform.workers import process_draft_campaigns, process_queued_media_jobs

    @asynccontextmanager
    async def lifespan(app_inst: FastAPI):
        # Register workers
        scheduler.every("process_campaigns", 5, process_draft_campaigns)
        scheduler.every("process_media", 5, process_queued_media_jobs)
        
        # Start scheduler loop in background
        scheduler_task = asyncio.create_task(scheduler.serve_forever(poll_seconds=5))
        
        yield
        
        # Shutdown
        scheduler.stop()
        try:
            await asyncio.wait_for(scheduler_task, timeout=5.0)
        except asyncio.TimeoutError:
            pass

    app.router.lifespan_context = lifespan

    app.state.settings = settings
    app.state.skill_registry = registry
    app.state.scheduler = scheduler
    app.state.loop_engine = loop_engine

    @app.get("/health")
    async def health():
        return {"ok": True, "env": settings.app_env}

    @app.get("/skills")
    async def list_skills():
        return {"skills": sorted(registry.load().keys())}

    @app.post("/skills/inject")
    async def inject_skill(payload: dict):
        prompt = str(payload.get("prompt", ""))
        return {"prompt": registry.inject(prompt)}

    return app


app = create_app()
