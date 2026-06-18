import type { z } from 'zod'

import type {
  demoCatalogSchema,
  demoScenarioSchema,
  demoStatusSchema,
  rulesChipSchema,
} from '../schemas/demo.zod'

// Domain types for demo mode, inferred from the zod schemas.

export type RulesChip = z.infer<typeof rulesChipSchema>
export type DemoScenario = z.infer<typeof demoScenarioSchema>
export type DemoCatalog = z.infer<typeof demoCatalogSchema>
export type DemoStatus = z.infer<typeof demoStatusSchema>
