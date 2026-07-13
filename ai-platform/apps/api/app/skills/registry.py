from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


COMMAND_RE = re.compile(r"(^|\s)([@/][a-zA-Z0-9_\-]+)")


@dataclass(frozen=True)
class SparkSkill:
    name: str
    path: Path
    body: str

    @property
    def command(self) -> str:
        return "@" + self.name


class SparkSkillRegistry:
    """Filesystem-backed Markdown SOP registry with @skill and /skill injection."""

    def __init__(self, root: str | Path = "./skills"):
        self.root = Path(root)
        self._skills: dict[str, SparkSkill] = {}

    def load(self) -> dict[str, SparkSkill]:
        self.root.mkdir(parents=True, exist_ok=True)
        self._skills = {}
        for path in sorted(self.root.glob("*.md")):
            name = path.stem.replace(" ", "_").lower()
            self._skills[name] = SparkSkill(name=name, path=path, body=path.read_text(encoding="utf-8"))
        return dict(self._skills)

    def save(self, name: str, body: str) -> SparkSkill:
        normalized = self.normalize_name(name)
        self.root.mkdir(parents=True, exist_ok=True)
        path = self.root / f"{normalized}.md"
        path.write_text(body.strip() + "\n", encoding="utf-8")
        skill = SparkSkill(name=normalized, path=path, body=path.read_text(encoding="utf-8"))
        self._skills[normalized] = skill
        return skill

    def get(self, name: str) -> SparkSkill | None:
        if not self._skills:
            self.load()
        return self._skills.get(self.normalize_name(name))

    def extract_commands(self, prompt: str) -> list[str]:
        return [self.normalize_name(match.group(2)) for match in COMMAND_RE.finditer(prompt)]

    def inject(self, prompt: str) -> str:
        if not self._skills:
            self.load()
        commands = self.extract_commands(prompt)
        blocks = []
        for name in commands:
            skill = self._skills.get(name)
            if skill:
                blocks.append(f"### Injected Skill: @{skill.name}\n{skill.body}")
        if not blocks:
            return prompt
        return "\n\n".join(blocks) + "\n\n### User Prompt\n" + prompt

    @staticmethod
    def normalize_name(name: str) -> str:
        return name.strip().lstrip("@/").replace("-", "_").lower()

