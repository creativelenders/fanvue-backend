from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.agent.llm import LLMClient, NullLLMClient, parse_json_object


@dataclass
class AtomicTask:
    id: str
    objective: str
    acceptance: str
    depends_on: list[str]
    suggested_skill: str | None = None


class TaskDecomposer:
    def __init__(self, llm: LLMClient | None = None):
        self.llm = llm or NullLLMClient()

    async def decompose(self, prompt: str) -> list[AtomicTask]:
        raw = await self.llm.complete(
            "Break the prompt into a strict JSON object with key tasks. "
            "tasks must be a sequential array of {id, objective, acceptance, depends_on, suggested_skill}.\n"
            f"PROMPT:\n{prompt}",
            response_format="json",
        )
        data = parse_json_object(raw, {"tasks": []})
        tasks: list[AtomicTask] = []
        for index, item in enumerate(data.get("tasks", []), start=1):
            if not isinstance(item, dict):
                continue
            tasks.append(
                AtomicTask(
                    id=str(item.get("id") or f"task_{index}"),
                    objective=str(item.get("objective") or ""),
                    acceptance=str(item.get("acceptance") or ""),
                    depends_on=list(item.get("depends_on") or []),
                    suggested_skill=item.get("suggested_skill"),
                )
            )
        if tasks:
            return tasks
        return [AtomicTask(id="task_1", objective=prompt, acceptance="User objective satisfied", depends_on=[])]

