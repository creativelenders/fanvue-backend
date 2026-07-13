import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "apps" / "api"))

from app.agent.llm import llm_gateway

async def main():
    print("Testing llm_gateway.generate_response...")
    try:
        response = await llm_gateway.generate_response(
            prompt="Hello, return a simple JSON object: {\"status\": \"ok\"}",
            system_prompt="You are a helpful assistant. Output ONLY raw JSON.",
            model_combo="cost-optimized",
            temperature=0.7,
        )
        print("SUCCESS!")
        print("Response:", repr(response))
    except httpx.HTTPStatusError as e:
        print("HTTP ERROR!")
        print("Response Body:", e.response.text)
    except Exception as e:
        import traceback
        print("FAILED!")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
