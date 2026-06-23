import type { ForceData } from '../../types/ai'

// Unit catalog + force_data builder for the Battle Calculator, ported from the
// legacy static/js/tactical_calculator.js (unitCounts + getForceCounts). The
// counter state is a flat `{ "<side>-<unit>": count }` map keyed exactly like
// the demo scenario's `unit_counts`, so a saved demo applies with no remapping.

export type Side = 'friendly' | 'enemy'

export interface UnitDef {
  /** The unit suffix in the counter id (e.g. "fighter", "war_sun", "mech"). */
  unit: string
  label: string
  /** Absolute URL of the icon (served by Django under /static). */
  icon: string
  /**
   * The key this unit takes in the force_data payload. Matches `unit` for every
   * unit except the ground "mech", which the backend prompt expects as "mechs"
   * (preserved from the legacy getForceCounts mapping).
   */
  payloadKey: string
}

const ship = (unit: string, label: string, file: string): UnitDef => ({
  unit,
  label,
  icon: `/static/images/ships/${file}`,
  payloadKey: unit,
})

// Both fleets (friendly + enemy) share this ship list.
export const FLEET_UNITS: UnitDef[] = [
  ship('fighter', 'Fighter', 'fighter_icon.png'),
  ship('destroyer', 'Destroyer', 'destroyer_icon.png'),
  ship('cruiser', 'Cruiser', 'cruiser_icon.png'),
  ship('carrier', 'Carrier', 'carrier_icon.png'),
  ship('dreadnought', 'Dreadnought', 'dread_icon.png'),
  ship('war_sun', 'War Sun', 'war_sun_icon.png'),
  ship('flagship', 'Flagship', 'flagship_icon.png'),
]

export const FRIENDLY_GROUND_UNITS: UnitDef[] = [
  {
    unit: 'infantry',
    label: 'Infantry',
    icon: '/static/images/ground/infantry_icon.png',
    payloadKey: 'infantry',
  },
  {
    unit: 'mech',
    label: 'Mech',
    icon: '/static/images/ground/mech_icon.png',
    payloadKey: 'mechs',
  },
]

// The enemy side also holds defensive structures (PDS, space dock).
export const ENEMY_GROUND_UNITS: UnitDef[] = [
  ...FRIENDLY_GROUND_UNITS,
  {
    unit: 'pds',
    label: 'PDS',
    icon: '/static/images/structures/pds_icon.png',
    payloadKey: 'pds',
  },
  {
    unit: 'space_dock',
    label: 'Space Dock',
    icon: '/static/images/structures/space_dock_icon.png',
    payloadKey: 'space_dock',
  },
]

// Display label for each force_data/recommendation key (e.g. "war_sun" -> "War
// Sun", "mechs" -> "Mech"), derived from the unit defs so it can't drift.
export const UNIT_LABELS: Record<string, string> = Object.fromEntries(
  [...FLEET_UNITS, ...ENEMY_GROUND_UNITS].map((u) => [u.payloadKey, u.label]),
)

/** Render a `{ unit: count }` fleet map as "2 Cruiser, 1 War Sun" (or "(none)"). */
export function formatFleet(fleet: Record<string, number>): string {
  const parts = Object.entries(fleet)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `${n} ${UNIT_LABELS[key] ?? key}`)
  return parts.length ? parts.join(', ') : '(none)'
}

/** Build the `"<side>-<unit>"` counter id used as a state key and DOM id. */
export const counterId = (side: Side, unit: string): string => `${side}-${unit}`

/** A flat map of every counter id to its current value. */
export type UnitCounts = Record<string, number>

// Every counter the calculator tracks (14 fleet + 2 friendly ground + 4 enemy
// ground/structures = 20), derived from the unit lists so it can't drift.
export const COUNTER_IDS: string[] = [
  ...(['friendly', 'enemy'] as Side[]).flatMap((side) =>
    FLEET_UNITS.map((u) => counterId(side, u.unit)),
  ),
  ...FRIENDLY_GROUND_UNITS.map((u) => counterId('friendly', u.unit)),
  ...ENEMY_GROUND_UNITS.map((u) => counterId('enemy', u.unit)),
]

/** A fresh all-zero counts map. */
export function emptyCounts(): UnitCounts {
  return Object.fromEntries(COUNTER_IDS.map((id) => [id, 0]))
}

/** Merge a partial set of counts (e.g. a demo scenario's `unit_counts`) onto a
 * zeroed base, keeping only counters the calculator knows about. */
export function countsFrom(partial: Record<string, number>): UnitCounts {
  const counts = emptyCounts()
  for (const id of COUNTER_IDS) {
    if (typeof partial[id] === 'number') counts[id] = partial[id]
  }
  return counts
}

function collectSide(
  counts: UnitCounts,
  side: Side,
  defs: UnitDef[],
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const def of defs) {
    const count = counts[counterId(side, def.unit)] ?? 0
    if (count > 0) out[def.payloadKey] = count
  }
  return out
}

/**
 * Assemble the `force_data` payload from the flat counts map, omitting zeroes,
 * a direct port of the legacy getForceCounts().
 */
export function buildForceData(counts: UnitCounts): ForceData {
  return {
    friendly_fleet: collectSide(counts, 'friendly', FLEET_UNITS),
    enemy_fleet: collectSide(counts, 'enemy', FLEET_UNITS),
    friendly_ground_forces: collectSide(counts, 'friendly', FRIENDLY_GROUND_UNITS),
    enemy_ground_forces_and_structures: collectSide(
      counts,
      'enemy',
      ENEMY_GROUND_UNITS,
    ),
  }
}
