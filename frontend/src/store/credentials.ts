import type { LiveCredentials } from '../types/ai'

// Credential resolution for a live AI request, ported from the legacy
// buildLiveCredentials (static/js/app.js). An access code (private live demo)
// takes precedence over a BYOK key. This is the pure primitive; Phase 2 wires
// it to the settings store and the Settings form inputs.

export interface CredentialInputs {
  /** Private live-demo access code (owner-paid). Wins over the BYOK key. */
  accessCode?: string
  /** The user's own provider API key (BYOK). */
  apiKey?: string
  /** The model selected for this feature (sent with a BYOK key). */
  model: string
}

export type CredentialResult =
  | { creds: LiveCredentials; error?: undefined }
  | { creds?: undefined; error: string }

export const NO_CREDENTIALS_MESSAGE =
  'No API key found. Enter your own key in Settings, add a live-demo access code, ' +
  'or use the "Demo" buttons below (no key required).'

/**
 * Resolve the credential fields for a live job-create body. Returns `{ creds }`
 * with either an access code or a BYOK key+model, or `{ error }` when neither is
 * available.
 */
export function buildLiveCredentials(inputs: CredentialInputs): CredentialResult {
  const accessCode = inputs.accessCode?.trim()
  if (accessCode) {
    return { creds: { access_code: accessCode } }
  }
  const apiKey = inputs.apiKey?.trim()
  if (apiKey) {
    return { creds: { api_key: apiKey, model: inputs.model } }
  }
  return { error: NO_CREDENTIALS_MESSAGE }
}
