import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AI_JOB_POLL_TIMEOUT_MS,
  JOB_POLL_ERROR_MESSAGE,
  JOB_TIMEOUT_MESSAGE,
  useAiJob,
} from './useAiJob'
import { createQueryClient } from '../providers/queryClient'
import { server } from '../test/server'
import { completedRulesResult, demoTacticalResult, jobDict } from '../test/fixtures'

function wrapper({ children }: { children: ReactNode }) {
  const client = createQueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useAiJob', () => {
  it('drives create → poll (running) → complete for a live job', async () => {
    let polls = 0
    server.use(
      http.post('*/api/jobs/rules/', () =>
        HttpResponse.json({ job_id: 'job-1', status: 'queued' }, { status: 202 }),
      ),
      http.get('*/api/jobs/:id/', () => {
        polls += 1
        if (polls < 2) return HttpResponse.json(jobDict({ status: 'running' }))
        return HttpResponse.json(
          jobDict({
            status: 'completed',
            is_terminal: true,
            result: completedRulesResult,
          }),
        )
      }),
    )

    const { result } = renderHook(() => useAiJob('rules'), { wrapper })
    expect(result.current.phase).toBe('idle')

    act(() =>
      result.current.submit(
        { question: 'Can I retreat?' },
        { api_key: 'k', model: 'gpt-4' },
      ),
    )

    await waitFor(() => expect(result.current.phase).toBe('polling'), { timeout: 3000 })
    await waitFor(() => expect(result.current.phase).toBe('success'), { timeout: 4000 })

    expect(result.current.result?.answer).toMatch(/at least one ship/i)
    expect(result.current.isLoading).toBe(false)
    expect(polls).toBeGreaterThanOrEqual(2)
  })

  it('runs a demo scenario through the same poll flow', async () => {
    server.use(
      http.post('*/api/demo/run/', () =>
        HttpResponse.json({ job_id: 'demo-1', status: 'completed' }, { status: 202 }),
      ),
      http.get('*/api/jobs/:id/', () =>
        HttpResponse.json(
          jobDict({
            feature_type: 'tac_calc',
            status: 'completed',
            is_terminal: true,
            result: demoTacticalResult,
          }),
        ),
      ),
    )

    const { result } = renderHook(() => useAiJob('tactical'), { wrapper })
    act(() => result.current.runDemoScenario('sample_battle'))

    await waitFor(() => expect(result.current.phase).toBe('success'), { timeout: 3000 })
    expect(result.current.result?.demo).toBe(true)
    expect(result.current.result?.calc_results).toMatch(/71%/)
  })

  it('reports a terminal failure with the job error message', async () => {
    server.use(
      http.post('*/api/jobs/rules/', () =>
        HttpResponse.json({ job_id: 'job-1', status: 'queued' }, { status: 202 }),
      ),
      http.get('*/api/jobs/:id/', () =>
        HttpResponse.json(
          jobDict({
            status: 'failed',
            is_terminal: true,
            error: 'The provider rejected the key.',
          }),
        ),
      ),
    )

    const { result } = renderHook(() => useAiJob('rules'), { wrapper })
    act(() =>
      result.current.submit({ question: 'q' }, { api_key: 'k', model: 'gpt-4' }),
    )

    await waitFor(() => expect(result.current.phase).toBe('error'), { timeout: 3000 })
    expect(result.current.error).toBe('The provider rejected the key.')
  })

  it('reports a create failure from the backend', async () => {
    server.use(
      http.post('*/api/jobs/rules/', () =>
        HttpResponse.json({ error: 'No question provided' }, { status: 400 }),
      ),
    )

    const { result } = renderHook(() => useAiJob('rules'), { wrapper })
    act(() => result.current.submit({ question: '' }, { api_key: 'k', model: 'gpt-4' }))

    await waitFor(() => expect(result.current.phase).toBe('error'), { timeout: 3000 })
    expect(result.current.error).toBe('No question provided')
  })

  it('reports a poll-status error when the status check fails', async () => {
    server.use(
      http.post('*/api/jobs/rules/', () =>
        HttpResponse.json({ job_id: 'job-1', status: 'queued' }, { status: 202 }),
      ),
      http.get('*/api/jobs/:id/', () => new HttpResponse('boom', { status: 500 })),
    )

    const { result } = renderHook(() => useAiJob('rules'), { wrapper })
    act(() =>
      result.current.submit({ question: 'q' }, { api_key: 'k', model: 'gpt-4' }),
    )

    await waitFor(() => expect(result.current.phase).toBe('error'), { timeout: 3000 })
    expect(result.current.error).toBe(JOB_POLL_ERROR_MESSAGE)
  })

  it('times out a job that never reaches a terminal status', async () => {
    vi.useFakeTimers()
    server.use(
      http.post('*/api/jobs/rules/', () =>
        HttpResponse.json({ job_id: 'job-1', status: 'queued' }, { status: 202 }),
      ),
      http.get('*/api/jobs/:id/', () =>
        HttpResponse.json(jobDict({ status: 'running' })),
      ),
    )

    const { result } = renderHook(() => useAiJob('rules'), { wrapper })
    act(() =>
      result.current.submit({ question: 'q' }, { api_key: 'k', model: 'gpt-4' }),
    )

    // Flush the create mutation and the first poll, then jump past the cap.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AI_JOB_POLL_TIMEOUT_MS + 2000)
    })

    expect(result.current.phase).toBe('error')
    expect(result.current.error).toBe(JOB_TIMEOUT_MESSAGE)
  })
})
