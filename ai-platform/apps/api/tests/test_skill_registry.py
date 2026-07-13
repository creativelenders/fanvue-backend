from app.skills.registry import SparkSkillRegistry


def test_skill_registry_saves_loads_and_injects(tmp_path):
    registry = SparkSkillRegistry(tmp_path)
    registry.save("vip_retention", "VIP retention instructions")
    prompt = "Use @vip_retention for this subscriber."
    injected = registry.inject(prompt)
    assert "Injected Skill: @vip_retention" in injected
    assert "VIP retention instructions" in injected


def test_extracts_slash_and_at_commands(tmp_path):
    registry = SparkSkillRegistry(tmp_path)
    assert registry.extract_commands("Run /thermonuclear_review then @chat-agent") == ["thermonuclear_review", "chat_agent"]

