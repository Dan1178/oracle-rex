from django.db import migrations


def load_tile_data(apps, schema_editor):
    Tile = apps.get_model("core", "Tile")

    # Define tiles for a 6-player game
    tiles = ["0-0"]  # Mecatol Rex
    for player in range(1, 7):
        tiles.append(str(player))
        for tile_num in range(5):
            tiles.append(f"{player}-{tile_num}")

    tile_objects = {designation: Tile.objects.create(designation=designation) for designation in tiles}

    adjacency = {
        "0-0": ["1-4", "2-4", "3-4", "4-4", "5-4", "6-4"],
        # Player 1 Slice
        "1": ["1-0", "1-1", "1-2"],
        "1-0": ["1", "1-1", "1-3", "2-2"],
        "1-1": ["1", "1-0", "1-2", "1-3", "1-4", "6-3"],
        "1-2": ["1", "1-1", "6-0", "6-3"],
        "1-3": ["1-0", "1-1", "1-4", "2-2", "2-1", "2-4"],
        "1-4": ["1-1", "1-3", "0-0", "2-4", "6-4", "6-3"],
        # Player 2 Slice
        "2": ["2-0", "2-1", "2-2"],
        "2-0": ["2", "2-1", "2-3", "3-2"],
        "2-1": ["2", "2-0", "2-2", "2-3", "2-4", "1-3"],
        "2-2": ["2", "2-1", "1-0", "1-3"],
        "2-3": ["2-0", "2-1", "2-4", "3-2", "3-1", "3-4"],
        "2-4": ["2-1", "2-3", "0-0", "3-4", "1-4", "1-3"],
        # Player 3 Slice
        "3": ["3-0", "3-1", "3-2"],
        "3-0": ["3", "3-1", "3-3", "4-2"],
        "3-1": ["3", "3-0", "3-2", "3-3", "3-4", "2-3"],
        "3-2": ["3", "3-1", "2-0", "2-3"],
        "3-3": ["3-0", "3-1", "3-4", "4-2", "4-1", "4-4"],
        "3-4": ["3-1", "3-3", "0-0", "4-4", "2-4", "2-3"],
        # Player 4 Slice
        "4": ["4-0", "4-1", "4-2"],
        "4-0": ["4", "4-1", "4-3", "5-2"],
        "4-1": ["4", "4-0", "4-2", "4-3", "4-4", "3-3"],
        "4-2": ["4", "4-1", "3-0", "3-3"],
        "4-3": ["4-0", "4-1", "4-4", "5-2", "5-1", "5-4"],
        "4-4": ["4-1", "4-3", "0-0", "5-4", "3-4", "3-3"],
        # Player 5 Slice
        "5": ["5-0", "5-1", "5-2"],
        "5-0": ["5", "5-1", "5-3", "6-2"],
        "5-1": ["5", "5-0", "5-2", "5-3", "5-4", "4-3"],
        "5-2": ["5", "5-1", "4-0", "4-3"],
        "5-3": ["5-0", "5-1", "5-4", "6-2", "6-1", "6-4"],
        "5-4": ["5-1", "5-3", "0-0", "6-4", "4-4", "4-3"],
        # Player 6 Slice
        "6": ["6-0", "6-1", "6-2"],
        "6-0": ["6", "6-1", "6-3", "1-2"],
        "6-1": ["6", "6-0", "6-2", "6-3", "6-4", "5-3"],
        "6-2": ["6", "6-1", "5-0", "5-3"],
        "6-3": ["6-0", "6-1", "6-4", "1-2", "1-1", "1-4"],
        "6-4": ["6-1", "6-3", "0-0", "1-4", "5-4", "5-3"],
    }

    # Set adjacency relationships
    for tile_designation, adjacent_list in adjacency.items():
        tile = tile_objects[tile_designation]
        for adj_designation in adjacent_list:
            tile.adjacent_tiles.add(tile_objects[adj_designation])


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_initial_data"),
    ]

    operations = [
        migrations.RunPython(load_tile_data),
    ]
