#todo: delete when testable through frontend
import requests

from ...service.json_output import output_game_as_json


def test_strategy_suggester():
    url = 'http://127.0.0.1:8000/api/strategy-suggester/'
    game_json = output_game_as_json("Test")
    data = {
        'game_json': game_json,
        'player_faction': 'hacan',
        'system_prompt': 'You are a Twilight Imperium expert. Provide concise strategies for the specified player.'
    }
    response = requests.post(url, json=data)
    print(response.json())
    return response.json()