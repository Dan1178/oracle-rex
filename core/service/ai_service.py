from typing import Dict, Any
from .ai.rules_chatbot import build_rules_q_messages
from .ai.strategy_suggester import build_strategy_prompt
from .ai.move_suggester import build_move_prompt
from .ai.tactical_calculator import build_tac_calc_prompt
from .ai.ai_response_client import invoke_xai, invoke_openai


openAiModels = ['gpt-4.1', 'gpt-4.1-nano']
xAiModels = ['grok-3-latest']

def get_rules_response(question, api_key, model):
    if model in openAiModels:
        return invoke_openai(model, api_key, 500, build_rules_q_messages(question))
    elif model in xAiModels:
        return invoke_xai(model, api_key, 500, build_rules_q_messages(question))
    else:
        return invoke_openai(model, api_key, 500, build_rules_q_messages(question))

def get_strategy_response(game_json: Dict[str, Any], player_faction: str, system_prompt: str = None,
                            api_key: str = None, model: str = None) -> str:
    if model in openAiModels:
        return invoke_openai(model, api_key, 5000, build_strategy_prompt(game_json, player_faction, system_prompt))
    elif model in xAiModels:
        return invoke_xai(model, api_key, 5000, build_strategy_prompt(game_json, player_faction, system_prompt))
    else:
        return invoke_openai(model, api_key, 5000, build_strategy_prompt(game_json, player_faction, system_prompt))

def get_move_response(game_json: Dict[str, Any], player_faction: str, system_prompt: str = None,
                            api_key: str = None, model: str = None) -> str:
    if model in openAiModels:
        return invoke_openai(model, api_key, 5000, build_move_prompt(game_json, player_faction, system_prompt))
    elif model in xAiModels:
        return invoke_xai(model, api_key, 5000, build_move_prompt(game_json, player_faction, system_prompt))
    else:
        return invoke_openai(model, api_key, 5000, build_move_prompt(game_json, player_faction, system_prompt))

def get_tac_calc_response(force_data: Dict[str, Any], system_prompt: str = None,
                            api_key: str = None, model: str = None) -> str:
    if model in openAiModels:
        return invoke_openai(model, api_key, 250, build_tac_calc_prompt(force_data, system_prompt))
    elif model in xAiModels:
        return invoke_xai(model, api_key, 250, build_tac_calc_prompt(force_data, system_prompt))
    else:
        return invoke_openai(model, api_key, 250, build_tac_calc_prompt(force_data, system_prompt))