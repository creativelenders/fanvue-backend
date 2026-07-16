import json
from typing import Dict, Any, Callable

class FanVueMCPServer:
    """Implements a lightweight Model Context Protocol (MCP) tool registry."""
    
    def __init__(self):
        self.tools: Dict[str, dict] = {}
        self.handlers: Dict[str, Callable] = {}

    def register_tool(self, schema: dict, handler: Callable):
        """Registers a tool schema and its execution function."""
        tool_name = schema["function"]["name"]
        self.tools[tool_name] = schema
        self.handlers[tool_name] = handler
        print(f"[MCP Server] Registered capability: {tool_name}")

    def get_available_tools(self) -> list:
        """Returns the list of schemas for the LLM context window."""
        return list(self.tools.values())

    async def execute_tool_call(self, tool_name: str, arguments_json: str) -> Dict[str, Any]:
        """Routes the LLM's requested tool call to the correct execution handler."""
        # Safe Tool Orchestration: Prevent direct execution of restricted financial/outreach tools
        restricted_tools = {
            "execute_treasury_deposit", 
            "execute_crypto_transfer", 
            "execute_kalshi_wager", 
            "send_outbound_b2b_email",
            "place_kalshi_order"
        }
        if tool_name in restricted_tools:
            return {
                "status": "pending_approval", 
                "message": f"Plan for '{tool_name}' safely orchestrated and awaits standard ledger/idempotency controls."
            }

        if tool_name not in self.handlers:
            return {"status": "error", "message": f"Tool '{tool_name}' not found in MCP registry."}
        
        try:
            args = json.loads(arguments_json)
            print(f"[MCP Server] Executing {tool_name} with args: {args}")
            # Dispatch to the registered Python function
            result = await self.handlers[tool_name](**args)
            return {"status": "success", "data": result}
        except Exception as e:
            return {"status": "error", "message": f"Execution failed: {str(e)}"}

# Global MCP Registry Instance
mcp_registry = FanVueMCPServer()

# Example Tool Registration (In production, import these from your schema files)
# mcp_registry.register_tool(KALSHI_WAGER_TOOL, kalshi_gateway.place_order)
# mcp_registry.register_tool(CRYPTO_TRANSFER_TOOL, execute_session_key_transfer)
