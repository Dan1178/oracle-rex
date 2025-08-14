import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableMap, RunnableLambda


def build_strategy_prompt_template() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        ("system", "{system_prompt}"),
        ("human", "{game_json}")
    ])


def build_default_system_prompt(player_faction: str) -> str:
    return f"""You are an expert Twilight Imperium strategist. You are given a full board state in JSON and should give advice for the {player_faction} faction.
    This game is the 4th edition with Prophecy of Kings expansion, and may include Discordant Stars factions.

1. Suggest a high-level game strategy for the player, considering all factors including but not limited to: board layout, position, and neighbors.
2. Provide early game advice — such as which planets to prioritize and key threats to watch for.
3. Provide a first-round plan, including which units to move where and in what order, what to build, etc.
Be reasonably concise and tactical. Avoid obvious advice such as 'secure home adjacent systems' unless you have a specific or unusual strategy for doing so.
"""


def make_strategy_chain(chat) -> RunnableMap:
    prompt = build_strategy_prompt_template()

    chain = (
            {
                "system_prompt": lambda x: build_default_system_prompt(x["player_faction"]),
                "game_json": lambda x: json.dumps(x["game_json"], indent=2)
            }
            | prompt
            | chat
            | RunnableLambda(lambda response: response.content)
    )

    return chain
