DEFAULT_TILES = ["0-0"]  # Mecatol Rex
for player in range(1, 7):
    DEFAULT_TILES.append(str(player))
    for tile_num in range(5):
        DEFAULT_TILES.append(f"{player}-{tile_num}")
