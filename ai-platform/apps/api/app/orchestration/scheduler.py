from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable


ScheduledJob = Callable[[], Awaitable[None]]


@dataclass
class JobSpec:
    name: str
    every_seconds: int
    handler: ScheduledJob
    next_run: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class AsyncScheduler:
    """Small asyncio cron for health audits, churn scans, and content scheduling."""

    def __init__(self):
        self.jobs: list[JobSpec] = []
        self._running = False

    def every(self, name: str, seconds: int, handler: ScheduledJob) -> None:
        self.jobs.append(JobSpec(name=name, every_seconds=seconds, handler=handler))

    async def run_pending_once(self) -> list[str]:
        now = datetime.now(timezone.utc)
        ran: list[str] = []
        for job in self.jobs:
            if job.next_run <= now:
                await job.handler()
                job.next_run = now + timedelta(seconds=job.every_seconds)
                ran.append(job.name)
        return ran

    async def serve_forever(self, poll_seconds: int = 30) -> None:
        self._running = True
        while self._running:
            await self.run_pending_once()
            await asyncio.sleep(poll_seconds)

    def stop(self) -> None:
        self._running = False

