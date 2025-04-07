from ..models import Game


def output_game_as_json(game_name):
    game = Game.objects.get(name=game_name)
    json_output = game.to_json()
    return json_output
