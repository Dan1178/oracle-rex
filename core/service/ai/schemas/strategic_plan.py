from pydantic import BaseModel, Field


class StrategicPlan(BaseModel):
    """Validated structure for a faction strategy recommendation."""

    summary: str = Field(description="High-level strategic summary for the faction.")
    faction_read: str = Field(
        default="",
        description="Read on the faction's strengths and how to lean into them.",
    )
    opening_priorities: list[str] = Field(
        default_factory=list,
        description="Early-game priorities (planets to take, threats to watch).",
    )
    round_one_plan: str = Field(
        default="",
        description="Concrete first-round plan: what to move, build, and in what order.",
    )
    tech_path: list[str] = Field(
        default_factory=list, description="Suggested technology path."
    )
    expansion_targets: list[str] = Field(
        default_factory=list, description="Systems/planets to expand toward."
    )
    risks: list[str] = Field(default_factory=list, description="Key risks to manage.")
    mistakes_to_avoid: list[str] = Field(
        default_factory=list, description="Common mistakes to avoid with this position."
    )

    @classmethod
    def fallback_from_text(cls, text: str) -> "StrategicPlan":
        return cls(summary=text.strip())

    def to_display_text(self) -> str:
        parts = [self.summary.strip()]
        if self.faction_read:
            parts.append("Faction read:\n" + self.faction_read.strip())
        if self.opening_priorities:
            parts.append("Opening priorities:\n" + _bullets(self.opening_priorities))
        if self.round_one_plan:
            parts.append("Round one plan:\n" + self.round_one_plan.strip())
        if self.tech_path:
            parts.append("Tech path:\n" + _bullets(self.tech_path))
        if self.expansion_targets:
            parts.append("Expansion targets:\n" + _bullets(self.expansion_targets))
        if self.risks:
            parts.append("Risks:\n" + _bullets(self.risks))
        if self.mistakes_to_avoid:
            parts.append("Mistakes to avoid:\n" + _bullets(self.mistakes_to_avoid))
        return "\n\n".join(p for p in parts if p)


def _bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items if str(item).strip())
