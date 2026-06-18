import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { ErrorState } from '../../components/ErrorState/ErrorState'
import { JobResultView } from '../../components/JobResultView/JobResultView'
import { LoadingState } from '../../components/LoadingState/LoadingState'
import { UnitCounter } from '../../components/UnitCounter/UnitCounter'
import { ApiError, simulateBattle } from '../../api/oracleRexApi'
import { useAiJob } from '../../hooks/useAiJob'
import { useDemoConfig } from '../../hooks/useDemoConfig'
import { useSettings } from '../../store/settingsContext'
import type { BattleSimResult, ForceData } from '../../types/ai'
import { BattleResult } from './BattleResult'
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

// The Battle / Tactical Calculator. As of Milestone 6C the win odds + fleet
// recommendations come from the deterministic simulator (POST
// /api/tactical/simulate/) — instant and key-free, so the calculator works with
// zero setup. The "Get the Oracle's take" checkbox additionally runs the
// tactical AI job (BYOK), now seeded with the computed numbers, for a
// natural-language explanation rendered beneath the result.

const LOADING_MESSAGE = 'Simulating combat'
const EXPLAIN_LOADING_MESSAGE = 'Consulting the Oracle'

export function BattleCalculator() {
  const [counts, setCounts] = useState(emptyCounts)
  const [explain, setExplain] = useState(false)
  const [credentialError, setCredentialError] = useState<string>()

  const { getCredentials } = useSettings()
  const { catalog } = useDemoConfig()
  const job = useAiJob('tactical')

  const demoScenario = catalog?.scenarios.tac_calc
  const demoReady = Boolean(demoScenario?.key)

  // The deterministic simulation (always run; no key needed).
  const sim = useMutation<BattleSimResult, unknown, ForceData>({
    mutationFn: (forceData) => simulateBattle(forceData),
  })
  const simError =
    sim.error instanceof ApiError
      ? sim.error.message
      : sim.error
        ? 'The battle could not be simulated.'
        : undefined

  const increment = (id: string) => setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
  const decrement = (id: string) =>
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }))

  // Run the deterministic sim, then (if requested + credentialed) the LLM
  // explanation seeded with the computed numbers.
  const runCalculation = async (forceData: ForceData) => {
    setCredentialError(undefined)
    job.reset()
    const result = await sim.mutateAsync(forceData)
    if (!explain) return
    const creds = getCredentials('tactical')
    if (!creds.creds) {
      setCredentialError(creds.error)
      return
    }
    job.submit({ force_data: forceData, simulation: result }, creds.creds)
  }

  const handleCalculate = () => {
    void runCalculation(buildForceData(counts))
  }

  const handleDemo = () => {
    if (!demoScenario?.key) return
    setCredentialError(undefined)
    job.reset()
    const demoCounts = countsFrom(demoScenario.unit_counts ?? {})
    setCounts(demoCounts)
    // The math is free, so the demo computes the result live (no saved response).
    sim.mutate(buildForceData(demoCounts))
  }

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
        Estimate your odds of winning a space battle and get recommended fleet
        compositions — computed instantly, no API key required. New here? Click{' '}
        <strong>Load Example Battle</strong> to preload a scenario.
      </p>

      <div className={styles.demoBox}>
        <h4>Example — no setup needed</h4>
        <p className={styles.demoDesc}>
          {demoScenario?.description ??
            'Preloads both fleets and computes the combat odds.'}
        </p>
        <button
          type="button"
          className={styles.demoButton}
          onClick={handleDemo}
          disabled={!demoReady || sim.isPending}
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
        Adding ground forces to the enemy side changes the victory condition to
        eliminating the enemy fleet <em>and</em> successfully taking the planet.
      </p>
      <div className={styles.fleets}>
        {renderSection('Friendly Ground Forces', 'friendly', FRIENDLY_GROUND_UNITS)}
        {renderSection(
          'Enemy Ground Forces and Structures',
          'enemy',
          ENEMY_GROUND_UNITS,
        )}
      </div>

      <label className={styles.explainToggle}>
        <input
          type="checkbox"
          checked={explain}
          onChange={(e) => setExplain(e.target.checked)}
        />
        Get the Oracle&rsquo;s analysis (uses your API key)
      </label>

      <button
        type="button"
        className={styles.calculate}
        onClick={handleCalculate}
        disabled={sim.isPending}
      >
        Calculate
      </button>

      <div className={styles.results}>
        {sim.isPending ? (
          <LoadingState message={LOADING_MESSAGE} />
        ) : simError ? (
          <ErrorState message={simError} onRetry={handleCalculate} />
        ) : sim.data ? (
          <BattleResult result={sim.data}>
            {credentialError ? (
              <ErrorState message={credentialError} onRetry={handleCalculate} />
            ) : job.isLoading ? (
              <LoadingState message={EXPLAIN_LOADING_MESSAGE} />
            ) : job.phase === 'error' && job.error ? (
              <ErrorState message={job.error} onRetry={handleCalculate} />
            ) : job.phase === 'success' && job.result ? (
              <JobResultView feature="tac_calc" result={job.result} />
            ) : null}
          </BattleResult>
        ) : (
          <p className={styles.hint}>
            Odds of Victory: not yet calculated. Set your fleets and click Calculate, or
            load the example battle.
          </p>
        )}
      </div>
    </section>
  )
}
