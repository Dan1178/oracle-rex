import { Board } from '../../components/Board/Board'
import { ErrorState } from '../../components/ErrorState/ErrorState'
import { FactionSelect } from '../../components/FactionSelect/FactionSelect'
import { JobResultView } from '../../components/JobResultView/JobResultView'
import { LoadingState } from '../../components/LoadingState/LoadingState'
import { useDemoConfig } from '../../hooks/useDemoConfig'
import { useBoardSuggester } from '../boardSuggester/useBoardSuggester'
import styles from './MovePanel.module.css'

// Move Suggester — recommends the single best next move for a board + faction,
// rendered as a TacticalMove card. Ports move.html + suggestStrategy('move') +
// loadDemoBoardScenario('move'). Unlike Strategy, the Move tab has no TTS input:
// its board comes from the demo (now) or the Fleet Manager export (Phase 7), so
// it reuses the same Board / FactionSelect / useBoardSuggester as Strategy.

const LOADING_MESSAGE = 'Evaluating tactical options…'
const FACTION_PLACEHOLDER = 'Load the tactical puzzle below (or build a board in the Fleet Manager)'

export function MovePanel() {
  const { catalog } = useDemoConfig()
  const board = useBoardSuggester('move')
  const { game, faction, setFaction, credentialError, busy, job } = board

  const demoScenario = catalog?.scenarios.move
  const demoReady = Boolean(demoScenario?.key && demoScenario.tts_string)

  return (
    <section aria-labelledby="move-heading">
      <h2 id="move-heading">Move Suggester</h2>
      <p className={styles.intro}>
        Get a recommended next move for a given board and fleet state. New here? Click{' '}
        <strong>Load Tactical Puzzle</strong> to see a worked example with no setup.
      </p>

      <div className={styles.demoBox}>
        <h4>Demo — no API key needed</h4>
        <p className={styles.demoDesc}>
          {demoScenario?.description ??
            'Loads a sample board, selects a faction, and shows a saved move recommendation.'}
        </p>
        <button
          type="button"
          className={styles.demoButton}
          onClick={() => void board.loadDemo(demoScenario)}
          disabled={!demoReady || busy}
        >
          Load Tactical Puzzle
        </button>
      </div>

      <FactionSelect
        players={game?.players ?? []}
        value={faction}
        onChange={setFaction}
        disabled={!game}
        disabledPlaceholder={FACTION_PLACEHOLDER}
      />
      <button
        type="button"
        className={styles.suggest}
        onClick={board.suggest}
        disabled={!game || !faction || busy}
      >
        Suggest Move
      </button>

      <Board game={game} />

      <div className={styles.results}>
        {credentialError ? (
          <ErrorState message={credentialError} onRetry={board.suggest} />
        ) : job.isLoading ? (
          <LoadingState message={LOADING_MESSAGE} />
        ) : job.phase === 'error' && job.error ? (
          <ErrorState message={job.error} onRetry={board.retry} />
        ) : job.phase === 'success' && job.result ? (
          <JobResultView feature="move" result={job.result} />
        ) : null}
      </div>
    </section>
  )
}
