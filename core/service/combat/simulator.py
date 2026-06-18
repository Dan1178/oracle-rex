"""Deterministic (Monte-Carlo) Twilight Imperium combat simulator.

Replaces the LLM's unreliable dice arithmetic with codified rules. One trial
plays out a full engagement — Space Cannon Offense, Anti-Fighter Barrage, space
combat rounds, Bombardment, then ground invasion — and reports whether the
attacker (the "friendly" side, moving in) clears the system and, when the enemy
holds the planet, takes it too. ``win_probability`` runs many seeded trials.

Modelling notes / simplifications (surfaced to the UI via the result breakdown):
  * Base unit stats only — unit-upgrade techs (Cruiser II, etc.) are not tracked.
  * Generic flagship (see ``units.FLAGSHIP_IS_GENERIC``).
  * Planetary Shield is not modelled, so Bombardment is never blocked (the legacy
    prompt wrongly tied this to PDS; the real blocker is Planetary Shield).
  * No retreats — the attacker fights to a decision, which is what a win-odds
    question asks.
"""

from __future__ import annotations

import random
from typing import Any, Dict, List

from .units import GROUND, SHIPS, UnitStats

# d10 combat. Safety cap on combat rounds — units strictly decrease so a real
# engagement ends quickly; the cap only guards a pathological all-miss streak.
DIE_SIDES = 10
MAX_ROUNDS = 100
DEFAULT_TRIALS = 10_000

# Keys in enemy_ground_forces_and_structures that mean "the enemy holds the
# planet" (so the attacker must invade to win), even with no ground combatants.
_PLANET_KEYS = ("infantry", "mechs", "pds", "space_dock")


class _Combatant:
    """One unit instance during a battle; tracks whether it has sustained."""

    __slots__ = ("stats", "sustained")

    def __init__(self, stats: UnitStats):
        self.stats = stats
        self.sustained = False


def _expand(counts: Dict[str, int], table: Dict[str, UnitStats]) -> List[_Combatant]:
    units: List[_Combatant] = []
    for key, stats in table.items():
        for _ in range(int(counts.get(key, 0) or 0)):
            units.append(_Combatant(stats))
    return units


def _roll(rng: random.Random, hit_on: int, dice: int) -> int:
    return sum(1 for _ in range(dice) if rng.randint(1, DIE_SIDES) >= hit_on)


def _roll_combat_hits(units: List[_Combatant], rng: random.Random) -> int:
    hits = 0
    for u in units:
        if u.stats.combat is not None:
            hits += _roll(rng, u.stats.combat, u.stats.dice)
    return hits


def _roll_ability(
    units: List[_Combatant], attr: str, rng: random.Random
) -> int:
    """Sum hits from a named special ability (afb / bombardment) across units."""
    hits = 0
    for u in units:
        spec = getattr(u.stats, attr)
        if spec is not None:
            hits += _roll(rng, spec[0], spec[1])
    return hits


def assign_hits(units: List[_Combatant], n_hits: int) -> List[_Combatant]:
    """Return the survivors after the owner optimally absorbs ``n_hits``.

    Sustain Damage cancels a hit for free (the unit survives, damaged), so the
    owner sustains first — preferring the most valuable units, which keeps the
    biggest guns firing — and only then loses units, cheapest first.
    """
    if n_hits <= 0 or not units:
        return units

    # 1. Soak with available sustains, most valuable units first.
    sustainers = sorted(
        (u for u in units if u.stats.sustain and not u.sustained),
        key=lambda u: u.stats.cost,
        reverse=True,
    )
    for u in sustainers:
        if n_hits <= 0:
            break
        u.sustained = True
        n_hits -= 1
    if n_hits <= 0:
        return units

    # 2. Destroy the cheapest remaining units for the leftover hits.
    survivors = sorted(units, key=lambda u: u.stats.cost)
    return survivors[n_hits:]


def _remove_fighters(units: List[_Combatant], n: int) -> List[_Combatant]:
    """Remove up to ``n`` fighters (Anti-Fighter Barrage only hits fighters)."""
    if n <= 0:
        return units
    out: List[_Combatant] = []
    removed = 0
    for u in units:
        if u.stats.is_fighter and removed < n:
            removed += 1
            continue
        out.append(u)
    return out


def _normalize(force_data: Dict[str, Any]) -> Dict[str, Dict[str, int]]:
    def m(key: str) -> Dict[str, int]:
        val = force_data.get(key) or {}
        return {k: int(v or 0) for k, v in val.items()}

    return {
        "friendly_fleet": m("friendly_fleet"),
        "enemy_fleet": m("enemy_fleet"),
        "friendly_ground_forces": m("friendly_ground_forces"),
        "enemy_ground_forces_and_structures": m("enemy_ground_forces_and_structures"),
    }


def enemy_holds_planet(fd: Dict[str, Dict[str, int]]) -> bool:
    enemy = fd["enemy_ground_forces_and_structures"]
    return any(enemy.get(k, 0) > 0 for k in _PLANET_KEYS)


def attacker_has_ground(fd: Dict[str, Dict[str, int]]) -> bool:
    g = fd["friendly_ground_forces"]
    return any(g.get(k, 0) > 0 for k in ("infantry", "mechs"))


def simulate_once(fd: Dict[str, Dict[str, int]], rng: random.Random) -> bool:
    """Play one engagement; return True if the attacker wins (clears + invades)."""
    attacker = _expand(fd["friendly_fleet"], SHIPS)
    defender = _expand(fd["enemy_fleet"], SHIPS)
    enemy = fd["enemy_ground_forces_and_structures"]
    holds_planet = enemy_holds_planet(fd)

    # 1. Space Cannon Offense — enemy PDS fires at the attacker's ships, once.
    pds = enemy.get("pds", 0)
    if pds and attacker:
        attacker = assign_hits(attacker, _roll(rng, 6, pds))

    # 2. Anti-Fighter Barrage — both sides' destroyers, first round only.
    if attacker and defender:
        a_afb = _roll_ability(attacker, "afb", rng)
        d_afb = _roll_ability(defender, "afb", rng)
        defender = _remove_fighters(defender, a_afb)
        attacker = _remove_fighters(attacker, d_afb)

    # 3. Space combat — simultaneous rounds until one fleet is gone.
    rounds = 0
    while attacker and defender and rounds < MAX_ROUNDS:
        a_hits = _roll_combat_hits(attacker, rng)
        d_hits = _roll_combat_hits(defender, rng)
        defender, attacker = assign_hits(defender, a_hits), assign_hits(attacker, d_hits)
        rounds += 1

    if not attacker:
        return False  # attacker fleet wiped — system not cleared
    if not holds_planet:
        return True  # space cleared and nothing to invade

    # Enemy holds the planet: the attacker must land ground forces to take it.
    if not attacker_has_ground(fd):
        return False

    enemy_ground = _expand(enemy, GROUND)

    # 4. Bombardment — surviving attacker dreadnoughts/war suns, once.
    if enemy_ground:
        b_hits = _roll_ability(attacker, "bombardment", rng)
        enemy_ground = assign_hits(enemy_ground, b_hits)

    # 5. Ground combat — simultaneous rounds until one side's ground is gone.
    attacker_ground = _expand(fd["friendly_ground_forces"], GROUND)
    rounds = 0
    while attacker_ground and enemy_ground and rounds < MAX_ROUNDS:
        a_hits = _roll_combat_hits(attacker_ground, rng)
        e_hits = _roll_combat_hits(enemy_ground, rng)
        enemy_ground, attacker_ground = (
            assign_hits(enemy_ground, a_hits),
            assign_hits(attacker_ground, e_hits),
        )
        rounds += 1

    # Planet taken if the defenders are gone and an attacker ground unit remains.
    return bool(attacker_ground) and not enemy_ground


def win_probability(
    force_data: Dict[str, Any], trials: int = DEFAULT_TRIALS, seed: int | None = None
) -> float:
    """Fraction of ``trials`` the attacker wins, with a seeded RNG.

    Short-circuits the deterministic 0% case (enemy holds the planet but the
    attacker brought no ground forces) without sampling.
    """
    fd = _normalize(force_data)
    if enemy_holds_planet(fd) and not attacker_has_ground(fd):
        return 0.0
    rng = random.Random(seed)
    wins = sum(1 for _ in range(trials) if simulate_once(fd, rng))
    return wins / trials
