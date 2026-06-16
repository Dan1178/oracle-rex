import { setupServer } from 'msw/node'

// Shared MSW server for tests. Handlers are registered per-test via
// `server.use(...)`; the lifecycle hooks live in setup.ts.
export const server = setupServer()
