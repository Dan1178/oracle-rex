import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { buildLiveCredentials, type CredentialResult } from './credentials'
import {
  apiMakeFor,
  DEFAULT_MODELS,
  type ApiMake,
  type SettingsFeature,
} from './models'
import { DEFAULT_PERSONA } from './personas'
import {
  SettingsContext,
  type ApiKeys,
  type ModelSelection,
  type SettingsContextValue,
} from './settingsContext'

// Client state for the Settings tab: the BYOK provider keys, the per-feature
// model selection, and the private live-demo access code. Server state stays in
// TanStack Query, this store only holds what the user types.
//
// Keys are kept in-memory only (matching the legacy frontend, which despite its
// warning copy never actually persisted them). That avoids a new storage
// security surface; opt-in persistence can be revisited in M6.

// `google` (Gemini) is keyed on the server, so it has no user-entered slot here;
// it stays empty and is never read (getCredentials short-circuits Google models).
const EMPTY_KEYS: ApiKeys = { openai: '', xai: '', anthropic: '', google: '' }

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accessCode, setAccessCode] = useState('')
  const [apiKeys, setApiKeys] = useState<ApiKeys>(EMPTY_KEYS)
  const [models, setModels] = useState<ModelSelection>({ ...DEFAULT_MODELS })
  const [persona, setPersona] = useState<string>(DEFAULT_PERSONA)

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
      // An access code (private live demo) still wins over everything. Otherwise
      // a Gemini model runs on the server-held key: send just the model, no key
      // needed, so a Google model is always "ready" (no credential error).
      const code = accessCode.trim()
      if (code) {
        return { creds: { access_code: code } }
      }
      if (make === 'google') {
        return { creds: { model } }
      }
      return buildLiveCredentials({ accessCode, apiKey: apiKeys[make], model })
    },
    [accessCode, apiKeys, models],
  )

  const value = useMemo<SettingsContextValue>(
    () => ({
      accessCode,
      apiKeys,
      models,
      persona,
      setAccessCode,
      setApiKey,
      setModel,
      setPersona,
      getCredentials,
    }),
    [accessCode, apiKeys, models, persona, setApiKey, setModel, getCredentials],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
