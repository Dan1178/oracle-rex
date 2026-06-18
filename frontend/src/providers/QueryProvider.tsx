import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { createQueryClient } from './queryClient'

// TanStack Query is the home for all server state: the demo catalog/status
// queries and the async-job create→poll flow. Client state (keys, model, access
// code) lives in the settings store instead (Phase 2).

export function QueryProvider({ children }: { children: ReactNode }) {
  // One client for the app's lifetime; useState keeps it stable across renders.
  const [client] = useState(createQueryClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
