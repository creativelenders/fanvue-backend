import json
import os
from typing import Dict, Any, Optional
from datetime import datetime

class MemoryManager:
    """
    Infinite Context OS: Memory Manager
    Provides persistent, long-horizon state tracking for multi-session tasks.
    """
    
    def __init__(self, storage_path: str = None):
        if storage_path is None:
            # Resolve to workspace root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            root_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "..", "..", "..", ".."))
            self.storage_path = os.path.join(root_dir, ".infinite_context_os", "memory.json")
        else:
            self.storage_path = storage_path
            
        self._ensure_storage()

    def _ensure_storage(self):
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        if not os.path.exists(self.storage_path):
            with open(self.storage_path, 'w') as f:
                json.dump({"sessions": {}, "global_context": {}}, f)

    def _load_memory(self) -> Dict[str, Any]:
        try:
            with open(self.storage_path, 'r') as f:
                return json.load(f)
        except Exception:
            return {"sessions": {}, "global_context": {}}

    def _save_memory(self, memory: Dict[str, Any]):
        with open(self.storage_path, 'w') as f:
            json.dump(memory, f, indent=4)

    def update_session(self, session_id: str, data: Dict[str, Any]):
        """Updates memory for a specific tracking session."""
        memory = self._load_memory()
        if session_id not in memory["sessions"]:
            memory["sessions"][session_id] = {"created_at": datetime.now().isoformat(), "state": {}}
        
        memory["sessions"][session_id]["state"].update(data)
        memory["sessions"][session_id]["last_updated"] = datetime.now().isoformat()
        self._save_memory(memory)

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves long-term memory for a given session."""
        memory = self._load_memory()
        return memory["sessions"].get(session_id)

    def update_global_context(self, key: str, value: Any):
        """Updates the global agent context (Infinite Context layer)."""
        memory = self._load_memory()
        memory["global_context"][key] = value
        self._save_memory(memory)

    def get_global_context(self, key: str) -> Optional[Any]:
        """Retrieves global context."""
        memory = self._load_memory()
        return memory["global_context"].get(key)
