from typing import Dict, Any
from .ai.rules_chatbot import make_rules_chain
from .ai.strategy_suggester import make_strategy_chain
from .ai.move_suggester import make_move_chain
from .ai.tactical_calculator import make_tac_calc_chain
from langchain_openai.chat_models import ChatOpenAI
from langchain_xai import ChatXAI


openAiModels = ['gpt-4.1', 'gpt-4.1-nano']
xAiModels = ['grok-3-latest']

def build_openai_chat(model_name, api_key, max_tokens):
    chat = ChatOpenAI(model=model_name, temperature=0, api_key=api_key, max_tokens=max_tokens)
    return chat

def build_xai_chat(model_name, api_key, max_tokens):
    chat = ChatXAI(model=model_name, temperature=0, api_key=api_key, max_tokens=max_tokens)
    return chat

def get_chat(model, api_key, max_tokens):
    if model in openAiModels:
        return build_openai_chat(model, api_key, max_tokens)
    elif model in xAiModels:
        return build_xai_chat(model, api_key, max_tokens)
    else:
        return build_openai_chat('gpt-4.1-nano', api_key, max_tokens)

def get_rules_response(question, api_key, model):
    chain = make_rules_chain(get_chat(model, api_key, 500))
    return chain.invoke({
        "question": question
    })

def get_strategy_response(game_json: Dict[str, Any], player_faction: str,
                            api_key: str = None, model: str = None) -> str:
    chain = make_strategy_chain(get_chat(model, api_key, 5000))
    return chain.invoke({
        "game_json": game_json,
        "player_faction": player_faction
    })

def get_move_response(game_json: Dict[str, Any], player_faction: str, api_key: str = None, model: str = None) -> str:
    chain = make_move_chain(get_chat(model, api_key, 5000))
    return chain.invoke({
        "game_json": game_json,
        "player_faction": player_faction
    })

def get_tac_calc_response(force_data: Dict[str, Any], api_key: str = None, model: str = None) -> str:
    chain = make_tac_calc_chain(get_chat(model, api_key, 250))
    return chain.invoke({
        "force_data": force_data
    })
