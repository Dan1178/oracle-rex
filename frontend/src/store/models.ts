import type { JobFeature } from '../types/ai'

// The per-feature AI model catalog. Originally mirrored from the legacy Settings
// tab (templates/settings.html); each radio group is `<feature>-ai-model` with a
// `data-api-make` per option, which here becomes a typed option list plus the
// default. The settings store uses `apiMake` to pick which BYOK key to send for
// the selected model.
//
// Ordering convention: every group runs fastest -> most capable, so the two fast
// low-latency models (FAST_OPTIONS) always lead, even when they are not the
// default selection for that feature.

/** Which provider key a model is billed against (the legacy `data-api-make`). */
export type ApiMake = 'openai' | 'xai' | 'anthropic'

// The four AI features exposed in Settings. These line up 1:1 with the
// job-create URL segments (JobFeature), so a feature's selection can be sent
// straight to `createJob(feature, …)`.
export type SettingsFeature = JobFeature

export interface ModelOption {
  value: string
  label: string
  apiMake: ApiMake
}

export interface FeatureModelGroup {
  feature: SettingsFeature
  heading: string
  options: ModelOption[]
  /** The default-selected model value (the legacy `checked` radio). */
  defaultValue: string
}

// The two fast, low-latency models offered at the top of every feature group.
// They lead each list (fastest -> most capable) but are not necessarily the
// default selection for a given feature.
const FAST_OPTIONS: ModelOption[] = [
  { value: 'gpt-5.4-nano', label: 'GPT-5.4 nano (fast)', apiMake: 'openai' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fast)', apiMake: 'anthropic' },
]

// Strategy + Move share the same option list, ordered fastest -> most capable.
const strategyMoveOptions: ModelOption[] = [
  ...FAST_OPTIONS,
  { value: 'gpt-5.4', label: 'GPT-5.4', apiMake: 'openai' },
  { value: 'grok-4.3', label: 'Grok 4.3', apiMake: 'xai' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', apiMake: 'anthropic' },
  { value: 'grok-4.20', label: 'Grok 4.20', apiMake: 'xai' },
  { value: 'gpt-5.5', label: 'GPT-5.5 (most capable)', apiMake: 'openai' },
]

// Ordered to match the Settings tab layout (Rules, Strategy, Move, Tactical).
export const FEATURE_MODEL_GROUPS: FeatureModelGroup[] = [
  {
    feature: 'rules',
    heading: 'Rules Q&A',
    defaultValue: 'gpt-5.4-nano',
    options: [
      ...FAST_OPTIONS,
      { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini', apiMake: 'openai' },
      { value: 'grok-4.3', label: 'Grok 4.3', apiMake: 'xai' },
    ],
  },
  {
    feature: 'strategy',
    heading: 'Strategy Suggester',
    defaultValue: 'gpt-5.4',
    options: strategyMoveOptions,
  },
  {
    feature: 'move',
    heading: 'Move Suggester',
    defaultValue: 'gpt-5.4',
    options: strategyMoveOptions,
  },
  {
    feature: 'tactical',
    heading: 'Tactical Calculator',
    defaultValue: 'gpt-5.4-mini',
    options: [
      ...FAST_OPTIONS,
      { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini', apiMake: 'openai' },
      { value: 'grok-4.20', label: 'Grok 4.20 (math/logic)', apiMake: 'xai' },
      { value: 'gpt-5.5', label: 'GPT-5.5 (most capable)', apiMake: 'openai' },
    ],
  },
]

/** Default model selection per feature, derived from the catalog. */
export const DEFAULT_MODELS: Record<SettingsFeature, string> =
  FEATURE_MODEL_GROUPS.reduce(
    (acc, group) => {
      acc[group.feature] = group.defaultValue
      return acc
    },
    {} as Record<SettingsFeature, string>,
  )

/** Look up which provider key a feature's selected model bills against. */
export function apiMakeFor(feature: SettingsFeature, model: string): ApiMake {
  const group = FEATURE_MODEL_GROUPS.find((g) => g.feature === feature)
  const option = group?.options.find((o) => o.value === model)
  return option?.apiMake ?? 'openai'
}
