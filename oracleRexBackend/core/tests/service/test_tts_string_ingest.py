from django.test import TestCase
from django.core.exceptions import ValidationError
from unittest.mock import patch

from ...models import System, Tile
from ...service.tts_string_ingest import transformString


class TestCreateBoardFromIds(TestCase):

    # todo: test valid case

    def test_too_few_ids(self):
        id_string = "18 101 26"  # Only 3 IDs, need 36
        with self.assertRaises(ValidationError) as cm:
            transformString(id_string)
        self.assertIn("Wrong number of input ids. Please ensure id count is equal to 36", str(cm.exception))

    def test_too_many_ids(self):
        id_string = "18 101 26 38 34 41 16 " + "1 " * 30  # 37 IDs
        with self.assertRaises(ValidationError) as cm:
            transformString(id_string)
        self.assertIn("Wrong number of input ids. Please ensure id count is equal to 36", str(cm.exception))

    def test_duplicate_ids(self):
        id_string = "78 40 42 26 28 38 76 43 21 44 77 26 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"  # 26 repeated
        with self.assertRaises(ValidationError) as cm:
            transformString(id_string)
        self.assertIn("Invalid input: Duplicate tile IDs found.", str(cm.exception))

    def test_invalid_ids_too_high(self):
        id_string = "78 40 42 67 28 38 76 43 21 44 77 999 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"
        with self.assertRaises(ValidationError) as cm:
            transformString(id_string)
        self.assertIn("Invalid IDs: [999] found in TTS String. All IDs should be between 1 and 82.", str(cm.exception))

    def test_invalid_ids_too_low(self):
        id_string = "78 40 42 67 28 38 76 43 21 44 77 0 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"
        with self.assertRaises(ValidationError) as cm:
            transformString(id_string)
        self.assertIn("Invalid IDs: [0] found in TTS String. All IDs should be between 1 and 82.", str(cm.exception))

    def test_invalid_ids_negative_num(self):
        id_string = "78 40 42 67 28 38 76 43 21 44 77 -4 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"
        with self.assertRaises(ValidationError) as cm:
            transformString(id_string)
        self.assertIn("Invalid IDs: [-4] found in TTS String. All IDs should be between 1 and 82.", str(cm.exception))

    def test_invalid_home_system_id(self):
        # Invalid ID (e.g., 0 not in mapping)
        id_string = "78 40 42 67 28 38 76 43 21 44 77 63 50 64 74 48 49 39 51 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25"  # 51 not a valid home system id
        with self.assertRaises(ValidationError) as cm:
            transformString(id_string)
        self.assertIn("Invalid IDs for home systems found in TTS String: [51].", str(cm.exception))
