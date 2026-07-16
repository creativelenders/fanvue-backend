import time
import threading
import logging
from typing import Callable, Optional

logger = logging.getLogger(__name__)

class VaultWatcher:
    """
    Infinite Context OS: Vault Watcher
    Event-driven monitor to trigger the Ornith-1.0 orchestrator when changes
    in lead data or content metrics are detected.
    """
    
    def __init__(self, watch_interval: int = 5):
        self.watch_interval = watch_interval
        self._is_running = False
        self._watcher_thread: Optional[threading.Thread] = None
        self._callbacks = []
        
        # Simulated state hash for demonstration of "vault changes"
        self._last_state_hash = None

    def register_callback(self, callback: Callable[[str], None]):
        """Registers a callback to be triggered when the vault changes."""
        self._callbacks.append(callback)

    def _poll_vault(self):
        """Simulates polling a data vault for CRM/metrics changes."""
        while self._is_running:
            try:
                # In a real scenario, this would query a database or filesystem.
                # For this implementation, we stub the event detection.
                current_state_hash = self._get_current_vault_state()
                
                if self._last_state_hash is not None and current_state_hash != self._last_state_hash:
                    logger.info("VaultWatcher: Change detected in lead/metrics data!")
                    self._trigger_callbacks("Vault content changed")
                
                self._last_state_hash = current_state_hash
            except Exception as e:
                logger.error(f"VaultWatcher error: {e}")
            
            time.sleep(self.watch_interval)

    def _get_current_vault_state(self) -> str:
        """Mock method representing the current CRM/Metrics state."""
        # For a live integration, query the actual DB. Here we return a static hash 
        # unless an external source updates it.
        return "static_hash_v1"

    def _trigger_callbacks(self, event_data: str):
        # Pass context back into the Ornith-1.0 reasoning stack
        try:
            from app.orchestration.memory_manager import MemoryManager
            from app.orchestration.task_decomposer import TaskDecomposer
            
            memory = MemoryManager()
            memory.update_global_context("last_vault_event", event_data)
            
            # Simulated trigger of Ornith-1.0 node
            decomposer = TaskDecomposer()
            logger.info(f"VaultWatcher passed context '{event_data}' to Ornith-1.0 reasoning stack.")
        except ImportError:
            logger.warning("Could not load Infinite Context OS dependencies to pass context.")
            
        for cb in self._callbacks:
            try:
                cb(event_data)
            except Exception as e:
                logger.error(f"Callback error in VaultWatcher: {e}")

    def start(self):
        """Starts the vault watching process."""
        if self._is_running:
            return
        self._is_running = True
        self._watcher_thread = threading.Thread(target=self._poll_vault, daemon=True)
        self._watcher_thread.start()
        logger.info("VaultWatcher started.")

    def stop(self):
        """Stops the vault watching process."""
        self._is_running = False
        if self._watcher_thread:
            self._watcher_thread.join(timeout=2)
        logger.info("VaultWatcher stopped.")
