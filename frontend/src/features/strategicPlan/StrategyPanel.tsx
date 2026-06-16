import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Board } from '../../components/Board/Board'
import { ErrorState } from '../../components/ErrorState/ErrorState'
import { FactionSelect } from '../../components/FactionSelect/FactionSelect'
import { JobResultView } from '../../components/JobResultView/JobResultView'
import { LoadingState } from '../../components/LoadingState/LoadingState'
import { ApiError, buildGameFromTts } from '../../api/oracleRexApi'
import { useAiJob } from '../../hooks/useAiJob'
import { useDemoConfig } from '../../hooks/useDemoConfig'
import { useSettings } from '../../store/settingsContext'
import type { Game } from '../../types/game'
import styles from './StrategyPanel.module.css'

// Strategy Suggester — TTS string → board → faction-specific opening plan.
// Ports static/js/app.js generateGame/setBoard/suggestStrategy and the
// loadDemoBoardScenario demo flow. Board state lives in component state keyed to
// this feature (no more window.strategyGameData / space-in-id DOM hacks).

const LOADING_MESSAGE = 'Analyzing board state…'
const GAME_NAME = 'strategy'

export function StrategyPanel() {
  const [ttsInput, setTtsInput] = useState('')
  const [game, setGame] = useState<Game>()
  const [faction, setFaction] = useState('')
  const [credentialError, setCredentialError] = useState<string>()
  const [lastMode, setLastMode] = useState<'live' | 'demo'>('live')
  const [lastDemoKey, setLastDemoKey] = useState<string>()

  const { getCredentials } = useSettings()
  const { catalog } = useDemoConfig()
  const job = useAiJob('strategy')

  const demoScenario = catalog?.scenarios.strategy
  const demoReady = Boolean(demoScenario?.key && demoScenario.tts_string)

  const buildMutation = useMutation({
    mutationFn: (tts: string) => buildGameFromTts(tts, GAME_NAME),
  })

  const buildError =
    buildMutation.error instanceof ApiError
      ? buildMutation.error.message
      : buildMutation.error
        ? 'Could not build the board from that TTS string.'
        : undefined

  const handleGenerate = async () => {
    const tts = ttsInput.trim()
    if (!tts) return
    setCredentialError(undefined)
    job.reset()
    try {
      const built = await buildMutation.mutateAsync(tts)
      setGame(built)
      setFaction('')
    } catch {
      // Failure is surfaced via buildMutation.error (buildError above).
    }
  }

  const handleDemo = async () => {
    if (!demoScenario?.key || !demoScenario.tts_string) return
    setCredentialError(undefined)
    setTtsInput(demoScenario.tts_string)
    try {
      const built = await buildMutation.mutateAsync(demoScenario.tts_string)
      setGame(built)
      setFaction(demoScenario.suggested_faction ?? '')
      setLastMode('demo')
      setLastDemoKey(demoScenario.key)
      job.runDemoScenario(demoScenario.key)
    } catch {
      // Build failure surfaced via buildMutation.error.
    }
  }

  const handleStrategy = () => {
    if (!game || !faction) return
    setCredentialError(undefined)
    setLastMode('live')
    const result = getCredentials('strategy')
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
      handleStrategy()
    }
  }

  const busy = job.isLoading || buildMutation.isPending

  return (
    <section aria-labelledby="strategy-heading">
      <h2 id="strategy-heading">Strategy Suggester</h2>
      <p className={styles.intro}>
        Get a faction-specific opening strategy from a parsed board state. New here? Click{' '}
        <strong>Load Sample Milty Draft Board</strong> to see it work with no setup.
      </p>

      <div className={styles.demoBox}>
        <h4>Demo — no API key needed</h4>
        <p className={styles.demoDesc}>
          {demoScenario?.description ??
            'Loads a balanced sample board, auto-selects a faction, and shows a saved strategy.'}
        </p>
        <button
          type="button"
          className={styles.demoButton}
          onClick={handleDemo}
          disabled={!demoReady || busy}
        >
          Load Sample Milty Draft Board
        </button>
      </div>

      <p className={styles.byok}>
        Have your own TTS String? Generate a game (6 player only):{' '}
        <a href="https://milty.shenanigans.be/" target="_blank" rel="noreferrer">
          https://milty.shenanigans.be/
        </a>
      </p>
      <div className={styles.ttsRow}>
        <input
          type="text"
          className={styles.ttsInput}
          aria-label="TTS string"
          placeholder="Paste TTS String from Milty draft tool"
          value={ttsInput}
          onChange={(e) => setTtsInput(e.target.value)}
        />
        <button
          type="button"
          className={styles.generate}
          onClick={handleGenerate}
          disabled={busy || ttsInput.trim() === ''}
        >
          Generate
        </button>
      </div>

      {buildError && <ErrorState message={buildError} onRetry={handleGenerate} />}

      <FactionSelect
        players={game?.players ?? []}
        value={faction}
        onChange={setFaction}
        disabled={!game}
      />
      <button
        type="button"
        className={styles.getStrategy}
        onClick={handleStrategy}
        disabled={!game || !faction || busy}
      >
        Get Strategy
      </button>

      <Board game={game} />

      <div className={styles.results}>
        {credentialError ? (
          <ErrorState message={credentialError} onRetry={handleStrategy} />
        ) : job.isLoading ? (
          <LoadingState message={LOADING_MESSAGE} />
        ) : job.phase === 'error' && job.error ? (
          <ErrorState message={job.error} onRetry={retry} />
        ) : job.phase === 'success' && job.result ? (
          <JobResultView feature="strategy" result={job.result} />
        ) : null}
      </div>
    </section>
  )
}
