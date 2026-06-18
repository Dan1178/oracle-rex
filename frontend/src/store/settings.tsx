import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { buildLiveCredentials, type CredentialResult } from './credentials'
import {
  apiMakeFor,
  DEFAULT_MODELS,
  type ApiMake,
  type SettingsFeature,
} from './models'
import {
  SettingsContext,
  type ApiKeys,
  type ModelSelection,
  type SettingsContextValue,
} from './settingsContext'

// Client state for the Settings tab: the BYOK provider keys, the per-feature
// model selection, and the private live-demo access code. Server state stays in
// TanStack Query — this store only holds what the user types.
//
// Keys are kept in-memory only (matching the legacy frontend, which despite its
// warning copy never actually persisted them). That avoids a new storage
// security surface; opt-in persistence can be revisited in M6.

const EMPTY_KEYS: ApiKeys = { openai: '', xai: '', anthropic: '' }

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accessCode, setAccessCode] = useState('')
  const [apiKeys, setApiKeys] = useState<ApiKeys>(EMPTY_KEYS)
  const [models, setModels] = useState<ModelSelection>({ ...DEFAULT_MODELS })

  const setApiKey = useCallback((make: ApiMake, value: string) => {
    setApiKeys((prev) => ({ ...prev, [make]: value }))
  }, [])

  const setModel = useCallback((feature: SettingsFeature, value: string) => {
    setModels((prev) => ({ ...prev, [feature]: value }))
  }, [])

  const getCredentials = useCallback(
    (feature: SettingsFeature): CredentialResult => {
      const model = models[feature]
      const make = apiMakeFor(feature, model)
      return buildLiveCredentials({ accessCode, apiKey: apiKeys[make], model })
    },
    [accessCode, apiKeys, models],
  )

  const value = useMemo<SettingsContextValue>(
    () => ({
      accessCode,
      apiKeys,
      models,
      setAccessCode,
      setApiKey,
      setModel,
      getCredentials,
    }),
    [accessCode, apiKeys, models, setApiKey, setModel, getCredentials],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
