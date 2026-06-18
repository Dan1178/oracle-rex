"""LLM-oriented board serialization for the strategy and move prompts.

The board graph produced by the models' ``to_json()`` (and sent verbatim by the
frontend) backs the stable M5 API contract, so it is **not** changed here. But it
carries a lot the LLM does not need: the redundant ``system.name`` (implied by
``tile_id``), default-valued fields emitted on nearly every tile/planet
(``anomaly``/``wormhole``/``trait``/``tech_specialty`` = ``"none"``,
``legendary`` = ``false``), and ``null`` fleets / empty ground forces. Shipping
all of that with ``json.dumps(..., indent=2)`` inflates the two largest prompts
(strategy, move) — the ``system.py`` TODO ("a different set of to_json methods
for passing to the LLM") asks for exactly this.

This module is that LLM serializer. It runs in three stacking steps:

  1. **Prune** — drop redundant / default / null fields from a *copy* of the
     board, keeping everything strategically meaningful (tile_id, anomaly,
     wormhole, planet resources/influence/trait/tech_specialty/legendary, fleets,
     ground forces, adjacency, players).
  2. **Compact** — ``json.dumps`` with no indentation and tight separators.
  3. **TOON** — an optional token-oriented encoding, selected by env var, gated
     behind a live-key quality eval (see ``AI_BOARD_PAYLOAD_FORMAT``).

``encode_board_payload`` is the single entry point both prompt builders call, so
the JSON↔TOON choice is one switch (handy for the eval and for rollback).
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict

# Which encoding the LLM board payload uses. ``json`` (pruned + compact) is the
# safe default and the rollback target. ``toon`` is implemented behind a live-key
# quality eval gate (a model may parse nested TOON less reliably than JSON on this
# data) and is not enabled until that eval passes — see Milestone 6B step 3.
BOARD_PAYLOAD_FORMAT = os.environ.get("AI_BOARD_PAYLOAD_FORMAT", "json").lower()

# Field values that carry no information when at their model default, so the
# pruned payload omits the key entirely rather than emitting the default.
_DEFAULT_NONE = "none"


def _prune_counts(counts: Any) -> Dict[str, int]:
    """Keep only the positive entries of a unit/structure/ship count map."""
    if not isinstance(counts, dict):
        return {}
    return {unit: n for unit, n in counts.items() if isinstance(n, int) and n > 0}


def _prune_fleet(fleet: Any) -> Dict[str, Any] | None:
    """A fleet, with zero-count ship types dropped; ``None`` if it has no ships."""
    if not fleet:
        return None
    ships = _prune_counts(fleet.get("ships"))
    if not ships:
        return None
    return {"owner": fleet.get("owner"), "ships": ships}


def _prune_ground_forces(gf: Any) -> Dict[str, Any] | None:
    """Ground forces with zero counts dropped; ``None`` if nothing is present."""
    if not gf:
        return None
    structures = _prune_counts(gf.get("structures"))
    units = _prune_counts(gf.get("units"))
    if not structures and not units:
        return None
    out: Dict[str, Any] = {"owner": gf.get("owner")}
    if structures:
        out["structures"] = structures
    if units:
        out["units"] = units
    return out


def _prune_planet(planet: Dict[str, Any]) -> Dict[str, Any]:
    """A planet keeping resources/influence and only non-default attributes."""
    out: Dict[str, Any] = {
        "name": planet["name"],
        "resources": planet.get("resources", 0),
        "influence": planet.get("influence", 0),
    }
    if planet.get("trait") and planet["trait"] != _DEFAULT_NONE:
        out["trait"] = planet["trait"]
    if planet.get("tech_specialty") and planet["tech_specialty"] != _DEFAULT_NONE:
        out["tech_specialty"] = planet["tech_specialty"]
    if planet.get("legendary"):
        out["legendary"] = True
    gf = _prune_ground_forces(planet.get("ground_forces"))
    if gf:
        out["ground_forces"] = gf
    return out


def _prune_system(system: Dict[str, Any]) -> Dict[str, Any]:
    """A system identified by tile_id (name dropped), default fields omitted."""
    out: Dict[str, Any] = {"tile_id": system["tile_id"]}
    if system.get("anomaly") and system["anomaly"] != _DEFAULT_NONE:
        out["anomaly"] = system["anomaly"]
    if system.get("wormhole") and system["wormhole"] != _DEFAULT_NONE:
        out["wormhole"] = system["wormhole"]
    planets = [_prune_planet(p) for p in system.get("planets", [])]
    if planets:
        out["planets"] = planets
    fleet = _prune_fleet(system.get("fleet"))
    if fleet:
        out["fleet"] = fleet
    return out


def _prune_tile(tile: Dict[str, Any]) -> Dict[str, Any]:
    """A board position. Empty tiles collapse to designation + adjacency.

    Adjacency is kept (the strategy prompt reasons about neighbors), but empty
    tiles drop the ``system`` key instead of emitting ``null``.
    """
    out: Dict[str, Any] = {"designation": tile["designation"]}
    if tile.get("system"):
        out["system"] = _prune_system(tile["system"])
    if tile.get("adjacent_tiles"):
        out["adjacent_tiles"] = tile["adjacent_tiles"]
    return out


def prune_board_payload(game_json: Dict[str, Any]) -> Dict[str, Any]:
    """Return an LLM-oriented copy of ``game_json`` with the noise removed.

    Does not mutate the input. Drops the top-level board ``name`` label and, per
    tile/system/planet, the redundant/default/null fields described in the module
    docstring. Players are kept intact — usernames link fleets and ground forces
    to their owner.
    """
    return {
        "players": game_json.get("players", []),
        "board": [_prune_tile(t) for t in game_json.get("board", [])],
    }


def _encode_compact_json(payload: Dict[str, Any]) -> str:
    return json.dumps(payload, separators=(",", ":"))


def _encode_toon(payload: Dict[str, Any]) -> str:
    # Step 3: replace this with a maintained TOON encoder (e.g. python-toon, or
    # the official toon-format package when it ships) once the live-key quality
    # eval confirms output holds on real boards. Until then the json path is the
    # only supported format, so selecting toon fails loudly rather than silently
    # shipping an unvetted payload.
    raise NotImplementedError(
        "TOON board payload is not enabled yet (pending the Milestone 6B live-key "
        "quality eval). Set AI_BOARD_PAYLOAD_FORMAT=json."
    )


def encode_board_payload(game_json: Dict[str, Any], fmt: str | None = None) -> str:
    """Prune ``game_json`` and encode it for an LLM prompt.

    ``fmt`` overrides ``AI_BOARD_PAYLOAD_FORMAT`` (used by the measurement
    harness to compare encodings). Always prunes first; the format only chooses
    how the pruned structure is serialized.
    """
    pruned = prune_board_payload(game_json)
    chosen = (fmt or BOARD_PAYLOAD_FORMAT).lower()
    if chosen == "toon":
        return _encode_toon(pruned)
    return _encode_compact_json(pruned)
