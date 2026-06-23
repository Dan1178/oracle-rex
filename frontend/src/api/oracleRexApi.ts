import { z } from 'zod'

import { buildGameResponseSchema } from '../schemas/game.zod'
import { battleSimSchema, jobCreatedSchema, jobStatusSchema } from '../schemas/ai.zod'
import { demoCatalogSchema, demoStatusSchema } from '../schemas/demo.zod'
import type { DemoCatalog, DemoStatus } from '../types/demo'
import type { Game } from '../types/game'
import type {
  BattleSimResult,
  ForceData,
  JobCreated,
  JobFeature,
  JobInput,
  JobStatus,
  LiveCredentials,
} from '../types/ai'

// Typed client for the stable Milestone 1–4 backend contract. Every response is
// validated against its zod schema so malformed data fails here, as a friendly
// ApiError, rather than crashing a component downstream.
//
// All endpoints are same-origin (Django/WhiteNoise serves the SPA), so plain
// relative `/api/...` paths need no host or CORS handling.

const API_BASE = '/api'

/** An API failure with a user-presentable message and (when known) HTTP status. */
export class ApiError extends Error {
  readonly status?: number
  readonly cause?: unknown

  constructor(message: string, options: { status?: number; cause?: unknown } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.cause = options.cause
  }
}

type JsonBody = Record<string, unknown>

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (cause) {
    throw new ApiError('The server sent a response that could not be read.', {
      status: response.status,
      cause,
    })
  }
}

/** Pull the backend's `{ error: "..." }` message off a non-OK response. */
function errorMessageFrom(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const { error } = body as { error?: unknown }
    if (typeof error === 'string' && error.trim()) return error
  }
  return `The request failed (HTTP ${status}).`
}

/** Validate a parsed body against a schema, turning zod failures into ApiError. */
function validate<T>(schema: z.ZodType<T>, body: unknown, context: string): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    // Keep the detail in the console for debugging; show the user a clean message.
    console.error(`Invalid ${context} response:`, z.treeifyError(parsed.error))
    throw new ApiError(`The server returned an unexpected ${context} response.`)
  }
  return parsed.data
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: JsonBody
  signal?: AbortSignal
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  context: string,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError('Could not reach the server. Check your connection and retry.', {
      cause,
    })
  }

  const parsedBody = await readJson(response)
  if (!response.ok) {
    throw new ApiError(errorMessageFrom(parsedBody, response.status), {
      status: response.status,
    })
  }
  return validate(schema, parsedBody, context)
}

// --- Game ------------------------------------------------------------------

/** Build a game/board from a Tabletop Simulator string. */
export async function buildGameFromTts(
  ttsString: string,
  gameName: string,
  signal?: AbortSignal,
): Promise<Game> {
  const data = await request('/build-game-from-tts/', buildGameResponseSchema, 'game', {
    method: 'POST',
    body: { tts_string: ttsString, game_name: gameName },
    signal,
  })
  return data.game
}

// --- Deterministic battle simulation (Milestone 6C) ------------------------

/**
 * Run the deterministic combat simulation. Synchronous and key-free, returns
 * win odds + fleet recommendations directly (no job to poll).
 */
export async function simulateBattle(
  forceData: ForceData,
  signal?: AbortSignal,
): Promise<BattleSimResult> {
  return request('/tactical/simulate/', battleSimSchema, 'battle-sim', {
    method: 'POST',
    body: { force_data: forceData },
    signal,
  })
}

// --- AI jobs ---------------------------------------------------------------

/**
 * Create an AI job for a feature. `input` is the feature payload (question /
 * game_json+faction / force_data); `credentials` is the access-code or BYOK
 * pair. Returns the new job id to poll with {@link getJobStatus}.
 */
export async function createJob(
  feature: JobFeature,
  input: JobInput,
  credentials: LiveCredentials,
  persona?: string,
  signal?: AbortSignal,
): Promise<JobCreated> {
  // A non-default persona (tone only) rides along in the body; the backend
  // applies it to the structured features.
  const personaField = persona && persona !== 'default' ? { persona } : {}
  return request(`/jobs/${feature}/`, jobCreatedSchema, 'job-create', {
    method: 'POST',
    body: { ...input, ...credentials, ...personaField },
    signal,
  })
}

/** Poll a job's status until it is terminal (see useAiJob). */
export async function getJobStatus(
  jobId: string,
  signal?: AbortSignal,
): Promise<JobStatus> {
  return request(`/jobs/${jobId}/`, jobStatusSchema, 'job-status', { signal })
}

// --- Demo mode -------------------------------------------------------------

/** The one-click sample-scenario catalog, keyed by feature. */
export async function getDemoCatalog(signal?: AbortSignal): Promise<DemoCatalog> {
  return request('/demo/catalog/', demoCatalogSchema, 'demo-catalog', { signal })
}

/** Which live-AI paths the server has enabled. */
export async function getDemoStatus(signal?: AbortSignal): Promise<DemoStatus> {
  return request('/demo/status/', demoStatusSchema, 'demo-status', { signal })
}

/**
 * Run a saved demo scenario. The backend returns a pre-completed job, so the
 * resulting job id is polled through the same {@link getJobStatus} path.
 */
export async function runDemo(
  scenarioKey: string,
  signal?: AbortSignal,
): Promise<JobCreated> {
  return request('/demo/run/', jobCreatedSchema, 'demo-run', {
    method: 'POST',
    body: { scenario_key: scenarioKey },
    signal,
  })
}
