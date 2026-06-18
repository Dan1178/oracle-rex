"""Deterministic combat simulation for the Battle Calculator.

Public entry point: :func:`simulate`. It runs the Monte-Carlo simulator for the
headline win probability and the greedy search for fleet recommendations, and
returns a structured result the endpoint serves and the (optional) LLM explains.
"""

from __future__ import annotations

from typing import Any, Dict

from .recommend import MIN_THRESHOLD, REC_THRESHOLD, recommend_fleets
from .simulator import (
    DEFAULT_TRIALS,
    attacker_has_ground,
    enemy_holds_planet,
    win_probability,
    _normalize,
)
from .units import FLAGSHIP_IS_GENERIC

# Caveats surfaced so the UI can be honest about the model's limits.
_BASE_STATS_NOTE = "Base unit stats; unit-upgrade techs are not modeled."
_FLAGSHIP_NOTE = "Flagship uses generic stats (faction flagships vary)."


def _has_flagship(fd: Dict[str, Dict[str, int]]) -> bool:
    return fd["friendly_fleet"].get("flagship", 0) > 0 or fd["enemy_fleet"].get(
        "flagship", 0
    ) > 0


def simulate(
    force_data: Dict[str, Any],
    trials: int = DEFAULT_TRIALS,
    seed: int | None = None,
) -> Dict[str, Any]:
    """Compute win probability + fleet recommendations for a battle.

    Returns ``{win_probability, win_percent, minimum_fleet, recommended_fleet,
    breakdown}``. ``win_probability`` is a float in [0, 1]; ``win_percent`` is the
    same rounded to a whole percent for display.
    """
    fd = _normalize(force_data)
    probability = win_probability(force_data, trials=trials, seed=seed)
    minimum_fleet, recommended_fleet = recommend_fleets(force_data, seed=seed)

    planet = enemy_holds_planet(fd)
    notes = [_BASE_STATS_NOTE]
    if _has_flagship(fd) and FLAGSHIP_IS_GENERIC:
        notes.append(_FLAGSHIP_NOTE)

    breakdown = {
        "trials": trials,
        "planet_invasion_required": planet,
        "blocked_no_ground": planet and not attacker_has_ground(fd),
        "min_threshold": MIN_THRESHOLD,
        "rec_threshold": REC_THRESHOLD,
        "notes": notes,
    }

    return {
        "win_probability": probability,
        "win_percent": round(probability * 100),
        "minimum_fleet": minimum_fleet,
        "recommended_fleet": recommended_fleet,
        "breakdown": breakdown,
    }


__all__ = ["simulate", "win_probability", "recommend_fleets"]
