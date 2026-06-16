import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { createQueryClient } from '../../providers/queryClient'
import { SettingsProvider } from '../../store/settings'
import { useSettings } from '../../store/settingsContext'
import { jobDict, sampleCatalog, sampleGame } from '../../test/fixtures'
import { server } from '../../test/server'
import { StrategyPanel } from './StrategyPanel'

const strategyResult = {
  strategy: 'Sol opening plan (text).',
  structured: {
    summary: 'Expand wide and lean on infantry.',
    opening_priorities: ['Grab both home-adjacent planets'],
  },
}

function SeedKey() {
  const { setApiKey } = useSettings()
  return (
    <button type="button" onClick={() => setApiKey('openai', 'sk-test')}>
      seed-key
    </button>
  )
}

function renderPanel() {
  const client = createQueryClient()
  return render(
    <QueryClientProvider client={client}>
      <SettingsProvider>
        <SeedKey />
        <StrategyPanel />
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

describe('StrategyPanel', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/demo/catalog/', () => HttpResponse.json(sampleCatalog)),
      http.get('/api/demo/status/', () => HttpResponse.json({ live_demo_enabled: false })),
      http.post('/api/build-game-from-tts/', () => HttpResponse.json({ game: sampleGame })),
    )
  })

  it('generates a board, then submits game + faction and renders the strategic plan', async () => {
    let captured: Record<string, unknown> | undefined
    server.use(
      http.post('/api/jobs/strategy/', async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ job_id: 'job-1', status: 'queued' }, { status: 202 })
      }),
      http.get('/api/jobs/job-1/', () =>
        HttpResponse.json(
          jobDict({
            id: 'job-1',
            feature_type: 'strategy',
            status: 'completed',
            is_terminal: true,
            result: strategyResult,
          }),
        ),
      ),
    )

    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'seed-key' }))

    const faction = screen.getByLabelText('Faction')
    expect(faction).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/tts string/i), { target: { value: '78 40 42' } })
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))

    // Board built → faction select enabled with the parsed factions.
    await waitFor(() => expect(faction).toBeEnabled())
    expect(screen.getByRole('option', { name: /sol \(player 1\)/i })).toBeInTheDocument()

    fireEvent.change(faction, { target: { value: 'sol' } })
    fireEvent.click(screen.getByRole('button', { name: /get strategy/i }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /strategic plan/i })).toBeInTheDocument(),
    )
    expect(screen.getByText(/grab both home-adjacent planets/i)).toBeInTheDocument()
    expect(captured?.player_faction).toBe('sol')
    expect(captured).toHaveProperty('game_json')
  })

  it('loads the demo board, auto-selects the faction, and shows the saved strategy', async () => {
    server.use(
      http.post('/api/demo/run/', () =>
        HttpResponse.json({ job_id: 'demo-1', status: 'completed' }, { status: 202 }),
      ),
      http.get('/api/jobs/demo-1/', () =>
        HttpResponse.json(
          jobDict({
            id: 'demo-1',
            feature_type: 'strategy',
            status: 'completed',
            is_terminal: true,
            result: {
              ...strategyResult,
              demo: true,
              demo_label: 'Demo response generated from a saved scenario.',
            },
          }),
        ),
      ),
    )

    renderPanel()
    const demoButton = await screen.findByRole('button', { name: /load sample milty draft board/i })
    await waitFor(() => expect(demoButton).toBeEnabled())
    fireEvent.click(demoButton)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /strategic plan/i })).toBeInTheDocument(),
    )
    expect(screen.getByText(/saved scenario/i)).toBeInTheDocument()
    // The suggested faction was auto-selected.
    expect(screen.getByLabelText('Faction')).toHaveValue('sol')
  })
})
