import os
import asyncio
import httpx
from datetime import datetime
from apps.api.app.agent.llm import llm_gateway


def load_thermonuclear_rubric() -> str:
    """Reads the Markdown skill definition from the apps/api/skills directory."""
    rubric_path = os.path.join(os.getcwd(), "apps", "api", "skills", "thermonuclear_review.md")
    try:
        with open(rubric_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"[Scheduler Warning] Could not read rubric file: {str(e)}")
        return "You are an AI QA Auditor. Review interactions for persona drift and safety compliance."


async def execute_thermonuclear_audit():
    print(f"[{datetime.utcnow()}] Initiating Nightly Thermonuclear QA Review...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8000/api/crm/recent-chats?limit=10", timeout=5.0)
            chat_samples = resp.json().get("chats", []) if resp.status_code == 200 else []
        except Exception:
            chat_samples = []

    if not chat_samples:
        print("[Audit Notice] No chats found for evaluation.")
        return

    rubric_instructions = load_thermonuclear_rubric()
    audit_payload = f"<sampled_interactions>\n{str(chat_samples)}\n</sampled_interactions>\n\nExecute the review mandate and output the JSON scorecard."

    # Route through OmniRoute using our highest reasoning model tier
    scorecard_json = await llm_gateway.generate_response(
        prompt=audit_payload,
        system_prompt=rubric_instructions,
        model_combo="priority-thermonuclear",
        temperature=0.2,
        extra_headers={"X-OmniRoute-Priority": "high-reasoning"},
    )

    print(f"=== THERMONUCLEAR AUDIT SCORECARD ===\n{scorecard_json}\n=====================================")


async def scheduler_loop():
    print("[Scheduler Engine] Started cron evaluation loop.")
    while True:
        now = datetime.utcnow()
        # Execute daily at 03:00 UTC
        if now.hour == 3 and now.minute == 0:
            await execute_thermonuclear_audit()
            await asyncio.sleep(60)  # Prevent double execution within the minute
        await asyncio.sleep(30)


if __name__ == "__main__":
    asyncio.run(scheduler_loop())
