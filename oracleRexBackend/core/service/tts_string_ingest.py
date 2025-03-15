import numpy as np
from django.core.exceptions import ValidationError

from ..models import Tile, System, Faction, Player, Game
from ..util.utils import reset_to_default_for_game

EXPECTED_STR_LEN = 36  # Expected id count for TTS String (string does not include Mechatol's ID)
MAX_ID_NUM = 82  # Highest ID in standard TI + PoK tileset
MIN_ID_NUM = 1
HOME_SYSTEM_IDS = np.concatenate([np.arange(1, 18), np.arange(52, 59)])


def split_array(arr, indices):
    result = []
    start = 0
    for index in indices:
        result.append(arr[start:index])
        start = index
    result.append(arr[start:])
    return result


def validate_string(tts_string):
    id_list = tts_string.strip().split()
    id_list = [int(id_) for id_ in id_list]
    if len(id_list) != EXPECTED_STR_LEN:
        raise ValidationError(f"Wrong number of input ids. Please ensure id count is equal to {EXPECTED_STR_LEN}") #todo: this should be returned in alert on frontend
    if len(set(id_list)) != len(id_list):
        raise ValidationError(f"Invalid input: Duplicate tile IDs found.")
    invalid_ids = [id_ for id_ in id_list if id_ > MAX_ID_NUM] + [id_ for id_ in id_list if id_ < MIN_ID_NUM]
    if invalid_ids:
        raise ValidationError(
            f"Invalid IDs: {invalid_ids} found in TTS String. All IDs should be between {MIN_ID_NUM} and {MAX_ID_NUM}.")
    ring_split_indices = [6, 18]
    outer_ring = split_array(id_list, ring_split_indices)[2]
    home_systems = outer_ring[::3]
    non_home_ids = [home_ids for home_ids in home_systems if home_ids not in HOME_SYSTEM_IDS]
    if non_home_ids:
        raise ValidationError(f"Invalid IDs for home systems found in TTS String: {non_home_ids}.")
    id_list.insert(0, 18)  # insert ID for Mechatol Rex at beginning
    return id_list

def map_systems_to_tiles(id_list, game):
    tiles = game.board.all()
    systems = sorted(System.objects.all(), key=lambda sys: int(sys.tile_id))
    starting_positions = []

    for i, tile in enumerate(tiles):
        if i < len(id_list):
            tile.system = systems[id_list[i] - 1]  # need to offset to match values
            if len(tile.designation) == 1:
                starting_positions.append(tile)

    Tile.objects.bulk_update(tiles, ["system"])
    return starting_positions

def create_players(game_name, starting_positions):
    new_players = []
    for player in range(1, 7):
        new_player = Player.objects.create(username=f"{game_name} Player {player}",
                                           faction=Faction.objects.get(
                                               home_system__tile_id=starting_positions[player - 1].system.tile_id),
                                           starting_position=starting_positions[player - 1])
        new_players.append(new_player)
    Player.objects.bulk_update(new_players, ["username", "faction", "starting_position"])
    return new_players

def build_game_from_string(tts_string, game_name):
    game = reset_to_default_for_game(game_name)
    id_list = validate_string(tts_string)
    print("TTS String successfully validated.")
    starting_positions = map_systems_to_tiles(id_list, game)
    print("Systems successfully mapped to tiles.")
    new_players = create_players(game_name, starting_positions)
    print("New players created.")
    game.players.set(new_players)
    game.save()
    print("New Game object created for component: " + game_name)
    return game
