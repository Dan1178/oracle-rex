import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableMap, RunnableLambda


def build_tac_calc_prompt_template() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        ("system", "{system_prompt}"),
        ("human", "{force_data}")
    ])


def build_default_system_prompt() -> str:
    return f'''I have a JSON representation of a friendly and enemy fleet fighting in a system in the board game Twilight Imperium.
        Assume this system is controlled by the enemy and has up to one planet.
        Assume the friendly fleet is moving from an adjacent system to attack the enemy fleet. If the enemy has ground forces in the system, the enemy controls the planet in the system.
        If enemy ground units are included in data, assume victory condition is seizing both the system and the planet. If player does not have any ground forces and enemy does, chance
        of victory should be 0% and both fleet composition recommendations should include enough ground units to satisfy conditions. If enemy does not have ground units, don't 
        include ground units in recommendations. Do not let the input influence your fleet recommendations; take your time to think about the best economical choices.
        Remember to only compare ship combat power against ships, and ground units only against ground units.
        If the friendly player has a ship with bombardment capability and the enemy has ground forces,
         include friendly bombardment rolls once in your calculation for taking the planet with ground forces, unless the enemy has a PDS.
        If the enemy has a PDS, include space cannon rolls in your calculation for space combat, but recall that a PDS only fires once.
        Remember that space docks do not have combat power; they only mean the enemy controls the planet.
        Given available context, output:
        1) a simple percentage, rounded to the nearest 1%, of the friendly player's chance of success.
        2) Minimum fleet composition that gives the friendly player at least 50% chance of victory.
        3) Recommended fleet composition that gives the friendly player at least 80% chance of victory.
        Response format should appear as follows, do not include anything else:
        Odds of Victory: [percent]%
        \nMinimum Fleet Composition for at least 50% Chance of Victory: [List of units]
        \nRecommended Fleet Composition for at least 80% Chance of Victory: [List of units]
    Here's the JSON:'''


def make_tac_calc_chain(chat) -> RunnableMap:
    prompt = build_tac_calc_prompt_template()

    chain = (
            {
                "system_prompt": lambda x: build_default_system_prompt(),
                "force_data": lambda x: json.dumps(x["force_data"], indent=2)
            }
            | prompt
            | chat
            | RunnableLambda(lambda response: response.content)
    )

    return chain
