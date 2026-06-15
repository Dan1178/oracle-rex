import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App (Phase 0 smoke)', () => {
  it('renders the migration heading', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')))
    render(<App />)
    expect(screen.getByRole('heading', { name: /oracle rex/i })).toBeInTheDocument()
  })

  it('reports a successful demo-catalog fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ label: 'Demo', scenarios: { rules: {} } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    render(<App />)
    await waitFor(() => expect(screen.getByText(/connected\./i)).toBeInTheDocument())
    expect(screen.getByText(/1 scenario/i)).toBeInTheDocument()
  })

  it('surfaces an API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 500 })),
    )
    render(<App />)
    await waitFor(() =>
      expect(screen.getByText(/could not reach/i)).toBeInTheDocument(),
    )
  })
})
