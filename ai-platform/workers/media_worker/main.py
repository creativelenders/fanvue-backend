from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from app.config import get_settings
from app.db import get_session_factory
from app.media.comfyui_client import ComfyUIClient
from app.media.pipeline import ContentVariantPipeline, IdentityAnchor, MediaRequest
from app.platform.models import MediaGenerationJob


async def process_once(limit: int = 5) -> int:
    settings = get_settings()
    session_factory = get_session_factory(settings.database_url)
    session = session_factory()
    processed = 0
    try:
        jobs = (
            session.query(MediaGenerationJob)
            .filter(MediaGenerationJob.status == "queued")
            .order_by(MediaGenerationJob.created_at.asc())
            .limit(limit)
            .all()
        )
        pipeline = ContentVariantPipeline(ComfyUIClient(settings.comfyui_base_url))
        for job in jobs:
            job.status = "running"
            session.commit()
            try:
                result = await pipeline.generate_dual_variant(
                    MediaRequest(
                        prompt=job.prompt,
                        seed=job.seed,
                        identity=IdentityAnchor(lora_name=job.lora_name, lora_strength=job.lora_strength),
                        ppv_price_usd=job.ppv_price_usd,
                    )
                )
                job.result_json = json.dumps(result)
                job.status = "complete"
            except Exception as exc:
                job.result_json = json.dumps({"error": str(exc)})
                job.status = "failed"
            job.updated_at = datetime.now(timezone.utc)
            session.commit()
            processed += 1
        return processed
    finally:
        session.close()


async def main() -> None:
    while True:
        count = await process_once()
        print({"worker": "media", "processed": count})
        await asyncio.sleep(20)


if __name__ == "__main__":
    asyncio.run(main())

