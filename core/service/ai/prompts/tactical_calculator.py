"""Prompt for the Battle / Tactical calculator's LLM explanation.

As of Milestone 6C the odds and fleet recommendations are computed by the
deterministic simulator (``core/service/combat``), so the LLM's job changed from
*compute* to *explain*: it is given the force composition AND the already-computed
numbers and must narrate why the odds are what they are — explicitly without
recomputing them. Returns a plain-text explanation, rendered beneath the
structured result card.
"""

import json

from langchain_core.messages import HumanMessage, SystemMessage

PROMPT_VERSION = "tactical_calculator_v3"

_SYSTEM = (
    "You are an expert Twilight Imperium (4th edition, Prophecy of Kings) combat "
    "advisor. A deterministic simulator has ALREADY computed the win probability "
    "and the recommended fleet compositions for an engagement — these numbers are "
    "ground truth. Do NOT recompute or second-guess them, and do not state a "
    "different percentage.\n\n"
    "You are given the friendly (attacking) and enemy (defending) forces and the "
    "simulator's results. Explain, concisely and tactically:\n"
    "1. Why the odds are what they are — the key matchups and which units drive "
    "the result.\n"
    "2. The main threats to the friendly player (e.g. PDS space cannon, sustain "
    "damage on capital ships, holding the planet with ground forces).\n"
    "3. Practical advice — which units to commit, whether to reinforce toward the "
    "recommended fleet, and when retreating or not committing would be wiser.\n\n"
    "Assume the friendly fleet attacks from an adjacent system. Refer to the "
    "simulator's win probability and recommended fleets rather than producing your "
    "own. Do not output a rigid template; write a short, readable assessment."
)


def build_messages(force_data, simulation=None):
    payload = {"forces": force_data, "simulation": simulation or {}}
    return [
        SystemMessage(content=_SYSTEM),
        HumanMessage(content=json.dumps(payload, indent=2)),
    ]
