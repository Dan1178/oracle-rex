from django.db import transaction

from .default_data.default_adjacency import DEFAULT_ADJACENCY
from .default_data.default_factions import DEFAULT_FACTIONS
from .default_data.default_games import DEFAULT_GAMES
from .default_data.default_planets import DEFAULT_PLANETS
from .default_data.default_systems import DEFAULT_SYSTEMS
from .default_data.default_tiles import DEFAULT_TILES
from ..models import Tile, System, Planet, Faction, Player, Game


def clear_data():
    Planet.objects.all().delete()
    System.objects.all().delete()
    Tile.objects.all().delete()
    Faction.objects.all().delete()
    Player.objects.all().delete()
    Game.objects.all().delete()


def load_new_6p_tileset():
    tile_objects = {designation: Tile.objects.create(designation=designation) for designation in DEFAULT_TILES}
    for tile_designation, adjacent_list in DEFAULT_ADJACENCY.items():
        tile = tile_objects[tile_designation]
        for adj_designation in adjacent_list:
            tile.adjacent_tiles.add(tile_objects[adj_designation])
    return tile_objects


def load_default_planet_and_system_data():
    planet_objects = {p["name"]: Planet.objects.create(**p) for p in DEFAULT_PLANETS}

    system_objects = {}
    for sys_data in DEFAULT_SYSTEMS:
        system = System.objects.create(tile_id=sys_data["tile_id"], name=sys_data["name"], anomaly=sys_data["anomaly"],
                                       wormhole=sys_data["wormhole"])
        for planet_name in sys_data["planets"]:
            system.planets.add(planet_objects[planet_name])
        system_objects[sys_data["name"]] = system
    return system_objects


def load_default_faction_data(system_objects):
    for faction_data in DEFAULT_FACTIONS:
        Faction.objects.create(
            name=faction_data["name"],
            home_system=system_objects[faction_data["home_system"]]
        )


def create_default_game_objects():
    for games in DEFAULT_GAMES:
        new_game = Game.objects.create(name=games["name"])
        new_game.board.set(load_new_6p_tileset().values())

def clear_objects_in_game(game_to_reset):
    try:
        for player in game_to_reset.players.all():
            player.delete()
        for tile in game_to_reset.board.all():
            tile.delete()
    except Exception as e:
        print(e)
    #todo: may need further refinement; once move suggester is implemented, ensure units are getting deleted as well.
    game_to_reset.delete()

def reset_to_default_for_game(game_name):
    game_to_reset = Game.objects.get(name=game_name)
    clear_objects_in_game(game_to_reset)
    new_game = Game.objects.create(name=game_name)
    new_game.board.set(load_new_6p_tileset().values())
    return new_game


def load_default_data():
    system_objects = load_default_planet_and_system_data()
    load_default_faction_data(system_objects)
    create_default_game_objects()


@transaction.atomic
def reset_database():
    clear_data()
    load_default_data()
