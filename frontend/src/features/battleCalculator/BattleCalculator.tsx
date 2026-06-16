import { useState } from 'react'

import { ErrorState } from '../../components/ErrorState/ErrorState'
import { JobResultView } from '../../components/JobResultView/JobResultView'
import { LoadingState } from '../../components/LoadingState/LoadingState'
import { UnitCounter } from '../../components/UnitCounter/UnitCounter'
import { useAiJob } from '../../hooks/useAiJob'
import { useDemoConfig } from '../../hooks/useDemoConfig'
import { useSettings } from '../../store/settingsContext'
import {
  buildForceData,
  counterId,
  countsFrom,
  emptyCounts,
  ENEMY_GROUND_UNITS,
  FLEET_UNITS,
  FRIENDLY_GROUND_UNITS,
  type Side,
  type UnitDef,
} from './units'
import styles from './BattleCalculator.module.css'

// The Battle / Tactical Calculator — the first feature ported to React, proving
// the create→poll→render pipeline end-to-end. Friendly/enemy fleet, ground, and
// structure counters build the force_data payload; submitting runs an AI job
// via useAiJob('tactical'); the "Load Example Battle" demo applies a saved set
// of counts and runs the pre-completed demo job through the same UI.

const LOADING_MESSAGE = 'Calculating combat odds…'

export function BattleCalculator() {
  const [counts, setCounts] = useState(emptyCounts)
  const [credentialError, setCredentialError] = useState<string>()
  const [lastMode, setLastMode] = useState<'live' | 'demo'>('live')

  const { getCredentials } = useSettings()
  const { catalog } = useDemoConfig()
  const job = useAiJob('tactical')

  const demoScenario = catalog?.scenarios.tac_calc
  const demoReady = Boolean(demoScenario?.key)

  const increment = (id: string) => setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
  const decrement = (id: string) => setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }))

  const handleCalculate = () => {
    setCredentialError(undefined)
    setLastMode('live')
    const result = getCredentials('tactical')
    if (!result.creds) {
      job.reset()
      setCredentialError(result.error)
      return
    }
    job.submit({ force_data: buildForceData(counts) }, result.creds)
  }

  const handleDemo = () => {
    if (!demoScenario?.key) return
    setCredentialError(undefined)
    setLastMode('demo')
    setCounts(countsFrom(demoScenario.unit_counts ?? {}))
    job.runDemoScenario(demoScenario.key)
  }

  const retry = () => (lastMode === 'demo' ? handleDemo() : handleCalculate())

  const renderSection = (heading: string, side: Side, units: UnitDef[]) => (
    <fieldset className={styles.section}>
      <legend>{heading}</legend>
      <div className={styles.units}>
        {units.map((unit) => {
          const id = counterId(side, unit.unit)
          return (
            <UnitCounter
              key={id}
              label={unit.label}
              icon={unit.icon}
              side={side}
              count={counts[id] ?? 0}
              onIncrement={() => increment(id)}
              onDecrement={() => decrement(id)}
            />
          )
        })}
      </div>
    </fieldset>
  )

  return (
    <section aria-labelledby="tactical-heading">
      <h2 id="tactical-heading">Tactical Calculator</h2>
      <p className={styles.intro}>
        Estimate your odds of winning a space battle and get recommended fleet compositions. New
        here? Click <strong>Load Example Battle</strong> to preload a scenario with no setup.
      </p>

      <div className={styles.demoBox}>
        <h4>Demo — no API key needed</h4>
        <p className={styles.demoDesc}>
          {demoScenario?.description ?? 'Preloads both fleets and shows a saved combat-odds result.'}
        </p>
        <button
          type="button"
          className={styles.demoButton}
          onClick={handleDemo}
          disabled={!demoReady || job.isLoading}
        >
          Load Example Battle
        </button>
      </div>

      <h3>Fleets</h3>
      <div className={styles.fleets}>
        {renderSection('Friendly Fleet', 'friendly', FLEET_UNITS)}
        {renderSection('Enemy Fleet', 'enemy', FLEET_UNITS)}
      </div>

      <h3>Ground Forces</h3>
      <p className={styles.groundNote}>
        Adding ground forces to the enemy side changes the victory condition to eliminating the
        enemy fleet <em>and</em> successfully taking the planet.
      </p>
      <div className={styles.fleets}>
        {renderSection('Friendly Ground Forces', 'friendly', FRIENDLY_GROUND_UNITS)}
        {renderSection('Enemy Ground Forces and Structures', 'enemy', ENEMY_GROUND_UNITS)}
      </div>

      <button
        type="button"
        className={styles.calculate}
        onClick={handleCalculate}
        disabled={job.isLoading}
      >
        Calculate
      </button>

      <div className={styles.results}>
        {credentialError ? (
          <ErrorState message={credentialError} onRetry={handleCalculate} />
        ) : job.isLoading ? (
          <LoadingState message={LOADING_MESSAGE} />
        ) : job.phase === 'error' && job.error ? (
          <ErrorState message={job.error} onRetry={retry} />
        ) : job.phase === 'success' && job.result ? (
          <JobResultView feature="tac_calc" result={job.result} />
        ) : (
          <p className={styles.hint}>
            Odds of Victory: not yet calculated. Set your fleets and click Calculate, or load the
            example battle.
          </p>
        )}
      </div>
    </section>
  )
}
