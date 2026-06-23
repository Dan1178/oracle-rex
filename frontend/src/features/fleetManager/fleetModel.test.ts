import { describe, expect, it } from 'vitest'

import type { Game } from '../../types/game'
import {
  adjustGroundCount,
  adjustShipCount,
  DEFAULT_FLEET_OWNER,
  DEFAULT_PLANET_OWNER,
  setFleetOwner,
  setPlanetOwner,
  systemAt,
} from './fleetModel'

// A two-tile board: a system with one planet (no fleet/ground yet) and an empty
// outer tile. Mirrors the backend to_json() shape.
function makeGame(): Game {
  return {
    name: 'fleet',
    players: [{ username: 'p1', faction: 'sol', starting_position: '1' }],
    board: [
      {
        designation: '1',
        adjacent_tiles: ['0-0'],
        system: {
          name: 'Jord System',
          tile_id: '1',
          anomaly: 'none',
          wormhole: 'none',
          planets: [
            {
              name: 'Jord',
              resources: 4,
              influence: 2,
              trait: 'none',
              tech_specialty: 'none',
              legendary: false,
              ground_forces: null,
            },
          ],
          fleet: null,
        },
      },
      { designation: '1-0', adjacent_tiles: ['1'], system: null },
    ],
  }
}

const fleetOf = (game: Game, designation: string) => systemAt(game, designation)?.fleet
const groundOf = (game: Game, designation: string, i: number) =>
  systemAt(game, designation)?.planets[i]?.ground_forces

describe('fleetModel', () => {
  describe('adjustShipCount', () => {
    it('creates the fleet (default owner) on first increment', () => {
      const next = adjustShipCount(makeGame(), '1', 'cruiser', 1)
      expect(fleetOf(next, '1')).toEqual({
        owner: DEFAULT_FLEET_OWNER,
        ships: { cruiser: 1 },
      })
    })

    it('clamps at zero and deletes the key when it reaches zero', () => {
      let game = adjustShipCount(makeGame(), '1', 'fighter', 1)
      game = adjustShipCount(game, '1', 'fighter', -1)
      expect(fleetOf(game, '1')?.ships).toEqual({})
      // Already zero, stays gone, never negative.
      game = adjustShipCount(game, '1', 'fighter', -1)
      expect(fleetOf(game, '1')?.ships.fighter).toBeUndefined()
    })

    it('does not mutate the input game', () => {
      const original = makeGame()
      adjustShipCount(original, '1', 'dreadnought', 1)
      expect(fleetOf(original, '1')).toBeNull()
    })

    it('ignores an unknown designation', () => {
      const next = adjustShipCount(makeGame(), 'nope', 'cruiser', 1)
      expect(fleetOf(next, '1')).toBeNull()
    })
  })

  describe('setFleetOwner', () => {
    it('sets the owner, creating an empty fleet if absent', () => {
      const next = setFleetOwner(makeGame(), '1', 'Player 3')
      expect(fleetOf(next, '1')).toEqual({ owner: 'Player 3', ships: {} })
    })

    it('preserves existing ships', () => {
      const withShip = adjustShipCount(makeGame(), '1', 'carrier', 2)
      const next = setFleetOwner(withShip, '1', 'Player 2')
      expect(fleetOf(next, '1')).toEqual({ owner: 'Player 2', ships: { carrier: 2 } })
    })
  })

  describe('adjustGroundCount', () => {
    it('routes infantry/mech to units and PDS/space dock to structures', () => {
      let game = adjustGroundCount(makeGame(), '1', 0, 'infantry', 3)
      game = adjustGroundCount(game, '1', 0, 'pds', 1)
      expect(groundOf(game, '1', 0)).toEqual({
        owner: DEFAULT_PLANET_OWNER,
        units: { infantry: 3 },
        structures: { pds: 1 },
      })
    })

    it('clamps and deletes a structure key at zero', () => {
      let game = adjustGroundCount(makeGame(), '1', 0, 'space_dock', 1)
      game = adjustGroundCount(game, '1', 0, 'space_dock', -1)
      expect(groundOf(game, '1', 0)?.structures).toEqual({})
    })
  })

  describe('setPlanetOwner', () => {
    it('sets the planet owner, creating empty ground forces if absent', () => {
      const next = setPlanetOwner(makeGame(), '1', 0, 'Player 1')
      expect(groundOf(next, '1', 0)).toEqual({
        owner: 'Player 1',
        units: {},
        structures: {},
      })
    })
  })

  describe('systemAt', () => {
    it('returns the system for a designation and null for empty / unknown tiles', () => {
      const game = makeGame()
      expect(systemAt(game, '1')?.name).toBe('Jord System')
      expect(systemAt(game, '1-0')).toBeNull()
      expect(systemAt(game, 'nope')).toBeNull()
      expect(systemAt(game, null)).toBeNull()
      expect(systemAt(undefined, '1')).toBeNull()
    })
  })
})
