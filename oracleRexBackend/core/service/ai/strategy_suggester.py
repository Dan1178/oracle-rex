import json
from typing import Dict, Any
from langchain_xai import ChatXAI
from langchain_core.messages import SystemMessage, HumanMessage

from ...config.tokens import xai_api_key

api_key = xai_api_key


def get_strategy_suggestion(game_json: Dict[str, Any], player_faction: str, system_prompt: str = None) -> str:
    chat = ChatXAI(
        model="grok-beta",
        api_key=api_key,
        temperature=0,
        max_tokens=2000
    )

    if not system_prompt: #todo: enhance
        system_prompt = '''You are a Twilight Imperium strategy expert. Provide detailed strategy suggestions based on the 4th edition with Prophecy of Kings expansion. Given a game JSON with players and board layout, output:
        1) An overall game strategy for the specified player based on board layout, neighbors, etc.
        2) An early game strategy, including planets to take first and threats to watch for.'''

    # Construct messages
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f'''Here’s the game JSON:
{json.dumps(game_json, indent=2)}

Provide strategy suggestions for the "{player_faction}" player.''')
    ]

    response = chat.invoke(messages)
    return response.content
