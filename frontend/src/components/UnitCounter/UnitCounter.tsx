import type { Side } from '../../features/battleCalculator/units'
import styles from './UnitCounter.module.css'

// A single unit row: a tinted icon, up/down steppers, and the current count.
// Ported from the `.unit-row` markup in templates/tactical.html; the legacy
// arrow buttons mutating a global object become controlled callbacks here.

export interface UnitCounterProps {
  label: string
  icon: string
  side: Side
  count: number
  onIncrement: () => void
  onDecrement: () => void
}

export function UnitCounter({ label, icon, side, count, onIncrement, onDecrement }: UnitCounterProps) {
  return (
    <div className={styles.root} role="group" aria-label={label}>
      <span className={styles.icon} title={label}>
        <img src={icon} alt={label} className={side === 'friendly' ? styles.friendly : styles.enemy} />
      </span>
      <div className={styles.arrows}>
        <button type="button" className={styles.arrow} aria-label={`Increase ${label}`} onClick={onIncrement}>
          ▲
        </button>
        <button
          type="button"
          className={styles.arrow}
          aria-label={`Decrease ${label}`}
          onClick={onDecrement}
          disabled={count === 0}
        >
          ▼
        </button>
      </div>
      <span className={styles.count} aria-label={`${label} count`}>
        {count}
      </span>
    </div>
  )
}
