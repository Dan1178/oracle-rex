// Vitest global test setup: registers @testing-library/jest-dom matchers
// (toBeInTheDocument, etc.), clears the DOM between tests, and runs the MSW
// server so API-client and hook tests mock the backend contract.
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => server.close())
