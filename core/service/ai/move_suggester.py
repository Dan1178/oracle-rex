import json
from typing import Dict, Any

from langchain_core.messages import SystemMessage, HumanMessage


def build_move_prompt(game_json: Dict[str, Any], player_faction: str, system_prompt: str = None):
    if not system_prompt:  # todo: enhance
        system_prompt = f'''I have a JSON representation of a Twilight Imperium board with 6 players. Given this board, suggest the best next move to make for the {player_faction} player:
    Here's the JSON:'''

    # Construct messages
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f'''{json.dumps(game_json, indent=2)}
    ''')
    ]

    return messages
