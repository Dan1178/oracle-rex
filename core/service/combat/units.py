"""Twilight Imperium (4e + Prophecy of Kings) unit combat stats.

Base, un-upgraded values — the app tracks no unit-upgrade techs, so the simulator
uses base stats (e.g. Cruiser II's 6 / Fighter II's 8 are not reflected). The
flagship is faction-specific in the real game; v1 uses a single labelled "generic
flagship" approximation (see ``FLAGSHIP_IS_GENERIC``).

Keys match the ``force_data`` payload the Battle Calculator sends. Note the ground
mech arrives under the plural key ``"mechs"`` (preserved from the legacy
frontend), while every other key is singular.
"""

from __future__ import annotations

from dataclasses import dataclass

# v1 flagship handling: one generic sustain-damage line rather than per-faction
# stats. Surfaced in the result breakdown so the UI can label it.
FLAGSHIP_IS_GENERIC = True


@dataclass(frozen=True)
class UnitStats:
    key: str
    # Hit-on value for space (ships) or ground (infantry/mech) combat; ``None``
    # for units with no combat dice (PDS, space dock).
    combat: int | None
    dice: int = 1
    # Sustain Damage: can cancel one hit by taking damage before being destroyed.
    sustain: bool = False
    # (hit_on, dice) for the unit's Anti-Fighter Barrage / Bombardment / Space
    # Cannon abilities; ``None`` when the unit lacks the ability.
    afb: tuple[int, int] | None = None
    bombardment: tuple[int, int] | None = None
    space_cannon: tuple[int, int] | None = None
    # Resource cost — drives recommendation efficiency and hit-assignment order
    # (cheaper units soak hits first so sustain on capital ships is preserved).
    cost: float = 1.0
    is_fighter: bool = False


# --- Ships (space combat) --------------------------------------------------

SHIPS: dict[str, UnitStats] = {
    "fighter": UnitStats("fighter", combat=9, cost=0.5, is_fighter=True),
    "destroyer": UnitStats("destroyer", combat=9, afb=(9, 2), cost=1.0),
    "cruiser": UnitStats("cruiser", combat=7, cost=2.0),
    "carrier": UnitStats("carrier", combat=9, cost=3.0),
    "dreadnought": UnitStats(
        "dreadnought", combat=5, sustain=True, bombardment=(5, 1), cost=4.0
    ),
    "war_sun": UnitStats(
        "war_sun", combat=3, dice=3, sustain=True, bombardment=(3, 3), cost=12.0
    ),
    # Generic flagship approximation (faction flagships vary): a sustain-damage
    # capital with two dice at 5. Labelled in the result breakdown.
    "flagship": UnitStats("flagship", combat=5, dice=2, sustain=True, cost=8.0),
}

# --- Ground forces ---------------------------------------------------------

GROUND: dict[str, UnitStats] = {
    "infantry": UnitStats("infantry", combat=8, cost=0.5),
    "mechs": UnitStats("mechs", combat=6, sustain=True, cost=2.0),
}

# --- Structures (no combat dice) -------------------------------------------

STRUCTURES: dict[str, UnitStats] = {
    # PDS fires Space Cannon Offense at the attacker's ships once, before combat.
    "pds": UnitStats("pds", combat=None, space_cannon=(6, 1), cost=2.0),
    # Space docks have no combat power; their presence just means the enemy
    # controls the planet (so it must be invaded to win).
    "space_dock": UnitStats("space_dock", combat=None, cost=4.0),
}

ALL_UNITS: dict[str, UnitStats] = {**SHIPS, **GROUND, **STRUCTURES}


def ship_stats(key: str) -> UnitStats | None:
    return SHIPS.get(key)


def ground_stats(key: str) -> UnitStats | None:
    return GROUND.get(key)
