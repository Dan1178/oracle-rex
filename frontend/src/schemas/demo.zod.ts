import { z } from 'zod'

import { unitCountsSchema } from './game.zod'

// Runtime schemas for the demo-mode catalog (core/demo/__init__.py +
// scenarios/*.json). The catalog drives each tab's one-click sample entry; its
// scenarios are keyed by feature and their shapes differ per feature, so the
// fields that only some scenarios carry are optional here.

// A single rules question chip inside the rules scenario.
export const rulesChipSchema = z.object({
  key: z.string(),
  question: z.string(),
  response_key: z.string(),
})

// One catalog scenario. Fields are unioned-by-optionality rather than a strict
// discriminated union because the backend groups them all under one `scenarios`
// map; features read the fields they need.
export const demoScenarioSchema = z.object({
  feature: z.string(),
  title: z.string(),
  description: z.string().default(''),
  // Runnable board/battle scenarios carry a `key` + `response_key`; the rules
  // scenario instead carries `chips` (each chip is independently runnable).
  key: z.string().optional(),
  response_key: z.string().optional(),
  chips: z.array(rulesChipSchema).optional(),
  // Board scenarios (strategy / move).
  tts_string: z.string().optional(),
  suggested_faction: z.string().optional(),
  // Move puzzle prose.
  puzzle: z.string().optional(),
  // Battle scenario (tac_calc): preloaded unit counter values, keyed by the
  // calculator's "<side>-<unit>" ids (e.g. "friendly-dreadnought").
  unit_counts: unitCountsSchema.optional(),
})

export const demoCatalogSchema = z.object({
  label: z.string(),
  scenarios: z.record(z.string(), demoScenarioSchema),
})

export const demoStatusSchema = z.object({
  live_demo_enabled: z.boolean(),
})
