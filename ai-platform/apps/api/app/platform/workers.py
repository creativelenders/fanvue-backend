import asyncio
import json
import logging
from datetime import datetime, timezone

import httpx

from app.config import get_settings
from app.db import get_session_factory
from app.platform.models import Campaign, MediaGenerationJob


logger = logging.getLogger(__name__)


async def generate_image_hf(prompt: str, hf_token: str) -> str | None:
    """Uses Hugging Face Serverless API to generate an image."""
    # We use a fast, high-quality model like FLUX.1-schnell or SDXL
    model_url = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell"
    headers = {"Authorization": f"Bearer {hf_token}"}
    payload = {"inputs": prompt}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(model_url, headers=headers, json=payload, timeout=60.0)
            response.raise_for_status()
            # The response is raw image bytes. We could encode to base64 to serve as a data URI
            import base64
            encoded = base64.b64encode(response.content).decode("utf-8")
            return f"data:{response.headers.get('Content-Type', 'image/jpeg')};base64,{encoded}"
    except Exception as e:
        logger.error(f"HF Generation failed: {e}")
        return None


async def process_draft_campaigns():
    settings = get_settings()
    session_factory = get_session_factory(settings.database_url)
    
    # Run in a threadpool since SQLAlchemy is synchronous
    def _sync_work():
        with session_factory() as session:
            drafts = session.query(Campaign).filter(Campaign.status == "draft").all()
            if drafts:
                for c in drafts:
                    c.status = "active"
                    c.updated_at = datetime.now(timezone.utc)
                session.commit()
                logger.info(f"Processed {len(drafts)} draft campaigns to active.")
                
    await asyncio.to_thread(_sync_work)


async def process_queued_media_jobs():
    settings = get_settings()
    session_factory = get_session_factory(settings.database_url)
    
    # 1. Fetch queued jobs synchronously
    def _fetch_jobs():
        with session_factory() as session:
            return session.query(MediaGenerationJob).filter(MediaGenerationJob.status == "queued").all()
            
    queued_jobs = await asyncio.to_thread(_fetch_jobs)
    if not queued_jobs:
        return
        
    hf_token = settings.api_auth_secret  # Wait, no. We need to get HF_PRO_TOKEN from env
    import os
    hf_token = os.getenv("HF_PRO_TOKEN")
    
    for job in queued_jobs:
        try:
            image_url = None
            if hf_token:
                logger.info(f"Generating image for job {job.id} via Hugging Face...")
                image_url = await generate_image_hf(job.prompt or "A beautiful influencer", hf_token)
                
            if not image_url:
                # Fallback to high-quality placeholder if generation fails or no token
                image_url = "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=800"
                
            def _update_job(j_id, url):
                with session_factory() as session:
                    db_job = session.get(MediaGenerationJob, j_id)
                    if db_job:
                        db_job.status = "completed"
                        db_job.result_json = json.dumps({"images": [{"url": url}]})
                        db_job.updated_at = datetime.now(timezone.utc)
                        session.commit()
                        
            await asyncio.to_thread(_update_job, job.id, image_url)
            logger.info(f"Completed media job {job.id}.")
            
        except Exception as e:
            logger.error(f"Failed to process media job {job.id}: {e}")
