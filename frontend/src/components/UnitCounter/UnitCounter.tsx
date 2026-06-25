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
  /**
   * Pre-tinted ("baked") per-side icons for shaded 3D art. When a matching
   * `side` entry exists it is used verbatim and the CSS filter tint is skipped
   * (the filter only reads cleanly on flat silhouettes). Rendered larger so the
   * 3D detail is visible.
   */
  tinted?: Record<Side, string>
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
  tinted,
  count,
  max,
  onIncrement,
  onDecrement,
}: UnitCounterProps) {
  const atMax = max !== undefined && count >= max
  // Prefer a baked per-side tint (3D art); otherwise fall back to the neutral
  // icon recolored by the CSS filter classes.
  const bakedIcon = side ? tinted?.[side] : undefined
  const iconSrc = bakedIcon ?? icon
  const imgClass = bakedIcon ? styles.threeD : tintClass(side)
  return (
    <div className={styles.root} role="group" aria-label={label}>
      <span className={styles.icon} data-tooltip={label}>
        <img src={iconSrc} alt={label} className={imgClass} />
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
