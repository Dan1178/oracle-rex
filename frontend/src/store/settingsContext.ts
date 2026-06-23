import { createContext, useContext } from 'react'

import type { CredentialResult } from './credentials'
import type { ApiMake, SettingsFeature } from './models'

// The settings context shape and consumer hook live here (separate from the
// provider component) so the provider file can export only a component, which
// keeps React Fast Refresh working in dev.

export type ApiKeys = Record<ApiMake, string>
export type ModelSelection = Record<SettingsFeature, string>

export interface SettingsContextValue {
  accessCode: string
  apiKeys: ApiKeys
  models: ModelSelection
  setAccessCode: (value: string) => void
  setApiKey: (make: ApiMake, value: string) => void
  setModel: (feature: SettingsFeature, value: string) => void
  /**
   * Resolve the live-request credentials for a feature: an access code wins
   * over the BYOK key chosen for the feature's selected model. Returns
   * `{ creds }` or `{ error }` (port of the legacy buildLiveCredentials wiring).
   */
  getCredentials: (feature: SettingsFeature) => CredentialResult
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

/** Access the settings store. Must be used under a `SettingsProvider`. */
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return ctx
}
