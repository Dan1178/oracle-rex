from django.test import TestCase

from ...models import Game, Player, Tile, System, Faction, Planet


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
                        "anomaly": "none",
                        "wormhole": "none",
                        "planets": [{
                            "name": "Mecatol Rex",
                            "resources": 1,
                            "influence": 6,
                            "trait": "none",
                            "tech_specialty": "none"
                        }]
                    },
                    "adjacent_tiles": ["1", "1-0"]
                },
                {
                    "designation": "1",
                    "system": {
                        "name": "Arborec System",
                        "anomaly": "none",
                        "wormhole": "none",
                        "planets": [{
                            "name": "Nestphar",
                            "resources": 3,
                            "influence": 2,
                            "trait": "none",
                            "tech_specialty": "none"
                        }]
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
