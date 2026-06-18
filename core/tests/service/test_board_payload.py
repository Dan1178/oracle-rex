"""Tests for the LLM board serializer (Milestone 6B).

Covers the prune transform (drops redundant/default/null fields, keeps the
strategically meaningful ones), the compact encoding wired into the strategy and
move prompts, and a regression guard that the pruned+compact payload is smaller
than the old ``indent=2`` JSON on a real 37-tile board — measured with the
provider tokenizer, not a character estimate.
"""

import json

import tiktoken
from django.test import TestCase

from ...service.ai import serialize
from ...service.ai.prompts import (
    strategic_plan as strategic_plan_prompt,
    tactical_move as tactical_move_prompt,
)
from ...service.tts_string_ingest import build_game_from_string
from ...util.utils import reset_database

# The modern OpenAI tokenizer (GPT-4o / GPT-5 family); the default model is an
# OpenAI reasoning model, so this is the provider-accurate token count.
_ENCODING = tiktoken.get_encoding("o200k_base")

# A balanced 6-player Milty Draft board (the strategy demo scenario's TTS).
DEMO_TTS = (
    "78 40 42 67 28 38 76 43 21 44 77 63 50 64 74 48 49 39 1 71 35 16 27 36 "
    "55 31 20 58 69 45 4 23 22 57 34 25"
)


def _tokens(text: str) -> int:
    return len(_ENCODING.encode(text))


class TestPruneBoardPayload(TestCase):
    """Unit tests for the prune transform on a hand-built board dict."""

    def _sample(self):
        return {
            "name": "Test Game",
            "players": [
                {"username": "P1", "faction": "sol", "starting_position": "1"},
            ],
            "board": [
                {
                    "designation": "0-0",
                    "system": {
                        "name": "Mecatol Rex System",
                        "tile_id": "18",
                        "anomaly": "none",
                        "wormhole": "none",
                        "planets": [
                            {
                                "name": "Mecatol Rex",
                                "resources": 1,
                                "influence": 6,
                                "trait": "none",
                                "tech_specialty": "none",
                                "legendary": True,
                                "ground_forces": None,
                            }
                        ],
                        "fleet": None,
                    },
                    "adjacent_tiles": ["1", "1-0"],
                },
                {
                    "designation": "1",
                    "system": {
                        "name": "Arborec System",
                        "tile_id": "101",
                        "anomaly": "supernova",
                        "wormhole": "alpha",
                        "planets": [
                            {
                                "name": "Nestphar",
                                "resources": 3,
                                "influence": 2,
                                "trait": "industrial",
                                "tech_specialty": "green",
                                "legendary": False,
                                "ground_forces": {
                                    "owner": "P1",
                                    "structures": {"pds": 1, "space_dock": 0},
                                    "units": {"infantry": 3, "mech": 0},
                                },
                            }
                        ],
                        "fleet": {
                            "owner": "P1",
                            "ships": {"fighter": 0, "destroyer": 2, "cruiser": 0},
                        },
                    },
                    "adjacent_tiles": ["0-0"],
                },
                {"designation": "1-0", "system": None, "adjacent_tiles": ["0-0"]},
            ],
        }

    def test_does_not_mutate_input(self):
        sample = self._sample()
        before = json.dumps(sample, sort_keys=True)
        serialize.prune_board_payload(sample)
        self.assertEqual(json.dumps(sample, sort_keys=True), before)

    def test_drops_top_level_name(self):
        pruned = serialize.prune_board_payload(self._sample())
        self.assertNotIn("name", pruned)
        self.assertEqual(set(pruned), {"players", "board"})

    def test_drops_system_name_keeps_tile_id(self):
        mecatol = serialize.prune_board_payload(self._sample())["board"][0]["system"]
        self.assertNotIn("name", mecatol)
        self.assertEqual(mecatol["tile_id"], "18")

    def test_omits_default_none_fields(self):
        mecatol = serialize.prune_board_payload(self._sample())["board"][0]["system"]
        # anomaly/wormhole are "none" here -> omitted entirely.
        self.assertNotIn("anomaly", mecatol)
        self.assertNotIn("wormhole", mecatol)
        planet = mecatol["planets"][0]
        self.assertNotIn("trait", planet)
        self.assertNotIn("tech_specialty", planet)

    def test_keeps_meaningful_system_fields(self):
        arborec = serialize.prune_board_payload(self._sample())["board"][1]["system"]
        self.assertEqual(arborec["anomaly"], "supernova")
        self.assertEqual(arborec["wormhole"], "alpha")
        planet = arborec["planets"][0]
        self.assertEqual(planet["resources"], 3)
        self.assertEqual(planet["influence"], 2)
        self.assertEqual(planet["trait"], "industrial")
        self.assertEqual(planet["tech_specialty"], "green")

    def test_legendary_only_emitted_when_true(self):
        board = serialize.prune_board_payload(self._sample())["board"]
        self.assertTrue(board[0]["system"]["planets"][0]["legendary"])
        self.assertNotIn("legendary", board[1]["system"]["planets"][0])

    def test_prunes_zero_unit_and_ship_counts(self):
        arborec = serialize.prune_board_payload(self._sample())["board"][1]["system"]
        self.assertEqual(arborec["fleet"]["ships"], {"destroyer": 2})
        gf = arborec["planets"][0]["ground_forces"]
        self.assertEqual(gf["structures"], {"pds": 1})
        self.assertEqual(gf["units"], {"infantry": 3})

    def test_null_fleet_and_ground_forces_omitted(self):
        mecatol = serialize.prune_board_payload(self._sample())["board"][0]["system"]
        self.assertNotIn("fleet", mecatol)
        self.assertNotIn("ground_forces", mecatol["planets"][0])

    def test_empty_tile_collapses_keeping_adjacency(self):
        empty = serialize.prune_board_payload(self._sample())["board"][2]
        self.assertNotIn("system", empty)
        self.assertEqual(empty["designation"], "1-0")
        self.assertEqual(empty["adjacent_tiles"], ["0-0"])

    def test_players_kept_intact(self):
        pruned = serialize.prune_board_payload(self._sample())
        self.assertEqual(pruned["players"], self._sample()["players"])


class TestEncodeBoardPayload(TestCase):
    def test_compact_json_is_default_and_has_no_whitespace(self):
        encoded = serialize.encode_board_payload({"players": [], "board": []})
        self.assertNotIn("\n", encoded)
        self.assertNotIn(": ", encoded)
        self.assertEqual(json.loads(encoded), {"players": [], "board": []})

    def test_toon_format_is_gated(self):
        with self.assertRaises(NotImplementedError):
            serialize.encode_board_payload({"players": [], "board": []}, fmt="toon")


class TestPromptWiring(TestCase):
    def test_strategy_prompt_uses_compact_pruned_payload(self):
        game_json = {
            "name": "X",
            "players": [],
            "board": [{"designation": "0-0", "system": {"name": "Mecatol Rex System", "tile_id": "18"}}],
        }
        messages = strategic_plan_prompt.build_messages(game_json, "sol")
        human = messages[1].content
        self.assertIn("sol", messages[0].content)  # faction in system prompt
        self.assertIn('"tile_id":"18"', human)  # key board fact, compact
        self.assertNotIn("Mecatol Rex System", human)  # name pruned
        self.assertNotIn("\n", human)  # compact, not indent=2

    def test_move_prompt_uses_compact_pruned_payload(self):
        game_json = {"name": "X", "players": [], "board": []}
        human = tactical_move_prompt.build_messages(game_json, "letnev")[1].content
        self.assertNotIn("\n", human)
        self.assertEqual(json.loads(human), {"players": [], "board": []})


class TestPayloadSizeRegression(TestCase):
    """Measured on a real 37-tile board, with the provider tokenizer."""

    def setUp(self):
        reset_database()
        # "Test" is the default game name seeded by reset_database()/DEFAULT_GAMES.
        self.game_json = build_game_from_string(DEMO_TTS, "Test").to_json()

    def test_pruned_compact_smaller_than_legacy_indented_json(self):
        legacy = json.dumps(self.game_json, indent=2)
        compact = serialize.encode_board_payload(self.game_json)

        legacy_tok = _tokens(legacy)
        compact_tok = _tokens(compact)

        # Visible measurement (run with -v2 to see it) + the regression assertion.
        print(
            f"\n[6B board payload] real 37-tile board, o200k_base tokens:"
            f"\n  legacy indent=2 JSON : {legacy_tok:>6}"
            f"\n  pruned + compact JSON: {compact_tok:>6}"
            f"  ({1 - compact_tok / legacy_tok:.1%} smaller)"
        )
        self.assertLess(compact_tok, legacy_tok)
        # The prune is the dominant lever; expect a substantial cut, not a sliver.
        self.assertLess(compact_tok, legacy_tok * 0.7)
