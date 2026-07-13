import asyncio
import json

from app.agent.mcp_server import FanVueMCPServer, mcp_registry


TEST_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "test_echo_tool",
        "description": "Echoes a message.",
        "parameters": {
            "type": "object",
            "properties": {"message": {"type": "string"}},
            "required": ["message"],
        },
    },
}


async def echo_handler(message: str):
    return {"echo": message}


def test_global_mcp_registry_instance_exists():
    assert isinstance(mcp_registry, FanVueMCPServer)


def test_register_tool_and_get_available_tools(capsys):
    server = FanVueMCPServer()
    server.register_tool(TEST_TOOL_SCHEMA, echo_handler)

    captured = capsys.readouterr().out
    assert "[MCP Server] Registered capability: test_echo_tool" in captured
    assert server.get_available_tools() == [TEST_TOOL_SCHEMA]
    assert server.handlers["test_echo_tool"] is echo_handler


def test_execute_tool_call_success(capsys):
    server = FanVueMCPServer()
    server.register_tool(TEST_TOOL_SCHEMA, echo_handler)

    result = asyncio.run(server.execute_tool_call("test_echo_tool", json.dumps({"message": "hello"})))

    captured = capsys.readouterr().out
    assert "[MCP Server] Executing test_echo_tool with args: {'message': 'hello'}" in captured
    assert result == {"status": "success", "data": {"echo": "hello"}}


def test_execute_tool_call_missing_tool_returns_error():
    server = FanVueMCPServer()

    result = asyncio.run(server.execute_tool_call("missing_tool", "{}"))

    assert result == {"status": "error", "message": "Tool 'missing_tool' not found in MCP registry."}


def test_execute_tool_call_bad_json_returns_error():
    server = FanVueMCPServer()
    server.register_tool(TEST_TOOL_SCHEMA, echo_handler)

    result = asyncio.run(server.execute_tool_call("test_echo_tool", "{bad json"))

    assert result["status"] == "error"
    assert result["message"].startswith("Execution failed:")
