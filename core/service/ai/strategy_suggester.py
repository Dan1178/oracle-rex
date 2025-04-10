import json
from typing import Dict, Any
from langchain_xai import ChatXAI
from langchain_core.messages import SystemMessage, HumanMessage

from ...config.tokens import xai_api_key

api_key = xai_api_key


def get_strategy_suggestion(game_json: Dict[str, Any], player_faction: str, system_prompt: str = None) -> str:
    chat = ChatXAI(
        model="grok-3-beta",
        api_key=api_key,
        temperature=0,
        max_tokens=2000
    )

    if not system_prompt:  # todo: enhance
        system_prompt = f'''I have a JSON representation of a Twilight Imperium board with 6 players. Given this board, I want you to output the following for the {player_faction} player:
    1) Suggest an overall game strategy for the player based on the board layout, neighbors, etc.
    2) Suggest an early game strategy for the player. For example, what planets should be taken first, what to watch out for, etc.
    Here's the JSON:'''

    # Construct messages
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f'''{json.dumps(game_json, indent=2)}
    ''')
    ]

    response = chat.invoke(messages)
    return response.content
