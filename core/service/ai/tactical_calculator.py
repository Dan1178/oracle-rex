import json
from typing import Dict, Any
from langchain_xai import ChatXAI
from langchain_core.messages import SystemMessage, HumanMessage

from ...config.tokens import xai_api_key

api_key = xai_api_key


def tactical_calculator(force_data: Dict[str, Any], system_prompt: str = None) -> str:
    chat = ChatXAI(
        model="grok-3-beta",
        api_key=api_key,
        temperature=0,
        max_tokens=2000
    )

    if not system_prompt:  # todo: enhance
        system_prompt = f'''I have a JSON representation of a friendly and enemy fleet fighting in a system in the board game Twilight Imperium.
        Unless otherwise stated, this system is controlled by the enemy and has up to one planet.
        Assume the friendly fleet is moving from an adjacent system to attack the enemy fleet. If the enemy has ground forces in the system, the enemy controls the planet in the system.
        If enemy ground units are included in data, assume victory condition is seizing both the system and the planet. If player does not have any ground forces and enemy does, chance
        of victory should be 0% and both fleet composition recommendations should include enough ground units to satisfy conditions. If enemy does not have ground units, you don't need to
        include ground units in your recommendations. Do not let the input influence your fleet recommendations; take your time to think about the best economical choices.
        Given all data included in the JSON, return the following:
        1) a simple percentage, rounded to the nearest 1%, of the friendly player's chance of success.
        2) Minimum fleet composition that gives the friendly player at least 50% chance of victory.
        3) Recommended fleet composition that gives the friendly player at least 80% chance of victory.
        Response format should appear as follows, do not include anything else:
        Odds of Victory: [percent]%
        Minimum Fleet Composition: [List of units]
        Recommended Fleet Composition: [List of units]
    Here's the JSON:'''

    # Construct messages
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f'''{json.dumps(force_data, indent=2)}
    ''')
    ]

    response = chat.invoke(messages)
    return response.content
