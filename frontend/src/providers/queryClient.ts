import { QueryClient } from '@tanstack/react-query'

/**
 * Build a QueryClient with the app's defaults. A factory (not a singleton) so
 * tests can spin up an isolated client per test with no shared cache.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The hosted app is low-traffic and same-origin; aggressive refetching
        // adds no value and would re-trigger the demo/status fetches.
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  })
}
