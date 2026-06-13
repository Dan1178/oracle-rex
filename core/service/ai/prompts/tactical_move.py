"""Prompt for the Tactical Move suggester."""

import json

from langchain_core.messages import HumanMessage, SystemMessage

PROMPT_VERSION = "tactical_move_v2"


def _system(player_faction: str) -> str:
    return (
        f"You are given a JSON representation of a Twilight Imperium board with "
        f"6 players. This is the 4th edition of the game; the Prophecy of Kings "
        f"and Discordant Stars expansions are included. Given this board, suggest "
        f"the single best next move to make for the {player_faction} player, with "
        f"clear reasoning, the expected benefit, the combat risk, and a "
        f"conservative and an aggressive alternative line."
    )


def build_messages(game_json, player_faction: str):
    return [
        SystemMessage(content=_system(player_faction)),
        HumanMessage(content=json.dumps(game_json, indent=2)),
    ]
