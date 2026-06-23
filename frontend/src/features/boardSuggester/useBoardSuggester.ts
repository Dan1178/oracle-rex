import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { ApiError, buildGameFromTts } from '../../api/oracleRexApi'
import { useAiJob } from '../../hooks/useAiJob'
import { useSettings } from '../../store/settingsContext'
import type { DemoScenario } from '../../types/demo'
import type { Game } from '../../types/game'

// Shared logic for the two board-driven advisors (Strategy, Move): build a board
// from a TTS string, hold board + faction in component state, submit the AI job,
// and drive the one-click demo (build board → auto-select faction → run the saved
// job). Both features differ only in copy/inputs; StrategyPanel and MovePanel
// render their own UI over this hook. Ported from app.js setBoard /
// suggestStrategy / loadDemoBoardScenario (the `gameName` distinguishes the two).

export type BoardFeature = 'strategy' | 'move'

export interface UseBoardSuggester {
  game: Game | undefined
  setGame: (game: Game | undefined) => void
  faction: string
  setFaction: (faction: string) => void
  /** Credential resolution error (no key / access code), if any. */
  credentialError?: string
  /** Board-build failure message, if any. */
  buildError?: string
  /** True while a board build or an AI job is in flight. */
  busy: boolean
  job: ReturnType<typeof useAiJob>
  /** Build a board from a raw TTS string (the Strategy "Generate" action). */
  generate: (ttsString: string) => Promise<void>
  /** Build the scenario's board, auto-select its faction, and run the demo job. */
  loadDemo: (scenario: DemoScenario | undefined) => Promise<void>
  /** Submit a live AI job for the current board + faction. */
  suggest: () => void
  /** Re-run the last action (live submit or demo scenario). */
  retry: () => void
  /** Clear the board, faction, result, and any errors back to the empty state. */
  reset: () => void
}

export function useBoardSuggester(feature: BoardFeature): UseBoardSuggester {
  const [game, setGame] = useState<Game>()
  const [faction, setFaction] = useState('')
  const [credentialError, setCredentialError] = useState<string>()
  const [lastMode, setLastMode] = useState<'live' | 'demo'>('live')
  const [lastDemoKey, setLastDemoKey] = useState<string>()

  const { getCredentials } = useSettings()
  const job = useAiJob(feature)

  const buildMutation = useMutation({
    mutationFn: (tts: string) => buildGameFromTts(tts, feature),
  })

  const buildError =
    buildMutation.error instanceof ApiError
      ? buildMutation.error.message
      : buildMutation.error
        ? 'Could not build the board from that TTS string.'
        : undefined

  const generate = async (ttsString: string) => {
    const tts = ttsString.trim()
    if (!tts) return
    setCredentialError(undefined)
    job.reset()
    try {
      const built = await buildMutation.mutateAsync(tts)
      setGame(built)
      setFaction('')
    } catch {
      // Failure is surfaced via buildError.
    }
  }

  const loadDemo = async (scenario: DemoScenario | undefined) => {
    if (!scenario?.key || !scenario.tts_string) return
    setCredentialError(undefined)
    try {
      const built = await buildMutation.mutateAsync(scenario.tts_string)
      setGame(built)
      setFaction(scenario.suggested_faction ?? '')
      setLastMode('demo')
      setLastDemoKey(scenario.key)
      job.runDemoScenario(scenario.key)
    } catch {
      // Build failure is surfaced via buildError.
    }
  }

  const suggest = () => {
    if (!game || !faction) return
    setCredentialError(undefined)
    setLastMode('live')
    const result = getCredentials(feature)
    if (!result.creds) {
      job.reset()
      setCredentialError(result.error)
      return
    }
    job.submit({ game_json: game, player_faction: faction }, result.creds)
  }

  const retry = () => {
    if (lastMode === 'demo' && lastDemoKey) {
      job.runDemoScenario(lastDemoKey)
    } else {
      suggest()
    }
  }

  const reset = () => {
    setGame(undefined)
    setFaction('')
    setCredentialError(undefined)
    setLastMode('live')
    setLastDemoKey(undefined)
    buildMutation.reset()
    job.reset()
  }

  return {
    game,
    setGame,
    faction,
    setFaction,
    credentialError,
    buildError,
    busy: job.isLoading || buildMutation.isPending,
    job,
    generate,
    loadDemo,
    suggest,
    retry,
    reset,
  }
}
