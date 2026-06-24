import type { ReactNode } from 'react'

import styles from './DemoBox.module.css'

// The "try it instantly, no API key" callout that fronts each feature panel.
// The common case is a heading + description + single demo button (Strategy,
// Move, Tactical Calculator). RulesPanel has a heading over a row of sample-
// question chips instead, so when `children` is supplied they render in place of
// the description/button.

export interface DemoBoxProps {
  title: string
  /** Description + button form (omit when passing `children`). */
  description?: string
  buttonLabel?: string
  onClick?: () => void
  disabled?: boolean
  /** Custom body (e.g. the Rules sample-question chips) in place of the button. */
  children?: ReactNode
}

export function DemoBox({
  title,
  description,
  buttonLabel,
  onClick,
  disabled,
  children,
}: DemoBoxProps) {
  return (
    <div className={styles.demoBox}>
      <h4>{title}</h4>
      {children ?? (
        <>
          {description && <p className={styles.desc}>{description}</p>}
          {buttonLabel && (
            <button
              type="button"
              className={styles.button}
              onClick={onClick}
              disabled={disabled}
            >
              {buttonLabel}
            </button>
          )}
        </>
      )}
    </div>
  )
}
