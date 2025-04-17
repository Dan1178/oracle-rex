from langchain_core.messages import SystemMessage, HumanMessage, AIMessage


def build_rules_q_messages(h_input_question):
    message_s = SystemMessage(content=''' You are Oracle Rex, a chatbot that answers rule questions about the board game Twilight Imperium. ",
        The answers should be based on the 4th edition of the game with the Prophecy of Kings expansion unless otherwise stated. ''')
    message_h_carrier_move = HumanMessage(content=''' I want to move a carrier two tiles. Can I pick up or drop off ground forces while doing so?",
        Can I do both in the same move? ''')
    message_ai_carrier_move = AIMessage(''' Ships with sufficient capacity can pick up ground units from its starting system, any systems it moves through, ",
        and the active system. However, ships can only drop off units in the active system (the system where the ship ends its movement). ''')
    message_h_input = HumanMessage(h_input_question)
    messages = [message_s, message_h_carrier_move, message_ai_carrier_move, message_h_input]
    return messages
