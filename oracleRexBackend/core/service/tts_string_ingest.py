from django.core.exceptions import ValidationError
import numpy as np

from ..models.tile import Tile

expected_tile_count = 36
max_id_num = 82  # Highest ID in standard TI + PoK tileset for 6-player game
min_id_num = 1
home_system_ids = np.concatenate([np.arange(1, 18), np.arange(52, 59)])


def split_array(arr, indices):
    result = []
    start = 0
    for index in indices:
        result.append(arr[start:index])
        start = index
    result.append(arr[start:])
    return result


def validate_string(id_list):
    if len(id_list) != expected_tile_count:
        raise ValidationError(f"Wrong number of input ids. Please ensure id count is equal to {expected_tile_count}")
    if len(set(id_list)) != len(id_list):
        raise ValidationError(f"Invalid input: Duplicate tile IDs found.")
    invalid_ids = [id_ for id_ in id_list if id_ > max_id_num] + [id_ for id_ in id_list if id_ < min_id_num]
    if invalid_ids:
        raise ValidationError(
            f"Invalid IDs: {invalid_ids} found in TTS String. All IDs should be between {min_id_num} and {max_id_num}.")


def transformString(tts_string):
    id_list = tts_string.strip().split()
    id_list = [int(id_) for id_ in id_list]
    validate_string(id_list)

    ring_split_indices = [6, 18]
    all_rings = split_array(id_list, ring_split_indices)
    inner_ring = all_rings[0]
    middle_ring = all_rings[1]
    outer_ring = all_rings[2]
    home_systems = outer_ring[::3]
    non_home_ids = [home_ids for home_ids in home_systems if home_ids not in home_system_ids]
    if non_home_ids:
        raise ValidationError(f"Invalid IDs for home systems found in TTS String: {non_home_ids}.")

    # tiles = [Tile.objects.get(designation="0-0")]
    # for player in range(1, 7):
    #     tiles.append(Tile.objects.get(designation=str(player)))  # Home tile
    #     for tile_num in range(5):
    #         tiles.append(Tile.objects.get(designation=f"{player}-{tile_num}"))

# test string
# 78 40 42 67 28 38 76 43 21 44 77 63 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25

# expected inner ring
# 78 40 42 67 28 38

# middle
# 76 43 21 44 77 63 50 64 74 48 49 39

# outer
# 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25

# home system ids
# 1 16 55 58 4 57
