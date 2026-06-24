import { useState } from 'react'

import { Board } from '../../components/Board/Board'
import { DemoBox } from '../../components/DemoBox/DemoBox'
import { ErrorState } from '../../components/ErrorState/ErrorState'
import { FactionSelect } from '../../components/FactionSelect/FactionSelect'
import { JobResultArea } from '../../components/JobResultArea/JobResultArea'
import { ResetButton } from '../../components/ResetButton/ResetButton'
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

  const handleReset = () => {
    board.reset()
    setTtsInput('')
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

      <DemoBox
        title="Or load a sample board (instant)"
        description={
          demoScenario?.description ??
          'Loads a balanced sample board, auto-selects a faction, and shows a saved strategy.'
        }
        buttonLabel="Load Sample Milty Draft Board"
        onClick={handleDemo}
        disabled={!demoReady || busy}
      />

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
      <ResetButton onReset={handleReset} what="this tab" />

      <Board game={game} />

      <div className={styles.results} ref={resultsRef}>
        <JobResultArea
          job={job}
          feature="strategy"
          loadingMessage={LOADING_MESSAGE}
          onJobRetry={board.retry}
          credentialError={credentialError}
          onCredentialRetry={board.suggest}
          emptyHint="Your strategy will appear here. Load the sample board above, or paste a TTS string and click Generate, then Get Strategy."
        />
      </div>
    </section>
  )
}
