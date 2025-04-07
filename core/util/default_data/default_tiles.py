# Create tiles in an order that makes it easy for string ingestor to deal with
DEFAULT_TILES = ["0-0"]  # Mecatol Rex
for player in range(1, 7):
    DEFAULT_TILES.append(f"{player}-4")
for player in range(1, 7):
    DEFAULT_TILES.append(f"{player}-1")
    DEFAULT_TILES.append(f"{player}-3")
for player in range(1, 7):
    DEFAULT_TILES.append(f"{player}")
    DEFAULT_TILES.append(f"{player}-0")
    if player < 6:
        DEFAULT_TILES.append(f"{player + 1}-2")
    else:
        DEFAULT_TILES.append(f"1-2")

# Original Method

# DEFAULT_TILES = ["0-0"]  # Mecatol Rex
# for player in range(1, 7):
#     DEFAULT_TILES.append(str(player))
#     for tile_num in range(5):
#         DEFAULT_TILES.append(f"{player}-{tile_num}")
