import type { ReactNode } from 'react'

import styles from './EmptyHint.module.css'

// The placeholder shown in a panel's result area before anything has been
// computed (e.g. "Your answer will appear here."). One box, shared across the
// advisor panels and the Tactical Calculator so the empty-state styling lives in
// a single place.

export interface EmptyHintProps {
  children: ReactNode
}

export function EmptyHint({ children }: EmptyHintProps) {
  return <p className={styles.hint}>{children}</p>
}
