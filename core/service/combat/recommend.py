"""Fleet-composition recommendation search.

Uses the simulator as the evaluation function to find the minimum fleet that
reaches ~50% win odds and a stronger fleet for ~80%, ignoring the player's input
fleet (the recommendation answers "what *should* I bring", not "is what I have
enough"). The search is greedy and incremental — add the unit that most improves
the win probability, re-simulate, stop at the threshold — and bounded so it
always terminates. Sim results are memoized by composition so repeated states are
not re-rolled.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Tuple

from .simulator import enemy_holds_planet, win_probability, _normalize
from .units import ALL_UNITS

# Combat-worthy candidates only (fighters need carrier capacity and hit on 9;
# carriers are pure capacity) — recommendations are about fighting power.
SPACE_CANDIDATES: List[str] = ["cruiser", "dreadnought", "destroyer", "war_sun"]
GROUND_CANDIDATES: List[str] = ["infantry", "mechs"]

MIN_THRESHOLD = 0.50
REC_THRESHOLD = 0.80
# Lower trial count for the inner search (many evaluations); the headline
# win_probability is measured separately at full resolution.
SEARCH_TRIALS = 1000
MAX_UNITS = 40  # hard bound so the greedy walk always terminates
_EPSILON = 1e-9

# Per-player component limits (TI4 PoK): the recommendation must never suggest
# more of a unit than a player physically owns (this prevented nonsense like 40
# cruisers against a maxed-out enemy). Only the recommendation's candidate units
# need a cap here; infantry is token-extendable, so it is intentionally uncapped.
# Keep these in sync with frontend/src/features/battleCalculator/units.ts.
CAPS: Dict[str, int] = {
    "cruiser": 8,
    "dreadnought": 5,
    "destroyer": 8,
    "war_sun": 2,
    "mechs": 4,
}

Fleet = Dict[str, int]


def _merge(fleet: Fleet, ground: Fleet) -> Dict[str, int]:
    out = {k: v for k, v in fleet.items() if v}
    for k, v in ground.items():
        if v:
            out[k] = v
    return out


def recommend_fleets(
    force_data: Dict[str, Any], seed: int | None = None
) -> Tuple[Dict[str, int], Dict[str, int]]:
    """Return (minimum_fleet, recommended_fleet) as merged ``{unit: count}`` maps.

    ``minimum_fleet`` ⊆ ``recommended_fleet`` (the search keeps growing one
    composition), so the two are consistent.
    """
    fd = _normalize(force_data)
    enemy_fleet = fd["enemy_fleet"]
    enemy = fd["enemy_ground_forces_and_structures"]
    planet = enemy_holds_planet(fd)

    cache: Dict[Tuple, float] = {}

    def evaluate(fleet: Fleet, ground: Fleet) -> float:
        key = (tuple(sorted(fleet.items())), tuple(sorted(ground.items())))
        if key not in cache:
            trial_fd = {
                "friendly_fleet": fleet,
                "enemy_fleet": enemy_fleet,
                "friendly_ground_forces": ground,
                "enemy_ground_forces_and_structures": enemy,
            }
            cache[key] = win_probability(trial_fd, trials=SEARCH_TRIALS, seed=seed)
        return cache[key]

    def space_clear_prob(fleet: Fleet) -> float:
        # Win odds against the enemy fleet + PDS alone, ignoring the planet.
        trial_fd = {
            "friendly_fleet": fleet,
            "enemy_fleet": enemy_fleet,
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": (
                {"pds": enemy.get("pds", 0)} if enemy.get("pds") else {}
            ),
        }
        return win_probability(trial_fd, trials=SEARCH_TRIALS, seed=seed)

    enemy_ground_total = enemy.get("infantry", 0) + enemy.get("mechs", 0)

    fleet: Fleet = {}
    ground: Fleet = {}
    minimum: Dict[str, int] | None = None

    def total_units() -> int:
        return sum(fleet.values()) + sum(ground.values())

    def can_add(unit: str, is_ground: bool) -> bool:
        cap = CAPS.get(unit)
        target = ground if is_ground else fleet
        return cap is None or target.get(unit, 0) < cap

    # When the greedy step can't improve the odds, fall back to raw space power
    # in priority order, skipping any type already at its component cap (so a
    # maxed enemy yields a full legal fleet, not a pile of one capped unit).
    space_order = ["cruiser", "dreadnought", "war_sun", "destroyer"]

    def next_space() -> str | None:
        return next((u for u in space_order if can_add(u, False)), None)

    current = evaluate(fleet, ground)
    while current < REC_THRESHOLD and total_units() < MAX_UNITS:
        best_unit: str | None = None
        best_is_ground = False
        best_score = 0.0  # win-probability gain per resource spent

        candidates: List[Tuple[str, bool]] = [(u, False) for u in SPACE_CANDIDATES]
        if planet:
            candidates += [(u, True) for u in GROUND_CANDIDATES]

        # Pick the most resource-efficient addition (gain / cost). The evaluator
        # uses common random numbers (same seed every call), so these marginal
        # gains are comparable without sampling noise.
        for unit, is_ground in candidates:
            if not can_add(unit, is_ground):
                continue
            target = ground if is_ground else fleet
            target[unit] = target.get(unit, 0) + 1
            wp = evaluate(fleet, ground)
            target[unit] -= 1
            gain = wp - current
            if gain <= _EPSILON:
                continue
            score = gain / ALL_UNITS[unit].cost
            if score > best_score:
                best_score, best_unit, best_is_ground = score, unit, is_ground

        if best_unit is None:
            # No candidate improved the odds (the all-zero early regime): make
            # structural progress toward a winnable composition instead of
            # stalling — first enough space power to clear, then enough ground.
            # Respect component caps; if nothing addable remains, stop growing.
            space_unit = next_space()
            if space_clear_prob(fleet) < MIN_THRESHOLD and space_unit:
                best_unit, best_is_ground = space_unit, False
            elif (
                planet
                and sum(ground.values()) <= enemy_ground_total
                and can_add("infantry", True)
            ):
                best_unit, best_is_ground = "infantry", True
            elif space_unit:
                best_unit, best_is_ground = space_unit, False
            else:
                break

        target = ground if best_is_ground else fleet
        target[best_unit] = target.get(best_unit, 0) + 1
        current = evaluate(fleet, ground)

        if minimum is None and current >= MIN_THRESHOLD:
            minimum = _merge(fleet, ground)

    recommended = _merge(fleet, ground)
    if minimum is None:
        # Never reached 50% within the bound — best effort is the full build.
        minimum = dict(recommended)
    return minimum, recommended
