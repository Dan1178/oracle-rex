import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { createQueryClient } from '../../providers/queryClient'
import { SettingsProvider } from '../../store/settings'
import { useSettings } from '../../store/settingsContext'
import { jobDict, sampleCatalog, sampleGame } from '../../test/fixtures'
import { server } from '../../test/server'
import { MovePanel } from './MovePanel'

// The shared catalog has no move scenario; add a runnable one (board + faction).
const catalogWithMove = {
  ...sampleCatalog,
  scenarios: {
    ...sampleCatalog.scenarios,
    move: {
      feature: 'move',
      title: 'Load Tactical Puzzle',
      description: 'An early-game crossroads for the Titans of Ul.',
      key: 'sample_tactical_puzzle',
      response_key: 'sample_tactical_recommendation',
      tts_string: '78 40 42',
      suggested_faction: 'ul',
    },
  },
}

const demoMove = {
  structured: {
    recommended_move: 'Kill the over-extended carrier',
    reasoning: 'Free trade.',
  },
  demo: true,
  demo_label: 'Demo response generated from a saved scenario.',
}

const liveMove = {
  structured: {
    recommended_move: 'Claim the Beta wormhole',
    reasoning: 'Keeps the fleet intact.',
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
        <MovePanel />
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

describe('MovePanel', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/demo/catalog/', () => HttpResponse.json(catalogWithMove)),
      http.get('/api/demo/status/', () =>
        HttpResponse.json({ live_demo_enabled: false }),
      ),
      http.post('/api/build-game-from-tts/', () =>
        HttpResponse.json({ game: sampleGame }),
      ),
    )
  })

  it('loads the tactical puzzle, auto-selects the faction, and shows the saved move', async () => {
    server.use(
      http.post('/api/demo/run/', () =>
        HttpResponse.json({ job_id: 'demo-1', status: 'completed' }, { status: 202 }),
      ),
      http.get('/api/jobs/demo-1/', () =>
        HttpResponse.json(
          jobDict({
            id: 'demo-1',
            feature_type: 'move',
            status: 'completed',
            is_terminal: true,
            result: demoMove,
          }),
        ),
      ),
    )

    renderPanel()
    const demoButton = await screen.findByRole('button', {
      name: /load tactical puzzle/i,
    })
    await waitFor(() => expect(demoButton).toBeEnabled())
    fireEvent.click(demoButton)

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /recommended move/i }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText(/kill the over-extended carrier/i)).toBeInTheDocument()
    expect(screen.getByText(/saved scenario/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Faction')).toHaveValue('ul')
  })

  it('suggests a live move for the loaded board', async () => {
    let captured: Record<string, unknown> | undefined
    server.use(
      http.post('/api/demo/run/', () =>
        HttpResponse.json({ job_id: 'demo-1', status: 'completed' }, { status: 202 }),
      ),
      http.get('/api/jobs/demo-1/', () =>
        HttpResponse.json(
          jobDict({
            id: 'demo-1',
            feature_type: 'move',
            status: 'completed',
            is_terminal: true,
            result: demoMove,
          }),
        ),
      ),
      http.post('/api/jobs/move/', async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ job_id: 'job-1', status: 'queued' }, { status: 202 })
      }),
      http.get('/api/jobs/job-1/', () =>
        HttpResponse.json(
          jobDict({
            id: 'job-1',
            feature_type: 'move',
            status: 'completed',
            is_terminal: true,
            result: liveMove,
          }),
        ),
      ),
    )

    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'seed-key' }))

    // Load the board via the demo (Move has no TTS input of its own in Phase 6).
    const demoButton = await screen.findByRole('button', {
      name: /load tactical puzzle/i,
    })
    await waitFor(() => expect(demoButton).toBeEnabled())
    fireEvent.click(demoButton)
    // Wait for the demo to finish (board built, faction selected, job settled)
    // so the Suggest Move button is enabled before we click it.
    await waitFor(() =>
      expect(screen.getByText(/kill the over-extended carrier/i)).toBeInTheDocument(),
    )
    expect(screen.getByLabelText('Faction')).toHaveValue('ul')

    // Now run a live suggestion against that board.
    fireEvent.click(screen.getByRole('button', { name: /suggest move/i }))
    await waitFor(() =>
      expect(screen.getByText(/claim the beta wormhole/i)).toBeInTheDocument(),
    )
    expect(captured?.player_faction).toBe('ul')
    expect(captured).toHaveProperty('game_json')
  })
})
