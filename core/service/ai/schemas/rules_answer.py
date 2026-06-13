from pydantic import BaseModel, Field


class RulesAnswer(BaseModel):
    """Validated structure for a Rules Q&A response."""

    answer: str = Field(description="Direct answer to the rules question.")
    assumptions: list[str] = Field(
        default_factory=list,
        description="Assumptions made when interpreting the question.",
    )
    rule_basis: list[str] = Field(
        default_factory=list,
        description="Rules, sections, or concepts the answer is based on.",
    )
    caveats: list[str] = Field(
        default_factory=list,
        description="Edge cases or caveats the player should be aware of.",
    )
    needs_exact_text: bool = Field(
        default=False,
        description="True if answering confidently would require the exact card/rule text.",
    )

    @classmethod
    def fallback_from_text(cls, text: str) -> "RulesAnswer":
        """Wrap a plain-text model reply when structured output is unavailable."""
        return cls(answer=text.strip())

    def to_display_text(self) -> str:
        """Render a readable, plain-text version for the current frontend."""
        parts = [self.answer.strip()]
        if self.rule_basis:
            parts.append("Rule basis:\n" + _bullets(self.rule_basis))
        if self.assumptions:
            parts.append("Assumptions:\n" + _bullets(self.assumptions))
        if self.caveats:
            parts.append("Caveats:\n" + _bullets(self.caveats))
        if self.needs_exact_text:
            parts.append(
                "Note: a fully confident answer would require the exact "
                "card/rule text."
            )
        return "\n\n".join(p for p in parts if p)


def _bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items if str(item).strip())
