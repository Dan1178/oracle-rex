from typing import Dict

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.runnables import RunnableMap, RunnableLambda


def make_rules_chain(chat) -> RunnableMap:
    static_messages = [
        SystemMessage(content=(
            ''' You are Oracle Rex, a chatbot that answers rule questions about the board game Twilight Imperium. ",
        The answers should be based on the 4th edition of the game with the Prophecy of Kings and Discordant Stars expansions unless otherwise stated. '''
        )),
        HumanMessage(content=(
            ''' I want to move a carrier two tiles. Can I pick up or drop off ground forces while doing so?",
        Can I do both in the same move? '''
        )),
        AIMessage(content=(
            ''' Ships with sufficient capacity can pick up ground units from its starting system, any systems it moves through, ",
        and the active system. However, ships can only drop off units in the active system (the system where the ship ends its movement). '''
        )),
    ]

    def create_messages(inputs: Dict) -> list:
        return static_messages + [HumanMessage(content=inputs["question"])]

    chain = (
            RunnableLambda(create_messages)
            | chat
            | RunnableLambda(lambda response: response.content)
    )

    return chain
