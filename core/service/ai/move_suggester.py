import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableMap, RunnableLambda


def build_move_prompt_template() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        ("system", "{system_prompt}"),
        ("human", "{game_json}")
    ])


def build_default_system_prompt(player_faction: str) -> str:
    return f"""I have a JSON representation of a Twilight Imperium board with 6 players.
    This is the 4th edition of the game, Prophecy of Kings and Discordant Stars expansions are included.
    Given this board, suggest the best next move to make for the {player_faction} player:
    Here's the JSON:
"""


def make_move_chain(chat) -> RunnableMap:
    prompt = build_move_prompt_template()

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
