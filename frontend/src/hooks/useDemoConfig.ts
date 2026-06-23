import { useQuery } from '@tanstack/react-query'

import { getDemoCatalog, getDemoStatus } from '../api/oracleRexApi'
import type { DemoCatalog, DemoStatus } from '../types/demo'

// Bootstrap the demo configuration, the one-click sample catalog and the
// live-demo availability flag, as plain queries. Ported from the legacy
// loadDemoConfig() (static/js/app.js). Both rarely change within a session, so
// they are treated as effectively static once fetched; failures are non-fatal
// (demo buttons simply stay unavailable), matching the legacy swallow-on-error.

export interface UseDemoConfigResult {
  catalog?: DemoCatalog
  isCatalogLoading: boolean
  /** Whether the server has the controlled live-demo (access-code) path enabled. */
  liveDemoEnabled: boolean
  status?: DemoStatus
}

export function useDemoConfig(): UseDemoConfigResult {
  const catalogQuery = useQuery({
    queryKey: ['demoCatalog'],
    queryFn: ({ signal }) => getDemoCatalog(signal),
    staleTime: Infinity,
    retry: false,
  })

  const statusQuery = useQuery({
    queryKey: ['demoStatus'],
    queryFn: ({ signal }) => getDemoStatus(signal),
    staleTime: Infinity,
    retry: false,
  })

  return {
    catalog: catalogQuery.data,
    isCatalogLoading: catalogQuery.isLoading,
    liveDemoEnabled: statusQuery.data?.live_demo_enabled ?? false,
    status: statusQuery.data,
  }
}
