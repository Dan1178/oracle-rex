import type { Side } from '../../features/battleCalculator/units'
import styles from './UnitCounter.module.css'

// A single unit row: an icon, up/down steppers, and the current count. Ported
// from the `.unit-row` markup in templates/tactical.html; the legacy arrow
// buttons mutating a global object become controlled callbacks here. The
// Battle Calculator tints icons by side (friendly/enemy); the Fleet Manager
// omits `side` for plain, untinted icons.

export interface UnitCounterProps {
  label: string
  icon: string
  /** Tints the icon blue (friendly) or red (enemy); omit for no tint. */
  side?: Side
  count: number
  /** Per-player component limit; the increase control disables at this count. */
  max?: number
  onIncrement: () => void
  onDecrement: () => void
}

function tintClass(side: Side | undefined): string | undefined {
  if (side === 'friendly') return styles.friendly
  if (side === 'enemy') return styles.enemy
  return undefined
}

export function UnitCounter({
  label,
  icon,
  side,
  count,
  max,
  onIncrement,
  onDecrement,
}: UnitCounterProps) {
  const atMax = max !== undefined && count >= max
  return (
    <div className={styles.root} role="group" aria-label={label}>
      <span className={styles.icon} title={label}>
        <img src={icon} alt={label} className={tintClass(side)} />
      </span>
      <div className={styles.arrows}>
        <button
          type="button"
          className={styles.arrow}
          aria-label={`Increase ${label}`}
          onClick={onIncrement}
          disabled={atMax}
        >
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
