import type { Game, System, Planet } from '../../types/game'

// Unit catalogs + pure, immutable state transforms for the Fleet Manager,
// ported from static/js/fleet_manager.js (updateShipCount / updateUnitCount /
// the owner-select handlers). The legacy code mutated `window.fleetGameData`
// in place and pushed counts back into the DOM; here every edit returns a new
// Game so the count rendered always derives from React state.
//
// NOTE: unlike the Battle Calculator's force_data payload (where the ground
// "mech" is remapped to "mechs"), the Fleet Manager stores units under their
// own key, a fleet's ground "mech" lives in fleet.ships.mech, and a planet's
// in ground_forces.units.mech, matching the backend to_json() shape exactly.

export interface FleetUnit {
  /** The key this unit takes in the ships / units / structures map. */
  unit: string
  label: string
  /** Absolute URL of the icon (served by Django under /static). */
  icon: string
}

// The fleet (units in a system's space): seven ship classes plus infantry and
// mech being transported, exactly the rows the legacy fleet section rendered,
// all stored in system.fleet.ships.
export const FLEET_UNITS: FleetUnit[] = [
  { unit: 'fighter', label: 'Fighter', icon: '/static/images/ships/fighter_icon.png' },
  {
    unit: 'destroyer',
    label: 'Destroyer',
    icon: '/static/images/ships/destroyer_icon.png',
  },
  { unit: 'cruiser', label: 'Cruiser', icon: '/static/images/ships/cruiser_icon.png' },
  { unit: 'carrier', label: 'Carrier', icon: '/static/images/ships/carrier_icon.png' },
  {
    unit: 'dreadnought',
    label: 'Dreadnought',
    icon: '/static/images/ships/dread_icon.png',
  },
  { unit: 'war_sun', label: 'War Sun', icon: '/static/images/ships/war_sun_icon.png' },
  {
    unit: 'flagship',
    label: 'Flagship',
    icon: '/static/images/ships/flagship_icon.png',
  },
  {
    unit: 'infantry',
    label: 'Infantry',
    icon: '/static/images/ground/infantry_icon.png',
  },
  { unit: 'mech', label: 'Mech', icon: '/static/images/ground/mech_icon.png' },
]

// A planet's ground forces: infantry/mech go into ground_forces.units, PDS and
// space dock into ground_forces.structures.
export const PLANET_UNITS: FleetUnit[] = [
  {
    unit: 'infantry',
    label: 'Infantry',
    icon: '/static/images/ground/infantry_icon.png',
  },
  { unit: 'mech', label: 'Mech', icon: '/static/images/ground/mech_icon.png' },
  { unit: 'pds', label: 'PDS', icon: '/static/images/structures/pds_icon.png' },
  {
    unit: 'space_dock',
    label: 'Space Dock',
    icon: '/static/images/structures/space_dock_icon.png',
  },
]

const GROUND_UNIT_KEYS = new Set(['infantry', 'mech'])

export const DEFAULT_FLEET_OWNER = 'Player 1'
export const DEFAULT_PLANET_OWNER = 'None'

// Owner option lists, matching the legacy <select> menus.
export const FLEET_OWNER_OPTIONS = [
  'Player 1',
  'Player 2',
  'Player 3',
  'Player 4',
  'Player 5',
  'Player 6',
]
export const PLANET_OWNER_OPTIONS = ['None', ...FLEET_OWNER_OPTIONS]

/** Look up the System placed at a board designation (or null). */
export function systemAt(
  game: Game | undefined,
  designation: string | null,
): System | null {
  if (!game || !designation) return null
  return game.board.find((tile) => tile.designation === designation)?.system ?? null
}

/** Replace the system at `designation` with `fn(system)`, leaving the rest of
 * the game untouched. Tiles without a system are passed through unchanged. */
function mapSystem(
  game: Game,
  designation: string,
  fn: (system: System) => System,
): Game {
  return {
    ...game,
    board: game.board.map((tile) =>
      tile.designation === designation && tile.system
        ? { ...tile, system: fn(tile.system) }
        : tile,
    ),
  }
}

/** Replace planet `index` of the system at `designation` with `fn(planet)`. */
function mapPlanet(
  game: Game,
  designation: string,
  index: number,
  fn: (planet: Planet) => Planet,
): Game {
  return mapSystem(game, designation, (system) => ({
    ...system,
    planets: system.planets.map((planet, i) => (i === index ? fn(planet) : planet)),
  }))
}

/** Apply a ±1 (or any delta) change to a count map, clamping at 0 and dropping
 * keys that reach 0, the legacy "delete on zero" behavior that keeps the
 * exported JSON free of empty entries. */
function applyDelta(
  map: Record<string, number>,
  key: string,
  delta: number,
): Record<string, number> {
  const next = Math.max(0, (map[key] ?? 0) + delta)
  const out = { ...map }
  if (next === 0) delete out[key]
  else out[key] = next
  return out
}

/** Add `delta` ships of `unit` to the active system's fleet, creating the fleet
 * (owned by the default player) if it does not exist yet. */
export function adjustShipCount(
  game: Game,
  designation: string,
  unit: string,
  delta: number,
): Game {
  return mapSystem(game, designation, (system) => {
    const fleet = system.fleet ?? { owner: DEFAULT_FLEET_OWNER, ships: {} }
    return {
      ...system,
      fleet: { ...fleet, ships: applyDelta(fleet.ships, unit, delta) },
    }
  })
}

/** Set the owner of the active system's fleet, creating an empty fleet first if
 * needed (matches the legacy owner-select handler). */
export function setFleetOwner(game: Game, designation: string, owner: string): Game {
  return mapSystem(game, designation, (system) => {
    const fleet = system.fleet ?? { owner: '', ships: {} }
    return { ...system, fleet: { ...fleet, owner } }
  })
}

/** Add `delta` of `unit` to a planet's ground forces, infantry/mech update
 * units, PDS/space dock update structures, creating the ground_forces record
 * (owned by "None") if absent. */
export function adjustGroundCount(
  game: Game,
  designation: string,
  planetIndex: number,
  unit: string,
  delta: number,
): Game {
  const isUnit = GROUND_UNIT_KEYS.has(unit)
  return mapPlanet(game, designation, planetIndex, (planet) => {
    const ground = planet.ground_forces ?? {
      owner: DEFAULT_PLANET_OWNER,
      structures: {},
      units: {},
    }
    return {
      ...planet,
      ground_forces: {
        ...ground,
        units: isUnit ? applyDelta(ground.units, unit, delta) : ground.units,
        structures: isUnit
          ? ground.structures
          : applyDelta(ground.structures, unit, delta),
      },
    }
  })
}

/** Set the owner of a planet's ground forces, creating an empty record first if
 * needed. */
export function setPlanetOwner(
  game: Game,
  designation: string,
  planetIndex: number,
  owner: string,
): Game {
  return mapPlanet(game, designation, planetIndex, (planet) => {
    const ground = planet.ground_forces ?? { owner: '', structures: {}, units: {} }
    return { ...planet, ground_forces: { ...ground, owner } }
  })
}
