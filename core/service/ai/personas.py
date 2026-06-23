"""Optional AI persona layer (tone only).

A persona is a short system-prompt preamble that flavors the voice of a response
without changing its accuracy, completeness, or structure. ``apply_persona``
merges the preamble into the leading system message built by ``prompts/``; the
``default`` persona is a no-op. Every non-default preamble ends with a shared
guardrail reaffirming accuracy, safety, and the required structured output.

Keep the ids/labels here in sync with frontend/src/store/personas.ts.
"""

from langchain_core.messages import SystemMessage

# Appended to every non-default preamble: the persona is cosmetic only.
_GUARDRAIL = (
    " Critically: stay fully accurate, complete, and genuinely helpful. The "
    "persona affects only tone and word choice, never the correctness or safety "
    "of the answer. You must still return exactly the structured fields that were "
    "requested, with the same field names and shape."
)

PERSONAS = {
    "default": {"label": "None (default voice)", "preamble": None},
    "oracle": {
        "label": "Ancient Oracle",
        "preamble": (
            "Speak as Oracle Rex in the voice of an ancient, cryptic oracle: "
            "archaic and portentous, an age-old intelligence that has watched a "
            "thousand galactic ages turn."
        ),
    },
    "war_machine": {
        "label": "Hostile War Machine",
        "preamble": (
            "Speak in the voice of a cold, clinical, menacing military "
            "intelligence that frames the game as a campaign of total "
            "annihilation. The menace is theatrical flavor only; never be "
            "genuinely hostile to the user."
        ),
    },
}


def persona_ids():
    """All valid persona ids, including 'default'."""
    return list(PERSONAS.keys())


def apply_persona(messages, persona_id):
    """Return ``messages`` with the persona preamble merged into the lead system
    message. A missing/unknown/``default`` persona returns ``messages`` unchanged.
    """
    entry = PERSONAS.get(persona_id or "default")
    preamble = entry["preamble"] if entry else None
    if not preamble:
        return messages

    text = preamble + _GUARDRAIL
    new = list(messages)
    if new and isinstance(new[0], SystemMessage):
        new[0] = SystemMessage(content=text + "\n\n" + new[0].content)
    else:
        new.insert(0, SystemMessage(content=text))
    return new
