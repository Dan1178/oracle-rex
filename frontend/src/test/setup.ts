// Vitest global test setup: registers @testing-library/jest-dom matchers
// (toBeInTheDocument, etc.), clears the DOM between tests, and runs the MSW
// server so API-client and hook tests mock the backend contract.
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './server'

// jsdom doesn't implement scrollIntoView; panels call it to bring AI results
// into view on submit. Stub it so those calls are a no-op in tests.
Element.prototype.scrollIntoView = vi.fn()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => server.close())
