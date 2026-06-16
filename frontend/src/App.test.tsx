import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App'
import { createQueryClient } from './providers/queryClient'
import { SettingsProvider } from './store/settings'
import { sampleCatalog } from './test/fixtures'
import { server } from './test/server'

function renderApp() {
  const client = createQueryClient()
  return render(
    <QueryClientProvider client={client}>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

describe('App shell (Phase 2)', () => {
  beforeEach(() => {
    // App bootstraps the demo config on mount; satisfy those requests so the
    // strict unhandled-request guard stays happy.
    server.use(
      http.get('/api/demo/catalog/', () => HttpResponse.json(sampleCatalog)),
      http.get('/api/demo/status/', () => HttpResponse.json({ live_demo_enabled: false })),
    )
  })

  it('renders the header and the Settings tab by default', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: /oracle rex/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/three ways to use oracle rex/i)).toBeInTheDocument()
    // Each feature's model radio group renders.
    expect(screen.getByRole('radio', { name: /grok 4\.20 \(math\/logic\)/i })).toBeInTheDocument()
  })

  it('switches tabs and shows a placeholder for unbuilt features', () => {
    renderApp()
    fireEvent.click(screen.getByRole('tab', { name: /fleet manager/i }))
    expect(screen.getByText(/arrives in phase 7/i)).toBeInTheDocument()
    // The Settings content is no longer mounted.
    expect(screen.queryByText(/three ways to use oracle rex/i)).not.toBeInTheDocument()

    // And back to Settings.
    fireEvent.click(screen.getByRole('tab', { name: /^settings$/i }))
    expect(screen.getByText(/three ways to use oracle rex/i)).toBeInTheDocument()
  })

  it('renders the Battle Calculator on the Tactical tab', () => {
    renderApp()
    fireEvent.click(screen.getByRole('tab', { name: /tactical calculator/i }))
    expect(screen.getByRole('heading', { name: /tactical calculator/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load example battle/i })).toBeInTheDocument()
  })

  it('renders the Rules Q&A panel on the Rules tab', () => {
    renderApp()
    fireEvent.click(screen.getByRole('tab', { name: /rules q&a/i }))
    expect(screen.getByRole('heading', { name: /rules q&a/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ask oracle rex/i })).toBeInTheDocument()
  })

  it('renders the Strategy Suggester (with the board) on the Strategy tab', () => {
    renderApp()
    fireEvent.click(screen.getByRole('tab', { name: /strategy suggester/i }))
    expect(screen.getByRole('heading', { name: /strategy suggester/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load sample milty draft board/i })).toBeInTheDocument()
  })

  it('renders the Move Suggester on the Move tab', () => {
    renderApp()
    fireEvent.click(screen.getByRole('tab', { name: /move suggester/i }))
    expect(screen.getByRole('heading', { name: /move suggester/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load tactical puzzle/i })).toBeInTheDocument()
  })

  it('marks the active tab with aria-selected', () => {
    renderApp()
    expect(screen.getByRole('tab', { name: /^settings$/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    fireEvent.click(screen.getByRole('tab', { name: /rules q&a/i }))
    expect(screen.getByRole('tab', { name: /rules q&a/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
