from django.core.exceptions import ValidationError
from django.test import TestCase

from ...service.tts_string_ingest import build_game_from_string
from ...util.utils import reset_database


class TestCreateBoardFromIds(TestCase):

    def setUp(self):
        reset_database()

    def test_valid_case(self):
        id_string = "78 40 42 67 28 38 76 43 21 44 77 63 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"
        result_game = build_game_from_string(id_string, "Test")
        # Test correct tile amount and sanity check a few
        tile_list = list(result_game.board.all())
        self.assertEqual(37, len(tile_list))
        self.assertEqual("18", tile_list[0].system.tile_id)
        self.assertEqual("Mecatol Rex System", tile_list[0].system.name)
        self.assertEqual("40", tile_list[2].system.tile_id)
        self.assertEqual("Beta Wormhole System", tile_list[2].system.name)
        self.assertEqual("25", tile_list[36].system.tile_id)
        self.assertEqual("Quann System", tile_list[36].system.name)
        self.assertEqual("1-2", tile_list[36].designation)
        self.assertEqual("3-2", tile_list[24].designation)
        # Test Players starting positions and factions
        player_list = list(result_game.players.all())
        self.assertEqual(6, len(player_list))
        self.assertEqual("Test player 1", player_list[0].username)
        self.assertEqual("Sol System", player_list[0].starting_position.system.name)
        self.assertEqual("sol", player_list[0].faction.name)
        self.assertEqual("Test player 3", player_list[2].username)
        self.assertEqual("Titans System", player_list[2].starting_position.system.name)
        self.assertEqual("ul", player_list[2].faction.name)

    def test_too_few_ids(self):
        id_string = "18 101 26"  # Only 3 IDs, need 36
        with self.assertRaises(ValidationError) as cm:
            build_game_from_string(id_string, "Test")
        self.assertIn("Wrong number of input ids. Please ensure id count is equal to 36", str(cm.exception))

    def test_too_many_ids(self):
        id_string = "18 101 26 38 34 41 16 " + "1 " * 30  # 37 IDs
        with self.assertRaises(ValidationError) as cm:
            build_game_from_string(id_string, "Test")
        self.assertIn("Wrong number of input ids. Please ensure id count is equal to 36", str(cm.exception))

    def test_duplicate_ids(self):
        id_string = "78 40 42 26 28 38 76 43 21 44 77 26 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"  # 26 repeated
        with self.assertRaises(ValidationError) as cm:
            build_game_from_string(id_string, "Test")
        self.assertIn("Invalid input: Duplicate tile IDs found.", str(cm.exception))

    def test_invalid_ids_too_high(self):
        id_string = "78 40 42 67 28 38 76 43 21 44 77 5000 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"
        with self.assertRaises(ValidationError) as cm:
            build_game_from_string(id_string, "Test")
        self.assertIn("Invalid IDs: [5000] found in TTS String. All IDs should be between 1 and 4276.", str(cm.exception))

    def test_invalid_ids_too_low(self):
        id_string = "78 40 42 67 28 38 76 43 21 44 77 0 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"
        with self.assertRaises(ValidationError) as cm:
            build_game_from_string(id_string, "Test")
        self.assertIn("Invalid IDs: [0] found in TTS String. All IDs should be between 1 and 4276.", str(cm.exception))

    def test_invalid_ids_negative_num(self):
        id_string = "78 40 42 67 28 38 76 43 21 44 77 -4 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"
        with self.assertRaises(ValidationError) as cm:
            build_game_from_string(id_string, "Test")
        self.assertIn("Invalid IDs: [-4] found in TTS String. All IDs should be between 1 and 4276.", str(cm.exception))

    def test_invalid_home_system_id(self):
        # Invalid ID (e.g., 0 not in mapping)
        id_string = "78 40 42 67 28 38 76 43 21 44 77 63 50 64 74 48 49 39 51 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"  # 51 not a valid home system id
        with self.assertRaises(ValidationError) as cm:
            build_game_from_string(id_string, "Test")
        self.assertIn("Invalid IDs for home systems found in TTS String: [51].", str(cm.exception))
