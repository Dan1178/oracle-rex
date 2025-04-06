from django.test import TestCase

from ...models import (Game, Player, Tile, System, Faction, Planet, Fleet, Ship, ShipClass,
                       Structure, StructureClass, GroundUnit, GroundUnitClass, GroundForces)


class TestGameJsonOutput(TestCase):
    def setUp(self):
        Game.objects.all().delete()
        Player.objects.all().delete()
        Tile.objects.all().delete()
        System.objects.all().delete()
        Faction.objects.all().delete()
        Planet.objects.all().delete()

        # Create Systems
        self.mecatol_system = System.objects.create(name="Mecatol Rex System", tile_id=18)
        self.arborec_system = System.objects.create(name="Arborec System", tile_id=101)
        self.planet_nestphar = Planet.objects.create(name="Nestphar",
                                                     resources=3,
                                                     influence=2)
        self.planet_mecatol = Planet.objects.create(name="Mecatol Rex",
                                                    resources=1,
                                                    influence=6)
        self.arborec_system.planets.set([self.planet_nestphar])
        self.mecatol_system.planets.set([self.planet_mecatol])

        self.arborec_faction = Faction.objects.create(name="Arborec", home_system=self.arborec_system)
        self.letnev_faction = Faction.objects.create(name="Letnev",
                                                     home_system=System.objects.create(name="Letnev System",
                                                                                       tile_id=102))

        self.tile_0_0 = Tile.objects.create(designation="0-0", system=self.mecatol_system)
        self.tile_1 = Tile.objects.create(designation="1", system=self.arborec_system)
        self.tile_1_0 = Tile.objects.create(designation="1-0")

        self.tile_0_0.adjacent_tiles.add(self.tile_1, self.tile_1_0)
        self.tile_1.adjacent_tiles.add(self.tile_0_0)
        self.tile_1_0.adjacent_tiles.add(self.tile_0_0)

        self.player1 = Player.objects.create(
            username="Player 1",
            faction=self.arborec_faction,
            starting_position=self.tile_1
        )
        self.player2 = Player.objects.create(
            username="Player 2",
            faction=self.letnev_faction,
            starting_position=self.tile_1_0
        )

        self.game = Game.objects.create(name="Test Game")
        self.game.players.set([self.player1, self.player2])
        self.game.board.set([self.tile_0_0, self.tile_1, self.tile_1_0])

    def test_game_to_json(self):
        game_json = self.game.to_json()

        # Expected output
        expected_json = {
            "name": "Test Game",
            "players": [
                {
                    "username": "Player 1",
                    "faction": "Arborec",
                    "starting_position": "1"
                },
                {
                    "username": "Player 2",
                    "faction": "Letnev",
                    "starting_position": "1-0"
                }
            ],
            "board": [
                {
                    "designation": "0-0",
                    "system": {
                        "name": "Mecatol Rex System",
                        "tile_id": "18",
                        "anomaly": "none",
                        "wormhole": "none",
                        "planets": [{
                            "name": "Mecatol Rex",
                            "resources": 1,
                            "influence": 6,
                            "trait": "none",
                            "tech_specialty": "none",
                            "ground_forces": None
                        }],
                        "fleet": None
                    },
                    "adjacent_tiles": ["1", "1-0"]
                },
                {
                    "designation": "1",
                    "system": {
                        "name": "Arborec System",
                        "tile_id": "101",
                        "anomaly": "none",
                        "wormhole": "none",
                        "planets": [{
                            "name": "Nestphar",
                            "resources": 3,
                            "influence": 2,
                            "trait": "none",
                            "tech_specialty": "none",
                            "ground_forces": None
                        }],
                        "fleet": None
                    },
                    "adjacent_tiles": ["0-0"]
                },
                {
                    "designation": "1-0",
                    "system": None,
                    "adjacent_tiles": ["0-0"]
                }
            ]
        }

        self.assertEqual(game_json, expected_json)
        self.assertEqual(len(game_json["players"]), 2)
        self.assertEqual(len(game_json["board"]), 3)
        self.assertEqual(game_json["board"][0]["designation"], "0-0")
        self.assertEqual(game_json["players"][0]["starting_position"], "1")


class TestUnitJsonOutput(TestCase):
    def setUp(self):
        Game.objects.all().delete()
        Player.objects.all().delete()
        Tile.objects.all().delete()
        System.objects.all().delete()
        Faction.objects.all().delete()
        Planet.objects.all().delete()

        self.mecatol_system = System.objects.create(name="Mecatol Rex System", tile_id=18)
        self.arborec_system = System.objects.create(name="Arborec System", tile_id=101)
        self.planet_nestphar = Planet.objects.create(name="Nestphar",
                                                     resources=3,
                                                     influence=2)
        self.planet_mecatol = Planet.objects.create(name="Mecatol Rex",
                                                    resources=1,
                                                    influence=6)
        self.arborec_system.planets.set([self.planet_nestphar])
        self.mecatol_system.planets.set([self.planet_mecatol])

        self.arborec_faction = Faction.objects.create(name="Arborec", home_system=self.arborec_system)

        self.tile_0_0 = Tile.objects.create(designation="0-0", system=self.mecatol_system)
        self.tile_1 = Tile.objects.create(designation="1", system=self.arborec_system)

        self.tile_0_0.adjacent_tiles.add(self.tile_1)
        self.tile_1.adjacent_tiles.add(self.tile_0_0)

        self.player1 = Player.objects.create(
            username="Player 1",
            faction=self.arborec_faction,
            starting_position=self.tile_1
        )

        self.structures = [Structure.objects.create(struct_class=StructureClass.SPACE_DOCK),
                           Structure.objects.create(struct_class=StructureClass.PDS)]
        self.ground_units = [GroundUnit.objects.create(unit_class=GroundUnitClass.MECH),
                             GroundUnit.objects.create(unit_class=GroundUnitClass.INFANTRY),
                             GroundUnit.objects.create(unit_class=GroundUnitClass.INFANTRY),
                             GroundUnit.objects.create(unit_class=GroundUnitClass.INFANTRY)]
        self.test_ground_forces = GroundForces.objects.create(owner=self.player1.username)
        self.test_ground_forces.structures.set(self.structures)
        self.test_ground_forces.units.set(self.ground_units)

        self.planet_mecatol = Planet.objects.get(name = "Mecatol Rex")
        self.planet_mecatol.ground_forces = self.test_ground_forces
        self.planet_mecatol.save()

        self.ships = [Ship.objects.create(ship_class=ShipClass.DESTROYER),
                      Ship.objects.create(ship_class=ShipClass.DESTROYER),
                      Ship.objects.create(ship_class=ShipClass.DREADNOUGHT),
                      Ship.objects.create(ship_class=ShipClass.FIGHTER)]

        self.test_fleet = Fleet.objects.create(owner=self.player1.username)
        self.test_fleet.ships.set(self.ships)
        self.mecatol_system.fleet = self.test_fleet

        self.game = Game.objects.create(name="Test Game")
        self.game.players.set([self.player1])
        self.game.board.set([self.tile_0_0, self.tile_1])

    def test_system_to_json(self):
        system_json = self.mecatol_system.to_json()
        expected_json = {'name': 'Mecatol Rex System', 'tile_id': 18, 'anomaly': 'none', 'wormhole': 'none',
                         'planets': [{'name': 'Mecatol Rex', 'resources': 1, 'influence': 6, 'trait': 'none',
                                      'tech_specialty': 'none',
                                      'ground_forces': {'owner': 'Player 1', 'structures': ['spaceDock', 'pds'],
                                                       'units': ['mech', 'infantry', 'infantry', 'infantry']}}],
                         'fleet': {'owner': 'Player 1', 'ships': ['destroyer', 'destroyer', 'dreadnought', 'fighter']}}
        self.assertEqual(system_json, expected_json)
        self.assertEqual(len(system_json["fleet"]), 2)
        self.assertEqual(system_json["fleet"]["owner"], "Player 1")
        self.assertEqual(len(system_json["fleet"]["ships"]), 4)

# class TestContestedSystemJsonOutput(TestCase):
#     def setUp(self):
#         #todo
