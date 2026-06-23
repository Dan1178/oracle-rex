import styles from './LoadingState.module.css'

// Loading indicator for an in-flight AI job. Per-feature loading copy ("Analyzing
// board state…", etc.) is passed in by the caller (Cross-Cutting Concerns §5).

export interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Working' }: LoadingStateProps) {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      {message}
      <span className={styles.dots} aria-hidden="true" />
      <div className={styles.barTrack} aria-hidden="true">
        <div className={styles.barFill} />
      </div>
    </div>
  )
}
