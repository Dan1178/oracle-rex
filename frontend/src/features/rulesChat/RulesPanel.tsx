import { useState } from 'react'

import { ErrorState } from '../../components/ErrorState/ErrorState'
import { JobResultView } from '../../components/JobResultView/JobResultView'
import { LoadingState } from '../../components/LoadingState/LoadingState'
import { useAiJob } from '../../hooks/useAiJob'
import { useDemoConfig } from '../../hooks/useDemoConfig'
import { useSettings } from '../../store/settingsContext'
import type { RulesChip } from '../../types/demo'
import styles from './RulesPanel.module.css'

// Rules Q&A — a free-text rules question answered as a structured RulesAnswer
// card (answer + rule basis / assumptions / caveats). Ported from
// static/js/rules.js (askRules + renderRulesChips + askDemoRules): each demo
// chip is a saved question whose cached answer runs through the same poll UI.

const LOADING_MESSAGE = 'Consulting rules advisor'

export function RulesPanel() {
  const [question, setQuestion] = useState('')
  const [credentialError, setCredentialError] = useState<string>()
  const [lastMode, setLastMode] = useState<'live' | 'demo'>('live')
  const [lastChipKey, setLastChipKey] = useState<string>()

  const { getCredentials } = useSettings()
  const { catalog } = useDemoConfig()
  const job = useAiJob('rules')

  const chips: RulesChip[] = catalog?.scenarios.rules?.chips ?? []

  const handleAsk = () => {
    const trimmed = question.trim()
    if (!trimmed) return
    setCredentialError(undefined)
    setLastMode('live')
    const result = getCredentials('rules')
    if (!result.creds) {
      job.reset()
      setCredentialError(result.error)
      return
    }
    job.submit({ question: trimmed }, result.creds)
  }

  const handleChip = (chip: RulesChip) => {
    setCredentialError(undefined)
    setLastMode('demo')
    setLastChipKey(chip.key)
    setQuestion(chip.question)
    job.runDemoScenario(chip.key)
  }

  const retry = () => {
    if (lastMode === 'demo' && lastChipKey) {
      job.runDemoScenario(lastChipKey)
    } else {
      handleAsk()
    }
  }

  return (
    <section aria-labelledby="rules-heading">
      <h2 id="rules-heading">Rules Q&amp;A</h2>
      <p className={styles.intro}>
        Ask a Twilight Imperium rules question. Try a sample question below (no API key needed), or
        type your own and click Ask.
      </p>

      {chips.length > 0 && (
        <div className={styles.demoBox}>
          <h4>Try a sample question</h4>
          <div className={styles.chips}>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={styles.chip}
                onClick={() => handleChip(chip)}
                disabled={job.isLoading}
              >
                {chip.question}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        className={styles.question}
        aria-label="Rules question"
        placeholder="Ask a rules question (e.g., Can I move a carrier two tiles?)"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button
        type="button"
        className={styles.ask}
        onClick={handleAsk}
        disabled={job.isLoading || question.trim() === ''}
      >
        Ask Oracle Rex
      </button>

      <div className={styles.results}>
        {credentialError ? (
          <ErrorState message={credentialError} onRetry={handleAsk} />
        ) : job.isLoading ? (
          <LoadingState message={LOADING_MESSAGE} />
        ) : job.phase === 'error' && job.error ? (
          <ErrorState message={job.error} onRetry={retry} />
        ) : job.phase === 'success' && job.result ? (
          <JobResultView feature="rules" result={job.result} />
        ) : (
          <p className={styles.hint}>
            Your answer will appear here. Pick a sample question or ask your own.
          </p>
        )}
      </div>
    </section>
  )
}
