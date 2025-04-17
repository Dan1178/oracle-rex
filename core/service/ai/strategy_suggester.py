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

1. Suggest a high-level game strategy for the player, considering board layout, position, and neighbors.
2. Provide early game advice — such as which planets to prioritize and key threats to watch for.
Be concise and tactical.
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
