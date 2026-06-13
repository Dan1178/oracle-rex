from pydantic import BaseModel, Field


class TacticalMove(BaseModel):
    """Validated structure for a tactical move recommendation."""

    recommended_move: str = Field(description="The single best next move to make.")
    reasoning: str = Field(default="", description="Why this move is recommended.")
    expected_benefit: str = Field(
        default="", description="What the player gains from this move."
    )
    combat_risk: str = Field(
        default="", description="Combat risk involved in the move."
    )
    alternative_conservative_move: str = Field(
        default="", description="A safer alternative line."
    )
    alternative_aggressive_move: str = Field(
        default="", description="A more aggressive alternative line."
    )
    assumptions: list[str] = Field(
        default_factory=list, description="Assumptions made about the board state."
    )

    @classmethod
    def fallback_from_text(cls, text: str) -> "TacticalMove":
        return cls(recommended_move=text.strip())

    def to_display_text(self) -> str:
        parts = [self.recommended_move.strip()]
        if self.reasoning:
            parts.append("Reasoning:\n" + self.reasoning.strip())
        if self.expected_benefit:
            parts.append("Expected benefit:\n" + self.expected_benefit.strip())
        if self.combat_risk:
            parts.append("Combat risk:\n" + self.combat_risk.strip())
        if self.alternative_conservative_move:
            parts.append(
                "Conservative alternative:\n" + self.alternative_conservative_move.strip()
            )
        if self.alternative_aggressive_move:
            parts.append(
                "Aggressive alternative:\n" + self.alternative_aggressive_move.strip()
            )
        if self.assumptions:
            parts.append("Assumptions:\n" + _bullets(self.assumptions))
        return "\n\n".join(p for p in parts if p)


def _bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items if str(item).strip())
