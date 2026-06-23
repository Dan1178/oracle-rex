import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  ApiError,
  buildGameFromTts,
  createJob,
  getDemoCatalog,
  getDemoStatus,
  getJobStatus,
  runDemo,
} from './oracleRexApi'
import { server } from '../test/server'
import {
  completedRulesResult,
  jobDict,
  sampleCatalog,
  sampleGame,
} from '../test/fixtures'

describe('oracleRexApi', () => {
  it('builds a game from a TTS string and returns the unwrapped game', async () => {
    server.use(
      http.post('*/api/build-game-from-tts/', async ({ request }) => {
        const body = (await request.json()) as { tts_string: string; game_name: string }
        expect(body.tts_string).toBe('78 40 42')
        expect(body.game_name).toBe('strategy')
        return HttpResponse.json({ game: sampleGame })
      }),
    )

    const game = await buildGameFromTts('78 40 42', 'strategy')
    expect(game.name).toBe('strategy')
    expect(game.players).toHaveLength(2)
    expect(game.board[0].system?.tile_id).toBe('18')
  })

  it('throws an ApiError when a response fails schema validation', async () => {
    server.use(
      http.post('*/api/build-game-from-tts/', () =>
        // Missing required `players`/`board`, should not validate.
        HttpResponse.json({ game: { name: 'broken' } }),
      ),
    )

    await expect(buildGameFromTts('x', 'strategy')).rejects.toBeInstanceOf(ApiError)
    await expect(buildGameFromTts('x', 'strategy')).rejects.toThrow(
      /unexpected game response/i,
    )
  })

  it('merges input and credentials into the job-create body', async () => {
    let received: Record<string, unknown> = {}
    server.use(
      http.post('*/api/jobs/rules/', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ job_id: 'job-1', status: 'queued' }, { status: 202 })
      }),
    )

    const created = await createJob(
      'rules',
      { question: 'Can I retreat?' },
      { access_code: 'let-me-in' },
    )
    expect(created).toEqual({ job_id: 'job-1', status: 'queued' })
    expect(received).toEqual({ question: 'Can I retreat?', access_code: 'let-me-in' })
  })

  it('surfaces the backend error message on a non-OK response', async () => {
    server.use(
      http.post('*/api/jobs/rules/', () =>
        HttpResponse.json({ error: 'No question provided' }, { status: 400 }),
      ),
    )

    const error = await createJob(
      'rules',
      { question: '' },
      { api_key: 'k', model: 'gpt-4' },
    ).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
    expect((error as ApiError).message).toBe('No question provided')
  })

  it('fetches and validates a job status', async () => {
    server.use(
      http.get('*/api/jobs/:id/', () =>
        HttpResponse.json(
          jobDict({
            status: 'completed',
            is_terminal: true,
            result: completedRulesResult,
          }),
        ),
      ),
    )

    const job = await getJobStatus('job-1')
    expect(job.status).toBe('completed')
    expect(job.is_terminal).toBe(true)
    expect(job.result?.answer).toMatch(/at least one ship/i)
  })

  it('fetches the demo catalog and status', async () => {
    server.use(
      http.get('*/api/demo/catalog/', () => HttpResponse.json(sampleCatalog)),
      http.get('*/api/demo/status/', () =>
        HttpResponse.json({ live_demo_enabled: true }),
      ),
    )

    const catalog = await getDemoCatalog()
    expect(catalog.scenarios.strategy.suggested_faction).toBe('sol')
    expect(catalog.scenarios.rules.chips?.[0].key).toBe('rules_retreat')

    const status = await getDemoStatus()
    expect(status.live_demo_enabled).toBe(true)
  })

  it('runs a demo scenario', async () => {
    server.use(
      http.post('*/api/demo/run/', async ({ request }) => {
        const body = (await request.json()) as { scenario_key: string }
        expect(body.scenario_key).toBe('sample_opening_board')
        return HttpResponse.json(
          { job_id: 'demo-1', status: 'completed' },
          { status: 202 },
        )
      }),
    )

    const created = await runDemo('sample_opening_board')
    expect(created.job_id).toBe('demo-1')
  })
})
