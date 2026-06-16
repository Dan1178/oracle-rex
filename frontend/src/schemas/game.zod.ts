import { z } from 'zod'

// Runtime schemas mirroring the backend `to_json()` output for the game graph
// (core/models/*.py). The React app validates `/api/build-game-from-tts/`
// responses against these so a malformed board fails gracefully instead of
// rendering garbage. Unknown keys are stripped (zod's default) so the backend
// can add fields without breaking the client.

// Unit counts are stored as plain `{ unit_name: count }` maps (JSONField).
export const unitCountsSchema = z.record(z.string(), z.number())

export const fleetSchema = z.object({
  owner: z.string(),
  ships: unitCountsSchema,
})

export const groundForcesSchema = z.object({
  owner: z.string(),
  structures: unitCountsSchema,
  units: unitCountsSchema,
})

export const planetSchema = z.object({
  name: z.string(),
  resources: z.number(),
  influence: z.number(),
  trait: z.string(),
  tech_specialty: z.string(),
  legendary: z.boolean(),
  ground_forces: groundForcesSchema.nullable(),
})

export const systemSchema = z.object({
  name: z.string(),
  tile_id: z.string(),
  anomaly: z.string(),
  wormhole: z.string(),
  planets: z.array(planetSchema),
  fleet: fleetSchema.nullable(),
})

export const tileSchema = z.object({
  designation: z.string(),
  system: systemSchema.nullable(),
  adjacent_tiles: z.array(z.string()),
})

export const playerSchema = z.object({
  username: z.string(),
  // Faction is the faction *name* (or null when unassigned).
  faction: z.string().nullable(),
  // Starting position is the tile designation (e.g. "1-4"), or null.
  starting_position: z.string().nullable(),
})

export const gameSchema = z.object({
  name: z.string(),
  players: z.array(playerSchema),
  board: z.array(tileSchema),
})

// `/api/build-game-from-tts/` wraps the game under a `game` key.
export const buildGameResponseSchema = z.object({
  game: gameSchema,
})
