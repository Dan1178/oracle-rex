import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { ApiError, createJob, getJobStatus, runDemo } from '../api/oracleRexApi'
import { useSettings } from '../store/settingsContext'
import type {
  JobCreated,
  JobFeature,
  JobInput,
  JobResult,
  JobStatus,
  LiveCredentials,
} from '../types/ai'

// The async-AI-job lifecycle as a single hook: POST to create the job, then
// poll `GET /api/jobs/<id>/` on an interval until the job is terminal. This
// keeps the long provider call off the request path (Milestone 2) and is a
// direct port of the legacy runAiJob/pollAiJob pair (static/js/app.js).

/** Poll cadence, matches the legacy 1.5s interval. */
export const AI_JOB_POLL_INTERVAL_MS = 1500
/**
 * Stop polling after 5.5 min, above the backend budget (provider timeout
 * ~180s + worker/reaper slack ~300s) so a slow-but-valid job resolves to a real
 * terminal status before the client gives up.
 */
export const AI_JOB_POLL_TIMEOUT_MS = 330_000

// User-facing messages, ported verbatim from the legacy frontend.
export const JOB_FAILED_MESSAGE =
  'The AI request failed. You can retry, switch to demo mode, or provide your own API key in Live AI Mode.'
export const JOB_TIMEOUT_MESSAGE =
  'The AI request is taking longer than expected. Try a smaller scenario, a faster model, or retry.'
export const JOB_POLL_ERROR_MESSAGE = 'Could not check the AI job status. Please retry.'

export type AiJobPhase = 'idle' | 'submitting' | 'polling' | 'success' | 'error'

export interface AiJobState {
  phase: AiJobPhase
  /** True while the job is being created or polled (drives loading UI). */
  isLoading: boolean
  jobId?: string
  /** Latest polled status snapshot, if any. */
  status?: JobStatus
  /** The terminal result payload, present when phase === 'success'. */
  result?: JobResult
  /** A user-presentable error message, present when phase === 'error'. */
  error?: string
}

export interface UseAiJobResult extends AiJobState {
  /** Create a live job (BYOK or access code) and begin polling. */
  submit: (input: JobInput, credentials: LiveCredentials) => void
  /** Run a saved demo scenario (pre-completed job) through the same poll flow. */
  runDemoScenario: (scenarioKey: string) => void
  /** Clear all state back to idle. */
  reset: () => void
}

function messageFrom(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return JOB_FAILED_MESSAGE
}

/**
 * Drive one AI job for `feature` (the create-URL segment: rules / strategy /
 * move / tactical). Returns the current phase plus `submit` / `runDemoScenario`
 * to start a job and `reset` to clear it.
 */
export function useAiJob(feature: JobFeature): UseAiJobResult {
  // The global persona (tone only) is sent with every live job; demo jobs keep
  // the default voice. Read from the settings store rather than threaded through
  // each panel.
  const { persona } = useSettings()
  const [jobId, setJobId] = useState<string>()
  const [submitError, setSubmitError] = useState<string>()
  const [timedOut, setTimedOut] = useState(false)
  // When the current job's polling started (set when create resolves), used for
  // the overall timeout cap.
  const startedAtRef = useRef(0)

  const clearBeforeStart = useCallback(() => {
    setSubmitError(undefined)
    setTimedOut(false)
    setJobId(undefined)
  }, [])

  // Creating the job. The mutation takes a thunk so the same path serves both a
  // live createJob and a demo runDemo.
  const createMutation = useMutation<JobCreated, unknown, () => Promise<JobCreated>>({
    mutationFn: (creator) => creator(),
    onSuccess: (created) => {
      startedAtRef.current = Date.now()
      setTimedOut(false)
      setJobId(created.job_id)
    },
    onError: (error) => setSubmitError(messageFrom(error)),
  })

  // Polling the job status until terminal / timed out / errored.
  const pollQuery = useQuery({
    queryKey: ['aiJob', jobId],
    queryFn: ({ signal }) => getJobStatus(jobId as string, signal),
    enabled: Boolean(jobId) && !timedOut,
    // One failed poll surfaces as an error (no silent retries), matching the
    // legacy behavior of stopping on a status-check failure.
    retry: false,
    refetchInterval: (query) => {
      if (query.state.status === 'error') return false
      if (query.state.data?.is_terminal) return false
      if (Date.now() - startedAtRef.current > AI_JOB_POLL_TIMEOUT_MS) return false
      return AI_JOB_POLL_INTERVAL_MS
    },
  })

  const pollData = pollQuery.data
  const reachedTerminal = pollData?.is_terminal ?? false

  // Once the cap elapses without a terminal status, flip to timed-out. A timer
  // (rather than reading Date.now() at render) guarantees the re-render that
  // surfaces the timeout message after polling stops.
  useEffect(() => {
    if (!jobId || reachedTerminal) return
    const remaining = AI_JOB_POLL_TIMEOUT_MS - (Date.now() - startedAtRef.current)
    const timer = setTimeout(() => setTimedOut(true), Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [jobId, reachedTerminal])

  const submit = useCallback(
    (input: JobInput, credentials: LiveCredentials) => {
      clearBeforeStart()
      createMutation.mutate(() => createJob(feature, input, credentials, persona))
    },
    [feature, clearBeforeStart, createMutation, persona],
  )

  const runDemoScenario = useCallback(
    (scenarioKey: string) => {
      clearBeforeStart()
      createMutation.mutate(() => runDemo(scenarioKey))
    },
    [clearBeforeStart, createMutation],
  )

  const reset = useCallback(() => {
    clearBeforeStart()
    createMutation.reset()
  }, [clearBeforeStart, createMutation])

  return {
    ...deriveState({
      jobId,
      submitError,
      timedOut,
      isSubmitting: createMutation.isPending,
      pollData,
      pollErrored: pollQuery.isError,
    }),
    submit,
    runDemoScenario,
    reset,
  }
}

function deriveState(args: {
  jobId?: string
  submitError?: string
  timedOut: boolean
  isSubmitting: boolean
  pollData?: JobStatus
  pollErrored: boolean
}): AiJobState {
  const { jobId, submitError, timedOut, isSubmitting, pollData, pollErrored } = args

  if (submitError) {
    return { phase: 'error', isLoading: false, error: submitError }
  }
  if (isSubmitting) {
    return { phase: 'submitting', isLoading: true }
  }
  if (!jobId) {
    return { phase: 'idle', isLoading: false }
  }

  const base = { jobId, status: pollData }
  if (pollData?.is_terminal) {
    if (pollData.status === 'completed') {
      return {
        ...base,
        phase: 'success',
        isLoading: false,
        result: pollData.result ?? undefined,
      }
    }
    return {
      ...base,
      phase: 'error',
      isLoading: false,
      error: pollData.error || JOB_FAILED_MESSAGE,
    }
  }
  if (timedOut) {
    return { ...base, phase: 'error', isLoading: false, error: JOB_TIMEOUT_MESSAGE }
  }
  if (pollErrored) {
    return { ...base, phase: 'error', isLoading: false, error: JOB_POLL_ERROR_MESSAGE }
  }
  return { ...base, phase: 'polling', isLoading: true }
}
