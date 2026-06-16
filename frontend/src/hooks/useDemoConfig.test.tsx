import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'

import { createQueryClient } from '../providers/queryClient'
import { sampleCatalog } from '../test/fixtures'
import { server } from '../test/server'
import { useDemoConfig } from './useDemoConfig'

function wrapper({ children }: { children: ReactNode }) {
  const client = createQueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useDemoConfig', () => {
  it('loads the demo catalog and live-demo status', async () => {
    server.use(
      http.get('/api/demo/catalog/', () => HttpResponse.json(sampleCatalog)),
      http.get('/api/demo/status/', () => HttpResponse.json({ live_demo_enabled: true })),
    )

    const { result } = renderHook(() => useDemoConfig(), { wrapper })

    await waitFor(() => expect(result.current.catalog).toBeDefined())
    expect(result.current.catalog?.scenarios.strategy.title).toBe('Load Sample Milty Draft Board')
    await waitFor(() => expect(result.current.liveDemoEnabled).toBe(true))
  })

  it('treats a failed catalog fetch as non-fatal (no catalog, demo disabled)', async () => {
    server.use(
      http.get('/api/demo/catalog/', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
      http.get('/api/demo/status/', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    )

    const { result } = renderHook(() => useDemoConfig(), { wrapper })

    await waitFor(() => expect(result.current.isCatalogLoading).toBe(false))
    expect(result.current.catalog).toBeUndefined()
    expect(result.current.liveDemoEnabled).toBe(false)
  })
})
