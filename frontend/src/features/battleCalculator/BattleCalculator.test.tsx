import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { createQueryClient } from '../../providers/queryClient'
import { SettingsProvider } from '../../store/settings'
import { useSettings } from '../../store/settingsContext'
import { jobDict, sampleCatalog } from '../../test/fixtures'
import { server } from '../../test/server'
import { BattleCalculator } from './BattleCalculator'

// Catalog with a runnable tac_calc battle scenario (the App fixture only covers
// strategy/rules), so the demo path has a key + unit_counts to apply.
const catalogWithBattle = {
  ...sampleCatalog,
  scenarios: {
    ...sampleCatalog.scenarios,
    tac_calc: {
      feature: 'tac_calc',
      title: 'Load Example Battle',
      description: 'A mid-game space battle.',
      key: 'sample_battle',
      response_key: 'sample_battle_result',
      unit_counts: { 'friendly-dreadnought': 1, 'enemy-fighter': 4 },
    },
  },
}

// A small consumer to seed a BYOK key so the live path resolves credentials.
function SeedKey() {
  const { setApiKey } = useSettings()
  return (
    <button type="button" onClick={() => setApiKey('openai', 'sk-test')}>
      seed-key
    </button>
  )
}

function renderCalculator() {
  const client = createQueryClient()
  return render(
    <QueryClientProvider client={client}>
      <SettingsProvider>
        <SeedKey />
        <BattleCalculator />
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

describe('BattleCalculator', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/demo/catalog/', () => HttpResponse.json(catalogWithBattle)),
      http.get('/api/demo/status/', () => HttpResponse.json({ live_demo_enabled: false })),
    )
  })

  it('asks the user to add a key when calculating with no credentials', () => {
    renderCalculator()
    fireEvent.click(screen.getByRole('button', { name: /^calculate$/i }))
    expect(screen.getByText(/no api key found/i)).toBeInTheDocument()
  })

  it('builds force_data from the counters and renders the result', async () => {
    let captured: Record<string, unknown> | undefined
    server.use(
      http.post('/api/jobs/tactical/', async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ job_id: 'job-1', status: 'queued' }, { status: 202 })
      }),
      http.get('/api/jobs/job-1/', () =>
        HttpResponse.json(
          jobDict({
            id: 'job-1',
            feature_type: 'tac_calc',
            status: 'completed',
            is_terminal: true,
            result: { calc_results: 'Odds of Victory: 64%' },
          }),
        ),
      ),
    )

    renderCalculator()
    fireEvent.click(screen.getByRole('button', { name: 'seed-key' }))

    // Friendly fleet: +3 fighters; enemy fleet: +1 cruiser.
    const friendlyFleet = screen.getByRole('group', { name: 'Friendly Fleet' })
    const enemyFleet = screen.getByRole('group', { name: 'Enemy Fleet' })
    const incFighter = within(friendlyFleet).getByRole('button', { name: /increase fighter/i })
    fireEvent.click(incFighter)
    fireEvent.click(incFighter)
    fireEvent.click(incFighter)
    fireEvent.click(within(enemyFleet).getByRole('button', { name: /increase cruiser/i }))

    fireEvent.click(screen.getByRole('button', { name: /^calculate$/i }))

    await waitFor(() => expect(screen.getByText(/odds of victory: 64%/i)).toBeInTheDocument())
    expect(captured?.force_data).toEqual({
      friendly_fleet: { fighter: 3 },
      enemy_fleet: { cruiser: 1 },
      friendly_ground_forces: {},
      enemy_ground_forces_and_structures: {},
    })
    expect(captured?.api_key).toBe('sk-test')
    expect(captured?.model).toBe('gpt-5.4-mini')
  })

  it('runs the demo battle through the same poll UI with a demo label', async () => {
    server.use(
      http.post('/api/demo/run/', () =>
        HttpResponse.json({ job_id: 'demo-1', status: 'completed' }, { status: 202 }),
      ),
      http.get('/api/jobs/demo-1/', () =>
        HttpResponse.json(
          jobDict({
            id: 'demo-1',
            feature_type: 'tac_calc',
            status: 'completed',
            is_terminal: true,
            result: {
              calc_results: 'Odds of Victory: 71%',
              demo: true,
              demo_label: 'Demo response generated from a saved scenario.',
            },
          }),
        ),
      ),
    )

    renderCalculator()
    const demoButton = await screen.findByRole('button', { name: /load example battle/i })
    await waitFor(() => expect(demoButton).toBeEnabled())
    fireEvent.click(demoButton)

    await waitFor(() => expect(screen.getByText(/odds of victory: 71%/i)).toBeInTheDocument())
    expect(screen.getByText(/saved scenario/i)).toBeInTheDocument()
    // The scenario's counts were applied to the board.
    const friendlyFleet = screen.getByRole('group', { name: 'Friendly Fleet' })
    const dreadnought = within(friendlyFleet).getByRole('group', { name: 'Dreadnought' })
    expect(within(dreadnought).getByText('1')).toBeInTheDocument()
  })
})
