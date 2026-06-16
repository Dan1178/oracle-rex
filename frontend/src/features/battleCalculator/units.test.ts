import { describe, expect, it } from 'vitest'

import { buildForceData, countsFrom, COUNTER_IDS, emptyCounts } from './units'

describe('battle calculator units', () => {
  it('tracks 20 counters, all zero by default', () => {
    expect(COUNTER_IDS).toHaveLength(20)
    const counts = emptyCounts()
    expect(Object.values(counts).every((v) => v === 0)).toBe(true)
  })

  it('builds force_data omitting zero counts', () => {
    const counts = countsFrom({ 'friendly-dreadnought': 1, 'enemy-fighter': 4 })
    expect(buildForceData(counts)).toEqual({
      friendly_fleet: { dreadnought: 1 },
      enemy_fleet: { fighter: 4 },
      friendly_ground_forces: {},
      enemy_ground_forces_and_structures: {},
    })
  })

  it('maps the ground "mech" counter to the "mechs" payload key (legacy parity)', () => {
    const counts = countsFrom({ 'friendly-mech': 2, 'enemy-mech': 1, 'enemy-pds': 1 })
    const force = buildForceData(counts)
    expect(force.friendly_ground_forces).toEqual({ mechs: 2 })
    expect(force.enemy_ground_forces_and_structures).toEqual({ mechs: 1, pds: 1 })
  })

  it('routes structures into the enemy ground/structures bucket', () => {
    const counts = countsFrom({ 'enemy-space_dock': 1, 'enemy-infantry': 3 })
    expect(buildForceData(counts).enemy_ground_forces_and_structures).toEqual({
      space_dock: 1,
      infantry: 3,
    })
  })

  it('ignores unknown counter keys when applying a partial set', () => {
    const counts = countsFrom({ 'friendly-fighter': 2, 'bogus-unit': 9 })
    expect(counts['friendly-fighter']).toBe(2)
    expect(counts['bogus-unit']).toBeUndefined()
  })
})
