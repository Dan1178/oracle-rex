import json
from typing import Dict, Any
from langchain_xai import ChatXAI
from langchain_core.messages import SystemMessage, HumanMessage

from ...config.tokens import xai_api_key

api_key = xai_api_key


def get_move_suggestion(game_json: Dict[str, Any], player_faction: str, system_prompt: str = None) -> str:
    chat = ChatXAI(
        model="grok-3-beta",
        api_key=api_key,
        temperature=0,
        max_tokens=2000
    )

    if not system_prompt:  # todo: enhance
        system_prompt = f'''I have a JSON representation of a Twilight Imperium board with 6 players. Given this board, suggest the best next move to make for the {player_faction} player:
    Here's the JSON:'''

    # Construct messages
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f'''{json.dumps(game_json, indent=2)}
    ''')
    ]

    response = chat.invoke(messages)
    return response.content
