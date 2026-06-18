import type { z } from 'zod'

import type {
  fleetSchema,
  gameSchema,
  groundForcesSchema,
  planetSchema,
  playerSchema,
  systemSchema,
  tileSchema,
  unitCountsSchema,
} from '../schemas/game.zod'

// Domain types for the parsed game graph. Inferred from the zod schemas so the
// compile-time types and runtime validation can never drift.

export type UnitCounts = z.infer<typeof unitCountsSchema>
export type Fleet = z.infer<typeof fleetSchema>
export type GroundForces = z.infer<typeof groundForcesSchema>
export type Planet = z.infer<typeof planetSchema>
export type System = z.infer<typeof systemSchema>
export type Tile = z.infer<typeof tileSchema>
export type Player = z.infer<typeof playerSchema>
export type Game = z.infer<typeof gameSchema>
