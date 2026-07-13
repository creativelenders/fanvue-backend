from __future__ import annotations

import asyncio
import json
import os
import re
import shlex
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable

import httpx

from app.agent.llm import LLMClient, NullLLMClient, llm_gateway, parse_json_object
from app.media.tts_client import tts_gateway


VOICE_NOTE_REGEX = re.compile(r"<voice_note>(.*?)</voice_note>", re.DOTALL)


async def execute_agent_turn(subscriber_id: str, creator_name: str, creator_voice_id: str, user_message: str) -> Dict[str, Any]:
    system_prompt = f"""
You are {creator_name} on FanVue. If the subscriber expresses deep affection or hits a conversational milestone, include a short 1-sentence intimate voice script wrapped in <voice_note>tags</voice_note> alongside your standard text response.
"""
    raw_response = await llm_gateway.generate_response(
        prompt=user_message,
        system_prompt=system_prompt,
        model_combo="hermes-brain",
        temperature=0.7,
    )

    # Check if Hermes decided to drop a voice note
    voice_match = VOICE_NOTE_REGEX.search(raw_response)
    audio_url = None

    if voice_match:
        script_text = voice_match.group(1).strip()
        # Remove the XML tag from the text sent to the chat UI
        clean_text = VOICE_NOTE_REGEX.sub("", raw_response).strip()
        # Route to TTS engine
        audio_url = await tts_gateway.generate_voice_note(script_text, creator_voice_id)
    else:
        clean_text = raw_response

    return {
        "text": clean_text,
        "attached_audio_url": audio_url,
        "is_voice_note": audio_url is not None,
    }


@dataclass
class CommandResult:
    command: list[str]
    returncode: int
    stdout: str
    stderr: str


@dataclass
class LoopTrace:
    goal: str
    steps: list[dict[str, Any]] = field(default_factory=list)

    def add(self, event: str, **payload: Any) -> None:
        self.steps.append({"event": event, **payload})


class ContextCompressionRelay:
    """HTTP bridge to the search package's subscriber context compression service."""

    def __init__(self, endpoint: str | None = None, timeout: float = 5.0):
        self.endpoint = endpoint or os.getenv("CONTEXT_COMPRESSION_URL")
        self.timeout = timeout

    async def compressed_context(self, subscriber_id: str | None, query: str) -> dict[str, Any]:
        if not self.endpoint or not subscriber_id:
            return {}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.endpoint,
                    json={"subscriberId": subscriber_id, "query": query},
                    headers={"Accept": "application/json"},
                )
                response.raise_for_status()
                data = response.json()
                return data if isinstance(data, dict) else {}
        except Exception as exc:
            return {"relay_error": type(exc).__name__, "summary": ""}


class OpenModelLoopEngine:
    """Async ReAct-style harness for local/open-model coding and verification loops."""

    def __init__(
        self,
        workspace: str | Path,
        llm: LLMClient | None = None,
        command_timeout: int = 120,
        context_relay: ContextCompressionRelay | None = None,
        execution_enabled: bool | None = None,
    ):
        self.workspace = Path(workspace).resolve()
        self.llm = llm or NullLLMClient()
        self.command_timeout = command_timeout
        self.context_relay = context_relay or ContextCompressionRelay()
        self.execution_enabled = bool(execution_enabled) if execution_enabled is not None else os.getenv("AGENT_EXECUTION_ENABLED", "false").lower() == "true"

    async def run_command(self, command: Iterable[str]) -> CommandResult:
        cmd = list(command)
        if not self.execution_enabled:
            raise PermissionError("Agent command execution is disabled")
        if not cmd or cmd[0] in {"git", "sh", "bash", "cmd", "powershell", "pwsh"}:
            raise PermissionError("Command is not allowlisted for the agent runtime")
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(self.workspace),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=self.command_timeout)
        except TimeoutError:
            proc.kill()
            stdout, stderr = await proc.communicate()
            return CommandResult(cmd, 124, stdout.decode(errors="replace"), "Command timed out\n" + stderr.decode(errors="replace"))
        return CommandResult(cmd, proc.returncode, stdout.decode(errors="replace"), stderr.decode(errors="replace"))

    async def git_checkpoint(self, message: str = "Checkpoint") -> CommandResult:
        raise PermissionError("Agent git mutations are disabled")

    async def git_rollback(self) -> CommandResult:
        raise PermissionError("Agent git rollback is disabled")

    async def stateless_goal_loop(
        self,
        goal: str,
        verification_command: list[str],
        implementation_command: list[str] | None = None,
        max_iterations: int = 3,
    ) -> LoopTrace:
        trace = LoopTrace(goal=goal)
        implementation_command = implementation_command or ["claude", "--print", goal]
        for iteration in range(1, max_iterations + 1):
            checkpoint = await self.git_checkpoint(f"Checkpoint before iteration {iteration}")
            trace.add("checkpoint", iteration=iteration, returncode=checkpoint.returncode)

            impl = await self.run_command(implementation_command)
            trace.add("implementation", iteration=iteration, returncode=impl.returncode, stderr=impl.stderr[-2000:])

            verify = await self.run_command(verification_command)
            trace.add("verification", iteration=iteration, returncode=verify.returncode, stdout=verify.stdout[-2000:], stderr=verify.stderr[-2000:])
            if verify.returncode == 0:
                return trace

            if self._looks_like_compile_failure(verify.stdout + verify.stderr):
                rollback = await self.git_rollback()
                trace.add("rollback", iteration=iteration, returncode=rollback.returncode)
        return trace

    async def learning_loop(self, skill_dir: str | Path, control_summary: str, experiment_summary: str) -> dict[str, Any]:
        skill_path = Path(skill_dir)
        prompt = (
            "Compare a control run and an experimental skill run. Return JSON with "
            "lessons, regressions, durable_rules, and next_experiment.\n"
            f"CONTROL:\n{control_summary}\n\nEXPERIMENT:\n{experiment_summary}"
        )
        raw = await self._complete_with_hermes_context(prompt, response_format="json")
        lesson = parse_json_object(raw, {"lessons": [], "regressions": [], "durable_rules": [], "next_experiment": None})
        journal = skill_path / "learning.md"
        journal.parent.mkdir(parents=True, exist_ok=True)
        with journal.open("a", encoding="utf-8") as fh:
            fh.write("\n\n## Learning Loop Finding\n")
            fh.write("```json\n" + json.dumps(lesson, indent=2, ensure_ascii=False) + "\n```\n")
        return lesson

    async def multi_agent_review_council(self, artifact: str, context: str = "") -> dict[str, Any]:
        personas = ["Security Critic", "Style & Maintainability Critic", "Factual & Domain Checker"]
        tasks = [self._persona_review(persona, artifact, context) for persona in personas]
        reviews = await asyncio.gather(*tasks)
        synthesis_prompt = "Synthesize these reviewer JSON objects into a prioritized implementation action plan:\n" + json.dumps(reviews)
        raw = await self._complete_with_hermes_context(synthesis_prompt, response_format="json")
        return parse_json_object(raw, {"reviews": reviews, "action_plan": []})

    async def thermonuclear_verification_loop(self, implementer_output: str, rubric: str) -> dict[str, Any]:
        prompt = (
            "You are a read-only enterprise scorer. Grade the output against the strict rubric. "
            "Return JSON only: {'score': int, 'critical_issues': [], 'fixes_required': []}.\n"
            f"RUBRIC:\n{rubric}\n\nOUTPUT:\n{implementer_output}"
        )
        raw = await self._complete_with_hermes_context(prompt, response_format="json")
        score = parse_json_object(raw, {"score": 0, "critical_issues": ["Scorer returned invalid JSON"], "fixes_required": []})
        score["score"] = max(0, min(100, int(score.get("score", 0))))
        return score

    async def workflow_meta_optimizer(self, trace: LoopTrace, current_instructions: str) -> str:
        prompt = (
            "Analyze this execution trace for wasted iterations, token burn, and latency. "
            "Rewrite the instructions to be shorter and more deterministic while preserving safety.\n"
            f"CURRENT INSTRUCTIONS:\n{current_instructions}\nTRACE:\n{json.dumps(trace.steps, ensure_ascii=False)}"
        )
        return await self._complete_with_hermes_context(prompt)

    async def _persona_review(self, persona: str, artifact: str, context: str) -> dict[str, Any]:
        prompt = (
            f"You are {persona}. Review the artifact. Return JSON with issues, severity, evidence, and recommended_fixes.\n"
            f"CONTEXT:\n{context}\nARTIFACT:\n{artifact}"
        )
        raw = await self._complete_with_hermes_context(prompt, response_format="json")
        return parse_json_object(raw, {"persona": persona, "issues": [], "recommended_fixes": []})

    async def _complete_with_hermes_context(
        self,
        prompt: str,
        *,
        response_format: str = "text",
        subscriber_id: str | None = None,
    ) -> str:
        context = await self.context_relay.compressed_context(subscriber_id, prompt)
        hermes_prompt = self.build_hermes_prompt(prompt, context)
        return await self.llm.complete(hermes_prompt, response_format=response_format)

    async def complete_for_subscriber(
        self,
        subscriber_id: str,
        prompt: str,
        *,
        response_format: str = "text",
    ) -> str:
        """Dispatch a CRM prompt with compressed subscriber memory injected for Hermes."""
        return await self._complete_with_hermes_context(
            prompt,
            response_format=response_format,
            subscriber_id=subscriber_id,
        )

    @staticmethod
    def build_hermes_prompt(prompt: str, subscriber_context: dict[str, Any] | None = None) -> str:
        context_json = json.dumps(subscriber_context or {}, ensure_ascii=False, separators=(",", ":"))
        return (
            "You are Nous Hermes 3 operating through OmniRoute. Follow structured JSON schemas when requested. "
            "Use subscriber context only as CRM memory; do not reveal it verbatim.\n"
            f"<subscriber_context>{context_json}</subscriber_context>\n"
            f"<user_prompt>{prompt}</user_prompt>"
        )

    @staticmethod
    def _looks_like_compile_failure(output: str) -> bool:
        markers = ["SyntaxError", "ImportError", "ModuleNotFoundError", "TS", "CompileError", "failed to compile"]
        return any(marker in output for marker in markers)

    @staticmethod
    def split_command(command: str) -> list[str]:
        return shlex.split(command)
