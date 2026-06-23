import { useState } from 'react'

import { Board } from '../../components/Board/Board'
import {
  CREDENTIAL_HINT,
  ErrorState,
  RETRY_HINT,
} from '../../components/ErrorState/ErrorState'
import { FactionSelect } from '../../components/FactionSelect/FactionSelect'
import { JobResultView } from '../../components/JobResultView/JobResultView'
import { LoadingState } from '../../components/LoadingState/LoadingState'
import { useDemoConfig } from '../../hooks/useDemoConfig'
import { useResultScroll } from '../../hooks/useResultScroll'
import { useBoardSuggester } from '../boardSuggester/useBoardSuggester'
import styles from './StrategyPanel.module.css'

// Strategy Suggester, TTS string → board → faction-specific opening plan.
// Ports app.js generateGame/setBoard/suggestStrategy + loadDemoBoardScenario;
// the shared board/faction/job flow lives in useBoardSuggester, this component
// adds the TTS-input UI and strategy-specific copy.

const LOADING_MESSAGE = 'Analyzing board state'

export function StrategyPanel() {
  const [ttsInput, setTtsInput] = useState('')
  const { catalog } = useDemoConfig()
  const { ref: resultsRef, scrollToResult } = useResultScroll()
  const board = useBoardSuggester('strategy')
  const { game, faction, setFaction, credentialError, buildError, busy, job } = board

  const handleSuggest = () => {
    board.suggest()
    scrollToResult()
  }

  const demoScenario = catalog?.scenarios.strategy
  const demoReady = Boolean(demoScenario?.key && demoScenario.tts_string)

  const handleDemo = () => {
    setTtsInput(demoScenario?.tts_string ?? '')
    void board.loadDemo(demoScenario)
  }

  return (
    <section aria-labelledby="strategy-heading">
      <h2 id="strategy-heading">Strategy Suggester</h2>
      <p className={styles.intro}>
        Get a faction-specific opening strategy from a parsed board state. New here?
        Click <strong>Load Sample Milty Draft Board</strong> to see it work with no
        setup.
      </p>

      <div className={styles.demoBox}>
        <h4>Or load a sample board (instant)</h4>
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
          onClick={() => void board.generate(ttsInput)}
          disabled={busy || ttsInput.trim() === ''}
        >
          Generate
        </button>
      </div>

      {buildError && (
        <ErrorState
          message={buildError}
          onRetry={() => void board.generate(ttsInput)}
        />
      )}

      <FactionSelect
        players={game?.players ?? []}
        value={faction}
        onChange={setFaction}
        disabled={!game}
      />
      <button
        type="button"
        className={styles.getStrategy}
        onClick={handleSuggest}
        disabled={!game || !faction || busy}
      >
        Get Strategy
      </button>

      <Board game={game} />

      <div className={styles.results} ref={resultsRef}>
        {credentialError ? (
          <ErrorState
            message={credentialError}
            onRetry={board.suggest}
            hint={CREDENTIAL_HINT}
          />
        ) : job.isLoading ? (
          <LoadingState message={LOADING_MESSAGE} />
        ) : job.phase === 'error' && job.error ? (
          <ErrorState message={job.error} onRetry={board.retry} hint={RETRY_HINT} />
        ) : job.phase === 'success' && job.result ? (
          <JobResultView feature="strategy" result={job.result} />
        ) : (
          <p className={styles.hint}>
            Your strategy will appear here. Load the sample board above, or paste a TTS
            string and click Generate, then Get Strategy.
          </p>
        )}
      </div>
    </section>
  )
}
