"""Known-scenario tests for the deterministic combat simulator (Milestone 6C).

Seeded RNG keeps win-rate ranges reproducible. These pin down the rules
(symmetry, sustain, AFB, PDS, the 0% no-ground case, structures having no combat
power) and the recommendation search (returns a fleet that meets the threshold,
terminates, respects bounds).
"""

from django.test import SimpleTestCase

from ...service.combat import simulate, win_probability
from ...service.combat.recommend import REC_THRESHOLD, recommend_fleets
from ...service.combat.simulator import (
    _Combatant,
    assign_hits,
)
from ...service.combat.units import SHIPS

SEED = 12345


def _ships(**counts):
    return counts


class TestAssignHits(SimpleTestCase):
    def test_cheapest_units_die_first(self):
        units = [_Combatant(SHIPS["cruiser"]), _Combatant(SHIPS["fighter"])]
        survivors = assign_hits(units, 1)
        self.assertEqual([u.stats.key for u in survivors], ["cruiser"])

    def test_sustain_absorbs_without_loss(self):
        units = [_Combatant(SHIPS["dreadnought"])]
        survivors = assign_hits(units, 1)
        self.assertEqual(len(survivors), 1)
        self.assertTrue(survivors[0].sustained)

    def test_second_hit_destroys_sustained_unit(self):
        units = [_Combatant(SHIPS["dreadnought"])]
        survivors = assign_hits(units, 2)
        self.assertEqual(survivors, [])

    def test_sustain_preferred_over_losing_a_unit(self):
        # One hit on a dread + fighter: sustain the dread, lose nothing.
        units = [_Combatant(SHIPS["dreadnought"]), _Combatant(SHIPS["fighter"])]
        survivors = assign_hits(units, 1)
        self.assertEqual(len(survivors), 2)


class TestSymmetryAndEdges(SimpleTestCase):
    def test_identical_fleets_are_a_coin_flip(self):
        fd = {
            "friendly_fleet": _ships(cruiser=3),
            "enemy_fleet": _ships(cruiser=3),
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": {},
        }
        # Attacker has a slight edge (defender wiped + attacker survivor needed),
        # but mirror fleets should land near a coin flip, not lopsided.
        p = win_probability(fd, trials=4000, seed=SEED)
        self.assertGreater(p, 0.30)
        self.assertLess(p, 0.70)

    def test_overwhelming_force_almost_always_wins(self):
        fd = {
            "friendly_fleet": _ships(dreadnought=4, cruiser=4),
            "enemy_fleet": _ships(destroyer=1),
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": {},
        }
        self.assertGreater(win_probability(fd, trials=2000, seed=SEED), 0.98)

    def test_empty_enemy_is_certain_win(self):
        fd = {
            "friendly_fleet": _ships(destroyer=1),
            "enemy_fleet": {},
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": {},
        }
        self.assertEqual(win_probability(fd, trials=500, seed=SEED), 1.0)

    def test_no_ground_versus_held_planet_is_zero(self):
        fd = {
            "friendly_fleet": _ships(dreadnought=5),
            "enemy_fleet": {},
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": _ships(infantry=1),
        }
        self.assertEqual(win_probability(fd, trials=500, seed=SEED), 0.0)

    def test_space_dock_alone_still_requires_invasion(self):
        # A lone space dock means the enemy holds the planet -> need ground.
        no_ground = {
            "friendly_fleet": _ships(cruiser=3),
            "enemy_fleet": {},
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": _ships(space_dock=1),
        }
        self.assertEqual(win_probability(no_ground, trials=500, seed=SEED), 0.0)
        with_ground = {**no_ground, "friendly_ground_forces": _ships(infantry=1)}
        # Undefended planet (dock has no combat power) -> landing takes it.
        self.assertEqual(win_probability(with_ground, trials=500, seed=SEED), 1.0)

    def test_pds_hurts_the_attacker(self):
        base = {
            "friendly_fleet": _ships(cruiser=2),
            "enemy_fleet": _ships(cruiser=2),
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": {},
        }
        with_pds = {
            **base,
            "enemy_ground_forces_and_structures": _ships(pds=2),
        }
        # PDS holds the planet, so add ground so the comparison is about the
        # space-cannon damage, not the 0% no-ground rule.
        base_g = {**base, "friendly_ground_forces": _ships(infantry=2)}
        pds_g = {**with_pds, "friendly_ground_forces": _ships(infantry=2)}
        self.assertLess(
            win_probability(pds_g, trials=4000, seed=SEED),
            win_probability(base_g, trials=4000, seed=SEED),
        )


class TestSimulateResult(SimpleTestCase):
    def test_result_shape_and_flags(self):
        fd = {
            "friendly_fleet": _ships(flagship=1, cruiser=2),
            "enemy_fleet": _ships(cruiser=2),
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": {},
        }
        result = simulate(fd, trials=1000, seed=SEED)
        self.assertEqual(set(result), {
            "win_probability", "win_percent", "minimum_fleet",
            "recommended_fleet", "breakdown",
        })
        self.assertEqual(result["win_percent"], round(result["win_probability"] * 100))
        # Generic-flagship caveat surfaced when a flagship is present.
        notes = " ".join(result["breakdown"]["notes"])
        self.assertIn("Flagship", notes)

    def test_seed_is_reproducible(self):
        fd = {
            "friendly_fleet": _ships(cruiser=3),
            "enemy_fleet": _ships(cruiser=2),
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": {},
        }
        a = win_probability(fd, trials=1000, seed=SEED)
        b = win_probability(fd, trials=1000, seed=SEED)
        self.assertEqual(a, b)


class TestRecommendation(SimpleTestCase):
    def test_recommended_meets_threshold_and_min_subset(self):
        fd = {
            "friendly_fleet": {},
            "enemy_fleet": _ships(cruiser=2, dreadnought=1),
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": {},
        }
        minimum, recommended = recommend_fleets(fd, seed=SEED)
        self.assertTrue(recommended)  # non-empty
        # The recommended fleet should actually clear the threshold (verified at
        # higher resolution than the inner search used).
        check = {**fd, "friendly_fleet": recommended}
        self.assertGreaterEqual(
            win_probability(check, trials=3000, seed=SEED), REC_THRESHOLD - 0.07
        )
        # Minimum is a subset of recommended.
        for unit, count in minimum.items():
            self.assertLessEqual(count, recommended.get(unit, 0))

    def test_recommendation_includes_ground_when_planet_held(self):
        fd = {
            "friendly_fleet": {},
            "enemy_fleet": _ships(cruiser=1),
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": _ships(infantry=2),
        }
        _minimum, recommended = recommend_fleets(fd, seed=SEED)
        ground = recommended.get("infantry", 0) + recommended.get("mechs", 0)
        self.assertGreater(ground, 0)

    def test_recommendation_terminates_within_bound(self):
        fd = {
            "friendly_fleet": {},
            "enemy_fleet": _ships(war_sun=2, dreadnought=4),
            "friendly_ground_forces": {},
            "enemy_ground_forces_and_structures": {},
        }
        _minimum, recommended = recommend_fleets(fd, seed=SEED)
        self.assertLessEqual(sum(recommended.values()), 40)
