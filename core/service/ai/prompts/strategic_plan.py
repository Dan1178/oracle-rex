"""Prompt for the Strategic Plan suggester."""

from langchain_core.messages import HumanMessage, SystemMessage

from ..serialize import encode_board_payload

PROMPT_VERSION = "strategic_plan_v2"


def _system(player_faction: str) -> str:
    return (
        f"You are an expert Twilight Imperium strategist. You are given a full "
        f"board state in JSON and should give advice for the {player_faction} "
        f"faction. This game is the 4th edition with the Prophecy of Kings "
        f"expansion, and may include Discordant Stars factions.\n\n"
        f"1. Suggest a high-level game strategy for the player, considering all "
        f"factors including but not limited to: board layout, position, and "
        f"neighbors.\n"
        f"2. Provide early game advice — such as which planets to prioritize and "
        f"key threats to watch for.\n"
        f"3. Provide a first-round plan, including which units to move where and "
        f"in what order, what to build, etc.\n\n"
        f"Be reasonably concise and tactical. Avoid obvious advice such as "
        f"'secure home adjacent systems' unless you have a specific or unusual "
        f"strategy for doing so."
    )


def build_messages(game_json, player_faction: str):
    return [
        SystemMessage(content=_system(player_faction)),
        HumanMessage(content=encode_board_payload(game_json)),
    ]
