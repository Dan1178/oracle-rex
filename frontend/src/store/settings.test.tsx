import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'

import { NO_CREDENTIALS_MESSAGE } from './credentials'
import { SettingsProvider } from './settings'
import { useSettings } from './settingsContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
)

describe('settings store', () => {
  it('defaults each feature to its recommended model', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.models).toEqual({
      rules: 'gpt-5.4-nano',
      strategy: 'gpt-5.4',
      move: 'gpt-5.4',
      tactical: 'gpt-5.4-mini',
    })
  })

  it('errors when no credential is entered', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.getCredentials('strategy')).toEqual({ error: NO_CREDENTIALS_MESSAGE })
  })

  it('sends the BYOK key matching the selected model provider', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })

    // Strategy defaults to gpt-5.4 (openai), so the OpenAI key should be used.
    act(() => result.current.setApiKey('openai', 'sk-openai'))
    expect(result.current.getCredentials('strategy')).toEqual({
      creds: { api_key: 'sk-openai', model: 'gpt-5.4' },
    })

    // Switching strategy to a Claude model should now require the Anthropic key.
    act(() => result.current.setModel('strategy', 'claude-sonnet-4-6'))
    expect(result.current.getCredentials('strategy')).toEqual({ error: NO_CREDENTIALS_MESSAGE })

    act(() => result.current.setApiKey('anthropic', 'sk-anthropic'))
    expect(result.current.getCredentials('strategy')).toEqual({
      creds: { api_key: 'sk-anthropic', model: 'claude-sonnet-4-6' },
    })
  })

  it('prefers the access code over any BYOK key', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => {
      result.current.setApiKey('openai', 'sk-openai')
      result.current.setAccessCode(' let-me-in ')
    })
    expect(result.current.getCredentials('rules')).toEqual({ creds: { access_code: 'let-me-in' } })
  })
})
