from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Optional

from app.agent.llm import LLMClient, NullLLMClient, parse_json_object

# Infinite Context OS Modules
try:
    from app.orchestration.memory_manager import MemoryManager
    from app.orchestration.vault_watcher import VaultWatcher
except ImportError:
    # Fallback for testing environments
    MemoryManager = None
    VaultWatcher = None

logger = logging.getLogger(__name__)

@dataclass
class AtomicTask:
    id: str
    objective: str
    acceptance: str
    depends_on: list[str]
    suggested_skill: str | None = None
    action: str | None = None
    context_injected: bool = False

class TaskDecomposer:
    """
    Ornith-1.0 Orchestrator Node (DeepReinforce, June 2026 release)
    Replaces static decomposition with autonomous, self-scaffolding task execution.
    """
    def __init__(self, llm: LLMClient | None = None):
        # We assume the LLMClient is pointing to the OpenAI-compatible endpoint 
        # (vLLM or Ollama serving) hosting the Ornith-1.0 MIT-licensed open weights.
        self.llm = llm or NullLLMClient()
        self.memory_manager = MemoryManager() if MemoryManager else None
        
        # Load OS settings for Ornith configuration
        self.os_settings = self._load_os_settings()
        self.node_type = self.os_settings.get("orchestrator", {}).get("node_type", "Ornith-1.0")

    def _load_os_settings(self) -> dict:
        import os
        try:
            # Dynamically resolve from current file to workspace root to avoid hardcoded paths
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # Navigate up to the workspace root where settings.json is stored
            # app -> api -> apps -> ai-platform -> backend -> root
            root_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "..", "..", "..", ".."))
            settings_path = os.path.join(root_dir, "settings.json")
            
            # fallback for standard deployment structure if nested differently
            if not os.path.exists(settings_path):
                settings_path = os.path.join(os.getcwd(), "settings.json")
                
            with open(settings_path, "r") as f:
                return json.load(f)
        except Exception:
            return {"orchestrator": {"node_type": "Ornith-1.0"}}

    async def decompose(self, prompt: str, session_id: Optional[str] = None) -> list[AtomicTask]:
        logger.info(f"[{self.node_type}] Initiating autonomous task self-scaffolding...")
        
        # 1. Retrieve Long-Horizon State (Infinite Context)
        global_context = {}
        session_context = {}
        if self.memory_manager:
            global_context = self.memory_manager.get_global_context("platform_state") or {}
            if session_id:
                session_data = self.memory_manager.get_session(session_id)
                session_context = session_data.get("state", {}) if session_data else {}

        # 2. Dynamic Self-Scaffolding Generation
        system_prompt = (
            f"You are the {self.node_type} Orchestrator.\n"
            "Generate your own execution harness (scaffolding) for the following task.\n"
            "Incorporate Infinite Context loops. Output strict JSON with key 'tasks'.\n"
            "Each task must be a sequential array of {id, objective, acceptance, depends_on, suggested_skill}.\n"
            f"Global Context: {json.dumps(global_context)}\n"
            f"Session Context: {json.dumps(session_context)}\n"
        )
        
        raw = await self.llm.complete(
            f"{system_prompt}\n\nPROMPT:\n{prompt}",
            response_format="json",
        )
        
        data = parse_json_object(raw, {"tasks": []})
        tasks: list[AtomicTask] = []
        
        # 3. Parse and enhance tasks with memory state
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
                    action=str(item.get("action") or item.get("suggested_skill") or ""),
                    context_injected=bool(self.memory_manager)
                )
            )
            
        if not tasks:
            logger.warning(f"[{self.node_type}] Self-scaffolding yielded no tasks. Falling back to retry loop.")
            return [AtomicTask(
                id="task_1", 
                objective=prompt, 
                acceptance="User objective satisfied via dynamic scaffolding", 
                depends_on=[],
                action="manual_review",
                context_injected=bool(self.memory_manager)
            )]
            
        # 4. Update Memory with newly generated scaffolding
        if self.memory_manager and session_id:
            self.memory_manager.update_session(session_id, {"last_scaffold": [t.__dict__ for t in tasks]})
            
        return tasks
