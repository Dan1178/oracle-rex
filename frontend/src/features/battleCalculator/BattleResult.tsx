import type { BattleSimResult } from '../../types/ai'
import { formatFleet } from './units'
import styles from './BattleResult.module.css'

// Structured result card for the deterministic battle simulation (Milestone 6C).
// Shows the win probability prominently, the minimum/recommended fleets, and the
// simulator's caveats. The optional LLM explanation is rendered by the caller
// beneath this card (as `children`).

export interface BattleResultProps {
  result: BattleSimResult
  children?: React.ReactNode
}

export function BattleResult({ result, children }: BattleResultProps) {
  const { win_percent, minimum_fleet, recommended_fleet, breakdown } = result
  const blocked = breakdown.blocked_no_ground
  const notes = breakdown.notes ?? []

  return (
    <div className={styles.card}>
      <div className={styles.odds}>
        <span className={styles.oddsLabel}>Odds of Victory</span>
        <span className={styles.oddsValue}>{win_percent}%</span>
      </div>

      {blocked && (
        <p className={styles.blocked}>
          The enemy holds the planet but you brought no ground forces, so the planet
          cannot be taken — add infantry or mechs to make this winnable.
        </p>
      )}

      <dl className={styles.fleets}>
        <div className={styles.fleetRow}>
          <dt>Minimum fleet (≥50%)</dt>
          <dd>{formatFleet(minimum_fleet)}</dd>
        </div>
        <div className={styles.fleetRow}>
          <dt>Recommended fleet (≥80%)</dt>
          <dd>{formatFleet(recommended_fleet)}</dd>
        </div>
      </dl>

      {notes.length > 0 && (
        <ul className={styles.notes}>
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      {children}
    </div>
  )
}
