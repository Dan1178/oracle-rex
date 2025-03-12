from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_openai.chat_models import ChatOpenAI

from ...config.tokens import openai_api_key

api_key = openai_api_key


def get_rule_answer(h_input_question):  # todo: modernize
    chat = ChatOpenAI(model_name='gpt-4', temperature=0, api_key=api_key, max_tokens=1500)
    message_s = SystemMessage(content=''' You are Oracle Rex, a chatbot that answers rule questions about the board game Twilight Imperium. ",
    The answers should be based on the 4th edition of the game with the Prophecy of Kings expansion unless otherwise stated. ''')
    message_h_carrier_move = HumanMessage(content=''' I want to move a carrier two tiles. Can I pick up or drop off ground forces while doing so?",
    Can I do both in the same move? ''')
    message_ai_carrier_move = AIMessage(''' Ships with sufficient capacity can pick up ground units from its starting system, any systems it moves through, ",
    and the active system. However, ships can only drop off units in the active system (the system where the ship ends its movement). ''')
    message_h_input = HumanMessage(h_input_question)
    response = chat.invoke([message_s, message_h_carrier_move, message_ai_carrier_move, message_h_input])
    return response.content
